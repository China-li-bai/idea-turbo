import type {
  LLMProvider,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ProviderConfig,
} from '../types';
import { pipeline, TextStreamer, env } from '@huggingface/transformers';

export type ModelSource = 'huggingface' | 'modelscope';

export interface LocalLLMConfig extends ProviderConfig {
  modelId: string;
  modelSource?: ModelSource;
  maxContextLength?: number;
  preferWebGPU?: boolean;
}

export interface LocalLLMStatus {
  isReady: boolean;
  isLoading: boolean;
  device: 'webgpu' | 'wasm';
  modelSource: ModelSource;
  modelId: string;
  error?: string;
  progress?: {
    status: string;
    current: number;
    total: number;
  };
}

const MODELSCOPE_HOST = 'https://modelscope.cn/models/';
const HUGGINGFACE_HOST = 'https://huggingface.co/';
const DEFAULT_PATH_TEMPLATE = '{model}/resolve/{revision}/';

const FALLBACK_MODELS: Record<ModelSource, { modelId: string; source: ModelSource }[]> = {
  modelscope: [
    { modelId: 'damo/MiniCPM4-0.5B-Instruct-int4-onnx', source: 'modelscope' },
  ],
  huggingface: [
    { modelId: 'onnx-community/Qwen3.5-0.8B', source: 'huggingface' },
  ],
};

export class LocalLLMProvider implements LLMProvider {
  name = 'local';
  private config: LocalLLMConfig;
  private generator: any = null;
  private currentDevice: 'webgpu' | 'wasm' = 'wasm';
  private _status: LocalLLMStatus;
  private statusCallback?: (status: LocalLLMStatus) => void;

  constructor(config: LocalLLMConfig) {
    this.config = config;
    this._status = {
      isReady: false,
      isLoading: false,
      device: 'wasm',
      modelSource: config.modelSource || 'modelscope',
      modelId: config.modelId,
    };
  }

  get status(): LocalLLMStatus {
    return this._status;
  }

  setStatusCallback(callback: (status: LocalLLMStatus) => void): void {
    this.statusCallback = callback;
  }

  private updateStatus(updates: Partial<LocalLLMStatus>): void {
    this._status = { ...this._status, ...updates };
    this.statusCallback?.(this._status);
  }

  private configureModelSource(source: ModelSource): void {
    if (source === 'modelscope') {
      env.remoteHost = MODELSCOPE_HOST;
      env.remotePathTemplate = DEFAULT_PATH_TEMPLATE;
    } else {
      env.remoteHost = HUGGINGFACE_HOST;
      env.remotePathTemplate = DEFAULT_PATH_TEMPLATE;
    }
  }

  async initialize(): Promise<void> {
    if (this._status.isReady) return;
    if (this._status.isLoading) return;

    await this.tryLoadModel();
  }

  private async tryLoadModel(): Promise<void> {
    const primarySource = this.config.modelSource || 'modelscope';
    const primaryModelId = this.config.modelId;

    const candidates: { modelId: string; source: ModelSource }[] = [
      { modelId: primaryModelId, source: primarySource },
      ...FALLBACK_MODELS[primarySource === 'modelscope' ? 'huggingface' : 'modelscope'],
    ];

    const seen = new Set<string>();
    const uniqueCandidates = candidates.filter(c => {
      const key = `${c.source}:${c.modelId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    for (const candidate of uniqueCandidates) {
      this.updateStatus({
        isLoading: true,
        modelSource: candidate.source,
        modelId: candidate.modelId,
        error: undefined,
      });

      try {
        await this.loadModel(candidate.modelId, candidate.source);
        return;
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.warn(`[LocalLLM] Failed to load ${candidate.modelId} from ${candidate.source}: ${errMsg}`);

        this.updateStatus({
          error: `${candidate.modelId} (${candidate.source}): ${errMsg}`,
        });
      }
    }

    this.updateStatus({
      isLoading: false,
      isReady: false,
      error: 'All model sources failed',
    });
    throw new Error('[LocalLLM] All model sources failed to load');
  }

  private async loadModel(modelId: string, source: ModelSource): Promise<void> {
    this.configureModelSource(source);

    const hasWebGPU = this.config.preferWebGPU !== false && await this.checkWebGPUSupport();
    this.currentDevice = hasWebGPU ? 'webgpu' : 'wasm';

    this.updateStatus({ device: this.currentDevice });

    console.log(`[LocalLLM] Loading ${modelId} from ${source} with ${this.currentDevice.toUpperCase()}...`);

    this.generator = await pipeline('text-generation', modelId, {
      device: this.currentDevice,
      dtype: this.currentDevice === 'webgpu' ? 'q4' : 'q8',
      progress_callback: (progress: any) => {
        if (progress.status === 'progress' && progress.progress != null) {
          this.updateStatus({
            progress: {
              status: progress.file || progress.status,
              current: progress.loaded || progress.progress || 0,
              total: progress.total || 100,
            },
          });
        } else if (progress.status === 'done') {
          this.updateStatus({
            progress: {
              status: progress.file || 'done',
              current: 1,
              total: 1,
            },
          });
        }
      },
    });

    this.updateStatus({
      isReady: true,
      isLoading: false,
      progress: undefined,
      error: undefined,
    });

    console.log(`[LocalLLM] ✅ ${modelId} loaded with ${this.currentDevice.toUpperCase()} from ${source}`);
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    if (!this.generator) {
      await this.initialize();
    }

    const startTime = Date.now();
    const messages = request.messages;

    const result = await this.generator(messages, {
      max_new_tokens: request.max_tokens || 512,
      temperature: request.temperature ?? 0.7,
      top_p: request.top_p ?? 0.9,
      do_sample: request.temperature ? request.temperature > 0 : false,
    });

    const generatedText = result[0]?.generated_text;
    const assistantMessage = typeof generatedText === 'string'
      ? generatedText
      : generatedText[generatedText.length - 1]?.content || '';

    const duration = Date.now() - startTime;
    const tokensPerSecond = assistantMessage.length / (duration / 1000);

    console.log(`[LocalLLM] Generated ${assistantMessage.length} chars in ${duration}ms (${tokensPerSecond.toFixed(1)} chars/s)`);

    return {
      id: `local-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: this._status.modelId,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: assistantMessage,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0),
        completion_tokens: Math.ceil(assistantMessage.length / 4),
        total_tokens: 0,
      },
    };
  }

  async chatStream(
    request: ChatCompletionRequest,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    if (!this.generator) {
      await this.initialize();
    }

    const messages = request.messages;

    const streamer = new TextStreamer(this.generator, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (text: string) => {
        onChunk(text);
      },
    });

    await this.generator(messages, {
      max_new_tokens: request.max_tokens || 512,
      temperature: request.temperature ?? 0.7,
      top_p: request.top_p ?? 0.9,
      do_sample: request.temperature ? request.temperature > 0 : false,
      streamer,
    });
  }

  private async checkWebGPUSupport(): Promise<boolean> {
    if (typeof window === 'undefined' || !navigator.gpu) {
      return false;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      return !!adapter;
    } catch {
      return false;
    }
  }

  async dispose(): Promise<void> {
    if (this.generator) {
      this.generator = null;
      this.updateStatus({ isReady: false, isLoading: false });
    }
  }
}
