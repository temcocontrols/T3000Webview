/**
 * The bottom dock's **tab status** — the check · warning · error glyph and the message count EEZ's own tab
 * bar drew for *Checks* · *Output* · *Search* · *References*.
 *
 * The origin had this in flexlayout's `onRenderTab` (`ProjectEditor.tsx:146-215`): *Checks* and *Output* got a
 * `material:check`, or `material:warning` / `material:error` with the number of messages, and a `<Loader/>`
 * while a check was running; *Search* / *References* got their result count. Hosted, flexlayout draws no tab
 * bar at all — the shell draws one from the `PanelTab` specs the document publishes — so the document has to
 * supply the glyph.
 *
 * It supplies an **element, not a value**: the shell only re-renders when its layout changes, while
 * `outputSectionsStore` changes on every check and every build. These components are `observer`s, so they
 * re-render on their own — a run that fails updates the tab while the dock sits closed.
 *
 * The store is read from the published snapshot (`activeProject`) rather than from context: the tab strip is
 * drawn in the shell's tree, outside the `ProjectContext.Provider` the panel *bodies* get.
 */
import React from "react";
import { observer } from "mobx-react";
import { makeStyles, tokens } from "@fluentui/react-components";
import { WarningRegular } from "@fluentui/react-icons";

import { Icon } from "eez-studio-ui/icon";
import { Loader } from "eez-studio-ui/loader";

import { getActiveProject, subscribeActiveProject } from "project-editor/activeProject";
import { Section } from "project-editor/store/output-sections";

/** Tab-strip size: the head is 32 px, so the glyph has to be smaller than the label. */
const ICON_SIZE = 16;

const useStyles = makeStyles({
    /*
     * EEZ coloured these with `.error` / `.warning` (`project-editor.less:42-46`), but those selectors are
     * scoped to the *legacy* page's wrapper — the shell's head is not inside it, so the glyphs would be
     * neutral. Fluent tokens keep the meaning and follow the app's theme.
     */
    error: { color: tokens.colorPaletteRedForeground1 },
    warning: { color: tokens.colorPaletteDarkOrangeForeground1 },
    info: { color: tokens.colorNeutralForeground3 },
    /** A build that is up to date with the project — the origin's green check. */
    ok: { color: tokens.colorPaletteGreenForeground1 }
});

/** The store, reactively — the tab strip lives outside the panels' `ProjectContext`. */
function useActiveProjectStore() {
    return React.useSyncExternalStore(subscribeActiveProject, getActiveProject, getActiveProject);
}

/**
 * The leading glyph of a dock tab: a spinner while the section is working, else the worst message it holds,
 * else a check.
 *
 * *Search* and *References* get **no glyph**: the origin drew only the loader and the result count for them
 * (`onRenderTab`), and a ✔ there would claim "all good" about a search that found nothing. They keep their
 * count (`OutputSectionCount`) and their spinner.
 */
export const OutputSectionIcon = observer(({ sectionId }: { sectionId: Section }) => {
    const styles = useStyles();
    const projectStore = useActiveProjectStore();
    const section = projectStore?.outputSectionsStore.getSection(sectionId);

    if (!section) {
        return null;
    }

    if (section.loading) {
        return <Loader size={ICON_SIZE} />;
    }

    if (section.showsSearchResults) {
        return null;
    }

    if (section.numErrors > 0) {
        return <Icon icon="material:error" className={styles.error} size={ICON_SIZE} />;
    }

    if (section.numWarnings > 0) {
        /*
         * Fluent's outline triangle, not the material glyph the origin used (`material:warning`): that one is a
         * *solid* triangle with a knocked-out `!`, which at 16 px in a 32 px strip reads as a blob. This is the
         * same icon the rest of the app uses for a warning (`WarningRegular`, e.g. `RecentAlarms.tsx`), and it
         * sits well next to the ✔.
         */
        return (
            <WarningRegular fontSize={ICON_SIZE} className={styles.warning} />
        );
    }

    /*
     * The green check is *Output*-only and means more than "no errors": the last successful build is still
     * the current revision, i.e. what is on disk matches the project (`onRenderTab`'s own test).
     */
    const buildIsUpToDate =
        sectionId === Section.OUTPUT &&
        projectStore!.lastSuccessfulBuildRevision === projectStore!.lastRevision;

    return (
        <Icon
            icon="material:check"
            className={buildIsUpToDate ? styles.ok : styles.info}
            size={ICON_SIZE}
        />
    );
});

/**
 * The count EEZ put in the tab's text — `Checks (3)`.
 *
 * One number, not a sum: the errors *or* the warnings, whichever EEZ would have named; the search sections
 * count their results instead. `null` while there is nothing to count, so the chip disappears rather than
 * showing a zero.
 */
export const OutputSectionCount = observer(({ sectionId }: { sectionId: Section }) => {
    const projectStore = useActiveProjectStore();
    const section = projectStore?.outputSectionsStore.getSection(sectionId);

    if (!section) {
        return null;
    }

    const count = section.showsSearchResults
        ? section.messages.searchResults.length
        : section.numErrors > 0
        ? section.numErrors
        : section.numWarnings;

    return count > 0 ? <>{count}</> : null;
});
