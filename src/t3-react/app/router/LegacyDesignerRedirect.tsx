/**
 * Designer — the router component for the P4 legacy redirects.
 *
 * Thin on purpose: all the mapping (and the query-preservation rule) lives in the pure
 * `legacyRedirects.ts`, so it can be unit-tested without a router.
 *
 * `replace` is used so Back does not bounce the user between the old and the new URL.
 */
import React from "react";
import { Navigate, useLocation } from "react-router-dom";

import { legacyRedirectTarget } from "./legacyRedirects";

export const LegacyDesignerRedirect: React.FC = () => {
    const location = useLocation();
    const target = legacyRedirectTarget(location.pathname, location.search);

    // Unreachable for the routes this is mounted on; the Design Hub is a safe fallback.
    return <Navigate to={target ?? "/t3000/design"} replace />;
};
