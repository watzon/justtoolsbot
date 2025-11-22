import { InlineKeyboard, InputFile } from "grammy";
// @ts-ignore - Package uses CommonJS exports
import tiktokDownloader from "@tobyg74/tiktok-api-dl";

import type { MyContext } from "../types";

export async function tiktokCommand(ctx: MyContext) {
    if (!ctx.msg) return;
    const url = ctx.match;

    if (!url || typeof url !== "string") {
        await ctx.reply("Please provide a TikTok URL. Usage: /tiktok <url>");
        return;
    }

    if (!url.includes("tiktok.com")) {
        await ctx.reply("That doesn't look like a valid TikTok URL.");
        return;
    }

    const keyboard = new InlineKeyboard().text("Download", "tt_download");

    await ctx.reply("What would you like to do with this video?", {
        reply_markup: keyboard,
        reply_parameters: {
            message_id: ctx.msg.message_id,
        },
    });
}

export async function handleTiktokDownload(ctx: MyContext) {
    await ctx.answerCallbackQuery("Downloading...");

    const message = ctx.callbackQuery?.message;
    if (!message || !message.reply_to_message || !("text" in message.reply_to_message)) {
        await ctx.reply("Could not find the original link.");
        return;
    }

    const originalText = message.reply_to_message.text;
    const urlMatch = originalText?.match(/(https?:\/\/[^\s]+)/);
    const url = urlMatch ? urlMatch[0] : null;

    if (!url) {
        await ctx.reply("Could not find a URL in the original message.");
        return;
    }

    try {
        await ctx.editMessageText("Fetching TikTok video...");

        // Try v3 first (most reliable), fallback to v2 if needed
        let result: { status: string; result?: unknown; message?: string };
        let version: "v3" | "v2" = "v3";

        try {
            result = await tiktokDownloader.Downloader(url, { version: "v3" });
        } catch (error) {
            console.log("v3 failed, trying v2:", error);
            version = "v2";
            result = await tiktokDownloader.Downloader(url, { version: "v2" });
        }

        if (result.status === "success" && result.result) {
            const content = result.result as {
                type: string;
                author?: { nickname?: string };
                desc?: string;
                videoWatermark?: string;
                videoSD?: string;
                videoHD?: string;
                video?: { playAddr?: string[] };
                images?: string[];
            };
            const authorName = content.author?.nickname || "unknown";

            if (content.type === "video") {
                // Handle video download with version-specific logic and size checking
                const TELEGRAM_MAX_SIZE = 50 * 1024 * 1024; // 50MB
                let videoUrls: string[] = [];

                if (version === "v3") {
                    // v3 has videoHD, videoSD, videoWatermark - prioritize smallest first
                    if (content.videoWatermark) videoUrls.push(content.videoWatermark);
                    if (content.videoSD) videoUrls.push(content.videoSD);
                    if (content.videoHD) videoUrls.push(content.videoHD);
                } else {
                    // v2 has video.playAddr array
                    if (content.video?.playAddr) {
                        videoUrls = [...content.video.playAddr];
                    }
                }

                // Try to download the smallest version first, then larger if needed
                let downloadedVideo: { buffer: Uint8Array; url: string; size: number } | null = null;

                for (const url of videoUrls) {
                    try {
                        await ctx.editMessageText("Checking video size...");

                        const response = await fetch(url, { method: 'HEAD' });
                        const contentLength = response.headers.get('content-length');

                        if (contentLength) {
                            const fileSize = Number.parseInt(contentLength, 10);
                            console.log(`Video URL ${url} size: ${fileSize} bytes (${(fileSize / 1024 / 1024).toFixed(2)}MB)`);

                            if (fileSize <= TELEGRAM_MAX_SIZE) {
                                // Download the video if it's within size limit
                                const fullResponse = await fetch(url);
                                const buffer = await fullResponse.arrayBuffer();
                                const bufferUint8 = new Uint8Array(buffer);

                                downloadedVideo = { buffer: bufferUint8, url, size: fileSize };
                                break; // Found a suitable video
                            }
                        } else {
                            // No content-length header, try downloading anyway
                            const fullResponse = await fetch(url);
                            const buffer = await fullResponse.arrayBuffer();
                            const bufferUint8 = new Uint8Array(buffer);
                            const fileSize = bufferUint8.length;

                            console.log(`Video URL ${url} downloaded size: ${fileSize} bytes (${(fileSize / 1024 / 1024).toFixed(2)}MB)`);

                            if (fileSize <= TELEGRAM_MAX_SIZE) {
                                downloadedVideo = { buffer: bufferUint8, url, size: fileSize };
                                break;
                            }
                        }
                    } catch (error) {
                        console.log(`Failed to fetch video URL ${url}:`, error);
                    }
                }

                if (downloadedVideo) {
                    const caption = `🎵 ${content.desc || "TikTok video"}\n\n👤 ${authorName}\n📊 ${(downloadedVideo.size / 1024 / 1024).toFixed(1)}MB`;

                    await ctx.replyWithVideo(new InputFile(downloadedVideo.buffer), {
                        caption: caption.length <= 1024 ? caption : `🎵 ${content.desc || "TikTok video"}`,
                    });

                    // Delete the "Fetching..." message
                    await ctx.deleteMessage();
                } else {
                    await ctx.editMessageText("❌ Video too large for Telegram (max 50MB). Try with a shorter TikTok video or use a different downloader.");
                }
            } else if (content.type === "image" && content.images && content.images.length > 0) {
                // Handle image carousel (multiple images)
                const mediaGroup = [];

                for (const imageUrl of content.images) {
                    const response = await fetch(imageUrl);
                    const buffer = await response.arrayBuffer();
                    const bufferUint8 = new Uint8Array(buffer);

                    mediaGroup.push({
                        type: "photo" as const,
                        media: new InputFile(bufferUint8),
                    });
                }

                await ctx.replyWithMediaGroup(mediaGroup);

                // Send caption as a separate message
                const caption = `📸 TikTok photo set\n\n👤 ${authorName}`;
                await ctx.reply(caption.length <= 1024 ? caption : "📸 TikTok photo set");

                // Delete the "Fetching..." message
                await ctx.deleteMessage();
            } else {
                await ctx.editMessageText("Error: No media found in the TikTok.");
            }
        } else {
            await ctx.editMessageText(`Could not download the TikTok video: ${result.message || "Unknown error"}`);
        }

    } catch (error) {
        console.error("Error downloading TikTok video:", error);
        await ctx.editMessageText("An error occurred while downloading the TikTok video. Please try again later.");
    }
}