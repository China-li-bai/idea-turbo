import type { DifficultyLevel, AccentType } from "./schema";

// 批量导入字段枚举
export type BulkImportField = "question" | "answer" | "tags" | "notes" | "ignore";

// 批量导入映射配置
export interface BulkImportMapping {
  column1: BulkImportField;
  column2: BulkImportField;
  firstRowIsHeader: boolean;
}

// 词汇导入字段枚举（与 schema 保持一致）
export type VocabularyImportField =
  | "word"
  | "language_code"
  | "difficulty_level"
  | "frequency_rank"
  | "ipa_pronunciation"
  | "audio_url"
  | "accent"
  | "etymology"
  | "mnemonic"
  | "part_of_speech"
  | "meaning_en"
  | "meaning_zh"
  | "example_en"
  | "example_zh"
  | "synonyms"
  | "antonyms"
  | "ignore";

// 用于 mapRowsToVocabularyInputs 的行结果结构（不含 card_id）
export interface VocabularyRowInput {
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
    definition_order?: number;
  }>;
  synonyms?: string[];
  antonyms?: string[];
}

// 简单的CSV解析（支持双引号包裹与逗号）
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  const len = text.length;
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;
  while (i < len) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { // 转义双引号
          currentCell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      } else {
        currentCell += ch;
        i++;
        continue;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (ch === ',') {
        currentRow.push(currentCell);
        currentCell = "";
        i++;
        continue;
      }
      if (ch === '\n') {
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = "";
        i++;
        continue;
      }
      if (ch === '\r') { // 忽略CR
        i++;
        continue;
      }
      currentCell += ch;
      i++;
    }
  }
  // 最后一个单元格/行
  currentRow.push(currentCell);
  if (currentRow.length > 1 || currentRow[0].trim().length > 0) {
    rows.push(currentRow);
  }
  return rows;
}

// 根据映射生成卡片输入（front/back）
export function mapRowsToCardInputs(
  rows: string[][],
  mapping: BulkImportMapping
): { front: string; back: string; tags?: string[]; notes?: string }[] {
  const startIndex = mapping.firstRowIsHeader ? 1 : 0;
  const out: { front: string; back: string; tags?: string[]; notes?: string }[] = [];
  for (let r = startIndex; r < rows.length; r++) {
    const row = rows[r] || [];
    const c1 = row[0] ?? "";
    const c2 = row[1] ?? "";
    const result: { front: string; back: string; tags?: string[]; notes?: string } = { front: "", back: "" };
    // 列1
    switch (mapping.column1) {
      case "question":
        result.front = c1;
        break;
      case "answer":
        result.back = c1;
        break;
      case "tags":
        result.tags = (c1 || "").split(/\s*,\s*/).filter(Boolean);
        break;
      case "notes":
        result.notes = c1;
        break;
      case "ignore":
        break;
    }
    // 列2
    switch (mapping.column2) {
      case "question":
        result.front = result.front || c2; // 优先已有，否则赋值
        break;
      case "answer":
        result.back = result.back || c2;
        break;
      case "tags":
        const t2 = (c2 || "").split(/\s*,\s*/).filter(Boolean);
        result.tags = [...(result.tags || []), ...t2];
        break;
      case "notes":
        result.notes = result.notes ? `${result.notes}\n${c2}` : c2;
        break;
      case "ignore":
        break;
    }

    // 至少需要 front/back 之一，优先 front/back 都存在
    if ((result.front?.trim()?.length || 0) + (result.back?.trim()?.length || 0) > 0) {
      out.push(result);
    }
  }
  return out;
}

// 将卡片输入映射到 CardRow 插入数据（由应用层调用 cards.create）
export interface CardInsertInput {
  front: string;
  back: string;
}

export function toCardInsertInputs(
  mapped: { front: string; back: string }[]
): CardInsertInput[] {
  return mapped
    .filter((m) => (m.front?.trim()?.length ?? 0) > 0 || (m.back?.trim()?.length ?? 0) > 0)
    .map((m) => ({ front: m.front, back: m.back }));
}

// 根据列映射生成词汇扩展数据（每行一条词汇记录）
// fields 数组长度应与 CSV 的列数一致，逐列指定其语义
export function mapRowsToVocabularyInputs(
  rows: string[][],
  fields: VocabularyImportField[],
  firstRowIsHeader: boolean
): VocabularyRowInput[] {
  const startIndex = firstRowIsHeader ? 1 : 0;
  const out: VocabularyRowInput[] = [];

  for (let r = startIndex; r < rows.length; r++) {
    const row = rows[r] || [];

    let word = "";
    let language_code: string | undefined;
    let difficulty_level: DifficultyLevel | undefined;
    let frequency_rank: number | undefined;
    let ipa_pronunciation: string | undefined;
    let audio_url: string | undefined;
    let accent: AccentType | undefined;
    let etymology: string | undefined;
    let mnemonic: string | undefined;

    // 单条释义（如存在）
    let part_of_speech = "";
    let meaning_en = "";
    let meaning_zh = "";
    let example_en: string | undefined;
    let example_zh: string | undefined;

    let synonyms: string[] | undefined;
    let antonyms: string[] | undefined;

    for (let c = 0; c < fields.length; c++) {
      const field = fields[c];
      const val = (row[c] ?? "").trim();
      if (!val && field !== "ignore") continue;

      switch (field) {
        case "word":
          word = val;
          break;
        case "language_code":
          language_code = val || undefined;
          break;
        case "difficulty_level":
          if (val === "beginner" || val === "intermediate" || val === "advanced") {
            difficulty_level = val as DifficultyLevel;
          }
          break;
        case "frequency_rank":
          {
            const n = Number(val);
            if (Number.isFinite(n)) frequency_rank = n;
          }
          break;
        case "ipa_pronunciation":
          ipa_pronunciation = val || undefined;
          break;
        case "audio_url":
          audio_url = val || undefined;
          break;
        case "accent":
          if (val === "US" || val === "UK" || val === "AU") {
            accent = val as AccentType;
          }
          break;
        case "etymology":
          etymology = val || undefined;
          break;
        case "mnemonic":
          mnemonic = val || undefined;
          break;
        case "part_of_speech":
          part_of_speech = val;
          break;
        case "meaning_en":
          meaning_en = val;
          break;
        case "meaning_zh":
          meaning_zh = val;
          break;
        case "example_en":
          example_en = val || undefined;
          break;
        case "example_zh":
          example_zh = val || undefined;
          break;
        case "synonyms":
          synonyms = val
            .split(/[,;\s]+/)
            .map((s) => s.trim())
            .filter(Boolean);
          break;
        case "antonyms":
          antonyms = val
            .split(/[,;\s]+/)
            .map((s) => s.trim())
            .filter(Boolean);
          break;
        case "ignore":
          break;
      }
    }

    // 词汇必须至少包含 word
    if (!word) continue;

    const defs =
      meaning_en || meaning_zh
        ? [
            {
              part_of_speech: part_of_speech || "n.",
              meaning_en: meaning_en || "",
              meaning_zh: meaning_zh || "",
              example_en,
              example_zh,
              definition_order: 1,
            },
          ]
        : [];

    out.push({
      word,
      language_code,
      difficulty_level,
      frequency_rank,
      ipa_pronunciation,
      audio_url,
      accent,
      etymology,
      mnemonic,
      definitions: defs,
      synonyms,
      antonyms,
    });
  }

  return out;
}

// 从词汇行输入推导基础卡片 front/back（front=word，back=中文优先，其次英文）
export function toCardFrontBackFromVocabulary(
  vocab: VocabularyRowInput
): { front: string; back: string } {
  const front = vocab.word;
  const back =
    vocab.definitions?.[0]?.meaning_zh?.trim()?.length
      ? vocab.definitions[0].meaning_zh
      : vocab.definitions?.[0]?.meaning_en || "";
  return { front, back };
}