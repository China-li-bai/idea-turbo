# @idea-turbo/local-first-sdk

Local-first SDK for real-time collaborative applications.

## Features

- **Local-first Architecture**: Data is stored locally first, then synchronized with the server
- **Offline Support**: Continue working offline, changes sync when connection is restored
- **Real-time Collaboration**: Multiple users can edit simultaneously with CRDT-based conflict resolution
- **Persistent Storage**: Uses IndexedDB for local data persistence
- **React Integration**: Easy-to-use React hooks and components
- **PartyKit Integration**: Seamless integration with PartyKit for real-time sync

## Installation

```bash
npm install @idea-turbo/local-first-sdk
```

## Quick Start

### Basic Usage

```typescript
import { LocalFirstSDK } from "@idea-turbo/local-first-sdk";

const sdk = new LocalFirstSDK({
  room: "my-room",
  host: "localhost:1999",
  party: "main",
});

await sdk.initialize();

const text = sdk.getEngine().getText("quill");
console.log(text.toString());
```

### React Integration

```tsx
import { useLocalFirst } from "@idea-turbo/local-first-sdk/react";
import { Editor, SyncStatus } from "@idea-turbo/local-first-sdk/ui";

function App() {
  const { sdk, state } = useLocalFirst({
    room: "my-room",
    host: "localhost:1999",
  });

  if (!sdk) return <div>Loading...</div>;

  return (
    <div>
      <SyncStatus state={state} />
      <Editor sdk={sdk} />
    </div>
  );
}
```

## API Reference

### LocalFirstSDK

Main SDK class that manages synchronization.

#### Constructor

```typescript
new LocalFirstSDK(config: SyncConfig)
```

#### Methods

- `initialize(persistenceName?: string): Promise<void>` - Initialize the SDK
- `getEngine(): SyncEngine` - Get the sync engine
- `getPersistence(): PersistenceManager` - Get the persistence manager
- `getNetwork(): NetworkManager` - Get the network manager
- `getState(): SyncState` - Get current sync state
- `setUserPresence(presence: UserPresence): void` - Set user presence
- `getUserPresence(): UserPresence | undefined` - Get user presence
- `onStateChange(callback: (state: SyncState) => void): () => void` - Subscribe to state changes
- `destroy(): void` - Cleanup and destroy the SDK

### React Hooks

#### useLocalFirst

Initialize and manage the SDK in a React component.

```typescript
const { sdk, state } = useLocalFirst({
  room: string,
  host?: string,
  party?: string,
});
```

#### useSyncState

Get sync state from an SDK instance.

```typescript
const state = useSyncState(sdk);
```

#### useUserPresence

Manage user presence.

```typescript
const { presence, setLocalPresence } = useUserPresence(sdk);
```

### React Components

#### Editor

A collaborative text editor component.

```tsx
<Editor sdk={sdk} textName="quill" className="my-editor" />
```

#### SyncStatus

Display sync status indicator.

```tsx
<SyncStatus state={state} className="my-status" />
```

## Architecture

The SDK is built with the following layers:

1. **Core Layer** (`SyncEngine`): Manages Yjs document and data structures
2. **Persistence Layer** (`PersistenceManager`): Handles IndexedDB storage
3. **Network Layer** (`NetworkManager`): Manages WebSocket connections via PartyKit
4. **React Layer**: Provides React hooks and components
5. **UI Layer**: Pre-built components for common use cases

## License

MIT
