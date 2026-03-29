# 架构改进实施指南

## 📋 改进概述

本次改进实施了以下关键功能：

1. **安全存储** - API Key 加密存储
2. **错误处理系统** - 用户友好的错误提示
3. **模型加载进度** - 可视化加载进度
4. **全局错误边界** - 优雅的错误恢复

---

## 🔧 使用方法

### 1. 安全存储 (SecureStorage)

**用途**: 加密存储敏感信息（如 API Key）

**示例**:
```typescript
import { secureStorage } from '@/lib/utils/secureStorage';

// 初始化（通常在应用启动时）
await secureStorage.initialize('user-master-password');

// 加密存储 API Key
await secureStorage.saveSecurely('openai-api-key', 'sk-xxxxx');

// 读取 API Key
const apiKey = await secureStorage.loadSecurely('openai-api-key');

// 删除 API Key
await secureStorage.removeSecurely('openai-api-key');
```

**集成到 AI 配置**:
```typescript
// 在 AIConfigPanel.tsx 中
import { secureStorage } from '@/lib/utils/secureStorage';

async function saveAPIKey(provider: string, key: string) {
  await secureStorage.saveSecurely(`${provider}-api-key`, key);
}

async function loadAPIKey(provider: string): Promise<string | null> {
  return await secureStorage.loadSecurely(`${provider}-api-key`);
}
```

---

### 2. 错误处理系统 (ErrorHandler)

**用途**: 统一的错误处理和用户友好的错误提示

**示例**:
```typescript
import { handleError, ErrorSeverity, ErrorCategory } from '@/lib/utils/errorHandler';

// 处理网络错误
try {
  await fetch('/api/data');
} catch (error) {
  handleError(
    error,
    'DataFetch',
    ErrorSeverity.HIGH,
    ErrorCategory.NETWORK
  );
}

// 处理存储错误
try {
  await localStorage.setItem('key', 'value');
} catch (error) {
  handleError(
    error,
    'LocalStorage',
    ErrorSeverity.MEDIUM,
    ErrorCategory.STORAGE
  );
}

// 处理 AI 错误
try {
  await aiService.chat(messages);
} catch (error) {
  handleError(
    error,
    'AIChat',
    ErrorSeverity.HIGH,
    ErrorCategory.AI
  );
}
```

**订阅错误**:
```typescript
import { ErrorHandler } from '@/lib/utils/errorHandler';

useEffect(() => {
  const unsubscribe = ErrorHandler.subscribe((error) => {
    console.log('Error occurred:', error.userMessage);
    // 可以在这里添加额外的错误处理逻辑
  });
  
  return unsubscribe;
}, []);
```

---

### 3. 模型加载进度 (ModelLoadingProgress)

**用途**: 显示 AI 模型加载进度

**集成到 oramaSearchService**:
```typescript
// 在 oramaSearchService.ts 中
async initialize() {
  const progressCallback = (current: number, total: number, message?: string) => {
    // 通知进度组件
    if (typeof window !== 'undefined' && (window as any).__modelLoadingProgress) {
      (window as any).__modelLoadingProgress({ current, total, message });
    }
  };
  
  await this._initialize(progressCallback);
}
```

**在组件中使用**:
```typescript
import { ModelLoadingProgress } from '@/components/ui/ModelLoadingProgress';

function App() {
  return (
    <>
      <ModelLoadingProgress />
      {/* 其他组件 */}
    </>
  );
}
```

---

### 4. 全局错误边界 (GlobalErrorBoundary)

**用途**: 捕获 React 组件错误，优雅降级

**在 AppLayout 中使用**:
```typescript
import { GlobalErrorBoundary } from '@/components/ui/GlobalErrorBoundary';

function AppLayout() {
  return (
    <GlobalErrorBoundary>
      {/* 应用内容 */}
    </GlobalErrorBoundary>
  );
}
```

**自定义降级 UI**:
```typescript
<GlobalErrorBoundary 
  fallback={<div>自定义错误页面</div>}
>
  {/* 应用内容 */}
</GlobalErrorBoundary>
```

---

### 5. 错误提示 (ErrorToast)

**用途**: 显示用户友好的错误提示

**自动集成**: ErrorToast 会自动订阅 ErrorHandler 的错误事件

**手动触发**:
```typescript
import { handleError, ErrorSeverity, ErrorCategory } from '@/lib/utils/errorHandler';

// 这会自动显示 ErrorToast
handleError(
  '操作失败',
  'UserAction',
  ErrorSeverity.MEDIUM,
  ErrorCategory.UNKNOWN
);
```

---

## 🔄 数据流架构改进

### 当前架构（需要重构）

```
用户操作 → Store.addItem() → 
  1. 更新 Zustand state.items
  2. 调用 oramaSearchService.indexItem()
```

### 目标架构（单向数据流）

```
用户操作 → Service.createIdea() → 
  1. 创建数据对象
  2. 持久化到 Storage
  3. 索引到 Orama
  4. 发布事件到 EventBus
  → Store 订阅事件更新 UI
```

**实施步骤**:

1. 创建 `unifiedDataService.ts`:
```typescript
import { eventBus } from '@/lib/utils/eventBus';
import { oramaSearchService } from './oramaSearchService';
import { localforage } from '@/lib/storage';

class UnifiedDataService {
  async createIdea(content: string): Promise<UnifiedCalendarItem> {
    const idea = this.factory.createIdea(content);
    
    await localforage.setItem(`item-${idea.id}`, idea);
    await oramaSearchService.indexItem(idea);
    
    eventBus.publish({
      type: 'created',
      entityType: 'item',
      entityId: idea.id,
      data: idea
    });
    
    return idea;
  }
}
```

2. 更新 `useUnifiedItems.ts`:
```typescript
export function useUnifiedItems() {
  const [items, setItems] = useState<UnifiedCalendarItem[]>([]);
  
  useEffect(() => {
    const unsubscribe = eventBus.subscribe('item', (event) => {
      if (event.type === 'created') {
        setItems(prev => [...prev, event.data]);
      }
    });
    
    unifiedDataService.getAll().then(setItems);
    
    return unsubscribe;
  }, []);
  
  return { items };
}
```

3. 简化 `unifiedStore.ts`:
```typescript
interface UIStore {
  viewMode: 'boss' | 'secretary';
  selectedDate: Date;
  loadingStates: Record<string, boolean>;
  errors: Record<string, string>;
}
```

---

## 📝 集成清单

### 必须集成

- [ ] 在 `AppLayout.tsx` 中添加 `GlobalErrorBoundary`
- [ ] 在 `AppLayout.tsx` 中添加 `ErrorToast`
- [ ] 在 `AppLayout.tsx` 中添加 `ModelLoadingProgress`
- [ ] 在应用启动时初始化 `secureStorage`
- [ ] 更新 `AIConfigPanel` 使用 `secureStorage`

### 推荐集成

- [ ] 替换所有 `console.error` 为 `handleError`
- [ ] 在 `unifiedStore` 中集成进度回调
- [ ] 创建 `unifiedDataService` 并重构数据流
- [ ] 添加单元测试

---

## 🧪 测试

### 测试安全存储
```typescript
import { secureStorage } from '@/lib/utils/secureStorage';

describe('SecureStorage', () => {
  it('should encrypt and decrypt data', async () => {
    await secureStorage.initialize('test-password');
    await secureStorage.saveSecurely('test-key', 'test-value');
    const value = await secureStorage.loadSecurely('test-key');
    expect(value).toBe('test-value');
  });
});
```

### 测试错误处理
```typescript
import { ErrorHandler, ErrorSeverity, ErrorCategory } from '@/lib/utils/errorHandler';

describe('ErrorHandler', () => {
  it('should handle errors and notify listeners', () => {
    const listener = vi.fn();
    ErrorHandler.subscribe(listener);
    
    handleError('Test error', 'Test', ErrorSeverity.MEDIUM, ErrorCategory.UNKNOWN);
    
    expect(listener).toHaveBeenCalled();
    expect(listener.mock.calls[0][0].userMessage).toBeDefined();
  });
});
```

---

## 🎯 下一步

1. **立即行动**: 集成所有组件到 `AppLayout.tsx`
2. **短期行动**: 重构数据流架构
3. **中期行动**: 添加完整的测试覆盖

---

## 📚 参考资源

- [Web Crypto API 文档](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Zustand 最佳实践](https://github.com/pmndrs/zustand/wiki/Performance)
