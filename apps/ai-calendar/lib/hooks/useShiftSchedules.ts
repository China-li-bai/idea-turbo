'use client';

import { useState, useEffect, useCallback } from 'react';
import { shiftService } from '@/lib/services/shiftService';
import { eventBus, type DataChangeEvent } from '@/lib/utils/eventBus';
import type { ShiftSchedule, Shift, Employee, ShiftType } from '@/types';

export function useShiftSchedules() {
  const [schedules, setSchedules] = useState<ShiftSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSchedules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await shiftService.getAllSchedules();
      setSchedules(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载排班计划失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const addSchedule = useCallback(async (schedule: Omit<ShiftSchedule, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setError(null);
      const newSchedule = await shiftService.createSchedule(schedule);
      await loadSchedules();
      return newSchedule;
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建排班计划失败');
      throw err;
    }
  }, [loadSchedules]);

  const updateSchedule = useCallback(async (id: string, updates: Partial<ShiftSchedule>) => {
    try {
      setError(null);
      const updated = await shiftService.updateSchedule(id, updates);
      await loadSchedules();
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新排班计划失败');
      throw err;
    }
  }, [loadSchedules]);

  const deleteSchedule = useCallback(async (id: string) => {
    try {
      setError(null);
      await shiftService.deleteSchedule(id);
      await loadSchedules();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除排班计划失败');
      throw err;
    }
  }, [loadSchedules]);

  const duplicateSchedule = useCallback(async (id: string, newStartDate?: Date, newEndDate?: Date) => {
    try {
      setError(null);
      const duplicated = await shiftService.duplicateSchedule(id, newStartDate, newEndDate);
      await loadSchedules();
      return duplicated;
    } catch (err) {
      setError(err instanceof Error ? err.message : '复制排班计划失败');
      throw err;
    }
  }, [loadSchedules]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  useEffect(() => {
    const unsubscribe = eventBus.subscribe((event: DataChangeEvent) => {
      if (event.entityType === 'shiftSchedule') {
        loadSchedules();
      }
    });
    return unsubscribe;
  }, [loadSchedules]);

  return {
    schedules,
    loading,
    error,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    duplicateSchedule,
    refresh: loadSchedules,
  };
}

export function useShiftSchedule(scheduleId: string | null) {
  const [schedule, setSchedule] = useState<ShiftSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSchedule = useCallback(async () => {
    if (!scheduleId) {
      setSchedule(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await shiftService.getScheduleById(scheduleId);
      setSchedule(data || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载排班计划失败');
    } finally {
      setLoading(false);
    }
  }, [scheduleId]);

  const addShift = useCallback(async (shiftData: Omit<Shift, 'id' | 'scheduleId'>) => {
    if (!scheduleId) throw new Error('No schedule selected');
    
    try {
      setError(null);
      const result = await shiftService.addShift(scheduleId, shiftData);
      await loadSchedule();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加班次失败');
      throw err;
    }
  }, [scheduleId, loadSchedule]);

  const updateShift = useCallback(async (shiftId: string, updates: Partial<Omit<Shift, 'id' | 'scheduleId'>>) => {
    if (!scheduleId) throw new Error('No schedule selected');
    
    try {
      setError(null);
      const result = await shiftService.updateShift(scheduleId, shiftId, updates);
      await loadSchedule();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新班次失败');
      throw err;
    }
  }, [scheduleId, loadSchedule]);

  const deleteShift = useCallback(async (shiftId: string) => {
    if (!scheduleId) throw new Error('No schedule selected');
    
    try {
      setError(null);
      await shiftService.deleteShift(scheduleId, shiftId);
      await loadSchedule();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除班次失败');
      throw err;
    }
  }, [scheduleId, loadSchedule]);

  const swapShifts = useCallback(async (shiftId1: string, shiftId2: string) => {
    if (!scheduleId) throw new Error('No schedule selected');
    
    try {
      setError(null);
      const result = await shiftService.swapShifts(scheduleId, shiftId1, shiftId2);
      await loadSchedule();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : '换班失败');
      throw err;
    }
  }, [scheduleId, loadSchedule]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  useEffect(() => {
    const unsubscribe = eventBus.subscribe((event: DataChangeEvent) => {
      if (
        event.entityType === 'shiftSchedule' && 
        event.entityId === scheduleId
      ) {
        loadSchedule();
      }
    });
    return unsubscribe;
  }, [scheduleId, loadSchedule]);

  return {
    schedule,
    loading,
    error,
    addShift,
    updateShift,
    deleteShift,
    swapShifts,
    refresh: loadSchedule,
  };
}
