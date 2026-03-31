'use client';

import { useState } from 'react';
import styles from './SyncWaitlistModal.module.scss';

interface SyncWaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale: string;
}

export default function SyncWaitlistModal({ isOpen, onClose, locale }: SyncWaitlistModalProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const isZh = locale.startsWith('zh');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setError(isZh ? '请输入有效的邮箱地址' : 'Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email,
          source: 'sync-waitlist',
          timestamp: Date.now(),
          locale,
        }),
      });

      if (response.ok) {
        setIsSuccess(true);
        setEmail('');
        
        const existingEmails = JSON.parse(localStorage.getItem('waitlist-emails') || '[]');
        if (!existingEmails.includes(email)) {
          existingEmails.push(email);
          localStorage.setItem('waitlist-emails', JSON.stringify(existingEmails));
        }
      } else {
        const data = await response.json();
        setError(data.error || (isZh ? '提交失败，请稍后重试' : 'Submission failed, please try again'));
      }
    } catch (err) {
      setError(isZh ? '网络错误，请稍后重试' : 'Network error, please try again');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          ✕
        </button>

        {!isSuccess ? (
          <>
            <div className={styles.icon}>
              <span className={styles.cloudIcon}>🔒</span>
            </div>
            
            <h2 className={styles.title}>
              {isZh ? '端到端加密同步（规划中）' : 'End-to-End Encrypted Sync (Coming Soon)'}
            </h2>
            
            <p className={styles.description}>
              {isZh 
                ? '你的数据极度神圣。我们正在构建军规级（AES-256）的跨设备同步通道。即使是 privlocal 的开发者，也看不到你的任何日程。'
                : 'Your data is sacred. We\'re building military-grade (AES-256) cross-device sync. Even privlocal developers cannot see your calendar.'}
            </p>

            <div className={styles.timeline}>
              <span className={styles.badge}>
                {isZh ? '预计上线：2024 年 Q2' : 'Expected: Q2 2024'}
              </span>
            </div>

            <div className={styles.benefits}>
              <h3>{isZh ? '加入等待列表，获取：' : 'Join the waitlist to get:'}</h3>
              <ul>
                <li>{isZh ? '✓ 内测资格（提前 2 周体验）' : '✓ Early access (2 weeks ahead)'}</li>
                <li>{isZh ? '✓ 早鸟折扣（终身 5 折）' : '✓ Early bird discount (50% off lifetime)'}</li>
                <li>{isZh ? '✓ 功能投票权（决定开发优先级）' : '✓ Feature voting rights'}</li>
              </ul>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isZh ? 'your@email.com' : 'your@email.com'}
                className={styles.emailInput}
                disabled={isSubmitting}
              />
              
              <button 
                type="submit" 
                className={styles.submitButton}
                disabled={isSubmitting}
              >
                {isSubmitting 
                  ? (isZh ? '提交中...' : 'Submitting...')
                  : (isZh ? '加入等待列表' : 'Join Waitlist')}
              </button>
            </form>

            {error && <p className={styles.error}>{error}</p>}

            <p className={styles.privacy}>
              {isZh 
                ? '🔒 我们承诺：邮箱仅用于产品更新，绝不分享给第三方。可随时退订。'
                : '🔒 We promise: Your email is only for product updates, never shared with third parties. Unsubscribe anytime.'}
            </p>
          </>
        ) : (
          <div className={styles.success}>
            <div className={styles.successIcon}>✅</div>
            <h2>{isZh ? '已加入等待列表！' : 'You\'re on the list!'}</h2>
            <p>
              {isZh 
                ? '我们会在功能上线时第一时间通知你。感谢你的支持！'
                : 'We\'ll notify you as soon as it\'s ready. Thank you for your support!'}
            </p>
            <button onClick={onClose} className={styles.closeSuccessButton}>
              {isZh ? '关闭' : 'Close'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
