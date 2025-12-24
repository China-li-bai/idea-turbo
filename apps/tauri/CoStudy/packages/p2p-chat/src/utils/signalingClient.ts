import { SignalEnvelope } from "../types";

type Handlers = {
  onOpen?: () => void;
  onMessage?: (msg: SignalEnvelope) => void;
  onClose?: () => void;
  onError?: (err: any) => void;
};

export default class SignalingClient {
  ws: WebSocket | null = null;
  url: string | null = null;
  roomId: string;
  peerId: string;
  handlers: Handlers;

  constructor(url: string | null, roomId: string, peerId: string, handlers: Handlers = {}) {
    this.url = url;
    this.roomId = roomId;
    this.peerId = peerId;
    this.handlers = handlers;
    if (url) this.connect();
  }

  connect() {
    if (!this.url) return;
    // 添加房间ID和用户ID到URL参数中
    const wsUrl = `${this.url}?room=${encodeURIComponent(this.roomId)}&id=${encodeURIComponent(this.peerId)}`;
    this.ws = new WebSocket(wsUrl);
    this.ws.addEventListener("open", () => {
      this.handlers.onOpen?.();
      // immediately announce join
      const joinMsg: SignalEnvelope = { type: "join", roomId: this.roomId, from: this.peerId, to: null, payload: null };
      this.send(joinMsg);
    });
    this.ws.addEventListener("message", (ev) => {
      try {
        const msg = JSON.parse(ev.data) as SignalEnvelope;
        // ignore messages from self if server echoes
        if (msg.from === this.peerId) return;
        // only pass messages that match room
        if (msg.roomId === this.roomId) this.handlers.onMessage?.(msg);
      } catch (e) {
        console.warn("Bad signaling message", e);
      }
    });
    this.ws.addEventListener("close", () => this.handlers.onClose?.());
    this.ws.addEventListener("error", (err) => this.handlers.onError?.(err));
  }

  send(msg: SignalEnvelope) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // If no ws, we silently ignore (caller should handle manual fallback)
      console.warn("Signaling not open, cannot send", msg);
      return;
    }
    this.ws.send(JSON.stringify(msg));
  }

  close() {
    this.ws?.close();
    this.ws = null;
  }
}
