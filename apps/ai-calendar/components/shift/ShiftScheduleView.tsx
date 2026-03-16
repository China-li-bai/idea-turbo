'use client';

import { useState, useEffect } from 'react';
import {
  viewDay,
  viewMonthAgenda,
  viewMonthGrid,
  viewWeek,
} from '@schedule-x/calendar';
import { createDragAndDropPlugin } from '@schedule-x/drag-and-drop';
import { createEventModalPlugin } from '@schedule-x/event-modal';
import { ScheduleXCalendar, useNextCalendarApp } from '@schedule-x/react';
import '@schedule-x/theme-default/dist/index.css';
import 'temporal-polyfill/global';
import { useTheme } from 'nextra-theme-docs';
import { convertToScheduleXEvent } from '@/lib/utils/eventConverter';
import { detectUserLocale, loadScheduleXTranslations, type SupportedLocale } from '@/lib/utils/i18n';
import { shiftScheduleService } from '@/lib/ai/shiftScheduleService';
import type { CalendarEvent, Employee, ShiftType } from '@/types';
import styles from './shiftScheduleView.module.scss';

export default function ShiftScheduleView() {
  const { resolvedTheme } = useTheme();
  const [isMobile, setIsMobile] = useState(false);
  const [locale, setLocale] = useState<SupportedLocale>('zh-CN');
  const [translations, setTranslations] = useState<any>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [naturalLanguage, setNaturalLanguage] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [selectedStartDate, setSelectedStartDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedEndDate, setSelectedEndDate] = useState<string>(() => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return nextWeek.toISOString().split('T')[0];
  });
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    const detectedLocale = detectUserLocale();
    setLocale(detectedLocale);
    
    loadScheduleXTranslations(detectedLocale).then(t => {
      setTranslations(t);
    });

    setEmployees(shiftScheduleService.createSampleEmployees());
    setShiftTypes(shiftScheduleService.getDefaultShiftTypes());
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const sxEvents = events.map(event => convertToScheduleXEvent(event));

  const calendarApp = useNextCalendarApp({
    views: [viewMonthGrid, viewMonthAgenda, viewWeek, viewDay],
    selectedDate: Temporal.PlainDate.from(new Date().toISOString().split('T')[0]),
    isDark: resolvedTheme === 'dark',
    defaultView: isMobile ? viewMonthAgenda.name : viewWeek.name,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai',
    events: sxEvents,
    translations: translations,
    calendars: shiftTypes.reduce((acc, st) => ({
      ...acc,
      [st.id]: {
        colorName: st.id,
        lightColors: {
          main: st.color,
          container: `${st.color}20`,
          onContainer: '#000000',
        },
        darkColors: {
          main: st.color,
          onContainer: '#ffffff',
          container: `${st.color}40`,
        },
      },
    }), {}),
    plugins: [createDragAndDropPlugin(), createEventModalPlugin()],
  });

  const handleGenerateSchedule = async () => {
    if (!naturalLanguage.trim()) {
      alert('请输入排班需求描述');
      return;
    }

    setIsGenerating(true);
    setConflicts([]);
    setWarnings([]);

    try {
      const result = await shiftScheduleService.generateSchedule({
        naturalLanguage,
        startDate: new Date(selectedStartDate),
        endDate: new Date(selectedEndDate),
        employees,
        shiftTypes,
      });

      setEvents(result.events);
      setConflicts(result.conflicts);
      setWarnings(result.warnings);

      if (result.conflicts.length > 0) {
        alert(`排班完成，但存在 ${result.conflicts.length} 个冲突`);
      } else if (result.warnings.length > 0) {
        alert(`排班完成，有 ${result.warnings.length} 个警告`);
      } else {
        alert('排班完成！');
      }
    } catch (error) {
      console.error('排班失败:', error);
      alert('排班失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🗓️ 自然语言排班</h1>
        <p className={styles.subtitle}>用自然语言描述你的排班需求，AI 自动生成排班方案</p>
      </div>

      <div className={styles.content}>
        <div className={styles.sidebar}>
          <div className={styles.inputSection}>
            <label className={styles.label}>排班需求</label>
            <textarea
              className={styles.textarea}
              placeholder="例如：给5个员工安排下周的排班，每天需要2个人上班，周末尽量少排班，张三周一不能上班"
              value={naturalLanguage}
              onChange={(e) => setNaturalLanguage(e.target.value)}
              rows={6}
            />
          </div>

          <div className={styles.dateRange}>
            <div className={styles.dateInput}>
              <label className={styles.label}>开始日期</label>
              <input
                type="date"
                value={selectedStartDate}
                onChange={(e) => setSelectedStartDate(e.target.value)}
                className={styles.datePicker}
              />
            </div>
            <div className={styles.dateInput}>
              <label className={styles.label}>结束日期</label>
              <input
                type="date"
                value={selectedEndDate}
                onChange={(e) => setSelectedEndDate(e.target.value)}
                className={styles.datePicker}
              />
            </div>
          </div>

          <button
            className={styles.generateButton}
            onClick={handleGenerateSchedule}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <span className={styles.loading}>
                <span className={styles.spinner}></span>
                正在生成排班...
              </span>
            ) : (
              '✨ AI 智能排班'
            )}
          </button>

          {(conflicts.length > 0 || warnings.length > 0) && (
            <div className={styles.alerts}>
              {conflicts.length > 0 && (
                <div className={styles.conflicts}>
                  <h4>⚠️ 冲突</h4>
                  <ul>
                    {conflicts.map((conflict, i) => (
                      <li key={i}>{conflict}</li>
                    ))}
                  </ul>
                </div>
              )}
              {warnings.length > 0 && (
                <div className={styles.warnings}>
                  <h4>💡 提示</h4>
                  <ul>
                    {warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className={styles.employees}>
            <h3>员工列表</h3>
            <div className={styles.employeeList}>
              {employees.map((emp) => (
                <div key={emp.id} className={styles.employee}>
                  <div
                    className={styles.employeeColor}
                    style={{ backgroundColor: emp.color }}
                  ></div>
                  <span className={styles.employeeName}>{emp.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.shiftTypes}>
            <h3>班次类型</h3>
            <div className={styles.shiftTypeList}>
              {shiftTypes.map((st) => (
                <div key={st.id} className={styles.shiftType}>
                  <div
                    className={styles.shiftTypeColor}
                    style={{ backgroundColor: st.color }}
                  ></div>
                  <div className={styles.shiftTypeInfo}>
                    <span className={styles.shiftTypeName}>{st.name}</span>
                    <span className={styles.shiftTypeTime}>{st.startTime} - {st.endTime}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.calendar}>
          <ScheduleXCalendar calendarApp={calendarApp} />
        </div>
      </div>
    </div>
  );
}
