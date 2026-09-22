/**
 * Designer — the route element for `/t3000/designer/:kind/:id?`.
 *
 * Additive: this route is new, and the legacy `/t3000/hvac-designer` and `/t3000/eez` routes keep
 * rendering their original pages untouched.
 *
 * There is no catch-all route in the app (`App.tsx:620` is a comment), so an unknown kind or an
 * unimplemented one is handled here with an explicit, navigable state instead of a blank frame.
 */
import React, { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button, Spinner, Text, makeStyles, tokens } from "@fluentui/react-components";
import { DOCUMENT_KIND_SPECS, DOCUMENT_KINDS, isDocumentKind } from "../kinds";
import { DESIGNER_DOCUMENTS } from "../registry";

const useStyles = makeStyles({
    root: {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        backgroundColor: tokens.colorNeutralBackground1
    },
    centered: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        height: "100%",
        padding: "32px",
        textAlign: "center"
    },
    list: {
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        marginTop: "8px"
    },
    suspense: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        height: "100%"
    }
});

export const DesignerPage: React.FC = () => {
    const styles = useStyles();
    const { kind: kindParam, id } = useParams<{ kind?: string; id?: string }>();
    const location = useLocation();
    const navigate = useNavigate();

    const query = useMemo(() => new URLSearchParams(location.search), [location.search]);

    if (!kindParam || !isDocumentKind(kindParam)) {
        return (
            <div className={styles.root}>
                <div className={styles.centered}>
                    <Text size={500} weight="semibold">
                        Unknown document type
                    </Text>
                    <Text>
                        {kindParam ? `"${kindParam}" is not a document type this designer can open.` : "No document type was given."}
                    </Text>
                    <div className={styles.list}>
                        {DOCUMENT_KINDS.map((kind) => (
                            <Button
                                key={kind}
                                appearance="subtle"
                                size="small"
                                disabled={!DOCUMENT_KIND_SPECS[kind].available}
                                onClick={() => navigate(`/t3000/designer/${kind}`)}
                            >
                                {DOCUMENT_KIND_SPECS[kind].title}
                                {DOCUMENT_KIND_SPECS[kind].available ? "" : " (not available yet)"}
                            </Button>
                        ))}
                    </div>
                    <Button appearance="primary" onClick={() => navigate("/t3000/design")}>
                        Back to Design Hub
                    </Button>
                </div>
            </div>
        );
    }

    const entry = DESIGNER_DOCUMENTS[kindParam];

    if (!entry) {
        const spec = DOCUMENT_KIND_SPECS[kindParam];
        return (
            <div className={styles.centered}>
                <Text size={500} weight="semibold">
                    {spec.title}
                </Text>
                <Text>{`The ${spec.engine} document type is registered but not implemented yet.`}</Text>
                <Button appearance="primary" onClick={() => navigate("/t3000/design")}>
                    Back to Design Hub
                </Button>
            </div>
        );
    }

    const Host = entry.Host;

    return (
        <React.Suspense
            fallback={
                    <div className={styles.suspense}>
                        <Spinner size="tiny" />
                        <Text size={200}>Loading document…</Text>
                    </div>
                }
        >
            <Host kind={kindParam} id={id} query={query} navigate={navigate} />
        </React.Suspense>
    );
};
