import "./styles.css";
import { createRoot } from "react-dom/client";
import { useState, useMemo } from "react";
import Lobby from "./components/Lobby";
import Editor from "./components/Editor";
import { TextReader } from "./components/TextReader";

function getRandomColor() {
  const colors = ["red", "orange", "yellow", "green", "blue", "purple", "pink"];
  return colors[Math.floor(Math.random() * colors.length)];
}

type AppMode = 'editor' | 'reader';

function App() {
  const [currentRoom, setCurrentRoom] = useState("default");
  const [mode, setMode] = useState<AppMode>('reader');
  const userColor = useMemo(() => getRandomColor(), []);

  return (
    <main>
      <div className="app-header">
        <div className="mode-switcher">
          <button
            className={`mode-button ${mode === 'reader' ? 'active' : ''}`}
            onClick={() => setMode('reader')}
          >
            📖 文本阅读器
          </button>
          <button
            className={`mode-button ${mode === 'editor' ? 'active' : ''}`}
            onClick={() => setMode('editor')}
          >
            ✏️ 协作编辑器
          </button>
        </div>
      </div>

      {mode === 'reader' ? (
        <TextReader room={currentRoom} key={currentRoom} />
      ) : (
        <>
          <Editor room={currentRoom} userColor={userColor} key={currentRoom} />
          <Lobby currentRoom={currentRoom} setCurrentRoom={setCurrentRoom} />
        </>
      )}
    </main>
  );
}

createRoot(document.getElementById("app")!).render(<App />);
