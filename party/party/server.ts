import type * as Party from "partykit/server";
import { onConnect, type YPartyKitOptions } from "y-partykit";
import type { Doc } from "yjs";
import { encodeStateVector, encodeStateAsUpdate } from "yjs";
import { SINGLETON_ROOM_ID } from "./rooms";

export default class EditorServer implements Party.Server {
  yjsOptions: YPartyKitOptions = {};
  private docState: Map<string, Uint8Array> = new Map();
  private version: number = 0;
  
  constructor(public room: Party.Room) {}

  getOpts() {
    const opts: YPartyKitOptions = {
      persist: { mode: "snapshot" },
      callback: { handler: (doc) => this.handleYDocChange(doc) },
    };
    return opts;
  }

  async onConnect(conn: Party.Connection) {
    await this.updateCount();
    return onConnect(conn, this.room, this.getOpts());
  }

  async onClose(_: Party.Connection) {
    await this.updateCount();
  }

  async onRequest(req: Party.Request) {
    const url = new URL(req.url);
    
    if (req.method === "GET" && url.searchParams.has("state")) {
      const doc = await this.getYDoc();
      if (!doc) {
        return new Response("Document not found", { status: 404 });
      }
      
      const stateVector = encodeStateVector(doc);
      const version = this.version;
      
      return Response.json({
        version,
        state: Array.from(stateVector),
      });
    }
    
    return new Response("Method not allowed", { status: 405 });
  }

  handleYDocChange(doc: Doc) {
    this.version++;
    const stateVector = encodeStateVector(doc);
    this.docState.set(this.room.id, stateVector);
    
    console.log(`Document ${this.room.id} updated to version ${this.version}`);
  }

  private async getYDoc(): Promise<Doc | null> {
    try {
      const opts = this.getOpts();
      const doc = await this.room.storage.get<Doc>("ydoc");
      return doc ?? null;
    } catch {
      return null;
    }
  }

  async updateCount() {
    const count = [...this.room.getConnections()].length;
    await this.room.context.parties.rooms.get(SINGLETON_ROOM_ID).fetch({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room: this.room.id, count }),
    });
  }
}
