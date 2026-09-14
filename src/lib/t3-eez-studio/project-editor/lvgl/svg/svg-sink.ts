/**
 * LVGL 9 SVG renderer — DOM sink.
 *
 * ADDITIVE: new file. Owns the <svg> root, the <defs> registry and all DOM patching.
 *
 * The sink knows nothing about LVGL: it applies a plain `DrawNode` tree (produced by the
 * pure renderer in svg-renderer.ts) to the DOM, reusing elements between frames by `key`
 * so a repaint is an attribute delta rather than a rebuild.
 *
 * Deliberate constraint: this module never calls `getBBox()` or `getComputedTextLength()`.
 * happy-dom (the vitest environment) does not implement them, and the renderer is required
 * to be dependency-free — geometry comes from the scene, not from a layout round-trip.
 */

export type DrawTag =
    | "g"
    | "rect"
    | "circle"
    | "ellipse"
    | "path"
    | "polyline"
    | "polygon"
    | "line"
    | "text"
    | "tspan"
    | "image";

export type DrawAttrs = Record<string, string | number | undefined>;

export interface DrawNode {
    /** Stable identity inside its parent — the patch key. */
    key: string;
    tag: DrawTag;
    attrs?: DrawAttrs;
    style?: Record<string, string>;
    /** Raw text content (for <text> / <tspan>). */
    text?: string;
    children?: DrawNode[];
}

export type DefTag =
    | "linearGradient"
    | "radialGradient"
    | "stop"
    | "clipPath"
    | "filter"
    | "pattern"
    | "mask"
    | "rect"
    | "path"
    | "circle"
    | "image"
    | "feDropShadow"
    | "feGaussianBlur"
    | "feOffset"
    | "feFlood"
    | "feComposite"
    | "feColorMatrix"
    | "feBlend"
    | "feMerge"
    | "feMergeNode";

export interface DefNode {
    /** Deterministic id — reused across frames, so <defs> is never rebuilt needlessly. */
    id: string;
    tag: DefTag;
    attrs?: DrawAttrs;
    text?: string;
    children?: DefNode[];
}

/** What the renderer hands the sink each frame. */
export interface RenderOutput {
    roots: DrawNode[];
    defs: DefNode[];
}

export interface SvgSinkOptions {
    /** Existing <g> to host scene content. Created inside the root when omitted. */
    contentGroup?: SVGGElement;
    /** Existing <g> for editor affordances. Created and kept last when omitted. */
    overlayGroup?: SVGGElement;
}

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Owns one <svg> element: patches scene content in, keeps <defs> alive across frames, and
 * keeps the overlay group last so editor affordances always paint on top.
 */
export class SvgSink {
    readonly svg: SVGSVGElement;
    readonly contentGroup: SVGGElement;
    readonly overlayGroup: SVGGElement;

    private readonly defsGroup: SVGGElement;
    /** Last applied attribute values, so we only touch attributes that actually changed. */
    private readonly appliedAttrs = new WeakMap<Element, DrawAttrs>();
    /** key -> element, per parent element. */
    private readonly childIndex = new Map<Element, Map<string, SVGElement>>();
    /** id -> <defs> element. */
    private readonly defsIndex = new Map<string, SVGElement>();
    /** The failure notice group, when one is showing. */
    private noticeElement: SVGGElement | undefined;
    private disposed = false;

    constructor(
        svg: SVGSVGElement,
        dims: { w: number; h: number },
        options: SvgSinkOptions = {}
    ) {
        this.svg = svg;
        svg.setAttribute("viewBox", `0 0 ${dims.w} ${dims.h}`);
        svg.setAttribute("width", String(dims.w));
        svg.setAttribute("height", String(dims.h));
        if (!svg.getAttribute("class")) {
            svg.setAttribute("class", "lvgl-svg");
        }

        const existingDefs = svg.querySelector("#defs") as SVGGElement | null;
        this.defsGroup = existingDefs ?? this.createGroup("defs");
        // <defs> must stay first in document order.
        svg.insertBefore(this.defsGroup, svg.firstChild);

        this.contentGroup =
            options.contentGroup ??
            this.ensureGroupWithId("content", this.defsGroup);
        this.overlayGroup =
            options.overlayGroup ??
            this.ensureGroupWithId("overlay", this.contentGroup);
    }

    /** Apply one frame. `roots` replaces the previous content; missing keys are removed. */
    update(output: RenderOutput): void {
        if (this.disposed) {
            return;
        }
        this.applyDefs(output.defs);
        this.patchChildren(this.contentGroup, output.roots);
        this.keepOverlayLast();
    }

    /** Blank the content area (page switch / empty state). Keeps <defs> and the overlay. */
    clearPage(): void {
        if (this.disposed) {
            return;
        }
        while (this.contentGroup.firstChild) {
            this.contentGroup.removeChild(this.contentGroup.firstChild);
        }
        this.childIndex.delete(this.contentGroup);
    }

    /**
     * Show a short, visible message in the overlay when the surface cannot paint.
     *
     * A blank design surface is indistinguishable from an empty page, so a failure that is going to
     * persist has to say so. This lives in `#overlay` (not `#content`) so a scene patch never
     * removes it, and it is plain `<text>` in user units so it works at any zoom.
     *
     * Additive: existing callers are unaffected; `clearNotice()` removes it.
     */
    showNotice(text: string): void {
        if (this.disposed) {
            return;
        }
        let group = this.noticeElement;
        if (!group) {
            group = document.createElementNS(SVG_NS, "g");
            group.setAttribute("id", "notice");
            this.overlayGroup.appendChild(group);
            this.noticeElement = group;
        }
        const lines = text.split("\n");
        while (group.childNodes.length > lines.length) {
            group.removeChild(group.lastChild!);
        }
        lines.forEach((line, index) => {
            let node = group!.childNodes[index] as SVGTextElement | undefined;
            if (!node) {
                node = document.createElementNS(SVG_NS, "text") as SVGTextElement;
                group!.appendChild(node);
            }
            node.setAttribute("x", "8");
            node.setAttribute("y", String(20 + index * 16));
            node.setAttribute("font-size", "12");
            node.setAttribute("font-family", "sans-serif");
            node.setAttribute("fill", "#c62828");
            node.setAttribute("style", "paint-order:stroke; stroke:#ffffff; stroke-width:3px;");
            node.textContent = line;
        });
    }

    /** Remove the notice, if any. */
    clearNotice(): void {
        if (this.noticeElement) {
            this.noticeElement.remove();
            this.noticeElement = undefined;
        }
    }

    /** Drop references so the DOM can be collected. Safe to call twice. */
    teardown(): void {
        if (this.disposed) {
            return;
        }
        // Clear the content BEFORE flipping `disposed`, because clearPage() is a no-op once
        // the sink is disposed.
        this.clearPage();
        // Overlay affordances belong to the page that is going away, so they must not outlive it.
        this.clearNotice();
        this.disposed = true;
        this.childIndex.clear();
        this.defsIndex.clear();
        while (this.defsGroup.firstChild) {
            this.defsGroup.removeChild(this.defsGroup.firstChild);
        }
    }

    /** Number of patched scene elements — used by the fidelity scorecard. */
    get nodeCount(): number {
        return this.contentGroup.querySelectorAll("*").length;
    }

    // -----------------------------------------------------------------------------------
    // defs
    // -----------------------------------------------------------------------------------

    private applyDefs(defs: DefNode[]): void {
        const seen = new Set<string>();
        for (const def of defs) {
            seen.add(def.id);
            let element = this.defsIndex.get(def.id);
            if (!element) {
                element = this.createElement(def.tag, def.id);
                this.defsGroup.appendChild(element);
                this.defsIndex.set(def.id, element);
            }
            this.applyAttrs(element, def.attrs, undefined);
            if (def.text != null) {
                this.setText(element, def.text);
            }
            if (def.children) {
                this.patchDefChildren(element, def.children);
            }
        }
        // Drop defs that are no longer referenced so the registry cannot grow without bound.
        for (const [id, element] of Array.from(this.defsIndex.entries())) {
            if (!seen.has(id)) {
                element.remove();
                this.defsIndex.delete(id);
            }
        }
    }

    private patchDefChildren(parent: SVGElement, nodes: DefNode[]): void {
        const index = this.ensureChildIndex(parent);
        const seen = new Set<string>();
        for (const node of nodes) {
            seen.add(node.id);
            let element = index.get(node.id);
            if (!element) {
                element = this.createElement(node.tag, node.id);
                parent.appendChild(element);
                index.set(node.id, element);
            }
            this.applyAttrs(element, node.attrs, undefined);
            if (node.text != null) {
                this.setText(element, node.text);
            }
            if (node.children) {
                this.patchDefChildren(element, node.children);
            }
        }
        for (const [key, element] of Array.from(index.entries())) {
            if (!seen.has(key)) {
                element.remove();
                index.delete(key);
            }
        }
    }

    // -----------------------------------------------------------------------------------
    // content patching
    // -----------------------------------------------------------------------------------

    private patchChildren(parent: Element, nodes: DrawNode[]): void {
        const index = this.ensureChildIndex(parent);
        const seen = new Set<string>();
        for (const node of nodes) {
            seen.add(node.key);
            let element = index.get(node.key) as SVGElement | undefined;
            if (!element || element.tagName !== node.tag) {
                if (element) {
                    element.remove();
                }
                element = this.createElement(node.tag);
                index.set(node.key, element);
            }
            // appendChild moves an existing element, which fixes z-order in one pass.
            parent.appendChild(element);
            this.applyAttrs(element, node.attrs, node.style);
            if (node.text != null) {
                this.setText(element, node.text);
            }
            if (node.children) {
                this.patchChildren(element, node.children);
            } else if (element.firstChild) {
                this.childIndex.delete(element);
            }
        }
        for (const [key, element] of Array.from(index.entries())) {
            if (!seen.has(key)) {
                element.remove();
                index.delete(key);
                this.childIndex.delete(element);
            }
        }
    }

    private ensureChildIndex(parent: Element): Map<string, SVGElement> {
        let index = this.childIndex.get(parent);
        if (!index) {
            index = new Map<string, SVGElement>();
            this.childIndex.set(parent, index);
        }
        return index;
    }

    // -----------------------------------------------------------------------------------
    // element helpers
    // -----------------------------------------------------------------------------------

    private createElement(tag: string, id?: string): SVGElement {
        const element = document.createElementNS(SVG_NS, tag) as SVGElement;
        if (id) {
            element.setAttribute("id", id);
        }
        return element;
    }

    private applyAttrs(
        element: SVGElement,
        attrs: DrawAttrs | undefined,
        style: Record<string, string> | undefined
    ): void {
        const previous = this.appliedAttrs.get(element) ?? {};
        const next: DrawAttrs = {};

        if (attrs) {
            for (const name of Object.keys(attrs)) {
                const value = attrs[name];
                if (value == null) {
                    continue;
                }
                const text = String(value);
                next[name] = text;
                if (previous[name] !== text) {
                    element.setAttribute(name, text);
                }
            }
        }

        // Styles go through a single `style` attribute rather than CSSStyleDeclaration:
        // presentation is identical for SVG, it diffs as one value, and it does not depend on
        // SVGElement.style existing in the host DOM (happy-dom does not implement it).
        const styleText = style
            ? Object.keys(style)
                  .map(name => `${name}:${style[name]}`)
                  .join(";")
            : "";
        if (styleText) {
            next.style = styleText;
            if (previous.style !== styleText) {
                element.setAttribute("style", styleText);
            }
        }

        for (const name of Object.keys(previous)) {
            if (next[name] === undefined) {
                element.removeAttribute(name);
            }
        }
        this.appliedAttrs.set(element, next);
    }

    private setText(element: SVGElement, text: string): void {
        if (element.textContent !== text) {
            element.textContent = text;
        }
    }

    private createGroup(id: string): SVGGElement {
        const group = this.createElement("g", id) as SVGGElement;
        this.svg.appendChild(group);
        return group;
    }

    private ensureGroupWithId(id: string, after: Element): SVGGElement {
        const existing = this.svg.querySelector(`#${id}`);
        if (existing) {
            return existing as SVGGElement;
        }
        const group = this.createElement("g", id) as SVGGElement;
        after.parentNode
            ? after.parentNode.insertBefore(group, after.nextSibling)
            : this.svg.appendChild(group);
        return group;
    }

    private keepOverlayLast(): void {
        if (this.svg.lastElementChild !== this.overlayGroup) {
            this.svg.appendChild(this.overlayGroup);
        }
    }
}

/** Convenience for the component layer: build the skeleton groups the sink expects. */
export function createSvgRoot(
    dims: { w: number; h: number },
    ownerDocument: Document = document
): SVGSVGElement {
    const svg = ownerDocument.createElementNS(SVG_NS, "svg") as SVGSVGElement;
    svg.setAttribute("viewBox", `0 0 ${dims.w} ${dims.h}`);
    svg.setAttribute("class", "lvgl-svg");
    return svg;
}
