/**
 * 模拟信令服务器 - 用于本地测试
 * 在内存中模拟多个客户端之间的消息传递
 */
import type { SignalEnvelope } from "../types";

export default class MockSignalingServer {
  private rooms: Map<string, Set<string>> = new Map();
  private clients: Map<string, {
    send: (msg: SignalEnvelope) => void;
    roomId: string;
  }> = new Map();

  // 模拟客户端连接
  connectClient(clientId: string, roomId: string, sendCallback: (msg: SignalEnvelope) => void): void {
    console.log(`🔗 Mock server: Client ${clientId} connecting to room ${roomId}`);
    
    this.clients.set(clientId, {
      send: sendCallback,
      roomId
    });

    // 添加到房间
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId)!.add(clientId);
    console.log(`📊 Mock server: Room ${roomId} now has ${this.rooms.get(roomId)!.size} clients`);

    // 通知现有客户端有新用户加入
    const joinMsg: SignalEnvelope = {
      type: "join",
      roomId,
      from: clientId,
      to: null,
      payload: null
    };

    this.broadcastToRoom(roomId, joinMsg, clientId);

    // 发送当前房间用户列表给新客户端（延迟一点模拟真实网络）
    setTimeout(() => {
      const peersInRoom = Array.from(this.rooms.get(roomId) || []).filter(id => id !== clientId);
      console.log(`📤 Mock server: Sending ${peersInRoom.length} existing peers to ${clientId}: [${peersInRoom.join(', ')}]`);
      peersInRoom.forEach((peerId, index) => {
        const peerJoinMsg: SignalEnvelope = {
          type: "join",
          roomId,
          from: peerId,
          to: clientId,
          payload: null
        };
        // 稍微错开发送时间，避免消息处理冲突
        setTimeout(() => {
          console.log(`📤 Mock server: Sending join from ${peerId} to ${clientId} (peer ${index + 1}/${peersInRoom.length})`);
          sendCallback(peerJoinMsg);
        }, index * 50);
      });
    }, 100);
  }

  // 发送消息
  sendMessage(clientId: string, msg: SignalEnvelope): void {
    const client = this.clients.get(clientId);
    if (!client) {
      console.warn(`❌ Mock server: Client ${clientId} not found`);
      return;
    }

    console.log(`📨 Mock server: ${msg.type} from ${clientId} to ${msg.to || 'broadcast'}`);

    if (msg.to && msg.to !== clientId) {
      // 点对点消息
      const targetClient = this.clients.get(msg.to);
      if (targetClient) {
        targetClient.send(msg);
      }
    } else {
      // 广播消息
      this.broadcastToRoom(client.roomId, msg, clientId);
    }
  }

  // 断开客户端连接
  disconnectClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    console.log(`🔌 Mock server: Client ${clientId} disconnected from room ${client.roomId}`);

    // 从房间移除
    this.rooms.get(client.roomId)?.delete(clientId);
    
    // 通知其他客户端
    const leaveMsg: SignalEnvelope = {
      type: "leave",
      roomId: client.roomId,
      from: clientId,
      to: null,
      payload: null
    };

    this.broadcastToRoom(client.roomId, leaveMsg, clientId);
    
    // 清理
    this.clients.delete(clientId);
  }

  // 向房间广播消息（排除特定客户端）
  private broadcastToRoom(roomId: string, msg: SignalEnvelope, excludeClientId?: string): void {
    const clientsInRoom = Array.from(this.clients.entries())
      .filter(([_, client]) => client.roomId === roomId)
      .filter(([clientId, _]) => clientId !== excludeClientId);

    console.log(`📡 Broadcast to ${clientsInRoom.length} clients in room ${roomId}, exclude: ${excludeClientId || 'none'}`);
    console.log(`📋 Room ${roomId} clients: [${Array.from(this.rooms.get(roomId) || []).join(', ')}]`);
    
    clientsInRoom.forEach(([clientId, client]) => {
      console.log(`📤 Sending ${msg.type} from ${msg.from} to ${clientId}`);
      client.send(msg);
    });
  }

  // 获取房间状态
  getRoomStatus(): { [roomId: string]: string[] } {
    const status: { [roomId: string]: string[] } = {};
    this.rooms.forEach((clients, roomId) => {
      status[roomId] = Array.from(clients);
    });
    return status;
  }

  // 清理所有连接
  disconnectAll(): void {
    this.clients.clear();
    this.rooms.clear();
    console.log('🗑️ Mock server: All clients disconnected');
  }
}