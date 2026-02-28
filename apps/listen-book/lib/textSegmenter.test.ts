import { describe, it, expect } from 'vitest';
import { TextSegmenter, SegmentationConfig } from './textSegmenter';

describe('TextSegmenter - Improved Segmentation', () => {
  describe('Smart Segmentation', () => {
    it('should respect max length constraint', () => {
      const segmenter = new TextSegmenter('zh-CN', {
        maxLength: 100
      });

      const longText = '这是一个很长的句子。这是第二个句子。这是第三个句子。这是第四个句子。这是第五个句子。这是第六个句子。这是第七个句子。这是第八个句子。这是第九个句子。这是第十个句子。';
      const segments = segmenter.segment(longText);

      segments.forEach(segment => {
        expect(segment.text.length).toBeLessThanOrEqual(100);
      });
    });

    it('should merge short segments', () => {
      const segmenter = new TextSegmenter('zh-CN', {
        minLength: 50,
        maxLength: 200
      });

      const text = '短句一。短句二。短句三。短句四。短句五。短句六。短句七。短句八。短句九。短句十。短句十一。短句十二。短句十三。短句十四。短句十五。';
      const segments = segmenter.segment(text);

      segments.forEach(segment => {
        expect(segment.text.length).toBeGreaterThanOrEqual(50);
      });
    });

    it('should prefer sentence boundaries', () => {
      const segmenter = new TextSegmenter('zh-CN', {
        minLength: 30,
        maxLength: 100
      });

      const text = '这是第一句话。这是第二句话。这是第三句话。这是第四句话。这是第五句话。';
      const segments = segmenter.segment(text);

      segments.forEach(segment => {
        const lastChar = segment.text.trim().slice(-1);
        expect(['。', '.', '！', '!', '？', '?']).toContain(lastChar);
      });
    });

    it('should handle paragraph boundaries', () => {
      const segmenter = new TextSegmenter('zh-CN', {
        minLength: 30,
        maxLength: 150,
        preferParagraphs: true
      });

      const text = '第一段的第一句话。第一段的第二句话。\n\n第二段的第一句话。第二段的第二句话。\n\n第三段的第一句话。第三段的第二句话。';
      const segments = segmenter.segment(text);

      expect(segments.length).toBeGreaterThan(0);
      expect(segments[0].text).toContain('第一段');
    });

    it('should handle very short text', () => {
      const segmenter = new TextSegmenter('zh-CN', {
        minLength: 50,
        maxLength: 200
      });

      const shortText = '短文本。';
      const segments = segmenter.segment(shortText);

      expect(segments.length).toBe(1);
      expect(segments[0].text).toBe('短文本。');
    });

    it('should handle empty text', () => {
      const segmenter = new TextSegmenter('zh-CN');
      const segments = segmenter.segment('');
      expect(segments.length).toBe(0);
    });

    it('should handle text with only whitespace', () => {
      const segmenter = new TextSegmenter('zh-CN');
      const segments = segmenter.segment('   \n\n   ');
      expect(segments.length).toBe(0);
    });
  });

  describe('Segmentation Configuration', () => {
    it('should use default configuration', () => {
      const segmenter = new TextSegmenter('zh-CN');
      const config = segmenter.getConfig();

      expect(config.minLength).toBe(50);
      expect(config.maxLength).toBe(500);
      expect(config.overlap).toBe(0);
      expect(config.preferParagraphs).toBe(true);
    });

    it('should accept custom configuration', () => {
      const customConfig: SegmentationConfig = {
        minLength: 100,
        maxLength: 1000,
        overlap: 50,
        preferParagraphs: false
      };

      const segmenter = new TextSegmenter('zh-CN', customConfig);
      const config = segmenter.getConfig();

      expect(config.minLength).toBe(100);
      expect(config.maxLength).toBe(1000);
      expect(config.overlap).toBe(50);
      expect(config.preferParagraphs).toBe(false);
    });

    it('should update configuration dynamically', () => {
      const segmenter = new TextSegmenter('zh-CN', {
        maxLength: 50
      });

      const text = '这是一个很长的句子。这是第二个句子。这是第三个句子。这是第四个句子。这是第五个句子。这是第六个句子。这是第七个句子。这是第八个句子。这是第九个句子。这是第十个句子。';
      let segments = segmenter.segment(text);

      expect(segments.length).toBeGreaterThan(1);

      segmenter.updateConfig({ maxLength: 500 });
      segments = segmenter.segment(text);

      expect(segments.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Segment Navigation', () => {
    it('should get segment by id', () => {
      const segmenter = new TextSegmenter('zh-CN', {
        maxLength: 50
      });
      const text = '第一句话。第二句话。第三句话。第四句话。第五句话。第六句话。第七句话。第八句话。第九句话。第十句话。';
      const segments = segmenter.segment(text);

      expect(segments.length).toBeGreaterThan(1);
      
      const segment = segmenter.getSegmentById(segments, 1);
      expect(segment).toBeDefined();
      expect(segment?.id).toBe(1);
    });

    it('should get next segment', () => {
      const segmenter = new TextSegmenter('zh-CN', {
        maxLength: 50
      });
      const text = '第一句话。第二句话。第三句话。第四句话。第五句话。第六句话。第七句话。第八句话。第九句话。第十句话。';
      const segments = segmenter.segment(text);

      expect(segments.length).toBeGreaterThan(1);
      
      const nextSegment = segmenter.getNextSegment(segments, 0);
      expect(nextSegment).toBeDefined();
      expect(nextSegment?.id).toBe(1);
    });

    it('should get previous segment', () => {
      const segmenter = new TextSegmenter('zh-CN', {
        maxLength: 50
      });
      const text = '第一句话。第二句话。第三句话。第四句话。第五句话。第六句话。第七句话。第八句话。第九句话。第十句话。';
      const segments = segmenter.segment(text);

      expect(segments.length).toBeGreaterThan(1);
      
      const prevSegment = segmenter.getPreviousSegment(segments, 1);
      expect(prevSegment).toBeDefined();
      expect(prevSegment?.id).toBe(0);
    });

    it('should return undefined for non-existent segment', () => {
      const segmenter = new TextSegmenter('zh-CN');
      const text = '第一句话。第二句话。第三句话。';
      const segments = segmenter.segment(text);

      const segment = segmenter.getSegmentById(segments, 999);
      expect(segment).toBeUndefined();
    });
  });

  describe('Comparison with Sentence-based Segmentation', () => {
    it('should produce fewer segments than sentence-based for long text', () => {
      const smartSegmenter = new TextSegmenter('zh-CN', {
        minLength: 100,
        maxLength: 300
      });

      const longText = '这是第一句话。这是第二句话。这是第三句话。这是第四句话。这是第五句话。这是第六句话。这是第七句话。这是第八句话。这是第九句话。这是第十句话。这是第十一句话。这是第十二句话。这是第十三句话。这是第十四句话。这是第十五句话。';
      
      const smartSegments = smartSegmenter.segment(longText);
      
      expect(smartSegments.length).toBeLessThan(15);
      expect(smartSegments.length).toBeGreaterThan(0);
    });

    it('should maintain semantic coherence', () => {
      const segmenter = new TextSegmenter('zh-CN', {
        minLength: 80,
        maxLength: 200
      });

      const text = '这是一个段落，包含多个句子。这些句子应该被合理地分组。每个分段都应该保持语义的完整性。这样可以让TTS合成更加自然流畅。这是更多的句子来确保有足够的内容进行分段。这是第六句话。这是第七句话。这是第八句话。这是第九句话。这是第十句话。';
      const segments = segmenter.segment(text);

      segments.forEach(segment => {
        const trimmed = segment.text.trim();
        expect(trimmed.length).toBeGreaterThanOrEqual(80);
        expect(trimmed.length).toBeLessThanOrEqual(200);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle mixed punctuation', () => {
      const segmenter = new TextSegmenter('zh-CN', {
        minLength: 30,
        maxLength: 100
      });

      const text = '第一句。第二句！第三句？第四句。第五句！';
      const segments = segmenter.segment(text);

      expect(segments.length).toBeGreaterThan(0);
      segments.forEach(segment => {
        expect(segment.text.length).toBeGreaterThan(0);
      });
    });

    it('should handle text with commas', () => {
      const segmenter = new TextSegmenter('zh-CN', {
        minLength: 50,
        maxLength: 150
      });

      const text = '这是第一部分，包含逗号。这是第二部分，也有逗号。这是第三部分，还是逗号。这是第四部分，最后逗号。这是第五部分，继续逗号。这是第六部分，更多逗号。这是第七部分，还有逗号。这是第八部分，再次逗号。';
      const segments = segmenter.segment(text);

      expect(segments.length).toBeGreaterThan(0);
      segments.forEach(segment => {
        expect(segment.text.length).toBeGreaterThanOrEqual(50);
      });
    });

    it('should handle very long single sentence', () => {
      const segmenter = new TextSegmenter('zh-CN', {
        maxLength: 200
      });

      const longSentence = '这是一个非常非常长的句子，它包含了很多很多的内容，但是没有句号，所以它会被强制分割成多个片段，每个片段都会在合适的位置进行切分，比如在逗号的位置。'.repeat(3);
      const segments = segmenter.segment(longSentence);

      segments.forEach(segment => {
        expect(segment.text.length).toBeLessThanOrEqual(200);
      });
    });
  });
});