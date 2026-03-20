import { describe, it, expect, beforeEach } from 'vitest';
import { ProgressTrackerService } from '../progressTrackerService';
import type { UnifiedCalendarItem } from '@/types/unified';

const createTestEvent = (
  id: string,
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled' = 'scheduled',
  startTime?: number,
  endTime?: number,
  priority: 'high' | 'medium' | 'low' = 'medium'
): UnifiedCalendarItem => ({
  id,
  type: 'event',
  title: `Event ${id}`,
  content: `Event ${id}`,
  startTime: startTime || Date.now(),
  endTime: endTime || Date.now() + 3600000,
  isAllDay: false,
  embedding: [],
  embeddingUpdatedAt: Date.now(),
  status,
  createdAt: Date.now() - 86400000,
  updatedAt: Date.now(),
  metadata: { priority }
});

const createTestIdea = (
  id: string,
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled' = 'pending'
): UnifiedCalendarItem => ({
  id,
  type: 'idea',
  title: `Idea ${id}`,
  content: `Idea ${id}`,
  startTime: null,
  endTime: null,
  isAllDay: false,
  embedding: [],
  embeddingUpdatedAt: Date.now(),
  status,
  createdAt: Date.now() - 86400000,
  updatedAt: Date.now(),
  metadata: {}
});

describe('ProgressTrackerService - 进度追踪服务', () => {
  let service: ProgressTrackerService;

  beforeEach(() => {
    service = ProgressTrackerService.getInstance();
  });

  describe('单例模式', () => {
    it('应该返回同一个实例', () => {
      const instance1 = ProgressTrackerService.getInstance();
      const instance2 = ProgressTrackerService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('calculateTaskProgress - 任务进度计算', () => {
    it('应该正确计算已完成任务进度', () => {
      const task = createTestEvent('task-1', 'completed');
      const subtasks = [
        createTestEvent('sub-1', 'completed'),
        createTestEvent('sub-2', 'completed'),
        createTestEvent('sub-3', 'completed')
      ];
      
      const progress = service.calculateTaskProgress(task, subtasks);
      
      expect(progress.progressPercentage).toBe(100);
      expect(progress.status).toBe('completed');
      expect(progress.completedSubtasks).toBe(3);
      expect(progress.overdueSubtasks).toBe(0);
    });

    it('应该正确计算部分完成进度', () => {
      const task = createTestEvent('task-1', 'scheduled');
      const subtasks = [
        createTestEvent('sub-1', 'completed'),
        createTestEvent('sub-2', 'scheduled'),
        createTestEvent('sub-3', 'scheduled'),
        createTestEvent('sub-4', 'scheduled')
      ];
      
      const progress = service.calculateTaskProgress(task, subtasks);
      
      expect(progress.progressPercentage).toBe(25);
      expect(progress.completedSubtasks).toBe(1);
      expect(progress.totalSubtasks).toBe(4);
    });

    it('应该识别逾期任务', () => {
      const task = createTestEvent('task-1', 'scheduled');
      const yesterday = Date.now() - 86400000;
      const subtasks = [
        createTestEvent('sub-1', 'completed'),
        createTestEvent('sub-2', 'scheduled', yesterday - 7200000, yesterday),
        createTestEvent('sub-3', 'scheduled')
      ];
      
      const progress = service.calculateTaskProgress(task, subtasks);
      
      expect(progress.overdueSubtasks).toBeGreaterThan(0);
    });

    it('应该识别风险状态', () => {
      const task = createTestEvent('task-1', 'scheduled');
      task.endTime = Date.now() + 3600000;
      const subtasks = [
        createTestEvent('sub-1', 'scheduled'),
        createTestEvent('sub-2', 'scheduled'),
        createTestEvent('sub-3', 'scheduled'),
        createTestEvent('sub-4', 'scheduled')
      ];
      
      const progress = service.calculateTaskProgress(task, subtasks);
      
      expect(progress.status).toBe('at_risk');
    });

    it('应该返回所有必需字段', () => {
      const task = createTestEvent('task-1');
      const subtasks = [createTestEvent('sub-1', 'completed')];
      
      const progress = service.calculateTaskProgress(task, subtasks);
      
      expect(progress).toHaveProperty('itemId');
      expect(progress).toHaveProperty('title');
      expect(progress).toHaveProperty('totalSubtasks');
      expect(progress).toHaveProperty('completedSubtasks');
      expect(progress).toHaveProperty('overdueSubtasks');
      expect(progress).toHaveProperty('progressPercentage');
      expect(progress).toHaveProperty('status');
      expect(progress).toHaveProperty('lastUpdated');
      
      expect(['on_track', 'at_risk', 'overdue', 'completed']).toContain(progress.status);
    });
  });

  describe('calculateMilestoneProgress - 里程碑进度计算', () => {
    it('应该正确计算里程碑进度', () => {
      const milestone = {
        id: 'milestone-1',
        title: '里程碑1',
        targetDate: Date.now() + 86400000
      };
      
      const tasks = [
        createTestEvent('task-1', 'completed'),
        createTestEvent('task-2', 'completed'),
        createTestEvent('task-3', 'scheduled')
      ];
      
      const progress = service.calculateMilestoneProgress(milestone, tasks);
      
      expect(progress.completedTasks).toBe(2);
      expect(progress.totalTasks).toBe(3);
      expect(progress.status).toBe('in_progress');
    });

    it('应该识别已完成的里程碑', () => {
      const milestone = {
        id: 'milestone-1',
        title: '里程碑1',
        targetDate: Date.now() + 86400000
      };
      
      const tasks = [
        createTestEvent('task-1', 'completed'),
        createTestEvent('task-2', 'completed')
      ];
      
      const progress = service.calculateMilestoneProgress(milestone, tasks);
      
      expect(progress.status).toBe('completed');
    });

    it('应该识别逾期的里程碑', () => {
      const milestone = {
        id: 'milestone-1',
        title: '里程碑1',
        targetDate: Date.now() - 86400000
      };
      
      const tasks = [
        createTestEvent('task-1', 'completed'),
        createTestEvent('task-2', 'scheduled')
      ];
      
      const progress = service.calculateMilestoneProgress(milestone, tasks);
      
      expect(progress.status).toBe('overdue');
      expect(progress.daysRemaining).toBeLessThan(0);
    });

    it('应该正确计算剩余天数', () => {
      const milestone = {
        id: 'milestone-1',
        title: '里程碑1',
        targetDate: Date.now() + 3 * 86400000
      };
      
      const progress = service.calculateMilestoneProgress(milestone, []);
      
      expect(progress.daysRemaining).toBeGreaterThanOrEqual(2);
      expect(progress.daysRemaining).toBeLessThanOrEqual(4);
    });
  });

  describe('calculateGoalProgress - 目标进度计算', () => {
    it('应该正确计算目标整体进度', () => {
      const goal = createTestIdea('goal-1');
      const tasks = [
        createTestEvent('task-1', 'completed'),
        createTestEvent('task-2', 'completed'),
        createTestEvent('task-3', 'scheduled'),
        createTestEvent('task-4', 'scheduled')
      ];
      const milestones = [
        { id: 'm-1', title: '里程碑1', targetDate: Date.now() + 86400000 }
      ];
      
      const progress = service.calculateGoalProgress(goal, tasks, milestones);
      
      expect(progress.overallProgress).toBe(50);
      expect(progress.taskProgress).toHaveLength(4);
      expect(progress.milestoneProgress).toHaveLength(1);
    });

    it('应该计算健康分数', () => {
      const goal = createTestIdea('goal-1');
      const tasks = [
        createTestEvent('task-1', 'completed'),
        createTestEvent('task-2', 'completed'),
        createTestEvent('task-3', 'completed')
      ];
      const milestones: Array<{ id: string; title: string; targetDate: number }> = [];
      
      const progress = service.calculateGoalProgress(goal, tasks, milestones);
      
      expect(progress.healthScore).toBeGreaterThanOrEqual(0);
      expect(progress.healthScore).toBeLessThanOrEqual(100);
    });

    it('应该生成建议', () => {
      const goal = createTestIdea('goal-1');
      const tasks = [
        createTestEvent('task-1', 'scheduled'),
        createTestEvent('task-2', 'scheduled')
      ];
      const milestones = [
        { id: 'm-1', title: '里程碑1', targetDate: Date.now() - 86400000 }
      ];
      
      const progress = service.calculateGoalProgress(goal, tasks, milestones);
      
      expect(progress.recommendations.length).toBeGreaterThan(0);
    });

    it('应该返回所有必需字段', () => {
      const goal = createTestIdea('goal-1');
      const tasks = [createTestEvent('task-1')];
      const milestones: Array<{ id: string; title: string; targetDate: number }> = [];
      
      const progress = service.calculateGoalProgress(goal, tasks, milestones);
      
      expect(progress).toHaveProperty('goalId');
      expect(progress).toHaveProperty('goalTitle');
      expect(progress).toHaveProperty('createdAt');
      expect(progress).toHaveProperty('overallProgress');
      expect(progress).toHaveProperty('taskProgress');
      expect(progress).toHaveProperty('milestoneProgress');
      expect(progress).toHaveProperty('estimatedTimeRemaining');
      expect(progress).toHaveProperty('healthScore');
      expect(progress).toHaveProperty('recommendations');
    });
  });

  describe('getProgressSummary - 进度摘要', () => {
    it('应该正确统计目标数量', () => {
      const items = [
        createTestIdea('goal-1', 'pending'),
        createTestIdea('goal-2', 'completed'),
        createTestIdea('goal-3', 'scheduled')
      ];
      
      const summary = service.getProgressSummary(items);
      
      expect(summary.totalGoals).toBe(3);
      expect(summary.activeGoals).toBe(2);
      expect(summary.completedGoals).toBe(1);
    });

    it('应该正确统计任务数量', () => {
      const items = [
        createTestEvent('task-1', 'completed'),
        createTestEvent('task-2', 'completed'),
        createTestEvent('task-3', 'scheduled'),
        createTestEvent('task-4', 'cancelled')
      ];
      
      const summary = service.getProgressSummary(items);
      
      expect(summary.totalTasks).toBe(4);
      expect(summary.completedTasks).toBe(2);
    });

    it('应该识别紧急事项', () => {
      const yesterday = Date.now() - 86400000;
      const items = [
        createTestEvent('overdue', 'scheduled', yesterday - 7200000, yesterday),
        createTestEvent('high-priority', 'pending', Date.now(), Date.now() + 3600000, 'high')
      ];
      
      const summary = service.getProgressSummary(items);
      
      expect(summary.urgentItems.length).toBeGreaterThan(0);
    });

    it('应该计算平均进度', () => {
      const items = [
        createTestEvent('task-1', 'completed'),
        createTestEvent('task-2', 'completed'),
        createTestEvent('task-3', 'scheduled'),
        createTestEvent('task-4', 'scheduled')
      ];
      
      const summary = service.getProgressSummary(items);
      
      expect(summary.averageProgress).toBe(50);
    });

    it('应该返回所有必需字段', () => {
      const summary = service.getProgressSummary([]);
      
      expect(summary).toHaveProperty('totalGoals');
      expect(summary).toHaveProperty('activeGoals');
      expect(summary).toHaveProperty('completedGoals');
      expect(summary).toHaveProperty('totalTasks');
      expect(summary).toHaveProperty('completedTasks');
      expect(summary).toHaveProperty('overdueTasks');
      expect(summary).toHaveProperty('averageProgress');
      expect(summary).toHaveProperty('healthScore');
      expect(summary).toHaveProperty('urgentItems');
    });
  });

  describe('getProgressTrend - 进度趋势', () => {
    it('应该返回指定天数的趋势数据', () => {
      const items = [createTestEvent('task-1', 'completed')];
      
      const trend = service.getProgressTrend(items, 7);
      
      expect(trend.length).toBe(7);
    });

    it('每个趋势点应包含所有必需字段', () => {
      const items = [createTestEvent('task-1', 'completed')];
      
      const trend = service.getProgressTrend(items, 3);
      
      trend.forEach(point => {
        expect(point).toHaveProperty('date');
        expect(point).toHaveProperty('progress');
        expect(point).toHaveProperty('tasksCompleted');
        
        expect(typeof point.date).toBe('string');
        expect(typeof point.progress).toBe('number');
        expect(typeof point.tasksCompleted).toBe('number');
        expect(point.progress).toBeGreaterThanOrEqual(0);
        expect(point.progress).toBeLessThanOrEqual(100);
      });
    });

    it('应该正确计算每日完成的任务数', () => {
      const now = Date.now();
      const items = [
        { ...createTestEvent('task-1', 'completed'), updatedAt: now - 3600000 },
        { ...createTestEvent('task-2', 'completed'), updatedAt: now - 7200000 },
        { ...createTestEvent('task-3', 'completed'), updatedAt: now - 86400000 }
      ];
      
      const trend = service.getProgressTrend(items, 2);
      
      const totalCompleted = trend.reduce((sum, point) => sum + point.tasksCompleted, 0);
      expect(totalCompleted).toBe(3);
    });
  });

  describe('边界情况', () => {
    it('应该处理空项目列表', () => {
      const summary = service.getProgressSummary([]);
      
      expect(summary.totalGoals).toBe(0);
      expect(summary.totalTasks).toBe(0);
      expect(summary.averageProgress).toBe(0);
    });

    it('应该处理无子任务的任务', () => {
      const task = createTestEvent('task-1', 'scheduled');
      const progress = service.calculateTaskProgress(task, []);
      
      expect(progress.totalSubtasks).toBe(0);
      expect(progress.progressPercentage).toBe(0);
    });

    it('应该处理无任务的目标', () => {
      const goal = createTestIdea('goal-1');
      const progress = service.calculateGoalProgress(goal, [], []);
      
      expect(progress.overallProgress).toBe(0);
      expect(progress.taskProgress).toHaveLength(0);
    });
  });
});
