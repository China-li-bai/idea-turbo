'use client';

import { useState } from 'react';
import { shiftService } from '@/lib/services/shiftService';
import type { ShiftSchedule, CalendarEvent } from '@/types';
import styles from './shiftScheduler.module.scss';

interface ShiftSchedulerProps {
  onScheduleCreated?: (schedule: ShiftSchedule, events: CalendarEvent[]) => void;
}

export default function ShiftScheduler({ onScheduleCreated }: ShiftSchedulerProps) {
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSchedule, setGeneratedSchedule] = useState<{
    schedule: ShiftSchedule;
    events: CalendarEvent[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!input.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const result = await shiftService.generateScheduleFromNaturalLanguage(input);
      setGeneratedSchedule(result);
      
      if (onScheduleCreated) {
        onScheduleCreated(result.schedule, result.events);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成排班失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedSchedule) return;
    
    try {
      await shiftService.saveGeneratedSchedule(
        generatedSchedule.schedule,
        generatedSchedule.events
      );
      setInput('');
      setGeneratedSchedule(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存排班失败');
    }
  };

  const handleClear = () => {
    setInput('');
    setGeneratedSchedule(null);
    setError(null);
  };

  const examplePrompts = [
    '下周一到周五，张三早班，李四中班，王五晚班',
    '本周三开始，张三和李四轮流早班和中班',
    '周末两天，安排三个人轮班，每天两个班次',
  ];

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>自然语言排班</h2>
      
      <div className={styles.inputSection}>
        <textarea
          className={styles.textarea}
          placeholder="用自然语言描述排班需求，例如：下周一开始，张三早班，李四中班，王五晚班..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isGenerating}
          rows={4}
        />
        
        <div className={styles.quickExamples}>
          <span className={styles.quickLabel}>快速示例：</span>
          {examplePrompts.map((prompt, idx) => (
            <button
              key={idx}
              className={styles.exampleBtn}
              onClick={() => setInput(prompt)}
              disabled={isGenerating}
            >
              {prompt}
            </button>
          ))}
        </div>
        
        <div className={styles.buttonGroup}>
          <button
            className={`${styles.button} ${styles.primary}`}
            onClick={handleGenerate}
            disabled={isGenerating || !input.trim()}
          >
            {isGenerating ? '生成中...' : '🪄 生成排班'}
          </button>
          {generatedSchedule && (
            <>
              <button
                className={`${styles.button} ${styles.success}`}
                onClick={handleSave}
              >
                💾 保存到日历
              </button>
              <button
                className={`${styles.button} ${styles.secondary}`}
                onClick={handleClear}
              >
                清除
              </button>
            </>
          )}
        </div>
      </div>
      
      {error && (
        <div className={styles.error}>
          ⚠️ {error}
        </div>
      )}
      
      {generatedSchedule && (
        <div className={styles.previewSection}>
          <h3 className={styles.previewTitle}>📋 排班预览</h3>
          
          <div className={styles.employeeList}>
            <h4>员工</h4>
            <div className={styles.employeeCards}>
              {generatedSchedule.schedule.employees.map(emp => (
                <div
                  key={emp.id}
                  className={styles.employeeCard}
                  style={{ borderLeftColor: emp.color }}
                >
                  <span style={{ backgroundColor: emp.color }} className={styles.avatar}></span>
                  {emp.name}
                </div>
              ))}
            </div>
          </div>
          
          <div className={styles.shiftTypeList}>
            <h4>班次类型</h4>
            <div className={styles.shiftCards}>
              {generatedSchedule.schedule.shiftTypes.map(st => (
                <div
                  key={st.id}
                  className={styles.shiftCard}
                  style={{ backgroundColor: st.color + '20', borderColor: st.color }}
                >
                  <span style={{ color: st.color }} className={styles.shiftName}>{st.name}</span>
                  <span className={styles.shiftTime}>{st.startTime} - {st.endTime}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className={styles.shiftList}>
            <h4>排班表 ({generatedSchedule.events.length} 个班次)</h4>
            <div className={styles.shiftTable}>
              {generatedSchedule.events
                .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
                .map(event => (
                  <div key={event.id} className={styles.shiftRow}>
                    <div className={styles.shiftDate}>
                      {event.startTime.toLocaleDateString('zh-CN', {
                        month: 'long',
                        day: 'numeric',
                        weekday: 'short',
                      })}
                    </div>
                    <div className={styles.shiftInfo}>
                      <span className={styles.shiftTitle}>{event.title}</span>
                      <span className={styles.shiftTimeRange}>
                        {event.startTime.toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        -
                        {event.endTime.toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
