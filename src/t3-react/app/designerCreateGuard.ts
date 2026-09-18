/**
 * Designer create hand-off — "is this folder ours to delete?".
 *
 * The direct-to-editor create retries, because a failed attempt can leave a half-written project folder and
 * EEZ's wizard refuses to create over an existing one — so the retry deletes the target first. **That cleanup
 * must only ever remove a folder this run created.** Deleting a pre-existing folder destroys the user's
 * project: measured 2026-09-17, clicking "Create & Open" on the LVGL tile (whose name defaults to the drawing
 * type, "LVGL 9.5") removed an existing project by that name, and the retry then wrote a fresh template over
 * another one ("LVGL with Flow 9.5").
 *
 * Pure module: no React, no fetch — the decision is unit-testable, and the effect that uses it stays a few
 * lines long. The caller is responsible for the *fail-safe* direction (see `EezStudioApp`): when the project
 * list cannot be read, assume the folder exists, so nothing is deleted on a guess.
 */

/** Normalises a `location/name` target to the folder name EEZ's project list reports. */
export function folderNameOf(target: string | null | undefined): string {
    return (target ?? "")
        .replace(/[\/\\]+$/, "")
        .split(/[\/\\]/)
        .pop()!
        .trim()
        .toLowerCase();
}

/** True when the project list already contains the target folder — i.e. the user's project. */
export function targetExists(
    projects: readonly { folder?: string }[] | null | undefined,
    target: string | null | undefined
): boolean {
    const name = folderNameOf(target);
    if (!name) {
        return false;
    }
    return (projects ?? []).some(
        (project) => (project?.folder ?? "").trim().toLowerCase() === name
    );
}

/**
 * What to do when a create attempt failed.
 *
 * `existedBefore` is the answer to "was this folder already there before we started?".
 *
 *  - `existedBefore` ⇒ **no retry and no cleanup**: the folder is the user's, the create legitimately failed,
 *    and retrying would only repeat it (the cleanup that would make it succeed is exactly the destructive
 *    one). The caller reports the collision instead.
 *  - otherwise ⇒ retry as before, cleaning the partial folder between attempts.
 */
export function retryPlan(
    existedBefore: boolean,
    attempt: number,
    maxAttempts: number = 3
): { retry: boolean; cleanup: boolean } {
    if (existedBefore) {
        return { retry: false, cleanup: false };
    }
    return { retry: attempt < maxAttempts, cleanup: true };
}
