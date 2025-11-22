import { InlineKeyboard, InputFile } from "grammy";
import { downloadTikTok } from "../utils/tiktok";

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

        const result = await downloadTikTok(url);

        if (result && result.video_url) {
            const TELEGRAM_MAX_SIZE = 50 * 1024 * 1024; // 50MB
            let videoUrl = result.video_url;

            // Prefer HD if available and within size limits (we'll check size next)
            if (result.video_url_hd) {
                videoUrl = result.video_url_hd;
            }

            // Check size
            let downloadedVideo: { buffer: Uint8Array; url: string; size: number } | null = null;

            try {
                await ctx.editMessageText("Checking video size...");

                // Try the selected URL first
                let response = await fetch(videoUrl, { method: 'HEAD' });
                let contentLength = response.headers.get('content-length');
                let fileSize = contentLength ? Number.parseInt(contentLength, 10) : 0;

                // If HD is too big or unknown, try standard
                if ((fileSize > TELEGRAM_MAX_SIZE || fileSize === 0) && result.video_url !== videoUrl) {
                    videoUrl = result.video_url;
                    response = await fetch(videoUrl, { method: 'HEAD' });
                    contentLength = response.headers.get('content-length');
                    fileSize = contentLength ? Number.parseInt(contentLength, 10) : 0;
                }

                // Download
                await ctx.editMessageText("Downloading video...");
                const fullResponse = await fetch(videoUrl);
                const buffer = await fullResponse.arrayBuffer();
                const bufferUint8 = new Uint8Array(buffer);
                fileSize = bufferUint8.length;

                if (fileSize <= TELEGRAM_MAX_SIZE) {
                    downloadedVideo = { buffer: bufferUint8, url: videoUrl, size: fileSize };
                }

            } catch (error) {
                console.error("Error checking/downloading video:", error);
            }

            if (downloadedVideo) {
                const caption = `🎵 ${result.title || "TikTok video"}\n\n👤 ${result.author || "Unknown"}\n📊 ${(downloadedVideo.size / 1024 / 1024).toFixed(1)}MB`;

                await ctx.replyWithVideo(new InputFile(downloadedVideo.buffer), {
                    caption: caption.length <= 1024 ? caption : `🎵 ${result.title || "TikTok video"}`,
                });

                // Delete the "Fetching..." message
                await ctx.deleteMessage();
            } else {
                await ctx.editMessageText("❌ Video too large for Telegram (max 50MB) or could not be downloaded.");
            }

        } else {
            await ctx.editMessageText("Could not download the TikTok video. It might be private or deleted.");
        }

    } catch (error) {
        console.error("Error downloading TikTok video:", error);
        await ctx.editMessageText("An error occurred while downloading the TikTok video. Please try again later.");
    }
}