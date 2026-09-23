/**
 * The HVAC document — the drawing tools, **as data** (`ToolGroupSpec`).
 *
 * These are the seven groups the legacy `TopToolbar` draws as JSX, in the legacy order:
 * `Selection · Clipboard · History & Save · Transform · Arrange · Library · View & Zoom`. The designer
 * needs them as specs because the band measures the groups and moves the ones that do not fit a line
 * into the `⋯` menu, and a folded group can only become a submenu if the commands are described rather
 * than drawn.
 *
 * `TopToolbar` is deliberately left alone — the legacy `/t3000/hvac-designer` page keeps rendering it,
 * pixel for pixel. The two groups the designer first parked in the shell (history and the viewport) are
 * back here, and the shell's copies are switched off with `TopSpec.shellControls` on the HVAC layout, so
 * every command still exists exactly once. Their items are built from the same command objects the
 * shell's own strip drew (`hvacCommands.tsx`), not from a second set of handlers.
 *
 * Only the legacy `Insert` button is not reproduced: its handler is an empty function, so it would be a
 * dead control in the busiest group.
 *
 * The handler bodies are copied verbatim from `TopToolbar`, including the synthetic `noopEvent` that
 * the engine's `ToolOpt` methods expect.
 */
import React from "react";
import {
    AddRegular,
    AlignBottomRegular,
    AlignCenterHorizontalRegular,
    AlignCenterVerticalRegular,
    AlignLeftRegular,
    AlignRightRegular,
    AlignTopRegular,
    ArrowRotateClockwiseRegular,
    ArrowRotateCounterclockwiseRegular,
    ArrowUpRegular,
    ArrowDownRegular,
    ClipboardPasteRegular,
    CopyRegular,
    CursorRegular,
    CutRegular,
    DeleteRegular,
    FolderOpenRegular,
    GroupDismissRegular,
    GroupRegular,
    ImageRegular,
    LockClosedRegular,
    LockOpenRegular,
    ResizeImageRegular,
    SelectAllOnRegular
} from "@fluentui/react-icons";
import EvtOpt from "@/lib/t3-hvac/Event/EvtOpt";
import NvConstant from "@/lib/t3-hvac/Data/Constant/NvConstant";
import type { ToolGroupSpec } from "../../DocumentAdapter";
import { viewportCommands } from "../../commands/viewportCommands";
import { commandItems, hvacHistoryCommands, hvacResetZoomCommand, hvacZoomField } from "./hvacCommands";
import { hvacViewport } from "./hvacViewport";

const toolOpt = EvtOpt.toolOpt;

/** The engine's `ToolOpt` methods take a DOM event; a click from the shell has none. */
const noopEvent = { preventDefault: () => {}, stopPropagation: () => {} } as any;

/** Align choices, in the order the legacy menu lists them. */
const ALIGN_ITEMS = [
    { id: "align-left", label: "Align Left", icon: <AlignLeftRegular />, type: "lefts" },
    { id: "align-center-h", label: "Align Center H", icon: <AlignCenterHorizontalRegular />, type: "centers" },
    { id: "align-right", label: "Align Right", icon: <AlignRightRegular />, type: "rights" },
    { id: "align-top", label: "Align Top", icon: <AlignTopRegular />, type: "tops" },
    { id: "align-middle", label: "Align Center V", icon: <AlignCenterVerticalRegular />, type: "middles" },
    { id: "align-bottom", label: "Align Bottom", icon: <AlignBottomRegular />, type: "bottoms" }
];

/**
 * The HVAC tool groups: `Selection · Clipboard · History & Save · Transform · Arrange · Library ·
 * View & Zoom` — the legacy strip's own seven groups, in its own order, so muscle memory carries over.
 */
export function hvacToolGroups(): ToolGroupSpec[] {
    /*
     * The commands group 7 is built from: the shell's viewport set (zoom, rulers, grid) plus the
     * engine's own `ResetScaleAct`, which is what the legacy `Reset Zoom` button called.
     */
    const viewCommands = [...viewportCommands(hvacViewport), hvacResetZoomCommand()];

    return [
        {
            id: "selection",
            label: "Selection",
            items: [
                {
                    id: "select",
                    label: "Select",
                    icon: <CursorRegular />,
                    onSelect: () => toolOpt.SelectAct(noopEvent)
                },
                {
                    id: "lock",
                    label: "Lock",
                    icon: <LockClosedRegular />,
                    onSelect: () => toolOpt.LibLockAct(false)
                },
                {
                    id: "select-all",
                    label: "Select All",
                    icon: <SelectAllOnRegular />,
                    onSelect: () => toolOpt.SelectAllObjects()
                },
                {
                    id: "unlock",
                    label: "Unlock",
                    icon: <LockOpenRegular />,
                    onSelect: () => toolOpt.LibUnlockAct(false)
                }
            ]
        },
        {
            id: "clipboard",
            label: "Clipboard",
            items: [
                { id: "cut", label: "Cut", icon: <CutRegular />, onSelect: () => toolOpt.CutAct(noopEvent) },
                { id: "copy", label: "Copy", icon: <CopyRegular />, onSelect: () => toolOpt.CopyAct(noopEvent) },
                {
                    id: "duplicate",
                    label: "Duplicate",
                    icon: <AddRegular />,
                    onSelect: () => toolOpt.DuplicateAct(noopEvent)
                },
                {
                    id: "paste",
                    label: "Paste",
                    icon: <ClipboardPasteRegular />,
                    onSelect: () => toolOpt.PasteAct(noopEvent)
                },
                {
                    id: "delete",
                    label: "Delete",
                    icon: <DeleteRegular />,
                    onSelect: () => toolOpt.DeleteAct(noopEvent)
                }
            ]
        },
        {
            id: "history",
            label: "History & Save",
            /*
             * The legacy group 3, and the reason the band needs live state: `enabled()` reads the
             * engine's undo stack, so Undo/Redo grey out exactly when they would have in the shell.
             */
            items: commandItems(hvacHistoryCommands(), ["undo", "save", "redo", "clear"])
        },
        {
            id: "transform",
            label: "Transform",
            items: [
                {
                    id: "rotate",
                    label: "Rotate",
                    icon: <ArrowRotateClockwiseRegular />,
                    children: [45, 90, 180, 270].map((angle) => ({
                        id: `rotate-${angle}`,
                        label: `${angle}°`,
                        onSelect: () => toolOpt.RotateAct(noopEvent, angle)
                    }))
                },
                {
                    id: "align",
                    label: "Align",
                    icon: <AlignCenterHorizontalRegular />,
                    children: ALIGN_ITEMS.map((item) => ({
                        id: item.id,
                        label: item.label,
                        icon: item.icon,
                        onSelect: () => toolOpt.ShapeAlignAct(item.type)
                    }))
                },
                {
                    id: "flip",
                    label: "Flip",
                    icon: <ArrowRotateCounterclockwiseRegular />,
                    children: [
                        {
                            id: "flip-horizontal",
                            label: "Flip Horizontal",
                            onSelect: () => toolOpt.ShapeFlipHorizontalAct(noopEvent)
                        },
                        {
                            id: "flip-vertical",
                            label: "Flip Vertical",
                            onSelect: () => toolOpt.ShapeFlipVerticalAct(noopEvent)
                        }
                    ]
                },
                {
                    id: "make-same",
                    label: "Make same",
                    icon: <ResizeImageRegular />,
                    children: [
                        {
                            id: "same-width",
                            label: "Same Width",
                            onSelect: () => toolOpt.MakeSameSizeAct(noopEvent, 2)
                        },
                        {
                            id: "same-height",
                            label: "Same Height",
                            onSelect: () => toolOpt.MakeSameSizeAct(noopEvent, 1)
                        },
                        {
                            id: "same-size",
                            label: "Same Size",
                            onSelect: () => toolOpt.MakeSameSizeAct(noopEvent, 3)
                        }
                    ]
                }
            ]
        },
        {
            id: "arrange",
            label: "Arrange",
            items: [
                { id: "group", label: "Group", icon: <GroupRegular />, onSelect: () => toolOpt.GroupAct(noopEvent) },
                {
                    id: "bring-to-front",
                    label: "Bring to Front",
                    icon: <ArrowUpRegular />,
                    onSelect: () => toolOpt.ShapeBringToFrontAct(noopEvent)
                },
                {
                    id: "ungroup",
                    label: "Ungroup",
                    icon: <GroupDismissRegular />,
                    onSelect: () => toolOpt.UnGroupAct(noopEvent)
                },
                {
                    id: "send-to-back",
                    label: "Send to Back",
                    icon: <ArrowDownRegular />,
                    onSelect: () => toolOpt.ShapeSendToBackAct(noopEvent)
                }
            ]
        },
        {
            id: "library",
            label: "Library",
            items: [
                {
                    id: "add-to-library",
                    label: "Add to Library",
                    icon: <AddRegular />,
                    onSelect: () => toolOpt.AddToLibraryAct()
                },
                {
                    id: "load-library",
                    label: "Load Library",
                    icon: <FolderOpenRegular />,
                    onSelect: () => toolOpt.LoadLibraryAct()
                }
            ]
        },
        {
            id: "view",
            label: "View & Zoom",
            items: [
                {
                    /*
                     * The drawing has a background, so this belongs to the document and not to the
                     * shell. The engine's colour constants are passed as-is: the legacy toolbar fed
                     * `'white' | 'custom'` into an API that expects a colour, and `'custom'` silently
                     * set the fill to the string "custom".
                     */
                    id: "background",
                    label: "Background",
                    icon: <ImageRegular />,
                    children: [
                        { id: "bg-white", label: "White", onSelect: () => toolOpt.LibSetBackgroundColorAct(NvConstant.Colors.White) },
                        { id: "bg-gray", label: "Gray", onSelect: () => toolOpt.LibSetBackgroundColorAct(NvConstant.Colors.Gray) },
                        { id: "bg-black", label: "Black", onSelect: () => toolOpt.LibSetBackgroundColorAct(NvConstant.Colors.Black) },
                        {
                            id: "bg-transparent",
                            label: "Transparent",
                            onSelect: () => toolOpt.LibSetBackgroundColorAct(NvConstant.Colors.Trans)
                        }
                    ]
                },
                /*
                 * The rest of the legacy group 7: `Rulers · Grid · Reset Zoom` and the zoom cluster,
                 * with the settable box exactly where the legacy strip had it — between `−` and `+`.
                 * These are the very commands the shell's own strip drew (plus the engine's own reset),
                 * so nothing is re-implemented — only re-parented.
                 *
                 * `Fit to window` and `Zoom to 100%` are NOT here: both were the shell's command strip,
                 * which the legacy group never had (it had the single `Reset Zoom` above). Their commands
                 * stay registered on the bus, so `Ctrl+0` / `Ctrl+−` / `Ctrl+=` still work.
                 *
                 * Order matters twice over: it keeps `− [100] % +` together, and it puts the group's row
                 * break between `Reset Zoom` and the zoom cluster, so the box is never separated from its
                 * own buttons (a group is two rows of ceil(items / 2)).
                 */
                ...commandItems(viewCommands, ["toggleRulers", "toggleGrid", "resetScale", "zoomOut"]),
                hvacZoomField(),
                ...commandItems(viewCommands, ["zoomIn"])
            ]
        }
    ];
}
