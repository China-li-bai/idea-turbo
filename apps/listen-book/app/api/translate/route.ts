import { NextRequest, NextResponse } from 'next/server';

const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY;
const ZHIPU_API_URL = process.env.ZHIPU_API_URL || 'https://open.bigmodel.cn/api/paas/v4';

interface TranslateRequestBody {
  text: string;
  sourceLanguage: string;
  targetLanguages: string[];
  difficulty?: 'simple' | 'medium' | 'advanced';
}

export async function POST(request: NextRequest) {
  try {
    const body: TranslateRequestBody = await request.json();
    const { text, sourceLanguage, targetLanguages, difficulty = 'medium' } = body;

    if (!text || !targetLanguages || targetLanguages.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!ZHIPU_API_KEY) {
      return NextResponse.json(
        { error: 'ZHIPU_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const results = await Promise.all(
      targetLanguages.map(async (targetLang) => {
        const translation = await translateWithZhipu(text, sourceLanguage, targetLang, difficulty);
        return {
          language: targetLang,
          text: translation,
          difficulty,
        };
      })
    );

    return NextResponse.json({ translations: results });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: 'Translation failed' },
      { status: 500 }
    );
  }
}

async function translateWithZhipu(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  difficulty: 'simple' | 'medium' | 'advanced'
): Promise<string> {
  const difficultyInstructions = {
    simple: 'Use simple vocabulary (A1-A2 level) and short sentences. Avoid idioms, metaphors, and complex grammatical structures. Focus on everyday, common words.',
    medium: 'Use moderately complex vocabulary (B1-B2 level). Mix short and medium-length sentences. Some idiomatic expressions are acceptable.',
    advanced: 'Use rich vocabulary (C1-C2 level), authentic idiomatic expressions, and complex sentence structures. Aim for near-native fluency.',
  };

  const languageNames: Record<string, string> = {
    'en': 'English',
    'fr': 'French',
    'de': 'German',
    'es': 'Spanish',
    'it': 'Italian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh-CN': 'Simplified Chinese',
  };

  const targetLangName = languageNames[targetLanguage] || targetLanguage;
  const sourceLangName = languageNames[sourceLanguage] || sourceLanguage;

  const prompt = `You are a professional translator specializing in language learning materials.

Translate the following text from ${sourceLangName} to ${targetLangName}.

DIFFICULTY LEVEL: ${difficulty.toUpperCase()}
INSTRUCTION: ${difficultyInstructions[difficulty]}

REQUIREMENTS:
1. Provide ONLY the translation, nothing else
2. Do not add explanations or notes
3. Preserve the original meaning and tone
4. Keep the same format (paragraphs, bullet points, etc.)
5. If the text contains slang or cultural references, provide a natural equivalent in ${targetLangName}

Original text:
${text}

Translation in ${targetLangName}:`;

  const response = await fetch(`${ZHIPU_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ZHIPU_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'glm-4-flash',
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator. Always provide accurate, natural-sounding translations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Zhipu API error: ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}
