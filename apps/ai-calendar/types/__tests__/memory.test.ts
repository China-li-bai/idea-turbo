import { describe, it, expect } from 'vitest';
import {
  MemoryItemSchema,
  QueryMemorySchema,
  ResultMemorySchema,
  FeedbackMemorySchema,
  validateMemoryItem,
  validateSearchOptions,
} from '../memory.schemas';
import {
  MemoryError,
  MemoryNotFoundError,
  MemoryValidationError,
  MemorySizeExceededError,
  Ok,
  Err,
  tryAsync,
} from '../memory.errors';
import { MEMORY_CONSTANTS, MEMORY_LIMITS } from '../memory.constants';

describe('Memory Schemas', () => {
  describe('MemoryItemSchema', () => {
    it('should validate a valid memory item', () => {
      const validMemory = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'short-term',
        category: 'query',
        content: 'Test query',
        metadata: {
          timestamp: Date.now(),
          source: 'user',
          confidence: 0.8,
          accessCount: 0,
          lastAccessedAt: Date.now(),
          importance: 'medium',
        },
      };

      const result = MemoryItemSchema.safeParse(validMemory);
      expect(result.success).toBe(true);
    });

    it('should reject memory with empty content', () => {
      const invalidMemory = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'short-term',
        category: 'query',
        content: '',
        metadata: {
          timestamp: Date.now(),
          source: 'user',
          confidence: 0.8,
          accessCount: 0,
          lastAccessedAt: Date.now(),
          importance: 'medium',
        },
      };

      const result = MemoryItemSchema.safeParse(invalidMemory);
      expect(result.success).toBe(false);
    });

    it('should reject memory with content exceeding max length', () => {
      const invalidMemory = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'short-term',
        category: 'query',
        content: 'a'.repeat(MEMORY_CONSTANTS.MAX_CONTENT_LENGTH + 1),
        metadata: {
          timestamp: Date.now(),
          source: 'user',
          confidence: 0.8,
          accessCount: 0,
          lastAccessedAt: Date.now(),
          importance: 'medium',
        },
      };

      const result = MemoryItemSchema.safeParse(invalidMemory);
      expect(result.success).toBe(false);
    });

    it('should reject memory with invalid confidence', () => {
      const invalidMemory = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'short-term',
        category: 'query',
        content: 'Test query',
        metadata: {
          timestamp: Date.now(),
          source: 'user',
          confidence: 1.5,
          accessCount: 0,
          lastAccessedAt: Date.now(),
          importance: 'medium',
        },
      };

      const result = MemoryItemSchema.safeParse(invalidMemory);
      expect(result.success).toBe(false);
    });
  });

  describe('QueryMemorySchema', () => {
    it('should validate a valid query memory', () => {
      const validQueryMemory = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'short-term',
        category: 'query',
        content: '明天有什么事？',
        metadata: {
          timestamp: Date.now(),
          source: 'user',
          confidence: 0.9,
          accessCount: 1,
          lastAccessedAt: Date.now(),
          importance: 'high',
          queryType: 'search',
          intent: '查看明天的日程',
          entities: [
            { type: 'date', value: '明天', confidence: 0.95 },
          ],
        },
      };

      const result = QueryMemorySchema.safeParse(validQueryMemory);
      expect(result.success).toBe(true);
    });
  });

  describe('ResultMemorySchema', () => {
    it('should validate a valid result memory', () => {
      const validResultMemory = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'short-term',
        category: 'result',
        content: '找到3个日程',
        metadata: {
          timestamp: Date.now(),
          source: 'system',
          confidence: 0.85,
          accessCount: 0,
          lastAccessedAt: Date.now(),
          importance: 'medium',
          queryId: '123e4567-e89b-12d3-a456-426614174001',
          resultCount: 3,
          topResults: [
            { itemId: 'item-1', score: 0.95 },
            { itemId: 'item-2', score: 0.88 },
          ],
          userAction: 'clicked',
        },
      };

      const result = ResultMemorySchema.safeParse(validResultMemory);
      expect(result.success).toBe(true);
    });
  });

  describe('FeedbackMemorySchema', () => {
    it('should validate a valid feedback memory', () => {
      const validFeedbackMemory = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'long-term',
        category: 'feedback',
        content: '用户对搜索结果满意',
        metadata: {
          timestamp: Date.now(),
          source: 'user',
          confidence: 0.9,
          accessCount: 1,
          lastAccessedAt: Date.now(),
          importance: 'high',
          targetMemoryId: '123e4567-e89b-12d3-a456-426614174001',
          feedbackType: 'positive',
          rating: 5,
        },
      };

      const result = FeedbackMemorySchema.safeParse(validFeedbackMemory);
      expect(result.success).toBe(true);
    });
  });
});

describe('Memory Validation Functions', () => {
  describe('validateMemoryItem', () => {
    it('should return success for valid memory item', () => {
      const validMemory = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'short-term',
        category: 'query',
        content: 'Test query',
        metadata: {
          timestamp: Date.now(),
          source: 'user',
          confidence: 0.8,
          accessCount: 0,
          lastAccessedAt: Date.now(),
          importance: 'medium',
        },
      };

      const result = validateMemoryItem(validMemory);
      expect(result.success).toBe(true);
    });

    it('should return error for invalid memory item', () => {
      const invalidMemory = {
        id: 'invalid-uuid',
        type: 'invalid-type',
        category: 'invalid-category',
        content: '',
        metadata: {},
      };

      const result = validateMemoryItem(invalidMemory);
      expect(result.success).toBe(false);
    });
  });

  describe('validateSearchOptions', () => {
    it('should validate valid search options', () => {
      const validOptions = {
        query: 'test query',
        types: ['short-term'],
        categories: ['query'],
        limit: 50,
        minConfidence: 0.5,
      };

      const result = validateSearchOptions(validOptions);
      expect(result.success).toBe(true);
    });

    it('should reject search options with invalid time range', () => {
      const invalidOptions = {
        timeRange: {
          start: Date.now(),
          end: Date.now() - 1000,
        },
      };

      const result = validateSearchOptions(invalidOptions);
      expect(result.success).toBe(false);
    });
  });
});

describe('Memory Errors', () => {
  describe('MemoryError', () => {
    it('should create a memory error with code and message', () => {
      const error = new MemoryError(
        'MEMORY_NOT_FOUND',
        'Memory not found',
        { memoryId: 'test-id' }
      );

      expect(error.code).toBe('MEMORY_NOT_FOUND');
      expect(error.message).toBe('Memory not found');
      expect(error.details).toEqual({ memoryId: 'test-id' });
    });
  });

  describe('MemoryNotFoundError', () => {
    it('should create a memory not found error', () => {
      const error = new MemoryNotFoundError('test-id');

      expect(error.code).toBe('MEMORY_NOT_FOUND');
      expect(error.message).toContain('test-id');
    });
  });

  describe('MemorySizeExceededError', () => {
    it('should create a memory size exceeded error', () => {
      const error = new MemorySizeExceededError(15000, 10000);

      expect(error.code).toBe('MEMORY_SIZE_EXCEEDED');
      expect(error.details).toEqual({
        currentSize: 15000,
        maxSize: 10000,
      });
    });
  });
});

describe('Result Type', () => {
  describe('Ok', () => {
    it('should create a successful result', () => {
      const result = Ok('test value');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('test value');
      }
    });
  });

  describe('Err', () => {
    it('should create an error result', () => {
      const error = new Error('test error');
      const result = Err(error);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(error);
      }
    });
  });

  describe('tryAsync', () => {
    it('should return Ok for successful promise', async () => {
      const promise = Promise.resolve('test value');
      const result = await tryAsync(promise);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('test value');
      }
    });

    it('should return Err for failed promise', async () => {
      const error = new Error('test error');
      const promise = Promise.reject(error);
      const result = await tryAsync(promise);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(error);
      }
    });
  });
});

describe('Memory Limits', () => {
  describe('validateContentLength', () => {
    it('should validate content within limits', () => {
      expect(MEMORY_LIMITS.validateContentLength('test')).toBe(true);
    });

    it('should reject empty content', () => {
      expect(MEMORY_LIMITS.validateContentLength('')).toBe(false);
    });

    it('should reject content exceeding max length', () => {
      const longContent = 'a'.repeat(MEMORY_CONSTANTS.MAX_CONTENT_LENGTH + 1);
      expect(MEMORY_LIMITS.validateContentLength(longContent)).toBe(false);
    });
  });

  describe('validateEmbeddingDimension', () => {
    it('should validate embedding within limits', () => {
      const embedding = new Array(512).fill(0);
      expect(MEMORY_LIMITS.validateEmbeddingDimension(embedding)).toBe(true);
    });

    it('should reject empty embedding', () => {
      expect(MEMORY_LIMITS.validateEmbeddingDimension([])).toBe(false);
    });

    it('should reject embedding exceeding max dimension', () => {
      const largeEmbedding = new Array(MEMORY_CONSTANTS.MAX_EMBEDDING_DIMENSION + 1).fill(0);
      expect(MEMORY_LIMITS.validateEmbeddingDimension(largeEmbedding)).toBe(false);
    });
  });

  describe('validateConfidence', () => {
    it('should validate confidence within range', () => {
      expect(MEMORY_LIMITS.validateConfidence(0.5)).toBe(true);
      expect(MEMORY_LIMITS.validateConfidence(0.0)).toBe(true);
      expect(MEMORY_LIMITS.validateConfidence(1.0)).toBe(true);
    });

    it('should reject confidence outside range', () => {
      expect(MEMORY_LIMITS.validateConfidence(-0.1)).toBe(false);
      expect(MEMORY_LIMITS.validateConfidence(1.1)).toBe(false);
    });
  });

  describe('validateMemoryCount', () => {
    it('should validate memory count within limits', () => {
      expect(MEMORY_LIMITS.validateMemoryCount(50, 'short-term')).toBe(true);
      expect(MEMORY_LIMITS.validateMemoryCount(500, 'long-term')).toBe(true);
      expect(MEMORY_LIMITS.validateMemoryCount(25, 'working')).toBe(true);
    });

    it('should reject memory count exceeding limits', () => {
      expect(MEMORY_LIMITS.validateMemoryCount(150, 'short-term')).toBe(false);
      expect(MEMORY_LIMITS.validateMemoryCount(1500, 'long-term')).toBe(false);
      expect(MEMORY_LIMITS.validateMemoryCount(75, 'working')).toBe(false);
    });
  });
});
