---
name: "webassembly-debugger"
description: "WebAssembly 加载问题排查、缓存机制调试、Emscripten 问题解决。Invoke when encountering WASM loading issues, cache problems, or Emscripten integration errors."
---

# WebAssembly Debugger

This skill provides comprehensive debugging knowledge for WebAssembly (WASM) loading issues, caching mechanisms, and Emscripten integration problems.

## Core Knowledge

### 1. Emscripten 加载机制

#### Module 对象配置

Emscripten 生成的 JS 依赖全局 `Module` 对象：

```typescript
window.Module = {
  // 核心：自定义文件加载路径
  locateFile: (path: string, scriptDirectory?: string) => string,
  
  // 状态回调
  setStatus: (status: string) => void,
  
  // 就绪回调
  onRuntimeInitialized: () => void,
  
  // 错误处理
  onAbort: (what: string) => void,
  
  // 自定义 POST 数据
  postRun: () => void,
};
```

#### locateFile 详解

`locateFile` 是 Emscripten 加载 WASM 的核心钩子：

```typescript
locateFile: (path: string, scriptDirectory: string = '') => {
  console.log('[Emscripten] Requesting:', path);
  
  // path 可能是:
  // - "xxx.wasm" - 主 WASM 文件
  // - "xxx.data" - 辅助数据文件
  // - "xxx.js" - JS 胶水代码
  // - "encoder-xxx.onnx" - 模型文件
  // - "tokens.txt" - 词表文件
  
  if (path.endsWith('.wasm')) {
    return '/path/to/xxx.wasm';
  }
  if (path.endsWith('.data')) {
    return 'https://cdn.example.com/xxx.data';
  }
  
  return scriptDirectory + path;
}
```

### 2. 常见加载问题

#### 问题：WASM 文件 404

**症状**: Network 显示 `xxx.wasm` 返回 404

**排查**:
1. 检查 `locateFile` 返回值是否正确
2. 确认文件是否存在于返回的 URL
3. 检查 CORS 配置

**解决**:
```typescript
locateFile: (path) => {
  if (path.endsWith('.wasm')) {
    return `/public/wasm/${path}`;  // 确保文件存在
  }
  return path;
}
```

#### 问题：.data 文件重复下载

**症状**: 每次刷新页面都重新下载 `.data` 文件

**根因**: 
1. 未使用缓存
2. 缓存 key 不正确
3. 缓存被浏览器清除

**解决**: 使用 IndexedDB 缓存 + Blob URL

```typescript
// 缓存管理器
class ModelCacheManager {
  async getCachedModel(url: string): Promise<ArrayBuffer | null> {
    // 从 IndexedDB 获取
  }
  
  getBlobUrlSync(url: string): string | null {
    // 返回已缓存的 Blob URL
  }
}

// locateFile 中使用
locateFile: (path) => {
  if (path.endsWith('.data')) {
    const cdnUrl = `https://cdn.example.com/${path}`;
    const blobUrl = cacheManager.getBlobUrlSync(cdnUrl);
    return blobUrl || cdnUrl;  // 优先用缓存
  }
  return path;
}
```

#### 问题：WASM 初始化失败

**症状**: `RuntimeError: memory.grow: Out of memory` 或类似错误

**排查**:
1. 检查 `Module.locateFile` 返回的文件是否正确
2. 确认 WASM 版本与 JS 胶水代码版本匹配
3. 检查浏览器内存限制

#### 问题：XMLHttpRequest 未被拦截

**症状**: fetch 拦截生效，但 WASM 仍然下载

**根因**: Emscripten 内部使用 `XMLHttpRequest` 而非 `fetch`

**解决**: 同时拦截 XHR

```typescript
// 拦截 XHR
const originalXHROpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url, ...args) {
  if (isModelFile(url)) {
    const cached = await cacheManager.getCachedModel(url);
    if (cached) {
      // 拦截响应
      this._response = cached;
      return originalXHROpen.call(this, method, localUrl, ...args);
    }
  }
  return originalXHROpen.call(this, method, url, ...args);
};

// 重写 response getter
const originalResponse = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'response');
Object.defineProperty(XMLHttpRequest.prototype, 'response', {
  get: function() {
    if (this._response) return this._response;
    return originalResponse?.get?.call(this);
  }
});
```

### 3. 缓存策略

#### IndexedDB 缓存模式

```typescript
class ModelCacheManager {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'WasmModelCache';
  private readonly STORE_NAME = 'models';
  
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'url' });
        }
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  async cacheModel(url: string, data: ArrayBuffer): Promise<void> {
    const tx = this.db!.transaction(this.STORE_NAME, 'readwrite');
    const store = tx.objectStore(this.STORE_NAME);
    await store.put({
      url,
      data,
      timestamp: Date.now(),
      size: data.byteLength
    });
  }
  
  async getCachedModel(url: string): Promise<ArrayBuffer | null> {
    return new Promise((resolve) => {
      const tx = this.db!.transaction(this.STORE_NAME, 'readonly');
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.get(url);
      
      request.onsuccess = () => {
        const result = request.result;
        resolve(result?.data || null);
      };
      
      request.onerror = () => resolve(null);
    });
  }
}
```

#### Blob URL 模式

```typescript
// 从缓存创建 Blob URL
async function getBlobUrl(url: string): Promise<string> {
  const cached = await cacheManager.getCachedModel(url);
  
  if (cached) {
    const blob = new Blob([cached], { 
      type: url.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream' 
    });
    return URL.createObjectURL(blob);
  }
  
  // 未缓存，下载并缓存
  const response = await fetch(url);
  const data = await response.arrayBuffer();
  await cacheManager.cacheModel(url, data);
  
  const blob = new Blob([data], { 
    type: url.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream' 
  });
  return URL.createObjectURL(blob);
}
```

### 4. 请求拦截技术

#### Fetch 拦截

```typescript
const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : input.url;
  
  if (isWasmFile(url)) {
    const cached = await cacheManager.getCachedModel(url);
    if (cached) {
      return new Response(cached, {
        status: 200,
        headers: { 'Content-Type': 'application/wasm' }
      });
    }
  }
  
  const response = await originalFetch(input, init);
  
  // 缓存响应
  if (isWasmFile(url) && response.ok) {
    const cloned = response.clone();
    const data = await cloned.arrayBuffer();
    await cacheManager.cacheModel(url, data);
  }
  
  return response;
};
```

#### XHR 拦截

```typescript
const originalXHROpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(
  method: string, 
  url: string | URL, 
  ...rest: any[]
) {
  const urlStr = url.toString();
  
  if (isWasmFile(urlStr)) {
    // 重定向到本地或缓存
    const localPath = getLocalPath(urlStr);
    return originalXHROpen.call(this, method, localPath, ...rest);
  }
  
  return originalXHROpen.call(this, method, url, ...rest);
};
```

## Debugging Workflow

### Phase 1: 确认问题

1. **检查 Network 面板**
   - 哪些文件被请求？
   - 哪些返回 404？
   - 哪些重复请求？

2. **检查 Console 面板**
   - Emscripten 状态消息
   - 错误堆栈
   - locateFile 日志

3. **检查 Application > IndexedDB**
   - 缓存是否存储成功？
   - 缓存 key 是否正确？

### Phase 2: 定位根因

| 现象 | 可能原因 | 排查点 |
|------|----------|--------|
| WASM 404 | 路径错误 | `locateFile` 返回值 |
| 重复下载 | 缓存未生效 | IndexedDB 数据、拦截器 |
| 初始化失败 | 版本不匹配 | JS/WASM 版本 |
| 内存错误 | 文件损坏/过大 | 文件完整性 |

### Phase 3: 修复验证

1. 清除浏览器缓存和 IndexedDB
2. 刷新页面，观察 Network
3. 确认文件只下载一次
4. 刷新页面，确认缓存生效

## Common Patterns

### 模式 1: 本地优先 + CDN 后备

```typescript
locateFile: (path) => {
  // 优先使用本地文件
  const localPath = `/public/wasm/${path}`;
  if (fileExists(localPath)) {
    return localPath;
  }
  
  // 后备 CDN
  return `https://cdn.example.com/${path}`;
}
```

### 模式 2: 缓存优先

```typescript
locateFile: async (path) => {
  const url = `https://cdn.example.com/${path}`;
  
  // 检查缓存
  const blobUrl = await cacheManager.getBlobUrl(url);
  if (blobUrl) return blobUrl;
  
  // 下载并缓存
  return await cacheManager.downloadAndCache(url);
}
```

### 模式 3: 预加载

```typescript
// 页面加载时预加载所有模型
async function preloadModels() {
  const urls = ['model.wasm', 'model.data', 'tokens.txt'];
  
  for (const url of urls) {
    await cacheManager.downloadAndCache(url);
  }
}

// WASM 加载时使用缓存
locateFile: (path) => {
  return cacheManager.getBlobUrlSync(path) || path;
}
```

## Key Guidelines

### 调试命令

```javascript
// 在浏览器 Console 中执行
console.log('Module paths:', Object.keys(window.Module));
console.log('WASM loaded:', typeof Module._main !== 'undefined');

// 检查 locateFile
Module.locateFile = (path) => {
  console.log('[Debug] locateFile:', path);
  return originalLocateFile(path);
};

// 检查请求
const originalFetch = window.fetch;
window.fetch = (...args) => {
  console.log('[Debug] fetch:', args[0]);
  return originalFetch(...args);
};
```

### 检查清单

- [ ] `locateFile` 是否被正确设置？
- [ ] 返回的 URL 是否可访问？
- [ ] CORS 配置是否正确？
- [ ] IndexedDB 是否存储成功？
- [ ] Blob URL 是否有效？
- [ ] fetch 和 XHR 拦截是否都生效？

### 常见错误码

| 错误 | 含义 | 解决 |
|------|------|------|
| 404 | 文件不存在 | 检查 `locateFile` 返回值 |
| CORS | 跨域问题 | 添加 CORS 头 |
| OOM | 内存不足 | 检查 WASM 内存配置 |
| Aborted | 加载被中止 | 检查网络/超时 |
