# AI Calendar 知识库

> 本文档记录项目的技术决策、架构设计和经验教训，供 AI 员工参考和更新。

---

## 📁 项目结构

```
apps/ai-calendar/
├── lib/
│   ├── ai/           # AI 服务配置
│   ├── services/     # 业务服务层
│   ├── stores/       # Zustand 状态管理
│   ├── utils/        # 工具函数
│   └── types/        # TypeScript 类型定义
├── components/       # React 组件
├── docs/             # 文档
└── .trae/skills/     # AI 技能
```

---

## 🏗️ 核心架构

### 1. 统一数据模型

**文件**: `lib/types/unified.ts`

```typescript
interface UnifiedCalendarItem {
  id: string;
  type: 'idea' | 'event';
  title: string;
  content: string;
  startTime: number | null;  // Unix 时间戳
  endTime: number | null;
  embedding: number[];
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  metadata: { ... };
}
```

**原则**: 灵感和日程使用同一数据结构，通过 `type` 字段区分。

**相关技能**: `unified-data-architecture`

### 2. NLP 时间解析

**文件**: `lib/utils/nlpParserLegacy.ts`

**功能**: 多语言自然语言时间解析，支持中英日韩。

**相关技能**: `nlp-time-parser`

### 3. 多语言支持

**文件**: `lib/utils/i18n.ts`, `lib/utils/translations.ts`

**支持语言**: zh-CN, zh-TW, en-US, ja-JP, ko-KR

**相关技能**: `multilingual-i18n`

### 4. 向量搜索

**文件**: `lib/services/oramaSearchService.ts`

**功能**: 本地向量搜索，使用 E5-small 模型。

**相关技能**: `local-vector-search`

---

## 📊 数据流

```
用户输入
    ↓
SecretaryView.tsx (UI)
    ↓
secretaryAIService.ts (AI 意图识别)
    ↓
nlpParserLegacy.ts (时间解析)
    ↓
unifiedStore.ts (状态管理)
    ↓
oramaSearchService.ts (索引)
```

---

## 🔧 关键服务

| 服务 | 文件 | 职责 |
|------|------|------|
| secretaryAIService | `lib/services/secretaryAIService.ts` | AI 意图分类和行动规划 |
| taskDecomposerService | `lib/services/taskDecomposerService.ts` | 目标分解为任务 |
| smartScheduler | `lib/services/smartScheduler.ts` | 智能排期和冲突检测 |
| progressTrackerService | `lib/services/progressTrackerService.ts` | 进度追踪 |
| oramaSearchService | `lib/services/oramaSearchService.ts` | 向量搜索 |

---

## ⚠️ 已知问题

| 问题 | 状态 | 说明 |
|------|------|------|
| @idea-turbo/sherpa-onnx 模块缺失 | 待修复 | 构建失败 |
| useShiftSchedules hook 缺失 | 待修复 | ShiftList.tsx 报错 |

---

## 📝 更新规则

AI 员工在以下情况应更新本文档：

1. **新增核心功能** → 添加到"核心架构"或"关键服务"
2. **修复重要 Bug** → 更新"已知问题"
3. **架构变更** → 更新"数据流"或相关章节
4. **新增技能** → 添加"相关技能"引用

---

## 📚 相关文档

- [统一数据架构](./UNIFIED_DATA_ARCHITECTURE.md)
- [数据流架构](./DATA_FLOW_ARCHITECTURE.md)
- [AI 隐私指南](../AI_PRIVACY_GUIDE.md)
- [排期架构](../SCHEDULING_ARCHITECTURE.md)

---

*最后更新: 2026-03-21*
