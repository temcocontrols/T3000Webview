/**
 * deploy-manifest.ts — shared deploy-manifest hashing + payload builder.
 *
 * Single source of truth for how screens/images are hashed so the deploy
 * change-detection is byte-for-byte identical everywhere it is used:
 *
 *   - "Load from device" (device-import.ts) SEEDS a deploy-manifest.json
 *     baseline right after import — the device already has exactly what was
 *     loaded — so the FIRST "Deploy to Device" is incremental (a no-op when
 *     nothing changed, otherwise only the edited screens/images get pushed)
 *     instead of an unconditional full push of every screen.
 *   - The deploy pipeline (deployService.ts) diffs against that manifest on
 *     every deploy and refreshes it after a fully successful push.
 *
 * If these hashes ever drifted between the two call sites, every screen would
 * look "changed" on the next deploy, so both import and export must use these
 * helpers (never a private copy).
 */

/** Deterministic content signature (length + FNV-1a) used to diff deploys.
 *  Only used to decide whether a screen/image actually changed since the last
 *  successful deploy — not a cryptographic hash. */
export function contentSignature(text: string): string {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = (h * 0x01000193) >>> 0;
    }
    return `${text.length}:${h.toString(16)}`;
}

export interface DeployManifestImage {
    name: string;
    width?: number;
    height?: number;
    color_format?: number | string;
}

export interface DeployManifestJson {
    exportedAt: string;
    serialNumber?: number;
    panelId?: number;
    screenCount: number;
    imageCount: number;
    screens: string[];
    images: DeployManifestImage[];
    screenHashes: Record<string, string>;
    imageHashes: Record<string, string>;
}

/** Build the deploy-manifest.json payload from an exported device JSON +
 *  image list. The deploy pipeline refreshes this same shape after a fully
 *  successful push; device-import uses it to seed the baseline after
 *  "Load from device". */
export function buildDeployManifest(opts: {
    /** transformToDeviceJson(project) output: native screens keyed by name. */
    screens: Record<string, unknown>;
    /** extractDeviceImages(project) output (data_base64 hashed per image). */
    images: {
        name: string;
        width?: number;
        height?: number;
        color_format?: number | string;
        data_base64?: string;
    }[];
    serialNumber?: number;
    panelId?: number;
}): DeployManifestJson {
    const screenNames = Object.keys(opts.screens);
    const screenHashes: Record<string, string> = {};
    for (const [name, data] of Object.entries(opts.screens)) {
        screenHashes[name] = contentSignature(JSON.stringify(data));
    }
    const imageHashes: Record<string, string> = {};
    for (const img of opts.images) {
        if (typeof img.data_base64 === "string") {
            imageHashes[img.name] = contentSignature(img.data_base64);
        }
    }
    return {
        exportedAt: new Date().toISOString(),
        serialNumber: opts.serialNumber,
        panelId: opts.panelId,
        screenCount: screenNames.length,
        imageCount: opts.images.length,
        screens: screenNames,
        images: opts.images.map((i) => ({
            name: i.name,
            width: i.width,
            height: i.height,
            color_format: i.color_format,
        })),
        screenHashes,
        imageHashes,
    };
}
