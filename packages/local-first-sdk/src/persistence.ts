import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";

export class PersistenceManager {
  private persistence: IndexeddbPersistence | null = null;
  private doc: Y.Doc;

  constructor(doc: Y.Doc) {
    this.doc = doc;
  }

  async enable(name: string): Promise<void> {
    this.persistence = new IndexeddbPersistence(name, this.doc);
    
    return new Promise((resolve, reject) => {
      if (!this.persistence) {
        reject(new Error("Persistence not initialized"));
        return;
      }

      this.persistence.once("synced", () => {
        console.log("Data synced from IndexedDB");
        resolve();
      });

      this.persistence.once("sync", () => {
        console.log("Data loaded from IndexedDB");
        resolve();
      });
    });
  }

  disable(): void {
    this.persistence?.destroy();
    this.persistence = null;
  }

  isSynced(): boolean {
    return this.persistence?.synced ?? false;
  }

  onSync(callback: (isSynced: boolean) => void): () => void {
    if (!this.persistence) {
      return () => {};
    }

    const handler = () => callback(this.persistence?.synced ?? false);
    this.persistence.on("synced", handler);
    this.persistence.on("sync", handler);

    return () => {
      this.persistence?.off("synced", handler);
      this.persistence?.off("sync", handler);
    };
  }

  destroy(): void {
    this.disable();
  }
}
