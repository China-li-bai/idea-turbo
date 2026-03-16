'use client';

import { useState } from 'react';
import { shiftService } from '@/lib/services/shiftService';
import { useEvents } from '@/lib/hooks/useUnifiedData';
import type { ShiftSchedule, CalendarEvent } from '@/types';
import styles from './shiftScheduler.module.scss';

interface ShiftSchedulerProps {
  onScheduleCreated?: (schedule: ShiftSchedule, events: CalendarEvent[]) => void;
}

type GenerationMode = 'local' | 'ai';

export default function ShiftScheduler({ onScheduleCreated }: ShiftSchedulerProps) {
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [mode, setMode] = useState<GenerationMode>('local');
  const [generatedSchedule, setGeneratedSchedule] = useState<{
    schedule: ShiftSchedule;
    events: CalendarEvent[];
  } | null>(null);
  const [localConflicts, setLocalConflicts] = useState<string[]>([]);
  const [localWarnings, setLocalWarnings] = useState<string[]>([]);
  const [localScore, setLocalScore] = useState<number | null>(null);
  const [calendarConflicts, setCalendarConflicts] = useState<Array<{ 
    event1: CalendarEvent; 
    event2: CalendarEvent; 
    type: 'overlap' | 'employee_double_booked';
  }>>([]);
  const [calendarWarnings, setCalendarWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { events: existingEvents } = useEvents();

  const validateInput = (text: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const trimmedText = text.trim();
    
    if (!trimmedText) {
      errors.push('请输入排班需求');
      return { valid: false, errors };
    }
    
    if (trimmedText.length < 5) {
      errors.push('排班需求描述太短，请提供更详细的信息');
    }
    
    const hasDateKeywords = /下?周[一二三四五六日天]|本?周[一二三四五六日天]|明天|后天|大后天|前?天|今天|日期|时间|号|日/.test(trimmedText);
    const hasPeopleKeywords = /员工|人员|同事|工人|张三|李四|王五|赵六|钱七|孙八|和|跟|与/.test(trimmedText);
    
    if (!hasDateKeywords) {
      errors.push('请包含日期信息（例如：下周一开始、本周三、明天等）');
    }
    
    if (!hasPeopleKeywords) {
      errors.push('请包含人员信息（例如：张三、李四、王五等）');
    }
    
    return { valid: errors.length === 0, errors };
  };

  const handleGenerate = async () => {
    const validation = validateInput(input);
    if (!validation.valid) {
      setError(validation.errors.join('；'));
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setLocalConflicts([]);
    setLocalWarnings([]);
    setLocalScore(null);
    setCalendarConflicts([]);
    setCalendarWarnings([]);
    
    try {
      const result = await shiftService.generateSchedule(input, { mode });
      setGeneratedSchedule(result);
      
      setLocalConflicts(result.conflicts || []);
      setLocalWarnings(result.warnings || []);
      setLocalScore(result.score || null);
      
      const { conflicts: detectedConflicts, warnings: detectedWarnings } = 
        shiftService.detectConflicts(result.events, existingEvents);
      setCalendarConflicts(detectedConflicts);
      setCalendarWarnings(detectedWarnings);
      
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
      setLocalConflicts([]);
      setLocalWarnings([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存排班失败');
    }
  };

  const handleClear = () => {
    setInput('');
    setGeneratedSchedule(null);
    setLocalConflicts([]);
    setLocalWarnings([]);
    setLocalScore(null);
    setCalendarConflicts([]);
    setCalendarWarnings([]);
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
        
        <div className={styles.modeSelector}>
          <span className={styles.modeLabel}>生成模式：</span>
          <button
            className={`${styles.modeBtn} ${mode === 'local' ? styles.active : ''}`}
            onClick={() => setMode('local')}
            disabled={isGenerating}
          >
            🔒 本地算法（推荐）
          </button>
          <button
            className={`${styles.modeBtn} ${mode === 'ai' ? styles.active : ''}`}
            onClick={() => setMode('ai')}
            disabled={isGenerating}
          >
            🤖 AI 辅助
          </button>
        </div>
        
        {mode === 'local' && (
          <div className={styles.privacyNote}>
            <span>🛡️ </span>
            <span>本地模式：所有数据在本地处理，保护您的隐私</span>
          </div>
        )}
        
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
      
      {localWarnings.length > 0 && (
        <div className={styles.warnings}>
          <h4 className={styles.warningTitle}>📢 本地算法提示</h4>
          <ul className={styles.warningList}>
            {localWarnings.map((warning, idx) => (
              <li key={idx} className={styles.warningItem}>
                • {warning}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {localConflicts.length > 0 && (
        <div className={styles.conflicts}>
          <h4 className={styles.conflictTitle}>⚠️ 本地算法检测到 {localConflicts.length} 个冲突</h4>
          <ul className={styles.conflictList}>
            {localConflicts.map((conflict, idx) => (
              <li key={idx} className={styles.conflictItem}>
                <span className={styles.conflictType}>无法排班</span>
                <div className={styles.conflictDetails}>
                  <span>{conflict}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {calendarWarnings.length > 0 && (
        <div className={styles.warnings}>
          <h4 className={styles.warningTitle}>📢 日历冲突提示</h4>
          <ul className={styles.warningList}>
            {calendarWarnings.map((warning, idx) => (
              <li key={idx} className={styles.warningItem}>
                • {warning}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {calendarConflicts.length > 0 && (
        <div className={styles.conflicts}>
          <h4 className={styles.conflictTitle}>⚠️ 检测到 {calendarConflicts.length} 个日历冲突</h4>
          <ul className={styles.conflictList}>
            {calendarConflicts.map((conflict, idx) => (
              <li key={idx} className={styles.conflictItem}>
                <span className={styles.conflictType}>
                  {conflict.type === 'employee_double_booked' ? '👥 员工重复排班' : '⏰ 时间重叠'}
                </span>
                <div className={styles.conflictDetails}>
                  <span>{conflict.event1.title}</span>
                  <span>↔</span>
                  <span>{conflict.event2.title}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {localScore !== null && (
        <div className={styles.scoreDisplay}>
          <span className={styles.scoreLabel}>📊 排班质量评分：</span>
          <span className={`${styles.scoreValue} ${localScore >= 80 ? styles.high : localScore >= 60 ? styles.medium : styles.low}`}>
            {Math.round(localScore)} / 100
          </span>
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
