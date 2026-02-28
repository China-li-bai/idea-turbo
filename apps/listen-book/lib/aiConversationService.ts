interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class AIConversationService {
  private apiKey: string;
  private apiUrl: string;
  private model: string;

  constructor(options: {
    apiKey: string;
    apiUrl?: string;
    model?: string;
  }) {
    this.apiKey = options.apiKey;
    this.apiUrl = options.apiUrl || 'https://api.openai.com/v1/chat/completions';
    this.model = options.model || 'gpt-4o-mini';
  }

  async generateResponse(userMessage: string, conversationHistory: ConversationMessage[]): Promise<string> {
    try {
      const messages = [
        ...conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user',
          content: userMessage
        }
      ];

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: 500,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'AI API request failed');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('AI generation error:', error);
      throw error;
    }
  }

  setModel(model: string) {
    this.model = model;
  }
}
