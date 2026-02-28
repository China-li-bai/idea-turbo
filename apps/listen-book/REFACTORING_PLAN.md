# Listen Book 重构计划文档

## 1. 重构目标

在不改动 `page.tsx` 核心逻辑的前提下，集成新的缓存和预加载系统，提升音频播放的性能和用户体验。

## 2. 重构原则

1. **保持向后兼容**: 新功能不应破坏现有功能
2. **最小化改动**: 只修改必要的部分
3. **渐进式重构**: 逐步添加新功能，确保每一步都能正常工作
4. **不改动 page.tsx**: 保持 page.tsx 的核心逻辑不变

## 3. 重构策略

### 3.1 核心思路

通过扩展 `HybridTTSService` 和 `EdgeTTSService` 来集成新的缓存和预加载系统，而不是修改 `page.tsx`。

### 3.2 架构设计

```
page.tsx (保持不变)
  ↓
HybridTTSService (扩展)
  ↓
EdgeTTSService (扩展)
  ↓
AudioQueueManager (新增)
  ↓
AudioQueue (新增)
  ├── AudioCache (新增)
  └── AudioPreloader (新增)
```

### 3.3 设计模式

1. **适配器模式**: 通过适配器将新的队列系统适配到现有的 TTS 服务接口
2. **策略模式**: 根据配置选择使用队列模式或传统模式
3. **观察者模式**: 保持现有的状态订阅机制

## 4. 重构步骤

### 4.1 第一阶段：扩展 EdgeTTSService（已完成）

**目标**: 为 EdgeTTSService 添加队列模式支持

**已完成的工作**:
1. 创建 AudioCache 类
2. 创建 AudioPreloader 类
3. 创建 AudioQueue 类
4. 创建 AudioQueueManager 类
5. 扩展 EdgeTTSService 添加队列管理方法

**新增方法**:
- `enableQueueMode(enable: boolean)` - 启用/禁用队列模式
- `setSegments(segments: TextSegment[])` - 设置片段
- `playQueue()` - 播放队列
- `pauseQueue()` - 暂停队列
- `resumeQueue()` - 恢复队列
- `stopQueue()` - 停止队列
- `seekQueue(index: number)` - 跳转到指定片段

**测试状态**: ✅ 已完成测试

### 4.2 第二阶段：扩展 HybridTTSService（进行中）

**目标**: 为 HybridTTSService 添加队列模式支持

**需要添加的方法**:
```typescript
enableQueueMode(enable: boolean): void;
setSegments(segments: TextSegment[]): void;
playQueue(): Promise<void>;
pauseQueue(): void;
resumeQueue(): void;
stopQueue(): void;
seekQueue(index: number): void;
```

**实现方式**:
- 在 HybridTTSService 中添加队列模式标志
- 将队列操作委托给 EdgeTTSService（因为只有 Edge-TTS 支持队列模式）
- 对于 Web Speech API，继续使用传统的播放方式

**代码示例**:
```typescript
export class HybridTTSService implements ITTSService {
  private useQueueMode: boolean = false;

  enableQueueMode(enable: boolean): void {
    this.useQueueMode = enable;
    this.edgeTTSService.enableQueueMode(enable);
  }

  setSegments(segments: TextSegment[]): void {
    this.edgeTTSService.setSegments(segments);
  }

  async playQueue(): Promise<void> {
    if (this.useQueueMode && this.serviceType === 'edgetts') {
      await this.edgeTTSService.playQueue();
    } else {
      // 使用传统的播放方式
    }
  }

  // 其他队列方法...
}
```

### 4.3 第三阶段：创建适配器层（待完成）

**目标**: 创建一个适配器，将队列操作适配到现有的播放流程

**需要创建的类**:
```typescript
class QueuePlaybackAdapter {
  private hybridTTSService: HybridTTSService;
  private playbackStateManager: PlaybackStateManager;

  constructor(
    hybridTTSService: HybridTTSService,
    playbackStateManager: PlaybackStateManager
  ) {
    this.hybridTTSService = hybridTTSService;
    this.playbackStateManager = playbackStateManager;
  }

  enableQueueMode(enable: boolean): void {
    this.hybridTTSService.enableQueueMode(enable);
  }

  playWithQueue(): Promise<void> {
    const state = this.playbackStateManager.getState();
    this.hybridTTSService.setSegments(state.segments);
    return this.hybridTTSService.playQueue();
  }

  // 其他适配方法...
}
```

### 4.4 第四阶段：集成到现有流程（待完成）

**目标**: 在不修改 page.tsx 的情况下，将队列系统集成到现有流程

**实现方式**:
1. 在 `page.tsx` 的 `useEffect` 中启用队列模式
2. 修改 `handlePlay` 方法，根据队列模式选择播放方式
3. 修改 `handleNextSegment` 方法，使用队列系统的自动播放

**代码示例**:
```typescript
// 在 useEffect 中启用队列模式
useEffect(() => {
  if (speechServiceRef.current instanceof HybridTTSService) {
    speechServiceRef.current.enableQueueMode(true);
  }
}, []);

// 修改 handlePlay 方法
const handlePlay = () => {
  if (!speechServiceRef.current || !playbackManagerRef.current) return;

  const state = playbackManagerRef.current.getState();

  if (state.isPaused) {
    speechServiceRef.current.resume();
    playbackManagerRef.current.setPaused(false);
    return;
  }

  // 如果使用队列模式且有片段，使用队列播放
  if (speechServiceRef.current instanceof HybridTTSService && state.segments.length > 0) {
    speechServiceRef.current.setSegments(state.segments);
    speechServiceRef.current.playQueue().catch(error => {
      console.error('Queue play error:', error);
      // 降级到传统播放方式
      playWithTraditionalMethod();
    });
  } else {
    playWithTraditionalMethod();
  }
};
```

## 5. 风险评估

### 5.1 技术风险

1. **兼容性风险**: 新的队列系统可能与现有的播放流程不兼容
   - **缓解措施**: 保持向后兼容，提供降级方案

2. **性能风险**: 缓存和预加载可能占用过多内存
   - **缓解措施**: 实现合理的缓存淘汰策略

3. **状态同步风险**: 队列状态和 PlaybackState 可能不同步
   - **缓解措施**: 统一状态管理，确保状态一致性

### 5.2 业务风险

1. **用户体验风险**: 新功能可能影响用户体验
   - **缓解措施**: 充分测试，确保功能稳定

2. **功能回归风险**: 新功能可能导致现有功能失效
   - **缓解措施**: 保持向后兼容，提供降级方案

## 6. 测试计划

### 6.1 单元测试

1. **AudioCache 测试** ✅ 已完成
2. **AudioPreloader 测试** ✅ 已完成
3. **AudioQueue 测试** (待完成)
4. **AudioQueueManager 测试** (待完成)
5. **HybridTTSService 队列模式测试** (待完成)

### 6.2 集成测试

1. **队列播放流程测试** (待完成)
2. **缓存和预加载功能测试** (待完成)
3. **状态同步测试** (待完成)
4. **降级方案测试** (待完成)

### 6.3 端到端测试

1. **完整播放流程测试** (待完成)
2. **用户交互测试** (待完成)
3. **性能测试** (待完成)

## 7. 回滚计划

如果重构过程中出现问题，可以按照以下步骤回滚：

1. **禁用队列模式**: 调用 `enableQueueMode(false)` 禁用队列模式
2. **恢复传统播放**: 使用传统的 `speakSegment` 方法播放
3. **清理缓存**: 清理 AudioCache 中的缓存数据
4. **取消预加载**: 取消所有预加载任务

## 8. 成功标准

重构成功的标准：

1. ✅ 所有单元测试通过
2. ⏳ 所有集成测试通过
3. ⏳ 所有端到端测试通过
4. ⏳ 缓存和预加载功能正常工作
5. ⏳ 播放性能提升明显
6. ⏳ 用户体验改善
7. ⏳ 无功能回归

## 9. 后续优化

重构完成后，可以考虑以下优化：

1. **智能预加载**: 根据用户行为预测需要预加载的片段
2. **缓存优化**: 根据网络状况和设备性能动态调整缓存策略
3. **性能监控**: 添加性能监控，实时跟踪缓存命中率和预加载效果
4. **用户配置**: 允许用户自定义缓存和预加载策略

## 10. 总结

本重构计划通过扩展现有的 TTS 服务来集成新的缓存和预加载系统，而不是修改 `page.tsx` 的核心逻辑。这种方式可以保持向后兼容性，降低重构风险，同时提升音频播放的性能和用户体验。

重构分为四个阶段，每个阶段都有明确的目标和测试计划。如果出现问题，可以通过禁用队列模式快速回滚到传统播放方式。
