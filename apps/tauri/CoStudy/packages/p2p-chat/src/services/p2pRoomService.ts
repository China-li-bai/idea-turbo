import { v4 as uuidv4 } from "uuid";
import SignalingClient from "../utils/signalingClient";
import type { SignalEnvelope, ChatMessage } from "../types";

type PeerMeta = {
  id: string;
  displayName?: string;
  status: "connecting" | "connected" | "disconnected";
  lastSeen: number;
};

type ConnectionEntry = {
  pc: RTCPeerConnection;
  dc: RTCDataChannel | null;
  isInitiator: boolean;
};

type P2PEventHandlers = {
  onPeerJoined?: (peerId: string) => void;
  onPeerLeft?: (peerId: string) => void;
  onConnectionEstablished?: (peerId: string) => void;
  onConnectionClosed?: (peerId: string) => void;
  onMessageReceived?: (message: ChatMessage) => void;
  onStateChanged?: (state: P2PRoomState) => void;
  onError?: (error: Error) => void;
};

type P2PRoomState = {
  roomId: string;
  localId: string;
  peers: Record<string, PeerMeta>;
  connections: Record<string, ConnectionEntry | null>;
  chatLog: ChatMessage[];
  signalingUrl: string | null;
  offerStrategy: "A" | "B";
};

// default ICE servers
const DEFAULT_ICE = [{ urls: "stun:stun.l.google.com:19302" }];

export default class P2PRoomService {
  private roomId: string;
  private localId: string;
  private signalingUrl: string | null;
  private offerStrategy: "A" | "B";
  private maxPeers: number;
  
  private signalingClient: SignalingClient | null = null;
  private connections: Record<string, ConnectionEntry | null> = {};
  private peers: Record<string, PeerMeta> = {};
  private chatLog: ChatMessage[] = [];
  private eventHandlers: P2PEventHandlers = {};
  
  private isDestroyed = false;

  constructor(options: {
    roomId?: string;
    signalingUrl?: string | null;
    offerStrategy?: "A" | "B";
    maxPeers?: number;
  } = {}) {
    this.roomId = options.roomId || '';
    this.localId = uuidv4();
    this.signalingUrl = options.signalingUrl ?? null;
    this.offerStrategy = options.offerStrategy ?? "A";
    this.maxPeers = options.maxPeers || 10;
  }

  // Event handler management
  on<K extends keyof P2PEventHandlers>(event: K, handler: P2PEventHandlers[K]) {
    this.eventHandlers[event] = handler;
    return this;
  }

  off<K extends keyof P2PEventHandlers>(event: K) {
    delete this.eventHandlers[event];
    return this;
  }

  // Get current state
  getState(): P2PRoomState {
    // 包含当前用户在内的所有用户
    const allPeers: Record<string, PeerMeta> = {
      ...this.peers,
      // 添加当前用户到 peer 列表
      [this.localId]: {
        id: this.localId,
        displayName: '我',
        status: "connected", // 当前用户总是已连接状态
        lastSeen: Date.now()
      }
    };

    return {
      roomId: this.roomId,
      localId: this.localId,
      peers: allPeers,
      connections: { ...this.connections },
      chatLog: [...this.chatLog],
      signalingUrl: this.signalingUrl,
      offerStrategy: this.offerStrategy,
    };
  }

  // Set room ID and optionally connect to signaling
  async setRoomId(roomId: string, signalingUrl?: string | null): Promise<void> {
    if (this.isDestroyed) throw new Error('Service has been destroyed');
    
    this.roomId = roomId;
    if (signalingUrl !== undefined) {
      this.signalingUrl = signalingUrl;
    }
    
    await this.initializeSignaling();
    this.notifyStateChange();
  }

  // Initialize signaling client
  private async initializeSignaling(): Promise<void> {
    // Clean up previous connection
    if (this.signalingClient) {
      this.signalingClient.close();
      this.signalingClient = null;
    }
    
    // Initialize signaling client
    if (this.signalingUrl && this.roomId) {
      console.log(`🔗 Connecting to signaling server for room: ${this.roomId}`);
      this.signalingClient = new SignalingClient(this.signalingUrl, this.roomId, this.localId, {
        onMessage: this.handleSignalingMessage.bind(this),
        onOpen: () => {
          console.log('🔗 Signaling connection established');
        },
        onError: (err) => {
          console.error('Signaling error:', err);
          this.eventHandlers.onError?.(new Error(`Signaling error: ${err}`));
        },
      });
    }
  }

  // Handle incoming signaling messages
  private async handleSignalingMessage(msg: SignalEnvelope): Promise<void> {
    console.log('📨 Received signaling message:', msg);
    
    if (msg.type === "join") {
      // someone joined -> register peer and depending on strategy either offer or wait
      const peerId = msg.from;
      if (peerId === this.localId) {
        console.log('🚫 Ignoring join message from self');
        return;
      }
      
      console.log(`👋 New peer joined: ${peerId}, using strategy: ${this.offerStrategy}`);
      this.addPeer(peerId);
      this.eventHandlers.onPeerJoined?.(peerId);
      
      // Strategy A: existing peers create offer to newcomer
      if (this.offerStrategy === "A") {
        // stagger to avoid offer storm
        const delay = Math.random() * 400 + 50;
        console.log(`📤 Will send offer to ${peerId} in ${delay}ms`);
        setTimeout(() => {
          this.createAndSendOffer(peerId);
        }, delay);
      } else {
        // Strategy B: do nothing now; we'll rely on peer-list or newcomer to offer
        console.log('⏸️ Strategy B - waiting for peer-list or newcomer to offer');
      }
    } else if (msg.type === "peer-list") {
      // 接收完整的在线用户列表
      const peerList = msg.payload?.peerList as Record<string, PeerMeta> || {};
      console.log(`📥 Received peer list with ${Object.keys(peerList).length} peers`);
      
      // 更新本地的用户列表
      let hasChanges = false;
      Object.entries(peerList).forEach(([peerId, peerMeta]) => {
        if (peerId === this.localId) return; // 忽略自己
        
        if (!this.peers[peerId]) {
          this.peers[peerId] = { ...peerMeta };
          hasChanges = true;
          console.log(`➕ Added peer from list: ${peerId}`);
        }
      });
      
      // 检查是否有离开的用户
      const currentPeerIds = new Set(Object.keys(peerList));
      Object.keys(this.peers).forEach(peerId => {
        if (!currentPeerIds.has(peerId)) {
          delete this.peers[peerId];
          hasChanges = true;
          console.log(`➖ Removed peer not in list: ${peerId}`);
        }
      });
      
      if (hasChanges) {
        this.notifyStateChange();
      }
    } else if (msg.type === "offer" && msg.to === this.localId) {
      // incoming offer
      const from = msg.from;
      console.log(`📥 Received offer from: ${from}`);
      await this.handleRemoteOffer(from, msg.payload.sdp);
    } else if (msg.type === "answer" && msg.to === this.localId) {
      // incoming answer
      const from = msg.from;
      console.log(`📥 Received answer from: ${from}`);
      await this.handleRemoteAnswer(from, msg.payload.sdp);
    } else if (msg.type === "ice" && msg.to === this.localId) {
      const from = msg.from;
      const candidate = msg.payload?.candidate;
      if (candidate && this.connections[from]?.pc) {
        try {
          await this.connections[from]!.pc.addIceCandidate(candidate);
        } catch (e) {
          console.warn("addIceCandidate err", e);
        }
      }
    } else if (msg.type === "leave") {
      const pid = msg.from;
      this.removePeer(pid);
      this.eventHandlers.onPeerLeft?.(pid);
    }
  }

  // Add peer to tracking (public for testing)
  addPeer(peerId: string): void {
    if (Object.keys(this.peers).length >= this.maxPeers) {
      console.warn(`Max peers (${this.maxPeers}) reached, ignoring new peer: ${peerId}`);
      return;
    }
    
    console.log(`➕ Adding peer: ${peerId}, current peers: ${Object.keys(this.peers).length}`);
    this.peers[peerId] = {
      id: peerId,
      status: "connecting",
      lastSeen: Date.now()
    };
    console.log(`✅ Peer added, total peers: ${Object.keys(this.peers).length}`);
    
    // 广播完整的用户列表，确保所有用户都能看到完整的在线用户列表
    this.broadcastPeerList();
    this.notifyStateChange();
  }

  // 手动触发广播用户列表（用于调试）
  public requestPeerListSync(): void {
    if (!this.signalingClient) {
      console.log('🔄 No signaling client available, cannot request peer list sync');
      return;
    }
    
    // 广播当前用户列表
    this.broadcastPeerList();
    console.log('🔄 Manually triggered peer list sync');
  }

  // Remove peer and cleanup connection
  private removePeer(peerId: string): void {
    delete this.peers[peerId];
    const entry = this.connections[peerId];
    if (entry) {
      try { entry.dc?.close(); } catch {}
      try { entry.pc.close(); } catch {}
      this.connections[peerId] = null;
      delete this.connections[peerId];
    }
    
    // 广播更新后的用户列表
    this.broadcastPeerList();
    
    this.eventHandlers.onConnectionClosed?.(peerId);
    this.notifyStateChange();
  }

  // Create RTCPeerConnection for a peer
  private createPeerConnection(peerId: string, isInitiator: boolean): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: DEFAULT_ICE });
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && this.signalingClient) {
        const signal: SignalEnvelope = {
          type: "ice",
          roomId: this.roomId,
          from: this.localId,
          to: peerId,
          payload: { candidate: event.candidate }
        };
        this.signalingClient.send(signal);
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`🔄 Connection state with ${peerId}:`, pc.connectionState);
      if (pc.connectionState === "connected") {
        this.updatePeerStatus(peerId, "connected");
        this.eventHandlers.onConnectionEstablished?.(peerId);
      } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        this.updatePeerStatus(peerId, "disconnected");
        this.eventHandlers.onConnectionClosed?.(peerId);
      }
    };

    // Create data channel if initiator
    if (isInitiator) {
      const dc = pc.createDataChannel("chat", { ordered: true });
      this.setupDataChannel(peerId, dc);
      this.connections[peerId] = { pc, dc, isInitiator };
    } else {
      this.connections[peerId] = { pc, dc: null, isInitiator };
    }

    // Handle incoming data channel
    pc.ondatachannel = (event) => {
      if (!isInitiator && event.channel.label === "chat") {
        this.setupDataChannel(peerId, event.channel);
        const entry = this.connections[peerId];
        if (entry) {
          entry.dc = event.channel;
        }
      }
    };

    return pc;
  }

  // Setup data channel message handling
  private setupDataChannel(peerId: string, dc: RTCDataChannel): void {
    dc.onopen = () => {
      console.log(`📡 Data channel opened with ${peerId}`);
      this.updatePeerStatus(peerId, "connected");
      this.eventHandlers.onConnectionEstablished?.(peerId);
    };

    dc.onmessage = (event) => {
      try {
        const message: ChatMessage = JSON.parse(event.data);
        this.chatLog.push(message);
        this.eventHandlers.onMessageReceived?.(message);
        this.notifyStateChange();
      } catch (e) {
        console.warn("Failed to parse message:", e);
      }
    };

    dc.onclose = () => {
      console.log(`📡 Data channel closed with ${peerId}`);
      this.updatePeerStatus(peerId, "disconnected");
      this.eventHandlers.onConnectionClosed?.(peerId);
    };

    dc.onerror = (error) => {
      console.error(`Data channel error with ${peerId}:`, error);
      this.eventHandlers.onError?.(new Error(`Data channel error with ${peerId}: ${error}`));
    };
  }

  // Update peer status
  private updatePeerStatus(peerId: string, status: PeerMeta["status"]): void {
    if (this.peers[peerId]) {
      this.peers[peerId].status = status;
      this.peers[peerId].lastSeen = Date.now();
      this.notifyStateChange();
    }
  }

  // Create and send offer to peer
  private async createAndSendOffer(peerId: string): Promise<void> {
    if (this.isDestroyed) return;
    
    try {
      const pc = this.createPeerConnection(peerId, true);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      if (this.signalingClient) {
        const signal: SignalEnvelope = {
          type: "offer",
          roomId: this.roomId,
          from: this.localId,
          to: peerId,
          payload: { sdp: offer }
        };
        this.signalingClient.send(signal);
        console.log(`📤 Sent offer to ${peerId}`);
      }
    } catch (error) {
      console.error(`Failed to create offer for ${peerId}:`, error);
      this.eventHandlers.onError?.(error as Error);
    }
  }

  // Handle remote offer
  private async handleRemoteOffer(peerId: string, sdp: RTCSessionDescriptionInit): Promise<void> {
    if (this.isDestroyed) return;
    
    try {
      const pc = this.createPeerConnection(peerId, false);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      if (this.signalingClient) {
        const signal: SignalEnvelope = {
          type: "answer",
          roomId: this.roomId,
          from: this.localId,
          to: peerId,
          payload: { sdp: answer }
        };
        this.signalingClient.send(signal);
        console.log(`📤 Sent answer to ${peerId}`);
      }
    } catch (error) {
      console.error(`Failed to handle offer from ${peerId}:`, error);
      this.eventHandlers.onError?.(error as Error);
    }
  }

  // Handle remote answer
  private async handleRemoteAnswer(peerId: string, sdp: RTCSessionDescriptionInit): Promise<void> {
    if (this.isDestroyed) return;
    
    try {
      const entry = this.connections[peerId];
      if (entry?.pc) {
        await entry.pc.setRemoteDescription(new RTCSessionDescription(sdp));
        console.log(`✅ Answer processed from ${peerId}`);
      }
    } catch (error) {
      console.error(`Failed to handle answer from ${peerId}:`, error);
      this.eventHandlers.onError?.(error as Error);
    }
  }

  // Send message to all connected peers
  sendMessage(text: string, type: "chat" | "sys" = "chat"): void {
    const message: ChatMessage = {
      type,
      id: uuidv4(),
      from: this.localId,
      text,
      ts: Date.now(),
    };

    // Add to local chat log
    this.chatLog.push(message);
    this.eventHandlers.onMessageReceived?.(message);

    // Send to all connected peers
    Object.entries(this.connections).forEach(([peerId, entry]) => {
      if (entry?.dc?.readyState === "open") {
        try {
          entry.dc.send(JSON.stringify(message));
        } catch (error) {
          console.error(`Failed to send message to ${peerId}:`, error);
        }
      }
    });

    this.notifyStateChange();
  }

  // Manual offer/answer for signaling-free operation
  exportOffer(): { sdp: RTCSessionDescriptionInit } | null {
    // This would be used for manual signaling (copy/paste)
    // Implementation depends on specific requirements
    return null;
  }

  importOffer(_offerData: any): void {
    // This would be used for manual signaling (copy/paste)
    // Implementation depends on specific requirements
  }

  // Broadcast complete peer list to all connected peers
  private broadcastPeerList(): void {
    if (!this.signalingClient) return;
    
    // 构建包含所有用户信息的列表
    const allPeers: Record<string, PeerMeta> = {
      ...this.peers,
      // 添加当前用户到 peer 列表
      [this.localId]: {
        id: this.localId,
        displayName: '我',
        status: "connected",
        lastSeen: Date.now()
      }
    };
    
    // 向所有已连接的节点广播用户列表
    Object.keys(this.peers).forEach(peerId => {
      const signal: SignalEnvelope = {
        type: "peer-list",
        roomId: this.roomId,
        from: this.localId,
        to: peerId,
        payload: { peerList: allPeers }
      };
      
      if (this.signalingClient) {
        this.signalingClient.send(signal);
        console.log(`📤 Sent peer list to ${peerId} with ${Object.keys(allPeers).length} peers`);
      }
    });
  }

  // Notify state change
  private notifyStateChange(): void {
    const currentState = this.getState();
    console.log(`🔄 Notifying state change: ${Object.keys(currentState.peers).length} peers, room: ${currentState.roomId}`);
    this.eventHandlers.onStateChanged?.(currentState);
  }

  // Handle external signaling messages (for mock testing)
  async handleExternalSignalingMessage(msg: SignalEnvelope): Promise<void> {
    if (this.isDestroyed) return;
    
    console.log('📨 Processing external signaling message:', msg, `for ${this.localId}`);
    
    // 只处理发给当前用户或广播的消息
    if (msg.to && msg.to !== this.localId) {
      console.log(`🚫 Message not for this user: to=${msg.to}, localId=${this.localId}`);
      return;
    }
    
    if (msg.type === "join") {
      const peerId = msg.from;
      if (peerId === this.localId) {
        console.log('🚫 Ignoring join message from self');
        return;
      }
      
      console.log(`👋 External: New peer joined: ${peerId}, using strategy: ${this.offerStrategy}`);
      this.addPeer(peerId);
      this.eventHandlers.onPeerJoined?.(peerId);
      
      // Strategy A: existing peers create offer to newcomer
      if (this.offerStrategy === "A") {
        const delay = Math.random() * 400 + 50;
        console.log(`📤 External: Will send offer to ${peerId} in ${delay}ms`);
        setTimeout(() => {
          this.createAndSendOffer(peerId);
        }, delay);
      }
    } else if (msg.type === "leave") {
      const pid = msg.from;
      this.removePeer(pid);
      this.eventHandlers.onPeerLeft?.(pid);
    }
  }

  // Destroy service and cleanup
  destroy(): void {
    if (this.isDestroyed) return;
    
    this.isDestroyed = true;
    
    // Close all connections
    Object.values(this.connections).forEach(entry => {
      if (entry) {
        try { entry.dc?.close(); } catch {}
        try { entry.pc.close(); } catch {}
      }
    });
    
    // Close signaling client
    if (this.signalingClient) {
      this.signalingClient.close();
      this.signalingClient = null;
    }
    
    // Clear data
    this.connections = {};
    this.peers = {};
    this.chatLog = [];
    this.eventHandlers = {};
    
    console.log('🗑️ P2PRoomService destroyed');
  }
}