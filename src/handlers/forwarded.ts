import { InputFile, type Bot } from "grammy";
import type { MyContext } from "../types";
import { emojifyImage, downloadImage } from "../utils/image";
import { config } from "../config";

interface ForwardedMessageInfo {
    originalSender: string;
    originalChat: string;
    originalDate: string;
    forwardDate: string;
    messageType: string;
    hasMedia: boolean;
    hasText: boolean;
    entities: string[];
}

function analyzeForwardedMessage(ctx: MyContext): ForwardedMessageInfo | null {
    const msg = ctx.msg;
    if (!msg || !msg.forward_origin) return null;

    const info: ForwardedMessageInfo = {
        originalSender: "",
        originalChat: "",
        originalDate: "",
        forwardDate: new Date(msg.forward_origin.date * 1000).toISOString(),
        messageType: "",
        hasMedia: false,
        hasText: !!msg.text,
        entities: []
    };

    // Analyze forward origin
    switch (msg.forward_origin.type) {
        case "user":
            info.originalSender = `${msg.forward_origin.sender_user.first_name} ${msg.forward_origin.sender_user.last_name || ""}`.trim();
            if (msg.forward_origin.sender_user.username) {
                info.originalSender += ` (@${msg.forward_origin.sender_user.username})`;
            }
            break;
        case "chat":
            info.originalChat = msg.forward_origin.sender_chat.title || "Unknown Chat";
            if (msg.forward_origin.author_signature) {
                info.originalSender += ` (${msg.forward_origin.author_signature})`;
            }
            break;
        case "channel":
            info.originalChat = msg.forward_origin.chat.title || "Unknown Channel";
            if (msg.forward_origin.chat.username) {
                info.originalChat += ` (@${msg.forward_origin.chat.username})`;
            }
            if (msg.forward_origin.author_signature) {
                info.originalSender += ` (${msg.forward_origin.author_signature})`;
            }
            break;
        case "hidden_user":
            info.originalSender = msg.forward_origin.sender_user_name;
            break;
    }

    // Determine message type and media presence
    if (msg.photo) {
        info.messageType = "Photo";
        info.hasMedia = true;
    } else if (msg.video) {
        info.messageType = "Video";
        info.hasMedia = true;
    } else if (msg.audio) {
        info.messageType = "Audio";
        info.hasMedia = true;
    } else if (msg.document) {
        info.messageType = "Document";
        info.hasMedia = true;
    } else if (msg.sticker) {
        info.messageType = "Sticker";
        info.hasMedia = true;
    } else if (msg.voice) {
        info.messageType = "Voice";
        info.hasMedia = true;
    } else if (msg.video_note) {
        info.messageType = "Video Note";
        info.hasMedia = true;
    } else if (msg.animation) {
        info.messageType = "GIF/Animation";
        info.hasMedia = true;
    } else if (msg.text) {
        info.messageType = "Text";
    } else if (msg.location) {
        info.messageType = "Location";
    } else if (msg.venue) {
        info.messageType = "Venue";
    } else if (msg.contact) {
        info.messageType = "Contact";
    } else if (msg.poll) {
        info.messageType = "Poll";
    } else if (msg.game) {
        info.messageType = "Game";
    } else {
        info.messageType = "Unknown";
    }

    // Extract entities
    const entities = msg.entities || msg.caption_entities || [];
    info.entities = [...new Set(entities.map(e => e.type))];

    return info;
}

function createMessageInfo(info: ForwardedMessageInfo): string {
    let message = "<b>📩 Forwarded Message Analysis</b>\n\n";

    if (info.originalSender) {
        message += `<b>👤 Original Sender:</b> <code>${escapeHtml(info.originalSender)}</code>\n`;
    }

    if (info.originalChat) {
        message += `<b>💬 Original Chat:</b> <code>${escapeHtml(info.originalChat)}</code>\n`;
    }

    message += `<b>📅 Forwarded:</b> <code>${info.forwardDate}</code>\n`;
    message += `<b>🏷️ Type:</b> <code>${info.messageType}</code>\n`;

    if (info.hasMedia) {
        message += "<b>🖼️ Contains Media:</b> Yes\n";
    }

    if (info.hasText) {
        message += "<b>📝 Contains Text:</b> Yes\n";
    }

    if (info.entities.length > 0) {
        message += `<b>🔗 Entities:</b> <code>${info.entities.join(", ")}</code>\n`;
    }

    return message;
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function createInlineButtons(info: ForwardedMessageInfo) {
    // Always show Get JSON button
    const buttons: { text: string; callback_data: string }[] = [
        { text: "📄 Get JSON", callback_data: "forwarded_get_json" }
    ];

    // Add contextual buttons based on message type
    if (info.hasMedia) {
        buttons.push({ text: "💾 Download Media", callback_data: "forwarded_download_media" });
    }

    if (info.messageType === "Photo") {
        buttons.push({ text: "🔍 Photo Info", callback_data: "forwarded_photo_info" });
        buttons.push({ text: "🎨 Emojify", callback_data: "forwarded_emojify" });
    }

    if (info.messageType === "Video") {
        buttons.push({ text: "🎬 Video Info", callback_data: "forwarded_video_info" });
    }

    if (info.messageType === "Document") {
        buttons.push({ text: "📋 Document Details", callback_data: "forwarded_document_info" });
    }

    if (info.entities.includes("url")) {
        buttons.push({ text: "🔗 Extract URLs", callback_data: "forwarded_extract_urls" });
    }

    if (info.entities.includes("hashtag")) {
        buttons.push({ text: "#️⃣ Extract Hashtags", callback_data: "forwarded_extract_hashtags" });
    }

    if (info.entities.includes("mention")) {
        buttons.push({ text: "@️⃣ Extract Mentions", callback_data: "forwarded_extract_mentions" });
    }

    if (info.hasText || info.entities.length > 0) {
        buttons.push({ text: "📊 Full Analysis", callback_data: "forwarded_full_analysis" });
    }

    // Group buttons in rows of 2
    const keyboard: { text: string; callback_data: string }[][] = [];
    for (let i = 0; i < buttons.length; i += 2) {
        const currentButton = buttons[i];
        if (!currentButton) continue; // Skip if somehow undefined

        const row: { text: string; callback_data: string }[] = [currentButton];

        if (i + 1 < buttons.length) {
            const nextButton = buttons[i + 1];
            if (nextButton) {
                row.push(nextButton);
            }
        }
        keyboard.push(row);
    }

    return { reply_markup: { inline_keyboard: keyboard } };
}

async function handleGetJSON(ctx: MyContext) {
    await ctx.answerCallbackQuery("loading");

    const msg = ctx.msg?.reply_to_message;
    if (!msg) {
        await ctx.reply("❌ Message not found.");
        return;
    }

    const msgJson = JSON.stringify(msg, null, 2);

    // Check if message is too long for Telegram (4096 characters)
    if (msgJson.length > 4000) {
        // Split into chunks
        const chunks = msgJson.match(/.{1,4000}/g) || [];
        const firstChunk = chunks[0] || "";
        await ctx.reply(`<b>📄 Message JSON</b> (Part 1/${chunks.length}):\n\n<code>${escapeHtml(firstChunk)}</code>`, {
            parse_mode: "HTML"
        });

        for (let i = 1; i < chunks.length; i++) {
            const chunk = chunks[i];
            await ctx.reply(`<b>📄 Message JSON</b> (Part ${i + 1}/${chunks.length}):\n\n<code>${escapeHtml(chunk || "")}</code>`, {
                parse_mode: "HTML"
            });
        }
    } else {
        await ctx.reply(`<b>📄 Message JSON:</b>\n\n<code>${escapeHtml(msgJson)}</code>`, {
            parse_mode: "HTML"
        });
    }
}

async function handleExtractURLs(ctx: MyContext) {
    await ctx.answerCallbackQuery("loading");

    const msg = ctx.msg?.reply_to_message;
    if (!msg) {
        await ctx.reply("❌ Message not found.");
        return;
    }

    const urls: string[] = [];

    // Extract from text
    if (msg.text) {
        const urlRegex = /https?:\/\/[^\s]+/g;
        const matches = msg.text.match(urlRegex) || [];
        urls.push(...matches);
    }

    // Extract from caption
    if (msg.caption) {
        const urlRegex = /https?:\/\/[^\s]+/g;
        const matches = msg.caption.match(urlRegex) || [];
        urls.push(...matches);
    }

    // Extract from entities
    const entities = msg.entities || msg.caption_entities || [];
    for (const entity of entities) {
        if (entity.type === "url" && entity.offset !== undefined && entity.length !== undefined) {
            const text = msg.text || msg.caption || "";
            urls.push(text.substring(entity.offset, entity.offset + entity.length));
        } else if (entity.type === "text_link" && entity.url) {
            urls.push(entity.url);
        }
    }

    if (urls.length === 0) {
        await ctx.reply("🔗 No URLs found in this message.");
    } else {
        const uniqueUrls = [...new Set(urls)];
        let response = `<b>🔗 Found ${uniqueUrls.length} URL(s):</b>\n\n`;
        uniqueUrls.forEach((url, index) => {
            response += `${index + 1}. <code>${escapeHtml(url)}</code>\n`;
        });
        await ctx.reply(response, { parse_mode: "HTML" });
    }
}

async function handleExtractHashtags(ctx: MyContext) {
    await ctx.answerCallbackQuery("loading");

    const msg = ctx.msg?.reply_to_message;
    if (!msg) {
        await ctx.reply("❌ Message not found.");
        return;
    }

    const hashtags: string[] = [];

    // Extract from text
    if (msg.text) {
        const hashtagRegex = /#\w+/g;
        const matches = msg.text.match(hashtagRegex) || [];
        hashtags.push(...matches);
    }

    // Extract from caption
    if (msg.caption) {
        const hashtagRegex = /#\w+/g;
        const matches = msg.caption.match(hashtagRegex) || [];
        hashtags.push(...matches);
    }

    if (hashtags.length === 0) {
        await ctx.reply("#️⃣ No hashtags found in this message.");
    } else {
        const uniqueHashtags = [...new Set(hashtags)];
        let response = `<b>#️⃣ Found ${uniqueHashtags.length} hashtag(s):</b>\n\n`;
        uniqueHashtags.forEach((hashtag, index) => {
            response += `${index + 1}. <code>${escapeHtml(hashtag)}</code>\n`;
        });
        await ctx.reply(response, { parse_mode: "HTML" });
    }
}

async function handleExtractMentions(ctx: MyContext) {
    await ctx.answerCallbackQuery("loading");

    const msg = ctx.msg?.reply_to_message;
    if (!msg) {
        await ctx.reply("❌ Message not found.");
        return;
    }

    const mentions: string[] = [];

    // Extract from text
    if (msg.text) {
        const mentionRegex = /@\w+/g;
        const matches = msg.text.match(mentionRegex) || [];
        mentions.push(...matches);
    }

    // Extract from caption
    if (msg.caption) {
        const mentionRegex = /@\w+/g;
        const matches = msg.caption.match(mentionRegex) || [];
        mentions.push(...matches);
    }

    // Extract from entities
    const entities = msg.entities || msg.caption_entities || [];
    for (const entity of entities) {
        if (entity.type === "mention" && entity.offset !== undefined && entity.length !== undefined) {
            const text = msg.text || msg.caption || "";
            mentions.push(text.substring(entity.offset, entity.offset + entity.length));
        }
    }

    if (mentions.length === 0) {
        await ctx.reply("@️⃣ No mentions found in this message.");
    } else {
        const uniqueMentions = [...new Set(mentions)];
        let response = `<b>@️⃣ Found ${uniqueMentions.length} mention(s):</b>\n\n`;
        uniqueMentions.forEach((mention, index) => {
            response += `${index + 1}. <code>${escapeHtml(mention)}</code>\n`;
        });
        await ctx.reply(response, { parse_mode: "HTML" });
    }
}

async function handleFullAnalysis(ctx: MyContext) {
    await ctx.answerCallbackQuery("loading");

    const msg = ctx.msg?.reply_to_message;
    if (!msg) {
        await ctx.reply("❌ Message not found.");
        return;
    }

    const info = analyzeForwardedMessage(ctx);

    if (!info) {
        await ctx.reply("❌ Unable to analyze this message.");
        return;
    }

    let analysis = `<b>📊 Complete Message Analysis</b>

<b>📋 Basic Information:</b>
• Message ID: <code>${msg.message_id}</code>
• Forward Date: <code>${info.forwardDate}</code>
• Message Type: <code>${info.messageType}</code>

<b>👥 Source Information:</b>`;

    if (info.originalSender) {
        analysis += `\n• Original Sender: <code>${escapeHtml(info.originalSender)}</code>`;
    }

    if (info.originalChat) {
        analysis += `\n• Original Chat: <code>${escapeHtml(info.originalChat)}</code>`;
    }

    analysis += `

<b>📝 Content Analysis:</b>
• Has Text: <code>${info.hasText ? "Yes" : "No"}</code>
• Has Media: <code>${info.hasMedia ? "Yes" : "No"}</code>
• Entity Types: <code>${info.entities.length > 0 ? info.entities.join(", ") : "None"}</code>`;

    // Add text preview
    if (msg.text || msg.caption) {
        const text = msg.text || msg.caption || "";
        const preview = text.length > 100 ? `${text.substring(0, 100)}...` : text;
        analysis += `

<b>📄 Text Preview:</b>
<code>${escapeHtml(preview)}</code>`;
    }

    // Add media info
    if (msg.photo) {
        analysis += `

<b>🖼️ Photo Information:</b>
• Photo Sizes: <code>${msg.photo.length} available</code>
• Largest File ID: <code>${msg.photo[msg.photo.length - 1]?.file_id || "Unknown"}</code>`;
    }

    if (msg.video) {
        analysis += `

<b>🎬 Video Information:</b>
• Duration: <code>${msg.video.duration}s</code>
• Width x Height: <code>${msg.video.width}x${msg.video.height}</code>
• File Name: <code>${msg.video.file_name || "Unknown"}</code>`;
    }

    if (msg.document) {
        analysis += `

<b>📋 Document Information:</b>
• File Name: <code>${msg.document.file_name || "Unknown"}</code>
• MIME Type: <code>${msg.document.mime_type || "Unknown"}</code>
• File Size: <code>${msg.document.file_size ? `${(msg.document.file_size / 1024 / 1024).toFixed(2)} MB` : "Unknown"}</code>`;
    }

    await ctx.reply(analysis, { parse_mode: "HTML" });
}

async function handleMediaDownload(ctx: MyContext) {
    await ctx.answerCallbackQuery("loading");

    const msg = ctx.msg?.reply_to_message;
    if (!msg) {
        await ctx.reply("❌ Message not found.");
        return;
    }

    let fileId = "";
    let fileName = "file";

    if (msg.photo) {
        // Get the largest photo
        fileId = msg.photo[msg.photo.length - 1]?.file_id || "";
        fileName = `photo_${msg.message_id}.jpg`;
    } else if (msg.video) {
        fileId = msg.video.file_id;
        fileName = msg.video.file_name || `video_${msg.message_id}.mp4`;
    } else if (msg.document) {
        fileId = msg.document.file_id;
        fileName = msg.document.file_name || `document_${msg.message_id}`;
    } else if (msg.audio) {
        fileId = msg.audio.file_id;
        fileName = msg.audio.file_name || `audio_${msg.message_id}.mp3`;
    } else if (msg.voice) {
        fileId = msg.voice.file_id;
        fileName = `voice_${msg.message_id}.ogg`;
    } else if (msg.video_note) {
        fileId = msg.video_note.file_id;
        fileName = `video_note_${msg.message_id}.mp4`;
    } else if (msg.sticker) {
        fileId = msg.sticker.file_id;
        fileName = `sticker_${msg.message_id}.webp`;
    } else if (msg.animation) {
        fileId = msg.animation.file_id;
        fileName = msg.animation.file_name || `animation_${msg.message_id}.gif`;
    }

    if (!fileId) {
        await ctx.reply("❌ No downloadable media found in this message.");
        return;
    }

    try {
        // Get file info
        const file = await ctx.api.getFile(fileId);

        await ctx.reply(`<b>💾 Media Download Information:</b>

<b>📁 File Name:</b> <code>${escapeHtml(fileName)}</code>
<b>📄 File ID:</b> <code>${escapeHtml(fileId)}</code>
<b>📊 File Size:</b> <code>${file.file_size ? `${(file.file_size / 1024 / 1024).toFixed(2)} MB` : "Unknown"}</code>
<b>📁 File Path:</b> <code>${escapeHtml(file.file_path || "Unknown")}</code>

<i>Note: Use the File ID with your bot's token to construct download URLs if needed.</i>`, {
            parse_mode: "HTML"
        });

    } catch (_error) {
        await ctx.reply("❌ Failed to retrieve file information. The file might be too old or no longer available.");
    }
}

async function handleEmojify(ctx: MyContext) {
    await ctx.answerCallbackQuery("Emojifying...");

    const msg = ctx.msg?.reply_to_message;
    if (!msg || !msg.photo) {
        await ctx.reply("❌ Original message or photo not found.");
        return;
    }

    await ctx.replyWithChatAction("upload_photo");

    try {
        const photos = msg.photo;
        const photo = photos[photos.length - 1];
        if (!photo) throw new Error("No photo found");

        const file = await ctx.api.getFile(photo.file_id);
        if (!file.file_path) {
            throw new Error("File path not found");
        }

        const url = `https://api.telegram.org/file/bot${config.botToken}/${file.file_path}`;
        const imageBuffer = await downloadImage(url);
        const emojifiedBuffer = await emojifyImage(imageBuffer);

        await ctx.replyWithDocument(new InputFile(emojifiedBuffer, "emoji.webp"), {
            reply_to_message_id: msg.message_id
        });
    } catch (error) {
        console.error("Error emojifying image:", error);
        await ctx.reply("❌ Failed to emojify image.");
    }
}

export function forwardedMessageHandler(ctx: MyContext) {
    const info = analyzeForwardedMessage(ctx);

    if (!info) {
        return; // Not a forwarded message, let other handlers deal with it
    }

    const message = createMessageInfo(info);
    const buttons = createInlineButtons(info);

    if (ctx.msg) {
        ctx.reply(message, {
            parse_mode: "HTML",
            reply_to_message_id: ctx.msg.message_id,
            ...buttons
        });
    }
}

export function registerForwardedHandlers(bot: Bot<MyContext>) {
    // Register the main forwarded message handler
    bot.on(":forward_origin", forwardedMessageHandler);

    // Register callback handlers
    bot.callbackQuery("forwarded_get_json", handleGetJSON);
    bot.callbackQuery("forwarded_extract_urls", handleExtractURLs);
    bot.callbackQuery("forwarded_extract_hashtags", handleExtractHashtags);
    bot.callbackQuery("forwarded_extract_mentions", handleExtractMentions);
    bot.callbackQuery("forwarded_full_analysis", handleFullAnalysis);
    bot.callbackQuery("forwarded_download_media", handleMediaDownload);
    bot.callbackQuery("forwarded_emojify", handleEmojify);

    // Media-specific info handlers
    bot.callbackQuery("forwarded_photo_info", async (ctx) => {
        await ctx.answerCallbackQuery("loading");
        const msg = ctx.msg?.reply_to_message;
        if (!msg || !msg.photo) {
            await ctx.reply("❌ No photo found in this message.");
            return;
        }

        let photoInfo = `<b>🖼️ Photo Information:</b>

<b>📊 Available Sizes:</b> <code>${msg.photo.length}</code>`;

        msg.photo.forEach((photo, index) => {
            photoInfo += `\n\n• Size ${index + 1}: <code>${photo.width}x${photo.height}</code>
  • File ID: <code>${photo.file_id}</code>
  • File Size: <code>${photo.file_size ? `${(photo.file_size / 1024).toFixed(1)} KB` : "Unknown"}</code>`;
        });

        await ctx.reply(photoInfo, { parse_mode: "HTML" });
    });

    bot.callbackQuery("forwarded_video_info", async (ctx) => {
        await ctx.answerCallbackQuery("loading");
        const msg = ctx.msg?.reply_to_message;
        if (!msg || !msg.video) {
            await ctx.reply("❌ No video found in this message.");
            return;
        }

        let videoInfo = `<b>🎬 Video Information:</b>

<b>📏 Dimensions:</b> <code>${msg.video.width}x${msg.video.height}</code>
<b>⏱️ Duration:</b> <code>${msg.video.duration}s</code>
<b>📁 File Name:</b> <code>${escapeHtml(msg.video.file_name || "Unknown")}</code>
<b>📊 File Size:</b> <code>${msg.video.file_size ? `${(msg.video.file_size / 1024 / 1024).toFixed(2)} MB` : "Unknown"}</code>
<b>🎭 MIME Type:</b> <code>${msg.video.mime_type || "Unknown"}</code>
<b>📄 File ID:</b> <code>${msg.video.file_id}</code>`;

        if (msg.video.thumbnail) {
            videoInfo += "\n\n<b>🖼️ Has Thumbnail:</b> Yes";
        } else {
            videoInfo += "\n\n<b>🖼️ Has Thumbnail:</b> No";
        }

        await ctx.reply(videoInfo, { parse_mode: "HTML" });
    });

    bot.callbackQuery("forwarded_document_info", async (ctx) => {
        await ctx.answerCallbackQuery("loading");
        const msg = ctx.msg?.reply_to_message;
        if (!msg || !msg.document) {
            await ctx.reply("❌ No document found in this message.");
            return;
        }

        let docInfo = `<b>📋 Document Information:</b>

<b>📁 File Name:</b> <code>${escapeHtml(msg.document.file_name || "Unknown")}</code>
<b>🎭 MIME Type:</b> <code>${msg.document.mime_type || "Unknown"}</code>
<b>📊 File Size:</b> <code>${msg.document.file_size ? `${(msg.document.file_size / 1024 / 1024).toFixed(2)} MB` : "Unknown"}</code>
<b>📄 File ID:</b> <code>${msg.document.file_id}</code>
<b>🔗 Unique ID:</b> <code>${msg.document.file_unique_id}</code>`;

        if (msg.document.thumbnail) {
            docInfo += "\n\n<b>🖼️ Has Thumbnail:</b> Yes";
        } else {
            docInfo += "\n\n<b>🖼️ Has Thumbnail:</b> No";
        }

        await ctx.reply(docInfo, { parse_mode: "HTML" });
    });
}