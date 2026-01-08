import type { TextSegment, TextDocument } from '../types';
import { split } from 'sentence-splitter';

export interface SegmentationOptions {
  minSegmentLength: number;
  maxSegmentLength: number;
  preservePunctuation: boolean;
  splitOnAbbreviations: boolean;
  customDelimiters: string[];
}

export const defaultSegmentationOptions: SegmentationOptions = {
  minSegmentLength: 1,
  maxSegmentLength: 500,
  preservePunctuation: true,
  splitOnAbbreviations: false,
  customDelimiters: [],
};

export class TextSegmenter {
  private options: SegmentationOptions;

  constructor(options: Partial<SegmentationOptions> = {}) {
    this.options = { ...defaultSegmentationOptions, ...options };
  }

  segment(text: string, startParagraphId: number = 0): TextSegment[] {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const sentences = this.splitIntoSentences(text);
    const segments: TextSegment[] = [];
    let currentIndex = 0;
    let paragraphId = startParagraphId;
    let charCountInParagraph = 0;

    for (let i = 0; i < sentences.length; i++) {
      let sentence = sentences[i].trim();

      if (!sentence) continue;

      if (this.options.preservePunctuation) {
        sentence = this.addPunctuation(sentence);
      }

      const segmentText = sentence;
      const startIndex = currentIndex;
      const endIndex = currentIndex + segmentText.length;

      if (segmentText.length < this.options.minSegmentLength) {
        continue;
      }

      const segment: TextSegment = {
        id: segments.length,
        text: segmentText,
        startIndex,
        endIndex,
        paragraphId,
      };

      segments.push(segment);

      charCountInParagraph += segmentText.length;
      currentIndex = endIndex;

      if (charCountInParagraph > 2000) {
        paragraphId++;
        charCountInParagraph = 0;
      }
    }

    return segments;
  }

  private splitIntoSentences(text: string): string[] {
    try {
      const results = split(text);
      const sentences = results
        .map((s: any) => s.raw || s.value || '')
        .filter((s: string) => s.trim());

      if (sentences.length === 0 && this.isChineseText(text)) {
        return this.splitChineseText(text);
      }

      return sentences;
    } catch (error) {
      console.error('sentence-splitter error:', error);
      if (this.isChineseText(text)) {
        return this.splitChineseText(text);
      }
      return this.fallbackSplitSentences(text);
    }
  }

  private splitChineseText(text: string): string[] {
    const sentences: string[] = [];
    const maxChunkLength = 50;
    let buffer = '';
    let i = 0;

    while (i < text.length) {
      buffer += text[i];
      i++;

      if (buffer.length >= maxChunkLength || this.isChineseSentenceEnding(text[i])) {
        if (buffer.trim()) {
          sentences.push(buffer);
        }
        buffer = '';
      }
    }

    if (buffer.trim()) {
      sentences.push(buffer);
    }

    return sentences;
  }

  private fallbackSplitSentences(text: string): string[] {
    const sentences: string[] = [];
    let buffer = '';
    let i = 0;

    while (i < text.length) {
      const char = text[i];

      if (this.isSentenceEnding(char)) {
        const potentialSentence = buffer + char;

        if (this.isAbbreviation(buffer) && !this.options.splitOnAbbreviations) {
          buffer += char;
        } else if (this.isQuoteEnding(char) && this.hasMatchingQuote(buffer)) {
          buffer += char;
          if (buffer.trim()) {
            sentences.push(buffer);
          }
          buffer = '';
        } else if (potentialSentence.length >= this.options.minSegmentLength) {
          sentences.push(potentialSentence);
          buffer = '';
        } else {
          buffer += char;
        }
      } else if (char === '\n' && buffer.trim()) {
        sentences.push(buffer);
        buffer = '';
      } else if (this.options.customDelimiters.includes(char)) {
        if (buffer.trim()) {
          sentences.push(buffer);
        }
        buffer = '';
      } else {
        buffer += char;
      }

      i++;
    }

    if (buffer.trim()) {
      sentences.push(buffer);
    }

    return sentences;
  }

  private isSentenceEnding(char: string): boolean {
    return /[.!?。！？]/.test(char);
  }

  private isChineseSentenceEnding(char: string): boolean {
    return /[。！？]/.test(char);
  }

  private isChineseText(text: string): boolean {
    return /[\u4e00-\u9fa5]/.test(text);
  }

  private isAbbreviation(text: string): boolean {
    const abbreviations = [
      'etc', 'i.e', 'e.g', 'vs', 'mr', 'mrs', 'ms', 'dr', 'prof',
      'inc', 'llc', 'corp', 'ltd', 'co', 'num', 'vol', 'chap',
      'apt', 'blvd', 'ave', 'st', 'rd', 'etc.',
    ];
    const lowerText = text.toLowerCase().trim();
    return abbreviations.some(abbrev => lowerText.endsWith(abbrev));
  }

  private isQuoteEnding(char: string): boolean {
    return /[」』]/.test(char);
  }

  private hasMatchingQuote(text: string): boolean {
    const openQuotes = (text.match(/[「『]/g) || []).length;
    const closeQuotes = (text.match(/[」』]/g) || []).length;
    return openQuotes > closeQuotes;
  }

  private addPunctuation(text: string): string {
    const trimmed = text.trim();
    if (!trimmed) return text;

    const lastChar = trimmed.slice(-1);
    if (this.isSentenceEnding(lastChar)) {
      return trimmed;
    }

    if (/[」』]/.test(lastChar)) {
      const quoteIndex = trimmed.lastIndexOf(lastChar);
      const beforeQuote = trimmed.slice(0, quoteIndex).trimEnd();
      return beforeQuote + '。';
    }

    if (/[’']/.test(lastChar)) {
      return trimmed.slice(0, -1) + '。';
    }

    return trimmed + '。';
  }

  static create(options?: Partial<SegmentationOptions>): TextSegmenter {
    return new TextSegmenter(options);
  }
}

export function segmentText(
  text: string,
  options?: Partial<SegmentationOptions>
): TextSegment[] {
  const segmenter = TextSegmenter.create(options);
  return segmenter.segment(text);
}

export function addSegmentsToDocument(
  document: TextDocument,
  options?: Partial<SegmentationOptions>
): TextDocument {
  const segmenter = TextSegmenter.create(options);
  const segments = segmenter.segment(document.processedText);

  const updatedDocument: TextDocument = {
    ...document,
    segments,
    metadata: {
      ...document.metadata,
      totalSegments: segments.length,
      updatedAt: Date.now(),
    },
  };

  return updatedDocument;
}

export function getSegmentById(
  document: TextDocument,
  segmentId: number
): TextSegment | null {
  if (segmentId < 0 || segmentId >= document.segments.length) {
    return null;
  }
  return document.segments[segmentId];
}

export function findSegmentByCharIndex(
  document: TextDocument,
  charIndex: number
): TextSegment | null {
  for (const segment of document.segments) {
    if (charIndex >= segment.startIndex && charIndex <= segment.endIndex) {
      return segment;
    }
  }
  return null;
}

export function getSegmentsInRange(
  document: TextDocument,
  startSegmentId: number,
  endSegmentId: number
): TextSegment[] {
  return document.segments.filter(
    seg => seg.id >= startSegmentId && seg.id <= endSegmentId
  );
}

export function getSegmentProgress(
  document: TextDocument,
  currentSegmentId: number
): number {
  if (document.segments.length === 0) return 0;
  return currentSegmentId / document.segments.length;
}
