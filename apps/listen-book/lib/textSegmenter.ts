import { TextCleaner } from './textCleaner';

export interface TextSegment {
  id: number;
  text: string;
  startIndex: number;
  endIndex: number;
}

export interface SegmentationConfig {
  minLength?: number;
  maxLength?: number;
  overlap?: number;
  preferParagraphs?: boolean;
}

export class TextSegmenter {
  private segmenter: Intl.Segmenter | null = null;
  private config: Required<SegmentationConfig>;

  constructor(locale: string = 'zh-CN', config: SegmentationConfig = {}) {
    if (typeof window !== 'undefined' && 'Intl' in window && 'Segmenter' in Intl) {
      this.segmenter = new Intl.Segmenter(locale, { granularity: 'sentence' });
    }

    this.config = {
      minLength: config.minLength || 50,
      maxLength: config.maxLength || 500,
      overlap: config.overlap || 0,
      preferParagraphs: config.preferParagraphs !== false
    };
  }

  segment(text: string): TextSegment[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const cleanedText = TextCleaner.clean(text);
    
    if (!cleanedText || cleanedText.trim().length === 0) {
      return [];
    }

    return this.smartSegment(cleanedText);
  }

  private smartSegment(text: string): TextSegment[] {
    const segments: TextSegment[] = [];
    let currentIndex = 0;

    while (currentIndex < text.length) {
      const remainingText = text.substring(currentIndex);
      
      if (remainingText.trim().length === 0) {
        break;
      }

      const segmentLength = Math.min(
        this.config.maxLength,
        remainingText.length
      );

      let segmentText = remainingText.substring(0, segmentLength);
      
      segmentText = this.adjustSegmentBoundaries(segmentText, text, currentIndex);

      const trimmedText = segmentText.trim();
      if (trimmedText.length > 0) {
        segments.push({
          id: segments.length,
          text: trimmedText,
          startIndex: currentIndex,
          endIndex: currentIndex + segmentText.length
        });
      }

      currentIndex += segmentText.length - this.config.overlap;
    }

    return this.mergeShortSegments(segments);
  }

  private adjustSegmentBoundaries(segmentText: string, fullText: string, startIndex: number): string {
    const lastSentenceEnd = this.findLastSentenceEnd(segmentText);
    const lastParagraphEnd = this.findLastParagraphEnd(segmentText);

    if (this.config.preferParagraphs && lastParagraphEnd > 0) {
      const adjusted = segmentText.substring(0, lastParagraphEnd);
      if (adjusted.trim().length > 0) {
        return adjusted;
      }
    }

    if (lastSentenceEnd > 0) {
      const adjusted = segmentText.substring(0, lastSentenceEnd);
      if (adjusted.trim().length > 0) {
        return adjusted;
      }
    }

    const lastCommaEnd = this.findLastPunctuationEnd(segmentText, [',', '，', ';', '；']);
    if (lastCommaEnd > 0) {
      const adjusted = segmentText.substring(0, lastCommaEnd);
      if (adjusted.trim().length > 0) {
        return adjusted;
      }
    }

    return segmentText;
  }

  private findLastSentenceEnd(text: string): number {
    const sentenceEndings = ['.', '!', '?', '。', '！', '？'];
    let lastIndex = -1;

    for (const ending of sentenceEndings) {
      const index = text.lastIndexOf(ending);
      if (index > lastIndex) {
        lastIndex = index + 1;
      }
    }

    return lastIndex;
  }

  private findLastParagraphEnd(text: string): number {
    const paragraphEndings = ['\n\n', '\r\n\r\n'];
    let lastIndex = -1;

    for (const ending of paragraphEndings) {
      const index = text.lastIndexOf(ending);
      if (index > lastIndex) {
        lastIndex = index + ending.length;
      }
    }

    return lastIndex;
  }

  private findLastPunctuationEnd(text: string, punctuations: string[]): number {
    let lastIndex = -1;

    for (const punctuation of punctuations) {
      const index = text.lastIndexOf(punctuation);
      if (index > lastIndex) {
        lastIndex = index + 1;
      }
    }

    return lastIndex;
  }

  private mergeShortSegments(segments: TextSegment[]): TextSegment[] {
    if (segments.length === 0) {
      return segments;
    }

    const mergedSegments: TextSegment[] = [];
    let i = 0;

    while (i < segments.length) {
      let currentSegment = { ...segments[i] };
      
      while (currentSegment.text.length < this.config.minLength && i + 1 < segments.length) {
        const nextSegment = segments[i + 1];
        const combinedLength = currentSegment.text.length + nextSegment.text.length;

        currentSegment = {
          id: currentSegment.id,
          text: currentSegment.text + nextSegment.text,
          startIndex: currentSegment.startIndex,
          endIndex: nextSegment.endIndex
        };
        i++;
      }

      mergedSegments.push(currentSegment);
      i++;
    }

    return mergedSegments.map((segment, index) => ({
      ...segment,
      id: index
    }));
  }

  private fallbackSegment(text: string): TextSegment[] {
    const segments: TextSegment[] = [];
    let currentIndex = 0;

    while (currentIndex < text.length) {
      const remainingText = text.substring(currentIndex);
      const segmentLength = Math.min(this.config.maxLength, remainingText.length);
      const segmentText = remainingText.substring(0, segmentLength);

      if (segmentText.trim().length > 0) {
        segments.push({
          id: segments.length,
          text: segmentText.trim(),
          startIndex: currentIndex,
          endIndex: currentIndex + segmentText.length
        });
      }

      currentIndex += segmentLength;
    }

    return this.mergeShortSegments(segments);
  }

  getSegmentById(segments: TextSegment[], id: number): TextSegment | undefined {
    return segments.find(segment => segment.id === id);
  }

  getNextSegment(segments: TextSegment[], currentId: number): TextSegment | undefined {
    return segments.find(segment => segment.id === currentId + 1);
  }

  getPreviousSegment(segments: TextSegment[], currentId: number): TextSegment | undefined {
    return segments.find(segment => segment.id === currentId - 1);
  }

  updateConfig(config: Partial<SegmentationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): SegmentationConfig {
    return { ...this.config };
  }
}
