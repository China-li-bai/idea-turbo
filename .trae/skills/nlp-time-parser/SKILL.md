---
name: "nlp-time-parser"
description: "多语言自然语言时间解析引擎，支持中英日韩四语。将自然语言转换为时间戳。Invoke when parsing time from user input, scheduling, or date extraction."
---

# NLP 时间解析引擎

## 概述

将自然语言时间表达式转换为结构化数据，支持中文、英文、日文、韩文四种语言。

## 核心文件

| 文件 | 说明 |
|------|------|
| `lib/utils/nlpParserLegacy.ts` | 主解析引擎 |
| `lib/utils/__tests__/nlpParserLegacy.test.ts` | 测试用例 (42个) |

## 数据结构

```typescript
interface ParsedResult {
  title: string;              // 提取的标题
  date?: Date;                // 解析的日期对象
  time?: string;              // 格式化时间 "HH:MM"
  startTimestamp?: number;    // 开始时间戳（毫秒）
  endTimestamp?: number;      // 结束时间戳（毫秒）
  duration?: number;          // 时长（分钟）
  location?: string;          // 地点
  type?: 'todo' | 'event' | 'note';
  people?: string[];          // 相关人员
  confidence: number;         // 置信度 0-1
  rawInput: string;           // 原始输入
}
```

## 多语言架构

```
parseNaturalLanguage(input, locale)
              ↓
    ┌─────────┴─────────┐
    ↓                   ↓
英文/日文            中文/韩文
chrono-node         自定义引擎
    ↓                   ↓
    └─────────┬─────────┘
              ↓
        ParsedResult
```

| 语言 | 解析引擎 | 支持程度 |
|------|---------|---------|
| zh-CN | 自定义引擎 | 完整 |
| zh-TW | 自定义引擎 | 完整 |
| en-US | chrono-node | 完整 |
| ja-JP | chrono-node | 完整 |
| ko-KR | 自定义引擎 | 完整 |

## 使用方法

```typescript
import { parseNaturalLanguage, toTimestamp, fromTimestamp } from '@/lib/utils/nlpParserLegacy';

// 基本用法
const result = await parseNaturalLanguage('明天下午3点开会', 'zh-CN');
console.log(result.startTimestamp); // Unix 时间戳

// 多语言支持
await parseNaturalLanguage('tomorrow 3pm', 'en-US');
await parseNaturalLanguage('明日午後3時', 'ja-JP');
await parseNaturalLanguage('내일 오후 3시', 'ko-KR');

// 时间戳转换
const ts = toTimestamp(new Date());
const date = fromTimestamp(ts);
```

## 核心函数

| 函数 | 说明 |
|------|------|
| `parseNaturalLanguage(input, locale)` | 主解析函数 |
| `resolveRelativeDate(keyword, baseDate, locale)` | 相对日期解析 |
| `formatTimeRange(start, end, locale)` | 时间范围格式化 |
| `formatRelativeDate(date, baseDate, locale)` | 相对日期格式化 |
| `toTimestamp(date)` | Date → 时间戳 |
| `fromTimestamp(timestamp)` | 时间戳 → Date |

## 已处理的边界情况

| 输入 | 结果 | 说明 |
|------|------|------|
| "今天晚上12点" | 00:00 | 晚上12点 = 午夜 |
| "3月15日下午2点" | 14:00 | 下午时间转换 |
| "半天" | 240分钟 | 时长关键词 |

## 依赖

- `chrono-node`: 英文和日文解析

## 测试

```bash
npm run test -- --run lib/utils/__tests__/nlpParserLegacy.test.ts
# 42 tests passing
```

## 更新日志

- 2026-03-21: 添加时间戳支持，修复边界情况，集成 chrono-node
