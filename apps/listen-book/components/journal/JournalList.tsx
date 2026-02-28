'use client';

import { useState, useEffect } from 'react';
import { JournalEntry, getAllJournalEntries, deleteJournalEntry, getEntriesForReview } from '@/lib/journal/storage';

interface JournalListProps {
  onSelectEntry?: (entry: JournalEntry) => void;
}

export function JournalList({ onSelectEntry }: JournalListProps) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [reviewEntries, setReviewEntries] = useState<JournalEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'review'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    setIsLoading(true);
    try {
      const all = await getAllJournalEntries();
      const review = await getEntriesForReview();
      setEntries(all.sort((a, b) => b.createdAt - a.createdAt));
      setReviewEntries(review);
    } catch (error) {
      console.error('Failed to load entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除这篇日记吗？')) {
      try {
        await deleteJournalEntry(id);
        loadEntries();
      } catch (error) {
        console.error('Failed to delete entry:', error);
      }
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: JournalEntry['learningStatus']) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    };
    const labels = {
      pending: '待复习',
      in_progress: '学习中',
      completed: '已掌握'
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const displayEntries = activeTab === 'all' ? entries : reviewEntries;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          我的日记
        </h2>
        {reviewEntries.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              全部 ({entries.length})
            </button>
            <button
              onClick={() => setActiveTab('review')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'review'
                  ? 'bg-orange-500 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              待复习 ({reviewEntries.length})
            </button>
          </div>
        )}
      </div>

      {displayEntries.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
          <p>还没有日记</p>
          <p className="text-sm mt-2">开始记录你的第一篇日记吧</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayEntries.map(entry => (
            <div
              key={entry.id}
              onClick={() => onSelectEntry?.(entry)}
              className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      {formatDate(entry.createdAt)}
                    </span>
                    {getStatusBadge(entry.learningStatus)}
                  </div>
                  <p className="text-zinc-900 dark:text-zinc-100 line-clamp-2">
                    {entry.originalText.substring(0, 100)}
                    {entry.originalText.length > 100 ? '...' : ''}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDelete(entry.id, e)}
                  className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  翻译: {entry.translations.map(t => t.language.toUpperCase()).join(', ')}
                </span>
                {entry.reviewCount > 0 && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    复习 {entry.reviewCount} 次
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
