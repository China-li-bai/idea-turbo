# Repository Guidelines

## Project Structure & Module Organization

This is a mixed monorepo. TypeScript packages live in `packages/*`, with shared package configuration in `package.json`, `pnpm-workspace.yaml`, and `turbo.json`. Flutter/Dart code is organized through Melos using `melos.yaml`; the main app currently lives in `flutter_demo/`. Within `flutter_demo`, source code is in `lib/`, tests are in `test/`, and platform runners are in `android/`, `ios/`, `macos/`, `linux/`, and `web/`. Cloudflare worker code is under `workers/`, Go backend code is under `makergtm/backend/`, and utility scripts are in `scripts/`.

## Build, Test, and Development Commands

Run JavaScript workspace tasks from the repository root:

- `pnpm install` installs Node workspace dependencies.
- `pnpm dev` runs Turbo development tasks.
- `pnpm build` runs package builds through Turbo.
- `pnpm lint` runs package lint tasks.
- `pnpm check-types` runs TypeScript checks.
- `pnpm format` formats `ts`, `tsx`, and Markdown files with Prettier.

For Flutter work:

- `cd flutter_demo && flutter pub get` resolves app dependencies.
- `cd flutter_demo && flutter analyze` runs Dart static analysis.
- `cd flutter_demo && flutter test` runs Flutter tests.
- `cd flutter_demo && flutter run` starts the app on an available device.

## Coding Style & Naming Conventions

Use TypeScript for workspace packages and Dart for Flutter code. Keep TypeScript modules under `src/`, prefer named exports for reusable APIs, and use package-local `tsconfig.json` settings. Format TypeScript and Markdown with Prettier. Flutter code follows `package:flutter_lints/flutter.yaml`; use two-space indentation, `lower_snake_case.dart` filenames, `UpperCamelCase` classes/widgets, and `lowerCamelCase` members.

## Testing Guidelines

Use Vitest where package configs exist, such as `packages/*/vitest.config.ts`. Co-locate tests near package source when the package already follows that pattern. Flutter tests belong in `flutter_demo/test/` and should use `_test.dart` filenames. Before opening a PR that touches Flutter code, run `flutter analyze` and `flutter test` from `flutter_demo/`.

## Commit & Pull Request Guidelines

Recent history uses concise Conventional Commit-style messages, for example `feat(pet): add first-time onboarding narrative flow`, `refactor: ...`, and `docs(flutter): ...`. Prefer `type(scope): summary` when a scope is clear. Pull requests should include a short purpose statement, changed areas, test commands run, linked issues when applicable, and screenshots or screen recordings for UI changes.

## Agent-Specific Instructions

Keep changes scoped to the affected package or app. Do not commit generated build outputs such as `flutter_demo/build/`, `.dart_tool/`, `.turbo/`, or platform cache files. Preserve existing architecture boundaries between `flutter_demo/lib/core`, `data`, `pet`, and `ui`.
