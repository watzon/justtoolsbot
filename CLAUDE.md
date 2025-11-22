# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Just Tools Bot is a Telegram bot built with Grammy, Drizzle ORM, and Bun runtime. It provides various utility tools including Instagram media downloads. The bot uses TypeScript for type safety and PostgreSQL for data persistence.

## Key Technologies

- **Runtime**: Bun (JavaScript runtime with built-in bundler and package manager)
- **Framework**: Grammy (Telegram Bot framework for TypeScript)
- **Database**: PostgreSQL with Drizzle ORM
- **Language**: TypeScript
- **Linting/Formatting**: Biome
- **Package Manager**: Bun

## Development Commands

### Essential Commands
- `bun dev` - Start development server with hot reload (most commonly used)
- `bun start` - Start bot in production mode
- `bun check` - Run complete code quality pipeline (lint + typecheck + tests)

### Database Commands
- `bun db:generate` - Generate database migrations from schema changes
- `bun db:migrate` - Apply pending migrations to database
- `bun db:studio` - Open Drizzle Studio for database management

### Code Quality Commands
- `bun lint` - Lint code with Biome
- `bun fmt` - Format code with Biome
- `bun typecheck` - Run TypeScript type checking
- `bun test` - Run test suite

## Architecture

### Core Structure
```
src/
├── index.ts          # Application entry point with graceful startup/shutdown
├── bot.ts           # Bot creation and configuration
├── config.ts        # Environment variable management and validation
├── types.ts         # TypeScript type definitions (MyContext)
├── commands/        # Bot command handlers
│   ├── index.ts     # Command registration and routing
│   ├── start.ts     # /start command implementation
│   ├── help.ts      # /help command implementation
│   └── instagram.ts # Instagram download functionality
├── middleware/      # Bot middleware
│   └── logger.ts    # Request timing middleware
└── db/             # Database layer
    ├── index.ts    # Database connection setup
    └── schema.ts   # Database table definitions
```

### Command System
Commands are modular and registered in `src/commands/index.ts`. Each command:
- Exports an async function that takes `MyContext`
- Handles user input validation
- Returns appropriate responses
- Follows pattern: `commandName(ctx: MyContext)`

### Database Integration
- Uses Drizzle ORM with PostgreSQL
- Bun's native SQL client for connections
- Schema defined in `src/db/schema.ts`
- Environment-based configuration via `src/config.ts`

## Environment Setup

Required environment variables (copy from `.env.example`):
```env
BOT_TOKEN=your_telegram_bot_token_here
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

### Getting Bot Token
1. Contact @BotFather on Telegram
2. Send `/newbot` command
3. Follow instructions to create bot
4. Copy provided token

## Development Workflow

### Adding New Commands
1. Create new file in `src/commands/`
2. Export async function with `MyContext` parameter
3. Import and register in `src/commands/index.ts`
4. Update help command if needed

### Message Formatting with `@grammyjs/parse-mode`
**Always use `@grammyjs/parse-mode` for formatting messages** - do not use manual HTML/markdown formatting.

Import the utilities:
```typescript
import { code, fmt } from "@grammyjs/parse-mode";
```

Use `fmt` for template literals with formatting and `code` for inline code formatting:

```typescript
// ✅ Correct - use parse-mode utilities
const message = fmt`${code}/start${code} - Welcome message
${code}/help${code} - Show this help message`;

await ctx.reply(message.text, { entities: message.entities });

// ❌ Incorrect - manual formatting
await ctx.reply("*Start* - Welcome message", { parse_mode: "Markdown" });
```

This approach:
- Provides type-safe formatting
- Automatically handles entity generation
- Ensures consistent message formatting across the bot
- Prevents markdown parsing errors

### Database Schema Changes
1. Modify `src/db/schema.ts`
2. Run `bun db:generate` to create migration
3. Run `bun db:migrate` to apply changes
4. Update database interactions accordingly

### Code Quality Standards
- All code must pass `bun check` before commits
- Use Biome for formatting (configured in `biome.json`)
- TypeScript strict mode enabled
- No unused variables or imports

## Key Dependencies

### Core Libraries
- `grammy`: Telegram bot framework
- `drizzle-orm`: Database ORM
- `@grammyjs/parse-mode`: Message formatting utilities

## Testing

Tests should be run with `bun test`. The project uses Bun's built-in test runner. All tests must pass before merging changes.

## Deployment Considerations

- Bot includes graceful shutdown handling (SIGINT/SIGTERM)
- Database connections are properly managed
- Environment variables are validated on startup
- Error handling includes logging and user feedback
