# 黑卡引擎（BlackCard Engine）- 项目需求文档 (PRD)

> **版本**: v2.0 (合规改造版)
> **更新日期**: 2026-04-16
> **状态**: 开发中
> **文档类型**: 产品需求规格说明书

---

## 1. 项目概述

### 1.1 产品定位

黑卡引擎是一款**合规化的私域粉丝运营SaaS平台**，为KOL/网红提供粉丝裂变、任务分发、积分激励、商品交易等一体化解决方案。核心设计理念是**"合法电商 + 游戏化排位 + 一级分销 + 盲盒抽奖"**的组合模式。

### 1.2 核心价值主张

| 维度 | 价值 | 目标用户 |
|------|------|----------|
| KOL端 | 粉丝裂变增长工具、私域变现平台、粉丝活跃度管理 | 微信公众号/小程序KOL |
| 粉丝端 | 参与KOL活动获得奖励、购买周边商品、社交互动体验 | KOL的微信粉丝 |
| 管理端 | 全局数据监控、风险管控、运营配置 | 平台运营人员 |

### 1.3 合规核心原则（法律红线）

```
┌─────────────────────────────────────────────────────────────┐
│                    合规三大铁律                               │
├─────────────────────────────────────────────────────────────┤
│  ❌ 绝对禁止:                                               │
│    1. 入门费/门槛费 - 不能交钱买资格                         │
│    2. 多层级拉人头 - 只允许一级CPS                           │
│    3. 承诺保底收益 - 不承诺分红/回报                         │
│                                                             │
│  ✅ 允许的操作:                                             │
│    1. 真实商品交易 - 有物流发货记录                          │
│    2. 一级推广佣金 - 同淘宝客模式                            │
│    3. 积分抽奖盲盒 - 概率可控的游戏化机制                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 用户角色与权限矩阵

### 2.1 角色定义

| 角色 | 标识符 | 描述 | 权限范围 |
|------|--------|------|----------|
| 粉丝 | FAN | 普通用户，参与活动、打卡、做任务 | 个人数据读写、参与活动 |
| KOL | KOL | 内容创作者，创建和管理活动 | 活动管理、商品管理、数据查看 |
| 管理员 | ADMIN | 平台运营者 | 全局管理、风控审核 |

### 2.2 功能权限矩阵

| 功能模块 | FAN | KOL | ADMIN |
|----------|-----|-----|-------|
| 微信/手机登录 | ✅ | ✅ | ✅ |
| 查看公开活动 | ✅ | ✅ | ✅ |
| 申请黑卡资格 | ✅ | - | - |
| 每日打卡 | ✅ | - | - |
| 提交任务 | ✅ | - | - |
| 邀请好友(一级) | ✅ | - | - |
| 发起助力任务 | ✅ | - | - |
| 积分抽奖 | ✅ | - | - |
| 浏览/购买商品 | ✅ | - | - |
| 创建活动 | - | ✅ | ✅ |
| 管理商品 | - | ✅ | - |
| 审核任务提交 | - | ✅ | ✅ |
| 赛季管理 | - | ✅ | ✅ |
| 全局数据看板 | - | - | ✅ |
| 风险管控 | - | - | ✅ |

---

## 3. 功能模块详细规格

### 3.1 认证授权模块 (AuthModule)

#### 3.1.1 功能描述

支持微信登录和手机号登录双通道认证，JWT Token 无状态鉴权。

#### 3.1.2 API 接口规格

| 接口 | 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|------|
| 微信登录 | POST | `/auth/wechat/login` | 否 | 使用微信code登录 |
| 手机登录 | POST | `/auth/phone/login` | 否 | 使用手机验证码登录 |
| 发送短信码 | POST | `/auth/sms/send` | 否 | 发送SMS验证码 |
| 刷新Token | POST | `/auth/refresh` | 否 | 刷新访问令牌 |
| 登出 | POST | `/auth/logout` | 是 | 注销当前会话 |
| 获取个人信息 | GET | `/auth/profile` | 是 | 获取当前用户资料 |
| 更新个人信息 | PATCH | `/auth/profile` | 是 | 修改昵称/头像 |

#### 3.1.3 数据结构

```typescript
interface User {
  id: string;              // CUID
  openid: string;          // 微信openid (唯一)
  unionId?: string;        // 微信unionId (唯一)
  phone?: string;          // 手机号 (唯一)
  nickname?: string;       // 昵称
  avatar?: string;         // 头像URL
  deviceFingerprint?: string; // 设备指纹
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  role: 'FAN' | 'KOL' | 'ADMIN';
  lastLoginAt?: DateTime;
  createdAt: DateTime;
  updatedAt: DateTime;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;       // 秒
  user: {
    id: string;
    nickname?: string;
    avatar?: string;
    role: UserRole;
  };
}
```

#### 3.1.4 业务规则

- **微信登录流程**: 前端调用 `wx.login()` 获取 code → 后端用 code+appid+secret 换取 openid → 查找或创建 User → 返回 JWT
- **手机登录流程**: 输入手机号 → 发送验证码 → 验证码校验 → 查找或创建 User → 返回 JWT
- **Token有效期**: Access Token 7天, Refresh Token 30天
- **设备指纹**: 登录时收集用于风控和反作弊

#### 3.1.5 验收标准

- [ ] 微信登录能正确返回JWT Token
- [ ] 新用户首次登录自动注册
- [ ] 老用户登录信息正确更新
- [ ] Token过期后能通过RefreshToken刷新
- [ ] 无效Token返回401错误
- [ ] 设备指纹正确记录

---

### 3.2 活动管理模块 (ActivityModule)

#### 3.2.1 功能描述

KOL创建和管理"黑卡活动"，每个活动有独立的黑卡配额、任务列表、赛季周期。

#### 3.2.2 API 接口规格

| 接口 | 方法 | 路径 | 认证 | 角色 | 描述 |
|------|------|------|------|------|------|
| 创建活动 | POST | `/activity` | 是 | KOL | 创建新活动 |
| 获取我的活动 | GET | `/activity/my` | 是 | KOL | KOL的活动列表 |
| 获取公开活动 | GET | `/activity/public` | 否 | - | 公开活动列表 |
| 获取活动详情 | GET | `/activity/:id` | 否 | - | 单个活动详情 |
| 更新活动 | PATCH | `/activity/:id` | 是 | KOL | 修改活动信息 |
| 发布活动 | POST | `/activity/:id/publish` | 是 | KOL | 发布活动 |
| 活动统计 | GET | `/activity/:id/stats` | 否 | - | 活动数据统计 |

#### 3.2.3 数据结构

```typescript
interface Activity {
  id: string;
  kolId: string;
  title: string;
  description?: string;
  coverImage?: string;
  prizeName: string;           // 奖品名称 (如:iPhone 16 Pro)
  prizeImage?: string;
  prizeValue: number;           // 奖品价值(元)
  blackCardQuota: number;       // 黑卡总配额
  blackCardIssued: number;      // 已发放数量
  qualificationDays: number;    // 连续打卡天数要求 (默认7)
  startDate: DateTime;
  endDate: DateTime;
  status: 'DRAFT' | 'PUBLISHED' | 'ONGOING' | 'FINISHED' | 'CANCELLED';
  kol: { name: string; avatar?: string; platform: string };
  _count?: { blackCards: number };
}
```

#### 3.2.4 业务规则

- **活动生命周期**: DRAFT → PUBLISHED → ONGOING → FINISHED/CANCELLED
- **黑卡配额控制**: `blackCardIssued <= blackCardQuota`
- **资格获取条件**: 连续打卡达到 `qualificationDays` 天自动获得黑卡资格
- **时间约束**: `startDate < endDate`, 活动期间才能申请黑卡

#### 3.2.5 验收标准

- [ ] KOL能成功创建活动并设置所有参数
- [ ] 活动发布后状态变为PUBLISHED
- [ ] 到达startDate自动变为ONGOING
- [ ] 配额满后无法再发放黑卡
- [ ] 公开接口不返回草稿活动

---

### 3.3 黑卡体系模块 (BlackCardModule)

#### 3.3.1 功能描述

**合规核心**: 黑卡资格永远免费，只能通过真实劳动(打卡)获得。不能用钱买到。

#### 3.3.2 API 接口规格

| 接口 | 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|------|
| 申请黑卡 | POST | `/blackcard/apply` | 是 | 申请黑卡资格 |
| 我的黑卡列表 | GET | `/blackcard/my` | 是 | 当前用户的黑卡 |
| 黑卡详情 | GET | `/blackcard/:id` | 是 | 单个黑卡详情 |

#### 3.3.3 数据结构

```typescript
type BlackCardStatus = 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
type BlackCardTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';

interface BlackCard {
  id: string;
  userId: string;
  activityId: string;
  cardNumber: string;         // 唯一卡号
  status: BlackCardStatus;
  tier: BlackCardTier;        // 段位 (默认BRONZE)
  totalPoints: number;        // 总积分
  currentRank: number;        // 当前排名
  acquiredAt: DateTime;       // 获得时间
  expiresAt?: DateTime;       // 过期时间
  lastActiveAt: DateTime;     // 最后活跃时间
  activity: { id: string; title: string; prizeName: string; endDate: string };
}
```

#### 3.3.4 段位体系 (Tier System)

```
DIAMOND (钻石) ──── 前 1%   ──── 顶级特权
    ↑
PLATINUM (铂金) ──── 前 5%
    ↑
GOLD (黄金)    ──── 前 15%
    ↑
SILVER (白银)  ──── 前 30%
    ↑
BRONZE (青铜)  ──── 其余    ──── 基础权限
```

**段位升降规则**:
- **初始段位**: 所有新获得的黑卡从 BRONZE 开始
- **升级**: 通过积累积分在排行榜上升
- **降级**: 赛季结算时根据排名降级 (不是淘汰!)
- **降级不收回**: 黑卡本身不会被没收，只是段位降低

#### 3.3.5 业务规则

- **免费获取**: 黑卡资格100%免费，无法用任何方式购买
- **唯一性**: 每个用户在每个活动中最多只有一张黑卡 (`@@unique([userId, activityId])`)
- **资格判定**: 连续打卡 >= qualificationDays 天 → 自动激活黑卡
- **段位重置**: 每个新赛季开始时根据上赛季排名重新计算段位

#### 3.3.6 验收标准

- [ ] 用户连续打卡达标后自动获得黑卡
- [ ] 黑卡状态正确流转
- [ ] 段位根据积分排名正确计算
- [ ] 无法通过付费获得黑卡
- [ ] 一个活动一个用户只有一张黑卡

---

### 3.4 任务系统模块 (TaskModule)

#### 3.4.1 功能描述

KOL发布任务，粉丝完成任务获得积分奖励。支持多种任务类型和验证方式。

#### 3.4.2 API 接口规格

| 接口 | 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|------|
| 创建任务 | POST | `/task` | 是(KOL) | 创建新任务 |
| 活动任务列表 | GET | `/task/activity/:activityId` | 否 | 活动的所有任务 |
| 任务详情 | GET | `/task/:id` | 否 | 单个任务详情 |
| 提交任务 | POST | `/task/submit` | 是(FAN) | 提交任务完成证明 |
| 我的提交 | GET | `/task/submissions/my` | is | 我的提交记录 |
| 审核提交 | PATCH | `/task/submission/:id/review` | is(KOL) | 审核任务提交 |

#### 3.4.3 数据结构

```typescript
type TaskType = 'SHARE_POST' | 'COMMENT' | 'LIKE' | 'CHECKIN' | 'CUSTOM';
type VerificationType = 'MANUAL' | 'OCR' | 'LINK_CLICK' | 'AUTO';
type TaskStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

interface Task {
  id: string;
  activityId: string;
  title: string;
  description?: string;
  type: TaskType;
  points: number;             // 完成奖励积分
  dailyLimit: number;         // 每日上限
  totalLimit?: number;        // 总上限
  verificationType: VerificationType;
  verificationConfig?: Json;  // OCR模板/链接地址等
  status: TaskStatus;
}

type SubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface TaskSubmission {
  id: string;
  taskId: string;
  userId: string;
  blackCardId?: string;
  proofImages: string[];      // 截图证据
  proofText?: string;         // 文字说明
  proofData?: Json;           // 结构化数据
  status: SubmissionStatus;
  pointsAwarded: number;
  reviewedAt?: DateTime;
  reviewNote?: string;
  task: { title: string; type: TaskType; points: number };
}
```

#### 3.4.4 任务类型详解

| 类型 | 说明 | 验证方式 | 典型积分 |
|------|------|----------|----------|
| SHARE_POST | 分享帖子到朋友圈 | 截图OCR识别 | 10-20 |
| COMMENT | 评论指定内容 | 人工审核 | 5-10 |
| LIKE | 点赞指定内容 | 链接点击追踪 | 2-5 |
| CHECKIN | 每日签到 | 自动(已由CheckinModule处理) | 5-20 |
| CUSTOM | 自定义任务 | 按配置 | 可变 |

#### 3.4.5 业务规则

- **每日限制**: 每种任务每天最多完成 dailyLimit 次
- **总量限制**: 可选设置 totalLimit 限制总次数
- **审核流程**: PENDING → APPROVED/REJECTED
- **积分发放时机**: 审核通过后异步入账 (通过QueueService)
- **防刷机制**: 结合设备指纹 + 行为分析检测异常

#### 3.4.6 验收标准

- [ ] KOL能创建各类型任务
- [ ] 粉丝能提交任务并上传截图
- [ ] 每日限制正确执行
- [ ] 审核流程完整 (待审→通过/拒绝)
- [ ] 积分异步入账正确

---

### 3.5 打卡模块 (CheckinModule)

#### 3.5.1 功能描述

每日打卡是获取黑卡资格的核心途径。支持连续打卡奖励递增机制。

#### 3.5.2 API 接口规格

| 接口 | 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|------|
| 每日打卡 | POST | `/checkin` | is | 执行打卡 |
| 打卡历史 | GET | `/checkin/my/:activityId` | is | 我的打卡记录 |
| 今日状态 | GET | `/checkin/today/:activityId` | is | 今日是否已打卡 |

#### 3.5.3 连续打卡积分规则

```
第 1-3 天:    5 分/天   (基础期)
第 4-7 天:   10 分/天   (成长期)
第 8-14 天:  15 分/天   (稳定期)
第 15-30天:  20 分/天   (忠诚期)
第 31天+:    25 分/天   (铁粉期)
```

#### 3.5.4 业务规则

- **唯一打卡**: 每个用户每天每个活动只能打卡一次 (`@@unique([userId, activityId, checkinDate])`)
- **连续性判定**: 中断一天则 consecutiveDays 重置为 1
- **资格判定**: 当 consecutiveDays >= activity.qualificationDays 时触发黑卡资格获取
- **跨天处理**: 以服务器时间为准，0点重置

#### 3.5.5 验收标准

- [ ] 每天只能打卡一次
- [ ] 连续天数正确累计
- [ ] 中断后正确重置
- [ ] 积分按阶梯规则发放
- [ ] 达标后自动触发黑卡资格

---

### 3.6 积分模块 (PointsModule)

#### 3.6.1 功能描述

积分是系统的核心货币单位。所有行为产生积分变动，完整的流水记录确保可审计。

#### 3.6.2 API 接口规格

| 接口 | 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|------|
| 查询余额 | GET | `/points/balance/:blackCardId` | is | 黑卡积分余额 |
| 积分流水 | GET | `/points/ledger` | is | 当前用户流水 |
| 黑卡流水 | GET | `/points/ledger/:blackCardId` | is | 指定黑卡流水 |

#### 3.6.3 积分类型枚举

```typescript
type PointType =
  | 'TASK_REWARD'      // 任务奖励 (+)
  | 'INVITE_BONUS'     // 邀请奖励 (+)
  | 'PURCHASE_BONUS'   // 购买赠送 (+)
  | 'ASSIST_BONUS'     // 助力奖励 (+)
  | 'LOTTERY_COST'     // 抽奖消耗 (-)
  | 'LOTTERY_WIN'      // 抽奖中奖 (+)
  | 'SEASON_RESET'     // 赛季重置 (-)
  | 'PENALTY'          // 惩罚扣减 (-)
  | 'EXPIRATION'       // 积分过期 (-)
  | 'ADMIN_ADJUST'     // 管理员调整 (+/-);
```

#### 3.6.4 数据结构

```typescript
interface PointLedger {
  id: string;
  userId: string;
  blackCardId?: string;
  type: PointType;
  amount: number;            // 正数=增加, 负数=减少
  balance: number;           // 变动后余额
  source: string;            // 来源标识
  sourceId?: string;         // 关联业务ID
  description?: string;
  createdAt: DateTime;
}
```

#### 3.6.5 业务规则

- **原子性**: 每次积分变动必须同时更新 BlackCard.totalPoints 和创建 PointLedger 记录
- **不可为负**: totalPoints 最低为 0，不允许透支
- **异步处理**: 大批量积分变动通过 QueueService 异步处理
- **Redis缓存**: 排行榜分数实时同步到 Redis Sorted Set

#### 3.6.6 验收标准

- [ ] 每次积分变动都有对应的流水记录
- [ ] 余额计算准确无误
- [ ] 流水按时间倒序排列
- [ ] 支持按类型筛选

---

### 3.7 排行榜模块 (LeaderboardModule)

#### 3.7.1 功能描述

基于 Redis Sorted Set 的实时排行榜，支持多种查询维度。

#### 3.7.2 API 接口规格

| 接口 | 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|------|
| Top N | GET | `/leaderboard/:activityId/top` | 否 | 前N名排行 |
| 我的排名 | GET | `/leaderboard/:activityId/me` | is | 我的排名信息 |
| 我附近 | GET | `/leaderboard/:activityId/around-me` | is | 我附近的排行 |

#### 3.7.3 数据结构

```typescript
interface LeaderboardEntry {
  rank: number;
  userId: string;
  score: number;
  user?: { nickname: string; avatar?: string };
}

interface MyRankResponse {
  rank: number | null;
  score: number | null;
  distanceToNext: { nextUserId: string; distance: number } | null;
  totalParticipants: number;
}
```

#### 3.7.4 技术实现

- **存储**: Redis ZSET (`leaderboard:{activityId}`)
- **Score**: 用户在该活动的 totalPoints
- **Member**: userId
- **排序**: 降序 (ZREVRANGE)

#### 3.7.5 验收标准

- [ ] 排行榜实时更新 (积分变动后立即反映)
- [ ] 排名计算准确
- [ ] "我附近"查询返回正确的上下文
- [ ] distanceToNext 计算正确

---

### 3.8 商品模块 (ProductModule) ⭐ 合规核心

#### 3.8.1 功能描述

**合规关键**: KOL销售的是**真实商品**，不是虚拟资格。商品交易附带积分赠送作为促销福利。

#### 3.8.2 API 接口规格

| 接口 | 方法 | 路径 | 认证 | 角色 | 描述 |
|------|------|------|------|------|------|
| 创建商品 | POST | `/product` | is | KOL | 上架新商品 |
| 公开商品列表 | GET | `/product/public` | 否 | - | 所有上架商品 |
| 我的商品 | GET | `/product` | is | KOL | KOL的商品 |
| 商品详情 | GET | `/product/:id` | 否 | - | 商品详情 |
| 更新商品 | PATCH | `/product/:id` | is | KOL | 修改商品信息 |

#### 3.8.3 数据结构

```typescript
type ProductCategory = 'MERCHANDISE' | 'DIGITAL' | 'COURSE' | 'TICKET' | 'OTHER';
type ProductBonusType = 'NONE' | 'FIXED' | 'PERCENTAGE';
type ProductStatus = 'ACTIVE' | 'OFF_SHELF' | 'SOLD_OUT';

interface Product {
  id: string;
  kolId: string;
  activityId?: string;           // 可关联活动作为活动专属商品
  name: string;                  // 商品名称
  description?: string;
  coverImage?: string;
  images: string[];
  price: number;                 // 价格(元)
  category: ProductCategory;
  inventory: number;             // 库存
  soldCount: number;             // 已售数量
  bonusPoints: number;           // 赠送积分数量
  bonusType: ProductBonusType;   // NONE=不赠送, FIXED=固定值, PERCENTAGE=比例
  shippingRequired: boolean;     // 是否需要物流
  status: ProductStatus;
}
```

#### 3.8.4 合规要点

```
┌──────────────────────────────────────────────────┐
│               合规商品交易模型                     │
├──────────────────────────────────────────────────┤
│                                                   │
│  粉丝支付 99 元                                   │
│       ↓                                           │
│  获得: 联名T恤一件 (实物,有物流单)                 │
│  附赠: 积分 +500 (会员促销福利)                   │
│                                                   │
│  法律辩护:                                        │
│  "我们是电商平台!卖的是衣服!"                      │
│  "积分只是店铺促销手段"                            │
│                                                   │
└──────────────────────────────────────────────────┘
```

#### 3.8.5 业务规则

- **真实性**: 必须有真实的库存、物流、发货记录
- **买卖分离**: 购买商品 ≠ 获得黑卡资格
- **积分附赠**: bonusType 控制是否赠送及赠送方式
- **库存管理**: soldCount <= inventory, 库存为0自动变为 SOLD_OUT

#### 3.8.6 验收标准

- [ ] KOL能创建商品并设置所有参数
- [ ] 商品分类正确
- [ ] 库存售罄后状态变为SOLD_OUT
- [ ] 购买后正确发放bonusPoints
- [ ] 物流信息正确记录

---

### 3.9 订单模块 (OrderModule)

#### 3.9.1 功能描述

管理完整的订单生命周期: 下单→支付→发货→确认收货→完成/退款。

#### 3.9.2 API 接口规格

| 接口 | 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|------|
| 创建订单 | POST | `/order` | is | 创建订单 |
| 我的订单 | GET | `/order/my` | is | 我的订单列表 |
| 订单详情 | GET | `/order/:id` | is | 订单详情 |
| 支付订单 | POST | `/order/:id/pay` | is | 支付订单 |
| 发货 | POST | `/order/:id/ship` | is(KOL) | 填写物流 |
| 确认收货 | POST | `/order/:id/confirm` | is | 确认收货 |
| 取消订单 | POST | `/order/:id/cancel` | is | 取消订单 |

#### 3.9.3 数据结构

```typescript
type OrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';

interface Order {
  id: string;
  userId: string;
  orderNumber: string;          // 唯一订单号
  totalAmount: number;          // 总金额
  shippingAddress?: string;     // 收货地址
  shippingName?: string;        // 收货人
  shippingPhone?: string;       // 收货电话
  remark?: string;              // 备注
  trackingNumber?: string;      // 物流单号
  trackingCompany?: string;     // 物流公司
  status: OrderStatus;
  paidAt?: DateTime;
  shippedAt?: DateTime;
  completedAt?: DateTime;
  items: OrderItem[];           // 订单项列表
}

interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;            // 单价
  subtotal: number;             // 小计
  bonusPoints: number;          // 该项赠送积分
}
```

#### 3.9.4 订单状态流转

```
PENDING_PAYMENT → PAID → SHIPPED → COMPLETED
       ↓            ↓         ↓
   CANCELLED    CANCELLED  REFUNDED
```

#### 3.9.5 业务规则

- **订单号生成**: 格式 `{timestamp}{random6位}` 保证唯一
- **金额计算**: `totalAmount = SUM(items.unitPrice * items.quantity)`
- **支付集成**: 预留微信支付/支付宝接口
- **超时取消**: 未支付订单30分钟自动取消
- **积分发放**: 支付完成后异步发放 bonusPoints

#### 3.9.6 验收标准

- [ ] 订单创建后状态为PENDING_PAYMENT
- [ ] 支付后状态变为PAID
- [ ] 物流信息正确填写
- [ ] 自动发放bonusPoints
- [ ] 超时未支付自动取消

---

### 3.10 邀请模块 (InvitationModule) ⭐ 合规核心

#### 3.10.1 功能描述

**合规关键**: 严格的一级CPS模式。A邀请B，A拿奖励；B邀请C，A一分没有。

#### 3.10.2 API 接口规格

| 接口 | 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|------|
| 创建邀请 | POST | `/invitation` | is | 记录邀请关系 |
| 我的邀请 | GET | `/invitation/my` | is | 我邀请的人列表 |
| 邀请统计 | GET | `/invitation/stats` | is | 邀请数据统计 |

#### 3.10.3 数据结构

```typescript
type InvitationStatus = 'PENDING' | 'COMPLETED';

interface Invitation {
  id: string;
  inviterId: string;           // 邀请人ID
  inviteeId: string;           // 被邀请人ID
  activityId?: string;         // 关联活动
  status: InvitationStatus;
  bonusPoints: number;         // 邀请人获得的积分奖励
  completedAt?: DateTime;
  createdAt: DateTime;
  updatedAt: DateTime;
  invitee?: { nickname: string; avatar?: string };
}
```

#### 3.10.4 合规要点

```
┌──────────────────────────────────────────────────┐
│              一级CPS模型 (合规)                    │
├──────────────────────────────────────────────────┤
│                                                   │
│   A (邀请人)                                      │
│    ↓ 直接邀请                                      │
│   B (被邀请人) ← A拿到积分奖励 ✓                   │
│    ↓ B再邀请                                       │
│   C (被邀请人) ← A拿不到 ✗                        │
│                       ↓                           │
│                     B拿到积分 ✓                    │
│                                                   │
│   类比: 淘宝客(Affiliate)                          │
│   "每个人都是直接和商家结算"                        │
│                                                   │
└──────────────────────────────────────────────────┘
```

#### 3.10.5 业务规则

- **唯一关系**: 每对 (inviterId, inviteeId) 只有一条记录 (`@@unique([inviterId, inviteeId])`)
- **一级限制**: 只有直接邀请关系产生奖励
- **去重**: 同一人不能重复邀请
- **奖励时机**: 被邀请人完成首次有效操作(如打卡)后发放奖励
- **链接形式**: 分享的是"商品链接"或"活动页面"，不是"加入黑卡邀请"

#### 3.10.6 验收标准

- [ ] 邀请关系正确建立
- [ ] 只有直接邀请人获得奖励
- [ ] 二级及以上无奖励
- [ ] 不会重复建立关系
- [ ] 统计数据准确

---

### 3.11 赛季模块 (SeasonModule) ⭐ 合规核心

#### 3.11.1 功能描述

**合规关键**: 用"段位降级"代替"淘汰制"。保留希望，避免群体举报。

#### 3.11.2 API 接口规格

| 接口 | 方法 | 路径 | 认证 | 角色 | 描述 |
|------|------|------|------|------|------|
| 创建赛季 | POST | `/season` | is | KOL/ADMIN | 创建新赛季 |
| 活动赛季列表 | GET | `/season/activity/:activityId` | 否 | - | 活动的赛季列表 |
| 当前赛季 | GET | `/season/current/:activityId` | 否 | - | 进行中的赛季 |
| 开始赛季 | POST | `/season/:id/start` | is | KOL/ADMIN | 启动赛季 |
| 赛季结算 | POST | `/season/:id/settle` | is | KOL/ADMIN | 结算赛季 |
| 我的赛季排名 | GET | `/season/:id/my-rank` | is | 我的赛季排名 |

#### 3.11.3 数据结构

```typescript
type SeasonStatus = 'UPCOMING' | 'ACTIVE' | 'FINISHED';

interface Season {
  id: string;
  activityId: string;
  seasonNumber: number;        // 第N赛季
  name: string;                // 如 "2026Q1 赛季"
  startDate: DateTime;
  endDate: DateTime;
  status: SeasonStatus;
  demotionRules?: Json;        // 降级规则配置
  seasonRanks: SeasonRank[];   // 赛季最终排名
}

interface SeasonRank {
  id: string;
  seasonId: string;
  blackCardId: string;
  userId: string;
  finalRank: number;           // 最终排名
  finalPoints: number;         // 最终积分
  finalTier?: BlackCardTier;   // 赛季结算后的段位
}
```

#### 3.11.4 降级规则示例

```json
{
  "demotionThresholds": [15000, 5000, 2000, 500, 0],
  "tierMapping": ["DIAMOND", "PLATINUM", "GOLD", "SILVER", "BRONZE"],
  "description": "积分>=15000保持钻石, >=5000铂金, >=2000黄金, >=500白银, 其他青铜"
}
```

#### 3.11.5 合规要点

```
┌──────────────────────────────────────────────────┐
│            降级 vs 淘汰 对比                       │
├──────────────────────────────────────────────────┤
│                                                   │
│  ❌ 旧版(淘汰制):                                  │
│     月末排名后10% → 没收黑卡 → 粉丝愤怒 → 举报    │
│                                                   │
│  ✅ 新版(降级制):                                  │
│     月末排名后10% → 降到青铜段位 → 还可以做基础任务 │
│     → "下个月我要打回去!" → 继续留存              │
│                                                   │
│  社会学原理:                                      │
│  给韭菜留个低级账号, 他们就觉得还是圈子里的人       │
│  就不会去举报你                                    │
│                                                   │
└──────────────────────────────────────────────────┘
```

#### 3.11.6 业务规则

- **赛季序列**: 每个活动可以有多个赛季, seasonNumber 递增
- **时间不重叠**: 同一活动同一时间只有一个 ACTIVE 赛季
- **结算逻辑**: 赛季结束时按积分排名 → 应用降级规则 → 写入 SeasonRank → 更新 BlackCard.tier
- **积分处理**: SEASON_RESET 类型的积分变动清零或部分扣除

#### 3.11.7 验收标准

- [ ] 赛季正确创建和启动
- [ ] 结算时排名正确计算
- [ ] 降级规则正确应用
- [ ] 段位正确更新
- [ ] 不会出现重叠的活跃赛季

---

### 3.12 助力模块 (AssistModule)

#### 3.12.1 功能描述

一级拼团式助力任务。发起者邀请好友助力，达成目标后获得积分奖励。

#### 3.12.2 API 接口规格

| 接口 | 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|------|
| 发起助力 | POST | `/assist/task` | is | 创建助力任务 |
| 助力帮忙 | POST | `/assist/help/:taskId` | is | 帮助助力 |
| 任务详情 | GET | `/assist/task/:taskId` | 否 | 助力任务详情 |
| 我的任务 | GET | `/assist/my-tasks` | is | 我发起的任务 |
| 我的记录 | GET | `/assist/my-records` | is | 我帮助过的记录 |

#### 3.12.3 数据结构

```typescript
type AssistTaskStatus = 'ACTIVE' | 'COMPLETED' | 'EXPIRED';

interface AssistTask {
  id: string;
  activityId: string;
  initiatorId: string;         // 发起人
  targetCount: number;         // 目标人数 (默认5)
  currentCount: number;        // 当前人数
  bonusPoints: number;         // 完成奖励积分
  status: AssistTaskStatus;
  assists: AssistRecord[];     # 助力记录
  expiresAt: DateTime;         // 过期时间
  completedAt?: DateTime;
}

interface AssistRecord {
  id: string;
  taskId: string;
  helperId: string;            # 帮助人ID
  createdAt: DateTime;
}
```

#### 3.12.4 业务规则

- **唯一帮助**: 每个人对同一个助力任务只能帮一次 (`@@unique([taskId, helperId])`)
- **不能自己帮自己**: initiatorId != helperId
- **过期机制**: 超过 expiresAt 自动变为 EXPIRED
- **完成判定**: currentCount >= targetCount 时变为 COMPLETED
- **新人优先**: 鼓励邀请未注册用户 (可作为拉新手段)

#### 3.12.5 验收标准

- [ ] 能成功发起助力任务
- [ ] 好友能帮忙助力
- [ ] 自己不能帮自己
- [ ] 同一人不能重复帮
- [ ] 达成目标后自动完成
- [ ] 过期后自动失效

---

### 3.13 抽奖模块 (LotteryModule)

#### 3.13.1 功能描述

积分抽奖/盲盒系统。用户消耗积分参与抽奖，概率可控。

#### 3.13.2 API 接口规格

| 接口 | 方法 | 路径 | 认证 | 角色 | 描述 |
|------|------|------|------|------|------|
| 创建奖池 | POST | `/lottery/pool` | is | KOL | 创建抽奖池 |
| 添加奖品 | POST | `/lottery/pool/:poolId/prize` | is | KOL | 添加奖品 |
| 奖池列表 | GET | `/lottery/pools` | 否 | - | 所有可用奖池 |
| 奖池详情 | GET | `/lottery/pool/:poolId` | 否 | - | 奖池详情 |
| 抽奖 | POST | `/lottery/draw/:poolId` | is | FAN | 参与抽奖 |
| 我的抽奖记录 | GET | `/lottery/my-draws` | is | FAN | 我的抽奖记录 |
| 领取奖品 | POST | `/lottery/claim/:drawId` | is | FAN | 领取中奖奖品 |

#### 3.13.3 数据结构

```typescript
type LotteryPoolStatus = 'ACTIVE' | 'PAUSED' | 'CLOSED';
type LotteryPrizeTier = 'LEGENDARY' | 'EPIC' | 'RARE' | 'COMMON' | 'THANK_YOU';
type LotteryDrawStatus = 'PENDING' | 'COMPLETED' | 'CLAIMED';

interface LotteryPool {
  id: string;
  kolId: string;
  activityId?: string;
  name: string;                // 如 "幸运转盘"
  description?: string;
  coverImage?: string;
  costPoints: number;          // 每次抽奖消耗积分
  status: LotteryPoolStatus;
  prizes: LotteryPrize[];
}

interface LotteryPrize {
  id: string;
  poolId: string;
  name: string;                // 奖品名称
  description?: string;
  image?: string;
  tier: LotteryPrizeTier;      // 稀有度
  probability: number;         // 概率 (0-1)
  totalStock: number;          // 总库存
  remainingStock: number;      // 剩余库存
}

interface LotteryDraw {
  id: string;
  poolId: string;
  userId: string;
  prizeId?: string;            // 中奖的奖品
  costPoints: number;
  status: LotteryDrawStatus;
  claimedAt?: DateTime;
}
```

#### 3.13.4 概率算法

```typescript
function draw(prizes: LotteryPrize[]): LotteryPrize | null {
  const totalProbability = prizes.reduce((sum, p) => sum + p.probability, 0);
  let random = Math.random() * totalProbability;

  for (const prize of prizes) {
    if (prize.remainingStock <= 0) continue;
    random -= prize.probability;
    if (random <= 0) return prize;
  }
  return null; // THANK_YOU (谢谢参与)
}
```

#### 3.13.5 合规要点

- **不承诺保底**: 明确告知这是概率游戏
- **概率透明**: 奖品概率可见
- **库存有限**: 奖品发完即止
- **积分非现金**: 消耗的是虚拟积分，不涉及真金白银

#### 3.13.6 验收标准

- [ ] 概率分布符合配置
- [ ] 库存为0的奖品不会再中
- [ ] 积分正确扣除
- [ ] 中奖记录正确保存
- [ ] 领取状态正确流转

---

### 3.14 KOL模块 (KOLModule)

#### 3.14.1 功能描述

KOL身份管理和数据中心面板。

#### 3.14.2 API 接口规格

| 接口 | 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|------|
| KOL资料 | GET | `/kol/profile` | is | 当前KOL资料 |
| 更新资料 | PATCH | `/kol/profile` | is | 修改KOL资料 |
| 数据面板 | GET | `/kol/dashboard` | is | KOL数据概览 |
| 公开KOL信息 | GET | `/kol/public` | 否 | KOL公开信息 |
| KOL详情 | GET | `/kol/:id` | 否 | 指定KOL详情 |

#### 3.14.3 数据结构

```typescript
type KOLStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';

interface KOL {
  id: string;
  userId: string;
  name: string;                // KOL名称
  bio?: string;                // 简介
  avatar?: string;
  wechatId?: string;           // 微信号
  platform: string;            // 主平台
  commissionRate: number;      // 佣金比例 (默认0.7)
  status: KOLStatus;
}
```

#### 3.14.4 验收标准

- [ ] KOL资料正确展示
- [ ] Dashboard数据聚合正确
- [ ] 公开信息不包含敏感字段

---

### 3.15 通知模块 (NotificationModule)

#### 3.15.1 功能描述

系统通知推送，覆盖积分变动、任务状态、活动公告等场景。

#### 3.15.2 API 接口规格

| 接口 | 方法 | 路径 | 认证 | 描述 |
|------|------|------|------|------|
| 通知列表 | GET | `/notification` | is | 我的通知 |
| 未读数 | GET | `/notification/unread-count` | is | 未读数量 |
| 标记已读 | POST | `/notification/:id/read` | is | 单条已读 |
| 全部已读 | POST | `/notification/read-all` | is | 全部标记已读 |

#### 3.15.3 数据结构

```typescript
type NotificationType = 'SYSTEM' | 'POINTS' | 'TASK' | 'ACTIVITY' | 'INVITATION' | 'ORDER';

interface Notification {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: NotificationType;
  isRead: boolean;
  readAt?: DateTime;
  relatedId?: string;
  metadata?: Json;
  createdAt: DateTime;
}
```

#### 3.15.4 验收标准

- [ ] 通知正确创建和展示
- [ ] 未读计数准确
- [ ] 已读状态正确更新

---

## 4. 前后端数据一致性要求

### 4.1 已知不一致问题清单

以下是在代码审查中发现的前后端类型定义不一致问题:

| 模块 | 字段 | 前端定义 | 后端定义 | 严重度 | 状态 |
|------|------|----------|----------|--------|------|
| BlackCard | status | 含 REVOKED | 无 REVOKED | 🔴 高 | 待修复 |
| BlackCard | status | 含 SUSPENDED | 有 SUSPENDED | ✅ | 一致 |
| PointType | 枚举 | 含 PURCHASE | 含 PURCHASE_BONUS | 🔴 高 | 待修复 |
| PointType | 枚举 | 无 ASSIST_BONUS/LTTERY_* | 有 | 🟡 中 | 待修复 |
| TaskType | 枚举 | 含 INVITE | 无 INVITE | 🟡 中 | 待修复 |
| Invitation | status | 含 ACTIVE/QUALIFIED/REWARDED | 只有 PENDING/COMPLETED | 🔴 高 | 待修复 |
| Invitation | 字段 | 含 bonusAwarded/bonusAwardedAt | 无此字段 | 🔴 高 | 待修复 |
| Order | orderNo vs orderNumber | orderNo | orderNumber | 🔴 高 | 待修复 |
| Order | 整体结构 | 扁平化(含productType等) | 含items子表 | 🔴 高 | 待修复 |
| Notification | 路径 | /notification/my | /notification | 🟡 中 | 待修复 |

### 4.2 修复优先级

1. **P0 - 阻塞性问题**: Order 结构完全不同, 需要前端重构
2. **P1 - 高优先级**: BlackCard.status, Invitation, PointType 枚举不一致
3. **P2 - 中优先级**: Notification路径, TaskType枚举

---

## 5. 非功能性需求

### 5.1 性能要求

| 指标 | 要求 | 实现方案 |
|------|------|----------|
| API响应时间 | P95 < 200ms | Redis缓存 + Prisma查询优化 |
| 并发用户 | 支持1000+并发 | 连接池 + BullMQ异步 |
| 排行榜查询 | < 50ms | Redis ZSET |
| 数据库连接 | 最大20连接 | Prisma连接池配置 |

### 5.2 安全要求

| 维度 | 要求 | 实现方案 |
|------|------|----------|
| 认证 | JWT + RefreshToken双Token | passport-jwt |
| 数据加密 | 敏感字段加密存储 | bcryptjs |
| 防刷 | 设备指纹 + 频率限制 | deviceFingerprint + Redis限流 |
| SQL注入 | ORM参数化查询 | Prisma |
| XSS | 输入过滤 + 输出编码 | class-validator |

### 5.3 可靠性要求

| 指标 | 要求 |
|------|------|
| 系统可用性 | 99.5% |
| 数据持久化 | PostgreSQL WAL + 定期备份 |
| 消息可靠性 | BullMQ 重试机制 |
| 错误追踪 | 结构化日志 |

---

## 6. 部署架构

```
┌─────────────────────────────────────────────────────────┐
│                      用户层                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ 微信小程序 │  │ H5网页   │  │ KOL后台  │              │
│  │(blackcard-os)│(blackcard-os)│(blackcard-kol)│          │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘              │
│        └──────────────┼──────────────┘                  │
│                       ▼                                  │
│              ┌─────────────────┐                        │
│              │   API Gateway   │ (可选: Nginx/Kong)      │
│              └────────┬────────┘                        │
│                       ▼                                  │
│  ┌──────────────────────────────────────────────┐       │
│  │           NestJS Backend                      │       │
│  │  (blackcard-server :3000)                     │       │
│  └──────────┬──────────────────┬────────────────┘       │
│             ▼                  ▼                          │
│  ┌─────────────────┐  ┌─────────────────┐               │
│  │   PostgreSQL    │  │     Redis       │               │
│  │   :5432         │  │     :6379       │               │
│  └─────────────────┘  └─────────────────┘               │
└─────────────────────────────────────────────────────────┘
```

---

## 7. 里程碑规划

### Phase 1: 核心闭环 (当前阶段)
- [x] 后端API框架搭建
- [x] 数据库Schema设计
- [x] 认证模块
- [x] 活动/黑卡/任务/打卡基础功能
- [ ] 前后端类型对齐
- [ ] 端到端联调测试

### Phase 2: 合规增强
- [x] 商品/订单模块
- [x] 邀请模块(一级CPS)
- [x] 赛季/段位模块
- [x] 助力任务模块
- [x] 抽奖/盲盒模块
- [ ] 支付对接(微信支付)
- [ ] 物流对接

### Phase 3: 运营完善
- [ ] Admin管理后台
- [ ] KOL后台完善
- [ ] 数据报表
- [ ] 风控系统增强
- [ ] 消息推送(微信模板消息)

### Phase 4: 规模化
- [ ] 多租户支持
- [ ] 缓存优化
- [ ] CDN加速
- [ ] 监控告警
- [ ] 压力测试与调优
