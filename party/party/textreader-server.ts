import type * as Party from "partykit/server";
import { onConnect, type YPartyKitOptions } from "y-partykit";
import type { Doc } from "yjs";
import { encodeStateVector } from "yjs";

export default class TextReaderServer implements Party.Server {
  yjsOptions: YPartyKitOptions = {};
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
    console.log(`[TextReaderServer] Connection established to room ${this.room.id}`);
    return onConnect(conn, this.room, this.getOpts());
  }

  async onClose(_: Party.Connection) {
    console.log(`[TextReaderServer] Connection closed in room ${this.room.id}`);
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
    
    console.log(`[TextReaderServer] Document ${this.room.id} updated to version ${this.version}`);
    
    this.room.broadcast(JSON.stringify({
      type: "doc-update",
      version: this.version,
    }));
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
}
