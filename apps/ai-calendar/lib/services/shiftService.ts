import { v4 as uuidv4 } from 'uuid';
import { dataStoreAdapter } from './dataStoreAdapter';
import { useDataStore } from '../stores/dataStore';
import { eventBus } from '@/lib/utils/eventBus';
import type { EntityType } from '@/lib/utils/eventBus';
import { aiService } from '@/lib/ai';
import { localScheduler } from './localScheduler';
import { privacySanitizer } from '@/lib/utils/privacy';
import { parseShiftNlp, type ShiftNlpResult } from '@/lib/utils/shiftNlpParser';
import type {
  ShiftSchedule,
  ShiftType,
  Employee,
  Shift,
  CalendarEvent,
} from '@/types';

export class ShiftService {
  private static instance: ShiftService;

  static getInstance(): ShiftService {
    if (!ShiftService.instance) {
      ShiftService.instance = new ShiftService();
    }
    return ShiftService.instance;
  }

  private async getAllEvents(): Promise<CalendarEvent[]> {
    return useDataStore.getState().events;
  }

  private async saveEvent(event: CalendarEvent): Promise<void> {
    const store = useDataStore.getState();
    const existing = store.events.find(e => e.id === event.id);
    if (existing) {
      await store.updateEvent(event.id, event);
    } else {
      await store.addEvent(event);
    }
  }

  private async deleteEvent(eventId: string): Promise<void> {
    await useDataStore.getState().deleteEvent(eventId);
  }

  async getSchedules(): Promise<ShiftSchedule[]> {
    return await dataStoreAdapter.getAllSchedules();
  }

  async getSchedule(id: string): Promise<ShiftSchedule | undefined> {
    return await dataStoreAdapter.getScheduleById(id) ?? undefined;
  }

  async createSchedule(
    schedule: Omit<ShiftSchedule, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ShiftSchedule> {
    const now = new Date();
    const newSchedule: ShiftSchedule = {
      ...schedule,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    await dataStoreAdapter.addSchedule(newSchedule);
    eventBus.publish({
      type: 'created',
      entityType: 'shiftSchedule',
      entityId: newSchedule.id,
    });
    return newSchedule;
  }

  async updateSchedule(
    id: string,
    updates: Partial<ShiftSchedule>
  ): Promise<ShiftSchedule> {
    const schedule = await this.getSchedule(id);
    if (!schedule) {
      throw new Error('Schedule not found');
    }
    const updatedSchedule = await dataStoreAdapter.updateSchedule(id, updates);
    if (!updatedSchedule) {
      throw new Error('Failed to update schedule');
    }
    eventBus.publish({
      type: 'updated',
      entityType: 'shiftSchedule',
      entityId: id,
    });
    return updatedSchedule;
  }

  async generateScheduleFromNaturalLanguage(
    naturalLanguage: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      employees?: Employee[];
      shiftTypes?: ShiftType[];
    }
  ): Promise<{
    schedule: ShiftSchedule;
    events: CalendarEvent[];
  }> {
    const today = new Date();
    const startDate = options?.startDate || today;
    const endDate = options?.endDate || new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const defaultShiftTypes: ShiftType[] = options?.shiftTypes || [
      {
        id: uuidv4(),
        name: '早班',
        startTime: '08:00',
        endTime: '16:00',
        color: '#3b82f6',
      },
      {
        id: uuidv4(),
        name: '中班',
        startTime: '14:00',
        endTime: '22:00',
        color: '#10b981',
      },
      {
        id: uuidv4(),
        name: '晚班',
        startTime: '20:00',
        endTime: '06:00',
        color: '#8b5cf6',
      },
    ];

    const defaultEmployees: Employee[] = options?.employees || [
      {
        id: uuidv4(),
        name: '张三',
        color: '#ef4444',
      },
      {
        id: uuidv4(),
        name: '李四',
        color: '#f59e0b',
      },
      {
        id: uuidv4(),
        name: '王五',
        color: '#06b6d4',
      },
    ];

    privacySanitizer.reset();

    const { sanitizedPrompt, sanitizedData } = privacySanitizer.sanitizeForAI(
      naturalLanguage,
      defaultEmployees,
      defaultShiftTypes,
      startDate,
      endDate
    );

    const anonymizedEmployeeMap = new Map<string, Employee>();
    const employeeDisplayList = sanitizedData.employees.map((sanitizedEmp, idx) => {
      const originalEmp = defaultEmployees[idx];
      anonymizedEmployeeMap.set(sanitizedEmp.anonymizedName, originalEmp);
      anonymizedEmployeeMap.set(originalEmp.id, originalEmp);
      return `- ${sanitizedEmp.anonymizedName} (ID: ${originalEmp.id})`;
    });

    const systemPrompt = `你是一个专业的排班助手。请根据用户的自然语言描述生成排班表。

要求：
1. 日期范围：从 ${startDate.toISOString().split('T')[0]} 到 ${endDate.toISOString().split('T')[0]}
2. 可用班次类型：
${defaultShiftTypes.map(st => `- ${st.name}: ${st.startTime}-${st.endTime} (ID: ${st.id})`).join('\n')}
3. 可用员工：
${employeeDisplayList.join('\n')}

请返回JSON格式，包含：
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

只返回JSON，不要其他文字。`;

    const response = await aiService.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: sanitizedPrompt },
    ]);

    let parsedResult: { shifts: Array<{ date: string; shiftTypeId: string; employeeId: string; notes?: string }> };
    try {
      const content = response.choices[0].message.content;
      const jsonMatch = content?.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      parsedResult = JSON.parse(jsonMatch[0]);
    } catch (error) {
      throw new Error('Failed to parse AI response');
    }

    const shifts: Shift[] = parsedResult.shifts.map(s => {
      let employeeId = s.employeeId;
      
      for (const [key, emp] of anonymizedEmployeeMap.entries()) {
        if (key === s.employeeId || key.includes(s.employeeId)) {
          employeeId = emp.id;
          break;
        }
      }

      return {
        id: uuidv4(),
        scheduleId: '',
        date: new Date(s.date),
        shiftTypeId: s.shiftTypeId,
        employeeId,
        notes: s.notes,
      };
    });

    const schedule: ShiftSchedule = {
      id: uuidv4(),
      name: naturalLanguage.substring(0, 50),
      description: naturalLanguage,
      startDate,
      endDate,
      employees: defaultEmployees,
      shiftTypes: defaultShiftTypes,
      shifts: shifts.map(s => ({ ...s, scheduleId: '' })),
      rules: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      generatedBy: 'ai',
    };

    const events: CalendarEvent[] = this.convertShiftsToEvents(schedule);

    schedule.shifts = shifts.map(s => ({ ...s, scheduleId: schedule.id }));

    privacySanitizer.reset();

    return { schedule, events };
  }

  calculateShiftDuration(shift: Shift, shiftType: ShiftType): {
    startTime: Date;
    endTime: Date;
    durationHours: number;
    isOvernight: boolean;
  } {
    const shiftDate = new Date(shift.date);
    const [startHour, startMinute] = shiftType.startTime.split(':').map(Number);
    const [endHour, endMinute] = shiftType.endTime.split(':').map(Number);

    const startTime = new Date(shiftDate);
    startTime.setHours(startHour, startMinute, 0, 0);

    let endTime = new Date(shiftDate);
    endTime.setHours(endHour, endMinute, 0, 0);

    const isOvernight = endHour < startHour || (endHour === startHour && endMinute <= startMinute);
    
    if (isOvernight) {
      endTime.setDate(endTime.getDate() + 1);
    }

    const durationMs = endTime.getTime() - startTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    return {
      startTime,
      endTime,
      durationHours,
      isOvernight,
    };
  }

  getWeekStart(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    const diff = result.getDate() - day + (day === 0 ? -6 : 1);
    result.setDate(diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  getWeekEnd(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    const diff = result.getDate() - day + (day === 0 ? 0 : 7);
    result.setDate(diff);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  checkWorkHourCompliance(
    schedule: ShiftSchedule,
    employeeId: string,
    newShift?: Shift
  ): {
    hasError: boolean;
    hasWarning: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const employeeShifts = schedule.shifts.filter(s => s.employeeId === employeeId);
    
    if (newShift) {
      employeeShifts.push(newShift);
    }

    if (employeeShifts.length === 0) {
      return { hasError: false, hasWarning: false, errors: [], warnings: [] };
    }

    const employee = schedule.employees.find(e => e.id === employeeId);
    const employeeName = employee?.name || '该员工';

    const shiftDates = new Map<string, Shift[]>();
    for (const shift of employeeShifts) {
      const dateKey = shift.date.toISOString().split('T')[0];
      if (!shiftDates.has(dateKey)) {
        shiftDates.set(dateKey, []);
      }
      shiftDates.get(dateKey)!.push(shift);
    }

    for (const [dateKey, shifts] of shiftDates) {
      let totalDailyHours = 0;
      for (const shift of shifts) {
        const shiftType = schedule.shiftTypes.find(st => st.id === shift.shiftTypeId);
        if (shiftType) {
          const { durationHours } = this.calculateShiftDuration(shift, shiftType);
          totalDailyHours += durationHours;
        }
      }

      if (totalDailyHours > 11) {
        errors.push(`${employeeName} 在 ${dateKey} 的单日工时（${totalDailyHours.toFixed(1)}小时）超过11小时上限`);
      } else if (totalDailyHours > 8) {
        warnings.push(`${employeeName} 在 ${dateKey} 的工时较长（${totalDailyHours.toFixed(1)}小时）`);
      }
    }

    const sortedDates = Array.from(shiftDates.keys()).sort();
    if (sortedDates.length >= 4) {
      let consecutiveDays = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        const dayDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

        if (dayDiff === 1) {
          consecutiveDays++;
          if (consecutiveDays >= 5) {
            errors.push(`${employeeName} 连续工作超过4天没有休息`);
            break;
          }
        } else {
          consecutiveDays = 1;
        }
      }
    }

    const weekHours = new Map<string, number>();
    for (const shift of employeeShifts) {
      const shiftType = schedule.shiftTypes.find(st => st.id === shift.shiftTypeId);
      if (shiftType) {
        const { durationHours } = this.calculateShiftDuration(shift, shiftType);
        const weekStart = this.getWeekStart(new Date(shift.date));
        const weekKey = weekStart.toISOString().split('T')[0];
        
        weekHours.set(weekKey, (weekHours.get(weekKey) || 0) + durationHours);
      }
    }

    for (const [weekKey, hours] of weekHours) {
      if (hours > 48) {
        errors.push(`${employeeName} 在周 ${weekKey} 的工时（${hours.toFixed(1)}小时）超过48小时上限`);
      } else if (hours > 40) {
        warnings.push(`${employeeName} 在周 ${weekKey} 的工时较长（${hours.toFixed(1)}小时）`);
      }
    }

    let consecutiveNightShifts = 0;
    for (let i = 0; i < sortedDates.length; i++) {
      const shifts = shiftDates.get(sortedDates[i])!;
      let hasNightShift = false;
      
      for (const shift of shifts) {
        const shiftType = schedule.shiftTypes.find(st => st.id === shift.shiftTypeId);
        if (shiftType) {
          const { isOvernight } = this.calculateShiftDuration(shift, shiftType);
          if (isOvernight) {
            hasNightShift = true;
            break;
          }
        }
      }

      if (hasNightShift) {
        consecutiveNightShifts++;
        if (consecutiveNightShifts > 3) {
          errors.push(`${employeeName} 连续夜班超过3次`);
          break;
        }
      } else {
        consecutiveNightShifts = 0;
      }
    }

    return {
      hasError: errors.length > 0,
      hasWarning: warnings.length > 0,
      errors,
      warnings,
    };
  }

  checkSkillMatch(
    employee: Employee,
    shiftType: ShiftType
  ): {
    hasError: boolean;
    hasWarning: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const requiredSkills = shiftType.requiredSkills || [];
    const employeeSkills = employee.skills || [];

    if (requiredSkills.length === 0) {
      return { hasError: false, hasWarning: false, errors: [], warnings: [] };
    }

    const missingSkills = requiredSkills.filter(skill => !employeeSkills.includes(skill));
    const matchingSkills = requiredSkills.filter(skill => employeeSkills.includes(skill));

    if (missingSkills.length > 0) {
      if (missingSkills.length === requiredSkills.length) {
        errors.push(`${employee.name} 缺少班次 "${shiftType.name}" 所需的全部技能：${requiredSkills.join('、')}`);
      } else {
        warnings.push(`${employee.name} 缺少班次 "${shiftType.name}" 所需的部分技能：${missingSkills.join('、')}（已匹配：${matchingSkills.join('、')}）`);
      }
    }

    return {
      hasError: errors.length > 0,
      hasWarning: warnings.length > 0,
      errors,
      warnings,
    };
  }

  checkLeaveAvailability(
    employee: Employee,
    shiftDate: Date,
    shiftName: string
  ): {
    hasError: boolean;
    hasWarning: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const unavailableDates = employee.constraints?.unavailableDates || [];

    for (const unavailableDate of unavailableDates) {
      const unavailableStart = new Date(unavailableDate);
      unavailableStart.setHours(0, 0, 0, 0);

      let unavailableEnd = new Date(unavailableDate);
      unavailableEnd.setHours(23, 59, 59, 999);

      const checkDate = new Date(shiftDate);
      checkDate.setHours(0, 0, 0, 0);

      if (checkDate >= unavailableStart && checkDate <= unavailableEnd) {
        errors.push(`${employee.name} 在 ${shiftDate.toISOString().split('T')[0]} 已请假，不能安排班次"${shiftName}"`);
        break;
      }
    }

    return {
      hasError: errors.length > 0,
      hasWarning: warnings.length > 0,
      errors,
      warnings,
    };
  }

  buildShiftIndex(schedule: ShiftSchedule): {
    employeeShiftMap: Map<string, Shift[]>;
    dateShiftMap: Map<string, Shift[]>;
    shiftTypeMap: Map<string, ShiftType>;
    employeeMap: Map<string, Employee>;
  } {
    const employeeShiftMap = new Map<string, Shift[]>();
    const dateShiftMap = new Map<string, Shift[]>();
    const shiftTypeMap = new Map<string, ShiftType>();
    const employeeMap = new Map<string, Employee>();

    for (const shiftType of schedule.shiftTypes) {
      shiftTypeMap.set(shiftType.id, shiftType);
    }

    for (const employee of schedule.employees) {
      employeeMap.set(employee.id, employee);
      employeeShiftMap.set(employee.id, []);
    }

    for (const shift of schedule.shifts) {
      const employeeShifts = employeeShiftMap.get(shift.employeeId) || [];
      employeeShifts.push(shift);
      employeeShiftMap.set(shift.employeeId, employeeShifts);

      const dateKey = new Date(shift.date).toISOString().split('T')[0];
      const dateShifts = dateShiftMap.get(dateKey) || [];
      dateShifts.push(shift);
      dateShiftMap.set(dateKey, dateShifts);
    }

    return { employeeShiftMap, dateShiftMap, shiftTypeMap, employeeMap };
  }

  async batchAddShifts(
    scheduleId: string,
    shiftsData: Omit<Shift, 'id' | 'scheduleId'>[]
  ): Promise<{
    addedShifts: Shift[];
    addedEvents: CalendarEvent[];
    errors: string[];
    warnings: string[];
  }> {
    const schedule = await this.getScheduleById(scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    const addedShifts: Shift[] = [];
    const addedEvents: CalendarEvent[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const shiftData of shiftsData) {
      try {
        const shiftType = schedule.shiftTypes.find(st => st.id === shiftData.shiftTypeId);
        const validation = this.validateShiftData(shiftData, shiftType);

        if (validation.hasError) {
          errors.push(`班次验证失败: ${validation.errors.join('; ')}`);
          continue;
        }

        const tempShift: Shift = {
          ...shiftData,
          id: uuidv4(),
          scheduleId,
        };

        const conflictResult = await this.checkShiftConflicts(scheduleId, shiftData);

        if (conflictResult.hasError) {
          errors.push(`班次冲突: ${conflictResult.warnings.join('; ')}`);
          continue;
        }

        if (conflictResult.hasWarning) {
          warnings.push(...conflictResult.warnings);
        }

        const updatedSchedule: ShiftSchedule = {
          ...schedule,
          shifts: [...schedule.shifts, tempShift],
          updatedAt: new Date(),
        };

        const event = this.convertShiftToEvent(tempShift, updatedSchedule);

        await dataStoreAdapter.updateSchedule(scheduleId, { 
          shifts: updatedSchedule.shifts,
          updatedAt: updatedSchedule.updatedAt,
        });

        if (event) {
          await this.saveEvent(event);
          addedEvents.push(event);
        }

        addedShifts.push(tempShift);
      } catch (error) {
        errors.push(`添加班次失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (addedShifts.length > 0) {
      eventBus.publish({
        type: 'updated',
        entityType: 'shiftSchedule',
        entityId: scheduleId,
      });
    }

    return { addedShifts, addedEvents, errors, warnings };
  }

  convertShiftToEvent(
    shift: Shift,
    schedule: ShiftSchedule,
    existingEvent?: CalendarEvent
  ): CalendarEvent | undefined {
    const shiftType = schedule.shiftTypes.find(st => st.id === shift.shiftTypeId);
    const employee = schedule.employees.find(e => e.id === shift.employeeId);

    if (!shiftType || !employee) return undefined;

    const { startTime, endTime } = this.calculateShiftDuration(shift, shiftType);

    const event: CalendarEvent = {
      id: existingEvent?.id || uuidv4(),
      title: `${employee.name} - ${shiftType.name}`,
      description: shift.notes,
      startTime,
      endTime,
      isAllDay: false,
      reminders: existingEvent?.reminders || [],
      viewMode: 'personal',
      linkedEventId: existingEvent?.linkedEventId,
      linkedTaskIds: existingEvent?.linkedTaskIds,
      vectorId: existingEvent?.vectorId,
      embeddingUpdatedAt: existingEvent?.embeddingUpdatedAt,
      createdAt: existingEvent?.createdAt || new Date(),
      updatedAt: new Date(),
      color: shiftType.color,
      eventType: 'shift',
      shiftMetadata: {
        scheduleId: schedule.id,
        shiftId: shift.id,
        employeeId: employee.id,
        employeeName: employee.name,
        shiftTypeId: shiftType.id,
        shiftTypeName: shiftType.name,
      },
    };

    return event;
  }

  convertShiftsToEvents(schedule: ShiftSchedule): CalendarEvent[] {
    const events: CalendarEvent[] = [];

    for (const shift of schedule.shifts) {
      const event = this.convertShiftToEvent(shift, schedule);
      if (event) {
        events.push(event);
      }
    }

    return events;
  }

  detectConflicts(
    newEvents: CalendarEvent[],
    existingEvents: CalendarEvent[]
  ): { 
    conflicts: Array<{ event1: CalendarEvent; event2: CalendarEvent; type: 'overlap' | 'employee_double_booked'; severity: 'error' | 'warning' }>;
    warnings: string[];
    hasError: boolean;
    hasWarning: boolean;
  } {
    const conflicts: Array<{ event1: CalendarEvent; event2: CalendarEvent; type: 'overlap' | 'employee_double_booked'; severity: 'error' | 'warning' }> = [];
    const warnings: string[] = [];

    const allEvents = [...existingEvents, ...newEvents];

    for (let i = 0; i < allEvents.length; i++) {
      for (let j = i + 1; j < allEvents.length; j++) {
        const event1 = allEvents[i];
        const event2 = allEvents[j];

        const isOverlap = this.isTimeOverlap(event1, event2);
        
        if (isOverlap) {
          const isEmployeeDoubleBooked = 
            event1.eventType === 'shift' && 
            event2.eventType === 'shift' && 
            event1.shiftMetadata?.employeeId === event2.shiftMetadata?.employeeId;

          conflicts.push({
            event1,
            event2,
            type: isEmployeeDoubleBooked ? 'employee_double_booked' : 'overlap',
            severity: isEmployeeDoubleBooked ? 'error' : 'warning',
          });
        }
      }
    }

    const errorConflicts = conflicts.filter(c => c.severity === 'error');
    const warningConflicts = conflicts.filter(c => c.severity === 'warning');

    if (errorConflicts.length > 0) {
      warnings.push(`❌ 严重错误：检测到 ${errorConflicts.length} 个员工重复排班，必须修改`);
    }

    if (warningConflicts.length > 0) {
      warnings.push(`⚠️ 警告：检测到 ${warningConflicts.length} 个时间重叠`);
    }

    const newShiftEvents = newEvents.filter(e => e.eventType === 'shift');
    if (newShiftEvents.length > 0) {
      warnings.push(`ℹ️ 将添加 ${newShiftEvents.length} 个排班事件`);
    }

    return { 
      conflicts, 
      warnings,
      hasError: errorConflicts.length > 0,
      hasWarning: warningConflicts.length > 0,
    };
  }

  private isTimeOverlap(event1: CalendarEvent, event2: CalendarEvent): boolean {
    return (
      event1.startTime < event2.endTime &&
      event1.endTime > event2.startTime
    );
  }

  async generateScheduleLocal(
    naturalLanguage: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      employees?: Employee[];
      shiftTypes?: ShiftType[];
    }
  ): Promise<{
    schedule: ShiftSchedule;
    events: CalendarEvent[];
    warnings: string[];
    conflicts: string[];
    score: number;
  }> {
    const today = new Date();
    const startDate = options?.startDate || today;
    const endDate = options?.endDate || new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const defaultShiftTypes: ShiftType[] = options?.shiftTypes || [
      {
        id: uuidv4(),
        name: '早班',
        startTime: '08:00',
        endTime: '16:00',
        color: '#3b82f6',
      },
      {
        id: uuidv4(),
        name: '中班',
        startTime: '14:00',
        endTime: '22:00',
        color: '#10b981',
      },
      {
        id: uuidv4(),
        name: '晚班',
        startTime: '20:00',
        endTime: '06:00',
        color: '#8b5cf6',
      },
    ];

    const defaultEmployees: Employee[] = options?.employees || [
      {
        id: uuidv4(),
        name: '张三',
        color: '#ef4444',
      },
      {
        id: uuidv4(),
        name: '李四',
        color: '#f59e0b',
      },
      {
        id: uuidv4(),
        name: '王五',
        color: '#06b6d4',
      },
    ];

    const shiftsPerDay = 1;

    const schedulingResult = localScheduler.schedule(
      startDate,
      endDate,
      defaultEmployees,
      defaultShiftTypes,
      shiftsPerDay
    );

    const schedule: ShiftSchedule = {
      id: uuidv4(),
      name: naturalLanguage.substring(0, 50),
      description: naturalLanguage,
      startDate,
      endDate,
      employees: defaultEmployees,
      shiftTypes: defaultShiftTypes,
      shifts: schedulingResult.shifts.map(s => ({ ...s, scheduleId: '' })),
      rules: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      generatedBy: 'manual',
    };

    const events: CalendarEvent[] = this.convertShiftsToEvents(schedule);
    schedule.shifts = schedulingResult.shifts.map(s => ({ ...s, scheduleId: schedule.id }));

    return {
      schedule,
      events,
      warnings: schedulingResult.warnings,
      conflicts: schedulingResult.conflicts,
      score: schedulingResult.score,
    };
  }

  async generateSchedule(
    naturalLanguage: string,
    options?: {
      mode?: 'local' | 'ai' | 'hybrid';
      startDate?: Date;
      endDate?: Date;
      employees?: Employee[];
      shiftTypes?: ShiftType[];
    }
  ): Promise<{
    schedule: ShiftSchedule;
    events: CalendarEvent[];
    warnings: string[];
    conflicts: string[];
    score?: number;
    generatedBy: 'local' | 'ai' | 'hybrid';
  }> {
    const mode = options?.mode || 'local';

    if (mode === 'local') {
      const result = await this.generateScheduleLocal(naturalLanguage, options);
      return {
        ...result,
        generatedBy: 'local',
      };
    } else {
      const aiResult = await this.generateScheduleFromNaturalLanguage(naturalLanguage, options);
      return {
        ...aiResult,
        warnings: [],
        conflicts: [],
        generatedBy: 'ai',
      };
    }
  }

  async saveGeneratedSchedule(
    schedule: ShiftSchedule,
    events: CalendarEvent[]
  ): Promise<void> {
    await this.createSchedule(schedule);
    
    for (const event of events) {
      await this.saveEvent(event);
      eventBus.publish({
        type: 'created',
        entityType: 'event',
        entityId: event.id,
      });
    }
  }

  async getAllSchedules(): Promise<ShiftSchedule[]> {
    return await dataStoreAdapter.getAllSchedules();
  }

  async getScheduleById(id: string): Promise<ShiftSchedule | undefined> {
    return await dataStoreAdapter.getScheduleById(id) ?? undefined;
  }

  async getShiftsByScheduleId(scheduleId: string): Promise<Shift[]> {
    const schedule = await this.getScheduleById(scheduleId);
    return schedule?.shifts || [];
  }

  async getShiftById(scheduleId: string, shiftId: string): Promise<Shift | undefined> {
    const shifts = await this.getShiftsByScheduleId(scheduleId);
    return shifts.find(s => s.id === shiftId);
  }

  async addShift(
    scheduleId: string,
    shiftData: Omit<Shift, 'id' | 'scheduleId'>
  ): Promise<{
    shift: Shift;
    event?: CalendarEvent;
    conflicts: Array<{ event1: CalendarEvent; event2: CalendarEvent; type: 'overlap' | 'employee_double_booked' }>;
    warnings: string[];
  }> {
    const schedule = await this.getScheduleById(scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    const shiftType = schedule.shiftTypes.find(st => st.id === shiftData.shiftTypeId);
    const validation = this.validateShiftData(shiftData, shiftType);

    if (validation.hasError) {
      throw new Error(validation.errors.join('；'));
    }

    const newShift: Shift = {
      ...shiftData,
      id: uuidv4(),
      scheduleId,
    };

    const tempSchedule: ShiftSchedule = {
      ...schedule,
      shifts: [...schedule.shifts, newShift],
    };

    const newEvent = this.convertShiftToEvent(newShift, tempSchedule);
    
    const allEvents = await this.getAllEvents();
    const otherEvents = allEvents.filter((e: CalendarEvent) => 
      !(e.eventType === 'shift' && e.shiftMetadata?.shiftId === newShift.id)
    );

    const conflictResult = newEvent ? 
      this.detectConflicts([newEvent], otherEvents) : 
      { conflicts: [], warnings: [] };

    const allWarnings = [...conflictResult.warnings, ...validation.warnings];

    const updatedSchedule: ShiftSchedule = {
      ...schedule,
      shifts: [...schedule.shifts, newShift],
      updatedAt: new Date(),
    };

    await dataStoreAdapter.updateSchedule(scheduleId, { 
      shifts: updatedSchedule.shifts,
      updatedAt: updatedSchedule.updatedAt,
    });

    if (newEvent) {
      await this.saveEvent(newEvent);
      eventBus.publish({
        type: 'created',
        entityType: 'event',
        entityId: newEvent.id,
      });
    }

    eventBus.publish({
      type: 'updated',
      entityType: 'shiftSchedule',
      entityId: scheduleId,
    });

    return {
      shift: newShift,
      event: newEvent,
      conflicts: conflictResult.conflicts,
      warnings: allWarnings,
    };
  }

  async updateShift(
    scheduleId: string,
    shiftId: string,
    updates: Partial<Omit<Shift, 'id' | 'scheduleId'>>
  ): Promise<{
    shift: Shift;
    event?: CalendarEvent;
    conflicts: Array<{ event1: CalendarEvent; event2: CalendarEvent; type: 'overlap' | 'employee_double_booked' }>;
    warnings: string[];
  }> {
    const schedule = await this.getScheduleById(scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    const shiftIndex = schedule.shifts.findIndex(s => s.id === shiftId);
    if (shiftIndex === -1) {
      throw new Error('Shift not found');
    }

    const updatedShift: Shift = {
      ...schedule.shifts[shiftIndex],
      ...updates,
    };

    const shiftType = schedule.shiftTypes.find(st => st.id === updatedShift.shiftTypeId);
    const validation = this.validateShiftData(updatedShift, shiftType);

    if (validation.hasError) {
      throw new Error(validation.errors.join('；'));
    }

    const updatedShifts = [...schedule.shifts];
    updatedShifts[shiftIndex] = updatedShift;

    const tempSchedule: ShiftSchedule = {
      ...schedule,
      shifts: updatedShifts,
    };

    const allEvents = await this.getAllEvents();
    const existingEvent = allEvents.find((e: CalendarEvent) => 
      e.eventType === 'shift' && e.shiftMetadata?.shiftId === shiftId
    );

    const updatedEvent = this.convertShiftToEvent(updatedShift, tempSchedule, existingEvent);
    
    const otherEvents = allEvents.filter((e: CalendarEvent) => e.id !== updatedEvent?.id);

    const conflictResult = updatedEvent ? 
      this.detectConflicts([updatedEvent], otherEvents) : 
      { conflicts: [], warnings: [] };

    const allWarnings = [...conflictResult.warnings, ...validation.warnings];

    const updatedSchedule: ShiftSchedule = {
      ...schedule,
      shifts: updatedShifts,
      updatedAt: new Date(),
    };

    await dataStoreAdapter.updateSchedule(scheduleId, { 
      shifts: updatedShifts,
      updatedAt: updatedSchedule.updatedAt,
    });

    if (updatedEvent) {
      await this.saveEvent(updatedEvent);
      eventBus.publish({
        type: 'updated',
        entityType: 'event',
        entityId: updatedEvent.id,
      });
    }

    eventBus.publish({
      type: 'updated',
      entityType: 'shiftSchedule',
      entityId: scheduleId,
    });

    return {
      shift: updatedShift,
      event: updatedEvent,
      conflicts: conflictResult.conflicts,
      warnings: allWarnings,
    };
  }

  validateShiftData(
    shiftData: Omit<Shift, 'id' | 'scheduleId'>,
    shiftType?: ShiftType
  ): {
    hasError: boolean;
    hasWarning: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const shiftDate = new Date(shiftData.date);
    const year = shiftDate.getFullYear();
    const month = shiftDate.getMonth();
    const day = shiftDate.getDate();

    const isValidDate = (year: number, month: number, day: number): boolean => {
      const testDate = new Date(year, month, day);
      return testDate.getFullYear() === year && 
             testDate.getMonth() === month && 
             testDate.getDate() === day;
    };

    if (!isValidDate(year, month, day)) {
      const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
      errors.push(`${year}年${monthNames[month]}没有${day}日`);
    }

    if (month === 1 && day === 29) {
      const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
      if (!isLeapYear) {
        errors.push(`${year}年不是闰年，2月没有29日`);
      }
    }

    const [startHour, startMinute] = shiftType?.startTime.split(':').map(Number) || [0, 0];
    const [endHour, endMinute] = shiftType?.endTime.split(':').map(Number) || [0, 0];

    const startTime = new Date(shiftDate);
    startTime.setHours(startHour, startMinute, 0, 0);

    let endTime = new Date(shiftDate);
    endTime.setHours(endHour, endMinute, 0, 0);

    if (endTime <= startTime) {
      endTime.setDate(endTime.getDate() + 1);
    }

    const durationMs = endTime.getTime() - startTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    if (shiftType && shiftType.startTime === shiftType.endTime) {
      errors.push('开始时间和结束时间不能相同');
    }

    const isSameDayEnd = endHour > startHour || (endHour === startHour && endMinute > startMinute);
    if (isSameDayEnd && endHour < startHour) {
      errors.push('结束时间不能早于开始时间');
    }

    if (durationHours > 24) {
      errors.push('班次时长不能超过24小时');
    }

    if (durationHours > 12) {
      warnings.push(`班次时长较长（${durationHours.toFixed(1)}小时），请注意员工休息`);
    }

    if (durationHours < 1) {
      warnings.push(`班次时长较短（${durationHours.toFixed(1)}小时）`);
    }

    if (errors.length > 0) {
      return {
        hasError: true,
        hasWarning: warnings.length > 0,
        errors,
        warnings,
      };
    }

    return {
      hasError: false,
      hasWarning: warnings.length > 0,
      errors,
      warnings,
    };
  }

  async checkShiftConflicts(
    scheduleId: string,
    shiftData: Omit<Shift, 'id' | 'scheduleId'>,
    existingShiftId?: string
  ): Promise<{
    hasError: boolean;
    hasWarning: boolean;
    warnings: string[];
  }> {
    const schedule = await this.getScheduleById(scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    const shiftType = schedule.shiftTypes.find(st => st.id === shiftData.shiftTypeId);
    const validation = this.validateShiftData(shiftData, shiftType);

    if (validation.hasError) {
      return {
        hasError: true,
        hasWarning: validation.hasWarning,
        warnings: [...validation.errors, ...validation.warnings],
      };
    }

    const tempShift: Shift = {
      ...shiftData,
      id: existingShiftId || uuidv4(),
      scheduleId,
    };

    const tempSchedule: ShiftSchedule = {
      ...schedule,
      shifts: existingShiftId
        ? schedule.shifts.map(s => s.id === existingShiftId ? tempShift : s)
        : [...schedule.shifts, tempShift],
    };

    const tempEvent = this.convertShiftToEvent(tempShift, tempSchedule);
    if (!tempEvent) {
      return { 
        hasError: false, 
        hasWarning: validation.hasWarning, 
        warnings: validation.warnings 
      };
    }

    const allEvents = await this.getAllEvents();
    const otherEvents = allEvents.filter((e: CalendarEvent) => 
      !(e.eventType === 'shift' && e.shiftMetadata?.shiftId === tempShift.id)
    );

    const conflictResult = this.detectConflicts([tempEvent], otherEvents);

    const scheduleForCompliance = existingShiftId
      ? {
          ...schedule,
          shifts: schedule.shifts.filter(s => s.id !== existingShiftId),
        }
      : schedule;

    const complianceResult = this.checkWorkHourCompliance(
      scheduleForCompliance,
      shiftData.employeeId,
      tempShift
    );

    let skillResult = { hasError: false, hasWarning: false, errors: [] as string[], warnings: [] as string[] };
    let leaveResult = { hasError: false, hasWarning: false, errors: [] as string[], warnings: [] as string[] };
    if (shiftType) {
      const employee = schedule.employees.find(e => e.id === shiftData.employeeId);
      if (employee) {
        skillResult = this.checkSkillMatch(employee, shiftType);
        leaveResult = this.checkLeaveAvailability(employee, new Date(shiftData.date), shiftType.name);
      }
    }

    const allErrors = [...conflictResult.conflicts.filter(c => c.severity === 'error').map(c => {
      if (c.type === 'employee_double_booked') {
        return `❌ 严重错误：员工 ${c.event1.shiftMetadata?.employeeName} 在同一时间有多个排班`;
      }
      return '❌ 严重错误：时间重叠冲突';
    }), ...complianceResult.errors, ...skillResult.errors, ...leaveResult.errors];

    const allWarnings = [...conflictResult.warnings, ...validation.warnings, ...complianceResult.warnings, ...skillResult.warnings, ...leaveResult.warnings];

    return {
      hasError: allErrors.length > 0,
      hasWarning: allWarnings.length > 0,
      warnings: [...allErrors, ...allWarnings],
    };
  }

  async deleteShift(scheduleId: string, shiftId: string): Promise<void> {
    const schedule = await this.getScheduleById(scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    const updatedShifts = schedule.shifts.filter(s => s.id !== shiftId);
    const updatedSchedule: ShiftSchedule = {
      ...schedule,
      shifts: updatedShifts,
      updatedAt: new Date(),
    };

    await dataStoreAdapter.updateSchedule(scheduleId, { 
      shifts: updatedShifts,
      updatedAt: updatedSchedule.updatedAt,
    });

    const allEvents = await this.getAllEvents();
    const eventToDelete = allEvents.find((e: CalendarEvent) => 
      e.eventType === 'shift' && e.shiftMetadata?.shiftId === shiftId
    );

    if (eventToDelete) {
      await this.deleteEvent(eventToDelete.id);
      eventBus.publish({
        type: 'deleted',
        entityType: 'event',
        entityId: eventToDelete.id,
      });
    }

    eventBus.publish({
      type: 'updated',
      entityType: 'shiftSchedule',
      entityId: scheduleId,
    });
  }

  async deleteSchedule(scheduleId: string): Promise<void> {
    const schedule = await this.getScheduleById(scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    const allEvents = await this.getAllEvents();
    const eventsToDelete = allEvents.filter(
      (e: CalendarEvent) => e.eventType === 'shift' && e.shiftMetadata?.scheduleId === scheduleId
    );

    for (const event of eventsToDelete) {
      await this.deleteEvent(event.id);
      eventBus.publish({
        type: 'deleted',
        entityType: 'event',
        entityId: event.id,
      });
    }

    await dataStoreAdapter.deleteSchedule(scheduleId);
    eventBus.publish({
      type: 'deleted',
      entityType: 'shiftSchedule',
      entityId: scheduleId,
    });
  }

  async duplicateSchedule(
    scheduleId: string,
    newStartDate?: Date,
    newEndDate?: Date
  ): Promise<ShiftSchedule> {
    const originalSchedule = await this.getScheduleById(scheduleId);
    if (!originalSchedule) {
      throw new Error('Schedule not found');
    }

    const startDate = newStartDate || originalSchedule.startDate;
    const endDate = newEndDate || originalSchedule.endDate;

    const newSchedule: ShiftSchedule = {
      id: uuidv4(),
      name: `${originalSchedule.name} (副本)`,
      description: originalSchedule.description,
      startDate,
      endDate,
      employees: [...originalSchedule.employees],
      shiftTypes: [...originalSchedule.shiftTypes],
      shifts: originalSchedule.shifts.map(shift => ({
        ...shift,
        id: uuidv4(),
        scheduleId: '',
      })),
      rules: [...originalSchedule.rules],
      createdAt: new Date(),
      updatedAt: new Date(),
      generatedBy: originalSchedule.generatedBy,
    };

    newSchedule.shifts = newSchedule.shifts.map(s => ({
      ...s,
      scheduleId: newSchedule.id,
    }));

    await dataStoreAdapter.addSchedule(newSchedule);

    for (const shift of newSchedule.shifts) {
      const event = this.convertShiftToEvent(shift, newSchedule);
      if (event) {
        await this.saveEvent(event);
        eventBus.publish({
          type: 'created',
          entityType: 'event',
          entityId: event.id,
        });
      }
    }

    eventBus.publish({
      type: 'created',
      entityType: 'shiftSchedule',
      entityId: newSchedule.id,
    });

    return newSchedule;
  }

  async swapShifts(
    scheduleId: string,
    shiftId1: string,
    shiftId2: string
  ): Promise<{ shift1: Shift; shift2: Shift }> {
    const schedule = await this.getScheduleById(scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    const shift1Index = schedule.shifts.findIndex(s => s.id === shiftId1);
    const shift2Index = schedule.shifts.findIndex(s => s.id === shiftId2);

    if (shift1Index === -1 || shift2Index === -1) {
      throw new Error('One or both shifts not found');
    }

    const shift1 = schedule.shifts[shift1Index];
    const shift2 = schedule.shifts[shift2Index];

    const newShift1: Shift = {
      ...shift1,
      employeeId: shift2.employeeId,
    };

    const newShift2: Shift = {
      ...shift2,
      employeeId: shift1.employeeId,
    };

    const updatedShifts = [...schedule.shifts];
    updatedShifts[shift1Index] = newShift1;
    updatedShifts[shift2Index] = newShift2;

    const updatedSchedule: ShiftSchedule = {
      ...schedule,
      shifts: updatedShifts,
      updatedAt: new Date(),
    };

    await dataStoreAdapter.updateSchedule(scheduleId, { 
      shifts: updatedShifts,
      updatedAt: updatedSchedule.updatedAt,
    });

    const allEvents = await this.getAllEvents();
    const event1 = allEvents.find((e: CalendarEvent) => 
      e.eventType === 'shift' && e.shiftMetadata?.shiftId === shiftId1
    );
    const event2 = allEvents.find((e: CalendarEvent) => 
      e.eventType === 'shift' && e.shiftMetadata?.shiftId === shiftId2
    );

    const updatedEvent1 = this.convertShiftToEvent(newShift1, updatedSchedule, event1);
    const updatedEvent2 = this.convertShiftToEvent(newShift2, updatedSchedule, event2);

    if (updatedEvent1) {
      await this.saveEvent(updatedEvent1);
      eventBus.publish({
        type: 'updated',
        entityType: 'event',
        entityId: updatedEvent1.id,
      });
    }

    if (updatedEvent2) {
      await this.saveEvent(updatedEvent2);
      eventBus.publish({
        type: 'updated',
        entityType: 'event',
        entityId: updatedEvent2.id,
      });
    }

    eventBus.publish({
      type: 'updated',
      entityType: 'shiftSchedule',
      entityId: scheduleId,
    });

    return { shift1: newShift1, shift2: newShift2 };
  }

  async syncAllShiftsToCalendar(): Promise<{
    syncedSchedules: number;
    syncedShifts: number;
    deletedEvents: number;
  }> {
    const schedules = await this.getSchedules();
    const allEvents = await this.getAllEvents();

    const existingShiftEventIds = new Set<string>();
    let syncedShifts = 0;

    for (const schedule of schedules) {
      for (const shift of schedule.shifts) {
        const event = this.convertShiftToEvent(shift, schedule);
        if (event) {
          existingShiftEventIds.add(event.id);
          await this.saveEvent(event);
          syncedShifts++;
        }
      }
    }

    const shiftEventsToDelete = allEvents.filter((e: CalendarEvent) => 
      e.eventType === 'shift' && !existingShiftEventIds.has(e.id)
    );

    for (const event of shiftEventsToDelete) {
      await this.deleteEvent(event.id);
    }

    return {
      syncedSchedules: schedules.length,
      syncedShifts,
      deletedEvents: shiftEventsToDelete.length,
    };
  }

  async syncScheduleToCalendar(scheduleId: string): Promise<{
    syncedShifts: number;
    deletedEvents: number;
  }> {
    const schedule = await this.getScheduleById(scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    const allEvents = await this.getAllEvents();

    const existingShiftEventIds = new Set<string>();
    let syncedShifts = 0;

    for (const shift of schedule.shifts) {
      const event = this.convertShiftToEvent(shift, schedule);
      if (event) {
        existingShiftEventIds.add(event.id);
        await this.saveEvent(event);
        syncedShifts++;
      }
    }

    const shiftEventsToDelete = allEvents.filter((e: CalendarEvent) => 
      e.eventType === 'shift' && 
      e.shiftMetadata?.scheduleId === scheduleId &&
      !existingShiftEventIds.has(e.id)
    );

    for (const event of shiftEventsToDelete) {
      await this.deleteEvent(event.id);
    }

    return {
      syncedShifts,
      deletedEvents: shiftEventsToDelete.length,
    };
  }

  async executeNlpCommand(
    input: string,
    scheduleId?: string
  ): Promise<{
    result: ShiftNlpResult;
    action: {
      type: string;
      shifts?: Shift[];
      message: string;
    };
  }> {
    const nlpResult = await parseShiftNlp(input);

    if (nlpResult.confidence < 0.5) {
      return {
        result: nlpResult,
        action: {
          type: 'unknown',
          message: '无法识别您的指令，请尝试更明确的表达',
        },
      };
    }

    let targetSchedule: ShiftSchedule | undefined;
    if (scheduleId) {
      targetSchedule = await this.getScheduleById(scheduleId);
    } else {
      const schedules = await this.getAllSchedules();
      if (schedules.length > 0) {
        targetSchedule = schedules[0];
      }
    }

    if (!targetSchedule) {
      return {
        result: nlpResult,
        action: {
          type: 'no_schedule',
          message: '没有找到排班计划，请先创建一个排班计划',
        },
      };
    }

    switch (nlpResult.action) {
      case 'query':
        return this.executeQuery(nlpResult, targetSchedule);
      case 'delete':
        return this.executeDelete(nlpResult, targetSchedule);
      case 'update':
        return this.executeUpdate(nlpResult, targetSchedule);
      case 'add':
        return {
          result: nlpResult,
          action: {
            type: 'add_not_supported',
            message: '添加排班请使用自然语言排班功能',
          },
        };
      default:
        return {
          result: nlpResult,
          action: {
            type: 'unknown',
            message: '不支持的操作类型',
          },
        };
    }
  }

  private async executeQuery(
    nlpResult: ShiftNlpResult,
    schedule: ShiftSchedule
  ): Promise<{
    result: ShiftNlpResult;
    action: {
      type: 'query';
      shifts: Shift[];
      message: string;
    };
  }> {
    let filteredShifts = [...schedule.shifts];

    if (nlpResult.criteria.employeeName) {
      const employee = schedule.employees.find(e => 
        e.name.includes(nlpResult.criteria.employeeName!)
      );
      if (employee) {
        filteredShifts = filteredShifts.filter(s => s.employeeId === employee.id);
      }
    }

    if (nlpResult.criteria.shiftName) {
      const shiftType = schedule.shiftTypes.find(t => 
        t.name.includes(nlpResult.criteria.shiftName!)
      );
      if (shiftType) {
        filteredShifts = filteredShifts.filter(s => s.shiftTypeId === shiftType.id);
      }
    }

    if (nlpResult.criteria.date) {
      const targetDate = nlpResult.criteria.date;
      filteredShifts = filteredShifts.filter(s => {
        const shiftDate = new Date(s.date);
        return shiftDate.toDateString() === targetDate.toDateString();
      });
    }

    let message = `找到 ${filteredShifts.length} 个排班`;
    if (filteredShifts.length === 0) {
      message = '没有找到匹配的排班';
    }

    return {
      result: nlpResult,
      action: {
        type: 'query',
        shifts: filteredShifts,
        message,
      },
    };
  }

  private async executeDelete(
    nlpResult: ShiftNlpResult,
    schedule: ShiftSchedule
  ): Promise<{
    result: ShiftNlpResult;
    action: {
      type: 'delete';
      shifts: Shift[];
      message: string;
    };
  }> {
    const queryResult = await this.executeQuery(nlpResult, schedule);
    const shiftsToDelete = queryResult.action.shifts;

    if (shiftsToDelete.length === 0) {
      return {
        result: nlpResult,
        action: {
          type: 'delete',
          shifts: [],
          message: '没有找到要删除的排班',
        },
      };
    }

    for (const shift of shiftsToDelete) {
      await this.deleteShift(schedule.id, shift.id);
    }

    return {
      result: nlpResult,
      action: {
        type: 'delete',
        shifts: shiftsToDelete,
        message: `已删除 ${shiftsToDelete.length} 个排班`,
      },
    };
  }

  private async executeUpdate(
    nlpResult: ShiftNlpResult,
    schedule: ShiftSchedule
  ): Promise<{
    result: ShiftNlpResult;
    action: {
      type: 'update';
      shifts: Shift[];
      message: string;
    };
  }> {
    const queryResult = await this.executeQuery(nlpResult, schedule);
    const shiftsToUpdate = queryResult.action.shifts;

    if (shiftsToUpdate.length === 0) {
      return {
        result: nlpResult,
        action: {
          type: 'update',
          shifts: [],
          message: '没有找到要修改的排班',
        },
      };
    }

    return {
      result: nlpResult,
      action: {
        type: 'update',
        shifts: shiftsToUpdate,
        message: '请选择要修改的内容',
      },
    };
  }
}

export const shiftService = ShiftService.getInstance();
