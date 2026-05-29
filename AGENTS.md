# Repository Guidelines

## Project Structure & Module Organization

This is a mixed monorepo. TypeScript packages live in `packages/*` with shared
workspace config in `package.json`, `pnpm-workspace.yaml`, and `turbo.json`.
The current product app lives in `flutter_demo/`; source is in
`flutter_demo/lib/`, tests in `flutter_demo/test/`, and platform runners in
`android/`, `macos/`, `linux/`, and `web/`. The emotional memory package is
`packages/mnemosyne/`, with reusable memory, Xiang recall, and pet
orchestration logic under `packages/mnemosyne/lib/`.

## Build, Test, and Development Commands

Run JavaScript workspace tasks from the repository root:

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm check-types
```

Run Flutter commands from `flutter_demo/`:

```bash
/Users/mac/flutter/bin/flutter pub get
/Users/mac/flutter/bin/flutter run
/Users/mac/flutter/bin/flutter analyze --no-pub
/Users/mac/flutter/bin/flutter test --no-pub
/Users/mac/flutter/bin/dart format lib test ../packages/mnemosyne/lib ../packages/mnemosyne/test
```

Use `--no-pub` when dependencies are already resolved. For focused work, pass
specific files to `flutter analyze` or `flutter test`.

## Coding Style & Naming Conventions

Use TypeScript for workspace packages and Dart for Flutter code. Flutter uses
`package:flutter_lints/flutter.yaml`: two-space indentation, trailing commas for
multiline widget trees, `lowerCamelCase` members, `UpperCamelCase` types, and
`snake_case.dart` filenames. Product wiring belongs in `flutter_demo`;
reusable memory logic belongs in `packages/mnemosyne`.

## Testing Guidelines

Use `flutter_test` for Dart. Name tests after behavior, such as
`extracts emotional confession with recall cues`. Cover memory extraction,
Xiang recall, prompt injection, empty input, low-value chat, conflict, and
missing embeddings. Use package-local Vitest configs where TypeScript packages
already define them.

## Commit & Pull Request Guidelines

Recent history uses concise Conventional Commit-style messages, for example
`feat(pet): add first-time onboarding narrative flow`. Prefer
`type(scope): summary`. Pull requests should include intent, changed areas,
test commands run, linked issues, and screenshots or recordings for UI changes.

## Product Principle

Do not describe the product as only an AI pet. The product expression is:
`创造属于你的AI人格，它记得你、理解你、陪你长大`. Mnemosyne is the emotional memory
infrastructure that makes this credible.
