# Anima RN 高效开发指南

## 日常开发流程

### 1. UI/逻辑开发 (90% 时间)
```bash
npx expo start --web
```
- 浏览器打开 http://localhost:8081
- 修改代码 → 自动刷新
- 使用 React DevTools 调试

### 2. 原生功能测试 (10% 时间)
```bash
# 使用优化后的 EAS Build (~2-3分钟)
eas build --profile development --platform android
```
- 手机扫码安装
- 测试 llama.rn、文件系统等原生功能

### 3. 发布前验证
```bash
eas build --profile preview --platform android
```

## 文件说明

- `.easignore` - EAS 构建排除规则（已优化）
- `install-android-sdk.sh` - Android SDK 安装脚本
- `fs-utils.ts` - 原生文件系统工具（绕过 expo-file-system）

## 环境变量 (本地构建时需要)

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools
```

---

## UI 架构设计指南

### 核心设计理念

**"不要让用户觉得他们在用软件，要让他们觉得他们在凝视一个生命。"**

#### Living UI 三大原则

1. **不打扰** - 界面不主动抢夺注意力，宠物在后台安静存在
2. **有呼吸** - 所有元素都有微小的生命周期动画
3. **能触摸** - 每个交互都有物理反馈（Haptic + 弹簧动画）

### 三层架构设计

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

### 平台适配策略

React Native 通过文件后缀自动选择平台实现：

```
src/components/HomeScreen/
├── FluidBackground.tsx        # 原生端：Skia GPU 着色器
├── FluidBackground.web.tsx    # Web 端：Reanimated 动画
├── ParticleField.tsx          # 原生端：Skia Canvas 粒子
└── ParticleField.web.tsx      # Web 端：Reanimated 动画
```

**为什么不用 Skia Web？**
- CanvasKit 体积 ~3MB，影响首屏加载
- JSI 绑定复杂，初始化时机难以控制
- Reanimated 降级方案足够流畅

### 动画系统设计

#### 弹簧物理参数

```tsx
// ❌ 死板的定时器动画
Animated.timing(value, { duration: 300 })

// ✅ 有生命的弹簧动画
withSpring(value, {
  damping: 15,    // 阻尼（回弹衰减速度）
  stiffness: 150, // 刚度（弹簧硬度）
  mass: 0.8,      // 质量（惯性大小）
})
```

#### 手势交互设计

| 手势 | 触发条件 | 反馈效果 |
|------|----------|----------|
| 单指轻拍 | `Tap` | Haptic 震动 + 爱心气泡 💕✨💖 |
| 上滑 | `translationY < -80` | 弹簧物理拉开水幕，进入聊天 |
| 双指缩小 | `scale < 0.7` | 视角拉高，过渡到 LBS 地图 |
| 拖拽 | `Pan` | 宠物弹性跟随，松手果冻回弹 |

### Skia 着色器最佳实践

#### 初始化时序问题

```tsx
// ❌ 模块顶层执行（Skia 还未初始化）
const shader = Skia.RuntimeEffect.Make(`...`)!

// ✅ 组件内懒初始化
const FLUID_SHADER_SKSL = `uniform float2 resolution; ...`

function Component() {
  const shader = useMemo(() => Skia.RuntimeEffect.Make(FLUID_SHADER_SKSL), [])
  if (!shader) return null
}
```

#### Perlin Noise 着色器

用于流体背景的核心算法：

```glsl
float snoise(vec2 v) {
  // 梯度噪声算法
  // 三层噪声叠加：noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2
  // 正弦波流动效果
  // 暗角渐变（Vignette）
  // 高光发光效果
}
```

### AI 大脑活跃度可视化

粒子系统映射 Qwen-0.5B 推理状态：

| 状态 | 粒子数量 | 速度倍率 | 视觉效果 |
|------|----------|----------|----------|
| idle (待机) | 24 | 1.0x | 缓慢漂浮 |
| waiting (等待) | 24 | 1.8x | 轻微加速 |
| streaming (推理) | 36 | 2.5x | 快速环绕 |

### 情绪驱动视觉系统

14 种情绪映射到 8 种背景色调：

```tsx
const MOOD_COLORS = {
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

### 组件目录结构

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

### 性能优化要点

1. **GPU 加速**：流体背景使用 Skia 着色器，CPU 占用 ≈ 0
2. **局部渲染**：流式聊天通过 EventEmitter 只更新当前气泡
3. **布局动画**：`Layout.springify()` 让气泡高度变化带有弹性
4. **原生驱动**：所有动画 `useNativeDriver: true`
5. **粒子降级**：低端设备减少粒子数量（12 个而非 24 个）
