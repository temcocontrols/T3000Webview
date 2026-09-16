/**
 * ADDITIVE: new file. The natural (source) size of a bitmap, read from the bitmap's own header.
 *
 * LVGL draws a bitmap that is not exactly its widget's size at the bitmap's SOURCE size, placed
 * inside the widget by an alignment — it does not stretch it across the box (measured on
 * `home_screen`'s imgbutton: the same 38x60 PNG in a 35x60 widget reads **0** differing pixels with
 * the bitmap's top-left at the widget's top-left, 6 px centred, 22 px stretched across the box and
 * **128 px** when the aspect ratio is preserved inside the box, which is what the renderer did while
 * the natural size was unknown).
 *
 * The state dump carries the geometry for an `lv_image` object (`imgW`/`imgH`, from
 * `lv_image_get_src_width`), but the T3000 widget model resolves its own image ASSET by name to a data
 * URI, and a widget can also draw a bitmap as a `bg_image_src` (an imgbutton does) which the dump does
 * not describe at all. So the source size has to be readable from the source itself.
 *
 * Only the header is read — width and height, no decoding — and only for the formats the project's
 * assets actually use (PNG primarily, plus the ones a browser can be handed without extra work). An
 * unrecognised source returns `undefined` rather than a guess, which leaves the caller on its previous
 * behaviour.
 */

export interface BitmapSize {
    width: number;
    height: number;
}

/** Plausibility bound, so a misread header cannot produce a nonsensical placement. */
const MAX_DIMENSION = 65535;

function size(width: number, height: number): BitmapSize | undefined {
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
        return undefined;
    }
    if (width <= 0 || height <= 0 || width > MAX_DIMENSION || height > MAX_DIMENSION) {
        return undefined;
    }
    return { width, height };
}

/**
 * The bytes of a `data:` URL, or `undefined` for anything else (a relative URL, an http URL, an SVG
 * data URL). Those are resolved asynchronously by the browser and cannot be measured here, so they
 * keep the renderer's previous behaviour.
 */
function dataUrlBytes(source: string): { mediaType: string; bytes: Uint8Array } | undefined {
    if (!source.startsWith("data:")) {
        return undefined;
    }
    const comma = source.indexOf(",");
    if (comma === -1) {
        return undefined;
    }
    const header = source.slice(0, comma);
    if (!/;base64$/i.test(header)) {
        return undefined;
    }
    const mediaType = header.slice(5, header.indexOf(";")).toLowerCase();
    try {
        const binary = atob(source.slice(comma + 1).replace(/\s+/g, ""));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return { mediaType, bytes };
    } catch {
        return undefined;
    }
}

const readU32BE = (b: Uint8Array, i: number): number =>
    ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
const readU16BE = (b: Uint8Array, i: number): number => (b[i] << 8) | b[i + 1];
const readU16LE = (b: Uint8Array, i: number): number => b[i] | (b[i + 1] << 8);
const readU24LE = (b: Uint8Array, i: number): number => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
const readI32LE = (b: Uint8Array, i: number): number => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24);

function pngSize(b: Uint8Array): BitmapSize | undefined {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (b.length < 24 || signature.some((value, index) => b[index] !== value)) {
        return undefined;
    }
    // The first chunk of a PNG is always IHDR: length(4) type(4) width(4) height(4).
    if (String.fromCharCode(b[12], b[13], b[14], b[15]) !== "IHDR") {
        return undefined;
    }
    return size(readU32BE(b, 16), readU32BE(b, 20));
}

function jpegSize(b: Uint8Array): BitmapSize | undefined {
    if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) {
        return undefined;
    }
    let i = 2;
    while (i + 9 < b.length) {
        if (b[i] !== 0xff) {
            i += 1;
            continue;
        }
        const marker = b[i + 1];
        // Padding fill bytes, and the markers that carry no payload.
        if (marker === 0xff) {
            i += 1;
            continue;
        }
        if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
            i += 2;
            continue;
        }
        const length = readU16BE(b, i + 2);
        if (length < 2) {
            return undefined;
        }
        // SOF0-SOF15, minus the arithmetic/huffman table markers (0xc4, 0xc8, 0xcc).
        const isFrameHeader =
            marker >= 0xc0 &&
            marker <= 0xcf &&
            marker !== 0xc4 &&
            marker !== 0xc8 &&
            marker !== 0xcc;
        if (isFrameHeader) {
            // length(2) precision(1) height(2) width(2)
            return size(readU16BE(b, i + 7), readU16BE(b, i + 5));
        }
        if (marker === 0xda) {
            // Start of scan: the frame header, if there was one, is already behind us.
            return undefined;
        }
        i += 2 + length;
    }
    return undefined;
}

function gifSize(b: Uint8Array): BitmapSize | undefined {
    const header = b.length < 10 ? "" : String.fromCharCode(b[0], b[1], b[2], b[3], b[4], b[5]);
    if (header !== "GIF89a" && header !== "GIF87a") {
        return undefined;
    }
    return size(readU16LE(b, 6), readU16LE(b, 8));
}

function bmpSize(b: Uint8Array): BitmapSize | undefined {
    if (b.length < 26 || b[0] !== 0x42 || b[1] !== 0x4d) {
        return undefined;
    }
    return size(Math.abs(readI32LE(b, 18)), Math.abs(readI32LE(b, 22)));
}

function webpSize(b: Uint8Array): BitmapSize | undefined {
    // RIFF(4) size(4) WEBP(4) fourcc(4) chunkSize(4) — the smallest thing that can be a WebP header.
    if (b.length < 20 || String.fromCharCode(b[0], b[1], b[2], b[3]) !== "RIFF" || String.fromCharCode(b[8], b[9], b[10], b[11]) !== "WEBP") {
        return undefined;
    }
    const fourcc = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (fourcc === "VP8X") {
        if (b.length < 30) {
            return undefined;
        }
        // Canvas size minus one, stored as two 24-bit little-endian values.
        return size(readU24LE(b, 24) + 1, readU24LE(b, 27) + 1);
    }
    if (fourcc === "VP8L") {
        if (b.length < 25 || b[20] !== 0x2f) {
            return undefined;
        }
        const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
        return size((bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1);
    }
    if (fourcc === "VP8 ") {
        // Lossy key frame: 3-byte start code, then two 14-bit dimensions.
        if (b.length < 30 || b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) {
            return undefined;
        }
        return size(readU16LE(b, 26) & 0x3fff, readU16LE(b, 28) & 0x3fff);
    }
    return undefined;
}

/**
 * The bitmap's source size, or `undefined` when the source is not a bitmap this can measure.
 *
 * `source` is what goes straight into `<image href>`: a data URL (the widget model's assets are
 * `data:image/png;base64,…`) or a URL.
 */
export function imageNaturalSize(source: string | undefined): BitmapSize | undefined {
    if (!source) {
        return undefined;
    }
    const decoded = dataUrlBytes(source);
    if (!decoded) {
        return undefined;
    }
    const { mediaType, bytes } = decoded;
    if (mediaType === "image/png") {
        return pngSize(bytes);
    }
    if (mediaType === "image/jpeg" || mediaType === "image/jpg") {
        return jpegSize(bytes);
    }
    if (mediaType === "image/gif") {
        return gifSize(bytes);
    }
    if (mediaType === "image/bmp" || mediaType === "image/x-ms-bmp") {
        return bmpSize(bytes);
    }
    if (mediaType === "image/webp") {
        return webpSize(bytes);
    }
    return undefined;
}
