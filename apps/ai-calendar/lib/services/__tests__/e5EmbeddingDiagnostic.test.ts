import { describe, it, expect, beforeAll } from 'vitest';
import { pipeline } from '@huggingface/transformers';
import { formatTextForEmbedding, AI_MODELS, AIModelConfig } from '@/lib/utils/aiModels';

describe('E5 模型 Embedding 诊断测试', () => {
  let extractor: any;
  const modelConfig = AI_MODELS['multilingual'];

  beforeAll(async () => {
    console.log('Loading model:', modelConfig.modelName);
    extractor = await pipeline('feature-extraction', modelConfig.modelName);
    console.log('Model loaded');
  }, 60000);

  const getEmbedding = async (text: string, task: 'query' | 'passage'): Promise<number[]> => {
    const formattedText = formatTextForEmbedding(text, task, modelConfig);
    console.log(`Formatted text (${task}):`, formattedText);
    
    const output = await extractor(formattedText, {
      pooling: 'mean',
      normalize: true,
    });
    
    return Array.from(output.data) as number[];
  };

  const cosineSimilarity = (a: number[], b: number[]): number => {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magA * magB);
  };

  describe('E5 模型 prefix 测试', () => {
    it('应该正确格式化 query 文本', () => {
      const formatted = formatTextForEmbedding('Think and Grow Rich', 'query', modelConfig);
      expect(formatted).toBe('query: Think and Grow Rich');
    });

    it('应该正确格式化 passage 文本', () => {
      const formatted = formatTextForEmbedding('Think and Grow Rich', 'passage', modelConfig);
      expect(formatted).toBe('passage: Think and Grow Rich');
    });
  });

  describe('语义相似度测试', () => {
    it('相同文本的 query 和 passage 应该有高相似度', async () => {
      const text = 'Think and Grow Rich';
      
      const queryEmbedding = await getEmbedding(text, 'query');
      const passageEmbedding = await getEmbedding(text, 'passage');
      
      const similarity = cosineSimilarity(queryEmbedding, passageEmbedding);
      console.log('相同文本 query vs passage 相似度:', similarity);
      
      expect(similarity).toBeGreaterThan(0.9);
    });

    it('语义相似的文本应该有高相似度', async () => {
      const text1 = 'Think and Grow Rich';
      const text2 = '思考致富';
      
      const embedding1 = await getEmbedding(text1, 'passage');
      const embedding2 = await getEmbedding(text2, 'passage');
      
      const similarity = cosineSimilarity(embedding1, embedding2);
      console.log('Think and Grow Rich vs 思考致富 相似度:', similarity);
      
      expect(similarity).toBeGreaterThan(0.7);
    });

    it('语义不相似的文本应该有低相似度', async () => {
      const text1 = 'Think and Grow Rich';
      const text2 = '等下11点睡觉了';
      
      const embedding1 = await getEmbedding(text1, 'passage');
      const embedding2 = await getEmbedding(text2, 'passage');
      
      const similarity = cosineSimilarity(embedding1, embedding2);
      console.log('Think and Grow Rich vs 等下11点睡觉了 相似度:', similarity);
      
      expect(similarity).toBeLessThan(0.5);
    });

    it('搜索 "Think and Grow Rich" 应该匹配对应文档', async () => {
      const query = 'Think and Grow Rich';
      const documents = [
        'Think and Grow Rich',
        '思考致富',
        '等下11点睡觉了',
        '明天开会',
      ];

      const queryEmbedding = await getEmbedding(query, 'query');
      
      const similarities: { doc: string; similarity: number }[] = [];
      
      for (const doc of documents) {
        const docEmbedding = await getEmbedding(doc, 'passage');
        const similarity = cosineSimilarity(queryEmbedding, docEmbedding);
        similarities.push({ doc, similarity });
      }

      similarities.sort((a, b) => b.similarity - a.similarity);
      
      console.log('搜索 "Think and Grow Rich" 的相似度排序:');
      similarities.forEach((item, index) => {
        console.log(`${index + 1}. ${item.doc}: ${item.similarity.toFixed(4)}`);
      });

      expect(similarities[0].doc).toBe('Think and Grow Rich');
      expect(similarities[0].similarity).toBeGreaterThan(0.9);
    });

    it('搜索 "啊啊啊啊" 应该没有高相似度匹配', async () => {
      const query = '啊啊啊啊';
      const documents = [
        'Think and Grow Rich',
        '思考致富',
        '等下11点睡觉了',
        '明天开会',
      ];

      const queryEmbedding = await getEmbedding(query, 'query');
      
      const similarities: { doc: string; similarity: number }[] = [];
      
      for (const doc of documents) {
        const docEmbedding = await getEmbedding(doc, 'passage');
        const similarity = cosineSimilarity(queryEmbedding, docEmbedding);
        similarities.push({ doc, similarity });
      }

      similarities.sort((a, b) => b.similarity - a.similarity);
      
      console.log('搜索 "啊啊啊啊" 的相似度排序:');
      similarities.forEach((item, index) => {
        console.log(`${index + 1}. ${item.doc}: ${item.similarity.toFixed(4)}`);
      });

      expect(similarities[0].similarity).toBeLessThan(0.7);
    });
  });

  describe('向量维度验证', () => {
    it('应该生成正确维度的向量', async () => {
      const embedding = await getEmbedding('测试文本', 'passage');
      expect(embedding.length).toBe(modelConfig.dimensions);
    });
  });
});
