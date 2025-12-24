import React from 'react';
import { Volume2, BookOpen, Brain, Link2 } from 'lucide-react';
import { useVocabularyCard } from '../../store/hooks/vocabulary';

interface VocabularyCardBackProps {
  cardId: string;
  backContent: string; // 用于非词汇卡片的简单显示
  className?: string;
}

export const VocabularyCardBack: React.FC<VocabularyCardBackProps> = ({ 
  cardId,
  backContent, 
  className = '' 
}) => {
  const vocabData = useVocabularyCard(cardId);
  
  // 播放音频
  const playAudio = React.useCallback((audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audio.play().catch(err => console.error('Failed to play audio:', err));
  }, []);

  // 如果没有词汇数据，显示简单文本
  if (!vocabData) {
    return (
      <p className={`text-lg md:text-xl font-normal leading-normal pb-3 pt-1 px-4 text-center ${className}`}>
        {backContent}
      </p>
    );
  }

  // 防护性检查：确保 definitions 是数组
  if (!Array.isArray(vocabData.definitions)) {
    return (
      <p className={`text-lg md:text-xl font-normal leading-normal pb-3 pt-1 px-4 text-center ${className}`}>
        {backContent}
      </p>
    );
  }

  // 使用结构化数据渲染
  return (
    <div className={`vocabulary-card-back ${className}`}>
      {/* 发音部分 */}
      {(vocabData.ipa_pronunciation || vocabData.audio_url || vocabData.accent) && (
        <div className="pronunciation-section flex items-center justify-center gap-3 mb-6">
          {vocabData.ipa_pronunciation && (
            <span className="ipa text-lg text-muted-foreground">
              {vocabData.ipa_pronunciation}
            </span>
          )}
          {vocabData.audio_url && (
            <button
              onClick={() => playAudio(vocabData.audio_url!)}
              className="audio-btn p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="播放发音"
            >
              <Volume2 className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
          {vocabData.accent && (
            <span className="accent-badge px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs">
              {vocabData.accent}
            </span>
          )}
        </div>
      )}

      {/* 释义列表 */}
      <div className="definitions-section space-y-4 mb-6">
        {vocabData.definitions.map((def) => (
          <div key={def.id} className="definition-item">
            <div className="flex items-start gap-3">
              <span className="pos-tag text-sm font-medium text-blue-600 dark:text-blue-400 mt-1 min-w-[60px]">
                [{def.part_of_speech}]
              </span>
              <div className="flex-1">
                <p className="translation font-medium">
                  {def.meaning_zh}
                </p>
                <p className="meaning text-sm mt-1">
                  {def.meaning_en}
                </p>
                {def.example_en && (
                  <div className="example mt-3 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                    <p className="text-sm italic">
                      {def.example_en}
                    </p>
                    {def.example_zh && (
                      <p className="text-sm mt-1">
                        {def.example_zh}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 词源信息 */}
      {vocabData.etymology && (
        <div className="etymology-section mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <h4 className="flex items-center gap-2 font-medium text-amber-800 dark:text-amber-200 mb-2">
            <BookOpen className="w-4 h-4" />
            词源
          </h4>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {vocabData.etymology}
          </p>
        </div>
      )}

      {/* 同反义词 */}
      {(vocabData.synonyms.length > 0 || vocabData.antonyms.length > 0) && (
        <div className="related-words-section mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {vocabData.synonyms.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 font-medium text-green-700 dark:text-green-300 mb-2">
                <Link2 className="w-4 h-4" />
                同义词
              </h4>
              <div className="flex flex-wrap gap-2">
                {vocabData.synonyms.map((word, idx) => (
                  <span 
                    key={idx}
                    className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-sm"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          )}
          {vocabData.antonyms.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 font-medium text-red-700 dark:text-red-300 mb-2">
                <Link2 className="w-4 h-4 rotate-180" />
                反义词
              </h4>
              <div className="flex flex-wrap gap-2">
                {vocabData.antonyms.map((word, idx) => (
                  <span 
                    key={idx}
                    className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-sm"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 记忆技巧 */}
      {vocabData.mnemonic && (
        <div className="mnemonic-section p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <h4 className="flex items-center gap-2 font-medium text-purple-800 dark:text-purple-200 mb-2">
            <Brain className="w-4 h-4" />
            记忆技巧
          </h4>
          <p className="text-sm text-purple-700 dark:text-purple-300">
            {vocabData.mnemonic}
          </p>
        </div>
      )}

      {/* 元数据 */}
      {(vocabData.difficulty_level || vocabData.frequency_rank) && (
        <div className="metadata-section mt-6 flex items-center justify-center gap-4 text-sm text-muted-foreground">
          {vocabData.difficulty_level && (
            <span>难度: {vocabData.difficulty_level}</span>
          )}
          {vocabData.frequency_rank && (
            <span>词频排名: #{vocabData.frequency_rank}</span>
          )}
        </div>
      )}
    </div>
  );
};