'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useUnifiedItems } from '@/lib/hooks/useUnifiedItems';
import { progressTrackerService, type GoalProgress, type ProgressSummary } from '@/lib/services/progressTrackerService';
import { useI18nStore } from '@/lib/stores/i18nStore';
import { useTranslation } from '@/lib/utils/translations';
import styles from './ProgressTrackerView.module.scss';

interface I18nText {
  'zh-CN': string;
  'en-US': string;
  [key: string]: string;
}

const txt = (obj: I18nText, locale: string) => obj[locale] || obj['zh-CN'];

export default function ProgressTrackerView() {
  const { items } = useUnifiedItems();
  const { locale } = useI18nStore();
  const t = useTranslation(locale);
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [goalProgress, setGoalProgress] = useState<GoalProgress[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  const i18n = {
    loading: txt({ 'zh-CN': '加载中...', 'en-US': 'Loading...' }, locale),
    title: txt({ 'zh-CN': '进度追踪', 'en-US': 'Progress Tracker' }, locale),
    health: txt({ 'zh-CN': '健康分', 'en-US': 'Health' }, locale),
    activeGoals: txt({ 'zh-CN': '进行中目标', 'en-US': 'Active Goals' }, locale),
    completedTasks: txt({ 'zh-CN': '已完成任务', 'en-US': 'Completed' }, locale),
    overdueTasks: txt({ 'zh-CN': '逾期任务', 'en-US': 'Overdue' }, locale),
    avgProgress: txt({ 'zh-CN': '平均进度', 'en-US': 'Avg Progress' }, locale),
    urgentTitle: txt({ 'zh-CN': '⚠️ 紧急事项', 'en-US': '⚠️ Urgent Items' }, locale),
    goalProgress: txt({ 'zh-CN': '目标进度', 'en-US': 'Goal Progress' }, locale),
    emptyState: txt({
      'zh-CN': '暂无目标，在秘书视图中输入"我想..."来创建目标',
      'en-US': 'No goals yet. Type "I want to..." in Secretary view to create one'
    }, locale),
    remaining: txt({ 'zh-CN': '剩余 ', 'en-US': 'Remaining: ' }, locale),
    healthScore: txt({ 'zh-CN': '健康度: ', 'en-US': 'Health: ' }, locale),
    taskList: txt({ 'zh-CN': '任务列表', 'en-US': 'Tasks' }, locale),
    recommendations: txt({ 'zh-CN': '建议', 'en-US': 'Recommendations' }, locale),
    hours: txt({ 'zh-CN': '小时', 'en-US': 'h' }, locale),
    minutes: txt({ 'zh-CN': '分钟', 'en-US': 'm' }, locale)
  };

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

  const formatDate = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric'
    });
  }, [locale]);

  const formatTime = useCallback((minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
      return `${hours}${i18n.hours} ${mins}${i18n.minutes}`;
    }
    if (hours > 0) {
      return `${hours}${i18n.hours}`;
    }
    return `${mins}${i18n.minutes}`;
  }, [i18n.hours, i18n.minutes]);

  if (!summary) {
    return (
      <div className={styles.container}>
        <div className={styles.loading} role="status" aria-live="polite">
          {i18n.loading}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container} role="main" aria-label={i18n.title}>
      <div className={styles.header}>
        <h2 className={styles.title}>{i18n.title}</h2>
        <div 
          className={styles.healthScore} 
          style={{ backgroundColor: healthColor }}
          role="meter"
          aria-valuenow={summary.healthScore}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${i18n.health}: ${summary.healthScore}`}
        >
          <span className={styles.scoreValue}>{summary.healthScore}</span>
          <span className={styles.scoreLabel}>{i18n.health}</span>
        </div>
      </div>

      <div className={styles.statsGrid} role="region" aria-label="Statistics">
        <div className={styles.statCard} role="group" aria-label={i18n.activeGoals}>
          <div className={styles.statIcon} aria-hidden="true">🎯</div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{summary.activeGoals}</span>
            <span className={styles.statLabel}>{i18n.activeGoals}</span>
          </div>
        </div>
        
        <div className={styles.statCard} role="group" aria-label={i18n.completedTasks}>
          <div className={styles.statIcon} aria-hidden="true">✅</div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{summary.completedTasks}</span>
            <span className={styles.statLabel}>{i18n.completedTasks}</span>
          </div>
        </div>
        
        <div className={styles.statCard} role="group" aria-label={i18n.overdueTasks}>
          <div className={styles.statIcon} aria-hidden="true">⏰</div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{summary.overdueTasks}</span>
            <span className={styles.statLabel}>{i18n.overdueTasks}</span>
          </div>
        </div>
        
        <div className={styles.statCard} role="group" aria-label={i18n.avgProgress}>
          <div className={styles.statIcon} aria-hidden="true">📊</div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{summary.averageProgress}%</span>
            <span className={styles.statLabel}>{i18n.avgProgress}</span>
          </div>
        </div>
      </div>

      {summary.urgentItems.length > 0 && (
        <div className={styles.urgentSection} role="alert" aria-live="assertive">
          <h3 className={styles.sectionTitle}>{i18n.urgentTitle}</h3>
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

      <div className={styles.goalsSection} role="region" aria-label={i18n.goalProgress}>
        <h3 className={styles.sectionTitle}>{i18n.goalProgress}</h3>
        
        {goalProgress.length === 0 ? (
          <div className={styles.emptyState}>
            <p>{i18n.emptyState}</p>
          </div>
        ) : (
          <div className={styles.goalsList} role="list">
            {goalProgress.map(goal => (
              <div 
                key={goal.goalId} 
                className={`${styles.goalCard} ${selectedGoal === goal.goalId ? styles.expanded : ''}`}
                onClick={() => setSelectedGoal(selectedGoal === goal.goalId ? null : goal.goalId)}
                role="listitem"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedGoal(selectedGoal === goal.goalId ? null : goal.goalId);
                  }
                }}
                aria-expanded={selectedGoal === goal.goalId}
              >
                <div className={styles.goalHeader}>
                  <h4 className={styles.goalTitle}>{goal.goalTitle}</h4>
                  <span 
                    className={styles.goalProgress}
                    role="progressbar"
                    aria-valuenow={goal.overallProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    {goal.overallProgress}%
                  </span>
                </div>
                
                <div className={styles.progressBar} role="presentation">
                  <div 
                    className={styles.progressFill}
                    style={{ width: `${goal.overallProgress}%` }}
                  />
                </div>
                
                <div className={styles.goalMeta}>
                  <span className={styles.goalTime}>
                    {i18n.remaining}{formatTime(goal.estimatedTimeRemaining)}
                  </span>
                  <span 
                    className={styles.goalHealth} 
                    style={{ color: goal.healthScore >= 70 ? '#22c55e' : goal.healthScore >= 40 ? '#eab308' : '#ef4444' }}
                  >
                    {i18n.healthScore}{goal.healthScore}
                  </span>
                </div>
                
                {selectedGoal === goal.goalId && goal.taskProgress.length > 0 && (
                  <div className={styles.goalDetails} role="region" aria-label={i18n.taskList}>
                    <h5>{i18n.taskList}</h5>
                    <div className={styles.taskList} role="list">
                      {goal.taskProgress.slice(0, 6).map(task => (
                        <div key={task.itemId} className={styles.taskItem} role="listitem">
                          <span className={styles.taskStatus} aria-hidden="true">
                            {task.status === 'completed' ? '✅' : task.status === 'overdue' ? '⚠️' : '⏳'}
                          </span>
                          <span className={styles.taskTitle}>{task.title}</span>
                          <span 
                            className={styles.taskPercent}
                            role="progressbar"
                            aria-valuenow={task.progressPercentage}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            {task.progressPercentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    {goal.recommendations.length > 0 && (
                      <div className={styles.recommendations}>
                        <h5>{i18n.recommendations}</h5>
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
