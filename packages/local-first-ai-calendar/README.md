# Local-First AI Calendar

A privacy-first, local-first AI calendar with WebGPU-powered embeddings, RAG, and EdgeVec vector database.

## Features

- **100% Local Data Storage**: All data stays in your browser via IndexedDB
- **WebGPU Embeddings**: Generate embeddings locally using Transformers.js
- **EdgeVec Vector Database**: High-performance WASM-native vector database with:
  - HNSW + FlatIndex for fast similarity search
  - Binary quantization for 32x memory reduction
  - Metadata filtering with SQL-like expressions
  - Sub-millisecond search latency
- **Vector Search**: Fast cosine similarity search powered by EdgeVec
- **RAG Integration**: Ask questions about your calendar with AI assistance
- **Offline-First**: Works completely offline, no cloud required
- **Privacy-First**: Your data never leaves your device unless you explicitly choose to use RAG

## Installation

```bash
npm install @idea-turbo/local-first-ai-calendar
```

## Quick Start

```typescript
import { createLocalFirstAICalendar } from "@idea-turbo/local-first-ai-calendar";

// Create a calendar instance
const calendar = createLocalFirstAICalendar();

// Initialize
await calendar.initialize();

// Add an event
const event = await calendar.addEvent({
  title: "Team Standup",
  description: "Daily sync with the team",
  startTime: new Date(Date.now() + 3600000),
  endTime: new Date(Date.now() + 7200000),
  location: "Zoom",
  attendees: ["Alice", "Bob", "Charlie"],
  tags: ["work", "meeting"],
});

// Search for events
const results = await calendar.searchEvents("team meetings");

// Optional: Enable RAG for AI queries
const calendarWithRAG = createLocalFirstAICalendar({
  rag: {
    apiEndpoint: "https://api.deepseek.com/v1/chat/completions",
    apiKey: "your-api-key",
    model: "deepseek-chat",
    maxContextLength: 1000,
  },
});

await calendarWithRAG.initialize();
const answer = await calendarWithRAG.askAI("What meetings do I have with Alice?");
```

## API Reference

### `createLocalFirstAICalendar(config?)`

Creates a new calendar instance.

### `LocalFirstAICalendar` Methods

- `initialize()` - Initialize the calendar and load data
- `addEvent(event)` - Add a new calendar event
- `updateEvent(id, updates)` - Update an existing event
- `deleteEvent(id)` - Delete an event
- `getEvent(id)` - Get an event by ID
- `getAllEvents()` - Get all events
- `getEventsByTimeRange(start, end)` - Get events in a time range
- `searchEvents(query, topK?)` - Search events by similarity
- `searchEventsWithTimeFilter(query, start, end, topK?)` - Search with time filter
- `askAI(query)` - Ask AI about your calendar (requires RAG config)
- `askAIWithTimeFilter(query, start, end)` - Ask AI with time filter
- `clearAll()` - Clear all data

## Architecture

This package follows a modular architecture:

1. **Storage Layer** (`storage.ts`): IndexedDB persistence via localforage
2. **Vector DB** (`vectorDB.ts`): EdgeVec WASM-native vector database with high-performance search
3. **Embedding Engine** (`embeddingEngine.ts`): Transformers.js for local embeddings
4. **RAG Engine** (`ragEngine.ts`): Remote LLM integration for AI queries
5. **Main Class** (`index.ts`): Orchestrates all components

## EdgeVec Integration

### Key Features

EdgeVec is a WASM-native vector database built in Rust, providing:

- **High Performance**: Sub-millisecond search latency with HNSW index
- **Memory Efficiency**: Binary quantization reduces memory usage by 32x
- **Metadata Filtering**: SQL-like filter expressions for precise queries
- **Soft Delete**: Mark vectors as deleted without immediate removal
- **Persistence**: IndexedDB persistence support (coming soon)

### Performance Benefits

| Feature | Benefit |
|---------|---------|
| WASM Native | Near-native performance in the browser |
| HNSW Index | Fast approximate nearest neighbor search |
| Binary Quantization | 32x memory reduction with ~95% recall |
| SIMD Optimization | 2x+ faster vector operations on modern browsers |

## Changelog

### v0.1.0
- Initial release
- Integrated EdgeVec as the vector database
- WebGPU-powered embeddings via Transformers.js
- RAG integration for AI queries
- IndexedDB persistence

## License

MIT
