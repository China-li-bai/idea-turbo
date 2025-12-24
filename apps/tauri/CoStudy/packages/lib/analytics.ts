/**
 * Analytics utilities for Dashboard
 *
 * Provides verifiable, testable computations for:
 * - 7-day workload timeline (count and estimated minutes)
 * - 7-day rating distribution
 * - Today's due state breakdown and estimated minutes
 * - R/S/D summary and current retention
 */

import type { PGlite } from "@electric-sql/pglite";
import { type FsrsState, type FsrsRating } from "./schema";

export type TimelineItem = {
  date: string; // ISO date (YYYY-MM-DD)
  count: number;
  minutes: number;
};

export type GradeDistribution = {
  again: number;
  hard: number;
  good: number;
  easy: number;
};

export type TodayStates = {
  new: number;
  learning: number;
  review: number;
  relearning: number;
};

export type RSDSummary = {
  retention: number; // current overall retention (0..1)
  stabilityAvg: number;
  difficultyAvg: number;
};

export type DashboardMetrics = {
  timeline7d: TimelineItem[];
  gradeDist7d: GradeDistribution;
  todayStates: TodayStates;
  todayMinutes: number;
};

/** Utility: start/end of day for a given Date (local time) */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function addDays(d: Date, days: number): Date {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + days);
  return nd;
}

function toIsoDate(d: Date): string {
  // YYYY-MM-DD
  return d.toISOString().slice(0, 10);
}

/**
 * Compute current retention for all non-due cards.
 * Formula: R = exp(-elapsed_days / stability)
 */
export async function getRetentionNow(db: PGlite, deckId?: string): Promise<{ value: number; goal: number }> {
  const goal = 0.9; // default request_retention
  const where = deckId ? "WHERE deck_id = $1 AND due > NOW()" : "WHERE due > NOW()";
  const params = deckId ? [deckId] : [];
  const res = await db.query<{ stability: number; elapsed_days: number }>(
    `SELECT stability, elapsed_days FROM cards ${where}`,
    params
  );
  const rows = res.rows || [];
  if (rows.length === 0) return { value: 0, goal };
  let sum = 0;
  for (const r of rows) {
    const S = Number(r.stability || 0);
    const E = Number(r.elapsed_days || 0);
    if (S > 0) sum += Math.exp(-E / S);
  }
  const value = sum / rows.length;
  return { value, goal };
}

/** 计算 R/S/D 简要统计 */
export async function getRsdSummary(db: PGlite, deckId?: string): Promise<RSDSummary> {
  const { value } = await getRetentionNow(db, deckId);
  const where = deckId ? "WHERE deck_id = $1" : "";
  const params = deckId ? [deckId] : [];
  const res = await db.query<{ stability: number; difficulty: number }>(
    `SELECT AVG(stability) AS stability, AVG(difficulty) AS difficulty FROM cards ${where}`,
    params
  );
  const row = res.rows?.[0];
  return {
    retention: value,
    stabilityAvg: Number(row?.stability ?? 0),
    difficultyAvg: Number(row?.difficulty ?? 0),
  };
}

/**
 * Compute 7-day rating distribution from review_logs.
 */
export async function getGradeDistribution7d(db: PGlite, deckId?: string): Promise<GradeDistribution> {
  const since = addDays(new Date(), -7);
  const params: any[] = [since.toISOString()];
  let sql = `SELECT rating, COUNT(*) as cnt FROM review_logs WHERE review_time >= $1`;
  if (deckId) {
    sql += " AND card_id IN (SELECT id FROM cards WHERE deck_id = $2)";
    params.push(deckId);
  }
  sql += " GROUP BY rating";
  const res = await db.query<{ rating: FsrsRating; cnt: number }>(sql, params);
  const rows = res.rows || [];
  const dist: GradeDistribution = { again: 0, hard: 0, good: 0, easy: 0 };
  for (const r of rows) {
    const key = r.rating as keyof GradeDistribution;
    if (key in dist) dist[key] += Number(r.cnt || 0);
  }
  return dist;
}

/**
 * Compute due state breakdown for today.
 */
export async function getTodayStates(db: PGlite, deckId?: string): Promise<TodayStates> {
  const now = new Date();
  const end = endOfDay(now);
  const params: any[] = [end.toISOString()];
  let sql = `SELECT state, COUNT(*) as cnt FROM cards WHERE due <= $1`;
  if (deckId) {
    sql += " AND deck_id = $2";
    params.push(deckId);
  }
  sql += " GROUP BY state";
  const res = await db.query<{ state: FsrsState; cnt: number }>(sql, params);
  const rows = res.rows || [];
  const out: TodayStates = { new: 0, learning: 0, review: 0, relearning: 0 };
  for (const r of rows) {
    const key = r.state as keyof TodayStates;
    if (key in out) out[key] += Number(r.cnt || 0);
  }
  return out;
}

/**
 * Estimate average review duration (ms) from recent logs; fallback to 8000ms.
 */
export async function getAvgReviewDurationMs(db: PGlite, deckId?: string): Promise<number> {
  const since = addDays(new Date(), -30);
  const params: any[] = [since.toISOString()];
  let sql = `SELECT AVG(review_duration_ms) AS avg_ms FROM review_logs WHERE review_time >= $1`;
  if (deckId) {
    sql += " AND card_id IN (SELECT id FROM cards WHERE deck_id = $2)";
    params.push(deckId);
  }
  const res = await db.query<{ avg_ms: number | null }>(sql, params);
  const avg = Number(res.rows?.[0]?.avg_ms ?? 0);
  return avg > 0 ? avg : 8000;
}

/**
 * Compute workload timeline for the next N days.
 * Groups cards by their `due` date.
 */
export async function getTimeline(db: PGlite, days: number = 7, deckId?: string): Promise<TimelineItem[]> {
  const now = new Date();
  const end = endOfDay(addDays(now, days - 1));
  const params: any[] = [now.toISOString(), end.toISOString()];
  let sql = `SELECT id, due FROM cards WHERE due BETWEEN $1 AND $2`;
  if (deckId) {
    sql += " AND deck_id = $3";
    params.push(deckId);
  }
  const res = await db.query<{ id: string; due: string }>(sql, params);
  const rows = res.rows || [];

  // Pre-build buckets for each day
  const buckets: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    buckets[toIsoDate(addDays(startOfDay(now), i))] = 0;
  }
  for (const r of rows) {
    const d = new Date(r.due);
    const key = toIsoDate(startOfDay(d));
    if (key in buckets) buckets[key] += 1;
  }

  const avgMs = await getAvgReviewDurationMs(db, deckId);
  const out: TimelineItem[] = [];
  for (let i = 0; i < days; i++) {
    const day = toIsoDate(addDays(startOfDay(now), i));
    const count = buckets[day] || 0;
    const minutes = Math.round((count * avgMs) / 60000);
    out.push({ date: day, count, minutes });
  }
  return out;
}

/**
 * Compose Dashboard metrics in one call.
 * Designed to be stable for tests.
 */
export async function getDashboardMetrics(db: PGlite, deckId?: string): Promise<DashboardMetrics> {
  const [timeline7d, gradeDist7d, todayStates] = await Promise.all([
    getTimeline(db, 7, deckId),
    getGradeDistribution7d(db, deckId),
    getTodayStates(db, deckId),
  ]);
  const todayCount = todayStates.new + todayStates.learning + todayStates.review + todayStates.relearning;
  const avgMs = await getAvgReviewDurationMs(db, deckId);
  const todayMinutes = Math.round((todayCount * avgMs) / 60000);
  return { timeline7d, gradeDist7d, todayStates, todayMinutes };
}

/**
 * Build memory curve data for a card-like tuple (S, elapsed_days).
 * Returns points for R(t) = exp(-(elapsed_days + t) / S) and the target due when R=goal.
 */
export function buildMemoryCurve(
  stability: number,
  elapsedDays: number,
  goal: number = 0.9,
  maxDays: number = 60
): { points: { day: number; r: number }[]; nextInterval: number } {
  const points: { day: number; r: number }[] = [];
  if (!(stability > 0)) return { points, nextInterval: 0 };
  const nextInterval = Math.round(-stability * Math.log(goal));
  const span = Math.min(maxDays, Math.max(nextInterval, 7));
  for (let t = 0; t <= span; t++) {
    const r = Math.exp(-(elapsedDays + t) / stability);
    points.push({ day: t, r });
  }
  return { points, nextInterval };
}