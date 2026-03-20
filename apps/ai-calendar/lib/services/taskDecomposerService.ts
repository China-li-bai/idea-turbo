import { aiService } from '@/lib/ai';
import { smartScheduler } from '@/lib/services/smartScheduler';
import type { UnifiedCalendarItem, ItemStatus } from '@/types/unified';
import type { Message } from '@/lib/ai/types';

export interface DecomposedTask {
  id: string;
  title: string;
  description?: string;
  estimatedMinutes: number;
  priority: 'high' | 'medium' | 'low';
  dependencies: string[];
  suggestedStartTime?: number;
  suggestedEndTime?: number;
  status: ItemStatus;
}

export interface Milestone {
  id: string;
  title: string;
  targetDate: number;
  description?: string;
}

export interface DecompositionResult {
  tasks: DecomposedTask[];
  milestones: Milestone[];
  totalEstimatedMinutes: number;
  confidence: number;
  explanation: string;
}

export interface DecompositionContext {
  existingEvents: UnifiedCalendarItem[];
  userPreferences: {
    workHours: { start: number; end: number };
    workDays: number[];
    defaultDuration: number;
  };
  currentDate: Date;
}

const DECOMPOSITION_PROMPT = `你是一个任务分解专家，帮助用户将复杂目标分解为可执行的任务。

## 任务：
分析用户的目标，将其分解为具体的、可执行的任务和里程碑。

## 输出格式（JSON）：
{
  "tasks": [
    {
      "title": "<任务标题>",
      "description": "<任务描述>",
      "estimatedMinutes": <预估分钟数>,
      "priority": "<high|medium|low>",
      "dependencies": ["<依赖的任务ID>"]
    }
  ],
  "milestones": [
    {
      "title": "<里程碑标题>",
      "targetDate": "<YYYY-MM-DD>",
      "description": "<里程碑描述>"
    }
  ],
  "explanation": "<一句话解释分解策略>"
}

## 分解规则：
1. 每个任务应该是可在 0.5-4 小时内完成的独立单元
2. 任务之间可以有依赖关系，用数组表示依赖的任务索引（如 [0, 1] 表示依赖第1和第2个任务）
3. 里程碑是重要的检查点，不是具体任务
4. 优先级：high（必须完成）、medium（重要但可调整）、low（可选）
5. 任务数量建议 3-10 个，复杂目标可更多

## 示例：

用户目标: "在 Q2 完成一个开源项目"
输出: {
  "tasks": [
    {
      "title": "确定项目方向和技术栈",
      "description": "调研并确定项目要解决的具体问题",
      "estimatedMinutes": 120,
      "priority": "high",
      "dependencies": []
    },
    {
      "title": "设计项目架构和 API",
      "description": "绘制系统架构图，定义核心 API 接口",
      "estimatedMinutes": 180,
      "priority": "high",
      "dependencies": [0]
    },
    {
      "title": "搭建项目基础结构",
      "description": "初始化仓库，配置 CI/CD，设置代码规范",
      "estimatedMinutes": 90,
      "priority": "high",
      "dependencies": [1]
    },
    {
      "title": "实现核心功能模块",
      "description": "开发项目的主要功能",
      "estimatedMinutes": 480,
      "priority": "high",
      "dependencies": [2]
    },
    {
      "title": "编写单元测试",
      "description": "为核心模块编写测试用例",
      "estimatedMinutes": 180,
      "priority": "medium",
      "dependencies": [3]
    },
    {
      "title": "编写文档",
      "description": "README、API 文档、使用指南",
      "estimatedMinutes": 120,
      "priority": "medium",
      "dependencies": [3]
    },
    {
      "title": "发布到 GitHub",
      "description": "创建仓库，推送代码，设置项目主页",
      "estimatedMinutes": 60,
      "priority": "high",
      "dependencies": [4, 5]
    }
  ],
  "milestones": [
    {
      "title": "项目设计完成",
      "targetDate": "2024-04-15",
      "description": "完成技术选型和架构设计"
    },
    {
      "title": "核心功能可用",
      "targetDate": "2024-05-15",
      "description": "MVP 版本可以正常运行"
    },
    {
      "title": "项目发布",
      "targetDate": "2024-06-30",
      "description": "正式开源发布"
    }
  ],
  "explanation": "将开源项目分解为7个核心任务，按依赖关系排序，设置3个关键里程碑"
}

## 重要：
1. 只输出 JSON，不要有其他文字
2. 确保任务之间的依赖关系合理
3. 时间估算要保守一些，预留缓冲
4. 考虑用户的时间约束（如果有提供）`;

function generateTaskId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'task-' + Math.random().toString(36).substring(2, 11);
}

function parseDateString(dateStr: string, baseDate: Date): number {
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.getTime();
  }
  
  const lowerStr = dateStr.toLowerCase();
  const result = new Date(baseDate);
  
  if (lowerStr.includes('week')) {
    const weeks = parseInt(lowerStr) || 1;
    result.setDate(result.getDate() + weeks * 7);
    return result.getTime();
  }
  
  if (lowerStr.includes('month')) {
    const months = parseInt(lowerStr) || 1;
    result.setMonth(result.getMonth() + months);
    return result.getTime();
  }
  
  return result.getTime();
}

export class TaskDecomposerService {
  private static instance: TaskDecomposerService;

  static getInstance(): TaskDecomposerService {
    if (!TaskDecomposerService.instance) {
      TaskDecomposerService.instance = new TaskDecomposerService();
    }
    return TaskDecomposerService.instance;
  }

  async decompose(
    idea: UnifiedCalendarItem,
    context: DecompositionContext
  ): Promise<DecompositionResult> {
    const contextInfo = this.buildContextInfo(idea, context);
    
    const messages: Message[] = [
      { role: 'system', content: DECOMPOSITION_PROMPT },
      { role: 'user', content: contextInfo }
    ];

    try {
      const response = await aiService.chat(messages, {
        temperature: 0.5,
        max_tokens: 1500,
        provider: 'glm'
      });

      const content = response.choices[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        return this.createFallbackResult(idea);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const result = this.transformParsedResult(parsed, context);
      
      return result;
    } catch (error) {
      console.error('Failed to decompose task:', error);
      return this.createFallbackResult(idea);
    }
  }

  private buildContextInfo(idea: UnifiedCalendarItem, context: DecompositionContext): string {
    const { existingEvents, userPreferences, currentDate } = context;
    
    const upcomingEvents = existingEvents
      .filter(item => item.type === 'event' && item.startTime && item.startTime > Date.now())
      .slice(0, 5)
      .map(item => {
        const date = new Date(item.startTime!);
        return `- ${item.title} (${date.toLocaleDateString('zh-CN')}, ${item.startTime! - item.endTime!}分钟)`;
      });

    const workHoursStr = `${userPreferences.workHours.start}:00 - ${userPreferences.workHours.end}:00`;
    const workDaysStr = userPreferences.workDays.map(d => ['日', '一', '二', '三', '四', '五', '六'][d]).join('、');

    return `用户目标: ${idea.title}
${idea.content ? `详细描述: ${idea.content}` : ''}

当前日期: ${currentDate.toLocaleDateString('zh-CN', { weekday: 'long' })}
工作时间: ${workHoursStr}（周${workDaysStr}）

即将到来的日程:
${upcomingEvents.length > 0 ? upcomingEvents.join('\n') : '- 暂无日程'}

请根据以上信息，将用户目标分解为可执行的任务。`;
  }

  private transformParsedResult(
    parsed: {
      tasks: Array<{
        title: string;
        description?: string;
        estimatedMinutes: number;
        priority: string;
        dependencies: number[];
      }>;
      milestones: Array<{
        title: string;
        targetDate: string;
        description?: string;
      }>;
      explanation: string;
    },
    context: DecompositionContext
  ): DecompositionResult {
    const taskIds: string[] = [];
    
    const tasks: DecomposedTask[] = parsed.tasks.map((task, index) => {
      const id = generateTaskId();
      taskIds.push(id);
      
      return {
        id,
        title: task.title,
        description: task.description,
        estimatedMinutes: task.estimatedMinutes,
        priority: task.priority as 'high' | 'medium' | 'low',
        dependencies: task.dependencies
          .filter(depIndex => depIndex >= 0 && depIndex < taskIds.length - 1)
          .map(depIndex => taskIds[depIndex]),
        status: 'pending' as ItemStatus
      };
    });

    const milestones: Milestone[] = parsed.milestones.map(milestone => ({
      id: generateTaskId(),
      title: milestone.title,
      targetDate: parseDateString(milestone.targetDate, context.currentDate),
      description: milestone.description
    }));

    const totalEstimatedMinutes = tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0);

    return {
      tasks,
      milestones,
      totalEstimatedMinutes,
      confidence: 0.85,
      explanation: parsed.explanation || '任务分解完成'
    };
  }

  private createFallbackResult(idea: UnifiedCalendarItem): DecompositionResult {
    return {
      tasks: [
        {
          id: generateTaskId(),
          title: idea.title,
          description: idea.content,
          estimatedMinutes: 60,
          priority: 'medium',
          dependencies: [],
          status: 'pending'
        }
      ],
      milestones: [],
      totalEstimatedMinutes: 60,
      confidence: 0.5,
      explanation: '无法分解，已创建单个任务'
    };
  }

  async suggestSchedule(
    tasks: DecomposedTask[],
    context: DecompositionContext
  ): Promise<DecomposedTask[]> {
    const scheduledTasks: DecomposedTask[] = [];
    const scheduledDates = new Map<string, { start: number; end: number }>();
    
    const sortedTasks = this.topologicalSort(tasks);
    
    for (const task of sortedTasks) {
      let earliestStart = Date.now();
      
      for (const depId of task.dependencies) {
        const depScheduled = scheduledDates.get(depId);
        if (depScheduled) {
          earliestStart = Math.max(earliestStart, depScheduled.end);
        }
      }
      
      const suggestion = this.findNextAvailableSlot(
        earliestStart,
        task.estimatedMinutes,
        context
      );
      
      if (suggestion) {
        scheduledTasks.push({
          ...task,
          suggestedStartTime: suggestion.start,
          suggestedEndTime: suggestion.end
        });
        scheduledDates.set(task.id, suggestion);
      } else {
        scheduledTasks.push(task);
      }
    }
    
    return scheduledTasks;
  }

  private topologicalSort(tasks: DecomposedTask[]): DecomposedTask[] {
    const sorted: DecomposedTask[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    
    const visit = (taskId: string) => {
      if (visited.has(taskId)) return;
      if (visiting.has(taskId)) return;
      
      visiting.add(taskId);
      const task = taskMap.get(taskId);
      if (task) {
        for (const depId of task.dependencies) {
          visit(depId);
        }
        sorted.push(task);
      }
      visiting.delete(taskId);
      visited.add(taskId);
    };
    
    for (const task of tasks) {
      visit(task.id);
    }
    
    return sorted;
  }

  private findNextAvailableSlot(
    earliestStart: number,
    durationMinutes: number,
    context: DecompositionContext
  ): { start: number; end: number } | null {
    const { existingEvents, userPreferences, currentDate } = context;
    const { workHours, workDays } = userPreferences;
    
    let searchDate = new Date(Math.max(earliestStart, currentDate.getTime()));
    let attempts = 0;
    const maxAttempts = 14;
    
    while (attempts < maxAttempts) {
      const dayOfWeek = searchDate.getDay();
      
      if (workDays.includes(dayOfWeek)) {
        const dayStart = new Date(searchDate);
        dayStart.setHours(workHours.start, 0, 0, 0);
        const dayEnd = new Date(searchDate);
        dayEnd.setHours(workHours.end, 0, 0, 0);
        
        const slots = smartScheduler.findFreeSlots(
          searchDate,
          durationMinutes,
          existingEvents,
          30
        );
        
        const validSlot = slots.find(slot => {
          const slotStart = slot.start.getTime();
          return slotStart >= Math.max(earliestStart, dayStart.getTime()) &&
                 slot.available &&
                 slot.end.getTime() <= dayEnd.getTime();
        });
        
        if (validSlot) {
          return {
            start: validSlot.start.getTime(),
            end: validSlot.end.getTime()
          };
        }
      }
      
      searchDate.setDate(searchDate.getDate() + 1);
      attempts++;
    }
    
    return null;
  }
}

export const taskDecomposerService = TaskDecomposerService.getInstance();
