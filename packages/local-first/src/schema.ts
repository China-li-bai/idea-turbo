import { defineSchema } from './schema-manager';

export const todoSchema = defineSchema({
  todos: {
    id: {
      type: 'string',
      required: true,
      default: () => Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
    },
    title: {
      type: 'string',
      required: true,
    },
    completed: {
      type: 'boolean',
      required: true,
      default: false,
    },
    createdAt: {
      type: 'date',
      required: true,
      default: () => new Date().toISOString(),
    },
    updatedAt: {
      type: 'date',
      required: true,
      default: () => new Date().toISOString(),
    },
  },
  users: {
    id: {
      type: 'string',
      required: true,
      default: () => Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
    },
    name: {
      type: 'string',
      required: true,
    },
    email: {
      type: 'string',
      required: true,
      validate: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    },
    createdAt: {
      type: 'date',
      required: true,
      default: () => new Date().toISOString(),
    },
  },
}, '1.0.0');

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}
