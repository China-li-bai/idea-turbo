import type { CalendarEvent, Inspiration, Task } from '@/types'

export function generateTestEvents(): CalendarEvent[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  return [
    {
      id: 'event-1',
      title: '团队周会',
      description: '讨论本周工作进展和下周计划',
      startTime: new Date(today.getTime() + 9 * 60 * 60 * 1000),
      endTime: new Date(today.getTime() + 10 * 60 * 60 * 1000),
      location: '会议室 A',
      isAllDay: false,
      reminders: [15],
      viewMode: 'boss',
      eventType: 'meeting',
      createdAt: now,
      updatedAt: now,
      color: '#3B82F6',
    },
    {
      id: 'event-2',
      title: '产品评审会议',
      description: '新功能设计方案评审',
      startTime: new Date(today.getTime() + 14 * 60 * 60 * 1000),
      endTime: new Date(today.getTime() + 15.5 * 60 * 60 * 1000),
      location: '线上会议',
      isAllDay: false,
      reminders: [10, 30],
      viewMode: 'boss',
      eventType: 'meeting',
      createdAt: now,
      updatedAt: now,
      color: '#10B981',
    },
    {
      id: 'event-3',
      title: '午餐',
      startTime: new Date(today.getTime() + 12 * 60 * 60 * 1000),
      endTime: new Date(today.getTime() + 13 * 60 * 60 * 1000),
      isAllDay: false,
      reminders: [],
      viewMode: 'personal',
      eventType: 'personal',
      createdAt: now,
      updatedAt: now,
      color: '#F59E0B',
    },
    {
      id: 'event-4',
      title: '代码审查',
      description: '审查新功能的代码实现',
      startTime: new Date(today.getTime() + 16 * 60 * 60 * 1000),
      endTime: new Date(today.getTime() + 17 * 60 * 60 * 1000),
      isAllDay: false,
      reminders: [5],
      viewMode: 'boss',
      eventType: 'regular',
      createdAt: now,
      updatedAt: now,
      color: '#8B5CF6',
    },
    {
      id: 'event-5',
      title: '明天的重要会议',
      description: '客户演示',
      startTime: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000),
      endTime: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 11.5 * 60 * 60 * 1000),
      location: '客户办公室',
      isAllDay: false,
      reminders: [30, 60],
      viewMode: 'boss',
      eventType: 'meeting',
      createdAt: now,
      updatedAt: now,
      color: '#EF4444',
    },
  ]
}

export function generateTestInspirations(): Inspiration[] {
  const now = new Date()
  
  return [
    {
      id: 'inspiration-1',
      content: '研究一下新的状态管理方案',
      captureTime: now,
      type: 'todo',
      processed: false,
      source: 'keyboard',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'inspiration-2',
      content: '下周安排一次技术分享会',
      captureTime: now,
      type: 'event',
      processed: false,
      extractedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      source: 'keyboard',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'inspiration-3',
      content: '优化首页加载性能，目标在2秒内完成',
      captureTime: now,
      type: 'note',
      processed: false,
      source: 'keyboard',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'inspiration-4',
      content: '联系供应商确认下周的交付时间',
      captureTime: now,
      type: 'todo',
      processed: false,
      source: 'keyboard',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'inspiration-5',
      content: '准备季度总结报告',
      captureTime: now,
      type: 'todo',
      processed: false,
      source: 'keyboard',
      createdAt: now,
      updatedAt: now,
    },
  ]
}

export function generateTestTasks(): Task[] {
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  
  return [
    {
      id: 'task-1',
      title: '完成项目文档',
      description: '更新API文档和用户手册',
      dueTime: tomorrow,
      completed: false,
      priority: 'high',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'task-2',
      title: '修复登录页面bug',
      description: '用户反馈的登录超时问题',
      dueTime: now,
      completed: true,
      completedAt: now,
      priority: 'high',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'task-3',
      title: '准备演示材料',
      description: '为明天的客户演示准备PPT',
      dueTime: tomorrow,
      completed: false,
      priority: 'medium',
      createdAt: now,
      updatedAt: now,
    },
  ]
}

export async function initializeTestData(
  addEvent: (event: CalendarEvent) => Promise<CalendarEvent>,
  addInspiration: (inspiration: Inspiration) => Promise<Inspiration>,
  addTask: (task: Task) => Promise<Task>,
  events: CalendarEvent[],
  inspirations: Inspiration[],
  tasks: Task[]
): Promise<void> {
  if (events.length === 0) {
    const testEvents = generateTestEvents()
    for (const event of testEvents) {
      await addEvent(event)
    }
    console.log('✅ 已初始化测试日程数据')
  }
  
  if (inspirations.length === 0) {
    const testInspirations = generateTestInspirations()
    for (const inspiration of testInspirations) {
      await addInspiration(inspiration)
    }
    console.log('✅ 已初始化测试灵感数据')
  }
  
  if (tasks.length === 0) {
    const testTasks = generateTestTasks()
    for (const task of testTasks) {
      await addTask(task)
    }
    console.log('✅ 已初始化测试任务数据')
  }
}
