import { v4 as uuidv4 } from 'uuid';
import type { ShiftSchedule, Shift, ShiftType, Employee } from '@/types';

export interface SchedulingConstraint {
  type: 
    | 'max_consecutive_shifts'
    | 'min_rest_hours'
    | 'unavailable_date'
    | 'forbidden_shift_type'
    | 'max_shifts_per_week'
    | 'load_balance';
  employeeId?: string;
  shiftTypeId?: string;
  date?: Date;
  value: number | string | boolean;
  priority: number;
}

export interface SchedulingResult {
  success: boolean;
  shifts: Shift[];
  conflicts: string[];
  warnings: string[];
  score: number;
}

export class LocalScheduler {
  private constraints: SchedulingConstraint[] = [];

  addConstraint(constraint: SchedulingConstraint) {
    this.constraints.push(constraint);
  }

  clearConstraints() {
    this.constraints = [];
  }

  schedule(
    startDate: Date,
    endDate: Date,
    employees: Employee[],
    shiftTypes: ShiftType[],
    shiftsPerDay: number = 1
  ): SchedulingResult {
    const result: SchedulingResult = {
      success: true,
      shifts: [],
      conflicts: [],
      warnings: [],
      score: 0,
    };

    const dates = this.generateDateRange(startDate, endDate);
    const employeeStats = this.initEmployeeStats(employees);

    for (const date of dates) {
      for (let shiftIndex = 0; shiftIndex < shiftsPerDay; shiftIndex++) {
        const shiftType = shiftTypes[shiftIndex % shiftTypes.length];
        const selectedEmployee = this.selectEmployee(
          date,
          shiftType,
          employees,
          employeeStats,
          result
        );

        if (selectedEmployee) {
          const shift: Shift = {
            id: uuidv4(),
            scheduleId: '',
            date: new Date(date),
            shiftTypeId: shiftType.id,
            employeeId: selectedEmployee.id,
          };
          result.shifts.push(shift);
          this.updateEmployeeStats(employeeStats, selectedEmployee.id, date, shiftType);
        } else {
          result.conflicts.push(`无法为 ${date.toLocaleDateString()} 的 ${shiftType.name} 找到合适员工`);
          result.success = false;
        }
      }
    }

    result.score = this.calculateScore(employeeStats, employees.length);
    this.addLoadBalanceWarnings(result, employeeStats);

    return result;
  }

  private generateDateRange(startDate: Date, endDate: Date): Date[] {
    const dates: Date[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }

  private initEmployeeStats(employees: Employee[]) {
    const stats: Record<string, { 
      totalShifts: number; 
      lastShiftDate?: Date;
      lastShiftType?: string;
      consecutiveShifts: number;
    }> = {};

    for (const emp of employees) {
      stats[emp.id] = {
        totalShifts: 0,
        consecutiveShifts: 0,
      };
    }

    return stats;
  }

  private selectEmployee(
    date: Date,
    shiftType: ShiftType,
    employees: Employee[],
    employeeStats: any,
    result: SchedulingResult
  ): Employee | null {
    const candidates = employees.filter(emp => {
      return this.checkConstraints(emp, date, shiftType, employeeStats);
    });

    if (candidates.length === 0) {
      return null;
    }

    candidates.sort((a, b) => {
      const statsA = employeeStats[a.id];
      const statsB = employeeStats[b.id];
      
      if (statsA.totalShifts !== statsB.totalShifts) {
        return statsA.totalShifts - statsB.totalShifts;
      }
      
      if (statsA.consecutiveShifts !== statsB.consecutiveShifts) {
        return statsA.consecutiveShifts - statsB.consecutiveShifts;
      }
      
      return Math.random() - 0.5;
    });

    return candidates[0];
  }

  private checkConstraints(
    employee: Employee,
    date: Date,
    shiftType: ShiftType,
    employeeStats: any
  ): boolean {
    const stats = employeeStats[employee.id];
    const constraints = employee.constraints || {};
    const preferences = employee.preferences || {};

    if (constraints.unavailableDates) {
      const isUnavailable = constraints.unavailableDates.some(
        d => d.toDateString() === date.toDateString()
      );
      if (isUnavailable) return false;
    }

    if (constraints.forbiddenShifts?.includes(shiftType.id)) {
      return false;
    }

    if (constraints.maxConsecutiveShifts && 
        stats.consecutiveShifts >= constraints.maxConsecutiveShifts) {
      return false;
    }

    if (preferences.preferredShifts && 
        preferences.preferredShifts.length > 0 &&
        !preferences.preferredShifts.includes(shiftType.id)) {
    }

    if (preferences.preferredDaysOff && 
        preferences.preferredDaysOff.includes(date.getDay())) {
    }

    return true;
  }

  private updateEmployeeStats(
    employeeStats: any,
    employeeId: string,
    date: Date,
    shiftType: ShiftType
  ) {
    const stats = employeeStats[employeeId];
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);

    if (stats.lastShiftDate && 
        stats.lastShiftDate.toDateString() === yesterday.toDateString()) {
      stats.consecutiveShifts++;
    } else {
      stats.consecutiveShifts = 1;
    }

    stats.totalShifts++;
    stats.lastShiftDate = new Date(date);
    stats.lastShiftType = shiftType.id;
  }

  private calculateScore(employeeStats: any, employeeCount: number): number {
    if (employeeCount === 0) return 0;

    const shiftCounts = Object.values(employeeStats).map((s: any) => s.totalShifts);
    const avg = shiftCounts.reduce((a, b) => a + b, 0) / shiftCounts.length;
    const variance = shiftCounts.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / shiftCounts.length;
    const stdDev = Math.sqrt(variance);

    const maxScore = 100;
    const penalty = stdDev * 5;
    
    return Math.max(0, maxScore - penalty);
  }

  private addLoadBalanceWarnings(result: SchedulingResult, employeeStats: any) {
    const entries = Object.entries(employeeStats);
    if (entries.length < 2) return;

    const shiftCounts = entries.map(([id, stats]: [string, any]) => ({
      id,
      count: stats.totalShifts,
    }));

    shiftCounts.sort((a, b) => b.count - a.count);
    const max = shiftCounts[0].count;
    const min = shiftCounts[shiftCounts.length - 1].count;

    if (max - min > 2) {
      result.warnings.push(`工作负荷不均衡：最多 ${max} 班，最少 ${min} 班`);
    }
  }
}

export const localScheduler = new LocalScheduler();
