'use client';

import { useState, useCallback } from 'react';
import VoiceInput from './VoiceInput';
import { parseNaturalLanguage, ParsedResult } from '@/lib/services/aiParserService';
import styles from './VoiceEventCreator.module.scss';

interface VoiceEventCreatorProps {
  onEventCreated?: (event: ParsedResult) => void;
  onCancel?: () => void;
}

export default function VoiceEventCreator({ onEventCreated, onCancel }: VoiceEventCreatorProps) {
  const [transcript, setTranscript] = useState('');
  const [parsedResult, setParsedResult] = useState<ParsedResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTranscript = useCallback((text: string) => {
    setTranscript(text);
    setError(null);
  }, []);

  const handleFinalTranscript = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setTranscript(text);
    setIsParsing(true);
    setError(null);

    try {
      const result = await parseNaturalLanguage(text);
      setParsedResult(result);
    } catch (err) {
      setError(`解析失败: ${err}`);
      console.error('Parse error:', err);
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleConfirm = useCallback(() => {
    if (parsedResult) {
      onEventCreated?.(parsedResult);
      setTranscript('');
      setParsedResult(null);
    }
  }, [parsedResult, onEventCreated]);

  const handleCancel = useCallback(() => {
    setTranscript('');
    setParsedResult(null);
    setError(null);
    onCancel?.();
  }, [onCancel]);

  const handleRetry = useCallback(() => {
    setTranscript('');
    setParsedResult(null);
    setError(null);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>🎤 语音创建日程</h3>
        <p className={styles.hint}>
          说出自然的语句，例如："明天下午3点和王总开会讨论项目"
        </p>
      </div>

      <VoiceInput
        onTranscript={handleTranscript}
        onFinalTranscript={handleFinalTranscript}
        placeholder="点击麦克风，说出您的日程安排..."
        showVolumeIndicator={true}
        showTranscript={true}
        language="zh-CN"
      />

      {isParsing && (
        <div className={styles.parsingIndicator}>
          <div className={styles.spinner} />
          <span>正在解析日程...</span>
        </div>
      )}

      {error && (
        <div className={styles.error}>
          <span className={styles.errorIcon}>⚠️</span>
          <span>{error}</span>
          <button className={styles.retryBtn} onClick={handleRetry}>
            重试
          </button>
        </div>
      )}

      {parsedResult && !isParsing && (
        <div className={styles.preview}>
          <h4>📅 解析结果预览</h4>
          <div className={styles.eventCard}>
            <div className={styles.eventTitle}>
              {parsedResult.title || '未命名事件'}
            </div>
            
            {parsedResult.date && (
              <div className={styles.eventDetail}>
                <span className={styles.label}>日期：</span>
                <span>{new Date(parsedResult.date).toLocaleDateString('zh-CN')}</span>
              </div>
            )}
            
            {parsedResult.time && (
              <div className={styles.eventDetail}>
                <span className={styles.label}>时间：</span>
                <span>{parsedResult.time}</span>
              </div>
            )}
            
            {parsedResult.duration && (
              <div className={styles.eventDetail}>
                <span className={styles.label}>时长：</span>
                <span>{parsedResult.duration} 分钟</span>
              </div>
            )}
            
            {parsedResult.location && (
              <div className={styles.eventDetail}>
                <span className={styles.label}>地点：</span>
                <span>{parsedResult.location}</span>
              </div>
            )}
            
            {parsedResult.description && (
              <div className={styles.eventDetail}>
                <span className={styles.label}>描述：</span>
                <span>{parsedResult.description}</span>
              </div>
            )}
            
            {parsedResult.people && parsedResult.people.length > 0 && (
              <div className={styles.eventDetail}>
                <span className={styles.label}>参与者：</span>
                <span>{parsedResult.people.join('、')}</span>
              </div>
            )}

            <div className={styles.confidence}>
              <span className={styles.label}>解析置信度：</span>
              <div className={styles.confidenceBar}>
                <div 
                  className={styles.confidenceFill}
                  style={{ width: `${parsedResult.confidence * 100}%` }}
                />
              </div>
              <span>{Math.round(parsedResult.confidence * 100)}%</span>
            </div>
          </div>

          <div className={styles.actions}>
            <button className={styles.confirmBtn} onClick={handleConfirm}>
              ✅ 确认创建
            </button>
            <button className={styles.cancelBtn} onClick={handleCancel}>
              取消
            </button>
          </div>
        </div>
      )}

      <div className={styles.examples}>
        <h5>💡 示例语句</h5>
        <ul>
          <li>"明天上午10点开会"</li>
          <li>"周五下午3点和李总在会议室A讨论项目"</li>
          <li>"下周一上午9点半有产品评审"</li>
          <li>"后天晚上7点团队聚餐"</li>
        </ul>
      </div>
    </div>
  );
}
