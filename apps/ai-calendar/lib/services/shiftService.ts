import { v4 as uuidv4 } from 'uuid';
import { db, getAllFromStore } from '@/lib/storage';
import { eventBus } from '@/lib/utils/eventBus';
import { aiService } from '@/lib/ai';
import { localScheduler } from './localScheduler';
import { privacySanitizer } from '@/lib/utils/privacy';
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

  async getSchedules(): Promise<ShiftSchedule[]> {
    return await getAllFromStore<ShiftSchedule>(db.schedules);
  }

  async getSchedule(id: string): Promise<ShiftSchedule | undefined> {
    return await db.schedules.getItem(id);
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
    await db.schedules.setItem(newSchedule.id, newSchedule);
    eventBus.publish({
      type: 'created',
      entityType: 'shift-schedule',
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
    const updatedSchedule: ShiftSchedule = {
      ...schedule,
      ...updates,
      updatedAt: new Date(),
    };
    await db.schedules.setItem(id, updatedSchedule);
    eventBus.publish({
      type: 'updated',
      entityType: 'shift-schedule',
      entityId: id,
    });
    return updatedSchedule;
  }

  async deleteSchedule(id: string): Promise<void> {
    await db.schedules.removeItem(id);
    eventBus.publish({
      type: 'deleted',
      entityType: 'shift-schedule',
      entityId: id,
    });
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

  convertShiftToEvent(
    shift: Shift,
    schedule: ShiftSchedule,
    existingEvent?: CalendarEvent
  ): CalendarEvent | null {
    const shiftType = schedule.shiftTypes.find(st => st.id === shift.shiftTypeId);
    const employee = schedule.employees.find(e => e.id === shift.employeeId);

    if (!shiftType || !employee) return null;

    const shiftDate = new Date(shift.date);
    const [startHour, startMinute] = shiftType.startTime.split(':').map(Number);
    const [endHour, endMinute] = shiftType.endTime.split(':').map(Number);

    const startTime = new Date(shiftDate);
    startTime.setHours(startHour, startMinute, 0, 0);

    let endTime = new Date(shiftDate);
    endTime.setHours(endHour, endMinute, 0, 0);

    if (endHour < startHour) {
      endTime.setDate(endTime.getDate() + 1);
    }

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
      generatedBy: 'local',
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
      await db.events.setItem(event.id, event);
      eventBus.publish({
        type: 'created',
        entityType: 'event',
        entityId: event.id,
      });
    }
  }

  async getAllSchedules(): Promise<ShiftSchedule[]> {
    return await getAllFromStore<ShiftSchedule>(db.schedules);
  }

  async getScheduleById(id: string): Promise<ShiftSchedule | undefined> {
    return await db.schedules.getItem(id);
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
    
    const allEvents = await getAllFromStore<CalendarEvent>(db.events);
    const otherEvents = allEvents.filter(e => 
      !(e.eventType === 'shift' && e.shiftMetadata?.shiftId === newShift.id)
    );

    const conflictResult = newEvent ? 
      this.detectConflicts([newEvent], otherEvents) : 
      { conflicts: [], warnings: [] };

    const updatedSchedule: ShiftSchedule = {
      ...schedule,
      shifts: [...schedule.shifts, newShift],
      updatedAt: new Date(),
    };

    await db.schedules.setItem(scheduleId, updatedSchedule);

    if (newEvent) {
      await db.events.setItem(newEvent.id, newEvent);
      eventBus.publish({
        type: 'created',
        entityType: 'event',
        entityId: newEvent.id,
      });
    }

    eventBus.publish({
      type: 'updated',
      entityType: 'shift-schedule',
      entityId: scheduleId,
    });
    eventBus.publish({
      type: 'created',
      entityType: 'shift',
      entityId: newShift.id,
      metadata: { scheduleId },
    });

    return {
      shift: newShift,
      event: newEvent,
      conflicts: conflictResult.conflicts,
      warnings: conflictResult.warnings,
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

    const updatedShifts = [...schedule.shifts];
    updatedShifts[shiftIndex] = updatedShift;

    const tempSchedule: ShiftSchedule = {
      ...schedule,
      shifts: updatedShifts,
    };

    const allEvents = await getAllFromStore<CalendarEvent>(db.events);
    const existingEvent = allEvents.find(e => 
      e.eventType === 'shift' && e.shiftMetadata?.shiftId === shiftId
    );

    const updatedEvent = this.convertShiftToEvent(updatedShift, tempSchedule, existingEvent);
    
    const otherEvents = allEvents.filter(e => e.id !== updatedEvent?.id);

    const conflictResult = updatedEvent ? 
      this.detectConflicts([updatedEvent], otherEvents) : 
      { conflicts: [], warnings: [] };

    const updatedSchedule: ShiftSchedule = {
      ...schedule,
      shifts: updatedShifts,
      updatedAt: new Date(),
    };

    await db.schedules.setItem(scheduleId, updatedSchedule);

    if (updatedEvent) {
      await db.events.setItem(updatedEvent.id, updatedEvent);
      eventBus.publish({
        type: 'updated',
        entityType: 'event',
        entityId: updatedEvent.id,
      });
    }

    eventBus.publish({
      type: 'updated',
      entityType: 'shift-schedule',
      entityId: scheduleId,
    });
    eventBus.publish({
      type: 'updated',
      entityType: 'shift',
      entityId: shiftId,
      metadata: { scheduleId },
    });

    return {
      shift: updatedShift,
      event: updatedEvent,
      conflicts: conflictResult.conflicts,
      warnings: conflictResult.warnings,
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
      return { hasError: false, hasWarning: false, warnings: [] };
    }

    const allEvents = await getAllFromStore<CalendarEvent>(db.events);
    const otherEvents = allEvents.filter(e => 
      !(e.eventType === 'shift' && e.shiftMetadata?.shiftId === tempShift.id)
    );

    return this.detectConflicts([tempEvent], otherEvents);
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

    await db.schedules.setItem(scheduleId, updatedSchedule);

    const allEvents = await getAllFromStore<CalendarEvent>(db.events);
    const eventToDelete = allEvents.find(e => 
      e.eventType === 'shift' && e.shiftMetadata?.shiftId === shiftId
    );

    if (eventToDelete) {
      await db.events.removeItem(eventToDelete.id);
      eventBus.publish({
        type: 'deleted',
        entityType: 'event',
        entityId: eventToDelete.id,
      });
    }

    eventBus.publish({
      type: 'updated',
      entityType: 'shift-schedule',
      entityId: scheduleId,
    });
    eventBus.publish({
      type: 'deleted',
      entityType: 'shift',
      entityId: shiftId,
      metadata: { scheduleId },
    });
  }

  async deleteSchedule(scheduleId: string): Promise<void> {
    const schedule = await this.getScheduleById(scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    const allEvents = await getAllFromStore<CalendarEvent>(db.events);
    const eventsToDelete = allEvents.filter(
      e => e.eventType === 'shift' && e.shiftMetadata?.scheduleId === scheduleId
    );

    for (const event of eventsToDelete) {
      await db.events.removeItem(event.id);
      eventBus.publish({
        type: 'deleted',
        entityType: 'event',
        entityId: event.id,
      });
    }

    await db.schedules.removeItem(scheduleId);
    eventBus.publish({
      type: 'deleted',
      entityType: 'shift-schedule',
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

    await db.schedules.setItem(newSchedule.id, newSchedule);
    eventBus.publish({
      type: 'created',
      entityType: 'shift-schedule',
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

    await db.schedules.setItem(scheduleId, updatedSchedule);
    eventBus.publish({
      type: 'updated',
      entityType: 'shift-schedule',
      entityId: scheduleId,
    });
    eventBus.publish({
      type: 'updated',
      entityType: 'shift',
      entityId: shiftId1,
      metadata: { scheduleId, action: 'swap' },
    });
    eventBus.publish({
      type: 'updated',
      entityType: 'shift',
      entityId: shiftId2,
      metadata: { scheduleId, action: 'swap' },
    });

    return { shift1: newShift1, shift2: newShift2 };
  }
}

export const shiftService = ShiftService.getInstance();
