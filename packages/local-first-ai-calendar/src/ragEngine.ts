import { RAGConfig, CalendarEvent, SearchResult } from "./types.js";

export class RAGEngine {
  private config: RAGConfig;

  constructor(config: RAGConfig) {
    this.config = config;
  }

  private formatContext(searchResults: SearchResult[]): string {
    let context = "Here are the relevant calendar events:\n\n";

    searchResults.forEach((result, index) => {
      const event = result.event;
      context += `Event ${index + 1}:\n`;
      context += `  Title: ${event.title}\n`;
      context += `  Time: ${event.startTime.toLocaleString()} - ${event.endTime.toLocaleString()}\n`;
      if (event.description) {
        context += `  Description: ${event.description}\n`;
      }
      if (event.location) {
        context += `  Location: ${event.location}\n`;
      }
      if (event.attendees && event.attendees.length > 0) {
        context += `  Attendees: ${event.attendees.join(", ")}\n`;
      }
      if (event.tags && event.tags.length > 0) {
        context += `  Tags: ${event.tags.join(", ")}\n`;
      }
      context += `  Relevance Score: ${(result.score * 100).toFixed(1)}%\n\n`;
    });

    return context;
  }

  private buildPrompt(query: string, context: string): string {
    return `You are a helpful calendar assistant. Answer the user's question based only on the provided calendar events. If the answer cannot be found in the events, say so clearly.

${context}

User Question: ${query}

Answer:`;
  }

  async query(query: string, searchResults: SearchResult[]): Promise<string> {
    if (searchResults.length === 0) {
      return "No relevant calendar events found to answer your question.";
    }

    const context = this.formatContext(searchResults);
    const prompt = this.buildPrompt(query, context);

    try {
      const response = await fetch(this.config.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: this.config.maxContextLength,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error("RAG query failed:", error);
      throw new Error(`Failed to get response from AI: ${(error as Error).message}`);
    }
  }
}
