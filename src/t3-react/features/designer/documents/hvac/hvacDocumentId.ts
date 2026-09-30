/**
 * Designer / HVAC — which drawing a route addresses.
 *
 * PURE MODULE: no React, no DOM, no engine imports.
 *
 * WHY THIS EXISTS. An HVAC drawing is opened two ways, and only one of them used to carry an identity:
 *
 *   · the Design Hub's list and the project catalog link to `designerPath('hvac-schematic', d.id)` — the id is
 *     the **path** segment (`kinds.ts`), so the document knew which record it was opening;
 *   · the Hub's own *Create & Open* (`NewDrawingDialog.tsx:129-141`) navigates to
 *     `/t3000/designer/hvac-schematic?device=<serial>&graphic=<n>&name=<name>` — **no id**, because at that
 *     moment no drawing exists yet. The device/graphic pair *is* the drawing's identity as far as the user is
 *     concerned, and it is what every later reload of that URL means.
 *
 * With no id, `prepareEngineDocument(undefined)` took its anonymous branch — clear the engine's storage — and
 * `persistOpenDocument` had no id to write a record under. So a drawing made on such a URL was never saved:
 * the next load (or reload) showed an empty canvas. That is a data-loss bug, not a rendering one.
 *
 * The rule below is the whole fix: the pair from the query becomes the same kind of id the path would have
 * carried (`device-<serial>-graphic-<n>`), so the drawing is prepared, mirrored and reopened under one stable
 * key. Because the Hub lists records straight out of `t3-hvac-drawings` (`designHubService.readHvacDrawings`),
 * a drawing saved this way also appears in the Hub and reopens from it with the id in the path.
 *
 * The path id wins when both are present: it is the record id the Hub itself minted.
 */

/** The drawing id a route addresses: the path segment, else the identity implied by `?device=&graphic=`. */
export function resolveHvacDocumentId(id: string | undefined, query: URLSearchParams): string | undefined {
    const pathId = (id ?? "").trim();
    if (pathId) {
        return pathId;
    }

    const device = (query.get("device") ?? "").trim();
    const graphic = (query.get("graphic") ?? "").trim();
    if (!device && !graphic) {
        return undefined;
    }

    /*
     * `device-<serial>-graphic-<n>`: readable in the Hub's project list, and safe as a URL path segment and as
     * a file name (the record is also mirrored to disk under `t3-hvac/<id>/<id>.json`).
     */
    return ["device", sanitize(device), graphic ? `graphic-${sanitize(graphic)}` : ""].filter(Boolean).join("-");
}

/** `?name=` — the drawing's name, so a drawing created from the Hub is not "Untitled Drawing" until renamed. */
export function resolveHvacDocumentName(query: URLSearchParams): string | undefined {
    return (query.get("name") ?? "").trim() || undefined;
}

/** The device serial the drawing belongs to (`?device=`), as the Hub's `serialNumber` records it. */
export function resolveHvacDocumentSerial(query: URLSearchParams): number | undefined {
    const device = (query.get("device") ?? "").trim();
    const serial = Number(device);
    return device !== "" && Number.isFinite(serial) ? serial : undefined;
}

/** Keeps an id URL- and file-name-safe without changing anything a user typed. */
function sanitize(value: string): string {
    return value.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "unknown";
}
