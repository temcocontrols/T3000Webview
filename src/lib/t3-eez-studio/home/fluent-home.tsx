/**
 * Shared Fluent UI wrappers for home tab pages.
 * Replaces eez-studio-ui components with Fluent UI v9 equivalents.
 */
import React from "react";
import {
    Button,
    Input,
    Text,
    makeStyles,
    tokens,
    mergeClasses,
} from "@fluentui/react-components";
import {
    AddRegular,
    SearchRegular,
    DismissRegular,
    FolderOpenRegular,
    MoreHorizontalRegular,
} from "@fluentui/react-icons";

// ── Styles ───────────────────────────────────────────────────────────

const useStyles = makeStyles({
    // Navigation tab items
    navItem: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "4px",
        padding: `${tokens.spacingVerticalM} 0`,
        margin: `0 10px`,
        width: "110px",
        cursor: "pointer",
        borderBottom: "3px solid transparent",
        borderRadius: "0",
        transition: "color 0.15s, border-color 0.15s",
        color: tokens.colorNeutralForeground2,
        "&:hover": {
            color: tokens.colorNeutralForeground1,
        },
    },
    navItemSelected: {
        borderBottomColor: tokens.colorBrandForeground1,
        color: tokens.colorNeutralForeground1,
    },
    navIcon: {
        fontSize: "32px",
        display: "flex",
    },
    navLabel: {
        fontSize: "13px",
        fontWeight: "600",
    },

    // Generic toolbar
    toolbar: {
        display: "flex",
        gap: tokens.spacingHorizontalXS,
        alignItems: "center",
        padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
        borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
        minHeight: "36px",
    },

    // Search bar
    searchInput: {
        maxWidth: "280px",
    },

    // List item card
    listItem: {
        display: "flex",
        gap: tokens.spacingHorizontalS,
        alignItems: "center",
        padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
        cursor: "pointer",
        transition: "background-color 0.15s",
        "&:hover": {
            backgroundColor: tokens.colorNeutralBackground1Hover,
        },
    },
    listItemSelected: {
        backgroundColor: tokens.colorNeutralBackground1Selected,
    },
});

// ── Navigation Tab Item ──────────────────────────────────────────────

interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    title?: string;
    selected?: boolean;
    onClick: () => void;
}

export const NavItem: React.FC<NavItemProps> = ({ icon, label, title, selected, onClick }) => {
    const styles = useStyles();
    return (
        <div
            className={mergeClasses(styles.navItem, selected && styles.navItemSelected)}
            onClick={onClick}
            title={title}
        >
            <div className={styles.navIcon}>{icon}</div>
            <span className={styles.navLabel}>{label}</span>
        </div>
    );
};

// ── Icon Button ──────────────────────────────────────────────────────

interface IconBtnProps {
    title?: string;
    icon: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    selected?: boolean;
}

export const IconBtn: React.FC<IconBtnProps> = ({ title, icon, onClick, disabled, selected }) => (
    <Button
        appearance={selected ? "primary" : "subtle"}
        icon={icon as React.ReactElement}
        title={title}
        onClick={onClick}
        disabled={disabled}
        size="small"
        style={{ minWidth: "28px", height: "28px", padding: "2px" }}
    />
);

// ── Search Input ─────────────────────────────────────────────────────

interface SearchProps {
    value: string;
    placeholder?: string;
    onChange: (value: string) => void;
}

export const SearchBox: React.FC<SearchProps> = ({ value, placeholder, onChange }) => (
    <Input
        contentBefore={<SearchRegular />}
        placeholder={placeholder ?? "Search..."}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        size="small"
        style={{ maxWidth: "280px" }}
    />
);

// ── Primary Button ───────────────────────────────────────────────────

interface PrimaryBtnProps {
    text: string;
    title?: string;
    icon?: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
}

export const PrimaryBtn: React.FC<PrimaryBtnProps> = ({ text, title, icon, onClick, disabled }) => (
    <Button
        appearance="primary"
        icon={icon as React.ReactElement | undefined}
        title={title}
        onClick={onClick}
        disabled={disabled}
        size="small"
        style={{ padding: "2px 10px", minHeight: "28px" }}
    >
        {text}
    </Button>
);
