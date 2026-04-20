'use client';

import { useState } from 'react';
import { useAIStatus } from '@/lib/hooks/useUnifiedItems';
import { useLocalModel } from '@/lib/hooks/useLocalModel';
import { useSecretaryChat, type ChatMessage } from '@/lib/hooks/useSecretaryChat';
import { useLocale } from '@/lib/contexts/ClientProviders';
import AIConfigPanel from './AIConfigPanel';
import styles from './SecretaryView.module.scss';

export default function SecretaryView() {
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  const { localStatus, isAIConfigured, usingLocalModel, loadModel, refreshConfig } = useLocalModel();
  const { messages, inputValue, isProcessing, messagesEndRef, setInputValue, sendMessage, approveAction } = useSecretaryChat(
    useLocale().locale,
    isAIConfigured
  );
  const aiStatus = useAIStatus();
  const { t, locale } = useLocale();

  const isZh = locale.startsWith('zh');

  return (
    <div className={styles.container}>
      <CapabilityStatusBar
        usingLocalModel={usingLocalModel}
        localStatus={localStatus}
        isAIConfigured={isAIConfigured}
        locale={locale}
        onLoadModel={loadModel}
        onOpenConfig={() => setShowConfigPanel(true)}
      />

      {showConfigPanel && (
        <div className={styles.configOverlay}>
          <AIConfigPanel
            onClose={() => {
              setShowConfigPanel(false);
              refreshConfig();
            }}
          />
        </div>
      )}

      {!aiStatus.isReady && (
        <div className={styles.statusBar}>
          {aiStatus.isLoading ? (
            <span className={styles.loading}>🔄 {t('boss.aiLoading')}</span>
          ) : aiStatus.error ? (
            <span className={styles.error}>⚠️ {aiStatus.error}</span>
          ) : null}
        </div>
      )}

      <div className={styles.messages} role="log" aria-live="polite" aria-label={t('secretary.chatLog') || 'Chat messages'}>
        {messages.length === 0 ? (
          <WelcomeScreen isAIConfigured={isAIConfigured} locale={locale} />
        ) : (
          messages.map(message => (
            <MessageBubble
              key={message.id}
              message={message}
              locale={locale}
              t={t}
              onApprove={approveAction}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputArea}>
        <form onSubmit={sendMessage} className={styles.inputWrapper}>
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder={t('secretary.inputPlaceholder')}
            className={styles.input}
            disabled={isProcessing}
          />
          <button type="submit" className={styles.sendBtn} disabled={isProcessing || !inputValue.trim()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5" />
              <path d="M5 12l7-7 7 7" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

function CapabilityStatusBar({
  usingLocalModel,
  localStatus,
  isAIConfigured,
  locale,
  onLoadModel,
  onOpenConfig,
}: {
  usingLocalModel: boolean;
  localStatus: import('@/lib/ai/providers/localLLM').LocalLLMStatus | null;
  isAIConfigured: boolean | null;
  locale: string;
  onLoadModel: () => void;
  onOpenConfig: () => void;
}) {
  const isZh = locale.startsWith('zh');

  return (
    <div className={styles.capabilityStatus}>
      <div className={styles.capability}>
        <span className={styles.capabilityIcon}>✅</span>
        <span className={styles.capabilityText}>
          {isZh ? '本地语义搜索' : 'Local Semantic Search'}
        </span>
      </div>
      <div className={styles.capability}>
        <span className={styles.capabilityIcon}>
          {usingLocalModel
            ? localStatus?.isReady ? '✅' : localStatus?.isLoading ? '⏳' : '⚪'
            : isAIConfigured ? '✅' : '⚠️'}
        </span>
        <span className={styles.capabilityText}>
          {usingLocalModel
            ? isZh ? '本地 AI 模型' : 'Local AI Model'
            : isZh ? '复杂指令理解' : 'Complex Commands'}
        </span>
      </div>
      {usingLocalModel && localStatus && (
        <div className={styles.localModelStatus}>
          {localStatus.isReady ? (
            <span className={`${styles.statusBadge} ${styles.ready}`}>
              🟢 {localStatus.device.toUpperCase()} · {localStatus.modelSource === 'modelscope' ? 'MiniCPM4' : 'Qwen2.5'}
            </span>
          ) : localStatus.isLoading ? (
            <span className={`${styles.statusBadge} ${styles.loading}`}>
              ⏳ {localStatus.progress
                ? `${localStatus.progress.status} ${Math.round((localStatus.progress.current / localStatus.progress.total) * 100)}%`
                : isZh ? '正在加载...' : 'Loading...'}
            </span>
          ) : (
            <button className={styles.loadModelBtn} onClick={onLoadModel}>
              {isZh ? '🚀 加载模型' : '🚀 Load Model'}
            </button>
          )}
        </div>
      )}
      {usingLocalModel && localStatus?.error && !localStatus.isLoading && (
        <div className={styles.errorHint}>
          {isZh ? '⚠️ 加载失败，尝试备用模型...' : '⚠️ Load failed, trying fallback...'}
        </div>
      )}
      {!usingLocalModel && isAIConfigured === false && (
        <button className={styles.enhanceBtn} onClick={onOpenConfig}>
          {isZh ? '配置 AI 解锁完整功能' : 'Configure AI for Full Features'}
        </button>
      )}
    </div>
  );
}

function WelcomeScreen({
  isAIConfigured,
  locale,
}: {
  isAIConfigured: boolean | null;
  locale: string;
}) {
  const isZh = locale.startsWith('zh');

  return (
    <div className={styles.welcome}>
      <div className={styles.welcomeIcon}>🤖</div>
      <h2 className={styles.welcomeTitle}>
        {isZh ? '欢迎使用 AI 秘书' : 'Welcome to AI Secretary'}
      </h2>
      <p className={styles.welcomeText}>
        {isZh
          ? '本地语义搜索已就绪，您可以搜索日程和想法：'
          : 'Local semantic search ready. Search your schedule and ideas:'}
      </p>
      <ul className={styles.examples}>
        <li>
          <span className={styles.exampleTag}>✅</span>
          {isZh ? '"明天的会议"' : '"Tomorrow\'s meetings"'}
        </li>
        <li>
          <span className={styles.exampleTag}>✅</span>
          {isZh ? '"关于项目的想法"' : '"Ideas about projects"'}
        </li>
        <li>
          <span className={styles.exampleTag}>{isAIConfigured ? '✅' : '⚠️'}</span>
          {isZh ? '"把明天的会议推迟到周五"' : '"Move tomorrow\'s meeting to Friday"'}
        </li>
      </ul>
      {isAIConfigured === false && (
        <p className={styles.hint}>
          {isZh
            ? '💡 配置 AI 可解锁复杂指令理解能力'
            : '💡 Configure AI to unlock complex command understanding'}
        </p>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  locale,
  t,
  onApprove,
}: {
  message: ChatMessage;
  locale: string;
  t: (key: string) => string;
  onApprove: (messageId: string) => void;
}) {
  const isZh = locale.startsWith('zh');

  if (message.role === 'user') {
    return (
      <div className={`${styles.messageWrapper} ${styles.userMessage}`}>
        <div className={styles.userBubble}>
          <p>{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.messageWrapper} ${styles.assistantMessage}`}>
      <div className={styles.assistantBubble}>
        {message.proposal ? (
          <ProposalCard
            content={message.content}
            proposal={message.proposal}
            locale={locale}
            t={t}
            onApprove={() => onApprove(message.id)}
          />
        ) : message.actions && message.actions.length > 0 ? (
          <ActionCard
            content={message.content}
            locale={locale}
            t={t}
            onApprove={() => onApprove(message.id)}
          />
        ) : (
          <p style={{ whiteSpace: 'pre-wrap' }}>{message.content}</p>
        )}
      </div>
    </div>
  );
}

function ProposalCard({
  content,
  proposal,
  locale,
  t,
  onApprove,
}: {
  content: string;
  proposal: import('@/lib/services/secretaryQueryProcessor').ProposalData;
  locale: string;
  t: (key: string) => string;
  onApprove: () => void;
}) {
  const isZh = locale.startsWith('zh');

  return (
    <div className={styles.proposalCard}>
      <div className={styles.proposalHeader}>
        <div className={styles.statusDot} />
        <span>{t('secretary.proposalTitle')}</span>
      </div>
      <p style={{ whiteSpace: 'pre-wrap' }}>{content}</p>
      <div className={styles.proposalDetails}>
        <p className={styles.detailLabel}>{t('secretary.time')}</p>
        <p className={styles.detailValue}>{proposal.time}</p>
        <p>📍 {proposal.location || (isZh ? '待定' : 'TBD')}</p>
      </div>
      <div className={styles.proposalActions}>
        <button className={styles.approveBtn} onClick={onApprove}>
          {t('secretary.confirmSchedule')}
        </button>
        <button className={styles.editBtn}>{t('secretary.cancel')}</button>
      </div>
    </div>
  );
}

function ActionCard({
  content,
  locale,
  t,
  onApprove,
}: {
  content: string;
  locale: string;
  t: (key: string) => string;
  onApprove: () => void;
}) {
  const isZh = locale.startsWith('zh');

  return (
    <div className={styles.proposalCard}>
      <div className={styles.proposalHeader}>
        <div className={styles.statusDot} />
        <span>{isZh ? '操作确认' : 'Action Confirmation'}</span>
      </div>
      <p style={{ whiteSpace: 'pre-wrap' }}>{content}</p>
      <div className={styles.proposalActions}>
        <button className={styles.approveBtn} onClick={onApprove}>
          {isZh ? '确认执行' : 'Confirm'}
        </button>
        <button className={styles.editBtn}>{t('secretary.cancel')}</button>
      </div>
    </div>
  );
}
