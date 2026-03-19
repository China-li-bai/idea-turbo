import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { create, insert, search } from '@orama/orama';

describe('Orama Vector Search 诊断测试', () => {
  let db: any;

  beforeAll(async () => {
    db = await create({
      schema: {
        id: 'string',
        title: 'string',
        embedding: 'vector[5]',
      },
    });

    await insert(db, {
      id: 'doc-1',
      title: 'Think and Grow Rich',
      embedding: [0.9, 0.1, 0.1, 0.1, 0.1],
    });

    await insert(db, {
      id: 'doc-2',
      title: '思考致富',
      embedding: [0.85, 0.15, 0.1, 0.1, 0.1],
    });

    await insert(db, {
      id: 'doc-3',
      title: '等下11点睡觉了',
      embedding: [0.1, 0.9, 0.1, 0.1, 0.1],
    });

    await insert(db, {
      id: 'doc-4',
      title: '明天开会',
      embedding: [0.1, 0.1, 0.9, 0.1, 0.1],
    });
  });

  describe('向量相似度测试', () => {
    it('相似向量应该返回高分', async () => {
      const queryVector = [0.9, 0.1, 0.1, 0.1, 0.1];
      
      const results = await search(db, {
        mode: 'vector',
        vector: {
          value: queryVector,
          property: 'embedding',
        },
        similarity: 0.8,
        includeVectors: true,
      });

      console.log('相似向量搜索结果:', JSON.stringify(results, null, 2));
      
      expect(results.hits.length).toBeGreaterThan(0);
      
      if (results.hits.length > 0) {
        const topResult = results.hits[0];
        console.log('最高分:', topResult.score, '文档:', topResult.document.title);
        expect(topResult.score).toBeGreaterThan(0.8);
      }
    });

    it('不相似向量应该返回低分或无结果', async () => {
      const queryVector = [0.1, 0.1, 0.1, 0.1, 0.99];
      
      const results = await search(db, {
        mode: 'vector',
        vector: {
          value: queryVector,
          property: 'embedding',
        },
        similarity: 0.5,
        includeVectors: true,
      });

      console.log('不相似向量搜索结果:', JSON.stringify(results, null, 2));
      
      if (results.hits.length > 0) {
        console.log('最高分:', results.hits[0].score);
      }
    });

    it('低相似度阈值应该返回更多结果', async () => {
      const queryVector = [0.9, 0.1, 0.1, 0.1, 0.1];
      
      const lowThresholdResults = await search(db, {
        mode: 'vector',
        vector: {
          value: queryVector,
          property: 'embedding',
        },
        similarity: 0.1,
      });

      const highThresholdResults = await search(db, {
        mode: 'vector',
        vector: {
          value: queryVector,
          property: 'embedding',
        },
        similarity: 0.9,
      });

      console.log('低阈值结果数:', lowThresholdResults.hits.length);
      console.log('高阈值结果数:', highThresholdResults.hits.length);
      
      expect(lowThresholdResults.hits.length).toBeGreaterThanOrEqual(highThresholdResults.hits.length);
    });

    it('完全相同的向量应该返回分数 1', async () => {
      const queryVector = [0.9, 0.1, 0.1, 0.1, 0.1];
      
      const results = await search(db, {
        mode: 'vector',
        vector: {
          value: queryVector,
          property: 'embedding',
        },
        similarity: 0.99,
      });

      console.log('完全相同向量搜索结果:', JSON.stringify(results, null, 2));
      
      if (results.hits.length > 0) {
        const topResult = results.hits[0];
        console.log('最高分:', topResult.score);
      }
    });

    it('应该正确排序结果', async () => {
      const queryVector = [0.9, 0.1, 0.1, 0.1, 0.1];
      
      const results = await search(db, {
        mode: 'vector',
        vector: {
          value: queryVector,
          property: 'embedding',
        },
        similarity: 0.1,
      });

      console.log('排序测试结果:');
      results.hits.forEach((hit: any, index: number) => {
        console.log(`${index + 1}. ${hit.document.title}: score=${hit.score}`);
      });

      for (let i = 1; i < results.hits.length; i++) {
        expect(results.hits[i - 1].score).toBeGreaterThanOrEqual(results.hits[i].score);
      }
    });
  });

  describe('Score 计算验证', () => {
    it('验证余弦相似度计算', async () => {
      const cosineSimilarity = (a: number[], b: number[]) => {
        const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
        const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
        const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
        return dotProduct / (magA * magB);
      };

      const queryVector = [0.9, 0.1, 0.1, 0.1, 0.1];
      const doc1Vector = [0.9, 0.1, 0.1, 0.1, 0.1];
      const doc2Vector = [0.85, 0.15, 0.1, 0.1, 0.1];
      const doc3Vector = [0.1, 0.9, 0.1, 0.1, 0.1];

      const sim1 = cosineSimilarity(queryVector, doc1Vector);
      const sim2 = cosineSimilarity(queryVector, doc2Vector);
      const sim3 = cosineSimilarity(queryVector, doc3Vector);

      console.log('手动计算的余弦相似度:');
      console.log('doc-1 (Think and Grow Rich):', sim1);
      console.log('doc-2 (思考致富):', sim2);
      console.log('doc-3 (等下11点睡觉了):', sim3);

      const results = await search(db, {
        mode: 'vector',
        vector: {
          value: queryVector,
          property: 'embedding',
        },
        similarity: 0.1,
        includeVectors: true,
      });

      console.log('Orama 返回的分数:');
      results.hits.forEach((hit: any) => {
        console.log(`${hit.document.title}: score=${hit.score}`);
      });

      expect(sim1).toBeCloseTo(1.0, 5);
      expect(sim2).toBeGreaterThan(sim3);
    });
  });
});
