/**
 * TTS API 调用示例 - 使用设备 ID 进行速率限制
 */

import DeviceIdManager from '../utils/DeviceIdManager';

class TTSClient {
  private baseURL: string;
  private apiKey?: string;

  constructor(baseURL: string, apiKey?: string) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
  }

  /**
   * 生成语音
   */
  async generateSpeech(options: {
    input: string;
    voice?: string;
    speed?: number;
    pitch?: number;
    stream?: boolean;
  }): Promise<Blob | Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const headersWithDeviceId = DeviceIdManager.getHeadersWithDeviceId(headers);

    const response = await fetch(`${this.baseURL}/v1/audio/speech`, {
      method: 'POST',
      headers: headersWithDeviceId,
      body: JSON.stringify({
        model: 'tts-1',
        input: options.input,
        voice: options.voice || 'shimmer',
        speed: options.speed || 1.0,
        pitch: options.pitch || 1.0,
        stream: options.stream || false
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      if (response.status === 429) {
        throw new TTSRateLimitError(
          errorData.error.message,
          response.headers.get('X-RateLimit-Reset'),
          response.headers.get('Retry-After')
        );
      }
      
      throw new TTSError(errorData.error.message, response.status);
    }

    if (options.stream) {
      return response;
    }

    return await response.blob();
  }

  /**
   * 获取可用模型列表
   */
  async getModels(): Promise<any> {
    const headers = DeviceIdManager.getHeadersWithDeviceId();
    
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseURL}/v1/models`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new TTSError('Failed to get models', response.status);
    }

    return await response.json();
  }

  /**
   * 获取可用语音列表
   */
  async getVoices(): Promise<any> {
    const headers = DeviceIdManager.getHeadersWithDeviceId();
    
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseURL}/v1/voices`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new TTSError('Failed to get voices', response.status);
    }

    return await response.json();
  }
}

class TTSError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'TTSError';
  }
}

class TTSRateLimitError extends TTSError {
  constructor(
    message: string,
    public resetTime: string | null,
    public retryAfter: string | null
  ) {
    super(message, 429);
    this.name = 'TTSRateLimitError';
  }

  getResetTime(): Date | null {
    if (!this.resetTime) return null;
    return new Date(parseInt(this.resetTime) * 1000);
  }

  getRetryAfterSeconds(): number | null {
    if (!this.retryAfter) return null;
    return parseInt(this.retryAfter);
  }
}

export { TTSClient, TTSError, TTSRateLimitError };
export default TTSClient;