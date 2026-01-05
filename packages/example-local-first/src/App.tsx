import { useState, useEffect } from 'react';
import { createLocalFirstDB } from '@idea-turbo/local-first';
import PartySocket from 'partysocket';

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

  useEffect(() => {
    async function init() {
      try {
        const db = createLocalFirstDB({
          projectId: 'your-project-id',
          storage: 'indexeddb',
        });

        await db.connect();
        setStatus('Connected to local database');

        const initialTodos = await db.fetchAll('todos');
        setTodos(initialTodos);

        db.subscribe('todos', (data) => {
          setTodos(data);
        });

        const ws = new PartySocket({
          host: 'localhost:1999',
          room: 'idea-turbo-sync',
        });

        ws.addEventListener('open', () => {
          setStatus('Connected to sync server');
        });

        ws.addEventListener('message', (event) => {
          const message = JSON.parse(event.data);
          if (message.type === 'update' && message.collection === 'todos') {
            setTodos(message.data);
          }
        });

        ws.addEventListener('close', () => {
          setStatus('Disconnected from sync server');
        });

      } catch (error) {
        setStatus(`Error: ${error}`);
      }
    }

    init();
  }, []);

  const addTodo = async () => {
    if (!input.trim()) return;

    const newTodo: Todo = {
      id: Date.now().toString(),
      title: input,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const db = createLocalFirstDB({
        projectId: 'your-project-id',
        storage: 'indexeddb',
      });

      await db.insert('todos', newTodo);
      setInput('');
      setStatus('Todo added locally');
    } catch (error) {
      setStatus(`Error adding todo: ${error}`);
    }
  };

  const toggleTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    try {
      const db = createLocalFirstDB({
        projectId: 'your-project-id',
        storage: 'indexeddb',
      });

      await db.update('todos', id, {
        completed: !todo.completed,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      setStatus(`Error updating todo: ${error}`);
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      const db = createLocalFirstDB({
        projectId: 'your-project-id',
        storage: 'indexeddb',
      });

      await db.delete('todos', id);
    } catch (error) {
      setStatus(`Error deleting todo: ${error}`);
    }
  };

  return (
    <div>
      <h1>Local-First Todo App</h1>
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
    </div>
  );
}

export default App;
