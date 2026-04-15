export interface TimeConfig {
  workHours: {
    start: number;
    end: number;
  };
  workDays: number[];
  defaultDuration: number;
  bufferMinutes: number;
  maxSearchDays: number;
  slotInterval: number;
  timeOfDay: {
    morning: { start: number; end: number };
    afternoon: { start: number; end: number };
    evening: { start: number; end: number };
    night: { start: number; end: number };
    noon: { start: number; end: number };
    dawn: { start: number; end: number };
    earlyMorning: { start: number; end: number };
    dusk: { start: number; end: number };
  };
  shortRelativeTime: {
    justNow: number;
    inAMoment: number;
    shortly: number;
    soon: number;
    inAWhile: number;
  };
  duration: {
    hour: number;
    day: number;
    halfDay: number;
    halfHour: number;
  };
}

const DEFAULT_TIME_CONFIG: TimeConfig = {
  workHours: {
    start: 9,
    end: 18,
  },
  workDays: [1, 2, 3, 4, 5],
  defaultDuration: 60,
  bufferMinutes: 15,
  maxSearchDays: 14,
  slotInterval: 30,
  timeOfDay: {
    morning: { start: 9, end: 12 },
    afternoon: { start: 14, end: 18 },
    evening: { start: 18, end: 22 },
    night: { start: 18, end: 23 },
    noon: { start: 12, end: 14 },
    dawn: { start: 0, end: 6 },
    earlyMorning: { start: 6, end: 9 },
    dusk: { start: 17, end: 19 },
  },
  shortRelativeTime: {
    justNow: 5,
    inAMoment: 10,
    shortly: 15,
    soon: 20,
    inAWhile: 30,
  },
  duration: {
    hour: 60,
    day: 480,
    halfDay: 240,
    halfHour: 30,
  },
};

export class TimeConfigManager {
  private static instance: TimeConfigManager;
  private config: TimeConfig | null = null;
  private listeners: Set<(config: TimeConfig) => void> = new Set();

  static getInstance(): TimeConfigManager {
    if (!TimeConfigManager.instance) {
      TimeConfigManager.instance = new TimeConfigManager();
    }
    return TimeConfigManager.instance;
  }

  getConfig(): TimeConfig {
    if (!this.config) {
      this.config = { ...DEFAULT_TIME_CONFIG };
    }
    return this.config;
  }

  updateConfig(newConfig: Partial<TimeConfig>): void {
    this.config = {
      ...this.getConfig(),
      ...newConfig,
    };
    this.notifyListeners();
  }

  updateWorkHours(start: number, end: number): void {
    const config = this.getConfig();
    config.workHours = { start, end };
    this.notifyListeners();
  }

  updateWorkDays(days: number[]): void {
    const config = this.getConfig();
    config.workDays = days;
    this.notifyListeners();
  }

  updateDefaultDuration(duration: number): void {
    const config = this.getConfig();
    config.defaultDuration = duration;
    this.notifyListeners();
  }

  updateBufferMinutes(minutes: number): void {
    const config = this.getConfig();
    config.bufferMinutes = minutes;
    this.notifyListeners();
  }

  updateMaxSearchDays(days: number): void {
    const config = this.getConfig();
    config.maxSearchDays = days;
    this.notifyListeners();
  }

  updateSlotInterval(minutes: number): void {
    const config = this.getConfig();
    config.slotInterval = minutes;
    this.notifyListeners();
  }

  updateTimeOfDay(
    period: keyof TimeConfig['timeOfDay'],
    start: number,
    end: number
  ): void {
    const config = this.getConfig();
    config.timeOfDay[period] = { start, end };
    this.notifyListeners();
  }

  subscribe(listener: (config: TimeConfig) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const config = this.getConfig();
    this.listeners.forEach((listener) => listener(config));
  }

  resetToDefaults(): void {
    this.config = { ...DEFAULT_TIME_CONFIG };
    this.notifyListeners();
  }
}

export const timeConfigManager = TimeConfigManager.getInstance();
export const DEFAULT_TIME_CONFIG_READONLY = DEFAULT_TIME_CONFIG;
