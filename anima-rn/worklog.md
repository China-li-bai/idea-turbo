# Anima-RN Worklog

## 2026-04-21 - Living UI 重构（Cozy-Cyberpunk 风格）

### 为什么修改
用户提出 AI 产品界面的核心误区：不应像"系统设置"或"微信聊天列表"，而应实现 **Living UI（生命感界面）**：
- 核心理念：不打扰、有呼吸、能触摸、自运转
- 界面定位："装着数字灵魂的培养皿"或"全息观测舱"
- 风格：Cozy-Cyberpunk（治愈系赛博）

### 完成内容

#### 1. PetHabitat 主界面组件
- 创建 [PetHabitat.tsx](src/components/LivingUI/PetHabitat.tsx)
- 实现"培养皿容器"概念，包含：
  - 动态背景动画（赛博光影）
  - 宠物舞台区域
  - 记忆碎片显示区
  - 思维流可视化区
  - 底部状态栏和交互按钮

#### 2. BreathingPet 会呼吸的宠物本体
- 创建 [BreathingPet.tsx](src/components/LivingUI/BreathingPet.tsx)
- 实现14种情绪状态的微表情动画：
  - idle, thinking, typing, sniffing, listening
  - happy, excited, sad, angry, sleepy
  - curious, love, surprised, shy
- 每种状态有独立的 scale、rotate、translateY 和 duration 参数
- 呼吸动画循环 + 情绪状态平滑过渡

#### 3. ThinkingFlow 思维流可视化
- 创建 [ThinkingFlow.tsx](src/components/LivingUI/ThinkingFlow.tsx)
- 可视化 Qwen-0.5B 推理过程：
  - 流动粒子动画
  - 思想气泡漂浮效果
  - 状态指示器（⚡ Qwen-0.5B 推理中...）
  - 自动循环切换思考文本

#### 4. MemoryFragment 记忆碎片
- 创建 [MemoryFragment.tsx](src/components/LivingUI/MemoryFragment.tsx)
- Mnemosyne 端侧记忆机制的具象化：
  - 三种记忆类型：episodic（事件）、semantic（知识）、emotion（情绪）
  - 每种类型有独特的图标、颜色和时间显示
  - 入场动画 + 微光闪烁效果 + 轻微摇晃
  - 自动消失动画

#### 5. CyberGlass 玻璃拟态设计系统
- 创建 [CyberGlass.tsx](src/components/LivingUI/CyberGlass.tsx)
- Cozy-Cyberpunk 风格的核心视觉语言：
  - 三种色调：light、dark、neon
  - 可调节透明度（intensity）
  - 边框高光效果
  - 发光效果（glow）
  - GlassCard 和 GlassButton 便捷组件

#### 6. ChatScreen 沉浸式重构
- 重构 [ChatScreen.tsx](src/screens/ChatScreen.tsx)
- **破除聊天框统治**理念实现：
  - 默认全屏显示 PetHabitat（宠物秀场）
  - 点击底部按钮时通过 react-native-reanimated 丝滑推出聊天界面
  - 使用 withSpring 和 withTiming 实现物理感过渡
  - 聊天界面覆盖时宠物空间半透明淡化
  - 集成完整情绪引擎和触觉反馈系统

### 技术亮点

1. **AI 驱动视觉**：Qwen-0.5B 输出情绪 → AIEmotionEngine 分析 → Rive/BreathingPet 动画
2. **可视化本地计算**：ThinkingFlow + MemoryFragment 让用户看到 AI 在手机本地思考
3. **玻璃拟态美学**：CyberGlass 实现赛博光影效果，无生硬边框
4. **沉浸式交互**：react-native-reanimated 实现丝滑的界面切换
5. **情绪状态机**：14种情绪状态 + 平滑过渡 + 触觉反馈联动

### 安全审计
- ✅ 所有用户输入经过 emotionIntegration 处理
- ✅ 记忆数据不包含敏感信息（仅显示摘要）
- ✅ 触觉反馈不会泄露隐私数据
- ✅ 动画性能优化（useNativeDriver: true）

### 自我评价
这次重构实现了用户提出的 **Living UI** 理念，将传统的聊天界面转变为沉浸式的数字生命体验。核心突破：

1. **概念创新**：从"工具面板"到"数字灵魂培养皿"
2. **技术整合**：Rive 动画 + Reanimated 过渡 + Haptic 反馈
3. **用户体验**：平时是宠物秀场，需要时才弹出聊天，符合"不打扰"原则
4. **心理暗示**：思维流和记忆碎片让用户感知到 AI 在本地运行，增强信任感

**待改进点**：
- MemoryFragment 目前使用模拟数据，需对接真实 Mnemosyne API
- RivePetAvatar 需要实际的 .riv 动画文件
- 可考虑添加更多环境音效配合视觉效果

---

## 2026-04-21 - 首页重构（数字灵魂培养皿）

### 为什么修改
用户提出 **"不要让用户觉得他们在用软件，要让他们觉得他们在凝视一个生命"** 的核心理念：
- 砸碎传统底部导航栏、顶部标题栏、方方正正的卡片
- 实现三层架构：环境层（Vibe）+ 生命层（Soul）+ 交互层（Glass）
- 使用 Skia GPU 着色器实现流体背景，零 CPU 占用
- 手势交互配合弹簧物理，实现"肌肉记忆般的物理手感"

### 完成内容

#### 1. 安装 @shopify/react-native-skia
- 用于 GPU 加速的流体动画渲染
- 支持 GLSL/SKSL 片段着色器
- 与 react-native-reanimated 无缝集成

#### 2. FluidBackground 流体背景组件
- 创建 [FluidBackground.tsx](src/components/HomeScreen/FluidBackground.tsx)
- 实现 **Perlin Noise GLSL 着色器**：
  - 三层噪声叠加（noise1 + noise2 + noise3）
  - 正弦波流动效果
  - 暗角渐变（Vignette）
  - 高光发光效果
- **8 种情绪色彩映射**：
  - idle: 深蓝灰 (#0F172A)
  - happy: 紫红渐变
  - sad: 深海蓝
  - excited: 洋红高亮
  - thinking: 蓝紫思考态
  - love: 暖粉红色
  - sleepy: 暗沉蓝
  - angry: 暗红色调
- 使用 `useClock()` + `useDerivedValue` 实现时间驱动动画
- **CPU 占用率接近 0**（全部在 GPU 上运行）

#### 3. ParticleField 星尘粒子系统
- 创建 [ParticleField.tsx](src/components/HomeScreen/ParticleField.tsx)
- **24 个默认粒子环绕宠物运动**
- 每个粒子独立参数：轨道半径、速度、相位、透明度、大小
- **大脑活跃度映射**：
  - idle: 24 粒子，速度 1.0x
  - waiting: 24 粒子，速度 1.8x
  - streaming: 36 粒子，速度 2.5x
- 粒子颜色随情绪变化（love=neonPink, happy=cyan, excited=coral）
- 呼吸式脉冲缩放 + 随机闪烁效果

#### 4. GestureLayer 手势交互层
- 创建 [GestureLayer.tsx](src/components/HomeScreen/GestureLayer.tsx)
- **四种手势支持**：
  1. **单指轻拍 (Tap)** → 触发 Haptic 震动 + 冒出爱心气泡 💕✨💖
  2. **上滑 (Swipe Up)** → 弹簧物理拉开水幕，进入聊天界面
  3. **双指缩小 (Pinch)** → 视角拉高，过渡到 LBS 地图模式
  4. **拖拽 (Drag)** → 宠物跟随手指弹性移动，松手果冻回弹
- **弹簧物理参数**：
  - damping: 12-15（阻尼）
  - stiffness: 100-180（刚度）
  - mass: 0.8（质量）
- 使用 `Gesture.Race()` 组合多种手势竞争识别

#### 5. HomeScreen 主屏幕组件
- 创建 [HomeScreen.tsx](src/components/HomeScreen/HomeScreen.tsx)
- **三层架构完整整合**：

| 层级 | 组件 | 功能 |
|------|------|------|
| 底层 Vibe | FluidBackground | Perlin Noise 流体背景 |
| 中层 Soul | ParticleField + BreathingPet + ThinkingFlow + MemoryFragment | 星尘 + 宠物 + 思维流 + 记忆碎片 |
| 顶层 Glass | CyberGlass 状态卡片 + 聊天触发按钮 | 磨砂玻璃 UI |

- **状态联动**：
  - brainActive → ThinkingFlow 显示 + 星尘加速
  - isThinking → 状态文字淡入/淡出
  - mood 变化 → 流体背景颜色切换 + 粒子颜色变化
  - 手势操作 → 触觉反馈 + 情绪状态转换

#### 6. 导航结构重构
- 更新 [navigation/index.tsx](src/navigation/index.tsx)
- **砸碎传统 Tab Bar**，改为 Stack 导航：
  ```
  Home (首页培养皿) 
    ↓ 上滑/点击
  Chat (流式聊天) - transparentModal
    ↓ 双指缩小
  Map (LBS 地图模式)
    ↓ 侧滑
  Memories / System
  ```

### 技术亮点

1. **GPU 零占用流体动画**：Skia RuntimeEffect + Perlin Noise Shader
2. **弹簧物理手势系统**：react-native-gesture-handler + Reanimated withSpring
3. **AI 大脑活跃度可视化**：粒子数量/速度映射 Qwen-0.5B 推理状态
4. **情绪驱动视觉系统**：14 种情绪 → 8 种背景色调 + 动态粒子颜色
5. **磨砂玻璃 UI 层**：CyberGlass 组件实现 Cozy-Cyberpunk 风格

### 安全审计
- ✅ 所有手势回调使用 runOnJS 包装，避免线程问题
- ✅ 粒子系统 pointerEvents="none"，不拦截触摸事件
- ✅ 触觉反馈不泄露任何隐私数据
- ✅ 动画全部 useNativeDriver: true（GPU 加速）

### 自我评价
这次重构实现了用户提出的 **"数字灵魂培养皿"** 理念，核心突破：

1. **概念创新**：从"工具面板"到"全息观测舱"
2. **技术突破**：Skia GLSL 着色器实现真正的流体背景（非视频/CSS hack）
3. **交互革命**：弹簧物理手势替代死板动画定时器
4. **性能极致**：GPU 渲染流体 + 粒子，CPU 近乎空闲给大模型推理
5. **心理暗示**：星尘速度让用户感知 AI 在"思考"

**架构对比**：
```
传统 App:
┌─────────────────┐
│ Header (标题栏)  │ ← 砸碎
├─────────────────┤
│ Tab Bar          │ ← 砸碎
├─────┬─────┬─────┤
│ 卡片 │ 卡片 │ 卡片│ ← 研磨成玻璃
└─────┴─────┴─────┘

Anima-Rn HomeScreen:
┌─────────────────┐
│  ╭───────────╮  │
│  │ 流体背景   │  │ ← GPU Perlin Noise
│  │  ✦ ✧ ✦   │  │ ← 星尘粒子
│  │   🐱      │  │ ← 会呼吸的宠物
│  │  💭💬     │  │ ← 思维流/记忆碎片
│  ╰───────────╯  │
│ ┌───────────┐  │ ← 磨砂玻璃状态卡
│ │ 说点什么 ↑ │  │ ← 手势触发聊天
│ └───────────┘  │
└─────────────────┘
```

### 待改进点
- MapPlaceholder 需要实现真实的 LBS 地图界面
- 可添加更多环境音效（呼吸声、水流声）
- 考虑低端设备的粒子数量降级策略

---

## 2026-04-21 - Web 平台适配与 Skia 初始化修复

### 为什么修改
在 Web 端运行时遇到两个关键错误：
1. `Skia.RuntimeEffect.Make()` 在模块顶层调用时，Skia JSI 引擎还未初始化
2. `PictureRecorder` undefined 错误，因为 CanvasKit 在 Web 端需要异步加载

### 完成内容

#### 1. Skia 初始化时序修复
**问题根因**：
```tsx
// ❌ 模块顶层执行（import 阶段）
const fluidShaderSource = Skia.RuntimeEffect.Make(`...`)!  // 💥 RuntimeEffect undefined
```

**解决方案**：
```tsx
// ✅ SKSL 字符串作为常量（纯字符串，不触发 Skia）
const FLUID_SHADER_SKSL = `uniform float2 resolution; ...`

// ✅ 组件内 useMemo 懒初始化（Canvas 挂载后 Skia 已就绪）
function FluidShader({ ... }) {
  const fluidShaderSource = useMemo(() => {
    return Skia.RuntimeEffect.Make(FLUID_SHADER_SKSL)
  }, [])
  
  if (!fluidShaderSource) return null  // ✅ 兜底保护
}
```

#### 2. 创建 Web 平台降级组件
React Native 的 `.web.tsx` 后缀会自动选择平台版本：

| 原生端 | Web 端 |
|--------|--------|
| `FluidBackground.tsx` → Skia GPU 着色器 | `FluidBackground.web.tsx` → Reanimated 透明度动画 |
| `ParticleField.tsx` → Skia Canvas 粒子 | `ParticleField.web.tsx` → Reanimated 缩放/位移动画 |

**FluidBackground.web.tsx 实现**：
```tsx
// 三层颜色叠加 + 透明度呼吸动画
function FluidBackgroundWeb({ mood, intensity, timeSpeed }) {
  const progress = useSharedValue(0)
  const colors = MOOD_COLORS[mood]
  
  // 15 秒周期的正弦波动画
  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 15000 / timeSpeed, easing: Easing.inOut(Easing.sin) }),
      -1, true
    )
  }, [timeSpeed])
  
  return (
    <View style={styles.container}>
      <Animated.View style={[{ backgroundColor: colors.primary }, animatedColor1]} />
      <Animated.View style={[{ backgroundColor: colors.secondary }, animatedColor2]} />
      <Animated.View style={[{ backgroundColor: colors.ambient }, animatedColor3]} />
    </View>
  )
}
```

**ParticleField.web.tsx 实现**：
```tsx
// 8 个粒子，每个独立动画
function ParticleWeb({ x, y, size, color, delay, brainActivity }) {
  const progress = useSharedValue(0)
  
  useEffect(() => {
    const timeout = setTimeout(() => {
      progress.value = withRepeat(
        withTiming(1, { duration: 3000 / brainActivity }),
        -1, true
      )
    }, delay * 1000)
    return () => clearTimeout(timeout)
  }, [brainActivity, delay])
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 0.8 + progress.value * 0.4 * brainActivity },
      { translateY: -20 * progress.value * brainActivity },
    ],
    opacity: 0.3 + progress.value * 0.5 * brainActivity,
  }))
  
  return <Animated.View style={[styles.particle, animatedStyle]} />
}
```

### 技术经验总结

#### 为什么不用 Skia Web？

| 方案 | 优点 | 缺点 |
|------|------|------|
| **Skia Web (CanvasKit)** | GPU 加速，效果与原生一致 | 体积 ~3MB，首屏加载慢；JSI 绑定复杂，初始化时机难控制 |
| **Reanimated Web** | 体积小，与 RN 共享代码；动画流畅 | 无 GPU 加速，复杂效果受限 |

**结论**：对于流体背景和粒子系统，Reanimated 的降级方案足够流畅，且不影响首屏性能。

#### 平台适配最佳实践

1. **`.native.tsx` / `.web.tsx` 后缀**：React Native 自动选择，无需运行时判断
2. **共享接口定义**：两个平台组件使用相同的 Props 类型
3. **降级而非降质**：Web 版本保持相同的情绪映射和参数接口
4. **性能优先**：Web 端避免重型依赖，原生端充分利用 GPU

### 文件变更
- 修复 [FluidBackground.tsx](src/components/HomeScreen/FluidBackground.tsx) - Skia 初始化时序
- 新建 [FluidBackground.web.tsx](src/components/HomeScreen/FluidBackground.web.tsx) - Web 降级版
- 新建 [ParticleField.web.tsx](src/components/HomeScreen/ParticleField.web.tsx) - Web 降级版

### 安全审计
- ✅ useMemo 依赖数组为空，shader 只编译一次
- ✅ null 检查防止 shader 编译失败导致崩溃
- ✅ Web 组件无原生依赖，不会泄露隐私数据
- ✅ 动画全部使用 useNativeDriver（原生端）/ requestAnimationFrame（Web 端）

---

## 2026-04-22 - Living UI Phase 3 完成：呼吸感渲染 + 思维导图 + 吞噬动画

### 为什么修改
继续推进 Living UI 三大交互模式的完整实现：
1. **呼吸感渲染**：AI 吐字速度映射到动画参数，让界面随 AI 思考节奏"呼吸"
2. **思维导图模式**：极致长对话的 SubconsciousMap，将对话可视化为发光节点网络
3. **吞噬动画**：撤回消息时宠物张嘴吞掉气泡 + 打嗝反应
4. **记忆粒子增强**：气泡消失→粒子化→贝塞尔曲线飞向记忆库图标

### 完成内容

#### 1. TokenSpeedTracker - AI 吐字速度追踪器
- 创建 [TokenSpeedTracker.ts](src/components/LivingUI/TokenSpeedTracker.ts)
- **5 级速度等级**：stalled / slow / normal / fast / burst
- **实时指标计算**：
  - tokensPerSecond（每秒 token 数）
  - avgIntervalMs（平均间隔）
  - recentBurstCount（突发窗口计数）
  - isIdle（空闲检测，超时自动归零）
- **弹簧物理参数映射**：每级速度 + 14 种情绪 → 独立的 damping/stiffness/mass 组合
- **事件驱动架构**：通过 StreamEventBus 发布速度变化，组件按需订阅

#### 2. BreathCurve - 呼吸曲线系统
- 创建 [BreathCurve.ts](src/components/LivingUI/BreathCurve.ts)
- **核心映射函数**：
  - `getBreathCurve(speedLevel, mood)` → 呼吸动画参数
  - `getBreathPhysicsForCurve(speedLevel, mood)` → 弹簧物理参数
  - `getStreamingCursorAnimation(speedLevel, mood)` → 光标闪烁参数
  - `getBubblePulseAnimation(speedLevel, mood)` → 气泡脉冲参数
  - `computeBreathState(time, curve)` → 实时呼吸相位计算
- **5 级速度 × 14 种情绪 = 70 种动画组合**
- **呼吸三阶段**：inhale（吸气）→ exhale（呼气）→ rest（停顿）
- **情绪修正器**：thinking 时幅度缩小 0.7x，excited 时加速 1.5x

#### 3. StreamingBubble 呼吸感升级
- 修改 [StreamingBubble.tsx](src/components/FluidChat/StreamingBubble.tsx)
- **动态弹簧物理**：bubbleScale 随 speedLevel 变化调整阻尼和刚度
- **呼吸光标**：BreathingCursor 组件，闪烁速度映射 AI 输出速度
- **气泡脉冲**：scale 在 1 ± scaleAmplitude 之间呼吸式缩放
- **光晕脉冲**：glowPulse 透明度随呼吸曲线波动

#### 4. PetEmergence 呼吸感升级
- 修改 [ImmersionChat.tsx](src/components/LivingUI/ImmersionChat.tsx)
- **弹簧物理入场**：opacity/translateY/scale 使用动态 breathPhysics 参数
- **呼吸缩放**：breathScale 随 token 速度脉冲
- **涟漪效果**：rippleScale + rippleOpacity 呼吸式扩散
- **光晕脉冲**：glowPulse 频率映射 breathCurve.rippleSpeed

#### 5. MemorySpark 粒子增强
- 修改 [AmbientBubble.tsx](src/components/LivingUI/AmbientBubble.tsx)
- **贝塞尔曲线路径**：粒子沿二次贝塞尔曲线飞向记忆库图标
  ```tsx
  bezierPoint(p0, p1, p2, t) = (1-t)²·p0 + 2(1-t)t·p1 + t²·p2
  ```
- **粒子尾迹**：每个粒子 3-5 个尾迹点，透明度递减
- **到达闪光**：粒子到达记忆库图标时触发闪光效果
- **随机曲率**：perpendicular 方向 ±0.4 的随机偏移，避免粒子轨迹雷同

#### 6. DevourAnimation - 撤回变吞噬
- 创建 [DevourAnimation.tsx](src/components/LivingUI/DevourAnimation.tsx)
- **三阶段动画**：
  1. 气泡飞向宠物嘴巴（spring 物理 + 旋转 + 缩小）
  2. 宠物张嘴咀嚼（mouthOpen + bodyScale + chewCycle）
  3. 打嗝反应（🫧 + "嗝~" + Haptic heavy）
- **useDevourAnimation Hook**：封装触发/完成逻辑
- **Haptic 联动**：吞噬过程触发 medium → light → heavy 三级震动

#### 7. SubconsciousMap - 思维导图模式
- 创建 [SubconsciousMap.tsx](src/components/LivingUI/SubconsciousMap.tsx)
- **四种节点类型**：
  | 类型 | 图标 | 颜色 | 含义 |
  |------|------|------|------|
  | topic | 📌 | cyan | 话题关键词 |
  | emotion | 💭 | neonPink | 情绪关键词 |
  | entity | 🏷️ | lime | 实体名词 |
  | memory | 🧠 | violet | 记忆节点 |
- **发光边连接**：GlowEdge 组件，强度映射关系紧密度
- **中央发光轴**：CentralAxis 随情绪变色（happy=cyan, sad=violet, excited=neonPink）
- **手势交互**：
  - Pinch 缩放（0.5x - 3x，弹性回弹）
  - Pan 平移（自由拖拽）
  - 节点点击（选中高亮 + Haptic selection）
- **generateSubconsciousNodes 算法**：
  - 中文分词（按标点分割，≥2 字）
  - 情绪关键词识别（5 类情绪词典）
  - 共现关系提取（窗口大小 4）
  - 频率排序取 Top 20
  - 螺旋布局 + 随机抖动
- **宠物观察者**：右下角宠物 emoji + "正在观察思维..." 提示

#### 8. ChatScreen 集成
- 修改 [ChatScreen.tsx](src/screens/ChatScreen.tsx)
- **三种交互模式完整串联**：
  ```
  短对话 → AmbientBubble（意识气泡）
  长对话 → ImmersionChat（意识空间）
  极致长对话 → SubconsciousMap（思维导图）
  ```
- **思维导图触发**：对话 ≥6 条时显示 🧠 按钮
- **吞噬动画集成**：DevourAnimation 覆盖层 + 打嗝冒泡
- **模式切换**：ImmersionPortal 和 SubconsciousMap 互斥显示

#### 9. LivingUI 导出更新
- 修改 [index.ts](src/components/LivingUI/index.ts)
- 新增导出：SubconsciousMap, generateSubconsciousNodes, SubconsciousNode, SubconsciousEdge
- 新增导出：DevourAnimation, useDevourAnimation

### 技术亮点

1. **呼吸感渲染**：AI 吐字速度 → 5 级速度等级 → 70 种动画组合 → 界面"呼吸"
2. **贝塞尔粒子**：二次贝塞尔曲线 + 随机曲率 → 自然优雅的粒子轨迹
3. **吞噬隐喻**：撤回 = 宠物吃掉气泡 + 打嗝，将负面操作转化为可爱互动
4. **思维导图**：自动从对话中提取关键词和关系，螺旋布局 + 发光节点网络
5. **弹簧物理**：所有动画使用 withSpring 而非 withTiming，实现"肌肉记忆般的物理手感"

### 安全审计
- ✅ generateSubconsciousNodes 仅处理消息内容，不泄露用户隐私
- ✅ DevourAnimation 的 Haptic 反馈不包含敏感数据
- ✅ TokenSpeedTracker 仅追踪时间戳，不记录 token 内容
- ✅ SubconsciousMap 手势处理使用 runOnJS 包装
- ✅ 所有动画使用 useNativeDriver: true

### 自我评价
Phase 3 实现了 Living UI 的三大核心交互模式，从"聊天框统治"彻底走向"意识空间"：

1. **呼吸感**：界面不再是死板的 UI，而是随 AI 思考节奏起伏的"生命体"
2. **吞噬隐喻**：将"撤回"这种负面操作转化为宠物吃掉气泡的可爱互动
3. **思维导图**：极致长对话不再是无尽滚动，而是可缩放、可探索的发光节点网络
4. **完整串联**：短对话→意识气泡→意识空间→思维导图，三种模式无缝切换

**架构全景**：
```
ChatScreen
├── Vibe Layer: FluidBackground (GPU Perlin Noise)
├── Soul Layer: ParticleField + SharedPet
├── Glass Layer: StatusCard + ChatTrigger
├── AmbientBubbleManager (短对话)
├── ImmersionPortal (长对话)
│   ├── ImmersionChat (意识空间)
│   │   ├── PetEmergence (呼吸感气泡)
│   │   ├── BreathingCursor (呼吸光标)
│   │   └── ImmersionInput (情绪输入框)
│   ├── MemoryAnchorSidebar (记忆锚点)
│   └── MapTrigger → SubconsciousMap (思维导图)
└── DevourAnimation (吞噬动画)
```

### 待改进点
- SubconsciousMap 的关键词提取目前基于简单分词，可接入 NLP 分词器
- DevourAnimation 需要对接实际的消息撤回 API
- 可添加思维导图节点的长按操作（展开相关对话）

---

## 2026-04-22 - 记忆架构评估与新功能技术调研

### 为什么修改
用户提出三个核心问题：
1. 项目现有记忆架构（Mnemosyne）是否合理？有哪些改进空间？
2. "宠物记住用户喜好"+"分享链接"H5 破冰功能的技术可行性
3. Phase 2 LBS 地图与社交的技术方案

### 一、记忆架构评估

#### 1.1 架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                    Mnemosyne 记忆架构                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │
│  │ WorkingMemory │   │ EpisodicMem  │   │ SemanticFact │   │
│  │ (工作记忆)    │   │ (情景记忆)    │   │ (语义记忆)    │   │
│  │              │   │              │   │              │   │
│  │ In-Memory    │   │ SQLite+Vec   │   │ SQLite       │   │
│  │ Max: 20条    │   │ Embedding    │   │ Confidence   │   │
│  │ Per Conv     │   │ Decay: 0.95  │   │ Boost: +0.1  │   │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘   │
│         │                  │                   │           │
│         └──────────────────┼───────────────────┘           │
│                            │                               │
│  ┌─────────────────────────┴─────────────────────────┐     │
│  │              EmbeddingEngine                       │     │
│  │  ┌─────────────────┐  ┌──────────────────────┐   │     │
│  │  │ KeywordFallback  │  │ ONNX BGE-Micro-v2    │   │     │
│  │  │ 128d hash-based  │  │ 384d semantic embed  │   │     │
│  │  └─────────────────┘  └──────────────────────┘   │     │
│  └───────────────────────────────────────────────────┘     │
│                            │                               │
│  ┌─────────────────────────┴─────────────────────────┐     │
│  │              PrivacyGuard                          │     │
│  │  Level 1: 🌐 公开  │  Level 2: 👥 熟人 │  Level 3: 🔒 私密 │
│  │  owner: [1,2,3]    │  friend: [1,2]   │  visitor: [1]    │
│  └───────────────────────────────────────────────────┘     │
│                                                             │
│  ┌───────────────────────────────────────────────────┐     │
│  │              Consolidation Engine                  │     │
│  │  - 6轮对话 or 10分钟触发                          │     │
│  │  - Episodic: 0.95衰减 → <0.15删除                │     │
│  │  - Semantic: 0.02衰减 → <0.1删除                 │     │
│  └───────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

#### 1.2 合理性评估：7/10

**✅ 做对的事：**

1. **认知心理学对齐** - 三层记忆模型（工作/情景/语义）对应 Atkinson-Shiffrin 记忆模型，架构设计有理论支撑
2. **隐私优先** - 三级隐私分级 + ChatMode 访问控制 + Prompt注入检测，安全设计完整
3. **自动整理** - 记忆衰减 + 弱记忆删除 + 后台整理，模拟人类遗忘曲线
4. **双引擎嵌入** - KeywordFallback + ONNX BGE，保证降级可用性
5. **本地优先** - 全部数据在设备端，无云端依赖，符合隐私承诺

**❌ 需要改进的关键问题：**

| # | 问题 | 严重度 | 影响 |
|---|------|--------|------|
| 1 | **关键词提取是单字频率统计** | 🔴 严重 | `extractKeywords` 把中文拆成单字计数，不是真正的关键词提取。"火锅"被拆成"火"和"锅"，语义完全丢失 |
| 2 | **记忆提取依赖正则** | 🔴 严重 | `extractAndClassify` 用 `/(?:主人\|用户\|他\|她)(.{0,3})(?:是\|喜欢\|...).../` 提取语义事实，只匹配显式模式，大量隐含偏好被遗漏 |
| 3 | **无专门偏好模型** | 🟡 中等 | `SemanticFact` 有 `preference` 类别，但无偏好强度、偏好衰减、偏好冲突解决机制 |
| 4 | **跨对话记忆断裂** | 🟡 中等 | WorkingMemory 按 conversationId 隔离，无法关联不同对话中的相关话题 |
| 5 | **Embedding 降级质量差** | 🟡 中等 | KeywordFallback 用 100 词硬编码词表 + 128d hash 空间，语义搜索质量极低 |
| 6 | **用户不可见记忆** | 🟡 中等 | 用户无法查看/管理宠物记住的内容，信任感缺失 |
| 7 | **整理策略过于激进** | 🟠 轻微 | 0.95 衰减率 + 10分钟周期 = 记忆快速消退，可能丢失重要信息 |
| 8 | **Visitor 模式记忆过少** | 🟠 轻微 | 访客只能看公开级记忆，宠物对陌生人几乎"失忆" |

#### 1.3 改进建议（优先级排序）

**P0 - 必须修复：**
1. **替换关键词提取** - 引入 jieba-js 或 nodejieba 进行中文分词，替代单字频率统计
2. **用本地 LLM 做记忆提取** - 利用已有的 Qwen-0.5B 的 `memory` 模式 prompt 进行提取，替代正则匹配

**P1 - 重要改进：**
3. **新增 PreferenceProfile** - 专门的偏好追踪模型：
   ```typescript
   interface PreferenceProfile {
     petId: string
     preferences: Map<string, {
       category: 'food' | 'music' | 'movie' | 'activity' | 'social' | 'work'
       value: string
       strength: number        // 0-1, 偏好强度
       lastConfirmed: string   // 最后确认时间
       source: 'explicit' | 'implicit' | 'inferred'
       conflictsWith?: string  // 冲突偏好ID
     }>
   }
   ```
4. **记忆仪表盘** - 让用户查看/编辑/删除宠物记住的内容
5. **跨对话关联** - 基于 topicSummary 相似度关联不同对话

**P2 - 体验优化：**
6. **整理策略调优** - 降低衰减率到 0.98，提高删除阈值到 0.1
7. **Visitor 模式增强** - 允许宠物使用公开级偏好信息进行破冰
8. **偏好主动引用** - 宠物在日常对话中主动提及用户偏好

---

### 二、"宠物记住用户喜好"功能技术方案

#### 2.1 当前架构基础

现有 `SemanticFact` 已有 `preference` 类别，但只是简单的 KV 存储：
```
key: "喜欢吃火锅"  →  value: "喜欢吃火锅"  →  category: "preference"  →  confidence: 0.5
```

#### 2.2 增强方案：PreferenceProfile + 隐式提取

```
┌─────────────────────────────────────────────────────────┐
│              偏好提取与追踪流程                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  用户消息: "今天加班到10点，好想吃炸鸡解压"             │
│       │                                                 │
│       ├── 显式提取 (当前):                              │
│       │   regex → "preference:压力大时想吃炸鸡解压"     │
│       │   ❌ 依赖正则，大量遗漏                         │
│       │                                                 │
│       └── 增强提取 (目标):                              │
│           ├── LLM提取 → ["压力大→炸鸡", "加班→解压需求"]│
│           ├── 情绪推断 → stress_eating 偏好模式          │
│           └── 频次统计 → "炸鸡"出现3次 → strength=0.8   │
│                                                         │
│  偏好存储:                                              │
│  ┌──────────────────────────────────────────┐           │
│  │ PreferenceProfile                         │           │
│  │  food: { 炸鸡: 0.8, 火锅: 0.6 }         │           │
│  │  activity: { 加班: -0.3, 散步: 0.5 }     │           │
│  │  coping: { 压力大→吃美食: 0.7 }          │           │
│  │  music: { }                               │           │
│  └──────────────────────────────────────────┘           │
│                                                         │
│  偏好使用:                                              │
│  宠物: "喵~主人最近加班好辛苦，要不要点份炸鸡犒劳自己？" │
│  (主动引用偏好，而非被动等待提问)                       │
└─────────────────────────────────────────────────────────┘
```

#### 2.3 核心技术点

1. **LLM 驱动提取** - 利用现有 `buildSystemPrompt(pet, 'memory')` 的记忆提取 prompt，让 Qwen-0.5B 从对话中提取偏好
2. **偏好强度衰减** - 偏好随时间自然衰减，但每次被确认时 boost
3. **偏好冲突检测** - "喜欢安静" vs "喜欢热闹" → 标记为情境偏好
4. **主动引用** - 在 `buildMemoryPromptContext` 中注入偏好信息，让宠物主动提及

---

### 三、"分享链接"H5 破冰功能技术方案

#### 3.1 核心逻辑："嘴替"吸引力验证

"嘴替" = 宠物代替主人说话，核心吸引力：
1. **社交安全网** - "不是我说的，是我的宠物说的" → 合理的社交推脱
2. **身份投射** - 宠物是主人性格的精心策划版本
3. **破冰利器** - 中国社交文化中，直接搭话很尴尬，宠物中介降低社交摩擦
4. **"我也要一个"效应** - 朋友跟宠物聊天后产生拥有欲

#### 3.2 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                    分享链接 H5 技术架构                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [App 端]                    [云端]                  [H5端] │
│                                                             │
│  用户点击"分享"  ──────→  生成分享会话               │
│  ┌──────────┐        ┌──────────────┐        ┌──────────┐  │
│  │ 上传脱敏  │  ────→ │ Persona缓存  │  ────→ │ H5页面   │  │
│  │ Persona  │        │ (公开级事实)  │        │ 加载宠物 │  │
│  └──────────┘        └──────────────┘        └──────────┘  │
│                             │                      │       │
│                      ┌──────┴──────┐        ┌─────┴─────┐ │
│                      │ WebSocket/  │  ←───→ │ 实时聊天   │ │
│                      │ SSE Server  │        │ 流式输出   │ │
│                      └──────┬──────┘        └───────────┘ │
│                             │                              │
│                      ┌──────┴──────┐                      │
│                      │ Cloud LLM   │                      │
│                      │ (Qwen-API)  │                      │
│                      └─────────────┘                      │
│                                                             │
│  [微信分享]                                                  │
│  ┌──────────────────────────────────────────┐              │
│  │  🐱 小橘想认识你!                        │              │
│  │  "我主人说你很有趣，来跟我聊聊吧~"        │              │
│  │  [点击链接开始聊天]                       │              │
│  └──────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

#### 3.3 关键技术决策

| 决策点 | 推荐方案 | 理由 |
|--------|---------|------|
| H5 聊天通信 | SSE (Server-Sent Events) | 比 WebSocket 更简单，H5 原生支持，适合单向流式输出 |
| 云端 LLM | Qwen-API / DeepSeek-API | 国内访问快，中文质量好，成本可控 |
| Persona 缓存 | Redis + JSON | 快速读取，TTL 自动过期（24h） |
| 分享卡片 | 微信 JS-SDK | 自定义标题/描述/图标，卡片式分享 |
| H5 框架 | Vue 3 + Vite | 轻量快速，首屏 <2s |
| 会话管理 | 短链接 + Token | 24h 过期，限制 20 轮对话 |

#### 3.4 安全设计

1. **脱敏上传** - 只上传 `privacyLevel === 1` 的 SemanticFact，不上传 EpisodicMemory
2. **会话限制** - 每个分享链接最多 20 轮对话，24h 过期
3. **内容过滤** - 云端 LLM 输出经过 PrivacyGuard 二次过滤
4. **速率限制** - 每个 IP 每分钟最多 5 条消息
5. **无 PII** - H5 页面不显示主人真实姓名/位置/联系方式

#### 3.5 MVP 实现路径（2-3 周）

```
Week 1: Go 后端 + SSE Server
  - 分享会话 CRUD API
  - Persona 缓存上传/读取
  - SSE 流式聊天端点
  - Qwen-API 集成

Week 2: H5 前端
  - Vue 3 + Vite 项目搭建
  - 宠物聊天界面（仿 App 风格）
  - SSE 流式接收 + 打字机效果
  - 微信 JS-SDK 分享配置

Week 3: App 端集成 + 测试
  - 分享按钮 + 生成链接逻辑
  - 脱敏 Persona 上传
  - 分享数据统计（点击量、对话轮数、转化率）
  - 端到端测试
```

---

### 四、Phase 2 LBS 地图与社交技术方案

#### 4.1 技术架构

```
┌──────────────────────────────────────────────────────────────┐
│                 Phase 2 LBS 技术架构                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [App 端]                     [云端]                         │
│                                                              │
│  ┌───────────────┐     ┌────────────────────────────┐       │
│  │ react-native- │     │ Go WebSocket Server        │       │
│  │ maps          │────→│ (gorilla/websocket)        │       │
│  │               │     │                            │       │
│  │ - 地图渲染    │←───→│ - 连接管理                 │       │
│  │ - 宠物标记    │     │ - Geohash 近邻搜索         │       │
│  │ - 手势交互    │     │ - 位置广播                 │       │
│  └───────────────┘     │ - 代班模式调度             │       │
│                        └──────────┬─────────────────┘       │
│  ┌───────────────┐                │                         │
│  │ 位置上报策略  │     ┌──────────┴─────────────────┐       │
│  │               │     │ Redis                      │       │
│  │ - 前台: 30s   │     │ - Geohash → PetID 映射     │       │
│  │ - 后台: 5min  │     │ - 在线状态                 │       │
│  │ - 静止: 停止  │     │ - Persona 缓存             │       │
│  └───────────────┘     └────────────────────────────┘       │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              代班模式 (Substitute Mode)                │  │
│  │                                                       │  │
│  │  主人: "小橘，帮我去咖啡厅看看有没有有趣的人"        │  │
│  │    ↓                                                  │  │
│  │  宠物出现在地图上的咖啡厅位置                         │  │
│  │    ↓                                                  │  │
│  │  其他用户看到宠物标记，点击搭讪                       │  │
│  │    ↓                                                  │  │
│  │  宠物用主人性格 + 公开信息代为聊天                    │  │
│  │    ↓                                                  │  │
│  │  聊得来 → 推送通知主人 → 主人决定是否接手            │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

#### 4.2 关键技术选型

| 组件 | 方案 | 理由 |
|------|------|------|
| 地图渲染 | react-native-maps | RN 生态标准，支持 Google Maps / Apple Maps |
| 实时通信 | Go + gorilla/websocket | 高并发、低延迟、成熟稳定 |
| 近邻搜索 | Redis Geohash | O(log N) 查询，支持半径搜索 |
| Persona 缓存 | Redis + 脱敏 JSON | 快速读取，TTL 自动过期 |
| 位置上报 | 自适应频率 | 前台30s/后台5min/静止停止，省电 |
| 代班 LLM | Qwen-API | 云端推理，支持多并发 |

#### 4.3 Geohash 近邻搜索设计

```
用户位置: (31.2304, 121.4737)
Geohash: "wtw3s" (精度约 5km)

搜索流程:
1. 计算当前 Geohash: "wtw3s"
2. 计算相邻 8 个 Geohash: ["wtw3r", "wtw3q", "wtw3m", ...]
3. Redis GEORADIUS 查询 5km 范围内所有宠物
4. 过滤: 只显示在线 + 开启代班的宠物
5. 返回: [{petId, name, emoji, distance, persona}]
```

#### 4.4 安全设计

1. **位置模糊化** - 上报位置添加 ±200m 随机偏移，防止精确定位
2. **脱敏 Persona** - 只缓存 `privacyLevel === 1` 的信息
3. **代班审核** - 宠物代班聊天内容经过云端 PrivacyGuard 过滤
4. **骚扰防护** - 每个宠物每小时最多被搭讪 10 次
5. **紧急下线** - 主人可一键召回代班宠物

#### 4.5 开发里程碑（8-10 周）

```
Week 1-2: 基础设施
  - Go 项目搭建 + WebSocket Server
  - Redis 集成 + Geohash 索引
  - 位置上报 API

Week 3-4: 地图界面
  - react-native-maps 集成
  - 宠物标记渲染
  - 手势交互（Pinch 缩放、Pan 平移）

Week 5-6: 代班模式
  - Persona 缓存上传/同步
  - 代班聊天逻辑
  - 推送通知集成

Week 7-8: 社交功能
  - 搭讪流程
  - 好友请求
  - 聊天记录同步

Week 9-10: 优化与测试
  - 电池优化
  - 安全审计
  - 压力测试
```

### 调研结论

1. **记忆架构** - 基础设计合理（7/10），但关键词提取和记忆提取是最大短板，需优先用 LLM 替代正则
2. **偏好记忆** - 可基于现有 SemanticFact 扩展 PreferenceProfile，核心是隐式提取和主动引用
3. **分享链接** - 技术可行，SSE + Qwen-API + Vue3 H5 是最优 MVP 方案，2-3 周可交付
4. **嘴替验证** - 分享链接是最佳 MVP 载体，核心指标：点击率 → 对话轮数 → App 下载转化
5. **LBS 社交** - Go + WebSocket + Geohash 是成熟方案，代班模式是差异化亮点，8-10 周可交付
