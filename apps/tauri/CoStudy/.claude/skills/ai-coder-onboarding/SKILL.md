---
name: ai-coder-onboarding
description: 给AI做入职培训：扫描项目、解构Prompt建立私域知识库、固化工程约定；让AI成为贴身码农的第一步。
allowed-tools: search_codebase, search_by_regex, list_dir, view_files, write_to_file, edit_file_fast_apply, update_file, run_command, todo_write
---

# AI Coder Onboarding

## Instructions
目标：把 AI 快速熟悉本项目，基于“代码解构与业务分析师”提示词建立私域知识库与工程约定，让后续代码生成更懂行业、更贴合项目。

入职三步：
1) 项目扫描与项目地图
- 列目录与识别入口：
  - 使用目录查看与检索定位关键入口与文档：`src/main.tsx`、`src/App.tsx`、`packages/lib/*.ts`、`FSRS_README.md`、`PGLITE_FIX.md`、`FRONTEND_GUIDE.md`、`PROJECT_SUMMARY.md`、`README.md`、`pglite-setup.md`。
- 生成项目地图与知识清单：在 `.claude/kb/` 下创建：
  - `project-map.md`（目录结构与核心模块）、`entry-points.md`（初始化流程与数据流）、`docs-index.md`（关键文档索引）。

2) 用代码解构 Prompt 建立私域知识库
- 使用 prompts/代码解构与业务分析师.md 的方法，将业务域、数据模型、用例流程、关键约束抽取为以下文件：
  - `.claude/kb/domain.md`（领域模型与术语表）
  - `.claude/kb/data-model.md`（数据库/状态模型与约束）
  - `.claude/kb/use-cases.md`（核心流程与输入/输出）
  - `.claude/kb/coding-contracts.md`（函数签名/错误恢复/事务边界约定）
- 避免冗余转换层：直接从现有 TypeScript 类型与 SQL Schema中抽取，保持“一处事实源”。

3) 固化工程约定与协作规范
- 更新 `CLAUDE.md`：加入“技能使用总览”“文件命名/风格约定”“迁移与数据一致性策略”。
- 形成可执行清单（todo），作为后续实现的基线。

执行要点：
- 优先最小可执行路径；保持数据库与 Electric 解耦；对数据流与一致性负责。
- 生成内容均落在 `.claude/kb/` 与 `CLAUDE.md`，方便团队共享与版本化。

## Examples
- 扫描与索引：
```bash
# 列出顶层结构
ls -la

# 搜索入口/初始化相关
rg -n "PGliteProvider|waitReady|migrateFSRS|scheduleNext" src packages
```

- 写入知识库：
```md
# .claude/kb/project-map.md
- packages/lib/: 数据访问、迁移、同步
- src/pages/: 页面与路由
- 关键文档: FSRS_README.md, PGLITE_FIX.md, FRONTEND_GUIDE.md
```

## References
- 入职分析提示词：../../prompts/代码解构与业务分析师.md
- Claude Code Skills 文档：https://code.claude.com/docs/zh-CN/skills

## Notes
- 以事实源为准：代码与 Schema 优先。
- 输出必须可被后续技能直接消费：领域/数据/用例/契约分卷清晰。