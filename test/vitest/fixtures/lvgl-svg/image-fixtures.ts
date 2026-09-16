/**
 * Real bitmap fixtures for the image-geometry tests.
 *
 * Every one of these is an actual file, produced by `System.Drawing` (Windows) at **3x7** — the
 * dimensions are deliberately not square and not equal to each other, so a parser that swaps width and
 * height, or that reads a length field instead of a dimension, fails the test instead of passing it by
 * coincidence.
 *
 *     $bmp = New-Object System.Drawing.Bitmap 3,7
 *     $bmp.Save($memoryStream, [System.Drawing.Imaging.ImageFormat]::Png)   # and Jpeg/Gif/Bmp
 */

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAMAAAAHCAYAAADNufepAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAANSURBVBhXY6AVYGAAAABbAAEummiBAAAAAElFTkSuQmCC";

const JPEG = "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAHAAMDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD5/ooooA//2Q==";

const GIF = "R0lGODlhAwAHAPcAAAAAAAAAMwAAZgAAmQAAzAAA/wArAAArMwArZgArmQArzAAr/wBVAABVMwBVZgBVmQBVzABV/wCAAACAMwCAZgCAmQCAzACA/wCqAACqMwCqZgCqmQCqzACq/wDVAADVMwDVZgDVmQDVzADV/wD/AAD/MwD/ZgD/mQD/zAD//zMAADMAMzMAZjMAmTMAzDMA/zMrADMrMzMrZjMrmTMrzDMr/zNVADNVMzNVZjNVmTNVzDNV/zOAADOAMzOAZjOAmTOAzDOA/zOqADOqMzOqZjOqmTOqzDOq/zPVADPVMzPVZjPVmTPVzDPV/zP/ADP/MzP/ZjP/mTP/zDP//2YAAGYAM2YAZmYAmWYAzGYA/2YrAGYrM2YrZmYrmWYrzGYr/2ZVAGZVM2ZVZmZVmWZVzGZV/2aAAGaAM2aAZmaAmWaAzGaA/2aqAGaqM2aqZmaqmWaqzGaq/2bVAGbVM2bVZmbVmWbVzGbV/2b/AGb/M2b/Zmb/mWb/zGb//5kAAJkAM5kAZpkAmZkAzJkA/5krAJkrM5krZpkrmZkrzJkr/5lVAJlVM5lVZplVmZlVzJlV/5mAAJmAM5mAZpmAmZmAzJmA/5mqAJmqM5mqZpmqmZmqzJmq/5nVAJnVM5nVZpnVmZnVzJnV/5n/AJn/M5n/Zpn/mZn/zJn//8wAAMwAM8wAZswAmcwAzMwA/8wrAMwrM8wrZswrmcwrzMwr/8xVAMxVM8xVZsxVmcxVzMxV/8yAAMyAM8yAZsyAmcyAzMyA/8yqAMyqM8yqZsyqmcyqzMyq/8zVAMzVM8zVZszVmczVzMzV/8z/AMz/M8z/Zsz/mcz/zMz///8AAP8AM/8AZv8Amf8AzP8A//8rAP8rM/8rZv8rmf8rzP8r//9VAP9VM/9VZv9Vmf9VzP9V//+AAP+AM/+AZv+Amf+AzP+A//+qAP+qM/+qZv+qmf+qzP+q///VAP/VM//VZv/Vmf/VzP/V////AP//M///Zv//mf//zP///wAAAAAAAAAAAAAAACH5BAEAAPwALAAAAAADAAcAAAgJAAEIHEiwoMGAADs=";

const BMP = "Qk2KAAAAAAAAADYAAAAoAAAAAwAAAAcAAAABACAAAAAAAAAAAADEDgAAxA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

const u16le = (value: number): number[] => [value & 0xff, (value >> 8) & 0xff];
const u24le = (value: number): number[] => [...u16le(value), (value >> 16) & 0xff];
const u32le = (value: number): number[] => [...u24le(value), (value >> 24) & 0xff];

/**
 * `data:image/webp;base64,…` with the header built by hand, because Windows has no WebP encoder.
 *
 * `VP8X` (extended) declares the canvas size as two 24-bit little-endian values *minus one*, and `VP8L`
 * (lossless) packs 14 bits of width-1 and 14 bits of height-1 into one word — the two places a naive
 * reader goes wrong, which is why both are fixtures rather than comments.
 */
const WEBP_VP8X = webpHeader("VP8X", 4, 6);
const WEBP_VP8L = webpHeader("VP8L", 4, 6);

function webpHeader(fourcc: "VP8X" | "VP8L", width: number, height: number): string {
    const chunk =
        fourcc === "VP8X"
            ? [0x00, 0x00, 0x00, 0x00, ...u24le(width - 1), ...u24le(height - 1)]
            : [0x2f, ...u32le((height - 1) * 0x4000 + (width - 1))];
    const bytes: number[] = [];
    const ascii = (text: string) => {
        for (const ch of text) {
            bytes.push(ch.charCodeAt(0));
        }
    };
    ascii("RIFF");
    const riffSize = 4 + 8 + chunk.length + (chunk.length % 2);
    bytes.push(...u32le(riffSize));
    ascii("WEBP");
    ascii(fourcc);
    bytes.push(...u32le(chunk.length));
    bytes.push(...chunk);
    while (bytes.length % 2 === 1) {
        bytes.push(0);
    }
    let binary = "";
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary);
}

export const IMAGE_FIXTURES = {
    /** The dimensions every fixture below actually has. */
    width: 3,
    height: 7,
    /** The two hand-built WebP headers declare this instead. */
    webpWidth: 4,
    webpHeight: 6,
    png: `data:image/png;base64,${PNG}`,
    jpeg: `data:image/jpeg;base64,${JPEG}`,
    gif: `data:image/gif;base64,${GIF}`,
    bmp: `data:image/bmp;base64,${BMP}`,
    webpVp8x: `data:image/webp;base64,${WEBP_VP8X}`,
    webpVp8l: `data:image/webp;base64,${WEBP_VP8L}`,
};
