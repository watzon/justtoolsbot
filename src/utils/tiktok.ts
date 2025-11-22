import * as cheerio from "cheerio";

export interface TikTokVideo {
    url: string;
    title: string;
    thumbnail: string;
    author: string;
    author_url: string;
    video_url: string;
    video_url_hd?: string;
    video_url_watermark?: string;
    music_url?: string;
}

export async function downloadTikTok(url: string): Promise<TikTokVideo | null> {
    try {
        // 1. Initial request to get cookies and form tokens
        const initialResponse = await fetch("https://musicaldown.com/en", {
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
        });

        if (!initialResponse.ok) {
            console.error("Failed to fetch musicaldown.com");
            return null;
        }

        const initialHtml = await initialResponse.text();
        const $ = cheerio.load(initialHtml);


        // Logic from @tobyg74/tiktok-api-dl/src/utils/downloader/musicaldownDownloader.ts
        const input = $("div > input").map((_, el) => $(el));
        const inputs: Record<string, string> = {
            [input.get(0)?.attr("name") || ""]: input.get(0)?.attr("value") || url,
            [input.get(1)?.attr("name") || ""]: input.get(1)?.attr("value") || "",
            [input.get(2)?.attr("name") || ""]: input.get(2)?.attr("value") || ""
        };

        // Remove empty keys if any
        delete inputs[""];

        // Extract cookies
        const cookieHeader = initialResponse.headers.get("set-cookie");
        const cookies = cookieHeader ? cookieHeader.split(";")[0] : "";

        // 2. POST request to download
        const formData = new URLSearchParams();
        for (const [key, value] of Object.entries(inputs)) {
            formData.append(key, value);
        }

        const headers: Record<string, string> = {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Cookie": cookies || "",
            "Origin": "https://musicaldown.com",
            "Referer": "https://musicaldown.com/en",
        };

        const downloadResponse = await fetch("https://musicaldown.com/download", {
            method: "POST",
            headers,
            body: formData,
        });

        if (!downloadResponse.ok) {
            console.error("Failed to post to musicaldown.com/download");
            return null;
        }

        const downloadHtml = await downloadResponse.text();
        const $download = cheerio.load(downloadHtml);

        // Parse results
        // Video URLs are usually in 'a' tags with specific attributes or text
        // The original library looked for 'a' tags in specific divs.

        const result: Partial<TikTokVideo> = {
            url,
            title: $download(".video-desc").text().trim(),
            author: $download(".video-author").text().trim(),
            thumbnail: $download(".img-area img").attr("src") || "",
            author_url: "", // Not always available directly
        };

        $download("a").each((_, el) => {
            const href = $(el).attr("href");
            const text = $(el).text().trim();
            const dataEvent = $(el).attr("data-event");

            if (!href || href === "#") return;

            if (dataEvent === "mp4_hd" || text.includes("HD")) {
                result.video_url_hd = href;
            } else if (dataEvent === "mp4" || text.includes("MP4")) {
                // Usually the first one is watermark-free or SD
                if (!result.video_url) {
                    result.video_url = href;
                }
            } else if (dataEvent === "watermark" || text.includes("Watermark")) {
                result.video_url_watermark = href;
            } else if (href.includes("mp3")) {
                result.music_url = href;
            }
        });

        // Fallback if specific data-events aren't found (sometimes they change)
        // Look for download buttons
        if (!result.video_url) {
            const downloadLinks = $download("a[href*='tiktok']").toArray();
            if (downloadLinks.length > 0) {
                result.video_url = $(downloadLinks[0]).attr("href") || "";
            }
        }

        if (result.video_url) {
            return result as TikTokVideo;
        }

        return null;

    } catch (error) {
        console.error("Error downloading TikTok:", error);
        return null;
    }
}
