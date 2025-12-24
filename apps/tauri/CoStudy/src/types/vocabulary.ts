// 词汇卡片的扩展数据结构
export interface VocabularyData {
  pronunciation?: {
    ipa: string;
    audio_url?: string;
    accent?: 'US' | 'UK';
  };
  definitions: Array<{
    part_of_speech: string;
    meaning: string;
    translation: string;
    example?: string;
    example_translation?: string;
  }>;
  etymology?: string;
  synonyms?: string[];
  antonyms?: string[];
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  frequency_rank?: number;
  mnemonic?: string;
}
