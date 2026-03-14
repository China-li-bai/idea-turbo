'use client';

import { useState } from 'react';
import { useShiftSchedules, useShiftSchedule } from '@/lib/hooks';
import { shiftService } from '@/lib/services/shiftService';
import ShiftList from './ShiftList';
import ShiftEditor from './ShiftEditor';
import ShiftScheduler from './ShiftScheduler';
import ShiftNlpPanel from './ShiftNlpPanel';
import type { ShiftSchedule, Shift, CalendarEvent } from '@/types';
import styles from './shiftManager.module.scss';

export default function ShiftManager() {
  const [view, setView] = useState<'list' | 'scheduler' | 'detail'>('list');
  const [selectedSchedule, setSelectedSchedule] = useState<ShiftSchedule | null>(null);
  const [isShiftEditorOpen, setIsShiftEditorOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | undefined>();
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [pendingShiftData, setPendingShiftData] = useState<Omit<Shift, 'id' | 'scheduleId'> | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { schedules } = useShiftSchedules();
  const {
    schedule,
    addShift,
    updateShift,
    deleteShift,
  } = useShiftSchedule(selectedSchedule?.id || null);

  const handleSelectSchedule = (schedule: ShiftSchedule) => {
    setSelectedSchedule(schedule);
    setView('detail');
  };

  const handleScheduleCreated = async (newSchedule: ShiftSchedule, events: CalendarEvent[]) => {
    await shiftService.saveGeneratedSchedule(newSchedule, events);
    setView('list');
  };

  const handleAddShift = () => {
    if (!schedule) return;
    setEditingShift(undefined);
    setIsShiftEditorOpen(true);
  };

  const handleEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setIsShiftEditorOpen(true);
  };

  const saveShift = async (shiftData: Omit<Shift, 'id' | 'scheduleId'>) => {
    if (!schedule) return;

    try {
      setConflictMessage(null);
      let result;

      if (editingShift) {
        result = await updateShift(editingShift.id, shiftData);
      } else {
        result = await addShift(shiftData);
      }

      if (result.warnings && result.warnings.length > 0) {
        const warningText = result.warnings.join('；');
        setConflictMessage(`ℹ️ ${warningText}`);
      }

      setIsShiftEditorOpen(false);
      setEditingShift(undefined);
      setPendingShiftData(null);
      setShowConfirmDialog(false);
    } catch (err) {
      console.error('保存失败:', err);
      alert('保存失败，请重试');
    }
  };

  const handleSaveShift = async (shiftData: Omit<Shift, 'id' | 'scheduleId'>) => {
    if (!schedule) return;

    try {
      setConflictMessage(null);
      setPendingShiftData(null);
      setShowConfirmDialog(false);

      const conflictResult = await shiftService.checkShiftConflicts(
        schedule.id,
        shiftData,
        editingShift?.id
      );

      if (conflictResult.hasError) {
        setConflictMessage(conflictResult.warnings.join('；'));
        return;
      }

      if (conflictResult.hasWarning) {
        setPendingShiftData(shiftData);
        setConflictMessage(conflictResult.warnings.join('；'));
        setShowConfirmDialog(true);
        return;
      }

      await saveShift(shiftData);
    } catch (err) {
      console.error('检查冲突失败:', err);
      alert('检查冲突失败，请重试');
    }
  };

  const handleConfirmSave = () => {
    if (pendingShiftData) {
      saveShift(pendingShiftData);
    }
  };

  const handleCancelSave = () => {
    setPendingShiftData(null);
    setShowConfirmDialog(false);
    setConflictMessage(null);
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!confirm('确定要删除这个班次吗？')) return;
    try {
      await deleteShift(shiftId);
    } catch (err) {
      console.error('删除失败:', err);
      alert('删除失败，请重试');
    }
  };

  const renderListView = () => (
    <div className={styles.listView}>
      <div className={styles.viewHeader}>
        <h1>🗓️ 排班管理</h1>
        <button
          className={styles.createBtn}
          onClick={() => setView('scheduler')}
        >
          ✨ 创建新排班
        </button>
      </div>
      <ShiftList
        onSelectSchedule={handleSelectSchedule}
        selectedScheduleId={selectedSchedule?.id}
      />
    </div>
  );

  const renderSchedulerView = () => (
    <div className={styles.schedulerView}>
      <div className={styles.viewHeader}>
        <button
          className={styles.backBtn}
          onClick={() => setView('list')}
        >
          ← 返回列表
        </button>
      </div>
      <ShiftScheduler
        onScheduleCreated={handleScheduleCreated}
      />
    </div>
  );

  const renderDetailView = () => {
    if (!schedule) return null;

    return (
      <div className={styles.detailView}>
        <div className={styles.viewHeader}>
          <button
            className={styles.backBtn}
            onClick={() => {
              setSelectedSchedule(null);
              setView('list');
            }}
          >
            ← 返回列表
          </button>
          <h1>{schedule.name}</h1>
          <div className={styles.headerActions}>
            <button
              className={styles.actionBtn}
              onClick={handleAddShift}
            >
              ➕ 添加班次
            </button>
          </div>
        </div>

        {conflictMessage && (
          <div className={styles.conflictMessage}>
            <p>{conflictMessage}</p>
            <button
              className={styles.closeConflictBtn}
              onClick={() => setConflictMessage(null)}
            >
              ✕
            </button>
          </div>
        )}
        
        <div className={styles.nlpSection}>
          <ShiftNlpPanel
            scheduleId={schedule.id}
            onShiftsUpdated={() => {
              setSelectedSchedule(null);
              setTimeout(() => {
                if (schedule) {
                  setSelectedSchedule(schedule);
                }
              }, 100);
            }}
          />
        </div>
        
        <div className={styles.detailContent}>
          <div className={styles.scheduleInfo}>
            <div className={styles.infoCard}>
              <h3>📅 排班周期</h3>
              <p>
                {new Date(schedule.startDate).toLocaleDateString('zh-CN')} ~{' '}
                {new Date(schedule.endDate).toLocaleDateString('zh-CN')}
              </p>
            </div>
            <div className={styles.infoCard}>
              <h3>👥 员工 ({schedule.employees.length})</h3>
              <div className={styles.employeeList}>
                {schedule.employees.map((emp) => (
                  <span
                    key={emp.id}
                    className={styles.employeeTag}
                    style={{ borderColor: emp.color }}
                  >
                    <span
                      className={styles.employeeDot}
                      style={{ backgroundColor: emp.color }}
                    ></span>
                    {emp.name}
                  </span>
                ))}
              </div>
            </div>
            <div className={styles.infoCard}>
              <h3>🔄 班次类型 ({schedule.shiftTypes.length})</h3>
              <div className={styles.shiftTypeList}>
                {schedule.shiftTypes.map((st) => (
                  <span
                    key={st.id}
                    className={styles.shiftTypeTag}
                    style={{ backgroundColor: `${st.color}20`, color: st.color }}
                  >
                    {st.name} {st.startTime}-{st.endTime}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.shiftsSection}>
            <h3>📋 班次列表 ({schedule.shifts.length})</h3>
            {schedule.shifts.length === 0 ? (
              <div className={styles.emptyShifts}>
                <p>暂无班次</p>
                <button
                  className={styles.addFirstBtn}
                  onClick={handleAddShift}
                >
                  添加第一个班次
                </button>
              </div>
            ) : (
              <div className={styles.shiftsTable}>
                <div className={styles.tableHeader}>
                  <span>日期</span>
                  <span>班次</span>
                  <span>员工</span>
                  <span>备注</span>
                  <span>操作</span>
                </div>
                {schedule.shifts
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((shift) => {
                    const shiftType = schedule.shiftTypes.find(
                      (st) => st.id === shift.shiftTypeId
                    );
                    const employee = schedule.employees.find(
                      (emp) => emp.id === shift.employeeId
                    );

                    return (
                      <div key={shift.id} className={styles.tableRow}>
                        <span className={styles.date}>
                          {new Date(shift.date).toLocaleDateString('zh-CN', {
                            month: 'short',
                            day: 'numeric',
                            weekday: 'short',
                          })}
                        </span>
                        <span className={styles.shift}>
                          {shiftType && (
                            <span
                              className={styles.shiftBadge}
                              style={{ backgroundColor: shiftType.color }}
                            >
                              {shiftType.name}
                            </span>
                          )}
                        </span>
                        <span className={styles.employee}>
                          {employee && (
                            <span className={styles.employeeName}>
                              <span
                                className={styles.employeeSmallDot}
                                style={{ backgroundColor: employee.color }}
                              ></span>
                              {employee.name}
                            </span>
                          )}
                        </span>
                        <span className={styles.notes}>{shift.notes || '-'}</span>
                        <span className={styles.actions}>
                          <button
                            className={styles.rowActionBtn}
                            onClick={() => handleEditShift(shift)}
                            title="编辑"
                          >
                            ✏️
                          </button>
                          <button
                            className={styles.rowActionBtn}
                            onClick={() => handleDeleteShift(shift.id)}
                            title="删除"
                          >
                            🗑️
                          </button>
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        <ShiftEditor
          isOpen={isShiftEditorOpen}
          onClose={() => setIsShiftEditorOpen(false)}
          onSave={handleSaveShift}
          schedule={schedule}
          shift={editingShift}
        />

        {showConfirmDialog && (
          <div className={styles.confirmOverlay}>
            <div className={styles.confirmDialog}>
              <h3>⚠️ 确认保存</h3>
              <p className={styles.confirmMessage}>检测到时间重叠，确定要继续保存吗？</p>
              <div className={styles.confirmActions}>
                <button
                  className={styles.confirmCancel}
                  onClick={handleCancelSave}
                >
                  取消
                </button>
                <button
                  className={styles.confirmSave}
                  onClick={handleConfirmSave}
                >
                  继续保存
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {view === 'list' && renderListView()}
      {view === 'scheduler' && renderSchedulerView()}
      {view === 'detail' && renderDetailView()}
    </div>
  );
}
