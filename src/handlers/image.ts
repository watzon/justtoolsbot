import { InputFile, type Bot } from "grammy";
import type { MyContext } from "../types";
import { emojifyImage, downloadImage } from "../utils/image";
import { config } from "../config";

export function registerImageHandlers(bot: Bot<MyContext>) {
    bot.on("message:photo", async (ctx) => {
        // If it's a forward, ignore it as it's handled by forwarded.ts
        if (ctx.msg.forward_origin) return;

        const photos = ctx.msg.photo;
        const photo = photos[photos.length - 1];
        if (!photo) return;



        await ctx.reply("What would you like to do with this image?", {
            reply_to_message_id: ctx.msg.message_id,
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🎨 Emojify", callback_data: "emojify_photo" }]
                ]
            }
        });
    });

    bot.callbackQuery("emojify_photo", async (ctx) => {
        await ctx.answerCallbackQuery("Emojifying...");

        const msg = ctx.msg?.reply_to_message;
        if (!msg || !msg.photo) {
            await ctx.reply("❌ Original photo not found.");
            return;
        }

        const photos = msg.photo;
        const photo = photos[photos.length - 1];
        if (!photo) return;

        const fileId = photo.file_id;

        await ctx.replyWithChatAction("upload_photo");

        try {
            const file = await ctx.api.getFile(fileId);
            if (!file.file_path) {
                throw new Error("File path not found");
            }

            const url = `https://api.telegram.org/file/bot${config.botToken}/${file.file_path}`;
            const imageBuffer = await downloadImage(url);
            const emojifiedBuffer = await emojifyImage(imageBuffer);

            const replyOptions: { reply_to_message_id?: number } = {};
            if (msg.message_id) {
                replyOptions.reply_to_message_id = msg.message_id;
            }
            await ctx.replyWithDocument(new InputFile(emojifiedBuffer, "emoji.webp"), replyOptions);
        } catch (error) {
            console.error("Error emojifying image:", error);
            await ctx.reply("❌ Failed to emojify image.");
        }
    });
}
