import { defineConfig } from '@triplit/client';

export const schema = defineConfig({
  collections: {
    todos: {
      schema: {
        id: { type: 'string', primary: true },
        title: { type: 'string' },
        completed: { type: 'boolean' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },
    users: {
      schema: {
        id: { type: 'string', primary: true },
        name: { type: 'string' },
        email: { type: 'string' },
      },
    },
  },
});

export type Schema = typeof schema;
