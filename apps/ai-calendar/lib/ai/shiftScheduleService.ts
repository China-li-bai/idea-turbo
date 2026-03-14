import { aiService } from './index';
import { v4 as uuidv4 } from 'uuid';
import type {
  ShiftSchedule,
  Shift,
  ShiftType,
  Employee,
  ScheduleRule,
  CalendarEvent,
} from '@/types';

export interface ShiftScheduleRequest {
  naturalLanguage: string;
  startDate: Date;
  endDate: Date;
  employees: Employee[];
  shiftTypes?: ShiftType[];
  rules?: ScheduleRule[];
}

export interface ShiftScheduleResult {
  schedule: ShiftSchedule;
  events: CalendarEvent[];
  conflicts: string[];
  warnings: string[];
}

const DEFAULT_SHIFT_TYPES: ShiftType[] = [
  {
    id: 'morning',
    name: '早班',
    startTime: '08:00',
    endTime: '16:00',
    color: '#3b82f6',
    description: '早上8点到下午4点',
  },
  {
    id: 'afternoon',
    name: '中班',
    startTime: '14:00',
    endTime: '22:00',
    color: '#f59e0b',
    description: '下午2点到晚上10点',
  },
  {
    id: 'night',
    name: '夜班',
    startTime: '22:00',
    endTime: '06:00',
    color: '#8b5cf6',
    description: '晚上10点到次日早上6点',
  },
  {
    id: 'day',
    name: '白班',
    startTime: '09:00',
    endTime: '18:00',
    color: '#10b981',
    description: '早上9点到下午6点',
  },
];

export class ShiftScheduleService {
  async generateSchedule(
    request: ShiftScheduleRequest
  ): Promise<ShiftScheduleResult> {
    const shiftTypes = request.shiftTypes || DEFAULT_SHIFT_TYPES;

    const systemPrompt = `你是一个专业的排班助手。请根据用户的自然语言描述，生成合理的排班方案。

返回格式要求：请返回纯 JSON，不要包含任何其他文字。JSON 格式如下：

{
  "shifts": [
    {
      "date": "YYYY-MM-DD",
      "shiftTypeId": "morning|afternoon|night|day",
      "employeeId": "员工ID"
    }
  ],
  "conflicts": ["冲突描述1", "冲突描述2"],
  "warnings": ["警告1", "警告2"]
}

排班规则：
1. 每个员工每天最多安排一个班次
2. 尽量平衡每个员工的工作天数
3. 考虑员工的偏好和约束
4. 夜班后至少休息一天
5. 周末可以安排更少的班次

可用的班次类型：
${shiftTypes.map(st => `- ${st.id}: ${st.name} (${st.startTime}-${st.endTime})`).join('\n')}

员工列表：
${request.employees.map(e => `- ${e.id}: ${e.name}`).join('\n')}

排班日期范围：
从 ${request.startDate.toISOString().split('T')[0]} 到 ${request.endDate.toISOString().split('T')[0]}`;

    const userPrompt = `请根据以下自然语言描述生成排班方案：

${request.naturalLanguage}`;

    try {
      const response = await aiService.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ], {
        temperature: 0.3,
        max_tokens: 4000,
      });

      const content = response.choices[0].message.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('AI 返回格式错误，请重试');
      }

      const aiResult = JSON.parse(jsonMatch[0]);

      const schedule = this.createScheduleFromAIResult(
        aiResult,
        request,
        shiftTypes
      );

      const events = this.convertShiftsToEvents(
        schedule.shifts,
        shiftTypes,
        request.employees
      );

      return {
        schedule,
        events,
        conflicts: aiResult.conflicts || [],
        warnings: aiResult.warnings || [],
      };
    } catch (error) {
      console.error('排班生成失败:', error);
      throw error;
    }
  }

  private createScheduleFromAIResult(
    aiResult: any,
    request: ShiftScheduleRequest,
    shiftTypes: ShiftType[]
  ): ShiftSchedule {
    const now = new Date();
    const scheduleId = uuidv4();

    const shifts: Shift[] = aiResult.shifts.map((s: any) => ({
      id: uuidv4(),
      scheduleId,
      date: new Date(s.date),
      shiftTypeId: s.shiftTypeId,
      employeeId: s.employeeId,
      isLocked: false,
    }));

    return {
      id: scheduleId,
      name: 'AI 生成的排班',
      description: request.naturalLanguage,
      startDate: request.startDate,
      endDate: request.endDate,
      employees: request.employees,
      shiftTypes,
      shifts,
      rules: request.rules || [],
      createdAt: now,
      updatedAt: now,
      generatedBy: 'ai',
    };
  }

  private convertShiftsToEvents(
    shifts: Shift[],
    shiftTypes: ShiftType[],
    employees: Employee[]
  ): CalendarEvent[] {
    const now = new Date();

    return shifts.map(shift => {
      const shiftType = shiftTypes.find(st => st.id === shift.shiftTypeId);
      const employee = employees.find(e => e.id === shift.employeeId);

      const dateStr = shift.date.toISOString().split('T')[0];
      const [startHour, startMin] = shiftType!.startTime.split(':').map(Number);
      const [endHour, endMin] = shiftType!.endTime.split(':').map(Number);

      const startTime = new Date(shift.date);
      startTime.setHours(startHour, startMin, 0, 0);

      const endTime = new Date(shift.date);
      endTime.setHours(endHour, endMin, 0, 0);

      if (endHour < startHour) {
        endTime.setDate(endTime.getDate() + 1);
      }

      return {
        id: uuidv4(),
        title: `${employee?.name || '未知员工'} - ${shiftType?.name || shift.shiftTypeId}`,
        description: shift.notes,
        startTime,
        endTime,
        isAllDay: false,
        reminders: [],
        viewMode: 'personal',
        createdAt: now,
        updatedAt: now,
        color: employee?.color || shiftType?.color,
      };
    });
  }

  getDefaultShiftTypes(): ShiftType[] {
    return [...DEFAULT_SHIFT_TYPES];
  }

  createSampleEmployees(): Employee[] {
    return [
      { id: 'emp-1', name: '张三', color: '#3b82f6' },
      { id: 'emp-2', name: '李四', color: '#10b981' },
      { id: 'emp-3', name: '王五', color: '#f59e0b' },
      { id: 'emp-4', name: '赵六', color: '#ef4444' },
      { id: 'emp-5', name: '钱七', color: '#8b5cf6' },
    ];
  }
}

export const shiftScheduleService = new ShiftScheduleService();
