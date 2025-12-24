export type SignalEnvelope = {
  type: string;        // "join" | "offer" | "answer" | "ice" | "leave" | "peer-list"
  roomId: string;
  from: string;
  to?: string | null;  // null == broadcast
  payload?: any;
};
export type ChatMessage = {
  type: "chat" | "sys";
  id: string;
  from: string;
  text?: string;
  ts: number;
  sub?: string;
};
