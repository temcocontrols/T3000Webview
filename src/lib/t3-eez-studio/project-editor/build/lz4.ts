import { compressBound, compressBlock } from "lz4js";

// compressBlock needs a hash table (Int32Array[65536]) — shared across calls like lz4js internals
const _hashTable = new Int32Array(1 << 16);

export async function compress(buffer: Buffer, compressionLevel: number) {
    const dstCapacity = compressBound(buffer.length);
    const dstBuffer = Buffer.alloc(dstCapacity);
    // Reset hash table before each block (lz4js reuses it)
    for (let i = 0; i < _hashTable.length; i++) _hashTable[i] = 0;
    const compressedSize = compressBlock(buffer, dstBuffer, 0, buffer.length, _hashTable);

    const compressedBuffer = dstBuffer.subarray(0, compressedSize);
    return { compressedBuffer, compressedSize };
}
