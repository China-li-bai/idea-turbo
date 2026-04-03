---
name: "nlp-time-parser"
description: "多语言自然语言时间解析引擎，支持中英日韩四语。将自然语言转换为时间戳。Invoke when parsing time from user input, scheduling, or date extraction."
---

# NLP 时间解析引擎

## 概述

将自然语言时间表达式转换为结构化数据，支持中文、英文、日文、韩文四种语言。

**新增功能 (2026-04-03)**:
- 短时相对时间解析（等下、一会儿、马上等）
- 时段查询解析（中午、下午、晚上等）
- 统一的时间查询入口 `parseTimeQuery()`

## 核心文件

| 文件 | 说明 |
|------|------|
| `lib/utils/nlpParserLegacy.ts` | 主解析引擎 |
| `lib/utils/__tests__/nlpParserLegacy.test.ts` | 测试用例 (58个) |

## 核心接口

### ParsedResult - 标准解析结果

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

### ShortTimeQuery - 短时相对时间查询

```typescript
interface ShortTimeQuery {
  type: 'short_relative';
  windowStart: Date;          // 时间窗口开始（当前时刻）
  windowEnd: Date;            // 时间窗口结束（当前时刻 + N分钟）
  windowMinutes: number;       // 时间窗口大小（分钟）
  matchedKeyword: string;      // 匹配到的关键词
  isUpcoming: boolean;        // 是否为"即将发生"类型
}
```

### TimeRangeQuery - 时段查询

```typescript
interface TimeRangeQuery {
  type: 'time_range';
  hourStart: number;           // 开始小时（如 12 表示中午12点）
  hourEnd: number;             // 结束小时（如 14 表示下午14点）
  matchedKeyword: string;      // 匹配到的关键词
}
```

## 多语言架构

```
parseNaturalLanguage(input, locale)     ← 标准时间解析
parseTimeQuery(input, locale)          ← 时间查询解析（新增）

     ↓                    ↓
英文/日文            中文/韩文
chrono-node         自定义引擎
     ↓                    ↓
     └────────┬─────────┘
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

### 标准时间解析

```typescript
import { parseNaturalLanguage, toTimestamp, fromTimestamp } from '@/lib/utils/nlpParserLegacy';

const result = await parseNaturalLanguage('明天下午3点开会', 'zh-CN');
console.log(result.startTimestamp);
```

### 时间查询解析（新增）

```typescript
import { parseTimeQuery } from '@/lib/utils/nlpParserLegacy';

const query = parseTimeQuery('中午有什么事', 'zh-CN');
if (query?.type === 'time_range') {
  console.log(`查询时段: ${query.hourStart}:00 - ${query.hourEnd}:00`);
}

const shortQuery = parseTimeQuery('等下有什么事', 'zh-CN');
if (shortQuery?.type === 'short_relative') {
  console.log(`未来 ${shortQuery.windowMinutes} 分钟内的事件`);
}
```

## 核心函数

| 函数 | 说明 |
|------|------|
| `parseNaturalLanguage(input, locale)` | 主解析函数，解析完整的时间表达式 |
| `parseTimeQuery(input, locale)` | 时间查询解析，解析短时/时段查询（新增） |
| `resolveRelativeDate(keyword, baseDate, locale)` | 相对日期解析 |
| `formatTimeRange(start, end, locale)` | 时间范围格式化 |
| `formatRelativeDate(date, baseDate, locale)` | 相对日期格式化 |
| `toTimestamp(date)` | Date → 时间戳 |
| `fromTimestamp(timestamp)` | 时间戳 → Date |

## 新增：短时相对时间关键词

### 中文 (zh-CN)

| 关键词 | 时间窗口 | 说明 |
|--------|----------|------|
| 等下 | 15分钟 | 等一小会儿 |
| 一会儿 | 30分钟 | 稍后一段时间 |
| 马上 | 5分钟 | 立刻、即刻 |
| 立刻 | 5分钟 | 立刻、即刻 |
| 等会儿 | 20分钟 | 等一会儿 |
| 待会儿 | 20分钟 | 等一会儿 |
| 稍后 | 15分钟 | 稍候片刻 |
| 等一下 | 10分钟 | 短时间等待 |

### 英文 (en-US)

| 关键词 | 时间窗口 |
|--------|----------|
| right now | 5分钟 |
| right away | 5分钟 |
| in a bit | 15分钟 |
| in a moment | 10分钟 |
| in a minute | 5分钟 |
| in a while | 30分钟 |
| later | 30分钟 |
| soon | 10分钟 |
| shortly | 10分钟 |

### 日文 (ja-JP)

| 关键词 | 时间窗口 |
|--------|----------|
| 少し後で | 15分钟 |
|後で | 30分钟 |
|今 | 5分钟 |
|すぐに | 5分钟 |
|直ち | 5分钟 |
|まもなく | 10分钟 |
|暫く | 20分钟 |

### 韩文 (ko-KR)

| 关键词 | 时间窗口 |
|--------|----------|
| 조금 뒤 | 15分钟 |
| 나중에 | 30分钟 |
| 지금 | 5分钟 |
| 당장 | 5分钟 |
| 곧 | 10分钟 |
| 잠시 | 20分钟 |

## 新增：时段查询关键词

### 中文 (zh-CN)

| 关键词 | 时段 | hourStart | hourEnd |
|--------|------|-----------|---------|
| 凌晨 | 0-6点 | 0 | 6 |
| 早晨 | 6-9点 | 6 | 9 |
| 上午 | 9-12点 | 9 | 12 |
| 中午 | 12-14点 | 12 | 14 |
| 下午 | 14-18点 | 14 | 18 |
| 傍晚 | 17-19点 | 17 | 19 |
| 晚上 | 18-22点 | 18 | 22 |
| 深夜 | 0-6点 | 0 | 6 |

## 已处理的边界情况

| 输入 | 结果 | 说明 |
|------|------|------|
| "今天晚上12点" | 00:00 | 晚上12点 = 午夜 |
| "3月15日下午2点" | 14:00 | 下午时间转换 |
| "半天" | 240分钟 | 时长关键词 |
| "等下有什么事" | ShortTimeQuery | 短时相对时间（新增） |
| "中午有什么事" | TimeRangeQuery | 时段查询（新增） |

## 依赖

- `chrono-node`: 英文和日文解析

## 测试

```bash
npm run test -- --run lib/utils/__tests__/nlpParserLegacy.test.ts
# 58 tests passing
```

## 更新日志

- 2026-04-03: 新增短时相对时间解析（等下、一会儿、马上等）、时段查询解析（中午、下午、晚上等）、统一入口 `parseTimeQuery()`，测试用例扩展至 58 个
- 2026-03-21: 添加时间戳支持，修复边界情况，集成 chrono-node
