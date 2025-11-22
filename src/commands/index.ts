import type { Bot } from "grammy";
import type { MyContext } from "../types";
import { startCommand } from "./start";
import { instagramCommand, handleInstagramDownload } from "./instagram";
import { tiktokCommand, handleTiktokDownload } from "./tiktok";
import { helpCommand } from "./help";
import { rollCommand } from "./roll";

export function registerCommands(bot: Bot<MyContext>) {
  // Commands
  bot.command("start", startCommand);
  bot.command("help", helpCommand);
  bot.command("roll", rollCommand);
  bot.command(["ig", "instagram"], instagramCommand);
  bot.command(["tt", "tiktok"], tiktokCommand);

  // Callbacks
  bot.callbackQuery("ig_download", handleInstagramDownload);
  bot.callbackQuery("tt_download", handleTiktokDownload);
}
