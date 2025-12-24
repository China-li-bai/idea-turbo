# PGlite + Supabase 本地优先架构指南

## 概述

本项目已从 ElectricSQL + Supabase 迁移到 PGlite + Supabase 架构，实现真正的"本地优先（local-first）"应用架构。PGlite 是 PostgreSQL 的 WebAssembly 版本，可在浏览器中运行，提供完整的 PostgreSQL 功能。我们的实现使用了 PGlite 的官方同步插件 `@electric-sql/pglite-sync`，并结合 Supabase 的实时订阅功能实现数据同步。

## 架构优势

### 本地优先架构的优势

1. **离线工作能力**：应用即使在没有网络连接的情况下也能完全正常工作
2. **即时响应**：所有操作在本地执行，无网络延迟
3. **数据隐私**：敏感数据优先存储在本地
4. **更好的用户体验**：应用加载更快，交互更流畅
5. **无缝同步**：数据在后台与远程 Supabase 数据库同步

### PGlite 的优势

1. **完整的 PostgreSQL 功能**：支持完整的 SQL 语法和 PostgreSQL 特性
2. **WebAssembly 性能**：接近原生性能的数据库操作
3. **类型安全**：与 TypeScript 完美集成
4. **持久化存储**：数据在浏览器中持久保存
5. **扩展支持**：支持 PostgreSQL 扩展

### PGlite Sync 的优势

1. **官方支持**：使用 PGlite 官方同步插件，确保稳定性和性能
2. **灵活配置**：支持多种同步策略和冲突解决
3. **增量同步**：仅同步变更的数据，提高效率
4. **实时同步**：结合 Supabase 实时订阅，实现近实时的数据同步

## 技术栈

- **前端**: React + TypeScript + Tauri
- **本地数据库**: PGlite (PostgreSQL WebAssembly)
- **同步插件**: @electric-sql/pglite-sync
- **远程数据库**: Supabase (PostgreSQL)
- **实时通信**: Supabase Realtime API

## 安装与设置

1. 安装依赖：
```bash
pnpm install
```

2. 复制并配置环境变量：
```bash
cp .env.example .env
# 编辑 .env 文件，添加您的 Supabase 配置
```

3. 启动开发服务器：
```bash
pnpm dev
```

## 环境变量配置

创建 `.env` 文件并配置以下变量：

```
# Supabase 配置
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# 数据库连接
VITE_DATABASE_URL=your-supabase-database-url

# PGlite 配置
VITE_PGLITE_PERSIST=true
VITE_PGLITE_FS_URL=idb://make-gold-pg

# PGlite + Supabase 同步配置
VITE_SYNC_ENABLED=true
VITE_SYNC_AUTO_START=true
```

## 使用指南

### 基本数据库操作

```typescript
import { usePGlite } from '@/lib/electric'

function MyComponent() {
  const { db, isLoading } = usePGlite()
  
  async function createTable() {
    if (!db) return
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)
  }
  
  async function addTask(title: string) {
    if (!db) return
    
    await db.query(
      'INSERT INTO tasks (title) VALUES ($1)',
      [title]
    )
  }
  
  async function getTasks() {
    if (!db) return []
    
    const result = await db.query('SELECT * FROM tasks ORDER BY created_at')
    return result.rows
  }
  
  // ...
}
```

### 与 Supabase 同步

```typescript
import { usePGlite } from '@/lib/electric'

function SyncComponent() {
  const { db, syncShapeToTable } = usePGlite()
  
  const handleSync = async () => {
    try {
      if (!db || !syncShapeToTable) return
      
      // 同步本地表与 Supabase 表
      await syncShapeToTable({
        table: 'tasks',         // 本地表名
        primaryKey: ['id'],     // 主键字段
        supabaseTable: 'tasks'   // Supabase 表名
      })
      
      console.log('同步完成')
    } catch (error) {
      console.error('同步失败:', error)
    }
  }
  
  return (
    <button onClick={handleSync}>
      与 Supabase 同步数据
    </button>
  )
}
```

### 实时订阅 Supabase 变更

```typescript
import { usePGlite, useEffect } from 'react'

function RealtimeComponent() {
  const { db, subscribeToTable } = usePGlite()
  
  useEffect(() => {
    if (!db || !subscribeToTable) return
    
    // 订阅 Supabase 表的变更
    const unsubscribe = subscribeToTable('tasks', (payload) => {
      console.log('收到变更通知:', payload)
      // 这里可以触发本地数据刷新
    })
    
    // 清理函数：取消订阅
    return unsubscribe
  }, [db, subscribeToTable])
  
  // ...
}
```

## 同步原理

### 初始化流程

1. **初始化 PGlite**：创建 WebAssembly PostgreSQL 实例
2. **加载同步插件**：启用 `@electric-sql/pglite-sync` 扩展
3. **创建本地表**：根据 Supabase 表结构创建本地表
4. **同步初始数据**：从 Supabase 获取初始数据并插入本地表
5. **建立实时订阅**：监听 Supabase 表变更，实现实时同步

### 增量同步

1. **变更检测**：通过 Supabase 实时订阅接收变更通知
2. **数据应用**：将变更应用到本地 PGlite 数据库
3. **冲突解决**：根据配置的策略解决冲突
4. **状态更新**：更新同步状态和元数据

### 冲突解决策略

1. **本地优先**：本地数据总是覆盖远程数据
2. **远程优先**：远程数据总是覆盖本地数据
3. **时间戳优先**：使用时间戳决定保留哪个版本
4. **用户选择**：提示用户选择保留哪个版本

## 高级功能

### 自定义同步配置

```typescript
// 自定义同步配置
const syncConfig = {
  table: 'tasks',
  primaryKey: ['id'],
  supabaseTable: 'tasks',
  // 自定义映射列名
  mapColumns: {
    'local_column': 'remote_column'
  },
  // 初始同步方法
  initialInsertMethod: 'csv',
  // 错误处理
  onError: (error) => {
    console.error('同步错误:', error)
  }
}

await syncShapeToTable(syncConfig)
```

### 批量操作与事务

```typescript
// 使用事务执行批量操作
await db.transaction(async (tx) => {
  await tx.query('INSERT INTO tasks (title) VALUES ($1)', ['Task 1'])
  await tx.query('INSERT INTO tasks (title) VALUES ($1)', ['Task 2'])
  await tx.query('UPDATE tasks SET completed = true WHERE id = $1', [taskId])
})
```

### 数据库迁移

```typescript
// 数据库迁移示例
async function migrateDatabase(db: PGlite) {
  // 检查迁移版本
  const { rows } = await db.query(
    'SELECT version FROM migrations ORDER BY version DESC LIMIT 1'
  )
  const currentVersion = rows[0]?.version || 0
  
  // 应用迁移
  if (currentVersion < 1) {
    await db.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    
    await db.query('INSERT INTO migrations (version) VALUES (1)')
  }
  
  // 更多迁移...
}
```

## 性能优化

1. **索引优化**：为常用查询添加适当的索引
2. **批量操作**：使用事务批量处理多个操作
3. **懒加载**：按需加载数据
4. **增量同步**：仅同步变更的数据
5. **连接池**：复用数据库连接

## 故障排除

### 常见问题

1. **PGlite 初始化失败**：
   - 检查浏览器是否支持 WebAssembly
   - 确认环境变量配置正确
   - 查看控制台错误日志

2. **同步失败**：
   - 检查网络连接
   - 验证 Supabase 配置
   - 确认表结构是否一致

3. **数据不一致**：
   - 实施更严格的冲突解决策略
   - 考虑添加数据校验
   - 手动触发完全同步

4. **性能问题**：
   - 检查索引是否正确设置
   - 减少同步频率
   - 考虑分批处理大量数据

## 扩展功能

1. **离线检测与自适应同步**：根据网络状态调整同步策略
2. **冲突解决 UI**：开发用户友好的冲突解决界面
3. **数据加密**：为敏感数据添加端到端加密
4. **多表关联同步**：实现复杂的多表关联同步
5. **同步状态可视化**：提供详细的同步状态和历史记录

## 资源与参考

- [PGlite 官方文档](https://pglite.dev/)
- [PGlite Sync 文档](https://pglite.dev/docs/sync)
- [Supabase 文档](https://supabase.com/docs)
- [Supabase 实时 API](https://supabase.com/docs/guides/realtime)
- [本地优先架构理念](https://www.inkandswitch.com/local-first/)
- [WebAssembly 性能优化](https://web.dev/webassembly/)