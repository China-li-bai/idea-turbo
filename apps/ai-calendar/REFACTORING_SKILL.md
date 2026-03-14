# 代码重构统一最佳实践 Skill

## 概述

这是一个关于**代码重构和统一**的经验总结，适用于需要保持代码一致性、避免重复逻辑、确保功能完整性的项目开发场景。

## 核心原则

### 1️⃣ 单一职责原则
每个函数只做一件事，且做得最好。

### 2️⃣ DRY原则（Don't Repeat Yourself）
避免重复代码，提取公共逻辑到可复用的函数中。

### 3️⃣ 统一的接口设计
相同功能的方法使用相同的参数结构和返回值结构。

### 4️⃣ 完整的数据流
确保数据从输入到输出的完整流转，包括：
- 数据转换
- 冲突检测
- 存储持久化
- 事件通知

## 重构经验总结

### 一、从问题出发

**问题场景：**
- 添加/编辑/删除班次时没有使用统一的冲突检测
- 没有同步更新日历事件
- 方法返回值不统一
- 重复的转换逻辑

**解决思路：**
1. 先分析现有代码，找出不一致之处
2. 提取公共逻辑到辅助函数
3. 重构主要方法，使用统一的流程
4. 更新调用方，处理新的返回值

---

### 二、重构步骤

#### 步骤1：分析现有代码结构

**检查清单：**
- [ ] 哪些功能是重复的？
- [ ] 哪些方法返回值不一致？
- [ ] 哪些数据转换逻辑可以提取？
- [ ] 哪些验证/检测逻辑可以统一？

**示例分析：**
```typescript
// 问题：重复的转换逻辑
convertShiftsToEvents() { /* 大量代码 */ }
addShift() { /* 没有转换逻辑 */ }
updateShift() { /* 没有转换逻辑 */ }
```

---

#### 步骤2：提取公共辅助函数

**原则：**
- 辅助函数应该是纯函数（无副作用）
- 辅助函数应该可测试
- 辅助函数应该有明确的输入输出

**示例：创建单个转换函数**
```typescript
// 单个班次转换为事件
convertShiftToEvent(
  shift: Shift,
  schedule: ShiftSchedule,
  existingEvent?: CalendarEvent
): CalendarEvent | null {
  // 实现转换逻辑
}

// 批量转换复用单个转换
convertShiftsToEvents(schedule: ShiftSchedule): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const shift of schedule.shifts) {
    const event = this.convertShiftToEvent(shift, schedule);
    if (event) events.push(event);
  }
  return events;
}
```

---

#### 步骤3：重构主要方法，统一流程

**统一的操作流程：**
```
输入 → 验证 → 转换 → 冲突检测 → 存储 → 事件通知 → 返回结果
```

**示例：重构 addShift 方法**
```typescript
async addShift(
  scheduleId: string,
  shiftData: Omit<Shift, 'id' | 'scheduleId'>
): Promise<{
  shift: Shift;
  event?: CalendarEvent;
  conflicts: Conflict[];
  warnings: string[];
}> {
  // 1. 获取依赖数据
  const schedule = await this.getScheduleById(scheduleId);
  
  // 2. 创建新数据
  const newShift = { ...shiftData, id: uuidv4(), scheduleId };
  
  // 3. 转换为事件
  const newEvent = this.convertShiftToEvent(newShift, tempSchedule);
  
  // 4. 冲突检测
  const conflictResult = this.detectConflicts([newEvent], otherEvents);
  
  // 5. 存储
  await db.schedules.setItem(scheduleId, updatedSchedule);
  if (newEvent) await db.events.setItem(newEvent.id, newEvent);
  
  // 6. 事件通知
  eventBus.publish({ type: 'created', entityType: 'shift', ... });
  
  // 7. 返回统一结果
  return {
    shift: newShift,
    event: newEvent,
    conflicts: conflictResult.conflicts,
    warnings: conflictResult.warnings,
  };
}
```

---

#### 步骤4：统一返回值结构

**原则：**
- 相同功能的方法返回相同的结构
- 返回值应该包含：
  - 主要操作结果
  - 关联数据
  - 检测/验证结果
  - 警告信息

**示例：统一的返回结构**
```typescript
{
  shift: Shift;                    // 主要操作结果
  event?: CalendarEvent;           // 关联数据
  conflicts: Conflict[];           // 检测结果
  warnings: string[];              // 警告信息
}
```

---

#### 步骤5：更新调用方

**处理新返回值：**
```typescript
const handleSaveShift = async (shiftData) => {
  try {
    const result = editingShift 
      ? await updateShift(editingShift.id, shiftData)
      : await addShift(shiftData);
    
    // 处理冲突和警告
    if (result.conflicts.length > 0) {
      showConflictMessage(result.conflicts);
    }
    
    if (result.warnings.length > 0) {
      showWarningMessage(result.warnings);
    }
  } catch (err) {
    handleError(err);
  }
};
```

---

### 三、关键技术点

#### 1. 辅助函数设计

| 设计要点 | 说明 |
|---------|------|
| 单一职责 | 每个辅助函数只做一件事 |
| 可选参数 | 支持现有数据复用（如 `existingEvent`） |
| 返回 `null` | 处理无效输入，避免错误 |
| 类型安全 | 使用 TypeScript 严格类型 |

---

#### 2. 冲突检测机制

**统一的冲突检测：**
```typescript
detectConflicts(
  newEvents: CalendarEvent[],
  existingEvents: CalendarEvent[]
): { conflicts: Conflict[]; warnings: string[] }
```

**检测类型：**
- `overlap` - 时间重叠
- `employee_double_booked` - 员工重复排班

---

#### 3. 事件总线通知

**统一的事件结构：**
```typescript
{
  type: 'created' | 'updated' | 'deleted';
  entityType: 'shift' | 'event' | 'shift-schedule';
  entityId: string;
  metadata?: Record<string, any>;
}
```

---

#### 4. 数据同步

**确保数据一致性：**
1. Shift 数据变更 → 同步更新 CalendarEvent
2. 删除 Shift → 同步删除 CalendarEvent
3. 使用 shiftId 关联 Shift 和 Event

---

### 四、检查清单

#### 重构前
- [ ] 分析现有代码，识别重复逻辑
- [ ] 列出不一致的方法
- [ ] 设计统一的接口和数据结构
- [ ] 规划重构步骤

#### 重构中
- [ ] 先提取辅助函数
- [ ] 再重构主要方法
- [ ] 确保类型安全
- [ ] 添加必要的注释

#### 重构后
- [ ] 运行测试
- [ ] 检查诊断错误
- [ ] 验证功能完整性
- [ ] 更新文档

---

## 实战案例：排班系统重构

### 重构内容

| 方面 | 重构前 | 重构后 |
|------|--------|--------|
| 转换逻辑 | `convertShiftsToEvents()` 单独实现 | `convertShiftToEvent()` + `convertShiftsToEvents()` 复用 |
| addShift | 只保存 Shift，无冲突检测 | 完整流程：转换+检测+同步+通知 |
| updateShift | 只更新 Shift，无冲突检测 | 完整流程：转换+检测+同步+通知 |
| deleteShift | 只删除 Shift，不同步 Event | 同步删除 Event |
| 返回值 | 只返回 Shift | 返回 `{ shift, event, conflicts, warnings }` |

### 关键文件

| 文件 | 修改内容 |
|------|---------|
| `shiftService.ts` | 重构核心方法，添加辅助函数 |
| `useShiftSchedules.ts` | 更新 Hook 返回值 |
| `ShiftManager.tsx` | 处理冲突警告显示 |

---

## 总结

### 成功因素
1. ✅ 先分析后重构
2. ✅ 提取公共逻辑
3. ✅ 统一接口设计
4. ✅ 完整的数据流转
5. ✅ 保持向后兼容

### 经验教训
1. ⚠️ 重构前要做好规划
2. ⚠️ 小步快跑，逐步迭代
3. ⚠️ 保持测试覆盖
4. ⚠️ 及时更新文档

---

**记住：好的代码不是写出来的，是重构出来的！** 🚀
