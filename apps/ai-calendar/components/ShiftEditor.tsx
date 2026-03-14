'use client';

import { useState, useEffect } from 'react';
import type { Shift, ShiftSchedule, Employee, ShiftType } from '@/types';
import styles from './shiftEditor.module.scss';

interface ShiftEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shiftData: Omit<Shift, 'id' | 'scheduleId'>) => void;
  schedule: ShiftSchedule;
  shift?: Shift;
}

export default function ShiftEditor({
  isOpen,
  onClose,
  onSave,
  schedule,
  shift,
}: ShiftEditorProps) {
  const [date, setDate] = useState<string>('');
  const [shiftTypeId, setShiftTypeId] = useState<string>('');
  const [employeeId, setEmployeeId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isLocked, setIsLocked] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      if (shift) {
        setDate(new Date(shift.date).toISOString().split('T')[0]);
        setShiftTypeId(shift.shiftTypeId);
        setEmployeeId(shift.employeeId);
        setNotes(shift.notes || '');
        setIsLocked(shift.isLocked || false);
      } else {
        setDate(new Date().toISOString().split('T')[0]);
        setShiftTypeId(schedule.shiftTypes[0]?.id || '');
        setEmployeeId(schedule.employees[0]?.id || '');
        setNotes('');
        setIsLocked(false);
      }
    }
  }, [isOpen, shift, schedule]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date || !shiftTypeId || !employeeId) {
      alert('请填写完整信息');
      return;
    }

    onSave({
      date: new Date(date),
      shiftTypeId,
      employeeId,
      notes: notes || undefined,
      isLocked: isLocked || undefined,
    });
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {shift ? '✏️ 编辑班次' : '➕ 添加班次'}
          </h2>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>班次类型</label>
            <select
              value={shiftTypeId}
              onChange={(e) => setShiftTypeId(e.target.value)}
              className={styles.select}
              required
            >
              <option value="">请选择班次</option>
              {schedule.shiftTypes.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.startTime} - {st.endTime})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>员工</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className={styles.select}
              required
            >
              <option value="">请选择员工</option>
              {schedule.employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>备注</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={styles.textarea}
              placeholder="添加备注（可选）"
              rows={3}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={isLocked}
                onChange={(e) => setIsLocked(e.target.checked)}
                className={styles.checkbox}
              />
              <span>锁定班次（禁止编辑）</span>
            </label>
          </div>

          <div className={styles.actions}>
            <button type="button" onClick={onClose} className={styles.cancelBtn}>
              取消
            </button>
            <button type="submit" className={styles.saveBtn}>
              {shift ? '保存修改' : '添加班次'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
