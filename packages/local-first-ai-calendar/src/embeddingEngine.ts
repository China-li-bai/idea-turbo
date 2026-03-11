import { pipeline, env } from "@huggingface/transformers";
import { EmbeddingConfig, CalendarEvent } from "./types.js";

env.allowLocalModels = true;
env.useBrowserCache = true;

export class EmbeddingEngine {
  private config: EmbeddingConfig;
  private extractor: any = null;
  private isLoading: boolean = false;

  constructor(config: EmbeddingConfig) {
    this.config = config;
    
    if (config.localModelPath) {
      env.localModelPath = config.localModelPath;
    }
    
    if (config.allowRemoteModels !== undefined) {
      env.allowRemoteModels = config.allowRemoteModels;
    }
  }

  async initialize(): Promise<void> {
    if (this.extractor || this.isLoading) {
      return;
    }

    this.isLoading = true;

    try {
      this.extractor = await pipeline("feature-extraction", this.config.modelName, {
        quantized: true,
      });
    } catch (error) {
      console.error("Failed to initialize embedding model:", error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  private formatEventText(event: CalendarEvent, isQuery: boolean = false): string {
    const prefix = isQuery ? "query: " : "passage: ";
    let text = `${event.title}`;
    if (event.description) {
      text += ` - ${event.description}`;
    }
    if (event.location) {
      text += ` at ${event.location}`;
    }
    if (event.attendees && event.attendees.length > 0) {
      text += ` with ${event.attendees.join(", ")}`;
    }
    if (event.tags && event.tags.length > 0) {
      text += ` [${event.tags.join(", ")}]`;
    }
    text += ` on ${event.startTime.toISOString()}`;
    return prefix + text;
  }

  async generateEventEmbedding(event: CalendarEvent): Promise<number[]> {
    if (!this.extractor) {
      await this.initialize();
    }

    const text = this.formatEventText(event, false);
    const output = await this.extractor(text, { pooling: "mean", normalize: true });

    return Array.from(output.data);
  }

  async generateQueryEmbedding(query: string): Promise<number[]> {
    if (!this.extractor) {
      await this.initialize();
    }

    const text = "query: " + query;
    const output = await this.extractor(text, { pooling: "mean", normalize: true });

    return Array.from(output.data);
  }

  async generateBatchEmbeddings(events: CalendarEvent[]): Promise<Map<string, number[]>> {
    const results = new Map<string, number[]>();

    for (const event of events) {
      const embedding = await this.generateEventEmbedding(event);
      results.set(event.id, embedding);
    }

    return results;
  }

  isInitialized(): boolean {
    return this.extractor !== null;
  }
}
