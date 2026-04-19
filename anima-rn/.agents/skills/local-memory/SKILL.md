---
name: local-memory
description: Local memory system with Orama vector search and SQLite persistence. Covers embedding generation, tag extraction, vector indexing, RAG retrieval, and data persistence.
version: 1.0.0
license: MIT
---

# Local Memory System Guide

## Overview

This skill provides guidance for implementing an on-device memory system that enables AI pets to "remember" users through:

1. **Tag Extraction**: Using SmolLM to extract user state/traits from conversations
2. **Vector Indexing**: Orama for fast semantic search
3. **Persistence**: SQLite for durable storage
4. **RAG Retrieval**: Context-aware prompt enrichment

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────┐     ┌──────────┐
│ Conversation │────▶│ Tag Extraction │────▶│  Orama   │────▶│  SQLite  │
│   Messages   │     │  (SmolLM)     │     │ Vector  │     │ Storage  │
└─────────────┘     └──────────────┘     └─────────┘     └──────────┘
                            │                                      │
                            ▼                                      ▼
                   ┌────────────────┐                  ┌─────────────┐
                   │ JSON Tags      │◀─────────────────│ Query &     │
                   │ ["单身","沮丧"] │   RAG Lookup     │ Retrieve    │
                   └────────────────┘                  └─────────────┘
```

## Dependencies

```bash
npx expo install @orama/orama expo-sqlite
# Optional: ONNX for embeddings
npm install onnxruntime-node
```

## Database Schema (SQLite)

```typescript
// src/lib/MemoryDB.ts
import * as SQLite from 'expo-sqlite'

const db = SQLite.openDatabase('memory.db')

export interface MemoryRecord {
  id: number
  tags: string           // JSON array: ["单身", "内向"]
  content: string        // Original conversation excerpt
  timestamp: number      // Unix timestamp
  embedding_id: string   // Reference to Orama document ID
}

export async function initMemoryDB(): Promise<void> {
  db.transaction((tx) => {
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tags TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        embedding_id TEXT
      )
    `)
    
    // Index for faster queries
    tx.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_timestamp 
      ON memories(timestamp DESC)
    `)
  })
}

export async function saveMemory(
  tags: string[],
  content: string
): Promise<number> {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        'INSERT INTO memories (tags, content, timestamp) VALUES (?, ?, ?)',
        [JSON.stringify(tags), content, Date.now()],
        (_, result) => resolve(result.insertId),
        (_, error) => reject(error)
      )
    })
  })
}

export async function getRecentMemories(
  limit: number = 10
): Promise<MemoryRecord[]> {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        'SELECT * FROM memories ORDER BY timestamp DESC LIMIT ?',
        [limit],
        (_, { rows }) => resolve(rows._array as MemoryRecord[]),
        (_, error) => reject(error)
      )
    })
  })
}
```

## Orama Vector Search Setup

```typescript
// src/lib/VectorStore.ts
import { create, insert, search, Orama } from '@orama/orama'

interface MemoryDocument {
  id: string
  tags: string
  content: string
  timestamp: number
}

let oramaDb: Orama<MemoryDocument> | null = null

export async function getVectorDB(): Promise<Orama<MemoryDocument>> {
  if (!oramaDb) {
    oramaDb = await create<MemoryDocument>({
      schema: {
        id: 'string',
        tags: 'string[]',
        content: 'string',
        timestamp: 'number'
      }
    })
  }
  return oramaDb
}

export async function addMemoryToIndex(
  record: MemoryRecord
): Promise<void> {
  const db = await getVectorDB()
  
  await insert(db, {
    id: String(record.id),
    tags: record.tags,
    content: record.content,
    timestamp: record.timestamp
  })
}

export async function searchMemories(
  query: string,
  limit: number = 5
): Promise<MemoryDocument[]> {
  const db = await getVectorDB()
  
  const result = await search(db, {
    term: query,
    limit,
    properties: ['tags', 'content'],
    boost: {
      tags: 2.0,  // Higher weight for tag matches
      content: 1.0
    }
  })
  
  return result.hits.map(hit => hit.document)
}
```

## Tag Extraction Pipeline

### Using SmolLM for Extraction

```typescript
// src/lib/TagExtractor.ts
import { createLlamaContext } from './LocalBrain'

const EXTRACTION_PROMPT = `分析以下对话记录，提取用户的状态和性格标签。
要求：
1. 输出JSON格式数组
2. 标签简洁（2-4个字）
3. 包含情绪状态和关键信息
4. 只输出JSON，不要其他内容

示例输出：["单身", "内向", "心情沮丧", "工作压力大"]

对话记录：
{conversation}`

export async function extractTags(
  conversation: string,
  context: LlamaContext
): Promise<string[]> {
  const prompt = EXTRACTION_PROMPT.replace('{conversation}', conversation)
  
  const response = await context.completion({
    prompt,
    n_predict: 80,
    temperature: 0.3,  // Lower temp for structured output
  })
  
  try {
    // Parse JSON from response
    const jsonMatch = response.text.match(/\[[\s\S]*?\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return []
  } catch {
    console.warn('Failed to parse extracted tags')
    return []
  }
}
```

## RAG Integration

### Memory-Aware Prompt Builder

```typescript
// src/lib/RAGPipeline.ts
import { searchMemories } from './VectorStore'
import { getRecentMemories } from './MemoryDB'

interface MemoryContext {
  tags: string[]
  recentSummary: string
}

export async function buildMemoryContext(
  userId: string
): Promise<MemoryContext> {
  // 1. Get recent tags from vector search
  const relevantMemories = await searchMemories(userId, 5)
  const tags = [...new Set(
    relevantMemories.flatMap(m => JSON.parse(m.tags))
  )]
  
  // 2. Get recent conversation summaries
  const recentRecords = await getRecentMemories(5)
  const recentSummary = recentRecords
    .map(r => r.content.slice(0, 50))
    .join('; ')
  
  return { tags, recentSummary }
}

export function enrichSystemPrompt(
  basePrompt: string,
  memory: MemoryContext
): string {
  if (memory.tags.length === 0) return basePrompt
  
  const memorySection = `
【用户记忆】
- 当前标签：${memory.tags.join('、')}
- 近期话题：${memory.recentSummary || '暂无'}
`.trim()
  
  return `${basePrompt}\n\n${memorySection}`
}
```

### Usage in Chat Flow

```typescript
// In your chat handler:
async function handleUserMessage(userText: string) {
  // 1. Build memory-aware prompt
  const memory = await buildMemoryContext(currentUser.id)
  const enrichedPrompt = enrichSystemPrompt(PET_PERSONA, memory)
  
  // 2. Send to LLM
  const chatPrompt = buildChatMLPrompt(enrichedPrompt, history, userText)
  const response = await streamCompletion(context, chatPrompt, onToken)
  
  // 3. Save this interaction for future memory
  await saveMemory(['对话'], `${userText} -> ${response}`)
  
  // 4. Periodically run tag extraction (e.g., after N messages)
  if (messageCount % 10 === 0) {
    await runPeriodicExtraction()
  }
}

async function runPeriodicExtraction() {
  const recent = await getRecentMemories(20)
  const conversation = recent.map(r => r.content).join('\n')
  const tags = await extractTags(conversation, llamaContext)
  
  if (tags.length > 0) {
    const id = await saveMemory(tags, conversation)
    await addMemoryToIndex({ id, tags: JSON.stringify(tags), content: conversation, timestamp: Date.now() })
  }
}
```

## Background Task (Optional)

Using `expo-task-manager` for background tag extraction:

```typescript
// app.json config
{
  "expo": {
    "plugins": [
      [
        "expo-task-manager",
        {
          taskName: "memory-extraction"
        }
      ]
    ]
  }
}
```

```typescript
// src/tasks/MemoryTask.ts
import { defineTask } from 'expo-task-manager'

const MEMORY_TASK = 'memory-extraction'

defineTask(MEMORY_TASK, async ({ data }) => {
  const { conversation } = data as { conversation: string }
  
  // Run extraction in background
  const context = await createLlamaContext()
  const tags = await extractTags(conversation, context)
  
  if (tags.length > 0) {
    await saveMemory(tags, conversation)
  }
  
  context.dispose()
})
```

## Performance Considerations

| Operation | Frequency | Notes |
|-----------|-----------|-------|
| Save message | Every chat | Lightweight SQLite insert |
| Vector index update | Every 10 msgs | Batch processing |
| Tag extraction | Background | Low priority task |
| Memory retrieval | On open | Cache results |

## Storage Limits

| Platform | SQLite Limit | ORAMA Memory |
|----------|--------------|--------------|
| iOS | Unlimited disk | RAM dependent |
| Android | Unlimited disk | RAM dependent |

**Recommendation**: Keep active index under 10k documents for optimal performance.

## Data Privacy

All data stays on-device:
- No cloud sync
- No analytics transmission
- User can clear via settings
- Encrypted at rest (iOS keychain / Android keystore available)
