/**
 * Free Spaced Repetition Scheduler (FSRS)
 * 基于 DSR（Difficulty, Stability, Retrievability）记忆模型的调度算法
 * 采用社区开源实现：ts-fsrs [1][2]
 *
 * 设计遵循 Linus × Jobs × INTJ 原则：
 * - 数据结构优先，最小抽象，清晰数据流
 * - 函数签名即契约，移除重复与多余状态
 * - 保持移动端优先的可用性（由上层 UI 决定）
 */

import {
  fsrs as createFsrs,
  FSRS,
  Card as FsrsCard,
  RecordLog,
  RecordLogItem,
  Rating,
  Grade,
  State,
  generatorParameters,
  FSRSParameters,
  createEmptyCard,
} from "ts-fsrs"
import type { CardRow, FsrsState, FsrsRating } from './schema'

// 类型与枚举导出（保持与库一致，避免不必要转换）
export type FSRSCard = FsrsCard
export type { FSRSParameters, RecordLog, RecordLogItem }
export { Rating as FSRSRating }

// 默认参数：可根据业务需求在调用处覆盖
const defaultParams: FSRSParameters = generatorParameters({
  request_retention: 0.9, // 目标记忆保留率（0.8~0.9 推荐）
  maximum_interval: 100, // 最大间隔天数（如需限制工作量可调小）
  enable_fuzz: true, // 是否对间隔做轻微扰动，避免卡片扎堆
  enable_short_term: true, // 是否启用短期学习步骤
})

// 初始化 FSRS 调度器（可传入部分参数覆盖）
export function initFSRS(params?: Partial<FSRSParameters>): FSRS {
  const merged = params ? generatorParameters({ ...defaultParams, ...params }) : defaultParams
  return createFsrs(merged)
}

// 创建新卡片（进入 New 状态）
export function createCard(createdAt?: Date): FSRSCard {
  return createEmptyCard(createdAt)
}

// 获取四种评分（Again/Hard/Good/Easy）对应的下一调度结果集合
export function scheduleAll(
  card: FSRSCard,
  now: Date = new Date(),
  params?: Partial<FSRSParameters>
): RecordLog {
  const f = initFSRS(params)
  return f.repeat(card, now)
}

// 指定评分，获取该评分路径下的下一状态（便于直接更新）
export function scheduleNext(
  card: FSRSCard,
  rating: Grade,
  now: Date = new Date(),
  params?: Partial<FSRSParameters>
): RecordLogItem {
  const f = initFSRS(params)
  return f.next(card, now, rating)
}

// 便捷方法：根据字符串评分映射到枚举
export function parseRating(input: string): Grade {
  const v = input.trim().toLowerCase()
  switch (v) {
    case "again":
      return Rating.Again as unknown as Grade
    case "hard":
      return Rating.Hard as unknown as Grade
    case "good":
      return Rating.Good as unknown as Grade
    case "easy":
      return Rating.Easy as unknown as Grade
    default:
      throw new Error(`Unsupported rating: ${input}`)
  }
}

// 使用示例（无副作用）：
// const card = createCard()
// const all = scheduleAll(card, new Date())
// const good = all[Rating.Good]
// const nextCard = good.card // 更新后的卡片（包含 due、stability、difficulty 等）
// const log = good.log // 复习日志（含 rating、review 时间等）

export function getReviewDateForEachRating(
  card: FSRSCard,
  now: Date = new Date()
): Record<FsrsRating, Date> {
  const all = scheduleAll(card, now)
  const dates: Record<FsrsRating, Date> = {} as any
  dates.again = all[Rating.Again].card.due
  dates.hard = all[Rating.Hard].card.due
  dates.good = all[Rating.Good].card.due
  dates.easy = all[Rating.Easy].card.due
  return dates
}

/**
 * 参考与来源：
 * [1] ts-fsrs - npm
 * [2] open-spaced-repetition/ts-fsrs - GitHub
 */

// FSRS ↔︎ DB 映射与转换（最小可执行）
function toIso(d: Date | string | undefined): string | undefined {
  if (!d) return undefined
  return typeof d === 'string' ? d : d.toISOString()
}
function toDate(v: string | Date | undefined | null): Date | undefined {
  if (!v) return undefined
  return typeof v === 'string' ? new Date(v) : v
}

export function stateToFsrsState(state: State): FsrsState {
  switch (state) {
    case State.New:
      return 'new'
    case State.Learning:
      return 'learning'
    case State.Review:
      return 'review'
    case State.Relearning:
      return 'relearning'
    default:
      return 'new'
  }
}

function fsrsStateToState(state: FsrsState): State {
  switch (state) {
    case 'new':
      return State.New
    case 'learning':
      return State.Learning
    case 'review':
      return State.Review
    case 'relearning':
      return State.Relearning
    default:
      return State.New
  }
}

export function fsrsCardToCardRowPatch(card: FSRSCard): Partial<CardRow> {
  return {
    due: toIso(card.due)!,
    stability: Number((card as any).stability ?? 0),
    difficulty: Number((card as any).difficulty ?? 0),
    elapsed_days: Number((card as any).elapsed_days ?? 0),
    scheduled_days: Number((card as any).scheduled_days ?? 0),
    reps: Number((card as any).reps ?? 0),
    lapses: Number((card as any).lapses ?? 0),
    learning_steps: Number((card as any).learning_steps ?? 0),  // 新增
    state: stateToFsrsState(card.state),
    last_review: toIso((card as any).last_review),
    updated_at: new Date().toISOString(),
  }
}

export function applyCardRowPatchToFsrsCard(card: FSRSCard, patch: Partial<CardRow>): FSRSCard {
  const next = { ...card } as any
  if (patch.due !== undefined) next.due = toDate(patch.due) ?? next.due
  if (patch.stability !== undefined) next.stability = patch.stability
  if (patch.difficulty !== undefined) next.difficulty = patch.difficulty
  if (patch.elapsed_days !== undefined) next.elapsed_days = patch.elapsed_days
  if (patch.scheduled_days !== undefined) next.scheduled_days = patch.scheduled_days
  if (patch.reps !== undefined) next.reps = patch.reps
  if (patch.lapses !== undefined) next.lapses = patch.lapses
  if (patch.learning_steps !== undefined) next.learning_steps = patch.learning_steps  // 新增
  if (patch.state !== undefined) next.state = fsrsStateToState(patch.state)
  if (patch.last_review !== undefined) next.last_review = toDate(patch.last_review)
  return next as FSRSCard
}

export function gradeToFsrsRatingString(grade: Grade): FsrsRating {
  switch (grade as any) {
    case Rating.Again:
      return 'again'
    case Rating.Hard:
      return 'hard'
    case Rating.Good:
      return 'good'
    case Rating.Easy:
      return 'easy'
    default:
      throw new Error(`Unsupported grade: ${grade}`)
  }
}

export const fsrsRatingStringToGrade = parseRating