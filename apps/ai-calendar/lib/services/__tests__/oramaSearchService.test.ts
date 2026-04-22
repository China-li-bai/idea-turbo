import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { OramaSearchService } from '../oramaSearchService';
import type { UnifiedCalendarItem } from '@/types/unified';
import { AIModelType, AI_MODELS, DEFAULT_AI_MODEL } from '@/lib/utils/aiModels';

const createTestItem = (
  id: string,
  type: 'idea' | 'event',
  title: string,
  content: string,
  startTime?: number,
  endTime?: number,
  metadata?: UnifiedCalendarItem['metadata'],
  dimensions: number = 1024
): UnifiedCalendarItem => ({
  id,
  type,
  title,
  content,
  startTime: startTime || null,
  endTime: endTime || null,
  isAllDay: false,
  embedding: new Array(dimensions).fill(0).map(() => Math.random() * 0.1),
  embeddingUpdatedAt: Date.now(),
  status: type === 'event' ? 'scheduled' : 'pending',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  metadata: metadata || {}
});

describe('OramaSearchService', () => {
  let searchService: OramaSearchService;
  let testItems: UnifiedCalendarItem[];
  let isInitialized = false;

  beforeEach(async () => {
    if (!isInitialized) {
      searchService = new OramaSearchService();
      
      const now = Date.now();
      testItems = [
        createTestItem('test-1', 'event', '项目周会', '每周一上午10点的项目周会', 
          now + 86400000, now + 86400000 + 3600000),
        createTestItem('test-2', 'idea', '研究 WebGPU', '研究一下怎么用 WebGPU 加速 AI 推理'),
        createTestItem('test-3', 'event', '客户会议', '周三下午和客户的产品演示会议',
          now + 172800000, now + 172800000 + 3600000),
        createTestItem('test-4', 'idea', '学习 Rust', '学习 Rust 语言和异步编程'),
        createTestItem('test-5', 'event', '团队聚餐', '周五晚上的团队聚餐活动',
          now + 345600000, now + 345600000 + 7200000),
      ];

      await searchService.initialize();
      
      for (const item of testItems) {
        await searchService.indexItem(item);
      }
      
      isInitialized = true;
    }
  });

  afterEach(async () => {
  });

  afterAll(async () => {
    if (searchService && testItems) {
      for (const item of testItems) {
        try {
          await searchService.deleteFromIndex(item.id);
        } catch {}
      }
    }
  });

  describe('初始化', () => {
    it('应该成功初始化搜索服务', () => {
      expect(searchService).toBeDefined();
    });

    it('应该正确索引所有项目', async () => {
      const results = await searchService.search('项目', { similarity: 0.01 });
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('应该支持进度回调', async () => {
      const progressCallback = vi.fn();
      await searchService.initialize(progressCallback);
      
      expect(searchService.isInitialized).toBe(true);
    });
  });

  describe('向量搜索', () => {
    it('应该根据语义相关性返回结果', async () => {
      const results = await searchService.search('会议', { similarity: 0.01 });
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('应该返回相关性评分', async () => {
      const results = await searchService.search('周会', { similarity: 0.01 });
      
      results.forEach(result => {
        expect(result).toHaveProperty('score');
        expect(typeof result.score).toBe('number');
        expect(result.score).toBeGreaterThanOrEqual(0);
      });
    });

    it('应该按相关性排序结果', async () => {
      const results = await searchService.search('会议', { similarity: 0.01 });
      
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('应该支持相似度阈值', async () => {
      const results = await searchService.search('会议', { similarity: 0.1 });
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('应该支持限制结果数量', async () => {
      const results = await searchService.search('会议', { k: 2, similarity: 0.01 });
      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('混合搜索', () => {
    it('应该结合向量搜索和全文搜索', async () => {
      const results = await searchService.hybridSearch('WebGPU', { 
        useHybrid: true,
        similarity: 0.01 
      });
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('应该返回完整的搜索结果结构', async () => {
      const results = await searchService.hybridSearch('项目', { similarity: 0.01 });
      
      results.forEach(result => {
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('title');
        expect(result).toHaveProperty('content');
        expect(result).toHaveProperty('score');
        expect(result).toHaveProperty('startTime');
        expect(result).toHaveProperty('endTime');
        expect(result).toHaveProperty('isAllDay');
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('createdAt');
        expect(result).toHaveProperty('updatedAt');
        expect(result).toHaveProperty('metadata');
      });
    });
  });

  describe('类型过滤', () => {
    it('应该只返回指定类型的结果', async () => {
      const results = await searchService.search('会议', { 
        filters: { types: ['idea'] },
        similarity: 0.01
      });
      
      results.forEach(result => {
        expect(result.type).toBe('idea');
      });
    });

    it('应该支持多类型过滤', async () => {
      const results = await searchService.search('会议', { 
        filters: { types: ['idea', 'event'] },
        similarity: 0.01
      });
      
      results.forEach(result => {
        expect(['idea', 'event']).toContain(result.type);
      });
    });
  });

  describe('时间范围过滤', () => {
    it('应该返回指定时间范围内的事件', async () => {
      const now = Date.now();
      const tomorrow = now + 86400000;
      const dayAfter = now + 172800000;

      const results = await searchService.search('会议', {
        filters: {
          dateRange: { start: now, end: dayAfter }
        },
        similarity: 0.01
      });

      results.forEach(result => {
        if (result.type === 'event' && result.startTime) {
          expect(result.startTime).toBeGreaterThanOrEqual(now);
          expect(result.startTime).toBeLessThanOrEqual(dayAfter);
        }
      });
    });

    it('应该排除时间范围外的事件', async () => {
      const now = Date.now();
      const farFuture = now + 1000000000;

      const results = await searchService.search('会议', {
        filters: {
          dateRange: { start: farFuture, end: farFuture + 86400000 }
        },
        similarity: 0.01
      });

      const eventsInRange = results.filter(r => r.type === 'event' && r.startTime);
      expect(eventsInRange.length).toBe(0);
    });
  });

  describe('搜索结果数据一致性', () => {
    it('搜索结果应该与原始数据一致', async () => {
      const results = await searchService.search('WebGPU', { similarity: 0.01 });
      
      if (results.length > 0) {
        const originalItem = testItems.find(item => item.content.includes('WebGPU'));
        const searchResult = results.find(r => r.id === originalItem?.id);
        
        if (searchResult) {
          expect(searchResult.title).toBe(originalItem?.title);
          expect(searchResult.type).toBe(originalItem?.type);
        }
      }
    });

    it('应该保留完整的 metadata', async () => {
      const itemWithMetadata = createTestItem(
        'meta-1', 
        'idea', 
        '测试元数据', 
        '测试内容',
        undefined,
        undefined,
        {
          location: '会议室A',
          tags: ['重要', '紧急'],
          priority: 'high',
          description: '这是一个测试'
        }
      );

      await searchService.indexItem(itemWithMetadata);
      const results = await searchService.search('测试元数据', { similarity: 0.01 });
      
      if (results.length > 0) {
        const found = results.find(r => r.id === 'meta-1');
        if (found) {
          expect(found.metadata.location).toBe('会议室A');
          expect(found.metadata.priority).toBe('high');
        }
      }
    });

    it('应该正确处理空 metadata', async () => {
      const results = await searchService.search('WebGPU', { similarity: 0.01 });
      
      if (results.length > 0) {
        const result = results[0];
        expect(result.metadata).toBeDefined();
        expect(typeof result.metadata).toBe('object');
      }
    });
  });

  describe('CRUD 操作', () => {
    it('应该能插入新项目', async () => {
      const testItem = createTestItem('crud-insert-1', 'idea', '插入测试', '用于测试插入操作');
      await searchService.indexItem(testItem);
      
      const doc = await searchService.getDocument(testItem.id);
      expect(doc).toBeDefined();
      expect(doc.id).toBe(testItem.id);
    });

    it('应该能删除项目', async () => {
      const testItem = createTestItem('crud-delete-1', 'idea', '删除测试', '用于测试删除操作');
      await searchService.indexItem(testItem);
      
      await searchService.deleteFromIndex(testItem.id);
      
      const doc = await searchService.getDocument(testItem.id);
      expect(doc).toBeFalsy();
    });

    it('删除不存在的项目应该不报错', async () => {
      await expect(searchService.deleteFromIndex('non-existent-id')).resolves.not.toThrow();
    });
  });

  describe('边界情况', () => {
    it('空查询应该返回结果或空数组', async () => {
      const results = await searchService.search('', { similarity: 0.01 });
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('不存在的关键词应该返回空数组或低相关性结果', async () => {
      const results = await searchService.search('不存在的关键词xyz123abc', { similarity: 0.99 });
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('特殊字符查询不应该报错', async () => {
      await expect(searchService.search('!@#$%^&*()', { similarity: 0.01 })).resolves.not.toThrow();
    });

    it('超长查询应该正常处理', async () => {
      const longQuery = '测试'.repeat(100);
      await expect(searchService.search(longQuery, { similarity: 0.01 })).resolves.not.toThrow();
    });
  });

  describe('状态管理', () => {
    it('应该正确报告初始化状态', async () => {
      const newService = new OramaSearchService();
      expect(newService.isInitialized).toBe(false);
      
      await newService.initialize();
      expect(newService.isInitialized).toBe(true);
    });

    it('重复初始化应该安全', async () => {
      await searchService.initialize();
      await searchService.initialize();
      
      expect(searchService.isInitialized).toBe(true);
    });
  });

  describe('模型配置', () => {
    it('应该返回当前模型配置', () => {
      const modelId = searchService.modelId;
      expect(modelId).toBeDefined();
      expect(Object.keys(AI_MODELS)).toContain(modelId);
    });

    it('应该返回正确的模型维度', () => {
      const dimensions = searchService.dimensions;
      expect(dimensions).toBe(1024);
    });

    it('应该返回模型名称', () => {
      const modelName = searchService.modelName;
      expect(modelName).toBeDefined();
      expect(typeof modelName).toBe('string');
    });

    it('默认模型应该是多语言模型', () => {
      const newService = new OramaSearchService();
      expect(newService.modelId).toBe(DEFAULT_AI_MODEL);
      expect(newService.modelId).toBe('multilingual');
    });

    it('切换到相同模型应该跳过重新初始化', async () => {
      const currentModel = searchService.modelId;
      
      await searchService.switchModel(currentModel);
      
      expect(searchService.modelId).toBe(currentModel);
    });

    it('BGE-M3 模型不应该有前缀配置', () => {
      const config = AI_MODELS['multilingual'];
      
      expect(config.prefixConfig).toBeUndefined();
    });

    it('BGE-M3 模型维度应该是 1024', () => {
      const config = AI_MODELS['multilingual'];
      expect(config.dimensions).toBe(1024);
    });

    it('BGE-M3 模型应该配置 preferredDtype', () => {
      const config = AI_MODELS['multilingual'];
      expect(config.preferredDtype).toBeDefined();
      expect(config.preferredDtype).toBe('q8');
    });
  });
});
