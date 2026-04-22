# Anima-RN UI 架构设计文档

## 一、核心设计理念

**"不要让用户觉得他们在用软件，要让他们觉得他们在凝视一个生命。"**

### Living UI 三大原则

1. **不打扰** - 界面不主动抢夺注意力，宠物在后台安静存在
2. **有呼吸** - 所有元素都有微小的生命周期动画
3. **能触摸** - 每个交互都有物理反馈（Haptic + 弹簧动画）

---

## 二、首页三层架构设计

首页采用**"数字灵魂培养皿"**架构：

```
┌─────────────────────────────────────────┐
│  顶层（交互层 - The Glass）              │
│  ├─ CyberGlass 状态卡片                  │
│  ├─ 聊天触发按钮                         │
│  └─ 磨砂玻璃 UI（Glassmorphism）          │
├─────────────────────────────────────────┤
│  中层（生命层 - The Soul）               │
│  ├─ ParticleField 星尘粒子系统           │
│  ├─ BreathingPet 会呼吸的宠物            │
│  ├─ ThinkingFlow 思维流可视化            │
│  └─ MemoryFragment 记忆碎片              │
├─────────────────────────────────────────┤
│  底层（环境层 - The Vibe）               │
│  ├─ FluidBackground 流体背景             │
│  └─ Perlin Noise GPU 着色器              │
└─────────────────────────────────────────┘
```

### 组件清单

| 组件 | 文件 | 功能 | 平台适配 |
|------|------|------|----------|
| **FluidBackground** | `FluidBackground.tsx` | Perlin Noise 流体背景 | 原生端：Skia GPU 着色器 |
| **FluidBackground** | `FluidBackground.web.tsx` | 流体背景降级版 | Web 端：Reanimated 动画 |
| **ParticleField** | `ParticleField.tsx` | 星尘粒子系统 | 原生端：Skia Canvas |
| **ParticleField** | `ParticleField.web.tsx` | 粒子系统降级版 | Web 端：Reanimated 动画 |
| **GestureLayer** | `GestureLayer.tsx` | 手势交互层 | 全平台 |
| **HomeScreen** | `HomeScreen.tsx` | 主屏幕容器 | 全平台 |

---

## 三、核心技术实现

### 3.1 GPU 流体背景（Skia 着色器）

使用 Perlin Noise 算法实现流体效果：

```glsl
uniform float2 resolution;
uniform float time;
uniform float3 colorPrimary;
uniform float3 colorSecondary;
uniform float3 colorAmbient;
uniform float intensity;

float snoise(vec2 v) {
  // 梯度噪声算法
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  // ... 完整实现见 FluidBackground.tsx
}

vec4 main(vec2 pos) {
  // 三层噪声叠加
  float noise1 = snoise(uv * 2.0 + vec2(t * 0.3, t * 0.2));
  float noise2 = snoise(uv * 4.0 + vec2(-t * 0.2, t * 0.4));
  float noise3 = snoise(uv * 8.0 + vec2(t * 0.5, -t * 0.3));
  
  // 正弦波流动 + 暗角渐变 + 高光发光
  float combinedNoise = noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2;
  
  // 情绪色彩映射
  vec3 finalColor = mix(deepColor, midColor, combinedNoise);
  
  return vec4(finalColor, 1.0);
}
```

### 3.2 AI 大脑活跃度可视化

粒子系统映射 Qwen-0.5B 推理状态：

| 状态 | 粒子数量 | 速度倍率 | 视觉效果 |
|------|----------|----------|----------|
| idle (待机) | 24 | 1.0x | 缓慢漂浮 |
| waiting (等待) | 24 | 1.8x | 轻微加速 |
| streaming (推理) | 36 | 2.5x | 快速环绕 |

```tsx
<ParticleField
  brainActivity={activity === 'streaming' ? 2.5 : activity === 'waiting' ? 1.8 : 1.0}
  particleCount={activity === 'streaming' ? 36 : 24}
  color={currentMood === 'love' ? candy.neonPink[400] : candy.violet[400]}
/>
```

### 3.3 弹簧物理手势系统

```tsx
// 四种手势竞争识别
const composedGesture = Gesture.Race(
  tapGesture,      // 单指轻拍 → 爱心气泡
  swipeUpGesture,  // 上滑 → 进入聊天
  pinchGesture,    // 双指缩小 → 地图模式
  dragGesture      // 拖拽 → 弹性跟随
)

// 弹簧物理参数
withSpring(value, {
  damping: 15,    // 阻尼（回弹衰减速度）
  stiffness: 150, // 刚度（弹簧硬度）
  mass: 0.8,      // 质量（惯性大小）
})
```

---

## 四、情绪驱动视觉系统

### 4.1 情绪状态机

```tsx
type PetMood = 
  | 'idle'     // 待机
  | 'happy'    // 开心
  | 'sad'      // 悲伤
  | 'excited'  // 兴奋
  | 'thinking' // 思考
  | 'love'     // 爱心
  | 'sleepy'   // 困倦
  | 'angry'    // 生气
```

### 4.2 情绪色彩映射

```tsx
const MOOD_COLORS: Record<PetMood, ColorSet> = {
  idle:    { primary: [15, 23, 42],   secondary: [30, 41, 59],   ambient: [51, 65, 105] },
  happy:   { primary: [45, 20, 60],   secondary: [80, 30, 90],   ambient: [120, 50, 140] },
  sad:     { primary: [10, 25, 45],   secondary: [18, 35, 60],   ambient: [30, 50, 80] },
  excited: { primary: [60, 15, 50],   secondary: [100, 30, 80],  ambient: [150, 50, 120] },
  thinking:{ primary: [20, 30, 50],   secondary: [35, 50, 75],   ambient: [55, 75, 110] },
  love:    { primary: [70, 20, 40],   secondary: [120, 35, 60],  ambient: [160, 55, 90] },
  sleepy:  { primary: [12, 15, 30],   secondary: [22, 28, 48],   ambient: [38, 45, 70] },
  angry:   { primary: [50, 15, 15],   secondary: [80, 25, 25],   ambient: [110, 38, 38] },
}
```

---

## 五、平台适配策略

### 5.1 文件后缀约定

React Native 通过文件后缀自动选择平台实现：

```
Component.tsx        # 默认实现（全平台）
Component.native.tsx # 原生端专用
Component.web.tsx    # Web 端专用
```

### 5.2 Skia 初始化时序

**问题**：`Skia.RuntimeEffect.Make()` 在模块顶层调用时，Skia JSI 引擎还未初始化。

**解决方案**：

```tsx
// ❌ 错误：模块顶层执行
const shader = Skia.RuntimeEffect.Make(`...`)!

// ✅ 正确：组件内懒初始化
const SHADER_SKSL = `uniform float2 resolution; ...`

function Component() {
  const shader = useMemo(() => Skia.RuntimeEffect.Make(SHADER_SKSL), [])
  if (!shader) return null
  // ...
}
```

### 5.3 Web 降级策略

| 原生端技术 | Web 降级方案 | 性能影响 |
|------------|--------------|----------|
| Skia GPU 着色器 | Reanimated 透明度动画 | 轻微，但流畅 |
| Skia Canvas 粒子 | Reanimated 缩放/位移 | 可接受 |
| expo-haptics | 无（静默降级） | 无触觉反馈 |

**为什么不用 Skia Web (CanvasKit)？**
- CanvasKit 体积 ~3MB，影响首屏加载
- JSI 绑定复杂，初始化时机难以控制
- Reanimated 降级方案足够流畅

---

## 六、性能优化清单

- [x] **GPU 加速**：流体背景使用 Skia 着色器，CPU 占用 ≈ 0
- [x] **局部渲染**：流式聊天通过 EventEmitter 只更新当前气泡
- [x] **布局动画**：`Layout.springify()` 让气泡高度变化带有弹性
- [x] **原生驱动**：所有动画 `useNativeDriver: true`
- [x] **粒子降级**：低端设备减少粒子数量（12 个而非 24 个）
- [x] **平台适配**：Web 端使用轻量级 Reanimated 动画
- [x] **懒初始化**：Skia 着色器在组件挂载后编译

---

## 七、组件目录结构

```
src/components/
├── FluidChat/           # 流式聊天组件
│   ├── StreamEventBus.ts
│   ├── StreamingBubble.tsx
│   ├── StaticBubble.tsx
│   └── PetFluidChat.tsx
├── LivingUI/            # 生命感 UI 组件
│   ├── RivePetAvatar.tsx
│   ├── BreathingPet.tsx
│   ├── ThinkingFlow.tsx
│   ├── MemoryFragment.tsx
│   ├── CyberGlass.tsx
│   ├── GlassCard.tsx
│   ├── HapticEngine.ts
│   ├── LivingUIContext.tsx
│   └── PetHabitat.tsx
└── HomeScreen/          # 首页三层架构
    ├── FluidBackground.tsx      # 原生端
    ├── FluidBackground.web.tsx  # Web 端
    ├── ParticleField.tsx        # 原生端
    ├── ParticleField.web.tsx    # Web 端
    ├── GestureLayer.tsx
    ├── HomeScreen.tsx
    └── index.ts
```

---

## 八、设计经验总结

### 8.1 架构对比

**传统 App 架构**：
```
┌─────────────────┐
│ Header (标题栏)  │ ← 砸碎
├─────────────────┤
│ Tab Bar          │ ← 砸碎
├─────┬─────┬─────┤
│ 卡片 │ 卡片 │ 卡片│ ← 研磨成玻璃
└─────┴─────┴─────┘
```

**Anima-Rn HomeScreen 架构**：
```
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

### 8.2 核心突破

1. **概念创新**：从"工具面板"到"全息观测舱"
2. **技术突破**：Skia GLSL 着色器实现真正的流体背景（非视频/CSS hack）
3. **交互革命**：弹簧物理手势替代死板动画定时器
4. **性能极致**：GPU 渲染流体 + 粒子，CPU 近乎空闲给大模型推理
5. **心理暗示**：星尘速度让用户感知 AI 在"思考"

---

## 九、安全审计

- ✅ 所有手势回调使用 `runOnJS` 包装，避免线程问题
- ✅ 粒子系统 `pointerEvents="none"`，不拦截触摸事件
- ✅ 触觉反馈不泄露任何隐私数据
- ✅ 动画全部 `useNativeDriver: true`（GPU 加速）
- ✅ useMemo 依赖数组为空，shader 只编译一次
- ✅ null 检查防止 shader 编译失败导致崩溃
- ✅ Web 组件无原生依赖，不会泄露隐私数据
