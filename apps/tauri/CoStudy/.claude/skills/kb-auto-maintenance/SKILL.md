---
name: kb-auto-maintenance
description: 用自动维护Prompt持续更新文档与知识库：检测变更→生成差异→更新 READMEs/CLAUDE.md →提醒下一步。
allowed-tools: search_codebase, search_by_regex, list_dir, view_files, write_to_file, update_file, edit_file_fast_apply, run_command, todo_write
---

# KB Auto Maintenance

## Instructions
目标：配合“文档自动维护专家 Prompt”，当代码/Schema/配置发生变化时，自动生成变更说明并更新项目文档与私域知识库，使知识持续鲜活。

维护流程：
1) 变更检测
- 读取当前工作区状态：`git status -s`、`git diff -U0`
- 对照知识库主题：领域/数据模型/用例/契约/页面，定位受影响的文档条目。

2) 差异分析与生成说明
- 为每个变更文件归类：
  - 源码（`src/**`, `packages/lib/**`）→ 更新 `.claude/kb/use-cases.md` 或 `coding-contracts.md`
  - Schema/迁移（`schema.sql`, `migrate.ts`, `*.sql`）→ 更新 `.claude/kb/data-model.md` 与 `FSRS_README.md`
  - 配置与脚本（`vite.config.ts`, `tauri.conf.json`）→ 更新 `PROJECT_SUMMARY.md`
- 生成“变更说明”块，含：修改动机、变更点、影响面、回滚方式（若适用）。

3) 文档更新与发布
- 实施最小更新：在对应文档插入/替换段落。
- 若涉及 UI 变更：运行 `pnpm preview` 并在预览中核实；通过后更新 `README.md` 的“使用”或“演示”段落。
- 输出下一步建议（例如：需要补充测试、需要对齐类型定义）。

## Examples
- 检测与提取差异：
```bash
git status -s
git diff -U0 packages/lib/fsrs.ts src/App.tsx
```

- 更新知识库条目（示例）：
```md
# .claude/kb/data-model.md
- 新增字段 cards.version：用于乐观并发控制，默认 0，更新时 +1
```

## References
- 自动维护提示词：../../prompts/文档自动维护专家Prompt.md
- Claude Code Skills 文档：https://code.claude.com/docs/zh-CN/skills

## Notes
- 文档更新遵循“必要且最小”的原则；禁止生成与代码不符的内容。
- 若无真实变更，避免噪音更新；保持知识库可审查与可追踪。