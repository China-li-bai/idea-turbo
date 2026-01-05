import type { PartyKitServer } from 'partykit/server';

export default {
  async onConnect(ws, room) {
    ws.send('Welcome to the local-first sync server!');
  },

  async onMessage(ws, room, message) {
    const data = JSON.parse(message);

    switch (data.type) {
      case 'sync':
        await handleSync(room, data.payload);
        break;
      case 'subscribe':
        await handleSubscribe(room, ws, data.payload);
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  },

  async onClose(ws, room) {
    await handleDisconnect(room, ws);
  },
} satisfies PartyKitServer;

async function handleSync(room: any, payload: any) {
  const { collection, operation, data } = payload;

  const state = await room.storage.get(collection);
  const items = state ? JSON.parse(state) : [];

  switch (operation) {
    case 'insert':
      items.push(data);
      break;
    case 'update':
      const index = items.findIndex((item: any) => item.id === data.id);
      if (index !== -1) {
        items[index] = { ...items[index], ...data };
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

  room.broadcast(
    JSON.stringify({
      type: 'update',
      collection,
      data: items,
    })
  );
}

async function handleSubscribe(room: any, ws: any, payload: any) {
  const { collection } = payload;
  const state = await room.storage.get(collection);
  const items = state ? JSON.parse(state) : [];

  ws.send(
    JSON.stringify({
      type: 'initial',
      collection,
      data: items,
    })
  );
}

async function handleDisconnect(room: any, ws: any) {
  console.log('Client disconnected');
}
