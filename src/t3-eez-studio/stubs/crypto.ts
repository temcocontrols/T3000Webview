// Browser stub for Node.js 'crypto' module
export function randomBytes(size: number): Buffer {
    const buf = Buffer.alloc(size);
    crypto.getRandomValues(new Uint8Array(buf));
    return buf;
}

// ---- Hash (chainable) ----
// Implements createHash("md5"|"sha256") with update().digest("hex")
// Uses a JS MD5 implementation for deterministic file-change detection

// Compact MD5 implementation (public-domain algorithm)
function md5Hex(data: string): string {
    // MD5 helper functions
    function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
        const n = ((a + q + x + t) >>> 0);
        return ((n << s) | (n >>> (32 - s))) + b;
    }
    function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
        return cmn((b & c) | ((~b) & d), a, b, x, s, t);
    }
    function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
        return cmn((b & d) | (c & (~d)), a, b, x, s, t);
    }
    function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
        return cmn(b ^ c ^ d, a, b, x, s, t);
    }
    function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
        return cmn(c ^ (b | (~d)), a, b, x, s, t);
    }

    // Convert string to UTF-8 bytes, then to 32-bit words
    const utf8 = unescape(encodeURIComponent(data));
    const len = utf8.length;
    const words: number[] = [];
    for (let i = 0; i < len; i++) {
        words[i >> 2] |= (utf8.charCodeAt(i) & 0xff) << ((i % 4) * 8);
    }
    words[len >> 2] |= 0x80 << ((len % 4) * 8);
    // Pad to 448 mod 512 bits (14 * 32 = 448)
    const padTarget = (((len + 8) >>> 6) + 1) * 16;
    for (let i = (len + 1); i < padTarget * 4; i++) {
        // fill remaining words with zeros (already zero from initialization)
    }
    // Ensure array is filled
    while (words.length < padTarget + 2) words.push(0);
    // Append bit length (low then high)
    const bitLen = len * 8;
    words[padTarget] = bitLen;
    words[padTarget + 1] = (bitLen / Math.pow(2, 32)) >>> 0;

    let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;

    for (let k = 0; k < words.length; k += 16) {
        const aa = a, bb = b, cc = c, dd = d;
        a = ff(a, b, c, d, words[k + 0], 7, 0xd76aa478);
        d = ff(d, a, b, c, words[k + 1], 12, 0xe8c7b756);
        c = ff(c, d, a, b, words[k + 2], 17, 0x242070db);
        b = ff(b, c, d, a, words[k + 3], 22, 0xc1bdceee);
        a = ff(a, b, c, d, words[k + 4], 7, 0xf57c0faf);
        d = ff(d, a, b, c, words[k + 5], 12, 0x4787c62a);
        c = ff(c, d, a, b, words[k + 6], 17, 0xa8304613);
        b = ff(b, c, d, a, words[k + 7], 22, 0xfd469501);
        a = ff(a, b, c, d, words[k + 8], 7, 0x698098d8);
        d = ff(d, a, b, c, words[k + 9], 12, 0x8b44f7af);
        c = ff(c, d, a, b, words[k + 10], 17, 0xffff5bb1);
        b = ff(b, c, d, a, words[k + 11], 22, 0x895cd7be);
        a = ff(a, b, c, d, words[k + 12], 7, 0x6b901122);
        d = ff(d, a, b, c, words[k + 13], 12, 0xfd987193);
        c = ff(c, d, a, b, words[k + 14], 17, 0xa679438e);
        b = ff(b, c, d, a, words[k + 15], 22, 0x49b40821);

        a = gg(a, b, c, d, words[k + 1], 5, 0xf61e2562);
        d = gg(d, a, b, c, words[k + 6], 9, 0xc040b340);
        c = gg(c, d, a, b, words[k + 11], 14, 0x265e5a51);
        b = gg(b, c, d, a, words[k + 0], 20, 0xe9b6c7aa);
        a = gg(a, b, c, d, words[k + 5], 5, 0xd62f105d);
        d = gg(d, a, b, c, words[k + 10], 9, 0x02441453);
        c = gg(c, d, a, b, words[k + 15], 14, 0xd8a1e681);
        b = gg(b, c, d, a, words[k + 4], 20, 0xe7d3fbc8);
        a = gg(a, b, c, d, words[k + 9], 5, 0x21e1cde6);
        d = gg(d, a, b, c, words[k + 14], 9, 0xc33707d6);
        c = gg(c, d, a, b, words[k + 3], 14, 0xf4d50d87);
        b = gg(b, c, d, a, words[k + 8], 20, 0x455a14ed);
        a = gg(a, b, c, d, words[k + 13], 5, 0xa9e3e905);
        d = gg(d, a, b, c, words[k + 2], 9, 0xfcefa3f8);
        c = gg(c, d, a, b, words[k + 7], 14, 0x676f02d9);
        b = gg(b, c, d, a, words[k + 12], 20, 0x8d2a4c8a);

        a = hh(a, b, c, d, words[k + 5], 4, 0xfffa3942);
        d = hh(d, a, b, c, words[k + 8], 11, 0x8771f681);
        c = hh(c, d, a, b, words[k + 11], 16, 0x6d9d6122);
        b = hh(b, c, d, a, words[k + 14], 23, 0xfde5380c);
        a = hh(a, b, c, d, words[k + 1], 4, 0xa4beea44);
        d = hh(d, a, b, c, words[k + 4], 11, 0x4bdecfa9);
        c = hh(c, d, a, b, words[k + 7], 16, 0xf6bb4b60);
        b = hh(b, c, d, a, words[k + 10], 23, 0xbebfbc70);
        a = hh(a, b, c, d, words[k + 13], 4, 0x289b7ec6);
        d = hh(d, a, b, c, words[k + 0], 11, 0xeaa127fa);
        c = hh(c, d, a, b, words[k + 3], 16, 0xd4ef3085);
        b = hh(b, c, d, a, words[k + 6], 23, 0x04881d05);
        a = hh(a, b, c, d, words[k + 9], 4, 0xd9d4d039);
        d = hh(d, a, b, c, words[k + 12], 11, 0xe6db99e5);
        c = hh(c, d, a, b, words[k + 15], 16, 0x1fa27cf8);
        b = hh(b, c, d, a, words[k + 2], 23, 0xc4ac5665);

        a = ii(a, b, c, d, words[k + 0], 6, 0xf4292244);
        d = ii(d, a, b, c, words[k + 7], 10, 0x432aff97);
        c = ii(c, d, a, b, words[k + 14], 15, 0xab9423a7);
        b = ii(b, c, d, a, words[k + 5], 21, 0xfc93a039);
        a = ii(a, b, c, d, words[k + 12], 6, 0x655b59c3);
        d = ii(d, a, b, c, words[k + 3], 10, 0x8f0ccc92);
        c = ii(c, d, a, b, words[k + 10], 15, 0xffeff47d);
        b = ii(b, c, d, a, words[k + 1], 21, 0x85845dd1);
        a = ii(a, b, c, d, words[k + 8], 6, 0x6fa87e4f);
        d = ii(d, a, b, c, words[k + 15], 10, 0xfe2ce6e0);
        c = ii(c, d, a, b, words[k + 6], 15, 0xa3014314);
        b = ii(b, c, d, a, words[k + 13], 21, 0x4e0811a1);
        a = ii(a, b, c, d, words[k + 4], 6, 0xf7537e82);
        d = ii(d, a, b, c, words[k + 11], 10, 0xbd3af235);
        c = ii(c, d, a, b, words[k + 2], 15, 0x2ad7d2bb);
        b = ii(b, c, d, a, words[k + 9], 21, 0xeb86d391);

        a = (a + aa) >>> 0; b = (b + bb) >>> 0;
        c = (c + cc) >>> 0; d = (d + dd) >>> 0;
    }

    const hex = (x: number) => ("00000000" + (x >>> 0).toString(16)).slice(-8);
    return hex(a) + hex(b) + hex(c) + hex(d);
}

class Hash {
    private _data: string = "";
    private _algorithm: string;

    constructor(algorithm: string) {
        this._algorithm = algorithm;
    }

    update(data: string | Buffer | Uint8Array): this {
        if (typeof data === "string") {
            this._data += data;
        } else if (Buffer.isBuffer(data)) {
            this._data += data.toString("binary");
        } else {
            this._data += new TextDecoder().decode(data);
        }
        return this;
    }

    digest(encoding: "hex" | "base64" | "latin1"): string {
        let hex: string;
        if (this._algorithm === "sha256" || this._algorithm === "sha-256") {
            // For SHA-256 we use a simple but deterministic hash (not crypto-secure)
            let hash = 0;
            for (let i = 0; i < this._data.length; i++) {
                hash = ((hash << 5) - hash + this._data.charCodeAt(i)) >>> 0;
            }
            hex = (hash >>> 0).toString(16).padStart(8, "0");
            // Pad to 64 hex chars (SHA-256 length) for interface compatibility
            hex = hex + "0".repeat(64 - hex.length);
        } else {
            // Default: MD5
            hex = md5Hex(this._data);
        }
        if (encoding === "hex") return hex;
        if (encoding === "base64") return btoa(hex.match(/\w{2}/g)!.map(a => String.fromCharCode(parseInt(a, 16))).join(""));
        return hex;
    }
}

export function createHash(algorithm: string): Hash {
    return new Hash(algorithm);
}

export function randomUUID(): string {
    return crypto.randomUUID();
}

export default { randomBytes, createHash, randomUUID };
