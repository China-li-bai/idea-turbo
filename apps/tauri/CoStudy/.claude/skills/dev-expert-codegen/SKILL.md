---
name: dev-expert-codegen
description: 用开发专家Prompt精准生成代码：拆解需求→创建任务清单→实现与测试→预览；保证与私域知识库对齐。
allowed-tools: search_codebase, search_by_regex, list_dir, view_files, write_to_file, update_file, edit_file_fast_apply, run_command, open_preview, todo_write
---

# Dev Expert Codegen

## Instructions
目标：配合“开发专家 Prompt”，在既有项目结构和私域知识库的约束下，精准、可维护地生成与修改代码，保证端到端可运行并最小化耦合。

执行流（严格三段）：
1) 明确需求与验收标准
- 读取与对齐：`FRONTEND_GUIDE.md`、`PROJECT_SUMMARY.md`、`.claude/kb/*`、`design/*`。
- 输出验收清单：输入、输出、边界条件、错误恢复策略、事务边界（如涉及 DB）。

2) 任务拆解与实现
- 用任务清单管理（todo），逐项完成，不并行：
  - 仅修改必要文件，遵循现有风格与命名。
  - 代码变更要以“函数签名即契约”为准，避免隐藏耦合；数据库与 Electric 默认解耦。
- 关键策略：
  - 先局部验证（组件/函数级），再全局验证；不修复无关问题。
  - 涉及 UI 变更必须在预览中人工检查。

3) 验证与预览
- 构建/预览：`pnpm build` 或 `pnpm preview`
- 预览检查：调用预览并人工验证 UI 功能路径；若失败，回到任务清单修正。
- 文档最小更新：对齐 `README.md` 或相关 `FSRS_README.md` 等。

## Examples
- 代码改动（示例流程）：
```text
1. 创建 todo：新增 DeckList 卡片计数列
2. 修改 packages/lib/data-access.ts：增加 getDueCount(deckId)
3. 修改 src/pages/DeckList.tsx：显示 Due 数
4. 运行 pnpm preview 并打开预览检查
```

- 预览检查：
```bash
pnpm preview
# 然后打开 http://localhost:4173/ 手动验证
```

## References
- 开发专家提示词：../../prompts/开发专家Prompt.md
- Claude Code Skills 文档：https://code.claude.com/docs/zh-CN/skills

## Notes
- 优先最小可执行，保持修改的“外延最小”。
- 若改动涉及 UI，务必在预览中复核交互与样式。