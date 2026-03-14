import { db } from '@/lib/storage';
import type { AIConfig } from './types';

const DEFAULT_CONFIG: AIConfig = {
  providers: {
    openai: {
      baseURL: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o',
      defaultModel: 'gpt-4o',
    },
    gemini: {
      baseURL: 'https://generativelanguage.googleapis.com/v1beta',
      apiKey: '',
      model: 'gemini-2.0-flash',
      defaultModel: 'gemini-2.0-flash',
    },
    glm: {
      baseURL: 'https://open.bigmodel.cn/api/paas/v4',
      apiKey: '',
      model: 'glm-4',
      defaultModel: 'glm-4',
    },
    bailian: {
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      apiKey: '',
      model: 'qwen-plus',
      defaultModel: 'qwen-plus',
    },
  },
  defaultProvider: 'openai',
};

export class AIConfigManager {
  private static instance: AIConfigManager;
  private config: AIConfig | null = null;

  static getInstance(): AIConfigManager {
    if (!AIConfigManager.instance) {
      AIConfigManager.instance = new AIConfigManager();
    }
    return AIConfigManager.instance;
  }

  async getConfig(): Promise<AIConfig> {
    if (this.config) {
      return this.config;
    }

    const saved = await db.settings.getItem<AIConfig>('aiConfig');
    this.config = saved || DEFAULT_CONFIG;
    return this.config;
  }

  async saveConfig(config: AIConfig): Promise<void> {
    this.config = config;
    await db.settings.setItem('aiConfig', config);
  }

  async updateProvider(
    providerName: string,
    config: Partial<AIConfig['providers'][string]>
  ): Promise<void> {
    const currentConfig = await this.getConfig();
    const providerConfig = currentConfig.providers[providerName] || {
      baseURL: '',
      apiKey: '',
      model: '',
    };

    currentConfig.providers[providerName] = {
      ...providerConfig,
      ...config,
    };

    await this.saveConfig(currentConfig);
  }

  async setDefaultProvider(providerName: string): Promise<void> {
    const config = await this.getConfig();
    config.defaultProvider = providerName;
    await this.saveConfig(config);
  }

  async resetToDefaults(): Promise<void> {
    this.config = { ...DEFAULT_CONFIG };
    await this.saveConfig(this.config);
  }
}

export const aiConfigManager = AIConfigManager.getInstance();
