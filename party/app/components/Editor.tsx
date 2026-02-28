import { useState, useRef, useEffect } from "react";
import ReactQuill, { Quill } from "react-quill";
import { QuillBinding } from "y-quill";
import useYProvider from "y-partykit/react";
import { IndexeddbPersistence } from "y-indexeddb";
import "react-quill/dist/quill.snow.css";
import styles from "./Editor.module.css";
import QuillCursors from "quill-cursors";

Quill.register("modules/cursors", QuillCursors);

export default function Editor({
  room,
  userColor,
}: {
  room: string;
  userColor: string;
}) {
  const [text, setText] = useState("");
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "offline">("syncing");
  const quill = useRef<ReactQuill>(null);
  const idbPersistence = useRef<IndexeddbPersistence | null>(null);

  const provider = useYProvider({
    room,
  });

  useEffect(() => {
    const ytext = provider.doc.getText("quill");
    const editor = quill.current!.getEditor();
    const binding = new QuillBinding(ytext, editor, provider.awareness);
    provider.awareness.setLocalStateField("user", {
      name: "Typing...",
      color: userColor,
    });

    idbPersistence.current = new IndexeddbPersistence(
      `editor-${room}`,
      provider.doc
    );

    if (idbPersistence.current) {
      idbPersistence.current.on("synced", () => {
        console.log("Data synced from IndexedDB");
        setSyncStatus("synced");
      });
    }

    const handleStatusChange = (status: "connected" | "disconnected") => {
      setSyncStatus(status === "connected" ? "synced" : "offline");
    };

    if (provider.ws) {
      provider.ws.addEventListener("open", () => handleStatusChange("connected"));
      provider.ws.addEventListener("close", () => handleStatusChange("disconnected"));
      provider.ws.addEventListener("error", () => handleStatusChange("disconnected"));
    }

    return () => {
      binding.destroy();
      idbPersistence.current?.destroy();
    };
  }, [userColor, provider, quill, room]);

  return (
    <div className={styles.editor}>
      <h1>
        Editor <code>Room #{room}</code>
      </h1>
      <div className={styles.status}>
        <span className={`${styles.statusIndicator} ${styles[syncStatus]}`}>
          {syncStatus === "synced" && "✓ 已同步"}
          {syncStatus === "syncing" && "⟳ 同步中..."}
          {syncStatus === "offline" && "⚠ 离线模式"}
        </span>
      </div>
      <ReactQuill
        ref={quill}
        theme="snow"
        className={styles.quill}
        value={text}
        onChange={setText}
        modules={{ cursors: true }}
      />
    </div>
  );
}
