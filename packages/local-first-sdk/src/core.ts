import * as Y from "yjs";

export class SyncEngine {
  private doc: Y.Doc;

  constructor() {
    this.doc = new Y.Doc();
  }

  getDocument(): Y.Doc {
    return this.doc;
  }

  getText(name: string = "default"): Y.Text {
    return this.doc.getText(name);
  }

  getArray<T>(name: string): Y.Array<T> {
    return this.doc.getArray(name);
  }

  getMap<T>(name: string): Y.Map<T> {
    return this.doc.getMap(name);
  }

  destroy(): void {
    this.doc.destroy();
  }

  onStateChange(callback: (doc: Y.Doc) => void): () => void {
    const handler = () => callback(this.doc);
    this.doc.on("update", handler);
    return () => this.doc.off("update", handler);
  }
}
