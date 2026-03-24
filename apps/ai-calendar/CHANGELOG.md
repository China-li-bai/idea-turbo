# AI Calendar 变更日志

> 记录每次重要变更，供后续 AI 员工快速了解项目演进。

---

## 2026-03-21

### 新增: NLP 时间解析引擎

**文件**: `lib/utils/nlpParserLegacy.ts`

**变更内容**:
- 添加时间戳支持 (`startTimestamp`, `endTimestamp`)
- 集成 `chrono-node` 支持英文和日文解析
- 修复边界情况：晚上12点 → 00:00，下午2点 → 14:00
- 添加 `toTimestamp()` 和 `fromTimestamp()` 工具函数

**测试**: 42 个测试用例全部通过

**相关技能**: `nlp-time-parser`

---

### 新增: 知识管理体系

**文件**: 
- `.trae/skills/nlp-time-parser/SKILL.md`
- `docs/KNOWLEDGE.md`

**变更内容**:
- 创建 NLP 时间解析技能文档
- 创建项目知识库文档
- 建立三层知识传承机制

---

## 2026-03-20

### 修复: 秘书服务集成

**文件**: `lib/services/secretaryAIService.ts`

**变更内容**:
- 移除重复的时间解析代码
- 导入 `resolveRelativeDate` 从 nlpParserLegacy
- 修复 `enrichActions` 方法参数未定义问题

---

## 2026-03-19

### 新增: 进度追踪视图

**文件**: `components/ui/ProgressTrackerView.tsx`

**变更内容**:
- 创建进度追踪 UI 组件
- 集成 progressTrackerService
- 显示目标进度和任务完成状态

---

## 变更记录格式

```markdown
## YYYY-MM-DD

### 类型: 标题

**文件**: `path/to/file.ts`

**变更内容**:
- 具体变更点 1
- 具体变更点 2

**测试**: 测试状态

**相关技能**: `skill-name`
```

---

*AI 员工在完成重要变更后，请按上述格式添加记录。*
