# 自然语言排班功能说明

## 功能概述

自然语言排班功能允许用户使用日常语言描述排班需求，AI 自动解析并生成完整的排班表，然后将排班数据同步到日历中显示。

## 目录结构

```
apps/ai-calendar/
├── lib/
│   ├── services/
│   │   └── shiftService.ts          # 排班服务（核心逻辑）
│   ├── storage/
│   │   └── index.ts                  # 存储层（新增 schedules store）
│   └── stores/
│       └── calendarStore.ts          # 日历状态（新增 addEvents）
├── components/
│   ├── ShiftScheduler.tsx             # 排班 UI 组件
│   └── shiftScheduler.module.scss     # 排班组件样式
└── app/
    └── shift-demo/
        └── page.tsx                   # 排班演示页面
```

## 核心功能

### 1. ShiftService（排班服务）

位置：`lib/services/shiftService.ts`

主要方法：

| 方法 | 功能 |
|------|------|
| `generateScheduleFromNaturalLanguage()` | 用自然语言生成排班 |
| `convertShiftsToEvents()` | 排班转换为日历事件 |
| `saveGeneratedSchedule()` | 保存排班到存储 |
| `getSchedules() / getSchedule()` | 查询排班 |
| `createSchedule() / updateSchedule() / deleteSchedule()` | CRUD 操作 |

### 2. ShiftScheduler（UI 组件）

位置：`components/ShiftScheduler.tsx`

功能：
- 自然语言输入框
- 快速示例按钮
- 排班预览（员工、班次、排班表）
- 生成和保存按钮

### 3. 演示页面

访问：`/shift-demo`

包含两个标签页：
- **排班助手** - 使用 ShiftScheduler 组件
- **日历视图** - 使用 CalendarView 组件展示排班

## 使用流程

```
1. 用户输入自然语言
   ↓
2. 调用 ShiftService.generateScheduleFromNaturalLanguage()
   ↓
3. AI 解析需求，返回 JSON
   ↓
4. 转换为 ShiftSchedule 和 CalendarEvent[]
   ↓
5. 预览排班表
   ↓
6. 用户点击"保存到日历"
   ↓
7. 保存到 IndexedDB
   ↓
8. 通过事件总线通知 UI 更新
   ↓
9. 日历组件自动刷新
```

## 示例输入

### 基础排班
```
下周一到周五，张三早班，李四中班，王五晚班
```

### 轮流排班
```
本周三开始，张三和李四轮流早班和中班
```

### 周末排班
```
周末两天，安排三个人轮班，每天两个班次
```

### 复杂排班
```
下周工作日（周一到周五）：
- 张三：周一、三、五早班
- 李四：周二、四中班
- 王五：每天晚班
周末休息
```

## AI 响应格式

AI 返回的 JSON 格式：

```json
{
  "shifts": [
    {
      "date": "2024-01-15",
      "shiftTypeId": "shift-type-id",
      "employeeId": "employee-id",
      "notes": "可选备注"
    }
  ]
}
```

## 默认配置

### 默认班次类型
| 班次 | 时间 | 颜色 |
|------|------|------|
| 早班 | 08:00-16:00 | #3b82f6 |
| 中班 | 14:00-22:00 | #10b981 |
| 晚班 | 20:00-06:00 | #8b5cf6 |

### 默认员工
| 员工 | 颜色 |
|------|------|
| 张三 | #ef4444 |
| 李四 | #f59e0b |
| 王五 | #06b6d4 |

## 数据模型

### ShiftSchedule（排班表）
```typescript
{
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  employees: Employee[];
  shiftTypes: ShiftType[];
  shifts: Shift[];
  rules: ScheduleRule[];
  createdAt: Date;
  updatedAt: Date;
  generatedBy?: 'manual' | 'ai' | 'hybrid';
}
```

### Shift（单个班次）
```typescript
{
  id: string;
  scheduleId: string;
  date: Date;
  shiftTypeId: string;
  employeeId: string;
  isLocked?: boolean;
  notes?: string;
}
```

## 与 AI 服务集成

排班功能使用 `aiService` 来解析自然语言：

```typescript
import { aiService } from '@/lib/ai';

const response = await aiService.chat([
  { role: 'system', content: systemPrompt },
  { role: 'user', content: naturalLanguage },
]);
```

确保先配置好 AI Provider（参见 MULTI_LLM_PROVIDER.md）。

## 配置 AI Provider

1. 访问 `/shift-demo` 页面
2. 先配置 AI：

```typescript
import { aiConfigManager } from '@/lib/ai';

// 配置智谱 GLM
await aiConfigManager.updateProvider('glm', {
  apiKey: 'your-api-key',
});

// 设置为默认
await aiConfigManager.setDefaultProvider('glm');
```

## 自定义扩展

### 添加自定义班次类型
```typescript
const customShiftTypes: ShiftType[] = [
  {
    id: uuidv4(),
    name: '上午班',
    startTime: '09:00',
    endTime: '17:00',
    color: '#ec4899',
  },
];

await shiftService.generateScheduleFromNaturalLanguage(
  input,
  { shiftTypes: customShiftTypes }
);
```

### 添加自定义员工
```typescript
const customEmployees: Employee[] = [
  { id: uuidv4(), name: '赵六', color: '#14b8a6' },
  { id: uuidv4(), name: '钱七', color: '#8b5cf6' },
];

await shiftService.generateScheduleFromNaturalLanguage(
  input,
  { employees: customEmployees }
);
```

## 注意事项

1. **AI 配置**：使用前必须先配置好 AI Provider
2. **日期范围**：默认生成从今天开始 7 天的排班
3. **存储**：排班数据和事件都存储在 IndexedDB
4. **事件总线**：保存后通过 eventBus 通知 UI 更新

## 未来改进

- [ ] 支持自定义班次模板
- [ ] 支持排班规则（如：每人每周不超过 5 天）
- [ ] 支持排班冲突检测
- [ ] 支持导出排班表（Excel/PDF）
- [ ] 支持员工请假管理
- [ ] 支持多门店/多团队排班
