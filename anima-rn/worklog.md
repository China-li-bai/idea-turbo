# Anima-RN Worklog

## 2026-04-26 - 完全重写聊天界面 ImmersionChat，修复消息消失问题

### 为什么修改
用户多次反馈："发送的消息直接不见了"。之前的修复（调整 FlatList、增加空状态提示）治标不治本，消息仍然会随机消失。用户明确要求"Terminal#976-1020 这个页面有问题直接删除，重写"。

### 根因分析

**根本原因1：handleImmersionSend 状态更新竞态**
```typescript
// 修复前：setInputText 是异步的，handleSend 读取的是旧值
function handleImmersionSend(text: string) {
  setInputText(text)  // 异步排队
  handleSend()         // 立即执行，读取的还是旧 inputText！
}
```
React 状态更新是异步批量的，`setInputText(text)` 不会立即生效，导致 `handleSend()` 中 `!inputText.trim()` 判断可能为 true，消息被静默丢弃。

**根本原因2：FlatList + 复杂 ListEmptyComponent 渲染不稳定**
- `ListEmptyComponent` 的条件判断复杂（initPhase + messages.length）
- `FlatList` 在数据快速变化时可能出现 key 重复或渲染闪烁
- `onContentSizeChange` + `scrollToEnd` 组合在消息添加时可能冲突

**根本原因3：ImmersionChat Props 过于复杂**
- `activeStreamId`、`petMood`、`speedLevel`、`onStreamComplete` 等 props 未被实际使用但增加了复杂度
- 消息类型包含 `isStreaming`、`speedLevel` 等冗余字段

### 修改内容

#### 文件1: [ImmersionChat.tsx](src/components/LivingUI/ImmersionChat.tsx) — 完全重写

**改动A: 用 ScrollView 替代 FlatList**
```typescript
// 修复前: FlatList + ListEmptyComponent + keyExtractor + onContentSizeChange
<FlatList
  data={messages}
  keyExtractor={(item) => item.id}
  renderItem={renderItem}
  ListEmptyComponent={...复杂条件...}
/>

// 修复后: ScrollView + messages.map() 直接渲染
<ScrollView ref={scrollViewRef} ...>
  {messages.map((msg) => (
    <View key={msg.id}>...</View>
  ))}
</ScrollView>
```
- ScrollView 在消息数量不多时（<100条）更稳定
- 直接 map 渲染，无 keyExtractor 问题
- 空状态单独条件渲染，不与消息列表混合

**改动B: 简化 ImmersionMessage 类型**
```typescript
// 移除未使用的字段
export interface ImmersionMessage {
  id: string
  role: 'user' | 'pet' | 'system'
  content: string
  timestamp: number
  mood?: PetMood
  // 移除: isStreaming, speedLevel
}
```

**改动C: 简化 Props 接口**
```typescript
interface ImmersionChatProps {
  messages: ImmersionMessage[]
  onSend: (text: string) => void
  onDismiss?: () => void
  inputPlaceholder?: string
  editable?: boolean
  initPhase?: InitPhase
  loadProgress?: number
  initError?: string | null
  onRetryInit?: () => void
  // 移除: activeStreamId, petMood, speedLevel, onStreamComplete
}
```

**改动D: 添加调试栏**
```typescript
<View style={styles.debugBar}>
  <Text style={styles.debugText}>消息数: {messages.length}</Text>
</View>
```
- 实时显示消息数量，便于排查问题

**改动E: 增强日志输出**
```typescript
console.log('[ImmersionChat] 发送消息:', text.substring(0, 30))
```

#### 文件2: [ChatScreen.tsx](src/screens/ChatScreen.tsx)

**改动F: 重构消息发送函数，直接传递文本参数**
```typescript
// 修复前: 通过 React 状态传递，存在竞态
function handleImmersionSend(text: string) {
  setInputText(text)
  handleSend()
}

// 修复后: 直接传递文本参数，无状态依赖
async function handleSendText(userMsg: string) {
  const trimmedMsg = userMsg.trim()
  // 直接使用参数，不依赖 inputText 状态
  addMessage({ role: 'user', content: trimmedMsg, ... })
}

function handleImmersionSend(text: string) {
  console.log('[ChatScreen] handleImmersionSend 收到文本:', text.substring(0, 30))
  handleSendText(text)
}
```

**改动G: 移除未使用的 speedLevel / streamEventBus 逻辑**
- 移除 `TokenSpeedLevel` 类型导入
- 移除 `streamEventBus` 监听器
- 移除 `speedLevel` state
- 简化 `activeStreamId` effect

**改动H: 简化 immersionMessages 构建**
```typescript
const immersionMessages = messages.map(m => ({
  id: m.id,
  role: m.role as 'user' | 'pet' | 'system',
  content: m.content,
  timestamp: new Date(m.createdAt).getTime(),
  mood: m.role === 'pet' ? currentMood : undefined,
  // 移除: isStreaming, speedLevel
}))
```

**改动I: 简化 ImmersionChat 调用**
```typescript
<ImmersionChat
  messages={immersionMessages}
  onSend={handleImmersionSend}
  onDismiss={exitImmersion}
  inputPlaceholder={...}
  editable={...}
  initPhase={initPhase}
  loadProgress={loadProgress}
  initError={initError}
  onRetryInit={handleAutoInit}
  // 移除: activeStreamId, petMood, speedLevel, onStreamComplete
/>
```

### 验证方式
1. TypeScript 类型检查通过（0 errors）
2. 构建 APK 安装到模拟器
3. 进入聊天界面，观察底部"消息数"调试栏
4. 发送消息，确认：
   - 用户消息立即显示在列表中
   - 消息数计数器实时增加
   - AI 回复后消息数继续增加
   - 发送多条消息，所有消息都持久显示不消失
5. 返回首页再进入聊天，确认历史消息仍在

---

## 2026-04-26 - 修复聊天界面消息不显示问题

### 为什么修改
用户反馈聊天界面存在两个核心问题：
1. 发送消息后看不到自己的消息气泡
2. 看不到宠物的回复消息

### 根因分析

**问题1：handleSend() 守卫条件过于严格**
```javascript
// 修复前：isCoreInitialized=false 时直接 return，用户消息和AI回复都不添加
if (!inputText.trim() || !currentPet || !isCoreInitialized) return
```
当 AnimaCore 初始化失败（ONNX模型下载等问题）时，`isCoreInitialized=false`，导致用户发送的任何消息都被静默丢弃。

**问题2：聊天模式下缺少状态反馈**
- `ImmersionChat` 组件在消息列表为空时没有显示任何内容（空白）
- 初始化进行中/失败时，聊天模式内没有提示信息
- 用户不知道系统当前处于什么状态

### 修改内容

#### 文件1: [ChatScreen.tsx](src/screens/ChatScreen.tsx)

**改动A: handleSend() — 移除 isCoreInitialized 守卫，用户消息始终显示**
```diff
- if (!inputText.trim() || !currentPet || !isCoreInitialized) return
+ if (!inputText.trim() || !currentPet) return
  // ... 添加用户消息 ...
+
+ if (!isCoreInitialized) {
+   // AI未就绪时显示友好提示消息
+   addMessage({ role: 'system', content: '🔄 AI系统正在初始化中...' })
+   return
+ }
  // ... 只有就绪才调用 animaCore.chatStream()
```

**改动B: 导出 InitPhase 类型供 ImmersionChat 使用**
```diff
- type InitPhase = 'idle' | ...
+ export type InitPhase = 'idle' | ...
```

**改动C: 向 ImmersionChat 传递初始化状态**
```diff
  <ImmersionChat
    ...
+   initPhase={initPhase}
+   loadProgress={loadProgress}
+   initError={initError}
+   onRetryInit={handleAutoInit}
  />
```

#### 文件2: [ImmersionChat.tsx](src/components/LivingUI/ImmersionChat.tsx)

**改动D: 扩展 ImmersionChatProps 接口**
```typescript
interface ImmersionChatProps {
  // ...原有props...
+ initPhase?: InitPhase
+ loadProgress?: number
+ initError?: string | null
+ onRetryInit?: () => void
}
```

**改动E: FlatList 添加 ListEmptyComponent**
- **加载中状态**: 显示 emoji + 进度条 + 百分比 (📥下载模型中... 45%)
- **错误状态**: 显示错误图标 + 错误信息 + 重试按钮
- **空状态**: 显示 "💬 开始对话 / 向它倾诉你的想法吧~"

**改动F: 新增样式定义** (initOverlay, errorBox, loadingBox, progressBar, emptyState 等)

### 验证方式
1. Metro 打包成功 (1660 modules, 0 errors)
2. 应用启动正常，HomeScreen 渲染正确
3. 进入聊天模式后：
   - 未初始化时显示加载进度或错误提示
   - 初始化完成后显示 "开始对话" 引导文字
   - 发送消息后立即显示用户消息气泡
   - AI未就绪时显示系统提示消息而非静默丢弃

---

## 2026-04-26 - 修复 ONNX 模型下载 URL 错误导致 Protobuf parsing failed

### 为什么修改
ONNX Embedding 模型加载失败，错误信息为 "Protobuf parsing failed"。经排查发现模型文件只有 22KB（应为 ~127MB），实际内容是 HuggingFace 的 HTML 页面而非真正的 ONNX 模型文件。

### 根因分析
1. **HF_BASE URL 缺少 `/resolve/main/` 路径**：`https://hf-mirror.com/BAAI/bge-small-en-v1.5/` 会返回仓库页面 HTML，而非原始文件。正确 URL 应为 `https://hf-mirror.com/BAAI/bge-small-en-v1.5/resolve/main/`
2. **缺少文件大小校验**：下载后未验证文件大小，损坏的 HTML 文件被当作有效模型使用
3. **损坏文件未被清理**：`getFileInfo` 返回 `exists: true`（因为文件确实存在），导致跳过重新下载

### 修改内容
**文件**: [OnnxEmbeddingEngine.ts](src/lib/OnnxEmbeddingEngine.ts)

1. **修复下载 URL**：
   ```diff
   - const HF_BASE = 'https://hf-mirror.com/BAAI/bge-small-en-v1.5/'
   + const HF_BASE = 'https://hf-mirror.com/BAAI/bge-small-en-v1.5/resolve/main/'
   ```

2. **添加文件大小校验常量**：
   ```typescript
   const MIN_MODEL_SIZE = 10 * 1024 * 1024  // 10MB 最小阈值
   const MIN_VOCAB_SIZE = 1000               // vocab 最小阈值
   ```

3. **增强 `ensureEmbeddingModelExists()` 逻辑**：
   - 检查文件存在性 **且** 大小超过阈值才视为有效
   - 检测到损坏文件时自动删除并重新下载
   - 下载后再次验证文件大小，不满足则抛出明确错误

### 验证方式
1. 删除设备上的损坏模型文件：`adb shell "run-as com.weigh.animarn rm -rf files/models/embedding/"`
2. 重启 Metro (`npx expo start --dev-client --clear`)
3. 在模拟器上滑进入聊天界面触发初始化
4. 观察 Metro 日志确认模型从正确 URL 下载并通过大小校验

---

## 2026-04-23 - Phase 2 调研：隐私保护LBS社交 + 冷启动/留存/裂变设计

### 一、LBS隐私保护技术调研

#### 核心洞察：不需要真地图
用 PetConstellation（宠物星图）替代真地图——用户看到的是赛博星空中闪烁的光点，不是暴露位置的地图。
- 更隐私：从不展示真实地理信息
- 更契合美学：完美融入"数字灵魂培养皿"风格
- 更轻量：零地图 SDK 依赖
- 更浪漫："你的猫在星图上遇到了一只灵魂契合的狗" > "你附近2.3km有一只狗"

#### 位置隐私方案对比
| 方案 | 原理 | 隐私强度 | 复杂度 | 结论 |
|------|------|---------|--------|------|
| H3 六边形索引 | GPS→格子ID，只上传格子号 | ★★★★ | ★☆☆ | **MVP首选** |
| Geohash + k-匿名 | GPS→字符串前缀匹配 | ★★★ | ★☆☆ | 备选 |
| Geo-Indistinguishability | GPS加拉普拉斯噪声 | ★★★★★ | ★★★ | 未来增强 |
| ZKLP零知识位置证明 | 证明"我在某区域"不暴露坐标 | ★★★★★ | ★★★★★ | 2025前沿(TUM/IEEE S&P 2025) |

#### 选型：Uber H3 六边形空间索引
- 16级分辨率：res7≈5km²（附近），res6≈36km²（同城区）
- kRing(h3Index, 1) 一行代码获取7个相邻格子
- npm: `h3-js`（纯JS），`h3-react-native`（原生绑定）
- 2025前沿ZKLP论文也用六边形空间索引

#### 隐私匹配：哈希Jaccard + OpenMined PSI
- MVP: 标签SHA256前8位 → Jaccard相似度 → 服务器只看到哈希碰撞
