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

  viewMode: 'boss' | 'assistant' | 'personal';
  linkedEventId?: string;
  linkedTaskIds?: string[];

  vectorId?: string;
  embeddingUpdatedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
  color?: string;

  eventType: 'regular' | 'shift' | 'meeting' | 'personal';
  shiftMetadata?: {
    scheduleId: string;
    shiftId: string;
    employeeId: string;
    employeeName: string;
    shiftTypeId: string;
    shiftTypeName: string;
  };
}

export interface RepeatRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: Date;
  daysOfWeek?: number[];
  monthDay?: number;
  month?: number;
}

export interface Task {
  id: string;
  eventId?: string;
  title: string;
  description?: string;
  dueTime?: Date;
  completed: boolean;
  completedAt?: Date;
  priority: 'high' | 'medium' | 'low';

  resources?: Resource[];

  dependsOnTaskIds?: string[];

  vectorId?: string;
  embeddingUpdatedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export interface Resource {
  id: string;
  type: 'document' | 'vehicle' | 'hotel' | 'restaurant' | 'contact' | 'other';
  name: string;
  details?: string;
  contact?: string;
  url?: string;
  metadata?: Record<string, any>;
}

export interface Inspiration {
  id: string;
  content: string;
  captureTime: Date;
  type: 'todo' | 'event' | 'note' | 'raw';
  processed: boolean;
  processedAt?: Date;

  extractedDate?: Date;
  extractedTime?: string;
  extractedLocation?: string;
  extractedPeople?: string[];

  convertedToEventId?: string;
  convertedToTaskId?: string;
  conversionNotes?: string;

  vectorId?: string;
  embeddingUpdatedAt?: Date;

  source?: 'keyboard' | 'voice' | 'clipboard' | 'other';

  createdAt?: Date;
  updatedAt?: Date;
}

export interface ShiftSchedule {
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
    unavailableDates?: Date[];
    forbiddenShifts?: string[];
    maxConsecutiveShifts?: number;
  };

  stats?: {
    totalShifts?: number;
    shiftsThisWeek?: number;
    lastShiftDate?: Date;
  };
}

export interface Shift {
  id: string;
  scheduleId: string;
  date: Date;
  shiftTypeId: string;
  employeeId: string;
  isLocked?: boolean;
  notes?: string;
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

export interface UserSettings {
  viewMode: 'boss' | 'assistant' | 'personal';
  defaultCalendarView: 'day' | 'week' | 'month' | 'agenda';
  firstDayOfWeek: number;
  showWeekends: boolean;
  workingHours: {
    start: string;
    end: string;
  };

  theme: 'light' | 'dark' | 'system';
  accentColor: string;

  language: string;

  defaultReminders: number[];
  reminderSound: boolean;
  reminderNotification: boolean;

  aiMode: 'local-only' | 'hybrid' | 'api-only';
  apiEndpoint?: string;
  apiKey?: string;

  vectorSearchEnabled: boolean;
  autoSyncEmbeddings: boolean;
  embeddingModel: string;

  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  lastBackupAt?: Date;
}

export interface SearchHistory {
  id: string;
  query: string;
  timestamp: Date;
  resultsCount: number;
  resultClickedIds?: string[];

  type: 'vector' | 'keyword' | 'hybrid';
  filters?: {
    dateRange?: { start: Date; end: Date };
    eventTypes?: string[];
    viewModes?: string[];
  };
}

export interface SearchResult {
  id: string;
  originalId: string;
  type: string;
  score: number;
  title: string;
  content: string;
  metadata: any;
}
