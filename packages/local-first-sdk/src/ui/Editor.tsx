import { useRef, useEffect } from "react";
import ReactQuill, { Quill } from "react-quill";
import { QuillBinding } from "y-quill";
import type { LocalFirstSDK } from "../sdk";
import "react-quill/dist/quill.snow.css";
import QuillCursors from "quill-cursors";

Quill.register("modules/cursors", QuillCursors);

interface EditorProps {
  sdk: LocalFirstSDK;
  textName?: string;
  className?: string;
}

export function Editor({ sdk, textName = "default", className = "" }: EditorProps) {
  const quill = useRef<ReactQuill>(null);

  useEffect(() => {
    const ytext = sdk.getEngine().getText(textName);
    const editor = quill.current!.getEditor();
    const binding = new QuillBinding(
      ytext,
      editor,
      sdk.getEngine().getDocument().awareness
    );

    return () => {
      binding.destroy();
    };
  }, [sdk, textName]);

  return (
    <div className={className}>
      <ReactQuill
        ref={quill}
        theme="snow"
        modules={{ cursors: true }}
      />
    </div>
  );
}
