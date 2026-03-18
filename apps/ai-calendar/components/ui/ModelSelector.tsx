'use client';

import { useState, useRef, useEffect } from 'react';
import { useAIModel } from '@/lib/contexts/AIModelContext';
import { SupportedLocale } from '@/lib/utils/i18n';
import type { AIModelConfig } from '@/lib/utils/aiModels';
import styles from './ModelSelector.module.scss';

interface ModelSelectorProps {
  currentLocale?: SupportedLocale;
  compact?: boolean;
}

export default function ModelSelector({ currentLocale, compact = false }: ModelSelectorProps) {
  const { 
    currentModel, 
    availableModels, 
    isLoading, 
    isReady, 
    switchModel,
    isModelCompatible 
  } = useAIModel();
  
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = async (modelType: string) => {
    try {
      await switchModel(modelType as any);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to switch model:', error);
    }
  };

  const getStatusBadge = () => {
    if (isLoading) {
      return <span className={styles.loadingBadge}>加载中...</span>;
    }
    if (isReady) {
      return <span className={styles.readyBadge}>就绪</span>;
    }
    return <span className={styles.notReadyBadge}>未初始化</span>;
  };

  const getModelIcon = (model: AIModelConfig): string => {
    const iconMap: Record<string, string> = {
      'zh-specific': '🇨🇳',
      'multilingual': '🌐',
      'english': '🇺🇸',
    };
    return iconMap[model.type] || '🤖';
  };

  const getLocaleName = (locale: string): string => {
    const names: Record<string, string> = {
      'zh-CN': '简体中文',
      'zh-TW': '繁體中文',
      'en-US': 'English',
      'ja-JP': '日本語',
      'ko-KR': '한국어',
    };
    return names[locale] || locale;
  };

  const currentModelConfig = availableModels.find(m => m.id === currentModel);

  if (compact) {
    return (
      <div className={styles.compactSelector} ref={dropdownRef}>
        <button
          className={styles.compactTrigger}
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading}
          aria-label="选择 AI 模型"
        >
          <span className={styles.modelIcon}>{getModelIcon(currentModelConfig!)}</span>
          <span className={styles.modelName}>{currentModelConfig?.name}</span>
          {getStatusBadge()}
        </button>

        {isOpen && (
          <div className={styles.compactDropdown}>
            {availableModels.map((model) => {
              const isCompatible = currentLocale ? isModelCompatible(model.type, currentLocale) : true;
              const isCurrent = model.id === currentModel;
              
              return (
                <button
                  key={model.id}
                  className={`${styles.compactOption} ${isCurrent ? styles.active : ''} ${!isCompatible ? styles.incompatible : ''}`}
                  onClick={() => handleSelect(model.type)}
                  disabled={isLoading || isCurrent}
                >
                  <span className={styles.modelIcon}>{getModelIcon(model)}</span>
                  <div className={styles.optionInfo}>
                    <span className={styles.optionName}>{model.name}</span>
                    <span className={styles.optionDimensions}>{model.dimensions}D</span>
                  </div>
                  {isCurrent && <span className={styles.checkmark}>✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.selector} ref={dropdownRef}>
      <div className={styles.header}>
        <h3 className={styles.title}>AI 模型</h3>
        {getStatusBadge()}
      </div>

      <div className={styles.modelList}>
        {availableModels.map((model) => {
          const isCompatible = currentLocale ? isModelCompatible(model.type, currentLocale) : true;
          const isCurrent = model.id === currentModel;
          
          return (
            <button
              key={model.id}
              className={`${styles.modelCard} ${isCurrent ? styles.active : ''} ${!isCompatible ? styles.incompatible : ''}`}
              onClick={() => handleSelect(model.type)}
              disabled={isLoading || isCurrent}
            >
              <div className={styles.modelHeader}>
                <span className={styles.modelIcon}>{getModelIcon(model)}</span>
                <span className={styles.modelName}>{model.name}</span>
                {isCurrent && <span className={styles.currentBadge}>当前</span>}
              </div>
              
              <p className={styles.modelDescription}>{model.description}</p>
              
              <div className={styles.modelMeta}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>模型:</span>
                  <span className={styles.metaValue}>{model.modelName}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>维度:</span>
                  <span className={styles.metaValue}>{model.dimensions}D</span>
                </div>
              </div>

              <div className={styles.supportedLocales}>
                <span className={styles.localesLabel}>支持语言:</span>
                <div className={styles.localesList}>
                  {model.supportedLocales.map(locale => (
                    <span key={locale} className={styles.localeTag}>
                      {getLocaleName(locale)}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
