import type { Bot } from "grammy";
import type { MyContext } from "../types";
import { registerForwardedHandlers } from "./forwarded";

export function registerHandlers(bot: Bot<MyContext>) {
    // Register all handlers
    registerForwardedHandlers(bot);
}