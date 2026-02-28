import { describe, it, expect } from 'vitest';
import { TextCleaner } from './textCleaner';
import { TextSegmenter } from './textSegmenter';

describe('TextCleaner', () => {
  it('should clean text with extra spaces', () => {
    const input = 'Hello    world';
    const result = TextCleaner.clean(input);
    expect(result).toBe('Hello world');
  });

  it('should remove control characters', () => {
    const input = 'Hello\x00world';
    const result = TextCleaner.clean(input);
    expect(result).toBe('Helloworld');
  });

  it('should remove HTML tags', () => {
    const input = '<p>Hello</p> world';
    const result = TextCleaner.clean(input);
    expect(result).toBe('Hello world');
  });

  it('should handle empty input', () => {
    const result = TextCleaner.clean('');
    expect(result).toBe('');
  });

  it('should handle null input', () => {
    const result = TextCleaner.clean(null as any);
    expect(result).toBe('');
  });

  it('should normalize whitespace', () => {
    const input = '  Hello   world  ';
    const result = TextCleaner.normalizeWhitespace(input);
    expect(result).toBe('Hello world');
  });

  it('should remove control characters', () => {
    const input = 'Hello\x00\x1F\x7Fworld';
    const result = TextCleaner.removeControlChars(input);
    expect(result).toBe('Helloworld');
  });

  it('should remove HTML tags', () => {
    const input = '<div>Hello</div><p>world</p>';
    const result = TextCleaner.removeHtmlTags(input);
    expect(result).toBe('Helloworld');
  });

  it('should remove special characters with punctuation', () => {
    const input = 'Hello, @world! #test';
    const result = TextCleaner.removeSpecialChars(input, true);
    expect(result).toBe('Hello, world! test');
  });

  it('should remove special characters without punctuation', () => {
    const input = 'Hello, @world! #test';
    const result = TextCleaner.removeSpecialChars(input, false);
    expect(result).toBe('Hello world test');
  });
});

describe('TextSegmenter', () => {
  it('should segment text into sentences', () => {
    const segmenter = new TextSegmenter();
    const input = 'Hello world. How are you?';
    const segments = segmenter.segment(input);
    
    expect(segments.length).toBeGreaterThan(0);
    expect(segments[0].text).toContain('Hello world');
  });

  it('should handle empty input', () => {
    const segmenter = new TextSegmenter();
    const segments = segmenter.segment('');
    expect(segments).toEqual([]);
  });

  it('should handle null input', () => {
    const segmenter = new TextSegmenter();
    const segments = segmenter.segment(null as any);
    expect(segments).toEqual([]);
  });

  it('should clean text before segmenting', () => {
    const segmenter = new TextSegmenter();
    const input = 'Hello    world. How   are you?';
    const segments = segmenter.segment(input);
    
    expect(segments.length).toBeGreaterThan(0);
    segments.forEach(segment => {
      expect(segment.text).not.toContain('  ');
    });
  });

  it('should get segment by id', () => {
    const segmenter = new TextSegmenter();
    const input = 'Hello world. How are you?';
    const segments = segmenter.segment(input);
    
    if (segments.length > 0) {
      const segment = segmenter.getSegmentById(segments, 0);
      expect(segment).toBeDefined();
      expect(segment?.id).toBe(0);
    }
  });

  it('should get next segment', () => {
    const segmenter = new TextSegmenter();
    const input = 'Hello world. How are you? This is a test.';
    const segments = segmenter.segment(input);
    
    if (segments.length > 1) {
      const nextSegment = segmenter.getNextSegment(segments, 0);
      expect(nextSegment).toBeDefined();
      expect(nextSegment?.id).toBe(1);
    }
  });

  it('should get previous segment', () => {
    const segmenter = new TextSegmenter();
    const input = 'Hello world. How are you? This is a test.';
    const segments = segmenter.segment(input);
    
    if (segments.length > 1) {
      const previousSegment = segmenter.getPreviousSegment(segments, 1);
      expect(previousSegment).toBeDefined();
      expect(previousSegment?.id).toBe(0);
    }
  });

  it('should handle Chinese text', () => {
    const segmenter = new TextSegmenter('zh-CN');
    const input = '你好世界。你好吗？';
    const segments = segmenter.segment(input);
    
    expect(segments.length).toBeGreaterThan(0);
  });
});
