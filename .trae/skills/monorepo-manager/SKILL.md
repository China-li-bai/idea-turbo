---
name: "monorepo-manager"
description: "Turborepo + pnpm monorepo 项目管理规范。涵盖项目结构、依赖管理、静态资源、CDN 配置、缓存策略等最佳实践。"
---

# Monorepo Manager

This skill provides comprehensive guidance for managing Turborepo + pnpm monorepo projects, covering project structure, dependency management, static assets, CDN configuration, and caching strategies.

## Core Concepts

### 1. Turborepo 核心概念

Turborepo 是一个高性能的 JavaScript/TypeScript 构建系统，专为 monorepo 设计。

#### 关键特性

- **任务调度**: 自动并行化依赖任务
- **缓存机制**: 本地 + 远程缓存
- **增量构建**: 只构建有改动的包
- **依赖分析**: 自动解析包依赖关系

#### 核心文件

```
├── turbo.json          # Turborepo 配置
├── pnpm-workspace.yaml # pnpm 工作区配置
├── package.json       # 根目录 package.json
├── apps/              # 应用目录
│   └── listen-book/
├── packages/          # 共享包目录
│   └── sherpa-onnx/
└── node_modules/      # 软链接
```

### 2. pnpm Workspace 配置

#### pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  # 排除测试目录
  - '!**/test/**'
```

#### 根 package.json

```json
{
  "name": "my-monorepo",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "test": "turbo run test"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

#### 包 package.json（两种模式）

**模式一：源文件直接导出（推荐开发时使用）**

无需构建，Next.js/Turbopack 自动编译 TypeScript。适合开发阶段快速迭代。

```json
{
  "name": "@myorg/some-package",
  "version": "0.1.0",
  "main": "./src/index.ts",
  "module": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "import": "./src/index.ts",
      "default": "./src/index.ts"
    }
  },
  "files": [
    "src"
  ],
  "scripts": {
    "check-types": "tsc --noEmit"
  }
}
```

**模式二：构建后导出（发布时使用）**

需要先构建，适合发布到 npm 或生产环境。

```json
{
  "name": "@myorg/some-package",
  "version": "0.1.0",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  }
}
```

**选择建议**：
| 场景 | 推荐模式 | 原因 |
|------|----------|------|
| 内部 monorepo 开发 | 源文件导出 | 无需构建，热更新快 |
| 发布到 npm | 构建后导出 | 兼容性好，用户无需 TS |
| 包含复杂构建步骤 | 构建后导出 | 如需要 babel、rollup 等 |

### 3. turbo.json 配置

```json
{
  "$schema": "https://turborepo.com/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

## Project Structure

### 1. 推荐的目录结构

```
├── apps/                    # 应用（部署单元）
│   ├── web/                # Next.js 应用
│   ├── mobile/            # React Native
│   ├── docs/              # 文档站点
│   └── listen-book/       # 主应用
│       ├── app/           # Next.js app router
│       ├── components/    # 组件
│       ├── lib/           # 工具函数
│       ├── public/        # 静态资源
│       └── ...            # 其他 Next.js 配置
│
├── packages/               # 共享包（复用单元）
│   ├── ui/                # UI 组件库
│   ├── utils/             # 工具函数
│   ├── config/           # 配置
│   ├── eslint-config/    # ESLint 配置
│   ├── tsconfig/         # TypeScript 配置
│   └── sherpa-onnx/      # 语音识别
│       ├── src/          # 源代码
│       ├── dist/         # 编译输出
│       └── package.json
│
├── tools/                 # 开发工具
├── scripts/               # 构建脚本
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### 2. 包命名规范

| 类型 | 命名示例 | 说明 |
|------|----------|------|
| 应用 | `@idea-turbo/listen-book` | 完整名称 |
| UI 组件 | `@idea-turbo/ui` | 共享 UI |
| 工具 | `@idea-turbo/utils` | 工具函数 |
| 配置 | `@idea-turbo/eslint-config` | ESLint |
| 类型 | `@idea-turbo/types` | 共享类型 |

### 3. 导入规范

```typescript
// 同一包内
import { something } from './utils';

// 同一 workspace
import { something } from '@idea-turbo/utils';

// 外部包
import { something } from 'lodash';
```

## Dependency Management

### 1. 依赖类型

#### 生产依赖 vs 开发依赖

```json
{
  "dependencies": {
    "@idea-turbo/shared": "workspace:*",
    "react": "^18.0.0"
  },
  "devDependencies": {
    "@idea-turbo/eslint-config": "workspace:*",
    "typescript": "^5.0.0"
  }
}
```

#### workspace:* vs 版本号

| 方式 | 示例 | 适用场景 |
|------|------|----------|
| `workspace:*` | `"@idea-turbo/utils": "workspace:*"` | 始终使用最新 |
| `workspace:^` | `"@idea-turbo/utils": "workspace:^"` | 兼容版本 |
| 具体版本 | `"@idea-turbo/utils": "0.1.0"` | 固定版本 |

### 2. 共享依赖

#### hoist 策略

pnpm 默认将依赖提升到根目录：

```
node_modules/
├── react/           # 提升的依赖
├── typescript/
└── @idea-turbo/     # workspace 包软链接
    ├── utils/
    └── sherpa-onnx/
```

#### 外部化依赖

在 `pnpm-workspace.yaml` 中配置：

```yaml
packages:
  - 'apps/*'
  - 'packages/*'

onlyBuiltDependencies:
  - esbuild
  - typescript
```

### 3. 依赖过滤

#### 使用 --filter

```bash
# 只构建指定包
pnpm run build --filter=@idea-turbo/sherpa-onnx

# 构建指定包及其依赖
pnpm run build --filter=@idea-turbo/sherpa-onnx...

# 构建依赖指定包的所有包
pnpm run build --filter=^@idea-turbo/sherpa-onnx

# 排除某个包
pnpm run build --filter=!@idea-turbo/docs
```

#### Turborepo filter

```bash
# 只运行指定 app
turbo run dev --filter=listen-book

# 包括依赖
turbo run build --filter=listen-book...

# 排除
turbo run build --filter=!docs
```

## Static Assets

### 1. 静态资源放置

| 资源类型 | 位置 | 引用方式 |
|----------|------|----------|
| 公共资源 | `apps/*/public/` | `/path/to/file` |
| 组件资源 | `packages/*/assets/` | 导入使用 |
| 动态资源 | 外部 CDN | 完整 URL |

### 2. Public 目录结构

```
apps/listen-book/public/
├── models/                      # ML 模型
│   └── sherpa-onnx/
│       ├── encoder.onnx
│       ├── decoder.onnx
│       ├── joiner.onnx
│       └── tokens.txt
├── sherpa-wasm/                # WASM 文件
│   ├── sherpa-onnx-wasm-main-asr.wasm
│   ├── sherpa-onnx-wasm-main-asr.js
│   └── sherpa-onnx-asr.js
├── images/
├── fonts/
└── robots.txt
```

### 3. 资源引用

```typescript
// 本地静态资源（public 目录）
const wasmPath = '/sherpa-wasm/sherpa-onnx-wasm-main-asr.wasm';

// 组件内导入
import wasmFile from '../assets/wasm.wasm';  // 需配置 webpack/vite
```

## CDN Configuration

### 1. CDN 选择

| CDN | 特点 | 适用场景 |
|-----|------|----------|
| Cloudflare Workers | 免费、可定制 | 自有资源分发 |
| Vercel | 零配置 | Vercel 部署 |
| jsDelivr | 免费、公共 | npm 包 |
| 自建 | 完全控制 | 大文件/私有 |

### 2. 环境变量配置

```typescript
// apps/listen-book/.env.local
NEXT_PUBLIC_CDN_URL=https://cdn.example.com
NEXT_PUBLIC_SHERPA_ONNX_CDN=https://sherpa-onnx-cdn.workers.dev

// 使用
const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || '';
```

### 3. CDN 资源加载

```typescript
// 配置化
const CDN_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_SHERPA_ONNX_CDN || '',
  files: {
    wasm: 'sherpa-onnx-wasm-main-asr.wasm',
    data: 'sherpa-onnx-wasm-main-asr.data',
  }
};

// 加载
async function loadFromCDN(path: string): Promise<ArrayBuffer> {
  const url = `${CDN_CONFIG.baseUrl}/${path}`;
  const response = await fetch(url);
  return response.arrayBuffer();
}
```

### 4. 本地 + CDN 策略

```typescript
// 优先本地，后备 CDN
function getResourceUrl(path: string): string {
  // 检查本地是否存在
  const localPath = `/resources/${path}`;
  
  // 本地优先
  if (typeof window !== 'undefined') {
    // 可以添加检查逻辑
    return localPath;
  }
  
  // CDN 后备
  return `${process.env.NEXT_PUBLIC_CDN}/${path}`;
}
```

## Caching Strategy

### 1. Turborepo 缓存

#### 本地缓存

```bash
# 清除本地缓存
turbo clean

# 查看缓存
turbo run build --dry
```

#### 远程缓存

```json
// turbo.json
{
  "remoteCache": {
    "signature": true
  }
}
```

### 2. pnpm 缓存

```bash
# 清除 node_modules
pnpm store prune

# 查看存储
pnpm store path
```

### 3. 应用缓存 (IndexedDB)

对于大文件（如 WASM 模型），使用浏览器缓存：

```typescript
// 缓存策略
const CACHE_STRATEGY = {
  // 小文件 (< 100KB): 每次请求
  small: 'no-cache',
  // 中文件: 缓存 + 后台更新
  medium: 'stale-while-revalidate',
  // 大文件 (> 1MB): 强缓存
  large: 'force-cache'
};
```

## Common Issues

### 1. 模块找不到

**错误**: `Module not found: Can't resolve '@idea-turbo/sherpa-onnx'`

**根本原因分析**:
1. 包的 `exports` 指向 `dist/` 但未构建
2. pnpm workspace 链接未正确建立
3. 包名或路径配置错误

**解决方案（按推荐顺序）**:

**方案 A：源文件直接导出（开发阶段推荐）**

修改 `packages/xxx/package.json`：
```json
{
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "import": "./src/index.ts",
      "default": "./src/index.ts"
    }
  },
  "files": ["src"]
}
```

然后重新安装：
```bash
pnpm install
```

**方案 B：构建后使用**
```bash
# 构建指定包
pnpm run build --filter=@idea-turbo/sherpa-onnx

# 或构建所有
pnpm run build
```

**方案 C：完全重置**
```bash
# 清理所有缓存
rm -rf node_modules
rm -rf **/node_modules
rm pnpm-lock.yaml
turbo clean

# 重新安装
pnpm install
```

### 2. 类型定义丢失

**错误**: `Cannot find module '@xxx/types' or its corresponding type declarations`

**解决**:
```json
// package.json
{
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts"
    }
  }
}
```

### 3. 循环依赖

**解决**:
```bash
# 检查依赖环
pnpm why <package>

# 重构消除环
// - 提取共享代码到新包
// - 使用依赖注入
```

### 4. 构建产物冲突

**解决**:
```json
// turbo.json
{
  "tasks": {
    "build": {
      "outputs": ["dist/**", "build/**"],
      "inputs": ["src/**"]
    }
  }
}
```

### 5. 开发服务器热更新失效

**解决**:
```bash
# 重启并清理
turbo clean
pnpm run dev
```

## Best Practices

### 1. 包设计原则

- **单一职责**: 每个包只做一件事
- **明确边界**: 最小化公共 API
- **版本管理**: 遵循 SemVer
- **文档**: 包含 README 和类型注释

### 2. 构建优化

```json
// turbo.json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"],
      "cache": true
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### 3. 代码共享

```typescript
// 避免直接导入 app 代码
// ❌ import { something } from 'apps/web/lib/utils'

// ✅ 创建共享包
// packages/utils/src/index.ts
export function something() { }

// apps/web/package.json
// "dependencies": { "@idea-turbo/utils": "workspace:*" }
```

### 4. 类型共享

```json
// packages/types/package.json
{
  "name": "@idea-turbo/types",
  "version": "0.1.0",
  "types": "./index.ts"
}

// 其他包
{
  "dependencies": {
    "@idea-turbo/types": "workspace:*"
  }
}
```

## Commands Reference

### 常用命令

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm run dev
turbo run dev

# 构建
pnpm run build
turbo run build

# 过滤构建
pnpm run build --filter=@idea-turbo/sherpa-onnx

# 清理
turbo clean
pnpm store prune

# 查看依赖
pnpm why <package>

# 类型检查
turbo run typecheck
```

### Turborepo 命令

```bash
# dry run (预览)
turbo run build --dry

# 强制执行 (忽略缓存)
turbo run build --force

# 并行限制
turbo run build --concurrency=5

# 日志
turbo run build --verbose
```

## Checklist

### 项目初始化

- [ ] 创建 `pnpm-workspace.yaml`
- [ ] 配置 `turbo.json`
- [ ] 设置根 `package.json`
- [ ] 配置 TypeScript 引用

### 包开发

- [ ] 遵循命名规范 `@org/package-name`
- [ ] 正确配置 `exports` 字段
- [ ] 包含类型定义
- [ ] 编写 README

### 构建优化

- [ ] 配置 `outputs` 避免不必要的构建
- [ ] 使用 `dependsOn` 管理依赖
- [ ] 启用远程缓存 (CI)
- [ ] 定期清理缓存
