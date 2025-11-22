import type { MyContext } from "../types";


export async function startCommand(ctx: MyContext) {
    if (!ctx.from) return;
    if (!ctx.msg) return;

    const { first_name } = ctx.from;
    await ctx.reply(
        `Welcome, ${first_name}! I am Just Tools Bot, here to help you with various tasks.\n\nUse /help to see what I can do.`,
        { reply_parameters: { message_id: ctx.msg.message_id } }
    );
}
