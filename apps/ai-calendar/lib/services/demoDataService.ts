import type { UnifiedCalendarItem } from '@/types/unified';

function generateEmptyEmbedding(): number[] {
  return new Array(512).fill(0).map(() => Math.random() * 0.1 - 0.05);
}

function getToday(): { start: number; end: number } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = start + 24 * 60 * 60 * 1000;
  return { start, end };
}

export function generateDemoData(): UnifiedCalendarItem[] {
  const { start: todayStart } = getToday();
  
  return [
    {
      id: 'demo-event-1',
      type: 'event',
      title: '和设计团队碰头评估 UI',
      content: '和设计团队碰头评估 UI，讨论新版本的设计方案和用户反馈',
      startTime: todayStart + 10 * 60 * 60 * 1000,
      endTime: todayStart + 11 * 60 * 60 * 1000,
      isAllDay: false,
      embedding: generateEmptyEmbedding(),
      embeddingUpdatedAt: Date.now(),
      status: 'scheduled',
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 86400000,
      metadata: {
        location: '会议室 A',
        tags: ['设计', 'UI'],
        priority: 'high',
        eventType: 'meeting',
        reminders: [15]
      }
    },
    {
      id: 'demo-event-2',
      type: 'event',
      title: '星巴克面见潜在投资人',
      content: '星巴克面见潜在投资人，讨论项目融资计划',
      startTime: todayStart + 14.5 * 60 * 60 * 1000,
      endTime: todayStart + 16 * 60 * 60 * 1000,
      isAllDay: false,
      embedding: generateEmptyEmbedding(),
      embeddingUpdatedAt: Date.now(),
      status: 'scheduled',
      createdAt: Date.now() - 172800000,
      updatedAt: Date.now() - 172800000,
      metadata: {
        location: '星巴克（中关村店）',
        tags: ['投资', '融资'],
        priority: 'high',
        eventType: 'meeting',
        reminders: [30, 10]
      }
    },
    {
      id: 'demo-event-3',
      type: 'event',
      title: '产品迭代会议',
      content: '产品迭代会议，讨论 Q2 产品路线图',
      startTime: todayStart + 16.5 * 60 * 60 * 1000,
      endTime: todayStart + 17.5 * 60 * 60 * 1000,
      isAllDay: false,
      embedding: generateEmptyEmbedding(),
      embeddingUpdatedAt: Date.now(),
      status: 'scheduled',
      createdAt: Date.now() - 259200000,
      updatedAt: Date.now() - 259200000,
      metadata: {
        location: '线上会议',
        tags: ['产品', '迭代'],
        priority: 'medium',
        eventType: 'meeting',
        reminders: [10]
      }
    },
    {
      id: 'demo-idea-1',
      type: 'idea',
      title: '重构后端的向量检索逻辑',
      content: '重构后端的向量检索逻辑，优化搜索性能和准确度',
      startTime: null,
      endTime: null,
      isAllDay: false,
      embedding: generateEmptyEmbedding(),
      embeddingUpdatedAt: Date.now(),
      status: 'pending',
      createdAt: Date.now() - 3600000,
      updatedAt: Date.now() - 3600000,
      metadata: {
        tags: ['技术', '重构'],
        priority: 'medium',
        source: 'keyboard'
      }
    },
    {
      id: 'demo-idea-2',
      type: 'idea',
      title: '周末抽空读完乔布斯传',
      content: '周末抽空读完乔布斯传，学习产品设计和用户体验理念',
      startTime: null,
      endTime: null,
      isAllDay: false,
      embedding: generateEmptyEmbedding(),
      embeddingUpdatedAt: Date.now(),
      status: 'pending',
      createdAt: Date.now() - 7200000,
      updatedAt: Date.now() - 7200000,
      metadata: {
        tags: ['阅读', '学习'],
        priority: 'low',
        source: 'keyboard'
      }
    },
    {
      id: 'demo-idea-3',
      type: 'idea',
      title: '研究一下 Orama 的混合搜索实现',
      content: '研究一下 Orama 的混合搜索实现，看看能否优化我们的搜索体验',
      startTime: null,
      endTime: null,
      isAllDay: false,
      embedding: generateEmptyEmbedding(),
      embeddingUpdatedAt: Date.now(),
      status: 'pending',
      createdAt: Date.now() - 1800000,
      updatedAt: Date.now() - 1800000,
      metadata: {
        tags: ['技术', '搜索'],
        priority: 'high',
        source: 'keyboard'
      }
    },
    {
      id: 'demo-idea-4',
      type: 'idea',
      title: '给妈妈打个电话',
      content: '给妈妈打个电话，聊聊最近的生活',
      startTime: null,
      endTime: null,
      isAllDay: false,
      embedding: generateEmptyEmbedding(),
      embeddingUpdatedAt: Date.now(),
      status: 'pending',
      createdAt: Date.now() - 5400000,
      updatedAt: Date.now() - 5400000,
      metadata: {
        tags: ['家人', '生活'],
        priority: 'medium',
        source: 'keyboard'
      }
    },
    {
      id: 'demo-idea-5',
      type: 'idea',
      title: '整理一下 Notion 知识库',
      content: '整理一下 Notion 知识库，把最近的学习笔记归档',
      startTime: null,
      endTime: null,
      isAllDay: false,
      embedding: generateEmptyEmbedding(),
      embeddingUpdatedAt: Date.now(),
      status: 'pending',
      createdAt: Date.now() - 9000000,
      updatedAt: Date.now() - 9000000,
      metadata: {
        tags: ['效率', '知识管理'],
        priority: 'low',
        source: 'keyboard'
      }
    }
  ];
}

export function shouldLoadDemoData(): boolean {
  if (typeof window === 'undefined') return false;
  
  const stored = localStorage.getItem('unified-calendar-storage');
  if (!stored) return true;
  
  try {
    const data = JSON.parse(stored);
    return !data.state?.items || data.state.items.length === 0;
  } catch {
    return true;
  }
}

export async function loadDemoDataToStore(): Promise<void> {
  const { useUnifiedStore } = await import('@/lib/stores/unifiedStore');
  const demoData = generateDemoData();
  
  for (const item of demoData) {
    await useUnifiedStore.getState().addItem(item);
  }
  
  console.log('Demo data loaded:', demoData.length, 'items');
}
