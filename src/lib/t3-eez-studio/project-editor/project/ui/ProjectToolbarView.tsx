/**
 * EEZ project editor — the toolbar on its own, for the Designer shell's top bar (P2.6).
 *
 * The toolbar **cannot be rendered bare**: its stylesheet scopes the interesting rules under
 * `.EezStudio_ProjectEditor_MainContentWrapper > .EezStudio_ProjectEditor_ToolbarNav`
 * (`_stylesheets/project-editor.less:68-105`) — including the `display: flex` that lays its button
 * groups out in a row. Rendered outside that ancestor the groups fall back to block layout and the
 * toolbar becomes a ~280 px-tall vertical stack.
 *
 * So the wrapper travels with the toolbar, and the wrapper's own `flex-grow: 1` (meant to fill the
 * project editor) is neutralised here so it does not eat the shell's top bar.
 */
import React from "react";

import { Toolbar } from "project-editor/project/ui/Toolbar";

export const ProjectToolbarView: React.FC = () => (
    <div
        className="EezStudio_ProjectEditor_MainContentWrapper"
        style={{ flexGrow: 0, minHeight: 0, width: "100%" }}
    >
        <Toolbar />
    </div>
);
