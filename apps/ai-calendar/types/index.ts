export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  isAllDay: boolean;
  repeatRule?: RepeatRule;
  reminders: number[];
  viewMode: 'boss' | 'assistant';
  linkedTaskIds?: string[];
  color?: string;
}

export interface RepeatRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: Date;
  daysOfWeek?: number[];
}

export interface Task {
  id: string;
  eventId: string;
  title: string;
  description?: string;
  dueTime?: Date;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  resources?: Resource[];
}

export interface Resource {
  id: string;
  type: 'document' | 'vehicle' | 'hotel' | 'restaurant' | 'other';
  name: string;
  details?: string;
  contact?: string;
}

export interface Inspiration {
  id: string;
  content: string;
  captureTime: Date;
  type: 'todo' | 'event' | 'note' | 'raw';
  processed: boolean;
  extractedDate?: Date;
}

export interface ShiftSchedule {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  employees: Employee[];
  shifts: Shift[];
  rules: ScheduleRule[];
}

export interface Employee {
  id: string;
  name: string;
  color: string;
  preferences?: string[];
  constraints?: string[];
}

export interface Shift {
  id: string;
  date: Date;
  shiftType: string;
  employeeId: string;
}

export interface ScheduleRule {
  type: 'maxShiftsPerWeek' | 'minRestDays' | 'requiredEmployee' | 'forbiddenEmployee';
  value: number | string | string[];
}

export interface UserSettings {
  viewMode: 'boss' | 'assistant' | 'personal';
  firstDayOfWeek: number;
  theme: 'light' | 'dark' | 'system';
  language: string;
}
