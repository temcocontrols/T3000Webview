// Browser stub for sha256 hashing
export default function sha256(input: string | Uint8Array): string {
    let hash = 0;
    if (typeof input === "string") {
        for (let i = 0; i < input.length; i++) {
            hash = ((hash << 5) - hash) + input.charCodeAt(i);
            hash = hash & hash;
        }
    } else {
        for (let i = 0; i < input.length; i++) {
            hash = ((hash << 5) - hash) + input[i];
            hash = hash & hash;
        }
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
}
