'use client';

import { useState, useEffect } from 'react';
import { aiConfigManager } from '@/lib/ai/config';
import type { AIConfig } from '@/lib/ai/types';
import styles from './AIConfigPanel.module.scss';

interface AIConfigPanelProps {
  onClose?: () => void;
}

export default function AIConfigPanel({ onClose }: AIConfigPanelProps) {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('glm');
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const cfg = await aiConfigManager.getConfig();
    setConfig(cfg);
    setSelectedProvider(cfg.defaultProvider);
    setApiKey(cfg.providers[cfg.defaultProvider]?.apiKey || '');
  };

  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    if (config) {
      setApiKey(config.providers[provider]?.apiKey || '');
    }
  };

  const handleSave = async () => {
    if (!config) return;
    
    setIsSaving(true);
    setMessage(null);
    
    try {
      await aiConfigManager.updateProvider(selectedProvider, {
        apiKey,
        model: config.providers[selectedProvider]?.model || '',
      });
      
      await aiConfigManager.setDefaultProvider(selectedProvider);
      
      setMessage({ type: 'success', text: '配置已保存' });
      
      setTimeout(() => {
        onClose?.();
      }, 1500);
    } catch (error) {
      setMessage({ type: 'error', text: '保存失败，请重试' });
    } finally {
      setIsSaving(false);
    }
  };

  const providerOptions = [
    { value: 'local', label: '本地模型', description: '免费，无需 API Key', url: '' },
    { value: 'glm', label: '智谱 GLM', description: '推荐，免费额度充足', url: 'https://open.bigmodel.cn/' },
    { value: 'openai', label: 'OpenAI', description: 'GPT-4o', url: 'https://platform.openai.com/' },
    { value: 'gemini', label: 'Google Gemini', description: 'Gemini 2.0 Flash', url: 'https://aistudio.google.com/' },
    { value: 'bailian', label: '阿里云百炼', description: 'Qwen Plus', url: 'https://dashscope.console.aliyun.com/' },
  ];

  if (!config) {
    return <div className={styles.loading}>加载中...</div>;
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3>AI 服务配置</h3>
        {onClose && (
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        )}
      </div>
      
      <div className={styles.content}>
        <div className={styles.section}>
          <label className={styles.label}>选择 AI 服务商</label>
          <div className={styles.providerList}>
            {providerOptions.map(option => (
              <button
                key={option.value}
                className={`${styles.providerOption} ${selectedProvider === option.value ? styles.active : ''}`}
                onClick={() => handleProviderChange(option.value)}
              >
                <span className={styles.providerName}>{option.label}</span>
                <span className={styles.providerDesc}>{option.description}</span>
              </button>
            ))}
          </div>
        </div>
        
        {selectedProvider !== 'local' && (
          <>
            <div className={styles.section}>
              <label className={styles.label}>
                API Key
                <a 
                  href={providerOptions.find(p => p.value === selectedProvider)?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.helpLink}
                >
                  获取 API Key →
                </a>
              </label>
              <input
                type="password"
                className={styles.input}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="请输入 API Key"
              />
            </div>
            
            <div className={styles.section}>
              <label className={styles.label}>模型</label>
              <input
                type="text"
                className={styles.input}
                value={config.providers[selectedProvider]?.model || ''}
                onChange={(e) => {
                  const currentProvider = config.providers[selectedProvider];
                  if (currentProvider) {
                    setConfig({
                      ...config,
                      providers: {
                        ...config.providers,
                        [selectedProvider]: {
                          baseURL: currentProvider.baseURL,
                          apiKey: currentProvider.apiKey,
                          model: e.target.value,
                          defaultModel: currentProvider.defaultModel,
                        }
                      }
                    });
                  }
                }}
                placeholder="模型名称"
              />
            </div>
          </>
        )}
        
        {selectedProvider === 'local' && (
          <div className={styles.section}>
            <div className={styles.localInfo}>
              <p className={styles.localDesc}>
                🧠 使用 Qwen2.5-0.5B 本地模型，在浏览器中运行，无需网络。
              </p>
              <p className={styles.localHint}>
                首次使用将下载约 300MB 模型文件并缓存在本地。
              </p>
            </div>
          </div>
        )}
        
        {message && (
          <div className={`${styles.message} ${styles[message.type]}`}>
            {message.text}
          </div>
        )}
      </div>
      
      <div className={styles.footer}>
        <button 
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={isSaving || (selectedProvider !== 'local' && !apiKey.trim())}
        >
          {isSaving ? '保存中...' : '保存配置'}
        </button>
      </div>
    </div>
  );
}
