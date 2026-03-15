import { vectorService } from './vectorService';
import { dataStoreAdapter } from './dataStoreAdapter';
import type { CalendarEvent, Task, Inspiration, SearchResult } from '@/types';

type EntityType = 'event' | 'task' | 'inspiration';

interface SimilarItem {
  id: string;
  type: EntityType;
  similarity: number;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  relationReason: string;
}

interface SmartTag {
  name: string;
  confidence: number;
  category: 'topic' | 'person' | 'location' | 'time' | 'priority';
}

interface DuplicateCheckResult {
  isDuplicate: boolean;
  similarItems: SimilarItem[];
  suggestion: string;
}

interface ContextualLink {
  sourceId: string;
  targetId: string;
  targetType: EntityType;
  linkType: 'similar' | 'related' | 'follow_up' | 'reference';
  confidence: number;
}

class VectorEnhancedService {
  
  async findSimilarEvents(
    eventId: string,
    options?: {
      limit?: number;
      threshold?: number;
      excludeSameDay?: boolean;
    }
  ): Promise<SimilarItem[]> {
    const event = await dataStoreAdapter.getEventById(eventId);
    if (!event) {
      return [];
    }

    const query = [
      event.title,
      event.description || '',
      event.location || '',
    ].filter(Boolean).join(' ');

    const results = await vectorService.search(query, {
      k: (options?.limit || 5) + 1,
      similarity: options?.threshold || 0.7,
      filters: { types: ['event'] },
    });

    return results
      .filter(r => r.id !== eventId)
      .filter(r => {
        if (options?.excludeSameDay && r.metadata?.date) {
          const resultDate = new Date(r.metadata.date as string).toDateString();
          return resultDate !== event.startTime.toDateString();
        }
        return true;
      })
      .slice(0, options?.limit || 5)
      .map(r => ({
        id: r.id,
        type: 'event',
        similarity: r.score,
        title: r.title,
        content: r.content,
        metadata: r.metadata,
        relationReason: this.explainSimilarity(r.score),
      }));
  }

  async findSimilarTasks(
    taskId: string,
    options?: {
      limit?: number;
      threshold?: number;
    }
  ): Promise<SimilarItem[]> {
    const tasks = await dataStoreAdapter.getAllTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      return [];
    }

    const query = [task.title, task.description || ''].filter(Boolean).join(' ');

    const results = await vectorService.search(query, {
      k: (options?.limit || 5) + 1,
      similarity: options?.threshold || 0.7,
      filters: { types: ['task'] },
    });

    return results
      .filter(r => r.id !== taskId)
      .slice(0, options?.limit || 5)
      .map(r => ({
        id: r.id,
        type: 'task',
        similarity: r.score,
        title: r.title,
        content: r.content,
        metadata: r.metadata,
        relationReason: this.explainSimilarity(r.score),
      }));
  }

  async linkInspirationToEvents(
    inspirationId: string,
    options?: {
      threshold?: number;
      limit?: number;
    }
  ): Promise<ContextualLink[]> {
    const inspirations = await dataStoreAdapter.getAllInspirations();
    const inspiration = inspirations.find(i => i.id === inspirationId);
    if (!inspiration) {
      return [];
    }

    const results = await vectorService.search(inspiration.content, {
      k: options?.limit || 5,
      similarity: options?.threshold || 0.6,
      filters: { types: ['event'] },
    });

    return results.map(r => ({
      sourceId: inspirationId,
      targetId: r.id,
      targetType: 'event',
      linkType: this.determineLinkType(r.score, r.metadata) as ContextualLink['linkType'],
      confidence: r.score,
    }));
  }

  async generateSmartTags(
    text: string,
    existingTags?: string[]
  ): Promise<SmartTag[]> {
    const tags: SmartTag[] = [];

    const timePatterns = [
      { pattern: /会议|会见|见面|商谈|洽谈/gi, tag: '会议', category: 'topic' as const },
      { pattern: /项目|开发|设计|需求/gi, tag: '项目', category: 'topic' as const },
      { pattern: /培训|学习|课程/gi, tag: '学习', category: 'topic' as const },
      { pattern: /面试|招聘|入职/gi, tag: '人事', category: 'topic' as const },
    ];

    const locationPatterns = [
      { pattern: /会议室|办公室|总部/gi, tag: '办公室', category: 'location' as const },
      { pattern: /咖啡|餐厅|饭店/gi, tag: '餐饮', category: 'location' as const },
      { pattern: /医院|诊所/gi, tag: '医疗', category: 'location' as const },
    ];

    const priorityPatterns = [
      { pattern: /紧急|重要|尽快|立即/gi, tag: '紧急', category: 'priority' as const },
      { pattern: /可选|待定|可能/gi, tag: '低优先级', category: 'priority' as const },
    ];

    const personPattern = /[^\s]+(?:总|经理|总监|老师|医生|先生|女士)/g;
    const persons = text.match(personPattern) || [];
    persons.forEach(person => {
      tags.push({
        name: person,
        confidence: 0.9,
        category: 'person',
      });
    });

    [...timePatterns, ...locationPatterns, ...priorityPatterns].forEach(({ pattern, tag, category }) => {
      if (pattern.test(text)) {
        tags.push({
          name: tag,
          confidence: 0.85,
          category,
        });
      }
    });

    if (existingTags && existingTags.length > 0) {
      const similarResults = await vectorService.search(text, { k: 3, similarity: 0.6 });
      similarResults.forEach(r => {
        if (r.metadata?.tags && Array.isArray(r.metadata.tags)) {
          r.metadata.tags.forEach((t: string) => {
            if (!existingTags.includes(t) && !tags.find(tag => tag.name === t)) {
              tags.push({
                name: t,
                confidence: r.score * 0.8,
                category: 'topic',
              });
            }
          });
        }
      });
    }

    return tags
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);
  }

  async checkDuplicate(
    text: string,
    type: EntityType,
    options?: {
      threshold?: number;
      dateRange?: { start: Date; end: Date };
    }
  ): Promise<DuplicateCheckResult> {
    const results = await vectorService.search(text, {
      k: 5,
      similarity: options?.threshold || 0.85,
      filters: {
        types: [type],
        dateRange: options?.dateRange,
      },
    });

    const isDuplicate = results.length > 0 && results[0].score >= (options?.threshold || 0.85);

    const similarItems: SimilarItem[] = results.slice(0, 3).map(r => ({
      id: r.id,
      type: r.type as EntityType,
      similarity: r.score,
      title: r.title,
      content: r.content,
      metadata: r.metadata,
      relationReason: isDuplicate ? '可能是重复项' : '内容相似',
    }));

    let suggestion = '';
    if (isDuplicate) {
      suggestion = `发现相似度 ${Math.round(results[0].score * 100)}% 的已有${type === 'event' ? '事件' : type === 'task' ? '任务' : '灵感'}："${results[0].title}"，是否继续创建？`;
    } else if (results.length > 0) {
      suggestion = `发现 ${results.length} 个相关${type === 'event' ? '事件' : type === 'task' ? '任务' : '灵感'}，可能需要参考`;
    }

    return {
      isDuplicate,
      similarItems,
      suggestion,
    };
  }

  async findRelatedContent(
    query: string,
    options?: {
      types?: EntityType[];
      limit?: number;
    }
  ): Promise<{
    events: SimilarItem[];
    tasks: SimilarItem[];
    inspirations: SimilarItem[];
  }> {
    const types = options?.types || ['event', 'task', 'inspiration'];
    const limit = options?.limit || 5;

    const results = await vectorService.hybridSearch(query, {
      k: limit * 2,
      similarity: 0.5,
    });

    const events: SimilarItem[] = [];
    const tasks: SimilarItem[] = [];
    const inspirations: SimilarItem[] = [];

    results.forEach(r => {
      const item: SimilarItem = {
        id: r.id,
        type: r.type as EntityType,
        similarity: r.score,
        title: r.title,
        content: r.content,
        metadata: r.metadata,
        relationReason: this.explainSimilarity(r.score),
      };

      if (r.type === 'event' && types.includes('event') && events.length < limit) {
        events.push(item);
      } else if (r.type === 'task' && types.includes('task') && tasks.length < limit) {
        tasks.push(item);
      } else if (r.type === 'inspiration' && types.includes('inspiration') && inspirations.length < limit) {
        inspirations.push(item);
      }
    });

    return { events, tasks, inspirations };
  }

  async suggestEventCategory(eventTitle: string, eventDescription?: string): Promise<{
    category: string;
    confidence: number;
    alternatives: Array<{ category: string; confidence: number }>;
  }> {
    const text = [eventTitle, eventDescription].filter(Boolean).join(' ');
    
    const results = await vectorService.search(text, {
      k: 10,
      similarity: 0.5,
      filters: { types: ['event'] },
    });

    const categoryScores: Record<string, number[]> = {};

    results.forEach(r => {
      const category = (r.metadata?.eventType as string) || 'regular';
      if (!categoryScores[category]) {
        categoryScores[category] = [];
      }
      categoryScores[category].push(r.score);
    });

    const categoryAverages = Object.entries(categoryScores)
      .map(([category, scores]) => ({
        category,
        confidence: scores.reduce((a, b) => a + b, 0) / scores.length,
      }))
      .sort((a, b) => b.confidence - a.confidence);

    if (categoryAverages.length === 0) {
      return {
        category: 'regular',
        confidence: 0.5,
        alternatives: [],
      };
    }

    return {
      category: categoryAverages[0].category,
      confidence: categoryAverages[0].confidence,
      alternatives: categoryAverages.slice(1, 4),
    };
  }

  async enrichSearchQuery(originalQuery: string): Promise<{
    expandedQuery: string;
    relatedTerms: string[];
    suggestedFilters: Record<string, unknown>;
  }> {
    const results = await vectorService.search(originalQuery, {
      k: 5,
      similarity: 0.5,
    });

    const relatedTerms: string[] = [];
    const suggestedFilters: Record<string, unknown> = {};

    results.forEach(r => {
      if (r.metadata?.location && typeof r.metadata.location === 'string') {
        relatedTerms.push(r.metadata.location);
      }
      if (r.metadata?.eventType && typeof r.metadata.eventType === 'string') {
        if (!suggestedFilters.eventType) {
          suggestedFilters.eventType = r.metadata.eventType;
        }
      }
    });

    const uniqueTerms = [...new Set(relatedTerms)].slice(0, 3);
    const expandedQuery = uniqueTerms.length > 0
      ? `${originalQuery} ${uniqueTerms.join(' ')}`
      : originalQuery;

    return {
      expandedQuery,
      relatedTerms: uniqueTerms,
      suggestedFilters,
    };
  }

  private explainSimilarity(score: number): string {
    if (score >= 0.9) {
      return '高度相似';
    } else if (score >= 0.8) {
      return '内容相关';
    } else if (score >= 0.7) {
      return '主题相近';
    } else {
      return '可能相关';
    }
  }

  private determineLinkType(score: number, metadata: Record<string, unknown>): string {
    if (score >= 0.9) {
      return 'similar';
    } else if (score >= 0.75) {
      return 'related';
    } else if (metadata?.isFollowUp) {
      return 'follow_up';
    } else {
      return 'reference';
    }
  }
}

export const vectorEnhancedService = new VectorEnhancedService();
export type { SimilarItem, SmartTag, DuplicateCheckResult, ContextualLink };
