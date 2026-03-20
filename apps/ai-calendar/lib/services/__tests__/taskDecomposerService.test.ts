import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskDecomposerService, type DecompositionContext } from '../taskDecomposerService';
import type { UnifiedCalendarItem } from '@/types/unified';

const createTestIdea = (title: string, content?: string): UnifiedCalendarItem => ({
  id: 'test-idea-' + Math.random().toString(36).substring(7),
  type: 'idea',
  title,
  content: content || title,
  startTime: null,
  endTime: null,
  isAllDay: false,
  embedding: [],
  embeddingUpdatedAt: 0,
  status: 'pending',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  metadata: {}
});

const createTestContext = (events: UnifiedCalendarItem[] = []): DecompositionContext => ({
  existingEvents: events,
  userPreferences: {
    workHours: { start: 9, end: 18 },
    workDays: [1, 2, 3, 4, 5],
    defaultDuration: 60
  },
  currentDate: new Date()
});

describe('TaskDecomposerService - 任务分解服务', () => {
  let service: TaskDecomposerService;

  beforeEach(() => {
    service = TaskDecomposerService.getInstance();
    vi.clearAllMocks();
  });

  describe('单例模式', () => {
    it('应该返回同一个实例', () => {
      const instance1 = TaskDecomposerService.getInstance();
      const instance2 = TaskDecomposerService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('createFallbackResult - 回退结果', () => {
    it('当 AI 服务不可用时应返回有效的回退结果', async () => {
      const idea = createTestIdea('测试目标');
      const context = createTestContext();
      
      const result = await service.decompose(idea, context);
      
      expect(result).toBeDefined();
      expect(result.tasks).toBeInstanceOf(Array);
      expect(result.tasks.length).toBeGreaterThan(0);
      expect(result.totalEstimatedMinutes).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('suggestSchedule - 智能排期', () => {
    it('应该为任务建议时间', async () => {
      const tasks = [
        { id: 'task-1', title: '任务1', estimatedMinutes: 60, priority: 'high' as const, dependencies: [], status: 'pending' as const },
        { id: 'task-2', title: '任务2', estimatedMinutes: 30, priority: 'medium' as const, dependencies: [], status: 'pending' as const }
      ];
      
      const context = createTestContext();
      const scheduled = await service.suggestSchedule(tasks, context);
      
      expect(scheduled).toHaveLength(2);
      expect(scheduled[0].suggestedStartTime).toBeDefined();
      expect(scheduled[0].suggestedEndTime).toBeDefined();
    });

    it('应该考虑任务依赖关系', async () => {
      const tasks = [
        { id: 'task-1', title: '前置任务', estimatedMinutes: 60, priority: 'high' as const, dependencies: [], status: 'pending' as const },
        { id: 'task-2', title: '依赖任务', estimatedMinutes: 30, priority: 'medium' as const, dependencies: ['task-1'], status: 'pending' as const }
      ];
      
      const context = createTestContext();
      const scheduled = await service.suggestSchedule(tasks, context);
      
      const task1 = scheduled.find(t => t.id === 'task-1');
      const task2 = scheduled.find(t => t.id === 'task-2');
      
      expect(task1).toBeDefined();
      expect(task2).toBeDefined();
      
      if (task1?.suggestedEndTime && task2?.suggestedStartTime) {
        expect(task2.suggestedStartTime).toBeGreaterThanOrEqual(task1.suggestedEndTime);
      }
    });

    it('应该返回有效的排期结果', async () => {
      const tasks = [
        { id: 'task-1', title: '任务1', estimatedMinutes: 60, priority: 'high' as const, dependencies: [], status: 'pending' as const }
      ];
      
      const context = createTestContext();
      const scheduled = await service.suggestSchedule(tasks, context);
      
      expect(scheduled).toHaveLength(1);
      expect(scheduled[0].suggestedStartTime).toBeDefined();
      expect(scheduled[0].suggestedEndTime).toBeDefined();
    });
  });

  describe('topologicalSort - 拓扑排序', () => {
    it('应该正确排序无依赖的任务', async () => {
      const tasks = [
        { id: 'task-3', title: '任务3', estimatedMinutes: 30, priority: 'low' as const, dependencies: [], status: 'pending' as const },
        { id: 'task-1', title: '任务1', estimatedMinutes: 60, priority: 'high' as const, dependencies: [], status: 'pending' as const },
        { id: 'task-2', title: '任务2', estimatedMinutes: 45, priority: 'medium' as const, dependencies: [], status: 'pending' as const }
      ];
      
      const context = createTestContext();
      const sorted = await service.suggestSchedule(tasks, context);
      
      expect(sorted).toHaveLength(3);
    });

    it('应该正确处理复杂依赖关系', async () => {
      const tasks = [
        { id: 'task-d', title: '任务D', estimatedMinutes: 30, priority: 'low' as const, dependencies: ['task-b', 'task-c'], status: 'pending' as const },
        { id: 'task-a', title: '任务A', estimatedMinutes: 60, priority: 'high' as const, dependencies: [], status: 'pending' as const },
        { id: 'task-b', title: '任务B', estimatedMinutes: 45, priority: 'medium' as const, dependencies: ['task-a'], status: 'pending' as const },
        { id: 'task-c', title: '任务C', estimatedMinutes: 45, priority: 'medium' as const, dependencies: ['task-a'], status: 'pending' as const }
      ];
      
      const context = createTestContext();
      const sorted = await service.suggestSchedule(tasks, context);
      
      const taskAIndex = sorted.findIndex(t => t.id === 'task-a');
      const taskBIndex = sorted.findIndex(t => t.id === 'task-b');
      const taskCIndex = sorted.findIndex(t => t.id === 'task-c');
      const taskDIndex = sorted.findIndex(t => t.id === 'task-d');
      
      expect(taskAIndex).toBeLessThan(taskBIndex);
      expect(taskAIndex).toBeLessThan(taskCIndex);
      expect(taskBIndex).toBeLessThan(taskDIndex);
      expect(taskCIndex).toBeLessThan(taskDIndex);
    });
  });

  describe('数据结构验证', () => {
    it('DecomposedTask 应包含所有必需字段', async () => {
      const idea = createTestIdea('测试目标');
      const context = createTestContext();
      const result = await service.decompose(idea, context);
      
      const task = result.tasks[0];
      expect(task).toHaveProperty('id');
      expect(task).toHaveProperty('title');
      expect(task).toHaveProperty('estimatedMinutes');
      expect(task).toHaveProperty('priority');
      expect(task).toHaveProperty('dependencies');
      expect(task).toHaveProperty('status');
      
      expect(typeof task.id).toBe('string');
      expect(typeof task.title).toBe('string');
      expect(typeof task.estimatedMinutes).toBe('number');
      expect(['high', 'medium', 'low']).toContain(task.priority);
      expect(Array.isArray(task.dependencies)).toBe(true);
    });

    it('DecompositionResult 应包含所有必需字段', async () => {
      const idea = createTestIdea('测试目标');
      const context = createTestContext();
      const result = await service.decompose(idea, context);
      
      expect(result).toHaveProperty('tasks');
      expect(result).toHaveProperty('milestones');
      expect(result).toHaveProperty('totalEstimatedMinutes');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('explanation');
      
      expect(Array.isArray(result.tasks)).toBe(true);
      expect(Array.isArray(result.milestones)).toBe(true);
      expect(typeof result.totalEstimatedMinutes).toBe('number');
      expect(typeof result.confidence).toBe('number');
      expect(typeof result.explanation).toBe('string');
    });
  });

  describe('边界情况', () => {
    it('应该处理空任务列表', async () => {
      const context = createTestContext();
      const scheduled = await service.suggestSchedule([], context);
      expect(scheduled).toHaveLength(0);
    });

    it('应该处理超长标题', async () => {
      const longTitle = 'A'.repeat(500);
      const idea = createTestIdea(longTitle);
      const context = createTestContext();
      
      const result = await service.decompose(idea, context);
      expect(result).toBeDefined();
    });

    it('应该处理特殊字符', async () => {
      const specialTitle = '测试 <script>alert("xss")</script> & "quotes" \'apostrophe\'';
      const idea = createTestIdea(specialTitle);
      const context = createTestContext();
      
      const result = await service.decompose(idea, context);
      expect(result).toBeDefined();
    });
  });
});
