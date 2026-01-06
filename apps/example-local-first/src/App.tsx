import { useState, useEffect } from 'react';
import { createSyncManager, SyncManager } from '@idea-turbo/local-first';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('Initializing...');
  const [syncManager, setSyncManager] = useState<SyncManager | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const manager = createSyncManager({
          projectId: 'your-project-id',
          partykitHost: '192.168.0.101:1999',
          partykitRoom: 'idea-turbo-sync',
          storage: 'indexeddb',
        });

        await manager.connect();
        setSyncManager(manager);
        setStatus('Connected to sync server');

        const initialTodos = await manager.fetchAll('todos');
        setTodos(initialTodos);

        manager.subscribe('todos', (data) => {
          setTodos(data);
        });

      } catch (error) {
        setStatus(`Error: ${error}`);
        console.error('Error initializing sync manager:', error);
      }
    }

    init();

    return () => {
      if (syncManager) {
        syncManager.disconnect();
      }
    };
  }, []);

  const addTodo = async () => {
    if (!input.trim() || !syncManager) return;

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
  };

  const toggleTodo = async (id: string) => {
    if (!syncManager) return;

    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    try {
      await syncManager.update('todos', id, {
        completed: !todo.completed,
        updatedAt: new Date().toISOString(),
      });
      setStatus('Todo updated and synced');
    } catch (error) {
      setStatus(`Error updating todo: ${error}`);
      console.error('Error updating todo:', error);
    }
  };

  const deleteTodo = async (id: string) => {
    if (!syncManager) return;

    try {
      await syncManager.delete('todos', id);
      setStatus('Todo deleted and synced');
    } catch (error) {
      setStatus(`Error deleting todo: ${error}`);
      console.error('Error deleting todo:', error);
    }
  };

  return (
    <div>
      <h1>Local-First Todo App with Sync</h1>
      <div className="status">{status}</div>

      <div className="todo-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addTodo()}
          placeholder="Add a new todo..."
        />
        <button onClick={addTodo}>Add</button>
      </div>

      <ul className="todo-list">
        {todos.map((todo) => (
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
      </div>
    </div>
  );
}

export default App;
