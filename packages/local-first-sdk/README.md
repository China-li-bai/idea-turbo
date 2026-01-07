# @idea-turbo/local-first-sdk

A simplified Local-First SDK for building collaborative applications with Yjs, PartyKit, and IndexedDB.

## Overview

This SDK provides a thin, opinionated wrapper around [y-partykit](https://docs.partykit.io/reference/y-partykit-api/) that makes it easy to build local-first applications with automatic synchronization.

**Key Design Principle**: Don't reinvent the wheel. We use YPartyKitProvider directly and only add the minimal necessary functionality.

## Features

- **Local-First**: Data is stored locally first using IndexedDB
- **Automatic Sync**: Seamlessly syncs with PartyKit server when online
- **CRDT-based**: Uses Yjs for conflict-free collaborative editing
- **Simple API**: Clean, intuitive API that doesn't hide the underlying libraries
- **TypeScript**: Fully typed with comprehensive type definitions

## Installation

```bash
npm install @idea-turbo/local-first-sdk
```

## Quick Start

```typescript
import { createLocalFirst } from "@idea-turbo/local-first-sdk";

const sdk = createLocalFirst({
  room: "my-room",
  host: "localhost:1999",
});

const text = sdk.getText("content");
text.insert(0, "Hello, World!");

sdk.connect();

sdk.on("status", (status) => {
  console.log("Sync status:", status);
});
```

## API Reference

### `createLocalFirst(config: LocalFirstConfig): LocalFirst`

Creates a new Local-First SDK instance.

#### Configuration

```typescript
interface LocalFirstConfig {
  room: string;              // Required: Room identifier
  host?: string;             // Optional: PartyKit server host (default: window.location.host)
  party?: string;            // Optional: Party name
  enablePersistence?: boolean; // Optional: Enable IndexedDB (default: true)
  persistenceKey?: string;   // Optional: Custom persistence key
  autoConnect?: boolean;     // Optional: Auto-connect on creation (default: true)
  onStatusChange?: (status: SyncStatus) => void; // Optional: Status change callback
  onError?: (error: Error) => void; // Optional: Error callback
}
```

#### SDK Instance

```typescript
interface LocalFirstSDK {
  doc: Y.Doc;                // The underlying Yjs document
  status: SyncStatus;        // Current sync status
  provider: YPartyKitProvider; // The underlying YPartyKitProvider
  awareness: any;            // The awareness instance for user presence

  // Data access
  getText(name: string): Y.Text;
  getArray<T>(name: string): Y.Array<T>;
  getMap<T>(name: string): Y.Map<T>;
  getXmlFragment(name: string): Y.XmlFragment;

  // Connection management
  connect(): void;
  disconnect(): void;

  // Lifecycle
  destroy(): void;

  // Events
  on(event: "status" | "change", callback: (status: SyncStatus) => void): void;
  off(event: "status" | "change", callback: (status: SyncStatus) => void): void;
  onStateChange(callback: (state: StateSnapshot) => void): void;
  offStateChange(callback: (state: StateSnapshot) => void): void;
  getState(): StateSnapshot;
}
```

### Sync Status

```typescript
type SyncStatus = "connected" | "connecting" | "disconnected" | "synced" | "error";
```

### State Snapshot

```typescript
interface StateSnapshot {
  isOnline: boolean;
  isSynced: boolean;
  syncStatus: SyncStatus;
  lastSyncTime: Date | null;
}
```

## Usage Examples

### Basic Text Editing

```typescript
import { createLocalFirst } from "@idea-turbo/local-first-sdk";

const sdk = createLocalFirst({
  room: "text-editor-room",
  host: "localhost:1999",
});

const text = sdk.getText("content");
text.insert(0, "Hello, World!");

// Listen for changes
text.observe(() => {
  console.log("Content changed:", text.toString());
});

sdk.connect();
```

### Array Data (Todo List)

```typescript
const sdk = createLocalFirst({
  room: "todo-room",
});

const todos = sdk.getArray<{ text: string; done: boolean }>("todos");

todos.push([
  { text: "Learn Local-First SDK", done: false },
  { text: "Build collaborative app", done: false },
]);

// Listen for changes
todos.observe(() => {
  console.log("Todos:", todos.toArray());
});

sdk.connect();
```

### Map Data (Metadata)

```typescript
const sdk = createLocalFirst({
  room: "metadata-room",
});

const metadata = sdk.getMap<{
  title: string;
  author: string;
  createdAt: Date;
}>("metadata");

metadata.set("title", "My Document");
metadata.set("author", "John Doe");
metadata.set("createdAt", new Date());

// Listen for changes
metadata.observe(() => {
  console.log("Metadata:", metadata.toJSON());
});

sdk.connect();
```

### Manual Connection Control

```typescript
const sdk = createLocalFirst({
  room: "manual-room",
  autoConnect: false, // Don't connect automatically
});

const text = sdk.getText("content");
text.insert(0, "Manual connection example");

// Connect when needed
sdk.connect();

// Disconnect when done
setTimeout(() => {
  sdk.disconnect();
}, 5000);
```

### Status Monitoring

```typescript
const sdk = createLocalFirst({
  room: "status-room",
});

// Listen for status changes
sdk.on("status", (status) => {
  console.log("Status:", status);
});

// Or use state change listener
sdk.onStateChange((state) => {
  console.log("Online:", state.isOnline);
  console.log("Synced:", state.isSynced);
  console.log("Status:", state.syncStatus);
  console.log("Last sync:", state.lastSyncTime);
});

sdk.connect();
```

### Error Handling

```typescript
const sdk = createLocalFirst({
  room: "error-room",
  onStatusChange: (status) => {
    if (status === "error") {
      console.error("Connection error");
    }
  },
  onError: (error) => {
    console.error("Error occurred:", error.message);
  },
});

sdk.connect();
```

### User Awareness

```typescript
const sdk = createLocalFirst({
  room: "awareness-room",
});

// Set local user info
sdk.awareness.setLocalStateField("user", {
  name: "Alice",
  color: "#ff0000",
});

// Listen for awareness changes
sdk.awareness.on("change", () => {
  const states = Array.from(sdk.awareness.getStates().values());
  console.log("Online users:", states);
});

sdk.connect();
```

### React Integration

```typescript
import React, { useEffect, useRef, useState } from "react";
import { createLocalFirst } from "@idea-turbo/local-first-sdk";

function TextEditor() {
  const [content, setContent] = useState("");
  const sdkRef = useRef<any>(null);
  const textRef = useRef<any>(null);

  useEffect(() => {
    const sdk = createLocalFirst({
      room: "react-editor-room",
      host: "localhost:1999",
    });

    sdkRef.current = sdk;

    const text = sdk.getText("content");
    textRef.current = text;

    const observer = () => {
      setContent(text.toString());
    };

    text.observe(observer);
    sdk.connect();

    return () => {
      text.unobserve(observer);
      sdk.destroy();
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setContent(newText);
    textRef.current?.delete(0, textRef.current.length);
    textRef.current?.insert(0, newText);
  };

  return (
    <textarea
      value={content}
      onChange={handleChange}
      rows={10}
      cols={50}
    />
  );
}
```

## Architecture

This SDK follows a **minimalist design philosophy**:

1. **Direct Usage of Libraries**: We use YPartyKitProvider and y-indexeddb directly without unnecessary wrappers
2. **No Hidden Abstractions**: The SDK exposes the underlying libraries (doc, provider, awareness) for direct access
3. **Thin Wrapper**: Only adds minimal functionality (state tracking, event aggregation) on top of existing libraries
4. **Single File Implementation**: The entire SDK is implemented in a single file for simplicity and transparency

### What We Don't Do

- ❌ Create unnecessary abstraction layers
- ❌ Hide the underlying libraries
- ❌ Reinvent functionality that already exists
- ❌ Over-engineer simple problems

### What We Do

- ✅ Provide a simple, clean API
- ✅ Aggregate events from multiple sources
- ✅ Track state in a convenient way
- ✅ Handle cleanup properly
- ✅ Expose the underlying libraries for advanced usage

### Test Coverage

The SDK is thoroughly tested with **43 test cases** covering:

- ✅ **Initialization** (2 tests): SDK creation and initial state
- ✅ **Text Operations** (3 tests): Text manipulation and observation
- ✅ **Array Operations** (3 tests): Array manipulation and observation
- ✅ **Map Operations** (4 tests): Map manipulation, deletion, and JSON export
- ✅ **XmlFragment Operations** (1 test): XML fragment access
- ✅ **Connection Management** (3 tests): Connect, disconnect, and auto-connect
- ✅ **Event Listening** (4 tests): Status change, change events, and multiple listeners
- ✅ **State Management** (5 tests): State snapshots, state changes, online/offline tracking
- ✅ **Configuration Callbacks** (2 tests): Status change and error callbacks
- ✅ **Resource Cleanup** (2 tests): Instance destruction and listener cleanup
- ✅ **Awareness** (2 tests): Awareness instance and local state management
- ✅ **Persistence** (3 tests): Enable/disable persistence and custom keys
- ✅ **Edge Cases** (4 tests): Empty data handling and duplicate field names
- ✅ **Type Safety** (3 tests): Type inference for Text, Array, and Map

Run tests with:
```bash
npm run test
```

Run tests with coverage:
```bash
npm run test:coverage
```

Run tests with UI:
```bash
npm run test:ui
```

#### Testing Environment

The test suite uses:
- **Vitest**: Fast unit testing framework
- **happy-dom**: Lightweight DOM environment
- **fake-indexeddb**: IndexedDB polyfill for Node.js
- **Mock WebSocket**: Custom WebSocket implementation for testing without network

The test setup automatically provides IndexedDB and WebSocket mocks, allowing tests to run in a Node.js environment without requiring a real browser or server connection.

## Advanced Usage

### Accessing Underlying Libraries

The SDK exposes the underlying libraries for advanced usage:

```typescript
const sdk = createLocalFirst({
  room: "advanced-room",
});

// Access the Yjs document directly
const doc = sdk.doc;

// Access the YPartyKitProvider directly
const provider = sdk.provider;

// Access the awareness instance directly
const awareness = sdk.awareness;

// Use any Yjs features directly
const ymap = doc.getMap("custom");
ymap.set("key", "value");
```

### Custom Persistence

You can disable the built-in IndexedDB persistence and implement your own:

```typescript
const sdk = createLocalFirst({
  room: "custom-persistence-room",
  enablePersistence: false, // Disable built-in persistence
});

// Implement your own persistence logic
// using the sdk.doc directly
```

### Custom Provider Options

You can access the provider directly to set custom options:

```typescript
const sdk = createLocalFirst({
  room: "custom-provider-room",
});

// Access the provider and set custom options
// Note: This is advanced usage and requires understanding of YPartyKitProvider
```

## Dependencies

- **yjs**: CRDT framework for collaborative applications
- **y-indexeddb**: IndexedDB persistence for Yjs
- **y-partykit**: PartyKit integration for Yjs
- **partysocket**: WebSocket client for PartyKit

## Server Setup

To use this SDK, you need a PartyKit server with y-partykit support:

```typescript
// server.ts
import type * as Party from "partykit/server";
import { onConnect } from "y-partykit";

export default class YjsServer implements Party.Server {
  constructor(public party: Party.Room) {}

  onConnect(conn: Party.Connection) {
    return onConnect(conn, this.party, {
      persist: { mode: "snapshot" },
    });
  }
}
```

## Best Practices

1. **Always destroy when done**: Call `sdk.destroy()` when you're done with the SDK to clean up resources
2. **Use autoConnect for most cases**: Set `autoConnect: true` (default) for automatic connection
3. **Handle errors**: Always provide an `onError` callback to handle connection errors
4. **Monitor status**: Use `onStateChange` to monitor the sync and online status
5. **Use awareness**: Leverage the awareness API for user presence and cursor tracking

## Troubleshooting

### Connection Issues

If you're having trouble connecting:

1. Check that the PartyKit server is running
2. Verify the host and room names are correct
3. Check browser console for error messages
4. Ensure the server has y-partykit enabled

### Sync Issues

If data isn't syncing:

1. Check the sync status using `sdk.getState()`
2. Verify that both clients are connected to the same room
3. Check the network connection
4. Review the server logs for errors

### Persistence Issues

If data isn't persisting:

1. Check that IndexedDB is enabled in the browser
2. Verify that `enablePersistence` is not set to `false`
3. Check browser console for IndexedDB errors
4. Try clearing IndexedDB and reconnecting

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Related Projects

- [Yjs](https://github.com/yjs/yjs) - CRDT framework
- [PartyKit](https://partykit.io/) - Real-time server platform
- [y-partykit](https://docs.partykit.io/reference/y-partykit-api/) - Yjs integration for PartyKit
- [y-indexeddb](https://github.com/dmonad/y-indexeddb) - IndexedDB persistence for Yjs
