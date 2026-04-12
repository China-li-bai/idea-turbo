export type {
  UnifiedCalendarItem,
  RepeatRule,
  ShiftMetadata,
  LiquidState,
  PriorityLevel,
  LiquidScheduleMetadata,
  ChecklistItem,
  UserSettings,
  SearchResult,
  ItemType,
  ItemStatus,
} from './unified';

export interface ShiftType {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
  description?: string;
  requiredSkills?: string[];
}

export interface Employee {
  id: string;
  name: string;
  color: string;
  email?: string;
  phone?: string;
  skills?: string[];

  preferences?: {
    preferredShifts?: string[];
    preferredDaysOff?: number[];
    maxShiftsPerWeek?: number;
    minRestDays?: number;
  };

  constraints?: {
    unavailableDates?: number[];
    forbiddenShifts?: string[];
    maxConsecutiveShifts?: number;
  };

  stats?: {
    totalShifts?: number;
    shiftsThisWeek?: number;
    lastShiftDate?: number;
  };
}

export interface Shift {
  id: string;
  scheduleId: string;
  date: number;
  shiftTypeId: string;
  employeeId: string;
  isLocked?: boolean;
  notes?: string;
}

export interface ShiftSchedule {
  id: string;
  name: string;
  description?: string;
  startDate: number;
  endDate: number;

  employees: Employee[];
  shiftTypes: ShiftType[];
  shifts: Shift[];
  rules: ScheduleRule[];

  createdAt: number;
  updatedAt: number;
  generatedBy?: 'manual' | 'ai' | 'hybrid';
}

export interface ScheduleRule {
  id: string;
  type:
    | 'maxShiftsPerWeek'
    | 'minRestDays'
    | 'requiredEmployee'
    | 'forbiddenEmployee'
    | 'minEmployeesPerShift'
    | 'maxEmployeesPerShift'
    | 'custom';
  value: number | string | string[];
  appliesTo?: string[];
  priority: number;
}

export interface SearchHistory {
  id: string;
  query: string;
  timestamp: number;
  resultsCount: number;
  resultClickedIds?: string[];

  type: 'vector' | 'keyword' | 'hybrid';
  filters?: {
    dateRange?: { start: number; end: number };
    eventTypes?: string[];
    viewModes?: string[];
  };
}
