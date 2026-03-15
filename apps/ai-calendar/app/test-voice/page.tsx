'use client';

import { useState } from 'react';
import VoiceInput from '@/components/VoiceInput';
import VoiceEventCreator from '@/components/VoiceEventCreator';
import type { ParsedResult } from '@/lib/services/aiParserService';
import styles from './test-voice.module.scss';

export default function TestVoicePage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [createdEvents, setCreatedEvents] = useState<ParsedResult[]>([]);

  const handleTranscript = (text: string, isFinal: boolean) => {
    console.log('Transcript:', text, 'isFinal:', isFinal);
    if (isFinal) {
      setTestResults(prev => [...prev, `最终结果: ${text}`]);
    }
  };

  const handleEventCreated = (event: ParsedResult) => {
    setCreatedEvents(prev => [...prev, event]);
    console.log('Event created:', event);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>🎤 语音输入测试</h1>
        <p>测试 Sherpa-ONNX 语音识别功能</p>
      </header>

      <section className={styles.section}>
        <h2>基础语音输入测试</h2>
        <VoiceInput
          onTranscript={handleTranscript}
          placeholder="点击麦克风开始说话..."
          showVolumeIndicator={true}
          showTranscript={true}
          language="zh-CN"
        />
      </section>

      <section className={styles.section}>
        <h2>语音创建日程测试</h2>
        <VoiceEventCreator
          onEventCreated={handleEventCreated}
        />
      </section>

      {createdEvents.length > 0 && (
        <section className={styles.section}>
          <h2>已创建的事件 ({createdEvents.length})</h2>
          <div className={styles.eventList}>
            {createdEvents.map((event, index) => (
              <div key={index} className={styles.eventItem}>
                <div className={styles.eventTitle}>{event.title}</div>
                <div className={styles.eventMeta}>
                  {event.date && <span>📅 {new Date(event.date).toLocaleDateString('zh-CN')}</span>}
                  {event.time && <span>⏰ {event.time}</span>}
                  {event.location && <span>📍 {event.location}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={styles.section}>
        <h2>测试日志</h2>
        <div className={styles.logList}>
          {testResults.length === 0 ? (
            <div className={styles.emptyLog}>暂无测试日志</div>
          ) : (
            testResults.map((result, index) => (
              <div key={index} className={styles.logItem}>
                {result}
              </div>
            ))
          )}
        </div>
      </section>

      <section className={styles.section}>
        <h2>使用说明</h2>
        <div className={styles.instructions}>
          <div className={styles.instructionItem}>
            <h4>1. 浏览器要求</h4>
            <p>需要支持 WebAssembly 和 getUserMedia API 的现代浏览器</p>
          </div>
          <div className={styles.instructionItem}>
            <h4>2. 首次使用</h4>
            <p>首次使用需要下载语音识别模型（约 100MB），请耐心等待</p>
          </div>
          <div className={styles.instructionItem}>
            <h4>3. 麦克风权限</h4>
            <p>请允许浏览器访问麦克风权限</p>
          </div>
          <div className={styles.instructionItem}>
            <h4>4. 支持的语言</h4>
            <p>中文（简体）、英语（美国）、英语（英国）</p>
          </div>
        </div>
      </section>
    </div>
  );
}
