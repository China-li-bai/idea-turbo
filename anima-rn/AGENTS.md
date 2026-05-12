# Repository Guidelines

## Project Structure & Module Organization

This is an Expo React Native app with TypeScript entry points in `index.ts` and `App.tsx`. Most application code lives in `src/`: UI in `src/components`, screens in `src/screens`, navigation in `src/navigation`, state in `src/store`, domain logic in `src/lib`, shared types in `src/types`, and theme exports in `src/theme`. Jest tests are in `src/__tests__`, with native and heavy dependency mocks in `src/__mocks__`. Static assets belong in `assets`, local model files in `models`, and generated coverage output in `coverage`. Native files live under `android` and `ios`; edit them only when native configuration requires it.

## Build, Test, and Development Commands

- `npm start`: starts the Expo development server.
- `npm run android`: builds and runs the app on Android through Expo.
- `npm run ios`: builds and runs the app on iOS through Expo.
- `npm run web`: starts the Expo web target.
- `npm test`: runs Jest in verbose mode.
- `npm run test:coverage`: runs Jest with coverage thresholds.

Use `npm install` to sync dependencies from `package-lock.json`.

## Coding Style & Naming Conventions

Use TypeScript and keep `tsconfig.json` strictness in mind for production code. Follow the existing style: two-space indentation, single quotes, no semicolons, and named exports for utilities. React components use PascalCase file and component names, for example `ChatScreen.tsx` or `PetAvatar.tsx`. Utility modules in `src/lib` use PascalCase when they model a system, such as `MemorySystem.ts`, and lower camelCase for functions and variables.

## Testing Guidelines

Jest uses `ts-jest` with `testEnvironment: node`. Place tests in `src/__tests__` and name them `*.test.ts`; current matching is `**/__tests__/**/*.test.ts`. Add or update mocks in `src/__mocks__` when tests touch Expo, React Native, ONNX, or llama integrations. Coverage is collected from `src/lib/**/*.ts`, excluding declaration files and `OnnxEmbeddingEngine.ts`, with global thresholds of 50% branches and 60% functions, lines, and statements.

## Commit & Pull Request Guidelines

Recent history uses Conventional Commit-style subjects, often with scopes: `feat(LocalBrain): ...`, `fix(onnx): ...`, and `refactor(chat): ...`. Keep subjects imperative and scoped when useful. Pull requests should include a short behavior summary, test results such as `npm test` or `npm run test:coverage`, linked issues when applicable, and screenshots or screen recordings for UI changes.

## Security & Configuration Tips

Do not commit downloaded model binaries, secrets, local environment files, or generated coverage artifacts. Keep platform setup notes in existing docs such as `ANDROID_BUILD.md` or `DEV_GUIDE.md`, and prefer mocked dependencies for tests over device files or network resources.
