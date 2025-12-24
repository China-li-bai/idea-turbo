# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Primary Commands
- `pnpm dev` - Start development server (Vite + Tauri)
- `pnpm build` - Build TypeScript and create production bundle
- `pnpm preview` - Preview production build locally
- `pnpm test` - Run tests with Vitest
- `pnpm test:ui` - Run tests with Vitest UI
- `pnpm tauri` - Access Tauri CLI commands

### Tauri-Specific Commands
- `pnpm tauri dev` - Start Tauri desktop app in development mode
- `pnpm tauri build` - Build desktop application
- `pnpm tauri info` - Show Tauri environment info

### Testing & Debugging
- `pnpm test fsrs` - Run FSRS algorithm tests specifically
- `pnpm test -- packages/lib` - Test workspace packages individually
- `pnpm test -- --coverage` - Run tests with coverage report
- `pnpm tauri dev --verbose` - Enable verbose logging for debugging

### Subscription System Testing
- `pnpm test -- tests/subscription-flow.test.ts` - Test complete subscription flow
- Access `/subscription` route to test subscription onboarding

## Architecture Overview

### Design Philosophy
This project follows "Linus × Jobs" principles:
- **Linus Torvalds**: Technical correctness, simplicity, no special cases
- **Steve Jobs**: Intuitive design, mobile-first, minimal cognitive load
- Evidence: App.tsx reduced from 400+ to 28 lines through Linus-style refactoring

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **Desktop**: Tauri 2.0 (Rust backend)
- **Database**: PGlite (local SQLite with Postgres compatibility)
- **Data Sync**: Electric SQL (planned for future iterations)
- **Algorithms**: FSRS (spaced repetition)
- **Workspace**: pnpm monorepo with packages

### Project Structure
```
src/                    # Main React application
├── pages/             # Route components (DeckList, DeckDetail, FlashcardReview)
├── components/ui/     # Reusable UI components (shadcn/ui pattern)
├── contexts/          # React contexts (ThemeContext)
└── types/             # TypeScript definitions

packages/              # Workspace packages
├── lib/               # Core business logic and data access
│   ├── fsrs.ts        # FSRS algorithm implementation
│   ├── schema.sql     # Database schema
│   ├── data-access.ts # Database operations
│   └── electric.tsx   # Electric SQL setup (future)
└── locales/           # i18n translations (en.json, zh.json)

src-tauri/             # Rust desktop backend
prompts/               # AI prompt templates
```

### Key Dependencies
- `@electric-sql/pglite` - Local database (excluded from Vite optimizeDeps)
- `ts-fsrs` - Spaced repetition algorithm
- `react-router-dom` - Client-side routing
- `react-i18next` - Internationalization
- `@radix-ui/*` - Headless UI components (shadcn/ui pattern)

## Critical Configuration

### PGlite Setup
PGlite requires special Vite configuration to avoid bundling issues:
```js
optimizeDeps: {
  exclude: ["@electric-sql/pglite", "@electric-sql/pglite-sync"]
}
```

**CRITICAL**: Never upgrade PGlite versions without testing. Version mismatches cause "Invalid FS bundle size" errors. Current working versions:
- `@electric-sql/pglite: 0.3.14`
- `@electric-sql/pglite-sync: 0.4.0`

### Development Port
- Vite dev server: `localhost:1024` (strictPort: false allows fallback)
- Tauri expects this specific port for hot reload

## Development Principles
- **最小可执行**: 优先端到端流程，变更只触及必要范围
- **数据库与 Electric 解耦**: 同构一致性优先，同步作为后续迭代项
- **一处事实源**: 以 Schema 为真，文档为其投影
- **UI 变更必须预览**: 运行 `pnpm preview` 并在浏览器中验证

## Key Files
- `packages/lib/schema.sql` - Database schema (single source of truth)
- `packages/lib/fsrs.ts` - Spaced repetition algorithm
- `packages/lib/data-access.ts` - Database operations layer
- `src/store/hooks/` - Data fetching hooks (useDeck, useCards, etc.)
- `src/store/mutations/` - Data mutation operations
- `src/pages/` - Main application routes
- `vite.config.ts` - Critical PGlite configuration

### Subscription System Files
- `src/services/SubscriptionBackendService.ts` - Core subscription backend logic
- `src/services/StripeService.ts` - Stripe payment integration
- `src/components/subscription/SubscriptionOnboarding.tsx` - Subscription UI
- `migrations/001_subscription_system.sql` - Database schema for payments
- `tests/subscription-flow.test.ts` - End-to-end subscription testing

## Common Development Workflows

### Adding New Card Fields
1. Update `packages/lib/schema.sql` first (single source of truth)
2. Regenerate types: modify `packages/lib/schema.ts`
3. Update FSRS integration in `packages/lib/fsrs.ts`
4. Test with `pnpm test fsrs`

### UI Changes Verification Process
Always run `pnpm preview` and verify in browser before committing UI changes. Development server may not catch all bundling issues.

### Debugging PGlite Issues
1. Check console for "Invalid FS bundle size" errors
2. Verify exclude configuration in `vite.config.ts`
3. Test with clean install: `rm -rf node_modules && pnpm install`
4. If WASM loading fails, check `assetsInclude` in vite.config.ts includes `**/*.wasm`

## Data Layer Architecture

### Store Pattern
The codebase uses a custom store pattern with hooks and mutations:
- **Hooks** (`src/store/hooks/`): Read operations using PGlite queries
- **Mutations** (`src/store/mutations/`): Write operations with automatic cache invalidation
- **Example**: `useDeck()` for reading, `createDeck()` for writing

### Database Schema Management
- Schema lives in `packages/lib/schema.sql` (source of truth)
- TypeScript types in `packages/lib/schema.ts` must match SQL schema
- Use transactions for complex operations to maintain consistency

## Common Pitfalls

1. **PGlite Version Lock**: NEVER upgrade PGlite without extensive testing
2. **Route Navigation**: Use `react-router-dom` hooks, not window.location
3. **Mobile Touch Targets**: Minimum 44px for all interactive elements
4. **Type Safety**: Always update schema.ts when modifying schema.sql