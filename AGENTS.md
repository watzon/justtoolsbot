# AGENTS.md

This file provides guidance to OpenCode agents when working with code in this repository.

## Project Overview

Just Tools Bot: Telegram bot with Grammy, Drizzle ORM (PostgreSQL), Bun runtime. Features Instagram/TikTok downloads, dice rolls.

## Key Technologies
- Runtime: Bun
- Framework: Grammy (TypeScript)
- DB: Drizzle ORM + PostgreSQL
- Linter/Formatter: Biome
- Language: TypeScript (strict)

## Build/Lint/Test Commands
- `bun dev`: Dev server w/ hot reload
- `bun start`: Production
- `bun lint`: Biome lint
- `bun fmt`: Biome format
- `bun typecheck`: TS check
- `bun test`: All tests; single: `bun test src/path/to/test.ts`
- `bun check`: Lint + typecheck + test
- DB: `bun db:generate| migrate| studio`

## Code Style Guidelines
- **Biome**: 2-space indent, lineWidth 100, useConst/noVar/noUnusedVariables=error
- **TS**: Strict (noImplicitAny/This/Unused*, exactOptionalProps), ES2022/ESNext, paths `@/*`→`./*`
- **Imports**: Biome sorts; prefer `@/src/...`
- **Naming**: camelCase vars/fns, PascalCase types
- **Telegram msgs**: `import {code,fmt} from '@grammyjs/parse-mode'`; `ctx.reply(fmt\`...\`, {entities})`; NO manual parse_mode
- **Commands**: `async fn(ctx: MyContext)` in src/commands/, register in index.ts
- **Error handling**: Env validation in config.ts, log + user feedback
- **Commits**: `bun check` first; concise msgs re: why/what
- No unused code/imports; TS types everywhere