// 简单的 Node.js WebSocket 信令服务器
// 依赖: npm install ws

const WebSocket = require('ws');
const http = require('http');

// 创建 HTTP 服务器
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('P2P Chat Signal Server Running');
});

// 创建 WebSocket 服务器
const wss = new WebSocket.Server({ server });

// 房间管理
const rooms = new Map();

// 广播消息到房间
function broadcastToRoom(roomId, senderId, message) {
  const room = rooms.get(roomId);
  if (!room) {
    console.log(`❌ Room ${roomId} not found for broadcast`);
    return;
  }

  const messageStr = JSON.stringify(message);
  const recipientCount = room.size - (room.has(senderId) ? 1 : 0);
  
  console.log(`📡 Broadcasting to ${recipientCount} clients in room ${roomId}`);
  
  room.forEach((clientInfo, clientId) => {
    if (clientId !== senderId && clientInfo.ws.readyState === WebSocket.OPEN) {
      try {
        clientInfo.ws.send(messageStr);
      } catch (error) {
        console.error(`❌ Failed to send to ${clientId}:`, error);
      }
    }
  });
}

// 发送给特定用户
function sendToPeer(roomId, targetId, message) {
  const room = rooms.get(roomId);
  if (!room) return;

  const targetClient = room.get(targetId);
  if (targetClient && targetClient.ws.readyState === WebSocket.OPEN) {
    try {
      targetClient.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Failed to send to ${targetId}:`, error);
    }
  }
}

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const roomId = url.searchParams.get('room') || 'default';
  const clientId = url.searchParams.get('id') || Math.random().toString(36).substr(2, 9);

  console.log(`🔗 New client ${clientId} joined room ${roomId} from ${req.socket.remoteAddress}`);

  // 初始化房间
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map());
  }

  const room = rooms.get(roomId);

  // 存储客户端信息
  const clientInfo = {
    id: clientId,
    ws: ws,
    lastSeen: Date.now()
  };
  room.set(clientId, clientInfo);

  // 通知其他客户端有新用户加入
  const joinMessage = {
    type: 'join',
    from: clientId,
    to: null,
    roomId: roomId,
    payload: null,
    timestamp: Date.now()
  };
  broadcastToRoom(roomId, clientId, joinMessage);

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
  ws.send(JSON.stringify(peerListMessage));

  // 处理客户端消息
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      // 添加房间信息（如果客户端没有发送）
      if (!message.roomId) {
        message.roomId = roomId;
      }

      console.log(`📨 Message from ${clientId}:`, message);

      if (message.to === null || message.to === undefined) {
        // 广播给所有人（除了发送者）
        broadcastToRoom(roomId, clientId, message);
      } else {
        // 发送给特定用户
        sendToPeer(roomId, message.to, message);
      }
    } catch (error) {
      console.error('❌ Message parsing error:', error);
    }
  });

  // 处理连接关闭
  ws.on('close', () => {
    console.log(`Client ${clientId} left room ${roomId}`);
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
    broadcastToRoom(roomId, clientId, leaveMessage);

    // 清理空房间
    if (room.size === 0) {
      rooms.delete(roomId);
      console.log(`Room ${roomId} deleted (empty)`);
    }
  });

  // 处理错误
  ws.on('error', (error) => {
    console.error(`WebSocket error for client ${clientId}:`, error);
  });
});

// 定期清理断开的连接
setInterval(() => {
  rooms.forEach((room, roomId) => {
    const disconnectedClients = [];
    
    room.forEach((clientInfo, clientId) => {
      if (clientInfo.ws.readyState === WebSocket.CLOSED || 
          clientInfo.ws.readyState === WebSocket.CLOSING) {
        disconnectedClients.push(clientId);
      }
    });

    disconnectedClients.forEach(clientId => {
      room.delete(clientId);
      console.log(`Cleaned up disconnected client ${clientId} from room ${roomId}`);
    });

    // 如果房间为空，删除房间
    if (room.size === 0) {
      rooms.delete(roomId);
    }
  });
}, 30000); // 每30秒清理一次

// 启动服务器
const PORT = process.env.PORT || 8081;
server.listen(PORT, () => {
  console.log(`P2P Chat Signal Server running on port ${PORT}`);
  console.log(`WebSocket URL: ws://localhost:${PORT}/?room=<roomId>&id=<clientId>`);
});