import React, { useEffect, useRef, useState } from "react";
import { createLocalFirst } from "../src/index";

export function BasicTextEditor() {
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("disconnected");
  const sdkRef = useRef<any>(null);
  const textRef = useRef<any>(null);

  useEffect(() => {
    const sdk = createLocalFirst({
      room: "react-editor-room",
      host: "localhost:1999",
      onStatusChange: (newStatus) => {
        setStatus(newStatus);
      },
    });

    sdkRef.current = sdk;

    const text = sdk.getText("content");
    textRef.current = text;

    const observer = () => {
      setContent(text.toString());
    };

    text.observe(observer);
    sdk.connect();

    return () => {
      text.unobserve(observer);
      sdk.destroy();
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setContent(newText);
    textRef.current?.delete(0, textRef.current.length);
    textRef.current?.insert(0, newText);
  };

  return (
    <div>
      <h2>Basic Text Editor</h2>
      <div>Status: {status}</div>
      <textarea
        value={content}
        onChange={handleChange}
        rows={10}
        cols={50}
      />
    </div>
  );
}

export function TodoList() {
  const [todos, setTodos] = useState<Array<{ text: string; done: boolean }>>([]);
  const [newTodo, setNewTodo] = useState("");
  const sdkRef = useRef<any>(null);
  const todosRef = useRef<any>(null);

  useEffect(() => {
    const sdk = createLocalFirst({
      room: "react-todo-room",
    });

    sdkRef.current = sdk;

    const todosArray = sdk.getArray<{ text: string; done: boolean }>("todos");
    todosRef.current = todosArray;

    const observer = () => {
      setTodos(todosArray.toArray());
    };

    todosArray.observe(observer);
    sdk.connect();

    return () => {
      todosArray.unobserve(observer);
      sdk.destroy();
    };
  }, []);

  const handleAddTodo = () => {
    if (newTodo.trim()) {
      todosRef.current?.push([{ text: newTodo, done: false }]);
      setNewTodo("");
    }
  };

  const handleToggleTodo = (index: number) => {
    const todo = todosRef.current?.get(index);
    if (todo) {
      todosRef.current?.delete(index);
      todosRef.current?.insert(index, { ...todo, done: !todo.done });
    }
  };

  const handleDeleteTodo = (index: number) => {
    todosRef.current?.delete(index);
  };

  return (
    <div>
      <h2>Collaborative Todo List</h2>
      <div>
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="Add a new todo"
        />
        <button onClick={handleAddTodo}>Add</button>
      </div>
      <ul>
        {todos.map((todo, index) => (
          <li key={index}>
            <input
              type="checkbox"
              checked={todo.done}
              onChange={() => handleToggleTodo(index)}
            />
            <span style={{ textDecoration: todo.done ? "line-through" : "none" }}>
              {todo.text}
            </span>
            <button onClick={() => handleDeleteTodo(index)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StateMonitor() {
  const [state, setState] = useState({
    isOnline: true,
    isSynced: false,
    syncStatus: "disconnected" as any,
    lastSyncTime: null as Date | null,
  });
  const sdkRef = useRef<any>(null);

  useEffect(() => {
    const sdk = createLocalFirst({
      room: "react-state-room",
    });

    sdkRef.current = sdk;

    const handleStateChange = (newState: any) => {
      setState(newState);
    };

    sdk.onStateChange(handleStateChange);
    sdk.connect();

    return () => {
      sdk.offStateChange(handleStateChange);
      sdk.destroy();
    };
  }, []);

  return (
    <div>
      <h2>State Monitor</h2>
      <div>
        <div>Online: {state.isOnline ? "Yes" : "No"}</div>
        <div>Synced: {state.isSynced ? "Yes" : "No"}</div>
        <div>Sync Status: {state.syncStatus}</div>
        <div>
          Last Sync: {state.lastSyncTime ? state.lastSyncTime.toLocaleString() : "Never"}
        </div>
      </div>
    </div>
  );
}

export function UserAwareness() {
  const [users, setUsers] = useState<Array<any>>([]);
  const [currentUser, setCurrentUser] = useState({
    name: "User " + Math.floor(Math.random() * 1000),
    color: "#" + Math.floor(Math.random() * 16777215).toString(16),
  });
  const sdkRef = useRef<any>(null);

  useEffect(() => {
    const sdk = createLocalFirst({
      room: "react-awareness-room",
    });

    sdkRef.current = sdk;

    sdk.awareness.setLocalStateField("user", currentUser);

    const handleAwarenessChange = () => {
      const states = Array.from(sdk.awareness.getStates().values());
      setUsers(states);
    };

    sdk.awareness.on("change", handleAwarenessChange);
    sdk.connect();

    return () => {
      sdk.awareness.off("change", handleAwarenessChange);
      sdk.destroy();
    };
  }, [currentUser]);

  return (
    <div>
      <h2>User Awareness</h2>
      <div>
        <h3>Current User</h3>
        <div>Name: {currentUser.name}</div>
        <div>Color: <span style={{ color: currentUser.color }}>{currentUser.color}</span></div>
      </div>
      <div>
        <h3>Online Users ({users.length})</h3>
        <ul>
          {users.map((user, index) => (
            <li key={index} style={{ color: user.user?.color }}>
              {user.user?.name || "Anonymous"}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function ManualConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState("disconnected");
  const sdkRef = useRef<any>(null);

  useEffect(() => {
    const sdk = createLocalFirst({
      room: "react-manual-room",
      autoConnect: false,
      onStatusChange: (newStatus) => {
        setStatus(newStatus);
        setIsConnected(newStatus === "connected" || newStatus === "synced");
      },
    });

    sdkRef.current = sdk;

    return () => {
      sdk.destroy();
    };
  }, []);

  const handleConnect = () => {
    sdkRef.current?.connect();
  };

  const handleDisconnect = () => {
    sdkRef.current?.disconnect();
  };

  return (
    <div>
      <h2>Manual Connection Control</h2>
      <div>
        <div>Status: {status}</div>
        <div>Connected: {isConnected ? "Yes" : "No"}</div>
      </div>
      <div>
        <button onClick={handleConnect} disabled={isConnected}>
          Connect
        </button>
        <button onClick={handleDisconnect} disabled={!isConnected}>
          Disconnect
        </button>
      </div>
    </div>
  );
}

export function ErrorHandling() {
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState("disconnected");
  const sdkRef = useRef<any>(null);

  useEffect(() => {
    const sdk = createLocalFirst({
      room: "react-error-room",
      onError: (error) => {
        setErrors((prev) => [...prev, error.message]);
      },
      onStatusChange: (newStatus) => {
        setStatus(newStatus);
      },
    });

    sdkRef.current = sdk;
    sdk.connect();

    return () => {
      sdk.destroy();
    };
  }, []);

  return (
    <div>
      <h2>Error Handling</h2>
      <div>
        <div>Status: {status}</div>
      </div>
      <div>
        <h3>Errors</h3>
        {errors.length === 0 ? (
          <div>No errors</div>
        ) : (
          <ul>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function App() {
  return (
    <div>
      <h1>Local-First SDK React Examples</h1>
      <div style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "20px" }}>
        <BasicTextEditor />
      </div>
      <div style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "20px" }}>
        <TodoList />
      </div>
      <div style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "20px" }}>
        <StateMonitor />
      </div>
      <div style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "20px" }}>
        <UserAwareness />
      </div>
      <div style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "20px" }}>
        <ManualConnection />
      </div>
      <div style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "20px" }}>
        <ErrorHandling />
      </div>
    </div>
  );
}
