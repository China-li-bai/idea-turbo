import type { LanguageModel, Tool } from 'ai';

export interface AgentConfig {
  id: string;
  name: string;
  emoji?: string;
  role?: string;
  model: LanguageModel;
  instructions: string;
  tools?: Record<string, Tool>;
  color?: string;
}

export interface AgentResult {
  content: string;
}

export interface StreamChunk {
  type: 'text';
  text: string;
}

export interface Agent {
  readonly id: string;
  readonly name: string;
  readonly emoji: string;
  readonly role: string;
  readonly color: string;

  generate(prompt: string): Promise<AgentResult>;

  stream(prompt: string): AsyncGenerator<StreamChunk>;
}

export type CrewMode = 'parallel' | 'sequential';

export interface CrewConfig {
  agents: Agent[];
  mode?: CrewMode;
}

export type CrewEvent =
  | { type: 'crew_start'; question: string }
  | { type: 'agent_start'; agent: Agent }
  | { type: 'agent_chunk'; agent: Agent; text: string }
  | { type: 'agent_done'; agent: Agent }
  | { type: 'crew_done' };

export interface CrewResult {
  agent: Agent;
  content: string;
}
