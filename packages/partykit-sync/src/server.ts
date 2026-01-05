import type { PartyKitServer } from 'partykit/server';

export interface SyncMessage {
  type: 'sync' | 'subscribe' | 'update' | 'initial' | 'ack';
  collection: string;
  operation?: 'insert' | 'update' | 'delete';
  data?: any;
  timestamp?: string;
  clientId?: string;
}

export default {
  async onConnect(ws, room) {
    console.log(`[PartyKit] Client connected to room: ${room.id}`);
    ws.send(JSON.stringify({
      type: 'welcome',
      message: 'Connected to local-first sync server',
    }));
  },

  async onMessage(message: string | ArrayBuffer | ArrayBufferView<ArrayBufferLike>, ws, room) {
    try {
      const messageString = typeof message === 'string' ? message : new TextDecoder().decode(message);
      const data: SyncMessage = JSON.parse(messageString);
      await handleMessage(room, ws, data);
    } catch (error) {
      console.error('[PartyKit] Error handling message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
      }));
    }
  },

  async onClose(ws, room) {
    console.log(`[PartyKit] Client disconnected from room: ${room.id}`);
  },
} satisfies PartyKitServer;

async function handleMessage(room: any, ws: any, message: SyncMessage) {
  switch (message.type) {
    case 'sync':
      await handleSync(room, ws, message);
      break;
    case 'subscribe':
      await handleSubscribe(room, ws, message);
      break;
    default:
      console.log('[PartyKit] Unknown message type:', message.type);
  }
}

async function handleSync(room: any, ws: any, message: SyncMessage) {
  const { collection, operation, data, clientId } = message;

  if (!collection || !operation || !data) {
    console.warn('[PartyKit] Invalid sync message:', message);
    return;
  }

  const state = await room.storage.get(collection);
  const items = state ? JSON.parse(state) : [];

  switch (operation) {
    case 'insert':
      const existingIndex = items.findIndex((item: any) => item.id === data.id);
      if (existingIndex === -1) {
        items.push(data);
      } else {
        items[existingIndex] = mergeItems(items[existingIndex], data);
      }
      break;

    case 'update':
      const updateIndex = items.findIndex((item: any) => item.id === data.id);
      if (updateIndex !== -1) {
        items[updateIndex] = mergeItems(items[updateIndex], data);
      } else {
        items.push(data);
      }
      break;

    case 'delete':
      const deleteIndex = items.findIndex((item: any) => item.id === data.id);
      if (deleteIndex !== -1) {
        items.splice(deleteIndex, 1);
      }
      break;
  }

  await room.storage.put(collection, JSON.stringify(items));

  const updateMessage: SyncMessage = {
    type: 'update',
    collection,
    data: items,
  };

  room.broadcast(JSON.stringify(updateMessage));

  if (clientId) {
    ws.send(JSON.stringify({
      type: 'ack',
      collection,
      data,
    }));
  }
}

async function handleSubscribe(room: any, ws: any, message: SyncMessage) {
  const { collection } = message;

  if (!collection) {
    console.warn('[PartyKit] Invalid subscribe message:', message);
    return;
  }

  const state = await room.storage.get(collection);
  const items = state ? JSON.parse(state) : [];

  const initialMessage: SyncMessage = {
    type: 'initial',
    collection,
    data: items,
  };

  ws.send(JSON.stringify(initialMessage));
}

function mergeItems(existing: any, incoming: any): any {
  const existingTimestamp = new Date(existing.updatedAt || 0).getTime();
  const incomingTimestamp = new Date(incoming.updatedAt || 0).getTime();

  if (incomingTimestamp > existingTimestamp) {
    return { ...existing, ...incoming };
  }

  return { ...incoming, ...existing };
}
