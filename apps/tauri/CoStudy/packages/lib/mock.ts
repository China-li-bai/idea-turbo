import { createCard, scheduleNext, parseRating } from "./fsrs";
import type { FsrsRating, DifficultyLevel, AccentType, DeckType } from "./schema";

export type MockCardSeed = {
  front: string;
  back: string;
  fsrsCard: ReturnType<typeof createCard>;
  reviews?: Array<{ rating: FsrsRating; durationMs?: number }>;
  type: 'flashcard' | 'vocabulary';
  vocabularyData?: MockVocabularyData;
};

export type MockVocabularyData = {
  word: string;
  language_code?: string;
  difficulty_level?: DifficultyLevel;
  frequency_rank?: number;
  ipa_pronunciation?: string;
  audio_url?: string;
  accent?: AccentType;
  etymology?: string;
  mnemonic?: string;
  definitions: Array<{
    part_of_speech: string;
    meaning_en: string;
    meaning_zh: string;
    example_en?: string;
    example_zh?: string;
  }>;
  synonyms?: string[];
  antonyms?: string[];
};

export type MockDeck = {
  name: string;
  description?: string;
  deck_type: DeckType;
  cards: MockCardSeed[];
};

// 创建带有不同状态的模拟卡片（支持未来/过去到期日）
const createMockCard = (
  front: string,
  back: string,
  state?: "new" | "learning" | "review" | "relearning",
  dueShiftDays?: number, // 正数=未来，负数=过去，0/undefined=保持默认
  reviews?: Array<{ rating: FsrsRating; durationMs?: number }>,
  type: 'flashcard' | 'vocabulary' = 'flashcard',
  vocabularyData?: MockVocabularyData
): MockCardSeed => {
  const now = new Date();
  let card = createCard(now);

  if (state && state !== "new") {
    switch (state) {
      case "learning":
        card = scheduleNext(card, parseRating("again"), now).card;
        break;
      case "review":
        card = scheduleNext(card, parseRating("good"), now).card;
        card = scheduleNext(card, parseRating("good"), now).card;
        break;
      case "relearning":
        card = scheduleNext(card, parseRating("good"), now).card;
        card = scheduleNext(card, parseRating("good"), now).card;
        card = scheduleNext(card, parseRating("again"), now).card;
        break;
    }
  }

  if (typeof dueShiftDays === "number") {
    const targetDue = new Date(now.getTime() + dueShiftDays * 24 * 60 * 60 * 1000);
    card = { ...card, due: targetDue } as any;
  }

  return { front, back, fsrsCard: card, reviews, type, vocabularyData };
};

// 创建词汇卡片的辅助函数
const createVocabularyCard = (
  word: string,
  state?: "new" | "learning" | "review" | "relearning",
  dueShiftDays?: number,
  reviews?: Array<{ rating: FsrsRating; durationMs?: number }>,
  vocabularyData?: Partial<MockVocabularyData>
): MockCardSeed => {
  const defaultVocabData: MockVocabularyData = {
    word,
    language_code: 'en',
    difficulty_level: 'intermediate',
    definitions: [
      {
        part_of_speech: 'n.',
        meaning_en: `Definition of ${word}`,
        meaning_zh: `${word}的中文释义`
      }
    ],
    ...vocabularyData
  };

  return createMockCard(
    word, 
    '', // 词汇卡片的 back 由组件动态生成
    state,
    dueShiftDays,
    reviews,
    'vocabulary',
    defaultVocabData
  );
};

// 覆盖更丰富的 7 天到期分布与评分分布，以便 Dashboard 图表展示
export const mockDecks: MockDeck[] = [
  // 1. 纯 Flashcard Deck
  {
    name: "General Knowledge",
    description: "Basic knowledge flashcards for learning",
    deck_type: 'flashcard',
    cards: [
      // 今日到期（0天）- 普通flashcard
      createMockCard("Capital of France?", "Paris", "new", 0, [
        { rating: "good", durationMs: 8000 },
      ]),
      createMockCard("2 + 2?", "4", "learning", 0, [
        { rating: "again", durationMs: 12000 },
      ]),
      createMockCard("Powerhouse of the cell?", "Mitochondria", "review", 0, [
        { rating: "hard", durationMs: 9000 },
      ]),

      // 明天到期（+1天）
      createMockCard("Largest planet?", "Jupiter", "review", 1, [
        { rating: "good", durationMs: 7000 },
      ]),
      createMockCard("Boiling point of water?", "100°C", "review", 1, [
        { rating: "easy", durationMs: 6000 },
      ]),
      createMockCard("Author of Hamlet?", "Shakespeare", "new", 1),

      // +2天  
      createMockCard("Speed of light?", "299,792 km/s", "review", 2, [
        { rating: "hard", durationMs: 9500 },
      ]),
      createMockCard("E=mc^2 belongs to?", "Einstein", "learning", 2),

      // +3天
      createMockCard("Primary colors?", "Red, Blue, Yellow", "review", 3, [
        { rating: "again", durationMs: 11000 },
      ]),
      createMockCard("Python list type?", "[]", "new", 3),

      // 额外生成一些flashcard
      ...Array.from({ length: 40 }, (_, i) => {
        const idx = i + 1;
        const stateCycle = ((): "new" | "learning" | "review" | "relearning" => {
          const m = idx % 4;
          return m === 0 ? "new" : m === 1 ? "learning" : m === 2 ? "review" : "relearning";
        })();
        const dueShift = idx % 7;
        const ratingCycle = ((): FsrsRating => {
          const m = idx % 4;
          return m === 0 ? "again" : m === 1 ? "hard" : m === 2 ? "good" : "easy";
        })();
        const duration = 6000 + (idx % 7) * 500;
        
        return createMockCard(
          `General Q ${idx}`,
          `General A ${idx}`,
          stateCycle,
          dueShift,
          [{ rating: ratingCycle, durationMs: duration }],
          'flashcard'
        );
      })
    ]
  },

  // 2. 纯 Vocabulary Deck
  {
    name: "Advanced English Vocabulary",
    description: "High-level English words for advanced learners",
    deck_type: 'vocabulary',
    cards: [
      // 今日到期（0天）- 词汇卡片
      createVocabularyCard("serendipity", "new", 0, [
        { rating: "good", durationMs: 8000 },
      ], {
        difficulty_level: 'advanced',
        frequency_rank: 15000,
        ipa_pronunciation: '/ˌserənˈdɪpɪti/',
        etymology: "From Persian fairy tale 'The Three Princes of Serendip'",
        mnemonic: "Serendipity = happy accident, like finding love unexpectedly",
        definitions: [
          {
            part_of_speech: 'n.',
            meaning_en: 'The faculty of making fortunate discoveries by accident',
            meaning_zh: '意外发现有价值事物的能力；机缘巧合',
            example_en: 'It was pure serendipity that led her to discover the cure.',
            example_zh: '她发现这种疗法纯属机缘巧合。'
          }
        ],
        synonyms: ['luck', 'fortune', 'chance'],
        antonyms: ['misfortune', 'bad luck']
      }),
      
      createVocabularyCard("ubiquitous", "learning", 0, [
        { rating: "again", durationMs: 12000 },
      ], {
        difficulty_level: 'advanced',
        frequency_rank: 8000,
        ipa_pronunciation: '/juːˈbɪkwɪtəs/',
        definitions: [
          {
            part_of_speech: 'adj.',
            meaning_en: 'Present, appearing, or found everywhere',
            meaning_zh: '普遍存在的；无所不在的',
            example_en: 'Smartphones are now ubiquitous in modern society.',
            example_zh: '智能手机现在在现代社会中无处不在。'
          }
        ],
        synonyms: ['omnipresent', 'pervasive', 'universal'],
        antonyms: ['rare', 'scarce', 'absent']
      }),

      // 明天到期（+1天）
      createVocabularyCard("ephemeral", "review", 1, [
        { rating: "good", durationMs: 7000 },
      ], {
        difficulty_level: 'advanced',
        frequency_rank: 12000,
        ipa_pronunciation: '/ɪˈfemərəl/',
        etymology: "From Greek ephēmeros 'lasting only a day'",
        definitions: [
          {
            part_of_speech: 'adj.',
            meaning_en: 'Lasting for a very short time',
            meaning_zh: '短暂的；转瞬即逝的',
            example_en: 'The beauty of cherry blossoms is ephemeral.',
            example_zh: '樱花的美丽是短暂的。'
          }
        ],
        synonyms: ['transient', 'fleeting', 'temporary'],
        antonyms: ['permanent', 'lasting', 'eternal']
      }),

      createVocabularyCard("pragmatic", "new", 1, undefined, {
        difficulty_level: 'intermediate',
        frequency_rank: 5000,
        ipa_pronunciation: '/præɡˈmætɪk/',
        definitions: [
          {
            part_of_speech: 'adj.',
            meaning_en: 'Dealing with things sensibly and realistically',
            meaning_zh: '实用的；务实的',
            example_en: 'She took a pragmatic approach to solving the problem.',
            example_zh: '她采取了务实的方法来解决问题。'
          }
        ],
        synonyms: ['practical', 'realistic', 'sensible'],
        antonyms: ['idealistic', 'impractical', 'theoretical']
      }),

      // 更多词汇卡片
      ...['mellifluous', 'conundrum', 'cacophony', 'luminous', 'resilient', 'meticulous', 
          'eloquent', 'tenacious', 'innovative', 'authentic', 'versatile', 'profound', 
          'ambiguous', 'meticulous', 'enigmatic'].map((word, i) => 
        createVocabularyCard(word, 
          i % 4 === 0 ? "new" : i % 4 === 1 ? "learning" : i % 4 === 2 ? "review" : "relearning",
          i % 7,
          [{ rating: (["again", "hard", "good", "easy"] as FsrsRating[])[i % 4], durationMs: 6000 + i * 200 }],
          {
            difficulty_level: i % 3 === 0 ? 'beginner' : i % 3 === 1 ? 'intermediate' : 'advanced',
            frequency_rank: Math.floor(Math.random() * 20000) + 1000,
            definitions: [
              {
                part_of_speech: i % 2 === 0 ? 'n.' : 'adj.',
                meaning_en: `Definition of ${word}`,
                meaning_zh: `${word}的中文释义`
              }
            ]
          }
        )
      )
    ]
  },

  // 3. 混合类型 Deck
  {
    name: "Mixed Study Deck",
    description: "A combination of flashcards and vocabulary for comprehensive learning",
    deck_type: 'mixed',
    cards: [
      // 一些 flashcard
      createMockCard("HTTP status 200?", "OK", "review", 0, [
        { rating: "good", durationMs: 8000 },
      ], 'flashcard'),
      createMockCard("CSS Flexbox axis?", "Main/Cross", "review", 1, [
        { rating: "easy", durationMs: 6500 },
      ], 'flashcard'),

      // 一些 vocabulary
      createVocabularyCard("sophisticated", "new", 0, undefined, {
        difficulty_level: 'intermediate',
        definitions: [
          {
            part_of_speech: 'adj.',
            meaning_en: 'Having great knowledge or experience',
            meaning_zh: '复杂的；老练的'
          }
        ]
      }),

      // 更多混合内容
      ...Array.from({ length: 20 }, (_, i) => {
        const idx = i + 1;
        const stateCycle = ((): "new" | "learning" | "review" | "relearning" => {
          const m = idx % 4;
          return m === 0 ? "new" : m === 1 ? "learning" : m === 2 ? "review" : "relearning";
        })();
        const dueShift = idx % 7;
        const ratingCycle = ((): FsrsRating => {
          const m = idx % 4;
          return m === 0 ? "again" : m === 1 ? "hard" : m === 2 ? "good" : "easy";
        })();
        const duration = 6000 + (idx % 7) * 500;
        
        // 50-50 混合
        if (idx % 2 === 0) {
          return createMockCard(
            `Mixed Q ${idx}`,
            `Mixed A ${idx}`,
            stateCycle,
            dueShift,
            [{ rating: ratingCycle, durationMs: duration }],
            'flashcard'
          );
        } else {
          const words = ['dynamic', 'coherent', 'substantial', 'vivid', 'intricate'];
          const word = words[idx % words.length] || `word-${idx}`;
          return createVocabularyCard(
            word,
            stateCycle,
            dueShift,
            [{ rating: ratingCycle, durationMs: duration }],
            {
              difficulty_level: 'intermediate',
              definitions: [
                {
                  part_of_speech: 'adj.',
                  meaning_en: `Definition of ${word}`,
                  meaning_zh: `${word}的中文释义`
                }
              ]
            }
          );
        }
      })
    ]
  }
];

// 保持向后兼容 - 使用第一个 deck 作为默认值
export const mockDeck = mockDecks[0];
