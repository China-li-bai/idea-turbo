---
name: "vector-model-switching"
description: "Handles AI embedding model switching with vector reindexing for Orama database. Invoke when user needs to switch between multilingual models or reports embedding dimension mismatch errors."
---

# Vector Model Switching with Reindexing

This skill handles switching between AI embedding models in a vector search system (Orama + Transformers.js), managing the critical issue of vector dimension mismatches.

## Core Problem

When switching embedding models (e.g., from `bge-small-zh-v1.5` 512D to `multilingual-e5-small` 384D):
- Different models produce vectors of different dimensions
- Existing indexed items have embeddings incompatible with new model
- Attempting to insert 512D vectors into a 384D schema causes errors

## Solution Architecture

### 1. Model Configuration (`aiModels.ts`)

Define models with their properties:
```typescript
export interface AIModelConfig {
  id: string
  name: string
  modelName: string
  dimensions: number
  supportedLocales: SupportedLocale[]
  prefixConfig?: { query: string; passage: string }  // For E5 models
}
```

### 2. Service with Reindex Method (`oramaSearchService.ts`)

```typescript
async switchModelWithReindex(
  modelType: AIModelType,
  items: UnifiedCalendarItem[],
  progressCallback?: (current: number, total: number, message?: string) => void
): Promise<void> {
  // 1. Initialize new model
  await this.initialize();

  // 2. Reindex all items with new embeddings
  for (const item of items) {
    const newEmbedding = await this.embed(text);
    await insert(this.db, { ...item, embedding: newEmbedding });
  }
}
```

### 3. Context Provider (`AIModelContext.tsx`)

Expose both methods:
```typescript
interface AIModelContextType {
  switchModel: (modelType: AIModelType) => Promise<void>;
  switchModelWithReindex: (modelType: AIModelType, items: any[]) => Promise<void>;
}
```

### 4. UI with Confirmation (`AppLayout.tsx`)

```typescript
onChange={(e) => {
  const newModel = e.target.value;
  if (dimensionsChanged) {
    if (confirm(t('cache.reindexConfirm'))) {
      switchModelWithReindex(newModel, items);
    }
  } else {
    switchModelWithReindex(newModel, items);
  }
}}
```

## Cache Management

### Transformers.js Cache Configuration

```typescript
const env = await import("@huggingface/transformers").then(m => m.env);

if (typeof window !== 'undefined') {
  // Secure context check for Cache API
  const isSecureContext = window.isSecureContext;
  const isLocalhost = window.location.hostname === 'localhost' ||
                      window.location.hostname === '127.0.0.1';

  if (isSecureContext || isLocalhost) {
    env.useBrowserCache = true;
  } else {
    env.useBrowserCache = false;  // IP access can't use Cache API
  }

  // Optional: Use HF mirror for China
  env.remoteHost = 'https://hf-mirror.com';
}
```

### Cache API Compatibility

| Access Method | Cache API | Notes |
|--------------|-----------|-------|
| `https://` | ✅ Available | Secure context |
| `http://localhost` | ✅ Available | Browser特例 |
| `http://127.0.0.1` | ✅ Available | Browser特例 |
| `http://IP:port` | ❌ Unavailable | Non-secure context |

### Cache Status Display

```typescript
export async function getCacheStats(): Promise<{
  entryCount: number;
  totalSize: number;
  models: Set<string>;
}> {
  const cache = await caches.open(MODEL_CACHE_NAME);
  // ...
}
```

## E5 Model Prefix Handling

Multilingual E5 models require prefixes:
```typescript
export function formatTextForEmbedding(
  text: string,
  task: EmbeddingTask,  // 'query' | 'passage'
  config: AIModelConfig
): string {
  if (!config.prefixConfig) return text;
  return `${config.prefixConfig[task]}${text}`;
}

// Usage
const queryEmbedding = await this.embed(formattedText, 'query');
const passageEmbedding = await this.embed(formattedText, 'passage');
```

## Error Handling

### Dimension Mismatch Error
```
Property "embedding" was declared as a 384-dimensional vector,
but got a 512-dimensional vector instead.
```
**Solution**: Always use `switchModelWithReindex` when dimensions differ.

### Browser Cache Unavailable
```
Browser cache is not available in this environment
```
**Cause**: Accessing via IP address (non-HTTPS) in non-localhost context.
**Solution**: This is informational; models still download but don't persist in Cache Storage.

## Key Files

- `lib/services/oramaSearchService.ts` - Core search service with reindex
- `lib/contexts/AIModelContext.tsx` - Model switching context
- `lib/utils/aiModels.ts` - Model configurations
- `components/ui/AppLayout.tsx` - Model selector UI
- `lib/contexts/LocaleContext.tsx` - Translations

## When to Invoke

1. User reports embedding dimension mismatch errors
2. User wants to switch between Chinese/multilingual/English models
3. User reports "Browser cache is not available"
4. User needs to test different embedding models for internationalization
5. User asks about model caching behavior
