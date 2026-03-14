# 排班系统完整开发经验

## 开发流程

### 第一步：场景痛点分析
先搜索实际排班场景的痛点，列出所有可能的问题

### 第二步：编辑边界测试案例
为每个痛点设计测试案例，明确预期结果

### 第三步：编程实现
按照"场景痛点-测试案例-编程"的流程实现功能

---

## 完整痛点清单

### 高优先级痛点（已实现）

| 痛点 | 测试案例数 | 优先级 |
|------|-----------|--------|
| 员工重复排班 | 3 | 🔴 高 |
| 时间重叠冲突 | 3 | 🔴 高 |
| 工时合规问题 | 5 | 🔴 高 |
| 日期边界处理 | 5 | 🔴 高 |
| 数据边界处理 | 6 | 🔴 高 |
| 跨天班次处理 | 4 | 🔴 高 |

### 中优先级痛点（已实现）

| 痛点 | 测试案例数 | 优先级 |
|------|-----------|--------|
| 员工技能匹配 | 3 | 🟡 中 |
| 员工请假处理 | 3 | 🟡 中 |
| 大规模排班 | 4 | 🟡 中 |
| 用户操作边界 | 5 | 🟡 中 |

---

## 核心实现方法

### 1. 数据边界验证

```typescript
validateShiftData(shiftData: Omit<Shift, 'id' | 'scheduleId'>, shiftType?: ShiftType)
```

**验证内容：**
- 开始时间 = 结束时间 ❌
- 结束时间 < 开始时间（同一天）❌
- 班次时长 > 24小时 ❌
- 班次时长 > 12小时 ⚠️
- 班次时长 < 1小时 ⚠️
- 2月29日非闰年 ❌
- 无效日期（如4月31日）❌

### 2. 跨天班次处理

```typescript
calculateShiftDuration(shift: Shift, shiftType: ShiftType)
getWeekStart(date: Date)
getWeekEnd(date: Date)
```

**处理逻辑：**
- 夜班（22:00-06:00）日期归属正确
- 跨周班次工时统计在开始日期所在的周
- 跨月、跨年班次正确处理

### 3. 工时合规检查

```typescript
checkWorkHourCompliance(schedule: ShiftSchedule, employeeId: string, newShift?: Shift)
```

**检查项：**
- 单日工时 > 11小时 ❌
- 单日工时 > 8小时 ⚠️
- 周工时 > 48小时 ❌
- 周工时 > 40小时 ⚠️
- 连续工作 ≥ 5天 ❌
- 连续夜班 > 3次 ❌

### 4. 员工技能匹配

```typescript
checkSkillMatch(employee: Employee, shiftType: ShiftType)
```

**类型扩展：**
```typescript
interface ShiftType {
  requiredSkills?: string[];
}

interface Employee {
  skills?: string[];
}
```

**验证逻辑：**
- 完全不匹配技能 ❌ 错误
- 部分匹配技能 ⚠️ 警告

### 5. 员工请假处理

```typescript
checkLeaveAvailability(employee: Employee, shiftDate: Date, shiftName: string)
```

**数据来源：**
```typescript
interface Employee {
  constraints?: {
    unavailableDates?: Date[];
  };
}
```

**验证逻辑：**
- 检查排班日期是否在请假期间
- 请假期间不能安排班次

### 6. 大规模排班性能优化

```typescript
buildShiftIndex(schedule: ShiftSchedule)
batchAddShifts(scheduleId: string, shiftsData: Omit<Shift, 'id' | 'scheduleId'>[])
```

**优化策略：**
- 构建员工/日期/班次类型索引
- 支持批量添加班次
- 提升 100+ 班次时的性能

### 7. 用户操作边界处理

```typescript
class OperationGuard {
  debounce()
  throttle()
  guardOperation()
}
```

**功能：**
- 防抖处理，防止重复提交
- 节流处理，限制操作频率
- 防止数据丢失

---

## 完整验证流程集成

```typescript
async checkShiftConflicts(scheduleId: string, shiftData, existingShiftId?)
```

**集成内容：**
1. 数据边界验证
2. 日期边界验证
3. 时间冲突检测
4. 工时合规检查
5. 员工技能匹配
6. 员工请假检查

---

## 经验总结

### 1. 先分析后编码
- 不要急于编码，先充分分析场景痛点
- 列出所有可能的边界条件
- 设计测试案例，明确预期结果

### 2. 按照优先级迭代
- 先解决高优先级问题（影响核心功能）
- 再解决中优先级问题（优化体验）
- 最后解决低优先级问题（锦上添花）

### 3. 统一验证入口
- 所有验证都集成到 `checkShiftConflicts` 方法
- 调用方只需调用一个方法即可获得完整验证
- 便于维护和扩展

### 4. 类型扩展要谨慎
- 扩展类型时使用可选字段（`?`）
- 保持向后兼容性
- 提供默认值处理

### 5. 性能优化要考虑规模
- 提前考虑 100+ 班次的场景
- 使用索引提升查询性能
- 支持批量操作

---

## 排班数据与日历数据同步

### 数据源统一

| 数据源 | 说明 |
|--------|------|
| `ShiftSchedule.shifts` | 排班数据（原始数据） |
| `CalendarEvent` | 日历事件（展示数据） |

### 数据格式统一

**Shift 转换为 CalendarEvent：**
```typescript
convertShiftToEvent(shift: Shift, schedule: ShiftSchedule, existingEvent?: CalendarEvent)
```

**统一字段：**
- `title`: `${employee.name} - ${shiftType.name}`
- `startTime`: 班次开始时间
- `endTime`: 班次结束时间
- `eventType`: 'shift'
- `shiftMetadata`: 排班元数据
- `color`: 班次颜色

### CRUD 操作同步

| 操作 | 排班数据 | 日历事件 | 事件总线 |
|------|---------|---------|---------|
| `addShift` | ✅ 更新 | ✅ 创建 | ✅ 发布 |
| `updateShift` | ✅ 更新 | ✅ 更新 | ✅ 发布 |
| `deleteShift` | ✅ 更新 | ✅ 删除 | ✅ 发布 |
| `duplicateSchedule` | ✅ 创建 | ✅ 批量创建 | ✅ 发布 |
| `swapShifts` | ✅ 更新 | ✅ 批量更新 | ✅ 发布 |
| `deleteSchedule` | ✅ 删除 | ✅ 批量删除 | ✅ 发布 |

### 同步方法

**全量同步：**
```typescript
syncAllShiftsToCalendar()
```

**单个排班计划同步：**
```typescript
syncScheduleToCalendar(scheduleId: string)
```

---

## 关键文件

| 文件 | 说明 |
|------|------|
| `shiftService.ts` | 排班服务核心逻辑 |
| `types/index.ts` | 数据类型定义 |
| `utils/operationGuard.ts` | 操作边界处理工具 |
| `SHIFT_SCHEDULING_PAIN_POINTS.md` | 痛点分析文档 |
| `SHIFT_SCHEDULING_COMPLETE_SKILL.md` | 本文档 |

---

## 数据流程图

```
用户操作
    ↓
ShiftService (CRUD方法)
    ↓
┌───────────────┬───────────────┐
│  排班数据      │  日历事件      │
│  (db.schedules)│  (db.events)  │
└───────────────┴───────────────┘
    ↓
事件总线 (eventBus)
    ↓
UI 组件更新
    ↓
日历视图更新
```
