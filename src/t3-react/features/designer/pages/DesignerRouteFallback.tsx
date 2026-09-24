/**
 * Designer — the route's `<Suspense>` fallback.
 *
 * This one boundary covers **both** lazy steps of a designer navigation: the route element
 * (`DesignerPage`) and the document host chunk behind it (`DesignerPage` deliberately adds no boundary of
 * its own — see its return statement). That makes this fallback the single loading state a designer route
 * paints, and `components/DesignerLoading` its only node.
 *
 * It names the document from the **URL**, because the URL is the only thing known this early: the chunks
 * it is waiting for are exactly the ones that would know the kind. `kinds.ts` mints the wording, so the
 * same sentence is shown when a document later waits for its own data (`HvacDocument`, `LcdDocument`).
 */
import React from "react";
import { useParams } from "react-router-dom";

import { DesignerLoading } from "../components/DesignerLoading";
import { designerLoadingLabel, isDocumentKind } from "../kinds";

/** Shown when the URL carries no kind this designer knows — `DesignerPage` explains that case itself. */
const UNKNOWN_KIND_LABEL = "Loading designer…";

export const DesignerRouteFallback: React.FC = () => {
    const { kind } = useParams<{ kind?: string }>();

    return <DesignerLoading label={isDocumentKind(kind) ? designerLoadingLabel(kind) : UNKNOWN_KIND_LABEL} />;
};
