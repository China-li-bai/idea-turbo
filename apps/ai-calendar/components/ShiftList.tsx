'use client';

import { useState } from 'react';
import { useShiftSchedules } from '@/lib/hooks';
import type { ShiftSchedule } from '@/types';
import styles from './shiftList.module.scss';

interface ShiftListProps {
  onSelectSchedule?: (schedule: ShiftSchedule) => void;
  selectedScheduleId?: string;
}

export default function ShiftList({ onSelectSchedule, selectedScheduleId }: ShiftListProps) {
  const { schedules, loading, error, deleteSchedule, duplicateSchedule } = useShiftSchedules();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSchedule(id);
      setConfirmDelete(null);
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  const handleDuplicate = async (schedule: ShiftSchedule) => {
    try {
      const duplicated = await duplicateSchedule(schedule.id);
      if (onSelectSchedule) {
        onSelectSchedule(duplicated);
      }
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>错误: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>📋 排班计划</h2>
      </div>

      <div className={styles.list}>
        {schedules.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📅</div>
            <p>暂无排班计划</p>
            <p className={styles.emptyHint}>使用「自然语言排班」创建第一个排班</p>
          </div>
        ) : (
          schedules.map((schedule) => (
            <div
              key={schedule.id}
              className={`${styles.scheduleCard} ${
                selectedScheduleId === schedule.id ? styles.selected : ''
              }`}
              onClick={() => onSelectSchedule?.(schedule)}
            >
              <div className={styles.scheduleHeader}>
                <div className={styles.scheduleIcon}>📅</div>
                <div className={styles.scheduleInfo}>
                  <h3 className={styles.scheduleName}>{schedule.name}</h3>
                  <div className={styles.scheduleDate}>
                    {formatDate(schedule.startDate)} ~ {formatDate(schedule.endDate)}
                  </div>
                </div>
                <div className={styles.scheduleBadges}>
                  <span className={styles.badge}>
                    👥 {schedule.employees.length}人
                  </span>
                  <span className={styles.badge}>
                    🔄 {schedule.shifts.length}班次
                  </span>
                  {schedule.generatedBy && (
                    <span className={`${styles.badge} ${styles.badgeType}`}>
                      {schedule.generatedBy === 'ai' ? '🤖 AI生成' : 
                       schedule.generatedBy === 'hybrid' ? '🔀 混合' : '✏️ 手动'}
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.scheduleActions}>
                <button
                  className={styles.actionBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDuplicate(schedule);
                  }}
                  title="复制排班"
                >
                  📋
                </button>
                <button
                  className={`${styles.actionBtn} ${styles.deleteBtn}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(schedule.id);
                  }}
                  title="删除排班"
                >
                  🗑️
                </button>
              </div>

              {confirmDelete === schedule.id && (
                <div className={styles.confirmOverlay} onClick={(e) => e.stopPropagation()}>
                  <div className={styles.confirmDialog}>
                    <p>确定要删除这个排班计划吗？</p>
                    <p className={styles.confirmWarning}>此操作不可撤销</p>
                    <div className={styles.confirmActions}>
                      <button
                        className={styles.confirmCancel}
                        onClick={() => setConfirmDelete(null)}
                      >
                        取消
                      </button>
                      <button
                        className={styles.confirmDelete}
                        onClick={() => handleDelete(schedule.id)}
                      >
                        确定删除
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
