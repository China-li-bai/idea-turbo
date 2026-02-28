'use client';

import { useState, useEffect } from 'react';
import { 
  JournalEntry, 
  JournalSettings, 
  saveJournalEntry, 
  getSettings, 
  saveSettings, 
  generateId,
  calculateNextReview,
  initDB
} from '@/lib/journal/storage';
import { translateText, detectLanguage } from '@/lib/journal/translation';
import { JournalTranslation } from '@/lib/journal/storage';

const TEMPLATES = [
  { id: 'gratitude', label: '感恩日记', prompt: '今天我要感谢...' },
  { id: 'daily', label: '日常记录', prompt: '今天发生了...' },
  { id: 'reflection', label: '每日反思', prompt: '今天我学到了...' },
  { id: 'goal', label: '目标进展', prompt: '我的目标是...' },
  { id: 'free', label: '自由书写', prompt: '' },
];

const DEFAULT_SETTINGS: JournalSettings = {
  targetLanguages: ['en'],
  defaultTemplate: 'daily',
  dailyGoal: 1,
  autoTranslate: true,
  audioSpeed: 1.0,
};

interface JournalInputProps {
  onComplete?: (entry: JournalEntry) => void;
}

export function JournalInput({ onComplete }: JournalInputProps) {
  const [text, setText] = useState('');
  const [template, setTemplate] = useState('daily');
  const [targetLanguages, setTargetLanguages] = useState<string[]>(['en']);
  const [difficulty, setDifficulty] = useState<'simple' | 'medium' | 'advanced'>('medium');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translations, setTranslations] = useState<JournalTranslation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initDB().then(() => {
      setDbReady(true);
      loadSettings();
    }).catch(console.error);
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await getSettings();
      if (settings) {
        setTargetLanguages(settings.targetLanguages);
        setTemplate(settings.defaultTemplate);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleTranslate = async () => {
    if (!text.trim()) {
      setError('请输入日记内容');
      return;
    }

    setIsTranslating(true);
    setError(null);

    try {
      const sourceLanguage = detectLanguage(text);
      const results = await translateText({
        text,
        sourceLanguage,
        targetLanguages,
        difficulty,
      });
      setTranslations(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : '翻译失败');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSave = async () => {
    if (!text.trim()) {
      setError('请输入日记内容');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const sourceLanguage = detectLanguage(text);
      const entry: JournalEntry = {
        id: generateId(),
        originalText: text,
        originalLanguage: sourceLanguage,
        translations,
        audioUrls: {},
        tags: [],
        template,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        learningStatus: 'pending',
        reviewCount: 0,
        lastReviewedAt: null,
        nextReviewAt: calculateNextReview(0),
      };

      await saveJournalEntry(entry);
      
      const settings = await getSettings() || DEFAULT_SETTINGS;
      settings.targetLanguages = targetLanguages;
      await saveSettings(settings);

      if (onComplete) {
        onComplete(entry);
      }

      setText('');
      setTranslations([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedTemplate = TEMPLATES.find(t => t.id === template);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          写日记
        </h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            选择模板
          </label>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  template === t.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            日记内容
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={selectedTemplate?.prompt || '写下今天的故事...'}
            className="w-full h-48 px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            目标语言
          </label>
          <div className="flex flex-wrap gap-2">
            {['en', 'fr', 'de', 'es', 'it', 'ja', 'ko'].map(lang => (
              <button
                key={lang}
                onClick={() => {
                  setTargetLanguages(prev => 
                    prev.includes(lang) 
                      ? prev.filter(l => l !== lang)
                      : [...prev, lang]
                  );
                }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  targetLanguages.includes(lang)
                    ? 'bg-green-500 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            翻译难度
          </label>
          <div className="flex gap-2">
            {(['simple', 'medium', 'advanced'] as const).map(level => (
              <button
                key={level}
                onClick={() => setDifficulty(level)}
                className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  difficulty === level
                    ? 'bg-purple-500 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {level === 'simple' ? '简单' : level === 'medium' ? '中等' : '高级'}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleTranslate}
            disabled={isTranslating || !text.trim()}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isTranslating ? '翻译中...' : '翻译'}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !text.trim()}
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {translations.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            翻译结果
          </h3>
          <div className="space-y-4">
            {translations.map((t, index) => (
              <div key={index} className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    {t.language.toUpperCase()}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded">
                    {t.difficulty === 'simple' ? '简单' : t.difficulty === 'medium' ? '中等' : '高级'}
                  </span>
                </div>
                <p className="text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap">
                  {t.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
