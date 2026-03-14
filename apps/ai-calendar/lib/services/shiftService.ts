import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/storage';
import { eventBus } from '@/lib/utils/eventBus';
import { aiService } from '@/lib/ai';
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
    return await db.shifts.getAllFromStore('schedules');
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

    const systemPrompt = `你是一个专业的排班助手。请根据用户的自然语言描述生成排班表。

要求：
1. 日期范围：从 ${startDate.toISOString().split('T')[0]} 到 ${endDate.toISOString().split('T')[0]}
2. 可用班次类型：
${defaultShiftTypes.map(st => `- ${st.name}: ${st.startTime}-${st.endTime} (ID: ${st.id})`).join('\n')}
3. 可用员工：
${defaultEmployees.map(e => `- ${e.name} (ID: ${e.id})`).join('\n')}

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
      { role: 'user', content: naturalLanguage },
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

    const shifts: Shift[] = parsedResult.shifts.map(s => ({
      id: uuidv4(),
      scheduleId: '',
      date: new Date(s.date),
      shiftTypeId: s.shiftTypeId,
      employeeId: s.employeeId,
      notes: s.notes,
    }));

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

    return { schedule, events };
  }

  convertShiftsToEvents(schedule: ShiftSchedule): CalendarEvent[] {
    const events: CalendarEvent[] = [];

    for (const shift of schedule.shifts) {
      const shiftType = schedule.shiftTypes.find(st => st.id === shift.shiftTypeId);
      const employee = schedule.employees.find(e => e.id === shift.employeeId);

      if (!shiftType || !employee) continue;

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
        id: uuidv4(),
        title: `${employee.name} - ${shiftType.name}`,
        description: shift.notes,
        startTime,
        endTime,
        isAllDay: false,
        reminders: [],
        viewMode: 'personal',
        createdAt: new Date(),
        updatedAt: new Date(),
        color: shiftType.color,
      };

      events.push(event);
    }

    return events;
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
}

export const shiftService = ShiftService.getInstance();
