# 黑卡引擎（BlackCard Engine）- 技术架构文档

> **版本**: v2.0 (合规改造版)
> **更新日期**: 2026-04-16
> **文档类型**: 技术架构与实现指南

---

## 1. 架构总览

### 1.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                         黑卡引擎系统架构                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ blackcard-os │  │blackcard-kol │  │blackcard-admin│               │
│  │  (Taro/React)│  │ (Next.js)    │  │  (Next.js)    │              │
│  │  微信小程序   │  │  KOL管理后台  │  │  平台管理后台  │              │
│  │  + H5        │  │              │  │              │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
│         └─────────────────┼─────────────────┘                       │
│                           ▼                                         │
│              ┌─────────────────────────┐                            │
│              │      API Layer          │                            │
│              │   RESTful JSON API      │                            │
│              │     Port: 3000          │                            │
│              └────────────┬────────────┘                            │
│                           ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │                    NestJS Backend                          │       │
│  │              (blackcard-server)                            │       │
│  │  ┌─────────────────────────────────────────────────────┐  │       │
│  │  │                  Application Core                   │  │       │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐ │  │       │
│  │  │  │Controllers│ │ Services │ │ DTOs    │ │ Guards   │ │  │       │
│  │  │  └─────────┘ └─────────┘ └─────────┘ └──────────┘ │  │       │
│  │  ├─────────────────────────────────────────────────────┤  │       │
│  │  │                Business Modules                     │  │       │
│  │  │  Auth Activity BlackCard Task Checkin Points         │  │       │
│  │  │  Leaderboard Product Order Invitation Season         │  │       │
│  │  │  Assist Lottery KOL Notification                    │  │       │
│  │  ├─────────────────────────────────────────────────────┤  │       │
│  │  │              Infrastructure Layer                   │  │       │
│  │  │  ┌──────────┐ ┌──────────┐ ┌─────────────────────┐ │  │       │
│  │  │  │Prisma ORM│ │ Redis    │ │ BullMQ Queue        │ │  │       │
│  │  │  │(PostgreSQL)│ │(Cache+Queue)│(Async Processing) │ │  │       │
│  │  │  └──────────┘ └──────────┘ └─────────────────────┘ │  │       │
│  │  └─────────────────────────────────────────────────────┘  │       │
│  └──────────────────────────────────────────────────────────┘       │
│                           │                                         │
│            ┌──────────────┴──────────────┐                          │
│            ▼                             ▼                          │
│  ┌─────────────────┐           ┌─────────────────┐                 │
│  │   PostgreSQL    │           │     Redis       │                 │
│  │   v15           │           │   v7           │                 │
│  │  (主数据存储)    │           │ (缓存/排行榜/队列)│                 │
│  └─────────────────┘           └─────────────────┘                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 架构分层

```
┌─────────────────────────────────────────┐
│           Presentation Layer             │  Controllers + DTOs
├─────────────────────────────────────────┤
│            Business Layer                │  Services (核心业务逻辑)
├─────────────────────────────────────────┤
│         Infrastructure Layer             │  Prisma / Redis / Queue
├─────────────────────────────────────────┤
│            Data Layer                    │  PostgreSQL / Redis
└─────────────────────────────────────────┘
```

---

## 2. 技术选型与决策依据

### 2.1 技术栈全景

| 层级 | 技术 | 版本 | 选择理由 |
|------|------|------|----------|
| **后端框架** | NestJS | ^10.3.0 | 企业级Node.js框架, 模块化架构, TypeScript原生支持 |
| **ORM** | Prisma | ^5.22.0 | 类型安全的数据库操作, 自动生成Client, 迁移管理 |
| **数据库** | PostgreSQL | 15 | ACID事务, JSON支持, 强大的查询能力 |
| **缓存** | Redis (ioredis) | ^5.4.1 | 排行榜(ZSET), 缓存, 消息队列 |
| **任务队列** | BullMQ | ^5.7.0 | 基于Redis的可靠任务队列, 支持重试和延迟 |
| **认证** | Passport + JWT | ^10.2.0 | 成熟的认证方案, JWT无状态鉴权 |
| **验证** | class-validator | ^0.14.1 | 声明式DTO验证, 自动管道集成 |
| **前端-粉丝端** | Taro + React | 3.x | 一套代码编译到微信小程序/H5 |
| **前端-KOL端** | Next.js | 14.x | SSR支持, React生态, 后台管理系统 |
| **前端-管理端** | Next.js | 14.x | 同上, 共用技术栈降低维护成本 |
| **包管理** | pnpm | 10.x | Monorepo原生支持, 节省磁盘空间 |
| **构建工具** | Turborepo | - | Monorepo增量构建, 任务编排 |

### 2.2 关键技术决策记录 (ADR)

#### ADR-001: 选择 NestJS 而非 Express/Koa/Fastify

**决策**: 使用 NestJS 作为后端框架

**背景**:
- 项目需要14个以上业务模块，模块间有清晰的依赖关系
- 需要依赖注入、装饰器、Guard等企业级特性
- 团队熟悉 Angular 风格的架构模式

**选项对比**:
| 框架 | 模块化 | DI | 学习曲线 | 生态 |
|------|--------|-----|----------|------|
| Express | 手动 | 无 | 低 | 最丰富 |
| Koa | 手动 | 无 | 低 | 中等 |
| Fastify | 插件 | 无 | 中 | 好 |
| **NestJS** | **内置** | **内置** | **中高** | **丰富** |

**结论**: NestJS 的模块化架构完美匹配项目的多模块需求。虽然学习曲线稍高，但长期维护收益明显。

---

#### ADR-002: 选择 Prisma 而非 TypeORM/Drizzle

**决策**: 使用 Prisma 作为 ORM

**背景**:
- 需要类型安全的数据库操作
- 需要可视化的 Schema 管理
- 需要简单的迁移工作流

**选项对比**:
| ORM | 类型安全 | Schema定义 | 迁移 | 性能 |
|-----|----------|------------|------|------|
| TypeORM | 中等 | 装饰器 | 复杂 | 好 |
| Drizzle | 最好 | SQL-like | 手动 | 最好 |
| **Prisma** | **好** | **DSL** | **自动** | **好** |

**结论**: Prisma 的 Schema DSL 让数据模型一目了然，自动迁移极大提升开发效率。TypeScript 类型自动生成减少了大量手动类型定义工作。

---

#### ADR-003: 选择 Redis Sorted Set 实现排行榜

**决策**: 使用 Redis ZSET 存储和维护实时排行榜

**背景**:
- 排行榜需要毫秒级读取
- 频繁的分数更新操作
- 需要 "我的排名"、"附近排名" 等复杂查询

**技术方案**:
```
Key格式: leaderboard:{activityId}
Member: userId
Score: totalPoints
操作:
  - ZINCRBY: 更新分数
  - ZREVRANGE: Top N
  - ZREVRANK: 我的排名
  - ZRANGE: 附近排名
```

**替代方案评估**:
| 方案 | 读取性能 | 写入性能 | 实时性 | 复杂度 |
|------|----------|----------|--------|--------|
| 数据库 ORDER BY | 差 | - | 差 | 低 |
| 内存缓存+DB | 中 | 中 | 中 | 高 |
| **Redis ZSET** | **优** | **优** | **最优** | **中** |

**结论**: Redis ZSET 天然适合排行榜场景，O(log N)的插入和排序性能完全满足需求。

---

#### ADR-004: 选择 BullMQ 处理异步积分任务

**决策**: 使用 BullMQ 处理积分发放、通知发送等异步任务

**背景**:
- 积分变动需要同时更新数据库和Redis
- 需要保证不丢失、不重复
- 高峰期可能有大量并发任务

**为什么不用直接同步处理**:
1. 积分计算可能涉及复杂逻辑（连击加成、段位加成等）
2. 需要重试机制防止数据库写入失败
3. 解耦主请求流程，提升API响应速度

**BullMQ vs 其他方案**:
| 特性 | BullMQ | RabbitMQ | Kafka |
|------|--------|----------|-------|
| 部署复杂度 | 低(Redis) | 高 | 高 |
| 消息可靠性 | 高 | 最高 | 最高 |
| 适用场景 | 任务队列 | 消息总线 | 流处理 |
| **我们的需求** | ✅ 匹配 | 过重 | 过重 |

---

## 3. 项目结构详解

### 3.1 目录结构

```
blackcard-server/
├── prisma/
│   ├── schema.prisma          # 数据模型定义 (核心)
│   ├── migrations/            # 数据库迁移文件
│   └── seed.ts                # 种子数据
├── src/
│   ├── main.ts                # 应用入口
│   ├── app.module.ts          # 根模块 (注册所有子模块)
│   ├── app.controller.ts      # 根控制器 (健康检查)
│   ├── app.service.ts         # 根服务
│   │
│   ├── common/                # 公共组件
│   │   ├── config/
│   │   │   └── prisma.service.ts    # Prisma客户端封装
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts    # JWT认证守卫
│   │   │   └── jwt.strategy.ts      # JWT策略
│   │   └── decorators/
│   │       └── current-user.decorator.ts  # 当前用户注入
│   │
│   ├── services/              # 基础设施服务
│   │   ├── redis/
│   │   │   └── redis.service.ts      # Redis客户端
│   │   └── queue/
│   │       └── queue.service.ts      # BullMQ队列
│   │
│   └── modules/               # 业务模块 (每个模块独立)
│       ├── auth/              # 认证授权
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   └── dto/auth.dto.ts
│       ├── activity/          # 活动管理
│       ├── blackcard/         # 黑卡体系
│       ├── task/              # 任务系统
│       ├── checkin/           # 打卡模块
│       ├── points/            # 积分模块
│       ├── leaderboard/       # 排行榜
│       ├── product/           # 商品模块
│       ├── order/             # 订单模块
│       ├── invitation/        # 邀请模块
│       ├── season/            # 赛季模块
│       ├── assist/            # 助力模块
│       ├── lottery/           # 抽奖模块
│       ├── kol/               # KOL管理
│       └── notification/      # 通知模块
│
├── .env                       # 环境变量
├── nest-cli.json              # NestJS配置
├── tsconfig.json              # TypeScript配置
└── package.json
```

### 3.2 模块依赖关系图

```
                    ┌─────────────┐
                    │   AppModule │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
  ┌──────────┐      ┌──────────┐      ┌──────────┐
  │ AuthModule│      │KOLModule │      │Activity  │
  └────┬─────┘      └────┬─────┘      │ Module   │
       │                 │            └────┬─────┘
       ▼                 ▼                 │
  ┌──────────┐      ┌──────────┐          │
  │BlackCard │◄─────┤          │          │
  │ Module   │      │          │◄─────────┘
  └────┬─────┘      │          │
       │            │          │
       ▼            │          │
  ┌──────────┐      │          │
  │Checkin   │      │          │
  │ Module   │      │          │
  └────┬─────┘      │          │
       │            │          │
       ▼            │          │
  ┌──────────┐      │    ┌─────┴─────┐
  │  Task    │      │    │  Season   │
  │  Module   │─────┼───▶│  Module   │
  └────┬─────┘      │    └──────────┘
       │            │
       ▼            │
  ┌──────────┐      │
  │  Points  │◄─────┘
  │  Module   │
  └────┬─────┘
       │
       ├──────────────┐
       ▼              ▼
  ┌──────────┐  ┌──────────┐
  │Leaderboard│ │Lottery   │
  │ Module   │ │ Module   │
  └──────────┘ └────┬─────┘
                     │
       ┌─────────────┼─────────────┐
       ▼             ▼             ▼
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │Product   │ │ Order    │ │Invitation│
  │ Module   │ │ Module   │ │ Module   │
  └──────────┘ └────┬─────┘ └────┬─────┘
                    │            │
                    ▼            ▼
               ┌──────────┐ ┌──────────┐
               │ Assist   │ │Notification│
               │ Module   │ │ Module   │
               └──────────┘ └──────────┘
```

### 3.3 核心基础设施服务

#### 3.3.1 PrismaService

```typescript
// src/common/config/prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

**设计要点**:
- 继承 `PrismaClient` 并添加 `OnModuleInit` 生命周期钩子
- 全局注册为 Provider (`AppModule.providers`)
- 所有模块通过注入使用同一个连接池实例
- 连接池默认配置: 最大10个连接

#### 3.3.2 RedisService

```typescript
@Injectable()
export class RedisService {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
  }

  // 排行榜操作
  async zincrby(key: string, increment: number, member: string): Promise<number>
  async zrevrange(key: string, start: number, stop: number, withScores?: boolean): Promise<string[]>
  async zrevrank(key: string, member: string): Promise<number | null>
  async zscore(key: string, member: string): Promise<number | null>
  async zcard(key: string): Promise<number>

  // 缓存操作
  async get(key: string): Promise<string | null>
  async set(key: string, value: string, ex?: number): Promise<void>
  async del(key: string): Promise<void>

  // 分布式锁
  async setnx(key: string, value: string, ex: number): Promise<boolean>
}
```

**Redis Key 设计规范**:

| 用途 | Key模式 | 示例 |
|------|---------|------|
| 排行榜 | `leaderboard:{activityId}` | `leaderboard:abc123` |
| 用户Session | `session:{userId}` | `session:user_123` |
| 限流计数 | `ratelimit:{userId}:{action}` | `ratelimit:user_123:login` |
| 分布式锁 | `lock:{resource}:{id}` | `lock:blackcard:apply_456` |
| 缓存 | `cache:{entity}:{id}` | `cache:activity:abc123` |

#### 3.3.3 QueueService (BullMQ)

```typescript
@Injectable()
export class QueueService {
  private pointQueue: Queue;

  constructor() {
    this.pointQueue = new Queue('point-processing', {
      connection: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
      },
    });

    const worker = new Worker('point-processing', this.processPointJob.bind(this), {
      connection: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
      },
      concurrency: 5,
    });
  }

  async addPointJob(data: PointJobData) {
    await this.pointQueue.add('process-point', data);
  }

  private async processPointJob(job: Job<PointJobData>) {
    const { userId, blackCardId, type, amount, source, sourceId, description } = job.data;

    // 1. 更新数据库 - 创建流水记录
    const ledger = await prisma.pointLedger.create({
      data: { userId, blackCardId, type, amount, balance: newBalance, source, sourceId, description },
    });

    // 2. 更新黑卡总积分
    await prisma.blackCard.update({
      where: { id: blackCardId },
      data: { totalPoints: { increment: amount } },
    });

    // 3. 同步Redis排行榜
    if (activityId) {
      await redis.zincrby(`leaderboard:${activityId}`, amount, userId);
    }
  }
}
```

**任务类型定义**:

```typescript
interface PointJobData {
  userId: string;
  blackCardId?: string;
  activityId?: string;
  type: PointType;
  amount: number;           // 正数=增加, 负数=减少
  source: string;           // 来源标识
  sourceId?: string;        // 关联ID
  description?: string;     // 描述
}

interface NotificationJobData {
  userId: string;
  title: string;
  content: string;
  type: NotificationType;
  relatedId?: string;
  metadata?: Json;
}
```

---

## 4. 数据模型深度解析

### 4.1 ER关系图 (核心实体)

```
User ──1:1── KOL
 │
 ├──1:N── BlackCard ──N:1── Activity ──1:N── Season
 │    │                      │              │
 │    ├──1:N── PointLedger    ├──1:N── Task   ├──1:N── SeasonRank
 │    ├──1:N── TaskSubmission │              │
 │    └──1:N── SeasonRank    ├──1:N── AssistTask
 │                           │      │
 ├──1:N── Order              └──1:N── LotteryPool
 │    │                              │
 │    └──1:N── OrderItem              ├──1:N── LotteryPrize
 │                                   │
 ├──1:N── Invitation (as Inviter)    └──1:N── LotteryDraw
 ├──1:N── Invitation (as Invitee)
 │
 ├──1:N── DailyCheckin
 ├──1:N── Notification
 ├──1:N── RiskRecord
 ├──1:N── AssistTask (as Initiator)
 ├──1:N── AssistRecord (as Helper)
 └──1:N── LotteryDraw

Product ──N:1── KOL
OrderItem ──N:1── Product
OrderItem ──N:1── Order
AssistRecord ──N:1── AssistTask
LotteryDraw ──N:1── LotteryPrize
LotteryPrize ──N:1── LotteryPool
```

### 4.2 关键索引策略

```prisma
model User {
  @@index([openid])        // 微信登录快速查找
  @@index([phone])         // 手机登录快速查找
  @@index([status])        // 状态筛选
}

model BlackCard {
  @@unique([userId, activityId])  // 用户活动唯一性约束
  @@index([userId])        // 查询用户的所有黑卡
  @@index([activityId])    // 查询活动的所有黑卡
  @@index([status])        // 状态筛选
  @@index([totalPoints])   // 排名查询 (备用)
}

model TaskSubmission {
  @@index([taskId])        // 按任务查提交
  @@index([userId])        // 查用户的提交
  @@index([blackCardId])   // 按黑卡查提交
  @@index([status])        // 待审核列表
  @@index([createdAt])     // 时间范围查询
}

model PointLedger {
  @@index([userId])        // 用户流水查询
  @@index([blackCardId])   // 黑卡流水查询
  @@index([type])          // 按类型筛选
  @@index([createdAt])     // 时间范围查询
}

model Order {
  @@index([userId])        // 用户订单
  @@index([status])        // 状态筛选
  @@index([createdAt])     // 时间范围查询
}
```

### 4.3 JSON字段使用规范

| 模型 | 字段 | 用途 | 结构示例 |
|------|------|------|----------|
| Season | demotionRules | 降级规则配置 | `{demotionThresholds:[15000,5000,2000,500,0], tierMapping:["DIAMOND","PLATINUM","GOLD","SILVER","BRONZE"]}` |
| Task | verificationConfig | 验证配置 | `{ocrTemplate:"xxx", targetUrl:"https://..."}` |
| Notification | metadata | 扩展数据 | `{points:100, taskId:"xxx"}` |
| RiskRecord | metadata | 风险详情 | `{ip:"1.2.3.4", action:"rapid_login"}` |
| SystemConfig | value | 配置值 | 任意JSON |

---

## 5. 核心业务流程

### 5.1 用户注册/登录流程

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  前端    │     │AuthCtrl │     │AuthSvc  │     │ WeChat  │
│(小程序)  │     │         │     │         │     │  API    │
└────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘
     │               │               │               │
     │ wx.login()    │               │               │
     │──────────────▶│               │               │
     │ {code}        │               │               │
     │               │               │               │
     │               │ wechatLogin() │               │
     │               │──────────────▶│               │
     │               │               │               │
     │               │               │ code2session()│
     │               │               │──────────────▶│
     │               │               │               │
     │               │               │ {openid,...}  │
     │               │               │◀──────────────│
     │               │               │               │
     │               │  findOrCreate │               │
     │               │  User()       │               │
     │               │               │               │
     │               │  signJWT()    │               │
     │               │               │               │
     │               │◀──────────────│               │
     │               │               │               │
     │ {token,user}  │               │               │
     │◀──────────────│               │               │
     │               │               │               │
     ▼               ▼               ▼               ▼
```

**关键代码路径**:
```typescript
async wechatLogin(dto: WechatLoginDto) {
  // 1. 用code换取openid
  const { openid, unionid } = await this.wechatService.code2Session(dto.code);

  // 2. 查找或创建用户
  let user = await this.prisma.user.findUnique({ where: { openid } });
  if (!user) {
    user = await this.prisma.user.create({
      data: { openid, unionId: unionid },
    });
  }

  // 3. 更新最后登录时间
  await this.prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // 4. 生成JWT Token
  const tokens = this.generateTokens(user);

  return { ...tokens, user: this.sanitizeUser(user) };
}
```

### 5.2 打卡→黑卡资格流程

```
用户点击打卡
     │
     ▼
┌─────────────┐
│ 检查今日是否  │──是──▶ 返回"已打卡"
│ 已打卡       │
└──────┬──────┘
       │否
       ▼
┌─────────────┐     ┌──────────────┐
│ 创建Daily    │────▶│ 计算连续天数  │
│ Checkin记录  │     │ (查昨天记录)  │
└──────┬──────┘     └──────┬───────┘
       │                   │
       ▼                   ▼
┌─────────────┐     ┌──────────────┐
│ 计算积分奖励 │     │ 判断是否达标  │
│ (阶梯规则)   │     │ (>=qualDays?)│
└──────┬──────┘     └──────┬───────┘
       │                   │
       ▼                   │是
┌─────────────┐           ▼
│ 异步入账积分 │    ┌──────────────┐
│ (QueueSvc)  │    │ 创建BlackCard │
└──────┬──────┘    │ status=ACTIVE │
       │           └──────┬───────┘
       │                  │
       ▼                  ▼
┌─────────────┐    ┌──────────────┐
│ 发送通知     │    │ 发送获得通知  │
│ "打卡成功"   │    │ "恭喜获得黑卡"│
└─────────────┘    └──────────────┘
```

**阶梯积分算法**:
```typescript
function calculateCheckinPoints(consecutiveDays: number): number {
  if (consecutiveDays <= 3) return 5;
  if (consecutiveDays <= 7) return 10;
  if (consecutiveDays <= 14) return 15;
  if (consecutiveDays <= 30) return 20;
  return 25;
}
```

### 5.3 任务提交流程

```
粉丝提交任务
     │
     ▼
┌─────────────┐
│ 参数校验     │──失败──▶ 400错误
│ (DTO验证)    │
└──────┬──────┘
       │通过
       ▼
┌─────────────┐     ┌──────────────┐
│ 检查每日限制  │──超限──▶ 403错误
│ (dailyLimit) │
└──────┬──────┘
       │未超限
       ▼
┌─────────────┐     ┌──────────────┐
│ 检查黑卡状态  │──无效──▶ 403错误
│ (ACTIVE?)    │
└──────┬──────┘
       │有效
       ▼
┌─────────────┐
│ 创建TaskSub  │
│ mission记录  │
│ status=PENDING│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 返回提交成功  │
│ (异步等待审核)│
└─────────────┘
       │
       │  (KOL在后台审核)
       │
       ▼
┌─────────────────────────────┐
│ KOL审核通过                  │
│ status → APPROVED           │
│ pointsAwarded = task.points  │
│                             │
│ → QueueService.addPointJob() │
│ → 异步入账积分               │
│ → 发送通知给粉丝             │
└─────────────────────────────┘
```

### 5.4 商品购买流程 (合规交易模型)

```
粉丝浏览商品
     │
     ▼
┌─────────────┐
│ 选择商品     │
│ 加入购物车   │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐
│ 创建订单     │──库存不足──▶ 错误提示
│ (Order+Items)│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 调起微信支付  │
│ (预留接口)   │
└──────┬──────┘
       │支付成功
       ▼
┌─────────────────────────────────────────┐
│ 订单状态: PAID                          │
│                                         │
│ 1. 扣减商品库存                          │
│ 2. 记录支付信息(paidAt)                  │
│ 3. 异步发放bonusPoints (如果配置了)       │
│ 4. 发送订单确认通知                      │
│ 5. 通知KOL有新订单待发货                  │
└─────────────────────────────────────────┘
       │
       ▼
┌─────────────┐
│ KOL填写物流   │
│ trackingNo   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 订单状态: SHIPPED                        │
│ 发送发货通知给粉丝                        │
└─────────────┘
       │
       ▼
┌─────────────┐
│ 粉丝确认收货   │
│ (或自动确认)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 订单状态: COMPLETED                     │
│ 交易完成 ✓                              │
└─────────────┘
```

### 5.5 一级邀请流程 (合规CPS)

```
A分享链接给B
     │
     ▼
┌─────────────┐     ┌──────────────┐
│ B点击链接    │──已注册──▶ 不创建邀请关系
│ (带inviterId)│           (去重)
└──────┬──────┘
       │新用户
       ▼
┌─────────────┐
│ B完成注册    │
│ (微信/手机)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 创建Invitation│
│ inviterId=A  │
│ inviteeId=B  │
│ status=PENDING│
└──────┬──────┘
       │
       │  (B后续完成有效操作)
       │
       ▼
┌─────────────────────────────┐
│ B首次打卡/完成任务            │
│                               │
│ Invitation.status=COMPLETED  │
│ bonusPoints → A的账户         │
│ (只有A拿到奖励!)              │
│                               │
│ ⚠️ 如果B再邀请C:             │
│   C做任务 → B拿奖励           │
│   A拿不到! (一级限制)         │
└─────────────────────────────┘
```

### 5.6 赛季结算流程 (降级而非淘汰)

```
赛季到期触发结算
     │
     ▼
┌─────────────────────────────────────────┐
│ 1. 查询所有活跃黑卡的最终积分             │
│    SELECT * FROM BlackCard              │
│    WHERE activityId=? AND status=ACTIVE │
│    ORDER BY totalPoints DESC            │
│                                         │
│ 2. 按排名应用降级规则                    │
│    rank 1%   → DIAMOND (保持)           │
│    rank 5%   → PLATINUM                 │
│    rank 15%  → GOLD                     │
│    rank 30%  → SILVER                   │
│    其余      → BRONZE                   │
│                                         │
│ 3. 写入SeasonRank历史记录               │
│                                         │
│ 4. 更新每个BlackCard.tier               │
│                                         │
│ 5. 可选: 清零/部分扣除积分              │
│    (SEASON_RESET类型的积分变动)          │
│                                         │
│ 6. Season.status = FINISHED             │
└─────────────────────────────────────────┘
```

### 5.7 抽奖流程 (概率盲盒)

```
用户发起抽奖
     │
     ▼
┌─────────────┐     ┌──────────────┐
│ 检查积分余额  │──不足──▶ 400错误
│ >= costPoints│
└──────┬──────┘
       │充足
       ▼
┌─────────────┐
│ 预扣积分     │
│ (乐观锁)     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│ 概率抽奖算法                      │
│                                  │
│ prizes = [                       │
│   {name:"iPhone", p:0.01},      │
│   {name:"签名照", p:0.05},      │
│   {name:"优惠券", p:0.20},      │
│   {name:"谢谢参与", p:0.74},    │
│ ]                                │
│                                  │
│ random = random() * 1.0         │
│ 累减概率, 第一个 <= random 的奖品  │
│ 就是结果                          │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ 创建LotteryDraw记录              │
│ status = COMPLETED              │
│ prizeId = 中奖奖品ID            │
│                                  │
│ 扣减奖品库存                     │
│ remainingStock--                │
│                                  │
│ 确认扣除积分                     │
│ LOTTERY_COST 入账                │
│                                  │
│ 如果中奖:                        │
│   LOTTERY_WIN 入账(+0)          │
│   发送中奖通知                   │
│   status = PENDING (待领取)      │
└─────────────────────────────────┘
```

---

## 6. API路由完整清单

### 6.1 已实现的API路由 (共60+个)

#### Auth (认证)
| Method | Path | Guard | Description |
|--------|------|-------|-------------|
| POST | `/auth/wechat/login` | No | 微信登录 |
| POST | `/auth/phone/login` | No | 手机号登录 |
| POST | `/auth/sms/send` | No | 发送短信验证码 |
| POST | `/auth/refresh` | No | 刷新Token |
| POST | `/auth/logout` | Yes | 登出 |
| GET | `/auth/profile` | Yes | 获取个人信息 |
| PATCH | `/auth/profile` | Yes | 更新个人信息 |

#### Activity (活动)
| Method | Path | Guard | Role | Description |
|--------|------|-------|------|-------------|
| POST | `/activity` | Yes | KOL | 创建活动 |
| GET | `/activity/my` | Yes | KOL | 我的活动列表 |
| GET | `/activity/public` | No | - | 公开活动列表 |
| GET | `/activity/:id` | No | - | 活动详情 |
| PATCH | `/activity/:id` | Yes | KOL | 更新活动 |
| POST | `/activity/:id/publish` | Yes | KOL | 发布活动 |
| GET | `/activity/:id/stats` | No | - | 活动统计 |

#### BlackCard (黑卡)
| Method | Path | Guard | Description |
|--------|------|-------|-------------|
| POST | `/blackcard/apply` | Yes | 申请黑卡 |
| GET | `/blackcard/my` | Yes | 我的黑卡列表 |
| GET | `/blackcard/:id` | Yes | 黑卡详情 |

#### Task (任务)
| Method | Path | Guard | Role | Description |
|--------|------|-------|------|-------------|
| POST | `/task` | Yes | KOL | 创建任务 |
| GET | `/task/activity/:activityId` | No | - | 活动任务列表 |
| GET | `/task/:id` | No | - | 任务详情 |
| POST | `/task/submit` | Yes | FAN | 提交任务 |
| GET | `/task/submissions/my` | Yes | FAN | 我的提交 |
| PATCH | `/task/submission/:id/review` | Yes | KOL | 审核提交 |

#### Checkin (打卡)
| Method | Path | Guard | Description |
|--------|------|-------|-------------|
| POST | `/checkin` | Yes | 每日打卡 |
| GET | `/checkin/my/:activityId` | Yes | 打卡历史 |
| GET | `/checkin/today/:activityId` | Yes | 今日状态 |

#### Points (积分)
| Method | Path | Guard | Description |
|--------|------|-------|-------------|
| GET | `/points/balance/:blackCardId` | Yes | 查询余额 |
| GET | `/points/ledger` | Yes | 积分流水 |
| GET | `/points/ledger/:blackCardId` | Yes | 黑卡流水 |

#### Leaderboard (排行榜)
| Method | Path | Guard | Description |
|--------|------|-------|-------------|
| GET | `/leaderboard/:activityId/top` | No | Top N排行 |
| GET | `/leaderboard/:activityId/me` | Yes | 我的排名 |
| GET | `/leaderboard/:activityId/around-me` | Yes | 我附近排行 |

#### Product (商品)
| Method | Path | Guard | Role | Description |
|--------|------|-------|------|-------------|
| POST | `/product` | Yes | KOL | 创建商品 |
| GET | `/product/public` | No | - | 公开商品列表 |
| GET | `/product` | Yes | KOL | 我的商品 |
| GET | `/product/:id` | No | - | 商品详情 |
| PATCH | `/product/:id` | Yes | KOL | 更新商品 |

#### Order (订单)
| Method | Path | Guard | Role | Description |
|--------|------|-------|------|-------------|
| POST | `/order` | Yes | FAN | 创建订单 |
| GET | `/order/my` | Yes | FAN | 我的订单 |
| GET | `/order/:id` | Yes | FAN | 订单详情 |
| POST | `/order/:id/pay` | Yes | FAN | 支付订单 |
| POST | `/order/:id/ship` | Yes | KOL | 发货 |
| POST | `/order/:id/confirm` | Yes | FAN | 确认收货 |
| POST | `/order/:id/cancel` | Yes | FAN | 取消订单 |

#### Invitation (邀请)
| Method | Path | Guard | Description |
|--------|------|-------|-------------|
| POST | `/invitation` | Yes | 创建邀请 |
| GET | `/invitation/my` | Yes | 我的邀请 |
| GET | `/invitation/stats` | Yes | 邀请统计 |

#### Season (赛季)
| Method | Path | Guard | Role | Description |
|--------|------|-------|------|-------------|
| POST | `/season` | Yes | KOL/ADMIN | 创建赛季 |
| GET | `/season/activity/:activityId` | No | - | 活动赛季列表 |
| GET | `/season/current/:activityId` | No | - | 当前赛季 |
| POST | `/season/:id/start` | Yes | KOL/ADMIN | 启动赛季 |
| POST | `/season/:id/settle` | Yes | KOL/ADMIN | 结算赛季 |
| GET | `/season/:id/my-rank` | Yes | 我的赛季排名 |

#### Assist (助力)
| Method | Path | Guard | Description |
|--------|------|-------|-------------|
| POST | `/assist/task` | Yes | 发起助力 |
| POST | `/assist/help/:taskId` | Yes | 帮助助力 |
| GET | `/assist/task/:taskId` | No | 助力详情 |
| GET | `/assist/my-tasks` | Yes | 我的任务 |
| GET | `/assist/my-records` | Yes | 我的记录 |

#### Lottery (抽奖)
| Method | Path | Guard | Role | Description |
|--------|------|-------|------|-------------|
| POST | `/lottery/pool` | Yes | KOL | 创建奖池 |
| POST | `/lottery/pool/:poolId/prize` | Yes | KOL | 添加奖品 |
| GET | `/lottery/pools` | No | - | 奖池列表 |
| GET | `/lottery/pool/:poolId` | No | - | 奖池详情 |
| POST | `/lottery/draw/:poolId` | Yes | FAN | 抽奖 |
| GET | `/lottery/my-draws` | Yes | FAN | 我的抽奖记录 |
| POST | `/lottery/claim/:drawId` | Yes | FAN | 领取奖品 |

#### KOL
| Method | Path | Guard | Description |
|--------|------|-------|-------------|
| GET | `/kol/profile` | Yes | KOL资料 |
| PATCH | `/kol/profile` | Yes | 更新资料 |
| GET | `/kol/dashboard` | Yes | 数据面板 |
| GET | `/kol/public` | No | 公开信息 |
| GET | `/kol/:id` | No | KOL详情 |

#### Notification (通知)
| Method | Path | Guard | Description |
|--------|------|-------|-------------|
| GET | `/notification` | Yes | 通知列表 |
| GET | `/notification/unread-count` | Yes | 未读数 |
| POST | `/notification/:id/read` | Yes | 标记已读 |
| POST | `/notification/read-all` | Yes | 全部已读 |

---

## 7. 已解决的技术挑战

### 7.1 Challenge-001: NestJS依赖注入循环依赖

**问题**: PointsModule 需要 RedisService (用于排行榜), 但 RedisService 在全局注册时可能导致循环引用。

**解决方案**:
```typescript
// 方案: 将 RedisService 直接在需要的 Module providers 中声明
@Module({
  imports: [],
  controllers: [PointsController],
  providers: [PointsService, RedisService],  // 直接声明
})
export class PointsModule {}
```

**经验教训**: NestJS 的全局模块机制虽然方便，但在跨模块共享服务时要小心循环依赖。对于基础设施服务，推荐在消费者模块中直接声明 provider。

---

### 7.2 Challenge-002: BullMQ连接冲突

**问题**: BullMQ 的 Worker 和 Queue 不能共享同一个 Redis 连接实例。

**错误信息**: `Worker requires a connection`

**根因分析**:
```javascript
// ❌ 错误做法 - 共享连接
const redis = new Redis({...});
const queue = new Queue('test', { connection: redis });  // 占用连接
const worker = new Worker('test', processor, { connection: redis });  // 冲突!
```

**解决方案**:
```typescript
// ✅ 正确做法 - 各自创建连接
@Injectable()
export class QueueService {
  private pointQueue: Queue;

  constructor() {
    // Queue 和 Worker 分别创建独立的 Redis 连接配置
    this.pointQueue = new Queue('point-processing', {
      connection: { host: REDIS_HOST, port: REDIS_PORT },
    });

    const worker = new Worker('point-processing', this.processPointJob.bind(this), {
      connection: { host: REDIS_HOST, port: REDIS_PORT },  // 新连接!
      concurrency: 5,
    });
  }
}
```

---

### 7.3 Challenge-003: TypeScript数组类型推断为never

**问题**: 使用 `const arr = []` 然后 `arr.push(...)` 时，TypeScript推断数组类型为 `never[]`。

**错误信息**:
```
error TS2345: Argument of type '{ rank: number; ... }' is not assignable to parameter of type 'never'.
```

**原因**: 空数组字面量 `[]` 的类型被推断为 `never[]`, 因为无法从上下文推断元素类型。

**解决方案**:
```typescript
// ❌ 错误
const entries = [];
entries.push({ rank: 1, userId: 'a', score: 100 });  // TS Error!

// ✅ 正确 - 显式声明类型
const entries: Array<{ rank: number; userId: string; score: number }> = [];
entries.push({ rank: 1, userId: 'a', score: 100 });  // OK
```

---

### 7.4 Challenge-004: pnpm workspace协议兼容性

**问题**: monorepo 根目录的 `package.json` 可能包含 `workspace:*` 协议的依赖声明，导致 npm install 失败。

**错误信息**:
```
npm error EUNSUPPORTEDPROTOCOL
npm error Unsupported URL Type "workspace:": workspace:*
```

**解决方案**:
- 使用 `pnpm install` 替代 `npm install`
- 或者在子项目中使用独立安装: `pnpm install --filter @idea-turbo/blackcard-server`

---

### 7.5 Challenge-005: Prisma Schema枚举变更的数据迁移风险

**问题**: 当修改枚举值（如删除某个枚举选项），如果数据库中已有该值的记录，迁移会失败。

**警告示例**:
```
⚠️ There might be data loss when applying the changes:
  • The values [REVOKED] on the enum `BlackCardStatus` will be removed.
```

**解决方案**:
1. 开发阶段: 使用 `prisma db push --force-reset` (会清空数据!)
2. 生产环境: 先编写数据迁移脚本清理旧数据，再执行 schema 变更
3. 最佳实践: 枚举只增加新值，不删除旧值（标记为 deprecated 即可）

---

### 7.6 Challenge-006: 前后端类型不一致

**问题**: 前端 TypeScript 接口定义与后端 Prisma Schema / DTO 定义存在多处不一致。

**影响范围**:
- `BlackCardStatus`: 前端含 `REVOKED`，后端无
- `PointType`: 前端含 `PURCHASE`，后端为 `PURCHASE_BONUS`
- `InvitationStatus`: 前端4种状态，后端2种
- `Order`: 前端扁平结构，后端 items 子表结构
- `Notification` API路径不同

**修复计划**:
1. **以Schema为准**: 后端 Prisma Schema 是唯一真实数据源
2. **前端对齐**: 修改前端类型定义匹配后端
3. **DTO统一**: 确保 API响应结构与 Schema 一致
4. **自动化**: 未来考虑从 Prisma Schema 自动生成前端类型

---

## 8. 性能优化策略

### 8.1 数据库层面

| 优化项 | 策略 | 预期效果 |
|--------|------|----------|
| 连接池 | Prisma 默认 pool_size=10 | 避免连接泄漏 |
| 查询优化 | select 只取必要字段 | 减少数据传输量 |
| 批量操作 | createMany / updateMany | 减少往返次数 |
| 索引覆盖 | 为高频查询路径建索引 | O(logN) 查找 |
| 分页查询 | cursor-based pagination | 大数据集高效翻页 |

### 8.2 缓存策略

| 数据类型 | 缓存策略 | TTL | 失效方式 |
|----------|----------|-----|----------|
| 活动详情 | 主动缓存 | 5min | 活动更新时清除 |
| 商品列表 | 主动缓存 | 10min | 商品变更时清除 |
| 排行榜Top100 | Redis ZSET | 实时 | 积分变动时更新 |
| 用户Profile | 主动缓存 | 30min | 用户更新时清除 |
| KOL公开信息 | 主动缓存 | 1h | KOL更新时清除 |

### 8.3 异步处理

| 操作 | 处理方式 | 原因 |
|------|----------|------|
| 积分入账 | BullMQ Queue | 可能涉及多表操作，解耦主流程 |
| 通知发送 | BullMQ Queue | 第三方调用可能有延迟 |
| 统计数据更新 | 定时任务 | 聚合计算不需要实时 |
| 日志写入 | 异步IO | 不阻塞业务逻辑 |

---

## 9. 安全架构

### 9.1 认证安全

```
┌─────────────────────────────────────────┐
│              JWT Token 安全              │
├─────────────────────────────────────────┤
│                                          │
│  Access Token:                           │
│  - 有效期: 7天                           │
│  - 存储: 前端内存 (不持久化)              │
│  - 传输: Authorization Bearer header     │
│                                          │
│  Refresh Token:                          │
│  - 有效期: 30天                          │
│  - 存储: HttpOnly Cookie (防XSS)        │
│  - 用途: 刷新Access Token               │
│                                          │
│  Token Payload:                          │
│  {                                       │
│    sub: userId,                          │
│    role: UserRole,                       │
│    iat: timestamp,                       │
│    exp: timestamp                        │
│  }                                       │
│                                          │
└─────────────────────────────────────────┘
```

### 9.2 接口安全

| 机制 | 实现 | 防护目标 |
|------|------|----------|
| JWT Guard | `@UseGuards(JwtAuthGuard)` | 未认证访问 |
| 角色检查 | 自定义 Decorator | 权限越界 |
| 输入验证 | `class-validator` Pipe | 注入攻击 |
| 频率限制 | Redis + 中间件 | 暴力破解/DDoS |
| 设备指纹 | `deviceFingerprint` 字段 | 多账号作弊 |
| SQL注入防护 | Prisma ORM参数化 | SQL注入 |
| CORS | @nestjs/platform-express 配置 | 跨域攻击 |

### 9.3 业务安全 (风控)

| 风险场景 | 检测手段 | 处理方式 |
|----------|----------|----------|
| 刷任务 | 设备指纹聚类 + 行为频率分析 | 冻结账号 |
| 刷排行榜 | 异常积分增长检测 | 标记审查 |
| 恶意邀请 | 邀请链深度限制(仅一级) | 阻断+告警 |
| 支付欺诈 | 订单金额异常检测 | 人工审核 |
| 批量注册 | IP频率 + 手机号限制 | 封禁IP |

---

## 10. 监控与运维

### 10.1 关键指标监控

| 指标 | 告警阈值 | 监控方式 |
|------|----------|----------|
| API响应时间 P95 | > 500ms | APM (如Sentry/Datadog) |
| 错误率 | > 1% | 日志聚合 |
| 数据库连接数 | > 80% max | Prometheus |
| Redis内存使用 | > 80% | Redis INFO |
| 队列积压 | > 1000条 | BullMQ Dashboard |

### 10.2 日志规范

```typescript
// 结构化日志格式
{
  "timestamp": "2026-04-16T20:42:37.123Z",
  "level": "info",
  "context": "AuthService",
  "message": "User login success",
  "userId": "user_123",
  "traceId": "abc-def",
  "durationMs": 45,
}
```

### 10.3 数据备份策略

| 数据 | 备份方式 | 频率 | RTO/RPO |
|------|----------|------|---------|
| PostgreSQL | pg_dump + WAL归档 | 每日全量 + 实时WAL | RTO<1h, RPO<0 |
| Redis | RDB + AOF | RDB每小时, AOF实时 | RTO<30min |
| 上传文件 | 对象存储版本控制 | 实时 | RPO=0 |

---

## 11. 前后端对齐行动计划

### 11.1 立即执行 (P0)

1. **修复 BlackCardStatus 枚举**
   - 文件: `blackcard-os/src/api/blackcard.ts`
   - 操作: 移除 `REVOKED`，保持与后端一致

2. **修复 PointType 枚举**
   - 文件: `blackcard-os/src/api/points.ts`
   - 操作: `PURCHASE` → `PURCHASE_BONUS`，补充缺失类型

3. **重构 Order 接口**
   - 文件: `blackcard-os/src/api/order.ts`
   - 操作: 从扁平结构改为 items 子表结构，`orderNo` → `orderNumber`

4. **修复 Invitation 接口**
   - 文件: `blackcard-os/src/api/invitation.ts`
   - 操作: 状态枚举改为 `PENDING | COMPLETED`，移除不存在的字段

### 11.2 短期执行 (P1)

5. **修复 TaskType 枚举**
   - 移除 `INVITE` (邀请已独立为 Invitation 模块)

6. **Notification API路径对齐**
   - `/notification/my` → `/notification` (后端从JWT获取userId)

7. **补充缺失的前端API模块**
   - assist.ts (助力模块)
   - lottery.ts (抽奖模块)
   - season.ts (赛季模块)
   - product.ts (商品模块)

### 11.3 中期规划 (P2)

8. **建立类型生成管线**
   - 从 Prisma Schema 自动生成前端 TypeScript 类型
   - 工具: `prisma generate` + 自定义代码生成器

9. **API契约测试**
   - 使用 Pact 或类似工具确保前后端接口一致性

---

## 12. 未来迭代方向

### 12.1 短期 (1-2个月)

- [ ] 微信支付对接 (JSAPI / H5支付)
- [ ] 物流查询接口对接 (快递100/菜鸟)
- [ ] 微信模板消息推送
- [ ] Admin管理后台基础功能
- [ ] KOL后台完善 (数据看板)

### 12.2 中期 (3-6个月)

- [ ] 多租户架构 (一个平台服务多个KOL)
- [ ] 消息中心增强 (站内信 + 微信服务通知)
- [ ] 数据报表系统 (BI看板)
- [ ] 风控规则引擎可视化配置
- [ ] A/B测试框架

### 12.3 长期 (6-12个月)

- [ ] 分布式部署 (多实例负载均衡)
- [ ] CDN加速静态资源
- [ ] 国际化支持 (i18n)
- [ ] 开放API平台 (第三方接入)
- [ ] AI驱动的智能任务推荐

---

## 附录A: 环境变量清单

```bash
# .env 文件模板

# === 数据库 ===
DATABASE_URL="postgresql://mac@localhost:5432/blackcard"
DIRECT_URL="postgresql://mac@localhost:5432/blackcard"

# === Redis ===
REDIS_HOST="localhost"
REDIS_PORT=6379

# === JWT ===
JWT_SECRET="your-secret-key-change-in-production"
JWT_EXPIRES_IN="7d"

# === 服务端口 ===
PORT=3000

# === 微信 (开发阶段) ===
WECHAT_APP_ID=""
WECHAT_APP_SECRET=""

# === 短信 (阿里云/腾讯云) ===
SMS_ACCESS_KEY_ID=""
SMS_ACCESS_KEY_SECRET=""
SMS_SIGN_NAME=""
SMS_TEMPLATE_CODE=""
```

## 附录B: 常用命令速查

```bash
# 安装依赖
pnpm install

# 生成 Prisma Client
pnpm prisma:generate

# 数据库同步 (开发)
pnpm prisma:push

# 数据库迁移 (生产)
pnpm prisma:migrate dev

# 启动开发服务器
pnpm start:dev

# 构建
pnpm build

# 生产启动
pnpm start:prod

# 代码检查
pnpm lint

# 测试
pnpm test
```

## 附录C: 合规自查清单

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 无入门费 | ✅ | 黑卡资格100%免费获取 |
| 无多层级分销 | ✅ | 仅支持一级CPS |
| 无保底承诺 | ✅ | 抽奖概率透明，不承诺回报 |
| 有真实商品 | ✅ | 商品模块支持实物交易 |
| 有物流记录 | ✅ | Order 模型包含 tracking 信息 |
| 数据可审计 | ✅ | PointLedger 完整流水记录 |
| 用户可申诉 | 🔄 | 待实现申诉通道 |
| 退款机制 | 🔄 | Order CANCELLED/REFUNDED 状态已定义 |
