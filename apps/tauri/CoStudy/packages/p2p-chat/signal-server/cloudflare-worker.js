// Cloudflare Workers WebSocket 信令服务器
// 保存为 signal-worker.js

const rooms = new Map();

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // WebSocket 升级
    if (request.headers.get("Upgrade") === "websocket") {
      return handleWebSocket(request);
    }
    
    // HTTP 处理
    return new Response("P2P Chat Signal Server", { status: 200 });
  }
};

async function handleWebSocket(request) {
  const url = new URL(request.url);
  const roomId = url.searchParams.get('room') || 'default';
  const clientId = url.searchParams.get('id') || Math.random().toString(36).substr(2, 9);
  
  // 创建 WebSocket 握手
  const { 0: client, 1: server } = new WebSocketPair();
  
  // 初始化房间
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map());
  }
  
  const room = rooms.get(roomId);
  
  // 处理 WebSocket 消息
  server.accept();
  
  // 通知其他客户端有新用户加入
  const joinMessage = {
    type: 'join',
    from: clientId,
    to: null,
    roomId: roomId,
    payload: null,
    timestamp: Date.now()
  };
  
  broadcastToRoom(room, clientId, joinMessage);
  
  // 存储客户端连接
  const clientInfo = {
    id: clientId,
    ws: server,
    lastSeen: Date.now()
  };
  room.set(clientId, clientInfo);
  
  // 发送当前房间用户列表
  const peerList = Array.from(room.keys()).filter(id => id !== clientId);
  const peerListMessage = {
    type: 'peer-list',
    from: 'server',
    to: clientId,
    roomId: roomId,
    payload: { peers: peerList },
    timestamp: Date.now()
  };
  server.send(JSON.stringify(peerListMessage));
  
  // 处理客户端消息
  server.addEventListener('message', (event) => {
    try {
      const message = JSON.parse(event.data);
      
      // 广播消息到房间内的其他客户端
      if (message.to === null || message.to === undefined) {
        // 广播给所有人（除了发送者）
        broadcastToRoom(room, clientId, message);
      } else {
        // 发送给特定用户
        sendToPeer(room, message.to, message);
      }
    } catch (error) {
      console.error('Message parsing error:', error);
    }
  });
  
  // 处理连接关闭
  server.addEventListener('close', () => {
    room.delete(clientId);
    
    // 通知其他客户端用户离开
    const leaveMessage = {
      type: 'leave',
      from: clientId,
      to: null,
      roomId: roomId,
      payload: null,
      timestamp: Date.now()
    };
    broadcastToRoom(room, clientId, leaveMessage);
    
    // 清理空房间
    if (room.size === 0) {
      rooms.delete(roomId);
    }
  });
  
  return client;
}

function broadcastToRoom(room, senderId, message) {
  const messageStr = JSON.stringify(message);
  
  for (const [clientId, clientInfo] of room) {
    if (clientId !== senderId && clientInfo.ws.readyState === WebSocket.OPEN) {
      try {
        clientInfo.ws.send(messageStr);
      } catch (error) {
        console.error(`Failed to send to ${clientId}:`, error);
      }
    }
  }
}

function sendToPeer(room, targetId, message) {
  const targetClient = room.get(targetId);
  if (targetClient && targetClient.ws.readyState === WebSocket.OPEN) {
    try {
      targetClient.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Failed to send to ${targetId}:`, error);
    }
  }
}

class WebSocketPair {
  constructor() {
    this[0] = new WebSocket("wss://placeholder");
    this[1] = new WebSocket("wss://placeholder");
  }
}