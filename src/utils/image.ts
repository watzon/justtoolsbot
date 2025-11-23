import sharp from "sharp";

/**
 * Resizes and crops an image to 100x100px and converts it to WEBP.
 * @param imageBuffer The input image buffer.
 * @returns The processed image buffer.
 */
export async function emojifyImage(imageBuffer: Buffer): Promise<Buffer> {
    return sharp(imageBuffer)
        .resize(100, 100, {
            fit: "cover",
            position: "center",
        })
        .webp()
        .toBuffer();
}

/**
 * Downloads an image from a URL.
 * @param url The URL of the image.
 * @returns The image buffer.
 */
export async function downloadImage(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}
