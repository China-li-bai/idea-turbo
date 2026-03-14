'use client';

import { useState } from 'react';
import CalendarView from '@/components/CalendarView';
import ShiftScheduler from '@/components/ShiftScheduler';
import { useCalendarStore } from '@/lib/stores/calendarStore';
import type { ShiftSchedule, CalendarEvent } from '@/types';

export default function ShiftDemoPage() {
  const [activeTab, setActiveTab] = useState<'scheduler' | 'calendar'>('scheduler');
  const { addEvents } = useCalendarStore();

  const handleScheduleCreated = (schedule: ShiftSchedule, events: CalendarEvent[]) => {
    addEvents(events);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📅 自然语言排班演示
          </h1>
          <p className="text-gray-600">
            用自然语言描述排班需求，AI 自动生成排班表并同步到日历
          </p>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('scheduler')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'scheduler'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            🪄 排班助手
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'calendar'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            📆 日历视图
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg">
          {activeTab === 'scheduler' ? (
            <ShiftScheduler onScheduleCreated={handleScheduleCreated} />
          ) : (
            <div className="p-6">
              <CalendarView />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
