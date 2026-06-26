import { compressBound, compressBlock } from "lz4js";

export async function compress(buffer: Buffer, compressionLevel: number) {
    const dstCapacity = compressBound(buffer.length);
    const dstBuffer = Buffer.alloc(dstCapacity);
    const compressedSize = compressBlock(buffer, dstBuffer);

    const compressedBuffer = dstBuffer.subarray(0, compressedSize);
    return { compressedBuffer, compressedSize };
}
