# 排班系统完整 CRUD 功能 Skill

## 概述

这是一个关于**排班系统完整增删改查（CRUD）功能**的经验总结，包含社区成熟方案、交互设计最佳实践、完整的实现方案。

## 社区成熟方案调研

### 1. DHTMLX Scheduler
**特点：**
- 成熟的企业级调度组件
- 支持拖拽、编辑、删除
- 内置资源调度
- 冲突检测和警告

**关键交互：**
- 双击事件打开编辑器
- 拖拽调整时间
- 右键菜单操作
- 快捷键支持

---

### 2. FullCalendar
**特点：**
- 高度可定制的日历组件
- 支持月/周/日视图
- 事件拖拽和调整大小
- 丰富的事件回调

**关键交互：**
- 事件点击编辑
- 空时间段点击创建
- 拖拽调整
- 实时预览

---

### 3. Schedule-X
**特点：**
- 现代轻量级调度库
- TypeScript 优先
- 无头组件架构
- 完全可定制

**关键交互：**
- 声明式 API
- 可组合的交互
- 数据驱动视图

---

## 功能架构

### 核心模块

```
ShiftManager (主管理组件)
├── ShiftList (排班计划列表)
├── ShiftScheduler (自然语言创建)
├── ShiftDetail (排班详情视图)
│   ├── ShiftInfo (排班信息卡片)
│   ├── ShiftTable (班次列表表格)
│   └── ShiftEditor (单个班次编辑器)
└── EventBus (事件总线)
```

---

## 数据结构

### ShiftSchedule（排班计划）
```typescript
interface ShiftSchedule {
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
interface Shift {
  id: string;
  scheduleId: string;
  date: Date;
  shiftTypeId: string;
  employeeId: string;
  notes?: string;
  isLocked?: boolean;
}
```

### CalendarEvent（日历事件）
```typescript
interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  eventType: 'regular' | 'shift' | 'meeting' | 'personal';
  shiftMetadata?: {
    scheduleId: string;
    shiftId: string;
    employeeId: string;
    employeeName: string;
    shiftTypeId: string;
    shiftTypeName: string;
  };
  // ... 其他字段
}
```

---

## 完整的 CRUD 实现

### 1. 数据服务层 (shiftService.ts)

#### 核心方法

| 方法 | 功能 | 返回值 |
|------|------|--------|
| `getAllSchedules()` | 获取所有排班计划 | `ShiftSchedule[]` |
| `getScheduleById(id)` | 获取单个排班计划 | `ShiftSchedule \| undefined` |
| `createSchedule(schedule)` | 创建排班计划 | `ShiftSchedule` |
| `updateSchedule(id, updates)` | 更新排班计划 | `ShiftSchedule` |
| `deleteSchedule(id)` | 删除排班计划（含关联事件） | `void` |
| `duplicateSchedule(id)` | 复制排班计划 | `ShiftSchedule` |
| `addShift(scheduleId, data)` | 添加单个班次 | `{ shift, event, conflicts, warnings }` |
| `updateShift(scheduleId, shiftId, updates)` | 更新单个班次 | `{ shift, event, conflicts, warnings }` |
| `deleteShift(scheduleId, shiftId)` | 删除单个班次（含关联事件） | `void` |
| `swapShifts(scheduleId, shiftId1, shiftId2)` | 换班操作 | `{ shift1, shift2 }` |
| `convertShiftToEvent(shift, schedule, existingEvent?)` | 单个班次转事件 | `CalendarEvent \| null` |
| `convertShiftsToEvents(schedule)` | 批量班次转事件 | `CalendarEvent[]` |
| `detectConflicts(newEvents, existingEvents)` | 冲突检测 | `{ conflicts, warnings }` |
| `saveGeneratedSchedule(schedule, events)` | 保存生成的排班 | `void` |

---

### 2. 自定义 Hooks (useShiftSchedules.ts)

#### useShiftSchedules - 管理排班计划列表
```typescript
export function useShiftSchedules() {
  const [schedules, setSchedules] = useState<ShiftSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSchedules = async () => { /* ... */ };
  const addSchedule = async (schedule) => { /* ... */ };
  const updateSchedule = async (id, updates) => { /* ... */ };
  const deleteSchedule = async (id) => { /* ... */ };
  const duplicateSchedule = async (id) => { /* ... */ };

  return {
    schedules,
    loading,
    error,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    duplicateSchedule,
    refresh: loadSchedules,
  };
}
```

#### useShiftSchedule - 管理单个排班计划
```typescript
export function useShiftSchedule(scheduleId: string | null) {
  const [schedule, setSchedule] = useState<ShiftSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSchedule = async () => { /* ... */ };
  const addShift = async (shiftData) => { /* ... */ };
  const updateShift = async (shiftId, updates) => { /* ... */ };
  const deleteShift = async (shiftId) => { /* ... */ };
  const swapShifts = async (shiftId1, shiftId2) => { /* ... */ };

  return {
    schedule,
    loading,
    error,
    addShift,
    updateShift,
    deleteShift,
    swapShifts,
    refresh: loadSchedule,
  };
}
```

---

### 3. 统一的操作流程

#### 添加班次
```
用户输入
    ↓
验证数据
    ↓
创建 Shift 对象
    ↓
转换为 CalendarEvent (convertShiftToEvent)
    ↓
冲突检测 (detectConflicts)
    ↓
保存 Shift 到 db.schedules
    ↓
保存 Event 到 db.events
    ↓
发布事件总线通知
    ↓
返回结果 { shift, event, conflicts, warnings }
```

#### 更新班次
```
用户输入
    ↓
获取现有 Shift
    ↓
更新 Shift 数据
    ↓
转换为 CalendarEvent (复用现有 ID)
    ↓
冲突检测 (detectConflicts)
    ↓
更新 Shift 到 db.schedules
    ↓
更新 Event 到 db.events
    ↓
发布事件总线通知
    ↓
返回结果 { shift, event, conflicts, warnings }
```

#### 删除班次
```
用户确认
    ↓
删除 Shift 从 db.schedules
    ↓
查找关联 Event
    ↓
删除 Event 从 db.events
    ↓
发布事件总线通知
    ↓
完成
```

---

### 4. 组件层实现

#### ShiftManager - 主管理组件
**三视图模式：**
1. **列表视图** - 查看所有排班计划
2. **创建视图** - 自然语言创建新排班
3. **详情视图** - 查看和编辑排班详情

**关键功能：**
- 冲突警告显示
- 操作反馈
- 状态管理

---

#### ShiftList - 排班计划列表
**功能：**
- ✅ 排班计划卡片展示
- ✅ 选择排班计划
- ✅ 复制排班计划
- ✅ 删除排班计划（带确认）
- ✅ 状态徽章显示
- ✅ 空状态提示

**交互：**
- 点击卡片进入详情
- 悬停显示操作按钮
- 删除前二次确认

---

#### ShiftEditor - 单个班次编辑器
**功能：**
- ✅ 日期选择
- ✅ 班次类型选择
- ✅ 员工选择
- ✅ 备注编辑
- ✅ 锁定班次选项
- ✅ 新增/编辑双模式

**表单验证：**
- 必填字段检查
- 日期格式验证
- 实时反馈

---

#### ShiftManager 详情视图
**信息卡片：**
- 排班周期
- 员工列表（带颜色标签）
- 班次类型列表

**班次表格：**
- 按日期排序
- 班次类型徽章
- 员工名称
- 备注显示
- 快速操作按钮

---

## 冲突检测机制

### 检测类型

| 类型 | 说明 | 触发条件 |
|------|------|---------|
| `overlap` | 时间重叠 | 两个事件时间范围重叠 |
| `employee_double_booked` | 员工重复排班 | 同一员工同一时间多个排班 |

### 实现代码
```typescript
detectConflicts(
  newEvents: CalendarEvent[],
  existingEvents: CalendarEvent[]
) {
  const conflicts = [];
  const warnings = [];
  const allEvents = [...existingEvents, ...newEvents];

  for (let i = 0; i < allEvents.length; i++) {
    for (let j = i + 1; j < allEvents.length; j++) {
      const event1 = allEvents[i];
      const event2 = allEvents[j];

      if (this.isTimeOverlap(event1, event2)) {
        const isEmployeeDoubleBooked = 
          event1.eventType === 'shift' && 
          event2.eventType === 'shift' && 
          event1.shiftMetadata?.employeeId === event2.shiftMetadata?.employeeId;

        conflicts.push({
          event1,
          event2,
          type: isEmployeeDoubleBooked ? 'employee_double_booked' : 'overlap',
        });
      }
    }
  }

  return { conflicts, warnings };
}
```

---

## 事件总线机制

### 事件结构
```typescript
{
  type: 'created' | 'updated' | 'deleted';
  entityType: 'shift' | 'event' | 'shift-schedule';
  entityId: string;
  metadata?: Record<string, any>;
}
```

### 订阅示例
```typescript
useEffect(() => {
  const unsubscribe = eventBus.subscribe((event) => {
    if (
      event.entityType === 'shift-schedule' && 
      event.entityId === scheduleId
    ) {
      loadSchedule();
    }
    if (
      event.entityType === 'shift' && 
      event.metadata?.scheduleId === scheduleId
    ) {
      loadSchedule();
    }
  });
  return unsubscribe;
}, [scheduleId, loadSchedule]);
```

---

## 交互设计最佳实践

### 1. 确认操作
- 删除操作需要二次确认
- 危险操作使用红色按钮
- 清晰的警告文字

### 2. 状态反馈
- 加载状态显示
- 错误状态提示
- 成功操作反馈

### 3. 冲突警告
- 黄色背景突出显示
- 清晰的冲突描述
- 可关闭的提示

### 4. 空状态
- 友好的空状态提示
- 引导用户的下一步操作
- 图标 + 文字组合

---

## 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Esc` | 关闭弹窗 |
| `Enter` | 确认操作 |
| `Delete` | 删除选中项 |
| `Ctrl/Cmd + S` | 保存 |

---

## 实现路线图

### Phase 1: 基础 CRUD
- [x] 数据模型设计
- [x] Service 层实现
- [x] 自定义 Hooks
- [x] 基础 UI 组件

### Phase 2: 增强功能
- [x] 冲突检测
- [x] 事件同步
- [x] 复制功能
- [x] 换班操作

### Phase 3: 用户体验
- [x] 冲突警告显示
- [x] 操作确认
- [x] 状态反馈
- [x] 空状态提示

---

## 关键文件清单

| 文件 | 说明 |
|------|------|
| `types/index.ts` | 数据类型定义 |
| `lib/services/shiftService.ts` | 排班服务层 |
| `lib/hooks/useShiftSchedules.ts` | 自定义 Hooks |
| `components/ShiftManager.tsx` | 主管理组件 |
| `components/ShiftList.tsx` | 排班列表组件 |
| `components/ShiftEditor.tsx` | 班次编辑器 |
| `app/shift-manager/page.tsx` | 演示页面 |
| `SHIFT_CRUD_GUIDE.md` | 完整方案文档 |
| `REFACTORING_SKILL.md` | 重构经验总结 |

---

## 总结

### 成功要素
1. ✅ 先调研社区方案
2. ✅ 统一的数据结构
3. ✅ 完整的数据流设计
4. ✅ 可复用的辅助函数
5. ✅ 良好的用户体验
6. ✅ 完整的事件通知

### 核心原则
- **单一职责** - 每个函数只做一件事
- **DRY 原则** - 避免重复代码
- **统一接口** - 相同功能使用相同结构
- **完整流程** - 确保数据流转完整
- **用户优先** - 良好的交互体验

---

**记住：好的 CRUD 功能不是功能的堆砌，而是流畅的用户体验！** 🚀
