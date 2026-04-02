'use client';

import { useState } from 'react';
import styles from './SyncWaitlistModal.module.scss';
import { useI18nStore } from '@/lib/stores/i18nStore';
import { useTranslation } from '@/lib/utils/translations';

interface SyncWaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SyncWaitlistModal({ isOpen, onClose }: SyncWaitlistModalProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const { locale } = useI18nStore();
  const t = useTranslation(locale);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setError(t.waitlist.errorInvalidEmail);
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
        setError(data.error || t.waitlist.errorSubmissionFailed);
      }
    } catch {
      setError(t.waitlist.errorNetwork);
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
              {t.waitlist.title}
            </h2>

            <p className={styles.description}>
              {t.waitlist.description}
            </p>

            <div className={styles.timeline}>
              <span className={styles.badge}>
                {t.waitlist.expectedDate}
              </span>
            </div>

            <div className={styles.benefits}>
              <h3>{t.waitlist.benefitsTitle}</h3>
              <ul>
                <li>{t.waitlist.benefitEarlyAccess}</li>
                <li>{t.waitlist.benefitDiscount}</li>
                <li>{t.waitlist.benefitVoting}</li>
              </ul>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.waitlist.emailPlaceholder}
                className={styles.emailInput}
                disabled={isSubmitting}
              />

              <button
                type="submit"
                className={styles.submitButton}
                disabled={isSubmitting}
              >
                {isSubmitting ? t.waitlist.submitting : t.waitlist.submitButton}
              </button>
            </form>

            {error && <p className={styles.error}>{error}</p>}

            <p className={styles.privacy}>
              {t.waitlist.privacy}
            </p>
          </>
        ) : (
          <div className={styles.success}>
            <div className={styles.successIcon}>✅</div>
            <h2>{t.waitlist.successTitle}</h2>
            <p>
              {t.waitlist.successMessage}
            </p>
            <button onClick={onClose} className={styles.closeSuccessButton}>
              {t.waitlist.closeButton}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
