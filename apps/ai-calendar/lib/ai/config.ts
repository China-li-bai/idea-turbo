import { db } from '@/lib/storage';
import { encryptValue, decryptValue } from '@/lib/utils/crypto';
import type { AIConfig, ProviderConfig } from './types';

const DEFAULT_CONFIG: AIConfig = {
  providers: {
    local: {
      baseURL: '',
      apiKey: '',
      model: 'Qwen3.5-0.8B',
      defaultModel: 'Qwen3.5-0.8B',
      modelId: 'onnx-community/Qwen3.5-0.8B',
      modelSource: 'huggingface',
    },
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
      model: 'GLM-4-Flash',
      defaultModel: 'GLM-4-Flash',
    },
    bailian: {
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      apiKey: '',
      model: 'qwen-plus',
      defaultModel: 'qwen-plus',
    },
  },
  defaultProvider: 'local',
};

async function encryptProviderKeys(providers: AIConfig['providers']): Promise<AIConfig['providers']> {
  const encrypted: AIConfig['providers'] = {};
  for (const [name, config] of Object.entries(providers)) {
    if (!config) continue;
    encrypted[name] = {
      ...config,
      apiKey: config.apiKey ? await encryptValue(config.apiKey) : '',
    };
  }
  return encrypted;
}

async function decryptProviderKeys(providers: AIConfig['providers']): Promise<AIConfig['providers']> {
  const decrypted: AIConfig['providers'] = {};
  for (const [name, config] of Object.entries(providers)) {
    if (!config) continue;
    decrypted[name] = {
      ...config,
      apiKey: config.apiKey ? await decryptValue(config.apiKey) : '',
    };
  }
  return decrypted;
}

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

    if (saved) {
      saved.providers = await decryptProviderKeys(saved.providers);
      this.config = saved;
    } else {
      this.config = DEFAULT_CONFIG;
    }

    return this.config;
  }

  async saveConfig(config: AIConfig): Promise<void> {
    this.config = config;
    const toSave: AIConfig = {
      ...config,
      providers: await encryptProviderKeys(config.providers),
    };
    await db.settings.setItem('aiConfig', toSave);
  }

  async updateProvider(
    providerName: string,
    config: Partial<ProviderConfig>
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
