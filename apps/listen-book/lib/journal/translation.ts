import { JournalTranslation } from './storage';
import { getBackendLanguageCode } from '../tts/languageUtils';

const TRANSLATION_API_URL = process.env.NEXT_PUBLIC_TRANSLATION_API_URL || '/api/translate';

export interface TranslateOptions {
  text: string;
  sourceLanguage: string;
  targetLanguages: string[];
  difficulty?: 'simple' | 'medium' | 'advanced';
}

export interface TranslationResult {
  language: string;
  text: string;
  difficulty: 'simple' | 'medium' | 'advanced';
}

export async function translateText(options: TranslateOptions): Promise<TranslationResult[]> {
  const { text, sourceLanguage, targetLanguages, difficulty = 'medium' } = options;

  try {
    const response = await fetch(TRANSLATION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        sourceLanguage: getBackendLanguageCode(sourceLanguage),
        targetLanguages: targetLanguages.map(lang => getBackendLanguageCode(lang)),
        difficulty,
      }),
    });

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data = await response.json();
    return data.translations;
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
}

export async function translateWithAI(
  text: string,
  targetLanguage: string,
  difficulty: 'simple' | 'medium' | 'advanced' = 'medium'
): Promise<string> {
  const prompt = getTranslationPrompt(text, targetLanguage, difficulty);
  
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator. Translate the following text accurately and naturally.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'gpt-4o-mini',
    }),
  });

  if (!response.ok) {
    throw new Error(`AI translation error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

function getTranslationPrompt(text: string, targetLanguage: string, difficulty: string): string {
  const difficultyInstructions = {
    simple: 'Use simple vocabulary and short sentences. Avoid idioms and complex grammatical structures.',
    medium: 'Use moderately complex vocabulary. Mix short and medium-length sentences.',
    advanced: 'Use rich vocabulary, idiomatic expressions, and complex sentence structures.',
  };

  return `Translate the following Chinese text to ${targetLanguage}.

Difficulty level: ${difficulty}
Instruction: ${difficultyInstructions[difficulty as keyof typeof difficultyInstructions] || difficultyInstructions.medium}

Original text:
${text}

Translation:`;
}

export function detectLanguage(text: string): string {
  const chineseRegex = /[\u4e00-\u9fff]/;
  if (chineseRegex.test(text)) {
    return 'zh-CN';
  }
  return 'en';
}
