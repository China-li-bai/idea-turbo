import { useState, useEffect, useCallback } from 'react';
import { createSyncManager, useLocalFirstCollection } from '@idea-turbo/local-first';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

const syncManager = createSyncManager({
  projectId: 'your-project-id',
  partykitHost: 'localhost:1999',
  partykitRoom: 'idea-turbo-sync',
  storage: 'indexeddb',
});

function App() {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('Initializing...');
  const [isConnected, setIsConnected] = useState(false);

  const { data: todos, loading, error } = useLocalFirstCollection<Todo>(
    syncManager.getDatabase(),
    'todos'
  );

  useEffect(() => {
    async function init() {
      try {
        await syncManager.connect();
        setIsConnected(true);
        setStatus('Connected to sync server');
      } catch (error) {
        setStatus(`Error: ${error}`);
        console.error('Error initializing sync manager:', error);
      }
    }

    init();

    return () => {
      syncManager.disconnect();
    };
  }, []);

  const addTodo = useCallback(async () => {
    if (!input.trim()) return;

    try {
      const newTodo: Todo = {
        id: Date.now().toString(),
        title: input,
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await syncManager.insert('todos', newTodo);
      setInput('');
      setStatus('Todo added and synced');
    } catch (error) {
      setStatus(`Error adding todo: ${error}`);
      console.error('Error adding todo:', error);
    }
  }, [input]);

  const toggleTodo = useCallback(async (id: string) => {
    try {
      const todo = todos.find((t: Todo) => t.id === id);
      if (!todo) return;

      await syncManager.update('todos', id, {
        completed: !todo.completed,
        updatedAt: new Date().toISOString(),
      });
      setStatus('Todo updated and synced');
    } catch (error) {
      setStatus(`Error updating todo: ${error}`);
      console.error('Error updating todo:', error);
    }
  }, [todos]);

  const deleteTodo = useCallback(async (id: string) => {
    try {
      await syncManager.delete('todos', id);
      setStatus('Todo deleted and synced');
    } catch (error) {
      setStatus(`Error deleting todo: ${error}`);
      console.error('Error deleting todo:', error);
    }
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <h1>Local-First Todo App with Sync</h1>
      <div className="status">{status}</div>
      <div className="connection-status">
        {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>

      <div className="todo-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTodo()}
          placeholder="Add a new todo..."
        />
        <button onClick={addTodo}>Add</button>
      </div>

      <ul className="todo-list">
        {todos.map((todo: Todo) => (
          <li key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
            />
            <span>{todo.title}</span>
            <button onClick={() => deleteTodo(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>

      <div className="info">
        <h3>Architecture Info</h3>
        <p><strong>Local Database:</strong> IndexedDB (Custom Wrapper)</p>
        <p><strong>Sync Protocol:</strong> PartyKit (WebSocket)</p>
        <p><strong>Conflict Resolution:</strong> Last-Write-Wins (based on updatedAt)</p>
        <p><strong>Offline Support:</strong> Yes - works offline, syncs when reconnected</p>
        <p><strong>State Management:</strong> useSyncExternalStore (database changes trigger UI updates)</p>
      </div>
    </div>
  );
}

export default App;
