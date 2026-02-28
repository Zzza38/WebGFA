# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WebGFA is a game hosting website built with Fastify (TypeScript) that serves static HTML games and provides user management features. The project is being migrated from JavaScript to TypeScript.

## Development Commands

### Installation & Configuration
```bash
pnpm install                   # Install dependencies and run postinstall build script
pnpm run config                # Interactive configuration wizard for ports, features, and client settings
pnpm run migrate               # Migrate existing JSON database to SQLite (run once after upgrading)
```

### Building & Running
```bash
pnpm run build                 # Compile TypeScript to dist/ directory
pnpm start                     # Run production server from dist/server.js (runs prestart build hook)
pnpm run dev                   # Run development server with tsx watch mode
```

### PM2 Deployment (Recommended for Production)
```bash
pnpm add -g pm2
pm2 start ecosystem.config.cjs  # Start WebGFA and optional services (Interstellar, WebSSH)
pm2 startup systemd            # Replace systemd with your init system
pm2 save
```

## Architecture

### TypeScript Migration Status
The codebase is **fully TypeScript**:
- **Core**: `src/server.ts`, `src/config.ts`, `src/database.ts`, `src/functions/classes.ts`
- **Build output**: TypeScript compiles from `src/` to `dist/` (ES2022 + ESNext modules)
- **Legacy**: `packages/build.js` remains CommonJS for npm lifecycle hooks
- The server runs from `dist/server.js` after build, PM2 configuration points to compiled output

### Server Architecture (src/server.ts)
Fastify-based server with several key systems:

**Request Flow**:
1. `handleGuestSession` hook - Creates guest session if no valid user session exists
2. API routes (`/api/*`) - Handled by `handleApiRequest`
3. `handleMainRequest` hook - Serves HTML files and tracks statistics for all other requests

**Path Normalization**: All paths are normalized to explicit `.html` files via `normalizePath()`:
- `/` → `/index.html`
- `/games/slope` → `/games/slope/index.html`
- `/about.html` → `/about.html` (unchanged)

**HTML Injection**: The server automatically injects extra tags (particles, client config, cloaking scripts) into the `<body>` tag when serving HTML files.

### Database System (data/webgfa.db)
SQLite database using `better-sqlite3`. Schema defined in `src/database.ts`:
- **users**: User accounts with permissions, passwords, session_id, save_data, coins
- **coin_history**: Transaction history for the coins system (normalized from users)
- **messages**: Real-time messaging system with SSE updates via EventEmitter
- **game_popularity**: Tracks all-time, monthly, and weekly game plays
- **metadata**: Key-value store for system state (e.g., popularity reset timestamps)

Database access is through helper functions exported from `src/database.ts`:
- `users.get()`, `users.create()`, `users.setSessionId()`, etc.
- `messages.get()`, `messages.create()`, `messages.update()`, `messages.delete()`
- `gamePopularity.get()`, `gamePopularity.upsert()`, `gamePopularity.increment()`
- `coinHistory.get()`, `coinHistory.add()`
- `metadata.get()`, `metadata.set()`

WAL mode is enabled for better concurrent access from PM2 cluster instances.

### Configuration System
Two-tier configuration with auto-generation:
- **default-config.json**: Template with all available options
- **config.json**: User configuration (auto-created from default on first run)
- **Split usage**:
  - Server features: `webgfaConfig.features.*` (ports, login, webhooks, optional services)
  - Client injection: `webgfaConfig['client-config']` (colors, site name, URLs) - serialized into HTML

### Session & Authentication
- Guest sessions: `GUEST-ACCOUNT-{UUID}` cookies for anonymous users
- User sessions: UUID cookies set on login, stored in `db.users[username].sessionID`
- Premium games: Restricted to users with `'prem'` in permissions string (403 HTML served otherwise)

### AI Homework Helper (OpenAI Integration)
When `config.features.openai.enabled` is true, the server provides an AI-powered homework assistant:
- **Coins System**: Users have a `coins` balance and `coinHistory` array tracking transactions
- **Usage Modes**: `answer` (direct answers), `explain` (step-by-step), `study` (interactive learning), `chat` (casual texting style)
- **Personalities**: Configurable AI personalities (sarcastic, caring, nonchalant, etc.) with a Gen-Z slang dictionary
- **File Uploads**: Supports image and PDF uploads for homework questions (via `@fastify/multipart` and `pdf-parse`)
- **Token Pricing**: Coins are deducted based on input/output tokens with configurable rates and profit margin

### Environment Variables
- `PORT`: Overrides the configured port (takes precedence over config.json)
- `.env` file: Loaded via `dotenv` at server startup
- `--dev` flag: When running with `npm run dev`, uses `config.ports.development` instead of `config.ports.main`

### Statistics & Logging
- CSV logging: All HTML requests logged to `logs/webgfa.csv` with path, username, UID, date
- Game popularity: Auto-resets weekly (Sunday 12am) and monthly (1st of month)
- In-memory table caching (`oldTable`) to avoid re-reading CSV on every request

### API Endpoints (/api/*)
RESTful-style routing with POST/GET handlers in `handleApiRequest()`:
- **Auth**: `/api/logout`, `/api/login` (POST)
- **Accounts**: `/api/create-account`, `/api/request-account-creation` (currently disabled)
- **Messaging**: `/api/send-message`, `/api/edit-message`, `/api/delete-message`, `/api/get-messages`, `/api/updates` (SSE)
- **Games**: `/api/getGames`, `/api/getTools`, `/api/getPopGames`, `/api/premium-game-count`
- **User Data**: `/api/get-user`, `/api/get-save`, `/api/save-data`, `/api/is-premium`

### Optional Services (packages/)
The build system (`packages/build.js`) conditionally clones and manages:
- **Interstellar** (proxy): Port configured via `config.ports.interstellar`, managed by PM2 if `config.installed.interstellar` is true
- **WebSSH2** (SSH terminal): Port configured via `config.ports.webssh`, managed by PM2 if `config.installed.webssh` is true

These are git submodules cloned during `pnpm install` postinstall hook. The build script auto-inserts `process.chdir(__dirname)` into their entry files to ensure correct working directory.

### Games Catalog (games.json)
Flat key-value maps:
- `games.games`: Free games available to all users
- `games.premiumGames`: Restricted to users with `'prem'` permission
- `games.tools`/`games.premiumTools`: Similar structure for tools
- Values are URL paths (e.g., `"/games/slope/"`)

### GitHub Auto-Pull Webhook
If enabled, listens on `/webhook/github` for push events:
- Executes `git pull` in repository root
- Optionally runs `config.features.githubAutoPull.restartCommand` (e.g., `pm2 restart all`)

## File Structure Notes

- **Static files**: All served from `static/` directory (games, assets, HTML pages)
- **TypeScript config**: Strict mode enabled, targets ES2022 with NodeNext resolution
- **Logs**: Output to `logs/` directory (created automatically)
- **Data persistence**: `data/webgfa.db` (SQLite, auto-created on first run)
- **Migration**: Run `pnpm run migrate` to import existing `data/database.json` into SQLite

## TypeScript Considerations

When modifying code:
- Replace `any` types with proper interfaces (many TODOs exist for this)
- Use type guards instead of `as any` casts
- Add interfaces for request body types (currently using `request.body as any`)
- Run `pnpm run build` to verify TypeScript compilation before committing
