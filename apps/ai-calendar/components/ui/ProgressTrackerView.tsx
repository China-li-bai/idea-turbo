'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUnifiedItems } from '@/lib/hooks/useUnifiedItems';
import { progressTrackerService, type GoalProgress, type ProgressSummary } from '@/lib/services/progressTrackerService';
import { useLocale } from '@/lib/contexts/ClientProviders';
import styles from './ProgressTrackerView.module.scss';

export default function ProgressTrackerView() {
  const { items } = useUnifiedItems();
  const { locale } = useLocale();
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [goalProgress, setGoalProgress] = useState<GoalProgress[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  useEffect(() => {
    const progressSummary = progressTrackerService.getProgressSummary(items);
    setSummary(progressSummary);
    
    const goals = items.filter(item => 
      item.type === 'idea' && 
      item.status !== 'cancelled'
    );
    
    const progressList = goals.map(goal => {
      const relatedTasks = items.filter(item => 
        item.type === 'event' && 
        item.metadata?.parentGoalId === goal.id
      );
      
      const milestones = goal.metadata?.milestones || [];
      
      return progressTrackerService.calculateGoalProgress(goal, relatedTasks, milestones);
    });
    
    setGoalProgress(progressList);
  }, [items]);

  const healthColor = useMemo(() => {
    if (!summary) return '#888';
    if (summary.healthScore >= 80) return '#22c55e';
    if (summary.healthScore >= 60) return '#eab308';
    return '#ef4444';
  }, [summary]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
      return locale.startsWith('zh') ? `${hours}小时${mins}分钟` : `${hours}h ${mins}m`;
    }
    if (hours > 0) {
      return locale.startsWith('zh') ? `${hours}小时` : `${hours}h`;
    }
    return locale.startsWith('zh') ? `${mins}分钟` : `${mins}m`;
  };

  if (!summary) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          {locale.startsWith('zh') ? '加载中...' : 'Loading...'}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          {locale.startsWith('zh') ? '进度追踪' : 'Progress Tracker'}
        </h2>
        <div className={styles.healthScore} style={{ backgroundColor: healthColor }}>
          <span className={styles.scoreValue}>{summary.healthScore}</span>
          <span className={styles.scoreLabel}>
            {locale.startsWith('zh') ? '健康分' : 'Health'}
          </span>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🎯</div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{summary.activeGoals}</span>
            <span className={styles.statLabel}>
              {locale.startsWith('zh') ? '进行中目标' : 'Active Goals'}
            </span>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon}>✅</div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{summary.completedTasks}</span>
            <span className={styles.statLabel}>
              {locale.startsWith('zh') ? '已完成任务' : 'Completed'}
            </span>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon}>⏰</div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{summary.overdueTasks}</span>
            <span className={styles.statLabel}>
              {locale.startsWith('zh') ? '逾期任务' : 'Overdue'}
            </span>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📊</div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{summary.averageProgress}%</span>
            <span className={styles.statLabel}>
              {locale.startsWith('zh') ? '平均进度' : 'Avg Progress'}
            </span>
          </div>
        </div>
      </div>

      {summary.urgentItems.length > 0 && (
        <div className={styles.urgentSection}>
          <h3 className={styles.sectionTitle}>
            {locale.startsWith('zh') ? '⚠️ 紧急事项' : '⚠️ Urgent Items'}
          </h3>
          <div className={styles.urgentList}>
            {summary.urgentItems.slice(0, 5).map(item => (
              <div key={item.id} className={styles.urgentItem}>
                <span className={styles.urgentTitle}>{item.title}</span>
                <span className={styles.urgentReason}>{item.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.goalsSection}>
        <h3 className={styles.sectionTitle}>
          {locale.startsWith('zh') ? '目标进度' : 'Goal Progress'}
        </h3>
        
        {goalProgress.length === 0 ? (
          <div className={styles.emptyState}>
            <p>
              {locale.startsWith('zh') 
                ? '暂无目标，在秘书中输入"我想..."来创建目标' 
                : 'No goals yet. Try "I want to..." in the secretary view'}
            </p>
          </div>
        ) : (
          <div className={styles.goalsList}>
            {goalProgress.map(goal => (
              <div 
                key={goal.goalId} 
                className={`${styles.goalCard} ${selectedGoal === goal.goalId ? styles.expanded : ''}`}
                onClick={() => setSelectedGoal(selectedGoal === goal.goalId ? null : goal.goalId)}
              >
                <div className={styles.goalHeader}>
                  <h4 className={styles.goalTitle}>{goal.goalTitle}</h4>
                  <span className={styles.goalProgress}>{goal.overallProgress}%</span>
                </div>
                
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill}
                    style={{ width: `${goal.overallProgress}%` }}
                  />
                </div>
                
                <div className={styles.goalMeta}>
                  <span className={styles.goalTime}>
                    {locale.startsWith('zh') ? '剩余 ' : 'Remaining: '}
                    {formatTime(goal.estimatedTimeRemaining)}
                  </span>
                  <span className={styles.goalHealth} style={{ color: goal.healthScore >= 70 ? '#22c55e' : goal.healthScore >= 40 ? '#eab308' : '#ef4444' }}>
                    {locale.startsWith('zh') ? '健康度 ' : 'Health: '}{goal.healthScore}
                  </span>
                </div>
                
                {selectedGoal === goal.goalId && goal.taskProgress.length > 0 && (
                  <div className={styles.goalDetails}>
                    <h5>{locale.startsWith('zh') ? '任务列表' : 'Tasks'}</h5>
                    <div className={styles.taskList}>
                      {goal.taskProgress.slice(0, 6).map(task => (
                        <div key={task.itemId} className={styles.taskItem}>
                          <span className={styles.taskStatus}>
                            {task.status === 'completed' ? '✅' : task.status === 'overdue' ? '⚠️' : '⏳'}
                          </span>
                          <span className={styles.taskTitle}>{task.title}</span>
                          <span className={styles.taskPercent}>{task.progressPercentage}%</span>
                        </div>
                      ))}
                    </div>
                    
                    {goal.recommendations.length > 0 && (
                      <div className={styles.recommendations}>
                        <h5>{locale.startsWith('zh') ? '建议' : 'Recommendations'}</h5>
                        <ul>
                          {goal.recommendations.slice(0, 3).map((rec, idx) => (
                            <li key={idx}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
