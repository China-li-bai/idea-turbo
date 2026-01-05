import { useState, useEffect } from 'react';
import { useQuery, useOptimisticMutation, createSyncManager, type SyncMode } from '@idea-turbo/local-first';
import { todoSchema, type Todo } from '@idea-turbo/local-first';

function App() {
  const [input, setInput] = useState('');
  const [syncManager, setSyncManager] = useState<ReturnType<typeof createSyncManager> | null>(null);
  const [syncMode, setSyncMode] = useState<SyncMode>('full');

  const initSyncManager = async (mode: SyncMode) => {
    try {
      if (syncManager) {
        await syncManager.disconnect();
      }

      const manager = createSyncManager({
        projectId: 'your-project-id',
        partykitHost: window.location.hostname + ':1999',
        partykitRoom: 'idea-turbo-sync',
        storage: 'indexeddb',
        schema: todoSchema,
        syncMode: mode,
      });

      await manager.connect();
      setSyncManager(manager);
      setSyncMode(mode);
    } catch (error) {
      console.error('Error initializing sync manager:', error);
    }
  };

  useEffect(() => {
    initSyncManager('full');

    return () => {
      if (syncManager) {
        syncManager.disconnect();
      }
    };
  }, []);

  const handleSyncModeChange = async (mode: SyncMode) => {
    await initSyncManager(mode);
  };

  const db = syncManager?.getDB();
  const { data: todos, loading, error } = useQuery<Todo>(db!, 'todos');
  const { mutate: insertTodo, loading: inserting } = useOptimisticMutation<Todo>(db!, 'todos', 'insert');

  const addTodo = async () => {
    if (!input.trim()) return;

    try {
      await insertTodo({
        title: input,
        completed: false,
      });
      setInput('');
    } catch (error) {
      console.error('Error adding todo:', error);
    }
  };

  const toggleTodo = async (id: string) => {
    if (!db) return;

    const todo = todos.find((t: Todo) => t.id === id);
    if (!todo) return;

    try {
      await db.update('todos', id, {
        completed: !todo.completed,
      });
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };

  const deleteTodo = async (id: string) => {
    if (!db) return;

    try {
      await db.delete('todos', id);
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <h1>Local-First Todo App with Sync</h1>

      <div className="sync-mode-selector">
        <label>Sync Mode:</label>
        <select value={syncMode} onChange={(e) => handleSyncModeChange(e.target.value as SyncMode)}>
          <option value="full">Full Sync (双向同步)</option>
          <option value="local-only">Local Only (仅本地)</option>
          <option value="push-only">Push Only (仅推送)</option>
          <option value="pull-only">Pull Only (仅拉取)</option>
        </select>
      </div>

      <div className="todo-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addTodo()}
          placeholder="Add a new todo..."
          disabled={inserting}
        />
        <button onClick={addTodo} disabled={inserting}>
          {inserting ? 'Adding...' : 'Add'}
        </button>
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
        <p><strong>Optimistic UI:</strong> Yes - instant feedback</p>
      </div>
    </div>
  );
}

export default App;
