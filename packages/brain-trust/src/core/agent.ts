import { generateText, streamText } from 'ai';
import type { AgentConfig, Agent, StreamChunk, AgentResult } from './types.js';

export function createAgent(config: AgentConfig): Agent {
  return {
    id: config.id,
    name: config.name,
    emoji: config.emoji ?? '🤖',
    role: config.role ?? 'Expert',
    color: config.color ?? '#6366f1',

    async generate(prompt: string): Promise<AgentResult> {
      const result = await generateText({
        model: config.model,
        system: config.instructions,
        prompt,
        tools: config.tools,
      });
      return { content: result.text };
    },

    async *stream(prompt: string): AsyncGenerator<StreamChunk> {
      const result = await streamText({
        model: config.model,
        system: config.instructions,
        prompt,
        tools: config.tools,
      });
      for await (const text of result.textStream) {
        yield { type: 'text', text };
      }
    },
  };
}
