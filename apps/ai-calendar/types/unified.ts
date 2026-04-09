export interface RepeatRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: number;
  daysOfWeek?: number[];
  monthDay?: number;
  month?: number;
}

export interface ShiftMetadata {
  scheduleId: string;
  shiftId: string;
  employeeId: string;
  employeeName: string;
  shiftTypeId: string;
  shiftTypeName: string;
}

export type LiquidState = 'pending' | 'tentative' | 'confirmed' | 'locked';
export type PriorityLevel = 1 | 2 | 3 | 4;

export interface LiquidScheduleMetadata {
  liquidGroupId?: string;
  liquidPriority?: number;
  liquidOriginalSlot?: number;
  liquidState?: LiquidState;
  priorityLevel?: PriorityLevel;
  deadline?: number;
  stabilityScore?: number;
  scheduledBy?: 'auto' | 'manual' | 'ai';
  lastScheduledAt?: number;
  constraintCheckPassed?: boolean;
  constraintViolations?: string[];
  flexibleDuration?: {
    minMinutes?: number;
    maxMinutes?: number;
    preferredMinutes?: number;
  };
  hardConstraints?: Array<{
    type: 'before' | 'after' | 'between' | 'on';
    date?: number;
    startTime?: string;
    endTime?: string;
    reason?: string;
  }>;
  preferredTimeSlots?: Array<{
    dayOfWeek?: number;
    startHour?: number;
    endHour?: number;
    score?: number;
  }>;
}

export interface ChecklistItem {
  id: string;
  content: string;
  completed: boolean;
  completedAt?: number;
  order: number;
}

export interface UnifiedCalendarItem {
  id: string;
  type: 'idea' | 'event';
  title: string;
  content: string;

  startTime: number | null;
  endTime: number | null;
  isAllDay: boolean;

  embedding: number[];
  embeddingUpdatedAt: number;

  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  createdAt: number;
  updatedAt: number;

  metadata: {
    location?: string;
    tags?: string[];
    priority?: 'high' | 'medium' | 'low';
    color?: string;
    description?: string;

    reminders?: number[];
    repeatRule?: RepeatRule;
    eventType?: 'regular' | 'shift' | 'meeting' | 'personal';
    shiftMetadata?: ShiftMetadata;

    extractedDate?: number;
    extractedTime?: string;
    extractedLocation?: string;
    extractedPeople?: string[];
    source?: 'keyboard' | 'voice' | 'clipboard' | 'other';

    previousType?: 'idea' | 'event';
    convertedAt?: number;
    conversionNotes?: string;

    parentGoalId?: string;
    milestones?: Array<{
      id: string;
      title: string;
      targetDate: number;
      completed?: boolean;
    }>;
    milestoneIndex?: number;
    totalMilestones?: number;
    estimatedMinutes?: number;

    liquidSchedule?: LiquidScheduleMetadata;

    rescheduleCount?: number;
    lastRescheduledAt?: number;
    rescheduleReason?: string;

    checklist?: ChecklistItem[];

    originalSlotStart?: number;
    originalSlotEnd?: number;
  };
}

export interface UserSettings {
  viewMode: 'boss' | 'secretary';
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
  lastBackupAt?: number;
}

export interface SearchResult {
  id: string;
  originalId: string;
  type: 'idea' | 'event';
  score: number;
  title: string;
  content: string;
  startTime: number | null;
  endTime: number | null;
  isAllDay: boolean;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  createdAt: number;
  updatedAt: number;
  metadata: UnifiedCalendarItem['metadata'];
}

export type ItemType = 'idea' | 'event';
export type ItemStatus = 'pending' | 'scheduled' | 'completed' | 'cancelled';
