import { Bot } from "grammy";
import { config } from "./config";
import type { MyContext } from "./types";
import { logger } from "./middleware/logger";
import { registerCommands } from "./commands";
import { registerHandlers } from "./handlers";


export function createBot() {
    if (!config.botToken) {
        throw new Error("Bot token not found");
    }

    const bot = new Bot<MyContext>(config.botToken);

    // Middleware
    bot.use(logger);

    // Commands
    registerCommands(bot);

    // Handlers
    registerHandlers(bot);

    return bot;
}
