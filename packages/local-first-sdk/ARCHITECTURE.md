# Architecture Overview

## Local-First Architecture

This SDK implements a local-first architecture where data is stored locally first, then synchronized with the server. This approach provides:

- **Offline Support**: Users can continue working without internet connection
- **Fast Performance**: Local operations are instant
- **Data Ownership**: Users own their data
- **Conflict Resolution**: CRDT-based automatic conflict resolution

## Core Components

### 1. SyncEngine (Core Layer)

The `SyncEngine` manages the Yjs document which provides CRDT-based data structures:

- `Y.Text` - Text content with collaborative editing
- `Y.Array` - Array data structure
- `Y.Map` - Map data structure
- `Awareness` - User presence and cursor tracking

### 2. PersistenceManager (Persistence Layer)

The `PersistenceManager` handles local data storage using IndexedDB:

- Automatic persistence of Yjs document
- Fast local data access
- Offline data availability
- Sync status tracking

### 3. NetworkManager (Network Layer)

The `NetworkManager` manages real-time synchronization via PartyKit:

- WebSocket connection management
- Automatic reconnection
- Sync state tracking
- Network event handling

### 4. React Integration

The React layer provides:

- `useLocalFirst` - Main hook for SDK initialization
- `useSyncState` - Hook for sync state
- `useUserPresence` - Hook for user presence

### 5. UI Components

Pre-built components for common use cases:

- `Editor` - Collaborative text editor
- `SyncStatus` - Sync status indicator

## Data Flow

```
User Action
    ↓
Local Update (Yjs)
    ↓
IndexedDB Persistence
    ↓
Network Sync (PartyKit)
    ↓
Server
    ↓
Other Clients
```

## State Management

The SDK manages three types of state:

1. **Document State**: The actual data being synchronized
2. **Sync State**: Connection and synchronization status
3. **Presence State**: User information and cursor positions

## Conflict Resolution

The SDK uses CRDT (Conflict-free Replicated Data Types) through Yjs:

- Automatic conflict resolution
- No manual merge needed
- Consistent state across all clients
- Offline edits merge seamlessly

## Offline Support

When offline:

1. Local operations continue to work
2. Changes are stored in IndexedDB
3. Sync status shows "offline"
4. When connection restores, changes sync automatically

## Performance Optimizations

- Local-first approach for instant updates
- Efficient CRDT operations
- IndexedDB for fast local storage
- Optimized network sync with state vectors
