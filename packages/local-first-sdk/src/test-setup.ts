import "fake-indexeddb/auto";

(global as any).WebSocket = class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  protocol: string = "";
  extensions: string = "";
  binaryType: BinaryType = "blob";
  bufferedAmount: number = 0;

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event("open"));
      }
    }, 0);
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {}
  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent("close", { code, reason }));
    }
  }

  dispatchEvent(event: Event): boolean {
    return true;
  }

  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  addEventListener(type: string, listener: EventListener): void {
    if (type === "open") this.onopen = listener as any;
    if (type === "close") this.onclose = listener as any;
    if (type === "error") this.onerror = listener as any;
    if (type === "message") this.onmessage = listener as any;
  }

  removeEventListener(type: string, listener: EventListener): void {
    if (type === "open" && this.onopen === listener) this.onopen = null;
    if (type === "close" && this.onclose === listener) this.onclose = null;
    if (type === "error" && this.onerror === listener) this.onerror = null;
    if (type === "message" && this.onmessage === listener) this.onmessage = null;
  }
};
