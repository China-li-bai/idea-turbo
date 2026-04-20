'use client';

import { useState, useEffect } from 'react';
import { aiConfigManager } from '@/lib/ai/config';
import { aiService } from '@/lib/ai';
import type { AIConfig, ProviderConfig } from '@/lib/ai/types';
import type { LocalLLMStatus } from '@/lib/ai/providers/localLLM';

const PROVIDER_INFO = {
  local: {
    name: '本地模型',
    description: 'Qwen2.5-0.5B（免费，无需 API Key，离线可用）',
    getApiKeyUrl: '',
  },
  openai: {
    name: 'OpenAI',
    description: 'GPT-4o, GPT-4 Turbo, GPT-3.5',
    getApiKeyUrl: 'https://platform.openai.com/api-keys',
  },
  gemini: {
    name: 'Google Gemini',
    description: 'Gemini 2.0 Flash, Gemini Pro',
    getApiKeyUrl: 'https://aistudio.google.com/app/apikey',
  },
  glm: {
    name: '智谱AI GLM',
    description: 'GLM-4-Flash, GLM-4',
    getApiKeyUrl: 'https://open.bigmodel.cn/',
  },
  bailian: {
    name: '阿里云百炼',
    description: 'Qwen-Plus, Qwen-Max',
    getApiKeyUrl: 'https://bailian.console.aliyun.com/',
  },
};

export default function SettingsPage() {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [localStatus, setLocalStatus] = useState<LocalLLMStatus | null>(null);

  useEffect(() => {
    loadConfig();
    watchLocalStatus();
  }, []);

  const watchLocalStatus = async () => {
    // 等待 aiService 初始化完成
    await aiService.getProvider('local').catch(() => null);
    
    const localProvider = aiService.getLocalProvider();
    if (localProvider) {
      setLocalStatus(localProvider.status);
      localProvider.setStatusCallback((status) => {
        setLocalStatus({ ...status });
      });
    }
  };

  const loadConfig = async () => {
    try {
      const cfg = await aiConfigManager.getConfig();
      setConfig(cfg);
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    setMessage(null);

    try {
      await aiConfigManager.saveConfig(config);
      setMessage({ type: 'success', text: '设置已保存！' });
    } catch (error) {
      setMessage({ type: 'error', text: '保存失败，请重试。' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('确定要重置所有设置吗？这将清除所有API Key。')) return;

    try {
      await aiConfigManager.resetToDefaults();
      const cfg = await aiConfigManager.getConfig();
      setConfig(cfg);
      setMessage({ type: 'success', text: '设置已重置！' });
      // 刷新页面以应用新配置
      window.location.reload();
    } catch (error) {
      setMessage({ type: 'error', text: '重置失败，请重试。' });
    }
  };

  const updateProvider = (providerName: string, field: string, value: string) => {
    if (!config) return;

    const currentProvider = config.providers[providerName];
    if (!currentProvider) return;

    setConfig({
      ...config,
      providers: {
        ...config.providers,
        [providerName]: {
          ...currentProvider,
          [field]: value,
        } as ProviderConfig,
      },
    });
  };

  const setDefaultProvider = (providerName: string) => {
    if (!config) return;
    setConfig({ ...config, defaultProvider: providerName });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">加载配置失败</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">AI 设置</h1>
            <p className="text-sm text-gray-500 mt-1">
              配置AI服务提供商和API密钥
            </p>
          </div>

          <div className="p-6">
            {message && (
              <div
                className={`mb-4 p-3 rounded ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                默认AI提供商
              </label>
              <select
                value={config.defaultProvider}
                onChange={(e) => setDefaultProvider(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(config.providers).map(([key, provider]) => (
                  <option key={key} value={key}>
                    {PROVIDER_INFO[key as keyof typeof PROVIDER_INFO]?.name || key}
                    {provider?.apiKey ? ' ✓' : ' (未配置)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-6">
              {Object.entries(config.providers).map(([key, provider]) => {
                if (!provider) return null;
                const info = PROVIDER_INFO[key as keyof typeof PROVIDER_INFO];
                const isDefault = config.defaultProvider === key;
                const hasKey = provider.apiKey && provider.apiKey.length > 0;

                if (key === 'local') {
                  return (
                    <div
                      key={key}
                      className={`border rounded-lg p-4 ${
                        isDefault ? 'border-green-500 bg-green-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {info?.name || key}
                            {isDefault && (
                              <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">
                                默认
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-gray-500">{info?.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm px-2 py-1 rounded ${
                            localStatus?.isReady
                              ? 'text-green-600 bg-green-100'
                              : localStatus?.isLoading
                              ? 'text-yellow-600 bg-yellow-100'
                              : 'text-gray-400 bg-gray-100'
                          }`}>
                            {localStatus?.isReady
                              ? `✓ 就绪 (${localStatus.device.toUpperCase()})`
                              : localStatus?.isLoading
                              ? `加载中... ${localStatus.progress ? Math.round((localStatus.progress.current / localStatus.progress.total) * 100) : 0}%`
                              : '未加载'}
                          </span>
                        </div>
                      </div>

                      {localStatus?.isLoading && localStatus.progress && (
                        <div className="mt-3">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min(100, (localStatus.progress.current / localStatus.progress.total) * 100)}%`,
                              }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {localStatus.progress.status} ({(localStatus.progress.current / 1024 / 1024).toFixed(1)}MB / {(localStatus.progress.total / 1024 / 1024).toFixed(1)}MB)
                          </p>
                        </div>
                      )}

                      <div className="mt-3 bg-gray-50 rounded p-3">
                        <p className="text-xs text-gray-600">
                          💡 本地模型在浏览器中运行，数据不会上传到任何服务器。首次使用需要下载模型文件（约 300MB），之后会缓存在本地。
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={key}
                    className={`border rounded-lg p-4 ${
                      isDefault ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {info?.name || key}
                          {isDefault && (
                            <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                              默认
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-500">{info?.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasKey ? (
                          <span className="text-green-600 text-sm">✓ 已配置</span>
                        ) : (
                          <span className="text-gray-400 text-sm">未配置</span>
                        )}
                        {info?.getApiKeyUrl && (
                          <a
                            href={info.getApiKeyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            获取API Key →
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          API Key
                        </label>
                        <input
                          type="password"
                          value={provider.apiKey || ''}
                          onChange={(e) =>
                            updateProvider(key, 'apiKey', e.target.value)
                          }
                          placeholder="sk-..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          API地址
                        </label>
                        <input
                          type="text"
                          value={provider.baseURL || ''}
                          onChange={(e) =>
                            updateProvider(key, 'baseURL', e.target.value)
                          }
                          placeholder="https://api.example.com/v1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          模型
                        </label>
                        <input
                          type="text"
                          value={provider.model || ''}
                          onChange={(e) =>
                            updateProvider(key, 'model', e.target.value)
                          }
                          placeholder="gpt-4o"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-yellow-800 mb-2">🔒 隐私说明</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• API Key 存储在您的浏览器本地，不会上传到任何服务器</li>
                  <li>• AI 功能默认关闭，需要您主动配置 API Key 才能使用</li>
                  <li>• 您的数据完全由您自己控制，可以随时导出或删除</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? '保存中...' : '保存设置'}
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  重置为默认
                </button>
                <a
                  href="/"
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  返回首页
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
