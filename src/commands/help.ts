import type { MyContext } from "../types";
import { code, fmt } from "@grammyjs/parse-mode";

export async function helpCommand(ctx: MyContext) {
  if (!ctx.msg) return;
  const message = fmt`Here are the available commands:

${code}/start${code} - Welcome message
${code}/help${code} - Show this help message
${code}/roll <sides>${code} - Roll a die with specified number of sides
${code}/ig <url>${code} - Download Instagram media (photos/videos)
${code}/tiktok <url>${code} - Download TikTok videos and photo sets

Example usage:
${code}/roll 20${code} - Roll a 20-sided die
${code}/ig https://www.instagram.com/p/C-xyz123/${code}
${code}/tt https://www.tiktok.com/@username/video/1234567890${code}

Commands also work with aliases:
${code}/instagram${code} and ${code}/tt${code}`;

  await ctx.reply(message.text, {
    reply_parameters: { message_id: ctx.msg.message_id },
    entities: message.entities
  });
}
