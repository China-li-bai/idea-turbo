import { NextRequest, NextResponse } from 'next/server';

const PROVIDER_CONFIGS: Record<string, { baseURL: string; envKey: string; defaultModel: string }> = {
  openai: {
    baseURL: 'https://api.openai.com/v1',
    envKey: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o',
  },
  gemini: {
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    envKey: 'GEMINI_API_KEY',
    defaultModel: 'gemini-2.0-flash',
  },
  glm: {
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    envKey: 'GLM_API_KEY',
    defaultModel: 'GLM-4-Flash',
  },
  bailian: {
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    envKey: 'BAILIAN_API_KEY',
    defaultModel: 'qwen-plus',
  },
};

const VALID_ROLES = ['system', 'user', 'assistant', 'function', 'tool'] as const;

interface ChatMessage {
  role: typeof VALID_ROLES[number];
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  tool_calls?: unknown;
  function_call?: unknown;
}

function validateMessages(messages: unknown): { valid: boolean; error?: string } {
  if (!messages) {
    return { valid: false, error: 'Messages are required' };
  }

  if (!Array.isArray(messages)) {
    return { valid: false, error: 'Messages must be an array' };
  }

  if (messages.length === 0) {
    return { valid: false, error: 'Messages array cannot be empty' };
  }

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i] as ChatMessage;
    
    if (!msg || typeof msg !== 'object') {
      return { valid: false, error: `Message at index ${i} must be an object` };
    }

    if (!VALID_ROLES.includes(msg.role)) {
      return { valid: false, error: `Message at index ${i} has invalid role: ${msg.role}` };
    }

    if (msg.content === undefined && !msg.tool_calls && !msg.function_call) {
      return { valid: false, error: `Message at index ${i} must have content` };
    }
  }

  return { valid: true };
}

function validateNumericParam(value: unknown, name: string, min: number, max: number): { valid: boolean; error?: string } {
  if (value === undefined) return { valid: true };
  
  if (typeof value !== 'number') {
    return { valid: false, error: `${name} must be a number` };
  }
  
  if (value < min || value > max) {
    return { valid: false, error: `${name} must be between ${min} and ${max}` };
  }
  
  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      provider = 'glm', 
      messages, 
      model, 
      temperature, 
      max_tokens, 
      top_p, 
      response_format 
    } = body;

    const messagesValidation = validateMessages(messages);
    if (!messagesValidation.valid) {
      return NextResponse.json(
        { error: messagesValidation.error },
        { status: 400 }
      );
    }

    const tempValidation = validateNumericParam(temperature, 'temperature', 0, 2);
    if (!tempValidation.valid) {
      return NextResponse.json(
        { error: tempValidation.error },
        { status: 400 }
      );
    }

    const topPValidation = validateNumericParam(top_p, 'top_p', 0, 1);
    if (!topPValidation.valid) {
      return NextResponse.json(
        { error: topPValidation.error },
        { status: 400 }
      );
    }

    const maxTokensValidation = validateNumericParam(max_tokens, 'max_tokens', 1, 128000);
    if (!maxTokensValidation.valid) {
      return NextResponse.json(
        { error: maxTokensValidation.error },
        { status: 400 }
      );
    }

    const config = PROVIDER_CONFIGS[provider];
    if (!config) {
      return NextResponse.json(
        { error: `Unknown provider: ${provider}. Valid providers: ${Object.keys(PROVIDER_CONFIGS).join(', ')}` },
        { status: 400 }
      );
    }

    const apiKey = process.env[config.envKey];
    if (!apiKey) {
      return NextResponse.json(
        { error: `API key not configured for provider: ${provider}. Set ${config.envKey} environment variable.` },
        { status: 500 }
      );
    }

    const response = await fetch(`${config.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || config.defaultModel,
        messages,
        temperature: temperature ?? 0.7,
        max_tokens,
        top_p,
        response_format,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      return NextResponse.json(
        { error: error.message || error.error?.message || response.statusText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('AI chat API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
