/**
 * Simple PGlite schema loader
 * 
 * Loads the schema.sql file and executes it to initialize the database.
 * This is the simplest approach - no complex migrations, just read the SQL file.
 */

import { PGlite } from "@electric-sql/pglite";
import schema from "./schema.sql?raw";

export async function initializeSchema(db: PGlite) {
  try {
    // Execute the entire schema.sql file
    await db.exec(schema);
    console.log("Database schema initialized successfully");
  } catch (error) {
    console.error("Failed to initialize database schema:", error);
    throw error;
  }
}

// 项目级通用 Schema 类型与常量（单一来源）
export type FsrsState = 'new' | 'learning' | 'review' | 'relearning'
export type FsrsRating = 'again' | 'hard' | 'good' | 'easy'
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'
export type AccentType = 'US' | 'UK' | 'AU'
export type DeckType = 'flashcard' | 'vocabulary' | 'mixed'
export type ThemeType = 'light' | 'dark' | 'system'

export const Tables = {
  decks: 'decks',
  cards: 'cards',
  review_logs: 'review_logs',
  vocabulary_cards: 'vocabulary_cards',
  vocabulary_definitions: 'vocabulary_definitions',
  vocabulary_synonyms: 'vocabulary_synonyms',
  vocabulary_antonyms: 'vocabulary_antonyms',
  user_settings: 'user_settings',
} as const

export interface DeckRow {
  id: string
  name: string
  description?: string | null
  deck_type: DeckType
  created_at: string
  updated_at: string
}

export interface CardRow {
  id: string
  deck_id: string
  front: string
  back: string

  // FSRS 核心参数 (完全对应 ts-fsrs Card)
  due: string
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  reps: number
  lapses: number
  learning_steps: number  // 新增：FSRS 学习步骤计数
  state: FsrsState
  last_review?: string | null

  // 元数据
  created_at: string
  updated_at: string
}

export interface ReviewRow {
  id: string
  card_id: string
  rating: FsrsRating
  review_time: string
  review_duration_ms?: number | null

  state_before: FsrsState
  state_after: FsrsState
  stability_before: number
  stability_after: number
  difficulty_before: number
  difficulty_after: number
}

export interface VocabularyCardRow {
  card_id: string
  word: string
  language_code: string
  difficulty_level?: DifficultyLevel | null
  frequency_rank?: number | null
  ipa_pronunciation?: string | null
  audio_url?: string | null
  accent?: AccentType | null
  etymology?: string | null
  mnemonic?: string | null
  created_at: string
  updated_at: string
}

export interface VocabularyDefinitionRow {
  id: string
  card_id: string
  part_of_speech: string
  meaning_en: string
  meaning_zh: string
  example_en?: string | null
  example_zh?: string | null
  definition_order: number
  created_at: string
}

export interface VocabularySynonymRow {
  card_id: string
  synonym: string
}

export interface VocabularyAntonymRow {
  card_id: string
  antonym: string
}

// ============================================
// Parallel Study Space Types
// ============================================

export type SessionType = 'solo' | 'group'
export type PulseType = 'card_review' | 'streak' | 'milestone'
export type PulseIntensity = FsrsRating  // Reuse existing type

export interface StudySessionRow {
  id: string
  user_id: string
  room_id?: string | null
  started_at: string
  ended_at?: string | null
  duration_minutes?: number | null
  cards_reviewed: number
  cards_correct: number
  focus_score?: number | null
  session_type: SessionType
  created_at: string
}

export interface UserProfileRow {
  id: string
  display_name: string
  avatar_url?: string | null
  avatar_color?: string | null
  preferred_session_duration: number
  daily_goal: number
  total_study_time: number
  current_streak: number
  longest_streak: number
  created_at: string
  updated_at: string
}

export interface UserSettingsRow {
  id: string
  user_id: string
  language: string
  theme: ThemeType
  daily_reminders: boolean
  reminder_time: string
  fsrs_parameters: Record<string, any>  // JSONB stored as object
  created_at: string
  updated_at: string
}

export interface StudyRoomHistoryRow {
  id: string
  room_id: string
  room_name?: string | null
  participant_count?: number | null
  joined_at: string
  left_at?: string | null
  cards_reviewed: number
  duration_minutes?: number | null
  created_at: string
}

export interface ActivityPulseRow {
  id: string
  session_id: string
  pulse_type: PulseType
  intensity?: PulseIntensity | null
  card_id?: string | null
  value?: number | null
  created_at: string
}

export interface AchievementRow {
  id: string
  user_id: string
  achievement_type: string
  achievement_name: string
  achievement_description?: string | null
  target_value?: number | null
  current_value?: number | null
  is_unlocked: boolean
  unlocked_at?: string | null
  created_at: string
}

export interface DailyStatsRow {
  id: string
  user_id: string
  stat_date: string
  cards_reviewed: number
  study_time_minutes: number
  sessions_count: number
  group_sessions: number
  pulses_sent: number
  reactions_received: number
  created_at: string
}

// ============================================
// P2P Message Types (WebRTC via Trystero)
// ============================================

export interface PeerMessage {
  type: 'pulse' | 'focus-sync' | 'progress' | 'reaction' | 'presence'
  userId: string
  timestamp: number
}

export interface PulseMessage extends PeerMessage {
  type: 'pulse'
  intensity: PulseIntensity
  cardId?: string
}

export interface FocusSyncMessage extends PeerMessage {
  type: 'focus-sync'
  action: 'start' | 'pause' | 'resume' | 'complete'
  duration: number  // seconds
  remaining?: number  // seconds
}

export interface ProgressMessage extends PeerMessage {
  type: 'progress'
  cardsReviewed: number
  sessionDuration: number  // minutes
}

export interface ReactionMessage extends PeerMessage {
  type: 'reaction'
  targetUserId: string
  emoji: '👏' | '🔥' | '💪' | '🎉'
}

export interface PresenceMessage extends PeerMessage {
  type: 'presence'
  status: 'joined' | 'left' | 'active' | 'idle'
  displayName: string
  avatarColor: string
}

export type P2PMessage =
  | PulseMessage
  | FocusSyncMessage
  | ProgressMessage
  | ReactionMessage
  | PresenceMessage

// 便捷方法：确保 Schema（别名）
export async function ensureSchema(db: PGlite) {
  await initializeSchema(db)
}