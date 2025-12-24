[Introduction](./README.md) | [简体中文](./README_CN.md) ｜[はじめに](./README_JA.md)

---

# 关于

[![fsrs version](https://img.shields.io/badge/FSRS-v6-blue?style=flat-square)](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm#fsrs-6)
[![ts-fsrs npm version](https://img.shields.io/npm/v/ts-fsrs.svg?style=flat-square&logo=npm)](https://www.npmjs.com/package/ts-fsrs)
[![Downloads](https://img.shields.io/npm/dm/ts-fsrs?style=flat-square)](https://www.npmjs.com/package/ts-fsrs)
[![codecov](https://img.shields.io/codecov/c/github/open-spaced-repetition/ts-fsrs?token=E3KLLDL8QH&style=flat-square&logo=codecov
)](https://codecov.io/gh/open-spaced-repetition/ts-fsrs)
[![Release](https://img.shields.io/github/actions/workflow/status/open-spaced-repetition/ts-fsrs/release.yml?style=flat-square&logo=githubactions&label=Release
)](https://github.com/open-spaced-repetition/ts-fsrs/actions/workflows/release.yml)
[![Deploy](https://img.shields.io/github/actions/workflow/status/open-spaced-repetition/ts-fsrs/deploy.yml?style=flat-square&logo=githubpages&label=Pages
)](https://github.com/open-spaced-repetition/ts-fsrs/actions/workflows/deploy.yml)

ts-fsrs是一个基于TypeScript的多功能包，支持[ES模块](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c)、[CommonJS](https://en.wikipedia.org/wiki/CommonJS)和UMD。它实现了[自由间隔重复调度器（FSRS）算法](https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler/blob/main/README_CN.md)，使开发人员能够将FSRS集成到他们的闪卡应用程序中，从而增强用户的学习体验。

> 你可以通过[ts-fsrs-workflow.drawio](./ts-fsrs-workflow.drawio)来获取ts-fsrs的工作流信息。

# 开发环境

对于想要参与 ts-fsrs 开发的贡献者和开发人员，我们提供了 Dev Container 配置，以便提供一致的开发环境。

📖 **[开发环境快速入门指南](./.devcontainer/QUICKSTART.md)** - 使用 VS Code Dev Containers 开始开发

# 使用ts-fsrs

## ts-fsrs (调度器)

`ts-fsrs@3.x`需要运行在 Node.js (>=16.0.0)上，`ts-fsrs@4.x`需要运行在 Node.js (>=18.0.0)上。
从`ts-fsrs@3.5.6`开始，ts-fsrs支持CommonJS、ESM和UMD模块系统

```bash
npm install ts-fsrs
yarn add ts-fsrs
pnpm install ts-fsrs
bun add ts-fsrs
```

# 例子

```typescript
import {createEmptyCard, formatDate, fsrs, generatorParameters, Rating, Grades} from 'ts-fsrs';

const params = generatorParameters({ enable_fuzz: true, enable_short_term: false });
const f = fsrs(params);
const card = createEmptyCard(new Date('2022-2-1 10:00:00'));// createEmptyCard();
const now = new Date('2022-2-2 10:00:00');// new Date();
const scheduling_cards = f.repeat(card, now);

// console.log(scheduling_cards);
for (const item of scheduling_cards) {
    // grades = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]
    const grade = item.log.rating
    const { log, card } = item;
    console.group(`${Rating[grade]}`);
    console.table({
        [`card_${Rating[grade]}`]: {
            ...card,
            due: formatDate(card.due),
            last_review: formatDate(card.last_review as Date),
        },
    });
    console.table({
        [`log_${Rating[grade]}`]: {
            ...log,
            review: formatDate(log.review),
        },
    });
    console.groupEnd();
    console.log('----------------------------------------------------------------');
}
```

更多的参考:

- [参考文档- Github Pages](https://open-spaced-repetition.github.io/ts-fsrs/)
- [参考调度 - Github Pages](https://open-spaced-repetition.github.io/ts-fsrs/example)
- [浏览器使用](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/example/example.html) (使用CDN来访问ts-fsrs ESM包)
- [案例应用 - 基于Next.js+Hono.js+kysely](https://github.com/ishiko732/ts-fsrs-demo)
- [现代化抽成卡 - Next.js+Drizzle+tRPC](https://github.com/zsh-eng/spaced)

## @open-spaced-repetition/binding (优化器)

> **⚠️ Beta 提示**：该包目前处于 beta 阶段，API 可能随时发生变化。

对于参数优化等计算密集型任务，我们提供了基于 [fsrs-rs](https://github.com/open-spaced-repetition/fsrs-rs) 和 [napi-rs](https://napi.rs/) 的高性能优化器：

- **运行要求**：Node.js >= 20.0.0
- **使用场景**：参数优化、大数据集批处理
- **平台支持**：Windows、macOS、Linux（x64/arm64）、Android、WebAssembly
- **⚠️ 限制**：
  - 无法在 edge-runtime 环境中运行（edge-runtime 不支持 WASI）
  - 使用 WASM 需要额外配置

### 安装方式

**基础安装**（自动检测平台）：
```bash
npm install @open-spaced-repetition/binding
pnpm install @open-spaced-repetition/binding
yarn add @open-spaced-repetition/binding
bun add @open-spaced-repetition/binding
```

**WebAssembly 安装**：

要安装 WASM 版本，需要配置包管理器：

- **pnpm**：在 `pnpm-workspace.yaml` 中添加：
  ```yaml
  supportedArchitectures:
    cpu: [current, wasm32]
  ```

- **yarn**：需要使用 yarn v4 版本，并配置 `supportedArchitectures`，详见 [NAPI-RS 文档](https://napi.rs/docs/concepts/webassembly#install-the-webassembly-package)

- **强制使用 WASM**：配置环境变量：
  ```bash
  NAPI_RS_FORCE_WASI=1
  ```

### 基本示例

详见：[packages/binding/__tests__/demo/simple.ts](./packages/binding/__tests__/demo/simple.ts)

```typescript
import { computeParameters, convertCsvToFsrsItems } from '@open-spaced-repetition/binding';

// 从复习历史优化 FSRS 参数
const parameters = await computeParameters(fsrsItems, {
  enableShortTerm: true,
  timeout: 100,
  progress: (cur, total) => console.log(`${cur}/${total}`)
});
```

> **注意**：binding 包为参数优化提供原生性能。对于日常卡片调度，请使用上面的 `ts-fsrs` 包。

# 基本使用方法

## 1. **初始化**:

首先，创建一个空的卡片实例并设置当前日期（默认为当前系统时间）：

```typescript
import {Card, createEmptyCard} from "ts-fsrs";

let card: Card = createEmptyCard();

```

## 2. **FSRS参数配置**:

该ts-fsrs库允许自定义SRS参数。使用`generatorParameters`来生成SRS算法的最终参数集。以下是设置最大间隔的示例：

```typescript
import {Card, createEmptyCard, generatorParameters, FSRSParameters} from "ts-fsrs";

let card: Card = createEmptyCard();
const params: FSRSParameters = generatorParameters({maximum_interval: 1000});
```

## 3. **使用FSRS进行调度**:

核心功能位于`fsrs`函数中。当调用`repeat`该函数时，它会根据不同的用户评级返回一个卡片集合的调度结果：

```typescript
import {
    Card,
    createEmptyCard,
    generatorParameters,
    FSRSParameters,
    FSRS,
    RecordLog,
} from "ts-fsrs";

let card: Card = createEmptyCard();
const f: FSRS = new FSRS(); // or const f: FSRS = fsrs(params);
let scheduling_cards: RecordLog = f.repeat(card, new Date());
// 如果你想要指定一个特定的评级，你可以这样做：（ts-fsrs版本必须 >= 4.0.0）
// let scheduling_cards: RecordLog = f.next(card, new Date(), Rating.Good);
```

## 4. **检查调度卡片信息**:

一旦你有了`scheduling_cards`对象，你可以根据用户评级来获取卡片。例如，要访问一个被安排在“`Good`”评级下的卡片：

```typescript
const good: RecordLogItem = scheduling_cards[Rating.Good];
const newCard: Card = good.card;
```

当然，你可以获取每个评级下卡片的新状态和对应的历史记录：

```typescript
scheduling_cards[Rating.Again].card
scheduling_cards[Rating.Again].log

scheduling_cards[Rating.Hard].card
scheduling_cards[Rating.Hard].log

scheduling_cards[Rating.Good].card
scheduling_cards[Rating.Good].log

scheduling_cards[Rating.Easy].card
scheduling_cards[Rating.Easy].log
```

## 5. **理解卡片属性**:

每个`Card`对象都包含各种属性，这些属性决定了它的状态、调度和其他指标(DS)：

```typescript
type Card = {
    due: Date;             // 卡片下次复习的日期
    stability: number;     // 记忆稳定性
    difficulty: number;    // 卡片难度
    elapsed_days: number;  // 自上次复习以来的天数
    scheduled_days: number;// 下次复习的间隔天数
    learning_steps: number;// 当前的(重新)学习步骤
    reps: number;          // 卡片被复习的总次数
    lapses: number;        // 卡片被遗忘或错误记忆的次数
    state: State;          // 卡片的当前状态（新卡片、学习中、复习中、重新学习中）
    last_review?: Date;    // 最近的复习日期（如果适用）
};
```

## 6. **理解复习记录属性**:

每个`ReviewLog`
对象都包含各种属性，这些属性决定了与之关联的卡片的复习记录信息，用于分析，回退本次复习，[优化(编写中)](https://github.com/open-spaced-repetition/fsrs-rs-nodejs)：

```typescript
type ReviewLog = {
    rating: Rating; // 复习的评级（手动变更，重来，困难，良好，容易）
    state: State; // 复习的状态（新卡片、学习中、复习中、重新学习中）
    due: Date;  // 上次的调度日期
    stability: number; // 复习前的记忆稳定性
    difficulty: number; // 复习前的卡片难度
    elapsed_days: number; // 自上次复习以来的天数
    last_elapsed_days: number; // 上次复习的间隔天数
    scheduled_days: number; // 下次复习的间隔天数
    learning_steps: number;// 复习前的(重新)学习步骤
    review: Date; // 复习的日期
}
```