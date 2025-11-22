import type { MyContext } from "../types";
import { FormattedString, code, fmt } from "@grammyjs/parse-mode";

export async function rollCommand(ctx: MyContext) {
  if (!ctx.msg) return;

  const sides = ctx.match;

  if (!sides || Number.isNaN(Number(sides)) || Number(sides) < 1) {
    const errorMessage = fmt`Please provide a valid number of sides. Example: ${code}/roll 20${code}`;
    await ctx.reply(errorMessage.text, {
      reply_parameters: {
        message_id: ctx.msg.message_id,
      },
      entities: errorMessage.entities
    });
    return;
  }

  const numSides = Number(sides);

  // Send initial "Rolling..." message as a reply
  const rollingMessage = await ctx.reply("Rolling...", {
    reply_parameters: {
      message_id: ctx.msg.message_id,
    },
  });

  // Wait 1 second
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Generate random number between 1 and numSides
  const roll = Math.floor(Math.random() * numSides) + 1;

  // Update the message with the result using proper formatting
  const resultMessage = fmt`You rolled a ${FormattedString.b(roll.toString())}`;
  await ctx.api.editMessageText(
    rollingMessage.chat.id,
    rollingMessage.message_id,
    resultMessage.text,
    { entities: resultMessage.entities },
  );
}
