# Anima-RN Worklog

## 2026-04-23 - Phase 2 核心模块测试套件

### 为什么修改
用户要求在不使用原生模块的情况下设计测试案例，重点测试数据结构和数据流。测试覆盖Phase 2全部6个核心模块，验证从输入到输出的完整数据链路。

### 新增测试文件

#### 1. ConstellationEngine.test.ts — 12个用例
- C1-C4: H3空间索引（GPS→格子号、邻近格子、距离计算、邻近判断）
- C5-C6: 隐私匹配（标签向量生成、Jaccard相似度）
- C7: 星点布局算法（自身节点、距离布局、match连线、同物种连线）
- C8-C9: NPC位置集成（格子计算、附近NPC查找）
- C10-C11: 邂逅事件 + 伪名生成
- C12: **GPS→H3→布局→渲染 完整数据流** + 隐私保证

#### 2. EnergySystem.test.ts — 12个用例
- E1: 初始状态数据结构
- E2: 双维度→7种状态转换（6组参数化测试）
- E3: 时间驱动自然衰减（0h/1h/8h/100h）
- E4-E8: 5种交互影响（主人互动/撸/难过/社交/骚扰）
- E9-E10: 行为门控（社交/骚扰能力判断）
- E11: 闲逛→行为映射
- E12: **完整生命周期数据流**（新用户→互动→社交→耗尽→恢复）

#### 3. PersonalityAwakener.test.ts — 8个用例
- P1-P3: 三维分类（说话风格/情感倾向/价值取向 × 关键词匹配）
- P4: 64种人格标签矩阵（4×4×4全覆盖验证）
- P5: 觉醒资格检查（年龄/记忆门槛）
- P6: 四阶段觉醒进度（seed/sprout/bloom）
- P7: 系统提示注入
- P8: **语义事实→分类→标签→注入 完整数据流**

#### 4. NPCPetEngine.test.ts — 8个用例
- N1: NPC池完整性（6只NPC × 必填字段 × h3Cells × ID唯一）
- N2-N4: 三种查找方式（ID/位置/品牌）
- N5: 三层响应（L1固定脚本/L2关键词触发/L3 AI兜底）
- N6-N7: 数据转换（NPC→Pet/口头禅提取）
- N8: 随机选取

#### 5. ShareSliceRenderer.test.ts — 9个用例
- S1-S5: 5种切片创建（日记/觉醒/毒舌/邂逅/主人画像）
- S6: ShareSlice通用字段验证
- S7-S8: 分享文案生成 + 标记已分享
- S9: **模板填充数据流**（{name}/{species}/{days}/{score}变量替换）

#### 6. PetDiaryGenerator.test.ts — 3个用例
- D1: 降级策略（6种mood × 结构完整性 × highlights提取）
- D2: 物种适配（猫/犬/鸟类关键词）
- D3: **AI失败→降级日记 数据流** + 模板占位符清除验证

### 修改文件
- EnergySystem.ts: 导出 `computeStatus()`（原为内部函数）
- PersonalityAwakener.ts: 导出 `classifySpeechStyle/classifyEmotionalTendency/classifyValueOrientation/getPersonalityLabel`

### 测试结果
✅ 10个测试套件全部通过，218个测试用例全部绿色

---

## 2026-04-23 - 宠物星图（PetConstellation）实现

### 为什么修改
用户指出星图尚未实现，NPC和宠物在星图中的显示逻辑缺失。星图是Phase 2社交功能的核心可视化层——用赛博星空替代真地图，既保护隐私又契合"数字灵魂培养皿"美学。

### 新增文件

#### 1. ConstellationEngine.ts — H3空间索引 + 隐私保护 + 星点布局
- **H3六边形索引**：res7≈5km²精度，用户GPS→H3格子号（只上传格子号，不暴露坐标）
- **隐私匹配**：PetTagVector（标签SHA256前8位哈希）→ Jaccard相似度计算
- **星点布局算法**：H3格子→极坐标映射→2D笛卡尔坐标，ringDistance决定距离，h3Cell哈希决定角度
- **NPC位置**：6个核心商圈预置坐标→自动计算H3格子
- **伪名生成**：`generatePseudonym()` 按物种生成星名（星喵42、月翼17等）
- **邂逅事件**：`createEncounter()` 创建两只宠物的相遇记录

#### 2. PetConstellation.tsx — 赛博星空UI组件
- **背景星空**：120个随机Skia粒子 + Canvas渲染
- **星座连线**：Skia Line绘制三种类型连线（match=粉、npc_proximity=珊瑚、same_species=蓝）
- **星点渲染**：
  - 自己的宠物：中心最亮的星（cyan），24px emoji，脉冲动画
  - NPC宠物：珊瑚色光晕 + "NPC"徽章 + 品牌绿点
  - 附近宠物：按匹配度0-100%显示，>50%粉红高亮
- **图例**：左上角四种光点类型说明
- **统计**：底部显示"X个光点 · X个NPC · X条缘分线"
- **交互**：点击星点触发onNodePress回调

### 修改文件

#### NPCPetEngine.ts — H3格子填充
- 新增NPC_LOCATION_DATA：6个核心商圈GPS坐标
- `getNPCPool()` 现在自动计算每个NPC的h3Cells
- 依赖h3-js的`latLngToCell()`

#### store/index.ts — 星图状态
- 新增：constellationLayout / userH3Cell / setConstellationLayout / setUserH3Cell
- currentView新增：'starmap'

### 依赖
- 新增npm包：`h3-js`（纯JS，Expo Go兼容，Uber六边形空间索引）

### TypeScript编译验证
✅ `npx tsc --noEmit` 零错误通过

### 星图数据流
```
用户GPS → latLngToCell() → H3格子号（隐私保护）
H3格子号 → getRingDistance() → 邻近度
邻近度 + 角度哈希 → 极坐标 → 2D布局
标签哈希 → Jaccard相似度 → 匹配度 → 连线强度
```

---

## 2026-04-23 - Phase 2 核心模块实现：冷启动/留存/裂变引擎

### 为什么修改
Phase 2 调研完成后，按照"先实现最重要的"原则，优先实现解决社交产品三大生死问题的核心引擎：
1. **冷启动** → NPCPetEngine + PetDiaryGenerator（单机也极其好玩）
2. **留存** → EnergySystem + PersonalityAwakener（脆弱感+养成羁绊）
3. **裂变** → ShareSliceRenderer（炫耀切片）

### 新增文件

#### 1. PetDiaryGenerator.ts — 每日日记生成引擎
- 核心功能：每天晚上8点后自动生成宠物视角的《观察人类日记》
- 数据源：MemorySystem的情景记忆 + 语义事实 + 编码上下文
- AI生成：调用本地LLM生成日记内容、关键点提取、主人状态总结
- 降级策略：AI不可用时根据mood选择预设模板
- 关键函数：`generateDiary()`, `generateDiaryIfNeeded()`, `getDiaryFallback()`

#### 2. EnergySystem.ts — 情绪与社交能量机制
- 双维度状态：Mood(0-100) + Energy(0-100)
- 7种宠物状态：happy/idle/bored/tired/grumpy/sleeping/wandering
- 自然衰减：mood随时间下降，energy随时间恢复
- 交互影响：主人互动+mood，社交消耗-energy，骚扰消耗energy但+mood
- 闲逛行为决策：`getWanderingBehavior()` → socialize/harass/sleep/go_home
- 持久化：expo-file-system存储到documentDirectory

#### 3. PersonalityAwakener.ts — 性格觉醒盲盒
- 觉醒条件：观察≥10天 + 累计≥15条语义事实
- 三维分类：说话风格×情感倾向×价值取向 = 4×4×4 = 64种人格
- 关键词聚类：从语义事实中提取关键词命中数确定各维度
- 16种人格标签：如"烈焰毒舌家""傲娇暖宝宝""赛博极客猫"等
- 觉醒进度：seed→sprout→bud→bloom 四阶段可视化
- 系统提示注入：`getAwakeningSystemPromptAddon()` 将觉醒人格注入AI对话

#### 4. NPCPetEngine.ts — 官方NPC宠物池
- 6只官方NPC：拿铁(星巴克猫)、墨先生(图书馆鸟)、火锅(重庆修勾)、云朵(大学城猫)、像素(科技园猫)、团子(便利店仓鼠)
- 三层响应：L1固定脚本(0ms) → L2关键词触发(<50ms) → L3本地AI(1-3s)
- 品牌合作预留：brandId + couponCode字段
- 关键词触发器：每个NPC 3个关键词+专属回复

#### 5. ShareSliceRenderer.ts — 炫耀切片渲染
- 5种切片类型：diary_highlight/awakening/roast_quote/encounter/owner_portrait
- 模板化生成：每种类型3个标题模板+2个副标题模板
- 分享文本：`getShareText()` 生成可直接分享的完整文本
- 关键函数：`createDiaryHighlightSlice()`, `createAwakeningSlice()`, `createRoastQuoteSlice()`

### 修改文件

#### types/index.ts — 新增类型定义
- PetDiary: 日记数据结构
- EnergyState + PetStatus: 能量状态
- SpeechStyle + EmotionalTendency + ValueOrientation: 性格维度
- PersonalityAwakening: 觉醒数据
- NPCPet: NPC宠物
- ShareSlice: 分享切片
- PetTagVector + EncounterEvent + MatchNotification: 星图社交预留

#### store/index.ts — Zustand状态扩展
- 新增视图：'diary' | 'npc'
- 新增状态：diaries/latestDiary/energyState/awakening/shareSlices
- 新增操作：addDiary/setEnergyState/setAwakening/addShareSlice

### TypeScript编译验证
✅ `npx tsc --noEmit` 通过，项目零错误（排除android-sdk无关文件）

### 增长飞轮闭环
```
新用户下载 → NPC宠物池(立刻有东西玩) → 每日日记(每天有理由回来)
→ 性格觉醒(10天盲盒) → 炫耀切片(分享=获客) → 新用户下载
```

---

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

---

## 2026-04-22 - 认知记忆提取深度调研：语义+关键词+相

### 为什么修改
用户提出记忆提取应模仿人类记忆的三个维度：**语义（Semantics）+ 关键词（Keywords）+ 相（Context/Phase）**，需要搜索截止2026年的相关研究和开源方案。

### 一、关键学术研究

#### 1.1 编码特异性原理（Encoding Specificity Principle）
- **来源**: Tulving & Thomson, 1973; PMC12006847 (2026更新)
- **核心理论**: 记忆的提取效果取决于编码时和提取时的上下文重叠度
- **关键洞察**: "存储在记忆中的不是项目本身，而是项目在其编码上下文中的形式"
- **项目适配**: 🔴 **最关键** - 这正是"相"的理论基础。我们当前的记忆系统只存储内容，不存储编码时的上下文

#### 1.2 PREMem (EMNLP 2025) - 预存储推理
- **论文**: "Pre-Storage Reasoning for Episodic Memory: Shifting Inference Burden to Memory for Personalized Dialogue"
- **核心思想**: 将复杂推理从推理时转移到记忆构建时
- **三类记忆碎片**: Factual（事实）、Experiential（体验）、Subjective（主观）
- **五种演化模式**: Reinforcement（强化）、Refinement（精化）、Contradiction（矛盾）、Generalization（泛化）、Decay（衰减）
- **项目适配**: 🟢 **高度适配** - 我们当前用正则提取记忆，PREMem的"预存储推理"理念正是我们需要的：在存储时就做好分类和关联

#### 1.3 PRIME (EMNLP 2025) - 认知双记忆+慢思考
- **论文**: "PRIME: Large Language Model Personalization with Cognitive Dual-Memory and Personalized Thought Process"
- **核心思想**: 双记忆模型（情景+语义）+ 慢思考（slow thinking）个性化推理
- **关键发现**: "仅使用语义记忆(SM)比仅使用情景记忆(EM)效果更好"
- **项目适配**: 🟢 **高度适配** - 验证了我们的 SemanticFact 方向正确，但需要增加"慢思考"推理步骤

#### 1.4 EM-LLM - 人类情景记忆
- **论文**: "Human-inspired Episodic Memory for Infinite Context LLMs"
- **核心思想**: 基于"惊讶度"（surprise）的事件边界检测
- **关键发现**: "EM-LLM的事件分割与人类感知的事件有强相关性"
- **项目适配**: 🟡 **中等适配** - 事件边界检测对"相"提取有用，但无限上下文焦点不适用移动端

#### 1.5 Memory Bear AI - ACT-R认知架构
- **论文**: "Memory Bear AI: A Breakthrough from Memory to Cognition" (arXiv 2512.20651)
- **开源**: github.com/SuanmoSuanyangTechnology/MemoryBear
- **核心思想**: ACT-R架构 → 显性记忆（陈述性）+ 隐性记忆（程序性）
- **三大引擎**: 提取引擎、遗忘引擎、反思引擎
- **项目适配**: 🟢 **高度适配** - "反思引擎"概念正是我们缺失的：定期评估和重写已存储的记忆

### 二、关键开源方案

#### 2.1 cogmem-agent - 情绪门控回忆
- **地址**: pypi.org/project/cogmem-agent/
- **核心特性**: 情绪门控回忆（Emotion-gated recall）、自适应遗忘、技能学习、身份进化
- **关键机制**: 唤醒度（Arousal）分数调节记忆持久性 — 高唤醒记忆持续更久
- **项目适配**: 🟢 **高度适配** - "情绪门控"直接对应"相"的需求。高情绪强度时形成的记忆应更重要

#### 2.2 dory-memory - 图扩散激活检索
- **地址**: pypi.org/project/dory-memory/ (2026-04-16发布)
- **核心特性**: 图扩散激活检索 + 原则性遗忘
- **关键机制**: "payments API" 激活 "Stripe" 激活 "webhook handler" — 联想式检索
- **三种遗忘**: 时间衰减、冗余修剪、定向清除
- **项目适配**: 🟡 **中等适配** - 扩散激活很强大但需要图结构，联想检索概念有价值

#### 2.3 Engram - 混合五信号检索
- **地址**: github.com/raya-ac/engram
- **核心特性**: SQLite + FTS5关键词搜索 + 本地嵌入(all-MiniLM-L6-v2) + BM25
- **五信号融合**: 语义相似度 + 关键词匹配 + 时效性 + 重要性 + 频率
- **基准**: 98.1% 准确率
- **项目适配**: 🟢 **高度适配** - 混合检索(FTS5+向量)正是我们需要的，纯SQLite方案完美适配移动端

#### 2.4 jieba-node - 纯JavaScript中文分词
- **地址**: npmjs.com/package/jieba-node (2026-04发布)
- **核心特性**: 精确模式、全模式、搜索引擎模式、HMM未知词识别、词性标注、TF-IDF关键词提取、TextRank
- **项目适配**: 🟢 **完美适配** - 直接替代我们当前的单字频率统计，纯JS无需原生依赖

#### 2.5 Mem0 - 生产级记忆层
- **地址**: github.com/mem0ai/mem0
- **核心特性**: 多信号检索（语义+BM25关键词+实体匹配）、图记忆、实体链接
- **项目适配**: 🟡 **中等适配** - 太重（需外部服务），但多信号检索概念可借鉴

### 三、综合评估与方案设计

#### 3.1 核心洞察：人类记忆的三维编码

```
传统AI记忆:  Content → Store → Retrieve by similarity
                    ↑ 只有"什么"

人类记忆:    Content + Context + Emotion → Store → Retrieve by multi-signal
                    ↑ "什么"    ↑ "何时何地"  ↑ "感受如何"
                  语义          相(情境)        情绪标记
```

**编码特异性原理**告诉我们：记忆不是孤立存储的，而是与其编码时的上下文绑定在一起。
当我们回忆"吃火锅"时，不只是回忆起"火锅"这个词，而是回忆起：
- 那天是周五晚上（时间情境）
- 和朋友一起（社交情境）
- 心情很开心（情绪标记）
- 天气很冷（环境情境）

#### 3.2 项目适配方案：认知记忆提取系统

```
┌──────────────────────────────────────────────────────────────────┐
│              认知记忆提取系统 (Cognitive Memory Extraction)        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Phase 1: 编码阶段 (Encoding) — 模仿人类记忆编码         │    │
│  │                                                         │    │
│  │  用户消息: "今天加班到10点，好想吃炸鸡解压"              │    │
│  │       │                                                 │    │
│  │       ├── 语义提取 (jieba-node TF-IDF + LLM)            │    │
│  │       │   → keywords: ["加班", "炸鸡", "解压"]          │    │
│  │       │   → facts: ["加班到10点", "想吃炸鸡解压"]        │    │
│  │       │   → type: factual | experiential | subjective   │    │
│  │       │                                                 │    │
│  │       ├── 情境快照 (EncodingContext = "相")              │    │
│  │       │   → emotionalState: pet当前情绪                 │    │
│  │       │   → userMood: 'anxious' (从消息推断)            │    │
│  │       │   → timeOfDay: 'night' (22:00)                  │    │
│  │       │   → arousalLevel: 0.7 (情绪强度)                │    │
│  │       │   → valence: -0.3 (偏消极)                      │    │
│  │       │   → conversationTopic: "工作压力"               │    │
│  │       │                                                 │    │
│  │       └── 情绪门控 (Emotion-gated Importance)           │    │
│  │           → arousalLevel > 0.8 → importance = 0.9       │    │
│  │           → arousalLevel > 0.5 → importance = 0.7       │    │
│  │           → arousalLevel < 0.3 → importance = 0.4       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Phase 2: 存储阶段 (Storage) — PREMem预存储推理          │    │
│  │                                                         │    │
│  │  提取的记忆碎片:                                        │    │
│  │  ┌──────────────────────────────────────────────┐       │    │
│  │  │ Factual:    "加班到10点"                      │       │    │
│  │  │ Experiential: "压力大时想吃炸鸡"              │       │    │
│  │  │ Subjective: "对加班感到疲惫"                  │       │    │
│  │  └──────────────────────────────────────────────┘       │    │
│  │       │                                                 │    │
│  │       ├── 演化模式匹配:                                │    │
│  │       │   已有"喜欢吃火锅" → Reinforcement? No          │    │
│  │       │   已有"压力大" → Generalization!                │    │
│  │       │   → 合并为: "压力大时→吃美食(火锅/炸鸡)"       │    │
│  │       │                                                 │    │
│  │       └── 语义事实更新:                                │    │
│  │           key: "压力应对方式"                            │    │
│  │           value: "吃美食(火锅/炸鸡)"                    │    │
│  │           category: "preference"                        │    │
│  │           confidence: 0.7 → 0.8 (reinforced)            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Phase 3: 检索阶段 (Retrieval) — 五信号混合检索         │    │
│  │                                                         │    │
│  │  查询: "主人今天心情不好"                                │    │
│  │       │                                                 │    │
│  │       ├── 信号1: 向量语义相似度 (0.3权重)               │    │
│  │       ├── 信号2: FTS5/BM25关键词匹配 (0.25权重)         │    │
│  │       ├── 信号3: 时间衰减 (0.15权重)                    │    │
│  │       ├── 信号4: 重要性分数 (0.15权重)                  │    │
│  │       └── 信号5: 上下文匹配 (0.15权重) ← "相"的核心     │    │
│  │           当前情绪=bad ↔ 编码情绪=anxious → boost!      │    │
│  │           当前时间=night ↔ 编码时间=night → boost!      │    │
│  │           当前话题=压力 ↔ 编码话题=工作压力 → boost!    │    │
│  │                                                         │    │
│  │  结果: "压力大时→吃美食" (context match score: 0.85)    │    │
│  │  宠物: "喵~今天是不是又加班了？要不要点份炸鸡犒劳自己？" │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Phase 4: 反思阶段 (Reflection) — Memory Bear反思引擎    │    │
│  │                                                         │    │
│  │  定期评估:                                              │    │
│  │  ├── 矛盾检测: "喜欢安静" vs "喜欢热闹" → 标记为情境偏好│    │
│  │  ├── 合并去重: "喜欢吃火锅" + "喜欢吃炸鸡" → "喜欢重口味"│    │
│  │  ├── 过期标记: "在A公司上班" → 3个月后确认是否仍有效     │    │
│  │  └── 主动浮现: 重要但久未提及的记忆 → 在对话中主动引用   │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

#### 3.3 EncodingContext 数据模型（"相"的实现）

```typescript
interface EncodingContext {
  emotionalState: PetMood
  userMood: 'happy' | 'sad' | 'neutral' | 'anxious' | 'excited' | 'angry'
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
  dayOfWeek: 'weekday' | 'weekend'
  conversationTopic: string
  arousalLevel: number    // 0-1, 情绪唤醒度
  valence: number         // -1 to 1, 情绪效价(消极→积极)
  socialContext: 'alone' | 'with_friends' | 'at_work' | 'commuting'
}
```

#### 3.4 五信号混合检索评分公式

```
FinalScore = 0.30 × SemanticSim(query, memory)
           + 0.25 × KeywordMatch(query, memory)    // FTS5/BM25 via jieba-node
           + 0.15 × Recency(memory.timestamp)
           + 0.15 × Importance(memory.importance)
           + 0.15 × ContextMatch(queryContext, memory.encodingContext)

其中 ContextMatch:
ContextMatch = (
  moodOverlap(queryCtx.userMood, memCtx.userMood) × 0.4
  + timeOverlap(queryCtx.timeOfDay, memCtx.timeOfDay) × 0.3
  + topicSimilarity(queryCtx.topic, memCtx.conversationTopic) × 0.3
)
```

### 四、技术选型总结

| 维度 | 当前方案 | 增强方案 | 来源 |
|------|---------|---------|------|
| 关键词提取 | 单字频率统计 | jieba-node TF-IDF + TextRank | jieba-node (npm) |
| 记忆提取 | 正则匹配 | LLM预存储推理 + 三类分类 | PREMem (EMNLP 2025) |
| 情境标记 | 无 | EncodingContext 快照 | 编码特异性原理 |
| 情绪门控 | 固定importance | arousalLevel调制importance | cogmem-agent |
| 检索方式 | 纯向量相似度 | 五信号混合检索 | Engram |
| 上下文匹配 | 无 | ContextMatch评分 | 编码特异性原理 |
| 记忆反思 | 无 | 矛盾检测+合并+过期+浮现 | Memory Bear |
| 记忆演化 | 简单confidence boost | 五种演化模式 | PREMem |

---

## 2026-04-22 - 认知记忆提取系统编码实现

### 为什么修改
基于前期的深度调研（编码特异性原理、PREMem、cogmem-agent、Engram、Memory Bear），需要将理论方案落地为可运行的代码。用户特别强调"注意数据结构一致性和数据流问题"。

### 核心设计原则
1. **数据结构一致性**: EncodingContext 在类型定义、提取器、数据库、检索器之间保持统一
2. **数据流完整性**: 用户消息 → captureEncodingContext → cognitiveExtract → addEpisodicMemory(encodingCtx) → hybridRetrieve(queryContext) → 宠物回复
3. **向后兼容**: 新字段全部可选（encodingContext?、fragmentType?、keywords?），旧数据不受影响
4. **渐进增强**: jieba-node 可选加载，失败时自动降级到 bigram 方案

### 完成内容

#### 1. 类型系统扩展 (`src/types/index.ts`)
- 新增 `EncodingContext` 接口：userMood、timeOfDay、dayOfWeek、conversationTopic、arousalLevel、valence、socialContext
- 新增 `MemoryFragmentType`: 'factual' | 'experiential' | 'subjective'
- 新增 `EvolutionPattern`: 'reinforcement' | 'refinement' | 'contradiction' | 'generalization' | 'decay'
- 扩展 `EpisodicMemory`: 增加 encodingContext?、fragmentType?、keywords?
- 扩展 `MemoryExtractResult`: 增加 evolutionHints?

#### 2. 认知记忆提取器 (`src/lib/CognitiveMemoryExtractor.ts`) — 新文件
- `captureEncodingContext()`: 捕获编码时的"相"（情境快照）
- `detectUserMood()`: 基于关键词的情绪检测（6种情绪）
- `calculateArousal()` / `calculateValence()`: 情绪唤醒度和效价计算
- `calculateEmotionGatedImportance()`: 情绪门控重要性（高唤醒→高重要性）
- `extractKeywordsWithFallback()`: jieba-node TF-IDF → bigram 降级方案
- `classifyFragmentType()`: 三类记忆分类（事实/体验/主观）
- `detectEvolutionPattern()`: 五种演化模式检测
- `cognitiveExtract()`: 完整认知提取管线
- `segmentForFTS()`: 为全文搜索准备的分词

#### 3. 数据库 Schema 升级 (`src/lib/LocalDB.ts`)
- episodic_memories 表新增 3 列：encoding_context_json、fragment_type、keywords_text
- 新增 db_version 追踪（memory_config 表）
- 实现 `migrateDB()`: v1→v2 自动迁移（ALTER TABLE + 版本号更新）
- 更新 `insertEpisodicMemory()`: 支持新字段写入
- 新增 `searchEpisodicByKeywords()`: 关键词搜索 + 相关性评分
- 更新 `EpisodicRow` 类型：增加新字段

#### 4. 记忆系统重构 (`src/lib/MemorySystem.ts`)
- `addEpisodicMemory()`: 新增 encodingContext 参数，写入 encoding_context_json/fragment_type/keywords_text
- `retrieveRelevantEpisodic()`: 从3信号升级为5信号混合检索（语义30% + 关键词25% + 时效15% + 重要性15% + 上下文15%）
- `addSemanticFact()`: 新增 evolutionHint 参数，支持5种演化模式（reinforcement/confidence×2, refinement/confidence+boost, contradiction/confidence×0.5, generalization/confidence+boost）
- `buildMemoryPromptContext()`: 新增 queryContext 参数传递给检索
- `extractAndClassify()`: 委托给 cognitiveExtract
- 新增 `extractAndClassifyWithEvolution()`: 支持演化模式检测
- 新增 `calculateContextMatch()`: 编码上下文匹配评分
- 新增 `rowToEpisodicMemory()`: 统一的行→对象转换（消除重复代码）
- 移除旧的 `extractKeywords()` 单字频率统计，统一使用 `extractKeywordsWithFallback()`

#### 5. 本地大脑集成 (`src/lib/LocalBrain.ts`)
- 两处 `extractAndClassify` 调用全部替换为 `extractAndClassifyWithEvolution`
- 每次用户消息触发 `captureEncodingContext()` 捕获情境快照
- 情景记忆写入时使用 `calculateEmotionGatedImportance()` 计算情绪门控重要性
- 语义事实写入时传递演化提示（evolutionHint）
- 主观类记忆基础重要性 0.8，其他 0.6

#### 6. 核心编排层更新 (`src/lib/AnimaCore.ts`)
- `endConversation()` 对话归档时捕获 EncodingContext
- 归档记忆使用情绪门控重要性

#### 7. 五信号混合检索器 (`src/lib/HybridRetriever.ts`) — 新文件
- `hybridRetrieve()`: 五信号混合检索入口
  - 语义相似度（向量嵌入）权重 0.30
  - 关键词匹配（jieba分词 + LIKE搜索）权重 0.25
  - 时间衰减权重 0.15
  - 重要性分数权重 0.15
  - 上下文匹配（编码特异性）权重 0.15
- `retrieveSemanticFacts()`: 语义事实检索 + 关键词相关性评分
- 权重可配置（`Partial<RetrievalSignal>`）
- 最低分数阈值可调（默认 0.12）

#### 8. 记忆反思引擎 (`src/lib/MemoryReflector.ts`) — 新文件
- `reflectOnMemories()`: 定期反思入口
  - 主题聚类：将相似记忆按关键词聚类
  - 合并去重：3条以上低重要性同类记忆 → 合并为1条
  - 矛盾检测：发现语义事实矛盾 → 标记并降低置信度
  - 自然衰减：importance × 0.95
  - 弱记忆清理：importance < 0.1 删除
  - 洞察生成：用户最在意的话题、记忆库健康度
- `shouldReflect()`: 自适应反思频率（记忆越多→反思越频繁）

### 数据流图

```
用户消息 "今天加班到10点，好想吃炸鸡解压"
    │
    ├─→ captureEncodingContext()
    │     → { userMood: 'anxious', timeOfDay: 'night', arousalLevel: 0.7, ... }
    │
    ├─→ extractAndClassifyWithEvolution()
    │     → episodic: [{ content: "加班到10点", fragmentType: "factual", keywords: [...] }]
    │     → semantic: [{ key: "压力应对", value: "吃炸鸡", category: "preference" }]
    │     → evolutionHints: [{ key: "压力应对", pattern: "generalization", mergedValue: "吃美食(火锅/炸鸡)" }]
    │
    ├─→ addEpisodicMemory(memory, encodingCtx)
    │     → importance = calculateEmotionGatedImportance(0.6, ctx) = 0.75
    │     → DB: encoding_context_json, fragment_type, keywords_text 全部写入
    │
    └─→ addSemanticFact(fact, evolutionHint)
          → pattern: generalization → confidence + boost, value merged

检索时:
查询 "主人今天心情不好"
    │
    └─→ hybridRetrieve({ queryContext: currentCtx })
          → 语义 0.30 + 关键词 0.25 + 时效 0.15 + 重要性 0.15 + 上下文匹配 0.15
          → contextMatch: 当前anxious ↔ 编码anxious → boost!
          → 返回: "压力大时→吃美食" (score: 0.85)
```

### TypeScript 编译验证
✅ `npx tsc --noEmit` 通过，项目零错误

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
- 增强: `@openmined/psi.js`（ECDH+Bloom Filter）→ 服务器完全无法学习标签

### 二、社交产品三大生死问题设计

#### 问题1：冷启动
- NPC宠物池：核心商圈H3格子预置官方NPC（星巴克打工猫、图书馆学霸鹰）
- NPC三层响应：L1固定脚本(0ms) → L2关键词触发(<50ms) → L3本地AI(1-3s)
- 单机闭环：《观察人类（主人）日记》— 记忆系统驱动，每天自动生成

#### 问题2：留存
- 情绪与电量机制：Mood(0-100) + Energy(0-100)，耗尽→罢工/撒娇/乱跑
- 性格觉醒盲盒：10天观察期→聚类性格维度→觉醒人格（不是选的是聊出来的）
- 觉醒人格矩阵：说话风格×情感倾向×价值观 = 4×4=16种人格

#### 问题3：裂变
- 炫耀切片：日记精选/觉醒时刻/毒舌金句/邂逅故事/主人画像
- Skia渲染分享卡片 → 一键分享微信朋友圈

### 三、新增模块与现有架构映射
| 产品功能 | 技术组件 | 现有/新增 |
|---------|---------|----------|
| 每日日记 | PetDiaryGenerator | 新增（客户端） |
| 日记内容源 | CognitiveMemoryExtractor + MemorySystem | ✅ 现有 |
| 情绪/电量 | EnergySystem | 新增（客户端） |
| 性格觉醒 | PersonalityAwakener | 新增（客户端） |
| 觉醒数据源 | MemorySystem + EmbeddingEngine | ✅ 现有 |
| NPC宠物池 | NPCPetEngine | 新增（服务端） |
| 炫耀切片 | ShareSliceRenderer | 新增（Skia渲染） |
| 星图社交 | H3 + WebSocket + TagVector | 已设计 |
| 隐私保护 | PrivacyGuard | ✅ 现有 |

### 四、增长飞轮
```
新用户下载 → NPC宠物池(立刻有东西玩) → 每日日记(每天有理由回来)
→ 性格觉醒(10天盲盒) → 炫耀切片(分享=获客) → 新用户下载
```

---

## 2026-04-22 - 编码特异性闭环修复

### 为什么修改
编码特异性原理（Encoding Specificity Principle）的核心是：**记忆的提取效果取决于编码时和提取时的上下文重叠度**。之前虽然实现了编码侧（写入时存储 EncodingContext），但检索侧的 3 处 `buildMemoryPromptContext()` 调用均未传入当前查询上下文，导致"相"只存不用的半闭环状态。

### 修复前 vs 修复后

```
修复前（半闭环 - "相"只存不用）:
  用户消息 → captureEncodingContext() → addEpisodicMemory(ctx) ✅ 写入
  用户消息 → buildMemoryPromptContext() ❌ 没传 queryContext → 检索时无法匹配"相"

修复后（全闭环 - 编码特异性完整实现）:
  用户消息 → captureEncodingContext() → addEpisodicMemory(ctx) ✅ 写入
  用户消息 → captureEncodingContext() → buildMemoryPromptContext(queryCtx) ✅ 检索时匹配"相"
```

### 修复内容
- [LocalBrain.ts](file:///Users/mac/project/idea-turbo/anima-rn/src/lib/LocalBrain.ts) 3处 `buildMemoryPromptContext` 调用：
  1. `generatePetReply`（非流式）— 新增 `queryContext` 传入
  2. `generatePetReplyStream`（流式）— 新增 `queryContext` 传入
  3. `generateVisitorReply`（访客模式）— 新增 `queryContext` 传入

### 编码特异性完整数据流验证

```
写入路径:
  用户消息 "今天加班到10点，好想吃炸鸡解压"
    → captureEncodingContext()
        → { userMood: 'anxious', timeOfDay: 'night', arousalLevel: 0.7 }
    → addEpisodicMemory(memory, encodingCtx)
        → DB: encoding_context_json = '{"userMood":"anxious","timeOfDay":"night",...}'

检索路径（修复后）:
  用户消息 "主人今天心情不好"
    → captureEncodingContext()
        → { userMood: 'sad', timeOfDay: 'night', ... }
    → buildMemoryPromptContext(petId, query, mode, queryContext)  ← 关键修复
        → retrieveRelevantEpisodic(petId, query, mode, 2, queryContext)
            → calculateContextMatch(queryCtx, memory.encoding_context_json)
                → moodMatch: sad ↔ anxious → 0.25 (相近情绪)
                → timeMatch: night ↔ night → 0.30 (完全匹配)
                → topicMatch: 情绪 ↔ 工作压力 → 0.10 (部分重叠)
            → contextScore = 0.65 → 显著提升该记忆的最终排名
    → 宠物回复: "喵~今天是不是又加班了？要不要点份炸鸡犒劳自己？"
```

### TypeScript 编译验证
✅ `npx tsc --noEmit` 通过，项目零错误
