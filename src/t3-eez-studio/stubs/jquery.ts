// Minimal jQuery stub for EEZ Studio browser compatibility
// Provides enough of jQuery's API for drag-and-drop and event handling

function $(selector: any) {
    if (typeof selector === 'string') {
        const el = document.querySelector(selector);
        return createJQueryObj(el ? [el] : []);
    }
    if (selector instanceof Element || selector === document || selector === window) {
        return createJQueryObj([selector]);
    }
    return createJQueryObj([]);
}

function createJQueryObj(elements: any[]) {
    const firstEl = () => elements[0] || null;
    const obj: any = {
        elements,
        length: elements.length,
        0: elements[0] || null,
        // Events
        on(event: string, handler: any) {
            elements.forEach(el => {
                if (el) el.addEventListener(event.split('.')[0], (e: Event) => {
                    handler(Object.assign(e, { originalEvent: e }));
                });
            });
            return obj;
        },
        off(event: string, handler: any) {
            elements.forEach(el => {
                if (el) el.removeEventListener(event.split('.')[0], handler);
            });
            return obj;
        },
        trigger(event: string) {
            elements.forEach(el => {
                if (el) el.dispatchEvent(new Event(event.split('.')[0]));
            });
            return obj;
        },
        preventDefault() { return obj; },
        // Traversal
        closest(selector: string) {
            const el = firstEl();
            if (!el) return createJQueryObj([]);
            const match = el.closest(selector);
            return match ? createJQueryObj([match]) : createJQueryObj([]);
        },
        find(selector: string) {
            const results: Element[] = [];
            elements.forEach(el => {
                if (el && el.querySelectorAll) {
                    results.push(...Array.from(el.querySelectorAll(selector)));
                }
            });
            return createJQueryObj(results);
        },
        parents(selector?: string) {
            const results: Element[] = [];
            elements.forEach(el => {
                let p = el?.parentElement;
                while (p) {
                    if (!selector || p.matches(selector)) results.push(p);
                    p = p.parentElement;
                }
            });
            return createJQueryObj(results);
        },
        parent(selector?: string) {
            const results: Element[] = [];
            elements.forEach(el => {
                const p = el?.parentElement;
                if (p && (!selector || p.matches(selector))) results.push(p);
            });
            return createJQueryObj(results);
        },
        children(selector?: string) {
            const results: Element[] = [];
            elements.forEach(el => {
                if (el && el.children) {
                    for (const c of Array.from(el.children)) {
                        if (!selector || c.matches(selector)) results.push(c);
                    }
                }
            });
            return createJQueryObj(results);
        },
        is(selector: string) {
            if (selector === ":visible") {
                return elements.some(el => {
                    if (!el) return false;
                    const style = window.getComputedStyle(el);
                    return style.display !== "none" && style.visibility !== "hidden" && parseFloat(style.opacity) > 0;
                });
            }
            if (selector === ":hidden") {
                return elements.some(el => {
                    if (!el) return true;
                    const style = window.getComputedStyle(el);
                    return style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity) === 0;
                });
            }
            return elements.some(el => el && el.matches && el.matches(selector));
        },
        each(fn: (i: number, el: any) => void) {
            elements.forEach((el, i) => fn(i, el));
            return obj;
        },
        // Getters/Setters
        val(value?: string) {
            if (value === undefined) {
                const el = firstEl();
                return (el as HTMLInputElement)?.value ?? "";
            }
            elements.forEach(el => { if (el) (el as HTMLInputElement).value = value; });
            return obj;
        },
        text(value?: string) {
            if (value === undefined) return elements.map(el => el?.textContent ?? "").join("");
            elements.forEach(el => { if (el) el.textContent = value; });
            return obj;
        },
        html(value?: string) {
            if (value === undefined) return firstEl()?.innerHTML ?? "";
            elements.forEach(el => { if (el) el.innerHTML = value; });
            return obj;
        },
        attr(name: string, value?: any) {
            if (value === undefined) return firstEl()?.getAttribute(name) ?? undefined;
            elements.forEach(el => { if (el) el.setAttribute(name, String(value)); });
            return obj;
        },
        data(key: string, value?: any) {
            const el = firstEl();
            if (!el) return value === undefined ? undefined : obj;
            if (value === undefined) {
                const d = (el as any).__jqData;
                return key === undefined ? d : (d && d[key]);
            }
            if (!(el as any).__jqData) (el as any).__jqData = {};
            (el as any).__jqData[key] = value;
            return obj;
        },
        css(prop: string | Record<string, string>, value?: string) {
            if (typeof prop === 'object') {
                elements.forEach(el => { if (el) Object.assign(el.style, prop); });
            } else if (value !== undefined) {
                elements.forEach(el => { if (el) (el.style as any)[prop] = value; });
            } else {
                const el = firstEl();
                return el ? getComputedStyle(el)[prop as any] : "";
            }
            return obj;
        },
        prop(name: string, value?: any) {
            if (value === undefined) return firstEl() ? (firstEl() as any)[name] : undefined;
            elements.forEach(el => { if (el) (el as any)[name] = value; });
            return obj;
        },
        addClass(cls: string) {
            elements.forEach(el => { if (el) el.classList.add(...cls.split(' ')); });
            return obj;
        },
        removeClass(cls: string) {
            elements.forEach(el => { if (el) el.classList.remove(...cls.split(' ')); });
            return obj;
        },
        hasClass(cls: string) {
            return elements.some(el => el && el.classList.contains(cls));
        },
        toggleClass(cls: string) {
            elements.forEach(el => { if (el) el.classList.toggle(cls); });
            return obj;
        },
        // Dimensions
        height(value?: number) {
            if (value === undefined) return firstEl()?.clientHeight ?? 0;
            elements.forEach(el => { if (el) el.style.height = value + 'px'; });
            return obj;
        },
        width(value?: number) {
            if (value === undefined) return firstEl()?.clientWidth ?? 0;
            elements.forEach(el => { if (el) el.style.width = value + 'px'; });
            return obj;
        },
        outerHeight(includeMargin?: boolean) {
            const el = firstEl();
            if (!el) return 0;
            let h = el.offsetHeight;
            if (includeMargin) { const s = getComputedStyle(el); h += parseFloat(s.marginTop) + parseFloat(s.marginBottom); }
            return h;
        },
        outerWidth(includeMargin?: boolean) {
            const el = firstEl();
            if (!el) return 0;
            let w = el.offsetWidth;
            if (includeMargin) { const s = getComputedStyle(el); w += parseFloat(s.marginLeft) + parseFloat(s.marginRight); }
            return w;
        },
        innerHeight() { const el = firstEl(); return el ? el.clientHeight : 0; },
        innerWidth() { const el = firstEl(); return el ? el.clientWidth : 0; },
        // Position
        offset() {
            const el = firstEl();
            if (!el) return { top: 0, left: 0 };
            const r = el.getBoundingClientRect();
            return { top: r.top + window.scrollY, left: r.left + window.scrollX };
        },
        position() {
            const el = firstEl();
            if (!el) return { top: 0, left: 0 };
            return { top: el.offsetTop, left: el.offsetLeft };
        },
        scrollTop(value?: number) {
            if (value === undefined) return firstEl()?.scrollTop ?? 0;
            elements.forEach(el => { if (el) el.scrollTop = value; });
            return obj;
        },
        scrollLeft(value?: number) {
            if (value === undefined) return firstEl()?.scrollLeft ?? 0;
            elements.forEach(el => { if (el) el.scrollLeft = value; });
            return obj;
        },
        // Manipulation
        append(content: any) { return _manipulate('append', elements, content, obj); },
        prepend(content: any) { return _manipulate('prepend', elements, content, obj); },
        remove() { elements.forEach(el => el?.remove()); return obj; },
        empty() { elements.forEach(el => { if (el) el.innerHTML = ''; }); return obj; },
        clone() { return createJQueryObj(elements.map(el => el?.cloneNode(true) || null)); },
    };
    return obj;
}

function _manipulate(method: string, elements: any[], content: any, obj: any) {
    elements.forEach(el => {
        if (!el) return;
        if (typeof content === 'string') {
            el.insertAdjacentHTML(method === 'append' ? 'beforeend' : 'afterbegin', content);
        } else if (content instanceof Element) {
            el[method === 'append' ? 'appendChild' : 'prepend'](content);
        }
    });
    return obj;
}

// Static methods
($ as any).each = (obj: any, fn: (i: number, val: any) => void) => {
    if (Array.isArray(obj)) obj.forEach((val, i) => fn(i, val));
    else if (obj) Object.keys(obj).forEach((key, i) => fn(i, (obj as any)[key]));
};

export default $;
export { $ };
// Also expose globally
if (typeof globalThis !== 'undefined') (globalThis as any).$ = $;
if (typeof window !== 'undefined') (window as any).$ = $;
