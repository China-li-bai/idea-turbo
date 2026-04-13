import type { Agent, CrewConfig, CrewEvent, CrewMode } from './types';

export class WisdomCrew {
  private readonly agents: Agent[];
  private readonly mode: CrewMode;

  constructor(config: CrewConfig) {
    this.agents = config.agents;
    this.mode = config.mode ?? 'parallel';
  }

  get agentsList(): ReadonlyArray<Agent> {
    return this.agents;
  }

  async *run(question: string): AsyncGenerator<CrewEvent> {
    yield { type: 'crew_start', question };

    if (this.mode === 'parallel') {
      yield* this.executeParallel(question);
    } else {
      yield* this.executeSequential(question);
    }

    yield { type: 'crew_done' };
  }

  private async *executeParallel(question: string): AsyncGenerator<CrewEvent> {
    const streams = this.agents.map((agent) => ({
      agent,
      iterator: agent.stream(question),
    }));

    for (const { agent, iterator } of streams) {
      yield { type: 'agent_start', agent };
      for await (const chunk of iterator) {
        if (chunk.type === 'text') {
          yield { type: 'agent_chunk', agent, text: chunk.text };
        }
      }
      yield { type: 'agent_done', agent };
    }
  }

  private async *executeSequential(question: string): AsyncGenerator<CrewEvent> {
    for (const agent of this.agents) {
      yield { type: 'agent_start', agent };
      for await (const chunk of agent.stream(question)) {
        if (chunk.type === 'text') {
          yield { type: 'agent_chunk', agent, text: chunk.text };
        }
      }
      yield { type: 'agent_done', agent };
    }
  }
}

export function createCrew(config: CrewConfig): WisdomCrew {
  return new WisdomCrew(config);
}
