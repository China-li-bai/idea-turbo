---
name: anima-rn-agents
description: Agent configuration for the Anima RN project - an Expo-based on-device AI pet chat application. Integrates llama.rn, gifted-chat, Orama, and SQLite.
version: 1.0.0
---

# Anima RN Agent Configuration

## Project Overview

**Anima RN** is an Expo-based mobile application featuring:
- 🤖 On-device LLM inference (SmolLM-360M)
- 💬 Interactive chat interface
- 🧠 Local memory with vector search (RAG)
- 🐕 AI Pet persona ("修勾")

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | Expo SDK 52+ | Cross-platform development |
| LLM Engine | `llama.rn` | On-device inference |
| Model | SmolLM-360M-Instruct Q4_K_M | Lightweight AI (~200MB) |
| Chat UI | `react-native-gifted-chat` v3.3+ | Messaging interface |
| Vector Search | `@orama/orama` | Semantic memory indexing |
| Persistence | `expo-sqlite` | Local data storage |

## Available Skills

### 1. [building-native-ui](./skills/building-native-ui/SKILL.md)
Expo UI development guidelines covering:
- Navigation with expo-router
- Native components and styling
- Animations with Reanimated
- Platform-specific patterns

### 2. [on-device-llm](./skills/on-device-llm/SKILL.md)
On-device AI integration covering:
- llama.rn initialization and configuration
- SmolLM model loading from bundle
- ChatML prompt formatting
- Streaming completion
- Memory management and disposal

### 3. [chat-ui](./skills/chat-ui/SKILL.md)
Chat interface implementation covering:
- GiftedChat message state management
- Custom bubble styles and avatars
- Input handling and quick replies
- Animation patterns
- Accessibility considerations

### 4. [local-memory](./skills/local-memory/SKILL.md)
Memory system implementation covering:
- SQLite schema and operations
- Orama vector search setup
- Tag extraction pipeline using SmolLM
- RAG context enrichment
- Background task processing

## Development Workflow

### Prerequisites

```bash
# Required for native builds
- Xcode 15+ (iOS)
- Android Studio (Android)
- Node.js 18+
```

### Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development server**
   ```bash
   npx expo start
   ```
   > ⚠️ Note: For native features (LLM), use Dev Client build instead of Expo Go

3. **Create development build**
   ```bash
   npx expo prebuild --clean
   npx expo run:android  # or run:ios
   ```

## Project Structure

```
anima-rn/
├── .agents/              # Agent configurations (this directory)
│   └── skills/
│       ├── building-native-ui/
│       ├── on-device-llm/
│       ├── chat-ui/
│       └── local-memory/
├── app/                  # Expo Router pages
├── src/
│   ├── lib/              # Core libraries
│   │   ├── LocalBrain.ts     # LLM initialization & chat logic
│   │   ├── llama-adapter.ts  # Platform-specific adapter
│   │   ├── MemoryDB.ts       # SQLite operations
│   │   ├── VectorStore.ts    # Orama search
│   │   ├── TagExtractor.ts   # LLM tag extraction
│   │   └── RAGPipeline.ts    # Memory-aware prompts
│   └── components/       # UI components
├── models/               # Bundled GGUF model files
├── assets/               # Static assets (avatars, etc.)
├── metro.config.js       # Metro bundler config (GGUF support)
├── eas.json              # EAS Build configuration
└── app.json              # Expo project config
```

## Code Conventions

- **TypeScript**: Strict mode enabled
- **File naming**: kebab-case (`chat-screen.tsx`)
- **Imports**: Use path aliases over relative imports
- **State**: React hooks or Zustand for global state
- **Error handling**: Try-catch with user-friendly messages
- **Platform checks**: Use lazy loading for native modules

## Key Patterns

### Lazy Loading (Required)

Never import native modules at top level:

```typescript
// ✅ Correct: Lazy load
const { initLlama } = await import('llama.rn')

// ❌ Wrong: Direct import crashes on web
import { initLlama } from 'llama.rn'
```

### Memory Management

Always dispose native resources:

```typescript
useEffect(() => {
  let context: LlamaContext | null = null
  
  setup().then(ctx => { context = ctx })
  
  return () => context?.dispose()
}, [])
```

### Error Boundaries

Wrap features in error boundaries:

```tsx
<ErrorBoundary fallback={<ErrorScreen />}>
  <ChatScreen />
</ErrorBoundary>
```

## Testing Strategy

| Type | Tool | Coverage |
|------|------|----------|
| Unit | Jest/Vitest | Core logic |
| Component | React Test Library | UI rendering |
| E2E | Detox | User flows |
| Device | Physical devices | LLM testing |

## Build Profiles

See `eas.json` for configured profiles:
- **development**: Fast iteration with devtools
- **preview**: Pre-release testing
- **production**: App Store / Play Store release

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [llama.rn GitHub](https://github.com/mybigday/llama.rn)
- [react-native-gifted-chat](https://github.com/FaridSafi/react-native-gifted-chat)
- [Orama Documentation](https://docs.orama.search.org/)
- [SmolLM Models](https://huggingface.co/HuggingFaceTB/SmolLM-360M-Instruct-GGUF)
