/**
 * Designer — the panel commands that belong to the **app**, not to the document's tool band.
 *
 * Hiding a panel is not an editing tool: the legacy strip never had such a button, and the band is the
 * *document's* row. The individual panels own their own visibility — each head carries a chevron in both
 * states (`RegionPanelHead`) — and the two aggregate commands live here, appended to the kind's **View**
 * menu next to the app's existing `Show Toolbar` / `Show Building Pane` entries, which are the same kind
 * of command. That is also what keeps the band's `⋯` menu honest: it holds only the document's own
 * overflow, so it can disappear when there is nothing in it.
 *
 * The menus are shared per kind (`hvacMenuConfig`, `eezMenuConfig`, …) while the layout is per kind too,
 * so the action resolves the *current* document kind from the route when it runs. `withDesignerPanelItems`
 * returns copies — the shared configs must stay untouched for the legacy pages that use them.
 */
import { matchDesignerPath } from "./kinds";
import { getKindLayout, layoutStore } from "./hooks/useDesignerLayoutStore";
import type { MenuItem } from "@/lib/react/types/menu";

/** The regions a document can have; the bottom dock is collapsed by default in most documents. */
const REGIONS = ["left", "right", "bottom"] as const;

/** The kind of the designer document on screen right now — the menus are shared, the layout is not. */
function activeKind(): string | undefined {
    return matchDesignerPath(window.location.hash.replace(/^#/, ""))?.kind;
}

export function designerPanelItems(): MenuItem[] {
    return [
        {
            id: "designer-panels-toggle",
            label: "Toggle All Panels",
            type: "item",
            icon: "PanelLeft",
            action: () => {
                const kind = activeKind();
                if (!kind) {
                    return;
                }
                const layout = getKindLayout(kind);
                const allCollapsed = REGIONS.every((region) => !!layout[region]?.collapsed);
                REGIONS.forEach((region) => layoutStore.setCollapsed(kind, region, !allCollapsed));
            }
        },
        {
            id: "designer-panels-reset",
            label: "Reset Panel Layout",
            type: "item",
            icon: "LayoutRowFour",
            action: () => {
                const kind = activeKind();
                if (kind) {
                    layoutStore.resetKind(kind);
                }
            }
        }
    ];
}

/**
 * The kind's menus with the designer's panel commands appended to its **View** menu. A kind whose menu
 * set has no View menu gets a `Panels` menu of its own rather than losing the commands.
 */
export function withDesignerPanelItems(menus: MenuItem[]): MenuItem[] {
    const items = designerPanelItems();
    let appended = false;

    const next = menus.map((menu) => {
        if (appended || menu.type !== "submenu" || (menu.label ?? "").toLowerCase() !== "view") {
            return menu;
        }
        appended = true;
        return {
            ...menu,
            children: [
                ...(menu.children ?? []),
                { id: "designer-panels-divider", type: "divider" as const },
                ...items
            ]
        };
    });

    if (appended) {
        return next;
    }

    return [
        ...next,
        { id: "designer-panels", label: "Panels", type: "submenu" as const, icon: "PanelLeft", children: items }
    ];
}
