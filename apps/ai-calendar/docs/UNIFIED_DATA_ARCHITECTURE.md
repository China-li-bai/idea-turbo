# 统一数据架构设计 v3 (docs copy)

> 此文件为 `UNIFIED_DATA_ARCHITECTURE.md` 的 docs 目录副本，保持同步。
> 最后更新: 2026-04-22 | 架构版本: Storage-First

完整文档请参考根目录 [`UNIFIED_DATA_ARCHITECTURE.md`](../UNIFIED_DATA_ARCHITECTURE.md)

## 快速参考：v3 核心变更

### Storage-First 数据流
```
写入: UI → Store Action → IndexedDB/Storage (真相源) → Orama → EventBus
读取: Storage → Zustand Store (缓存) → Hooks → Components
```

### 新增文件
- [calendarItemStorage.ts](../lib/storage/calendarItemStorage.ts) — 日历项 IndexedDB 存储层

### 关键修改
- **unifiedStore.ts**: 全部写操作同步 Storage + EventBus；initialize 从 Storage 加载
- **storage/index.ts**: 新增 calendarItems 存储实例
- **eventBus.ts**: 新增 calendarItem / memory 实体类型
- **persist version**: 升至 3，memories 从 partialize 移除

### 分层记忆系统（当前状态）
| 层级 | 类型 | 状态 |
|------|------|------|
| 工作记忆 | working | ✅ 已实现 |
| 短期记忆 | short-term | ✅ 已实现 |
| 长期记忆 | long-term | ✅ 已实现 |
| 感官记忆 | sensory | 📋 待规划 |
| 核心记忆 | core | 📋 待规划 |
| 情景记忆 | episodic | 📋 待规划 |
