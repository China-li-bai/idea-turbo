import type { UnifiedCalendarItem, ItemStatus } from '@/types/unified';

export interface TaskProgress {
  itemId: string;
  title: string;
  totalSubtasks: number;
  completedSubtasks: number;
  overdueSubtasks: number;
  progressPercentage: number;
  status: 'on_track' | 'at_risk' | 'overdue' | 'completed';
  nextMilestone?: string;
  estimatedCompletionDate?: number;
  lastUpdated: number;
}

export interface MilestoneProgress {
  milestoneId: string;
  title: string;
  targetDate: number;
  completedTasks: number;
  totalTasks: number;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  daysRemaining: number;
}

export interface GoalProgress {
  goalId: string;
  goalTitle: string;
  createdAt: number;
  targetDate?: number;
  overallProgress: number;
  taskProgress: TaskProgress[];
  milestoneProgress: MilestoneProgress[];
  estimatedTimeRemaining: number;
  healthScore: number;
  recommendations: string[];
}

export interface ProgressSummary {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  averageProgress: number;
  healthScore: number;
  urgentItems: Array<{
    id: string;
    title: string;
    reason: string;
  }>;
}

export class ProgressTrackerService {
  private static instance: ProgressTrackerService;

  static getInstance(): ProgressTrackerService {
    if (!ProgressTrackerService.instance) {
      ProgressTrackerService.instance = new ProgressTrackerService();
    }
    return ProgressTrackerService.instance;
  }

  calculateTaskProgress(
    task: UnifiedCalendarItem,
    subtasks: UnifiedCalendarItem[]
  ): TaskProgress {
    const now = Date.now();
    
    const completedSubtasks = subtasks.filter(s => s.status === 'completed').length;
    const overdueSubtasks = subtasks.filter(s => {
      if (s.status === 'completed') return false;
      if (!s.endTime) return false;
      return s.endTime < now;
    }).length;
    
    const progressPercentage = subtasks.length > 0
      ? Math.round((completedSubtasks / subtasks.length) * 100)
      : (task.status === 'completed' ? 100 : 0);
    
    let status: TaskProgress['status'];
    if (progressPercentage === 100) {
      status = 'completed';
    } else if (overdueSubtasks > 0) {
      status = 'overdue';
    } else if (progressPercentage < 50 && task.endTime && task.endTime - now < 24 * 60 * 60 * 1000) {
      status = 'at_risk';
    } else {
      status = 'on_track';
    }
    
    const estimatedCompletionDate = this.estimateCompletionDate(
      task,
      subtasks,
      progressPercentage
    );
    
    return {
      itemId: task.id,
      title: task.title,
      totalSubtasks: subtasks.length,
      completedSubtasks,
      overdueSubtasks,
      progressPercentage,
      status,
      estimatedCompletionDate,
      lastUpdated: now
    };
  }

  calculateMilestoneProgress(
    milestone: { id: string; title: string; targetDate: number },
    relatedTasks: UnifiedCalendarItem[]
  ): MilestoneProgress {
    const now = Date.now();
    const completedTasks = relatedTasks.filter(t => t.status === 'completed').length;
    const totalTasks = relatedTasks.length;
    const daysRemaining = Math.ceil((milestone.targetDate - now) / (24 * 60 * 60 * 1000));
    
    let status: MilestoneProgress['status'];
    if (completedTasks === totalTasks && totalTasks > 0) {
      status = 'completed';
    } else if (milestone.targetDate < now && completedTasks < totalTasks) {
      status = 'overdue';
    } else if (completedTasks > 0) {
      status = 'in_progress';
    } else {
      status = 'pending';
    }
    
    return {
      milestoneId: milestone.id,
      title: milestone.title,
      targetDate: milestone.targetDate,
      completedTasks,
      totalTasks,
      status,
      daysRemaining
    };
  }

  calculateGoalProgress(
    goal: UnifiedCalendarItem,
    tasks: UnifiedCalendarItem[],
    milestones: Array<{ id: string; title: string; targetDate: number }>
  ): GoalProgress {
    const taskProgress = tasks.map(t => this.calculateTaskProgress(t, []));
    const milestoneProgress = milestones.map(m => 
      this.calculateMilestoneProgress(m, tasks.filter(t => 
        t.metadata?.description?.includes(m.title)
      ))
    );
    
    const overallProgress = taskProgress.length > 0
      ? taskProgress.reduce((sum, tp) => sum + tp.progressPercentage, 0) / taskProgress.length
      : 0;
    
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalEstimatedMinutes = tasks.reduce((sum, t) => {
      const duration = t.startTime && t.endTime 
        ? (t.endTime - t.startTime) / 60000 
        : 60;
      return sum + duration;
    }, 0);
    
    const remainingTasks = tasks.length - completedTasks;
    const avgTaskDuration = totalEstimatedMinutes / tasks.length || 60;
    const estimatedTimeRemaining = remainingTasks * avgTaskDuration;
    
    const healthScore = this.calculateHealthScore(
      overallProgress,
      taskProgress,
      milestoneProgress,
      goal.endTime
    );
    
    const recommendations = this.generateRecommendations(
      taskProgress,
      milestoneProgress,
      healthScore
    );
    
    return {
      goalId: goal.id,
      goalTitle: goal.title,
      createdAt: goal.createdAt,
      targetDate: goal.endTime || undefined,
      overallProgress,
      taskProgress,
      milestoneProgress,
      estimatedTimeRemaining,
      healthScore,
      recommendations
    };
  }

  getProgressSummary(
    allItems: UnifiedCalendarItem[],
    goalIds?: string[]
  ): ProgressSummary {
    const goals = allItems.filter(item => 
      item.type === 'idea' && 
      (!goalIds || goalIds.includes(item.id))
    );
    
    const tasks = allItems.filter(item => item.type === 'event');
    const now = Date.now();
    
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const overdueTasks = tasks.filter(t => 
      t.status !== 'completed' && 
      t.endTime && 
      t.endTime < now
    ).length;
    
    const averageProgress = tasks.length > 0
      ? (completedTasks / tasks.length) * 100
      : 0;
    
    const activeGoals = goals.filter(g => g.status === 'pending' || g.status === 'scheduled').length;
    const completedGoals = goals.filter(g => g.status === 'completed').length;
    
    const healthScore = this.calculateOverallHealthScore(
      averageProgress,
      overdueTasks,
      tasks.length,
      activeGoals
    );
    
    const urgentItems = this.findUrgentItems(allItems);
    
    return {
      totalGoals: goals.length,
      activeGoals,
      completedGoals,
      totalTasks: tasks.length,
      completedTasks,
      overdueTasks,
      averageProgress,
      healthScore,
      urgentItems
    };
  }

  private estimateCompletionDate(
    task: UnifiedCalendarItem,
    subtasks: UnifiedCalendarItem[],
    currentProgress: number
  ): number | undefined {
    if (currentProgress === 100) {
      return Date.now();
    }
    
    if (currentProgress === 0 || subtasks.length === 0) {
      return task.endTime || undefined;
    }
    
    const completedSubtasks = subtasks.filter(s => s.status === 'completed');
    if (completedSubtasks.length === 0) {
      return task.endTime || undefined;
    }
    
    const firstCompletedAt = Math.min(...completedSubtasks.map(s => s.updatedAt));
    const elapsedTime = Date.now() - firstCompletedAt;
    const avgTimePerSubtask = elapsedTime / completedSubtasks.length;
    const remainingSubtasks = subtasks.length - completedSubtasks.length;
    
    return Date.now() + (avgTimePerSubtask * remainingSubtasks);
  }

  private calculateHealthScore(
    progress: number,
    taskProgress: TaskProgress[],
    milestoneProgress: MilestoneProgress[],
    deadline?: number | null
  ): number {
    let score = 50;
    
    score += progress * 0.3;
    
    const atRiskCount = taskProgress.filter(tp => tp.status === 'at_risk').length;
    const overdueCount = taskProgress.filter(tp => tp.status === 'overdue').length;
    score -= atRiskCount * 5;
    score -= overdueCount * 10;
    
    const overdueMilestones = milestoneProgress.filter(mp => mp.status === 'overdue').length;
    score -= overdueMilestones * 15;
    
    if (deadline) {
      const now = Date.now();
      const timeRemaining = deadline - now;
      const totalTime = deadline - (taskProgress[0]?.lastUpdated || now);
      const timeProgress = 1 - (timeRemaining / totalTime);
      
      if (progress / 100 < timeProgress - 0.1) {
        score -= 10;
      } else if (progress / 100 > timeProgress + 0.1) {
        score += 10;
      }
    }
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private calculateOverallHealthScore(
    averageProgress: number,
    overdueTasks: number,
    totalTasks: number,
    activeGoals: number
  ): number {
    let score = 50;
    
    score += averageProgress * 0.3;
    
    const overdueRate = totalTasks > 0 ? overdueTasks / totalTasks : 0;
    score -= overdueRate * 50;
    
    if (activeGoals > 0 && averageProgress > 50) {
      score += 10;
    }
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private generateRecommendations(
    taskProgress: TaskProgress[],
    milestoneProgress: MilestoneProgress[],
    healthScore: number
  ): string[] {
    const recommendations: string[] = [];
    
    const overdueTasks = taskProgress.filter(tp => tp.status === 'overdue');
    if (overdueTasks.length > 0) {
      recommendations.push(`有 ${overdueTasks.length} 个任务已逾期，建议优先处理`);
    }
    
    const atRiskTasks = taskProgress.filter(tp => tp.status === 'at_risk');
    if (atRiskTasks.length > 0) {
      recommendations.push(`有 ${atRiskTasks.length} 个任务进度落后，需要关注`);
    }
    
    const overdueMilestones = milestoneProgress.filter(mp => mp.status === 'overdue');
    if (overdueMilestones.length > 0) {
      recommendations.push(`有 ${overdueMilestones.length} 个里程碑已逾期`);
    }
    
    const upcomingMilestones = milestoneProgress.filter(mp => 
      mp.status === 'in_progress' && mp.daysRemaining <= 7
    );
    if (upcomingMilestones.length > 0) {
      recommendations.push(`本周有 ${upcomingMilestones.length} 个里程碑即将到期`);
    }
    
    if (healthScore < 50) {
      recommendations.push('整体进度不理想，建议重新评估目标可行性');
    } else if (healthScore > 80) {
      recommendations.push('进度良好，继续保持！');
    }
    
    return recommendations;
  }

  private findUrgentItems(
    allItems: UnifiedCalendarItem[]
  ): Array<{ id: string; title: string; reason: string }> {
    const now = Date.now();
    const tomorrow = now + 24 * 60 * 60 * 1000;
    const urgentItems: Array<{ id: string; title: string; reason: string }> = [];
    
    const overdueItems = allItems.filter(item => 
      item.type === 'event' &&
      item.status !== 'completed' &&
      item.endTime &&
      item.endTime < now
    );
    
    for (const item of overdueItems) {
      urgentItems.push({
        id: item.id,
        title: item.title,
        reason: '已逾期'
      });
    }
    
    const dueToday = allItems.filter(item =>
      item.type === 'event' &&
      item.status !== 'completed' &&
      item.endTime &&
      item.endTime >= now &&
      item.endTime < tomorrow
    );
    
    for (const item of dueToday) {
      urgentItems.push({
        id: item.id,
        title: item.title,
        reason: '今天到期'
      });
    }
    
    const highPriorityPending = allItems.filter(item =>
      item.type === 'event' &&
      item.status === 'pending' &&
      item.metadata?.priority === 'high'
    );
    
    for (const item of highPriorityPending.slice(0, 3)) {
      urgentItems.push({
        id: item.id,
        title: item.title,
        reason: '高优先级待处理'
      });
    }
    
    return urgentItems.slice(0, 5);
  }

  getProgressTrend(
    items: UnifiedCalendarItem[],
    days: number = 7
  ): Array<{ date: string; progress: number; tasksCompleted: number }> {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const trend: Array<{ date: string; progress: number; tasksCompleted: number }> = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const dateStart = now - (i * dayMs);
      const dateEnd = dateStart + dayMs;
      
      const completedOnDay = items.filter(item =>
        item.status === 'completed' &&
        item.updatedAt >= dateStart &&
        item.updatedAt < dateEnd
      ).length;
      
      const totalByDate = items.filter(item =>
        item.createdAt < dateEnd
      ).length;
      
      const completedByDate = items.filter(item =>
        item.status === 'completed' &&
        item.updatedAt < dateEnd
      ).length;
      
      const progress = totalByDate > 0 
        ? (completedByDate / totalByDate) * 100 
        : 0;
      
      trend.push({
        date: new Date(dateStart).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        progress: Math.round(progress),
        tasksCompleted: completedOnDay
      });
    }
    
    return trend;
  }
}

export const progressTrackerService = ProgressTrackerService.getInstance();
