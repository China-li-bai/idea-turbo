import type { Employee, ShiftType } from '@/types';

export interface SanitizedEmployee {
  id: string;
  anonymizedName: string;
  unavailableDateCount: number;
  forbiddenShiftTypeCount: number;
  preferredShiftCount: number;
  preferredDayOffCount: number;
}

export interface SanitizedData {
  employees: SanitizedEmployee[];
  shiftTypeCount: number;
  dateRangeDays: number;
  hasConstraints: boolean;
  hasPreferences: boolean;
}

export class PrivacySanitizer {
  private employeeNameMap: Map<string, string> = new Map();
  private employeeCounter: number = 0;

  sanitizeEmployee(employee: Employee): SanitizedEmployee {
    const anonymizedName = this.getAnonymizedName(employee.id);

    return {
      id: employee.id,
      anonymizedName,
      unavailableDateCount: employee.constraints?.unavailableDates?.length || 0,
      forbiddenShiftTypeCount: employee.constraints?.forbiddenShifts?.length || 0,
      preferredShiftCount: employee.preferences?.preferredShifts?.length || 0,
      preferredDayOffCount: employee.preferences?.preferredDaysOff?.length || 0,
    };
  }

  sanitizeEmployees(employees: Employee[]): SanitizedEmployee[] {
    return employees.map(emp => this.sanitizeEmployee(emp));
  }

  sanitizeNaturalLanguage(text: string): string {
    let sanitized = text;

    sanitized = sanitized.replace(
      /张三|李四|王五|赵六|钱七|孙八|周九|吴十/g,
      (match) => this.getAnonymizedNameForText(match)
    );

    sanitized = sanitized.replace(/1[3-9]\d{9}/g, '[手机号]');
    sanitized = sanitized.replace(/\d{17}[\dXx]/g, '[身份证号]');
    sanitized = sanitized.replace(/\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*/g, '[邮箱]');

    return sanitized;
  }

  sanitizeForAI(
    naturalLanguage: string,
    employees: Employee[],
    shiftTypes: ShiftType[],
    startDate: number,
    endDate: number
  ): {
    sanitizedPrompt: string;
    sanitizedData: SanitizedData;
  } {
    const sanitizedText = this.sanitizeNaturalLanguage(naturalLanguage);
    const sanitizedEmployees = this.sanitizeEmployees(employees);
    const dateRangeDays = Math.ceil(
      (endDate - startDate) / (1000 * 60 * 60 * 24)
    ) + 1;

    const hasConstraints = employees.some(
      e => (e.constraints?.unavailableDates?.length || 0) > 0 || 
           (e.constraints?.forbiddenShifts?.length || 0) > 0
    );

    const hasPreferences = employees.some(
      e => (e.preferences?.preferredShifts?.length || 0) > 0 || 
           (e.preferences?.preferredDaysOff?.length || 0) > 0
    );

    let sanitizedPrompt = sanitizedText;
    sanitizedEmployees.forEach((emp, idx) => {
      const originalEmployee = employees[idx];
      sanitizedPrompt = sanitizedPrompt.replace(
        new RegExp(originalEmployee.name, 'g'),
        emp.anonymizedName
      );
    });

    return {
      sanitizedPrompt,
      sanitizedData: {
        employees: sanitizedEmployees,
        shiftTypeCount: shiftTypes.length,
        dateRangeDays,
        hasConstraints,
        hasPreferences,
      },
    };
  }

  restoreEmployeeName(anonymizedName: string): string | null {
    for (const [originalId, anonymized] of this.employeeNameMap.entries()) {
      if (anonymized === anonymizedName) {
        return originalId;
      }
    }
    return null;
  }

  private getAnonymizedName(employeeId: string): string {
    if (this.employeeNameMap.has(employeeId)) {
      return this.employeeNameMap.get(employeeId)!;
    }
    this.employeeCounter++;
    const anonymized = `员工${this.employeeCounter}`;
    this.employeeNameMap.set(employeeId, anonymized);
    return anonymized;
  }

  private getAnonymizedNameForText(name: string): string {
    const id = `text_${name}`;
    if (this.employeeNameMap.has(id)) {
      return this.employeeNameMap.get(id)!;
    }
    this.employeeCounter++;
    const anonymized = `员工${this.employeeCounter}`;
    this.employeeNameMap.set(id, anonymized);
    return anonymized;
  }

  reset() {
    this.employeeNameMap.clear();
    this.employeeCounter = 0;
  }
}

export class DifferentialPrivacy {
  static addLaplaceNoise(
    value: number,
    epsilon: number,
    sensitivity: number = 1
  ): number {
    const scale = sensitivity / epsilon;
    const u = Math.random() - 0.5;
    const noise = -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
    return value + noise;
  }

  static addGaussianNoise(
    value: number,
    epsilon: number,
    delta: number,
    sensitivity: number = 1
  ): number {
    const sigma = sensitivity * Math.sqrt(2 * Math.log(1.25 / delta)) / epsilon;
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return value + sigma * z;
  }

  static sanitizeCount(
    count: number,
    epsilon: number = 1.0,
    minValue: number = 0,
    maxValue: number = 100
  ): number {
    const noisy = this.addLaplaceNoise(count, epsilon);
    return Math.max(minValue, Math.min(maxValue, Math.round(noisy)));
  }
}

export const privacySanitizer = new PrivacySanitizer();
