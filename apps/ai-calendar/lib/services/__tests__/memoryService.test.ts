import { describe, it, expect, beforeEach } from 'vitest';
import { memoryService } from '../memoryService';
import type { MemoryItem } from '@/types/memory';

describe('MemoryService', () => {
  beforeEach(async () => {
    await memoryService.initialize();
    await memoryService.clear();
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await expect(memoryService.initialize()).resolves.not.toThrow();
    });
  });

  describe('addMemory', () => {
    it('should add a valid memory', async () => {
      const memory = await memoryService.addMemory({
        type: 'short-term',
        category: 'query',
        content: 'Test query',
      });

      expect(memory.id).toBeDefined();
      expect(memory.type).toBe('short-term');
      expect(memory.category).toBe('query');
      expect(memory.content).toBe('Test query');
      expect(memory.metadata.timestamp).toBeDefined();
      expect(memory.metadata.accessCount).toBe(0);
    });

    it('should reject invalid memory data', async () => {
      await expect(
        memoryService.addMemory({
          type: 'short-term',
          category: 'query',
          content: '',
        })
      ).rejects.toThrow('Invalid memory data');
    });

    it('should reject memory exceeding content length limit', async () => {
      const longContent = 'a'.repeat(10001);
      
      await expect(
        memoryService.addMemory({
          type: 'short-term',
          category: 'query',
          content: longContent,
        })
      ).rejects.toThrow('Invalid memory data');
    });
  });

  describe('getMemory', () => {
    it('should return null for non-existent memory', async () => {
      const memory = await memoryService.getMemory('non-existent-id');
      expect(memory).toBeNull();
    });

    it('should return existing memory', async () => {
      const created = await memoryService.addMemory({
        type: 'short-term',
        category: 'query',
        content: 'Test query',
      });

      const retrieved = await memoryService.getMemory(created.id);
      expect(retrieved).toEqual(created);
    });
  });

  describe('updateMemory', () => {
    it('should update existing memory', async () => {
      const created = await memoryService.addMemory({
        type: 'short-term',
        category: 'query',
        content: 'Test query',
      });

      const updated = await memoryService.updateMemory(created.id, {
        content: 'Updated query',
      });

      expect(updated).toBeDefined();
      expect(updated!.content).toBe('Updated query');
    });

    it('should throw error for non-existent memory', async () => {
      await expect(
        memoryService.updateMemory('non-existent-id', { content: 'Updated' })
      ).rejects.toThrow('not found');
    });
  });

  describe('deleteMemory', () => {
    it('should delete existing memory', async () => {
      const created = await memoryService.addMemory({
        type: 'short-term',
        category: 'query',
        content: 'Test query',
      });

      const deleted = await memoryService.deleteMemory(created.id);
      expect(deleted).toBe(true);

      const retrieved = await memoryService.getMemory(created.id);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent memory', async () => {
      const deleted = await memoryService.deleteMemory('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('searchMemories', () => {
    beforeEach(async () => {
      await memoryService.addMemory({
        type: 'short-term',
        category: 'query',
        content: 'Query 1',
      });

      await memoryService.addMemory({
        type: 'long-term',
        category: 'preference',
        content: 'Preference 1',
      });

      await memoryService.addMemory({
        type: 'short-term',
        category: 'result',
        content: 'Result 1',
      });
    });

    it('should search all memories', async () => {
      const result = await memoryService.searchMemories({});
      expect(result.memories.length).toBe(3);
      expect(result.total).toBe(3);
    });

    it('should filter by type', async () => {
      const result = await memoryService.searchMemories({
        types: ['short-term'],
      });
      expect(result.memories.length).toBe(2);
      expect(result.memories.every(m => m.type === 'short-term')).toBe(true);
    });

    it('should filter by category', async () => {
      const result = await memoryService.searchMemories({
        categories: ['query'],
      });
      expect(result.memories.length).toBe(1);
      expect(result.memories[0].category).toBe('query');
    });

    it('should limit results', async () => {
      const result = await memoryService.searchMemories({
        limit: 2,
      });
      expect(result.memories.length).toBe(2);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('recordAccess', () => {
    it('should increment access count', async () => {
      const created = await memoryService.addMemory({
        type: 'short-term',
        category: 'query',
        content: 'Test query',
      });

      expect(created.metadata.accessCount).toBe(0);

      await memoryService.recordAccess(created.id);

      const updated = await memoryService.getMemory(created.id);
      expect(updated!.metadata.accessCount).toBe(1);
    });

    it('should throw error for non-existent memory', async () => {
      await expect(
        memoryService.recordAccess('non-existent-id')
      ).rejects.toThrow('not found');
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await memoryService.addMemory({
        type: 'short-term',
        category: 'query',
        content: 'Query 1',
      });

      await memoryService.addMemory({
        type: 'long-term',
        category: 'preference',
        content: 'Preference 1',
      });
    });

    it('should return correct statistics', async () => {
      const stats = await memoryService.getStats();

      expect(stats.totalMemories).toBe(2);
      expect(stats.byType['short-term']).toBe(1);
      expect(stats.byType['long-term']).toBe(1);
      expect(stats.byCategory['query']).toBe(1);
      expect(stats.byCategory['preference']).toBe(1);
      expect(stats.averageConfidence).toBeGreaterThan(0);
    });
  });

  describe('export and import', () => {
    it('should export all memories', async () => {
      await memoryService.addMemory({
        type: 'short-term',
        category: 'query',
        content: 'Query 1',
      });

      await memoryService.addMemory({
        type: 'long-term',
        category: 'preference',
        content: 'Preference 1',
      });

      const exported = await memoryService.export();
      expect(exported.length).toBe(2);
    });

    it('should import memories', async () => {
      const memories: MemoryItem[] = [
        {
          id: 'test-id-1',
          type: 'short-term',
          category: 'query',
          content: 'Imported query',
          metadata: {
            timestamp: Date.now(),
            source: 'user',
            confidence: 0.8,
            accessCount: 0,
            lastAccessedAt: Date.now(),
            importance: 'medium',
          },
        },
      ];

      await memoryService.import(memories);

      const imported = await memoryService.getMemory('test-id-1');
      expect(imported).toBeDefined();
      expect(imported!.content).toBe('Imported query');
    });
  });

  describe('clear', () => {
    it('should clear all memories', async () => {
      await memoryService.addMemory({
        type: 'short-term',
        category: 'query',
        content: 'Query 1',
      });

      await memoryService.clear();

      const stats = await memoryService.getStats();
      expect(stats.totalMemories).toBe(0);
    });
  });
});
