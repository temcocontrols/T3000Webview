// Browser stub for Node.js 'crypto' module
export function randomBytes(size: number): Buffer {
    const buf = Buffer.alloc(size);
    crypto.getRandomValues(new Uint8Array(buf));
    return buf;
}
export function createHash(_alg: string) {
    // Minimal digest stub — not a real hash
    return {
        update: () => ({ digest: () => "00000000000000000000000000000000" }),
    };
}
export function randomUUID(): string {
    return crypto.randomUUID();
}
export default { randomBytes, createHash, randomUUID };
