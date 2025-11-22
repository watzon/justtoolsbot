import { InlineKeyboard, InputFile } from "grammy";
import { instagramGetUrl } from "instagram-url-direct";

import type { MyContext } from "../types";

export async function instagramCommand(ctx: MyContext) {
    if (!ctx.msg) return;
    const url = ctx.match;


    if (!url || typeof url !== "string") {
        await ctx.reply("Please provide an Instagram URL. Usage: /ig <url>");
        return;
    }

    if (!url.includes("instagram.com")) {
        await ctx.reply("That doesn't look like a valid Instagram URL.");
        return;
    }

    const keyboard = new InlineKeyboard().text("Download", "ig_download");

    await ctx.reply("What would you like to do with this post?", {
        reply_markup: keyboard,
        reply_parameters: {
            message_id: ctx.msg.message_id,
        },
    });
}

export async function handleInstagramDownload(ctx: MyContext) {
    await ctx.answerCallbackQuery("Downloading...");

    const message = ctx.callbackQuery?.message;
    if (!message || !message.reply_to_message || !("text" in message.reply_to_message)) {
        await ctx.reply("Could not find the original link.");
        return;
    }

    const originalText = message.reply_to_message.text;
    // Extract URL from the original text (assuming the command is like "/ig <url>")
    // We can just grab the first thing that looks like a URL or just use the whole text if we strip the command
    // But the command might be "/ig <url>" so we need to parse it again or just regex for the url.
    const urlMatch = originalText?.match(/(https?:\/\/[^\s]+)/);
    const url = urlMatch ? urlMatch[0] : null;

    if (!url) {
        await ctx.reply("Could not find a URL in the original message.");
        return;
    }

    try {
        await ctx.editMessageText("Fetching media...");

        const result = await instagramGetUrl(url);

        if (result.url_list.length > 0) {
            const media = result.url_list;

            if (media.length === 1) {
                // Single media item
                const mediaUrl = media[0];
                if (!mediaUrl) {
                    await ctx.editMessageText("Error: Media URL not found.");
                    return;
                }

                const response = await fetch(mediaUrl);
                const buffer = await response.arrayBuffer();
                const bufferUint8 = new Uint8Array(buffer);
                const contentType = response.headers.get("content-type");

                if (contentType?.startsWith("video")) {
                    await ctx.replyWithVideo(new InputFile(bufferUint8));
                } else {
                    await ctx.replyWithPhoto(new InputFile(bufferUint8));
                }
            } else {
                // Multiple media items - send as media group
                const mediaGroup = [];

                for (const mediaUrl of media) {
                    const response = await fetch(mediaUrl);
                    const buffer = await response.arrayBuffer();
                    const bufferUint8 = new Uint8Array(buffer);
                    const contentType = response.headers.get("content-type");

                    if (contentType?.startsWith("video")) {
                        mediaGroup.push({
                            type: "video" as const,
                            media: new InputFile(bufferUint8),
                        });
                    } else {
                        mediaGroup.push({
                            type: "photo" as const,
                            media: new InputFile(bufferUint8),
                        });
                    }
                }

                await ctx.replyWithMediaGroup(mediaGroup);
            }

            // Delete the "Fetching..." message
            await ctx.deleteMessage();

        } else {
            await ctx.editMessageText("Could not find any media at that URL.");
        }

    } catch (error) {
        console.error("Error downloading Instagram media:", error);
        await ctx.editMessageText("An error occurred while downloading the media.");
    }
}

