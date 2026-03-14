'use client';

import { useState, useEffect } from 'react';
import { shiftService } from '@/lib/services/shiftService';
import type { Shift, ShiftSchedule } from '@/types';

export default function ShiftNlpPanel({
  scheduleId,
  onShiftsUpdated,
}: {
  scheduleId?: string;
  onShiftsUpdated?: () => void;
}) {
  const [input, setInput] = useState('');
  const [schedule, setSchedule] = useState<ShiftSchedule | null>(null);
  const [result, setResult] = useState<{
    message: string;
    shifts?: Shift[];
    loading: boolean;
  }>({
    message: '输入自然语言指令，例如：查询张三的排班',
    loading: false,
  });

  useEffect(() => {
    const loadSchedule = async () => {
      if (scheduleId) {
        const s = await shiftService.getScheduleById(scheduleId);
        setSchedule(s || null);
      }
    };
    loadSchedule();
  }, [scheduleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setResult({ message: '处理中...', loading: true });

    try {
      const response = await shiftService.executeNlpCommand(input, scheduleId);
      
      setResult({
        message: response.action.message,
        shifts: response.action.shifts,
        loading: false,
      });

      if (response.action.type === 'delete' || response.action.type === 'update') {
        onShiftsUpdated?.();
        if (scheduleId) {
          const s = await shiftService.getScheduleById(scheduleId);
          setSchedule(s || null);
        }
      }
    } catch (error) {
      setResult({
        message: '执行失败，请重试',
        loading: false,
      });
    }
  };

  const getShiftInfo = (shift: Shift) => {
    if (!schedule) {
      return `${new Date(shift.date).toLocaleDateString('zh-CN')} - ${shift.shiftTypeId}`;
    }

    const shiftType = schedule.shiftTypes.find(st => st.id === shift.shiftTypeId);
    const employee = schedule.employees.find(e => e.id === shift.employeeId);

    const shiftName = shiftType?.name || shift.shiftTypeId;
    const employeeName = employee?.name || shift.employeeId;

    return `${new Date(shift.date).toLocaleDateString('zh-CN')} - ${employeeName} - ${shiftName}`;
  };

  const exampleCommands = [
    '查询张三的排班',
    '查看明天的早班',
    '删除下周一的晚班',
    '修改李四的夜班',
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">自然语言操作</h3>
      
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入指令..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={result.loading}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            disabled={result.loading || !input.trim()}
          >
            {result.loading ? '处理中...' : '执行'}
          </button>
        </div>
      </form>

      <div className="p-4 bg-gray-50 rounded-lg mb-4">
        <p className="text-sm text-gray-600">{result.message}</p>
        
        {result.shifts && result.shifts.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium text-gray-700 mb-2">结果：</h4>
            <ul className="space-y-2">
              {result.shifts.map((shift) => (
                <li key={shift.id} className="text-sm text-gray-600">
                  {getShiftInfo(shift)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="text-sm text-gray-500">
        <p className="font-medium mb-2">示例命令：</p>
        <div className="flex flex-wrap gap-2">
          {exampleCommands.map((cmd, index) => (
            <button
              key={index}
              onClick={() => setInput(cmd)}
              className="px-3 py-1 bg-gray-100 rounded-full text-xs hover:bg-gray-200"
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
