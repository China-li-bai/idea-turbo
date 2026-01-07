import type { TextSegment, TextParagraph, TextDocument } from '../types';
import { generateId } from '../utils';

export interface ParagraphSegmentationOptions {
  maxCharsPerParagraph: number;
  minParagraphs: number;
  preserveExistingBreaks: boolean;
  splitOnHeadings: boolean;
  headingPatterns: RegExp[];
}

export const defaultParagraphSegmentationOptions: ParagraphSegmentationOptions = {
  maxCharsPerParagraph: 2000,
  minParagraphs: 1,
  preserveExistingBreaks: true,
  splitOnHeadings: true,
  headingPatterns: [
    /^#{1,6}\s+.+$/m,
    /^[A-Z][^.!?]*[:.]$/m,
    /^\d+\.\s+.+$/m,
    /^第[一二三四五六七八九十百千]+[章节].*$/m,
  ],
};

export class ParagraphSegmenter {
  private options: ParagraphSegmentationOptions;

  constructor(options: Partial<ParagraphSegmentationOptions> = {}) {
    this.options = { ...defaultParagraphSegmentationOptions, ...options };
  }

  segment(segments: TextSegment[], document: TextDocument): TextParagraph[] {
    if (!segments || segments.length === 0) {
      return this.createEmptyParagraphs();
    }

    const paragraphs: TextParagraph[] = [];
    let currentParagraph: TextParagraph | null = null;
    let currentParagraphChars = 0;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const segmentChars = segment.text.length;

      if (this.shouldStartNewParagraph(segment, currentParagraph, currentParagraphChars, document)) {
        if (currentParagraph) {
          this.finalizeParagraph(currentParagraph, paragraphs.length);
          paragraphs.push(currentParagraph);
        }

        currentParagraph = {
          id: paragraphs.length,
          startSegmentId: segment.id,
          endSegmentId: segment.id,
          segmentCount: 1,
          charCount: segmentChars,
        };
        currentParagraphChars = segmentChars;
      } else {
        if (currentParagraph) {
          currentParagraph.endSegmentId = segment.id;
          currentParagraph.segmentCount++;
          currentParagraph.charCount += segmentChars;
          currentParagraphChars += segmentChars;
        }
      }

      if (currentParagraphChars >= this.options.maxCharsPerParagraph) {
        if (currentParagraph) {
          this.finalizeParagraph(currentParagraph, paragraphs.length);
          paragraphs.push(currentParagraph);
        }
        currentParagraph = null;
        currentParagraphChars = 0;
      }
    }

    if (currentParagraph && currentParagraph.segmentCount > 0) {
      this.finalizeParagraph(currentParagraph, paragraphs.length);
      paragraphs.push(currentParagraph);
    }

    if (paragraphs.length < this.options.minParagraphs) {
      return this.ensureMinimumParagraphs(segments, paragraphs);
    }

    return paragraphs;
  }

  private shouldStartNewParagraph(
    segment: TextSegment,
    currentParagraph: TextParagraph | null,
    currentParagraphChars: number,
    document: TextDocument
  ): boolean {
    if (!currentParagraph) {
      return true;
    }

    if (this.options.preserveExistingBreaks && segment.text.includes('\n')) {
      return true;
    }

    if (this.options.splitOnHeadings && this.isHeading(segment.text)) {
      return true;
    }

    if (currentParagraphChars >= this.options.maxCharsPerParagraph - segment.text.length) {
      return true;
    }

    return false;
  }

  private isHeading(text: string): boolean {
    const trimmedText = text.trim();
    return this.options.headingPatterns.some(pattern => pattern.test(trimmedText));
  }

  private finalizeParagraph(paragraph: TextParagraph, nextId: number): void {
    paragraph.id = nextId;
  }

  private createEmptyParagraphs(): TextParagraph[] {
    const paragraphs: TextParagraph[] = [];
    for (let i = 0; i < this.options.minParagraphs; i++) {
      paragraphs.push({
        id: i,
        startSegmentId: 0,
        endSegmentId: 0,
        segmentCount: 0,
        charCount: 0,
      });
    }
    return paragraphs;
  }

  private ensureMinimumParagraphs(segments: TextSegment[], paragraphs: TextParagraph[]): TextParagraph[] {
    while (paragraphs.length < this.options.minParagraphs && segments.length > 0) {
      const remainingSegments = segments.slice(
        paragraphs.reduce((acc, p) => acc + p.segmentCount, 0)
      );

      if (remainingSegments.length === 0) break;

      const paragraph: TextParagraph = {
        id: paragraphs.length,
        startSegmentId: remainingSegments[0].id,
        endSegmentId: remainingSegments[remainingSegments.length - 1].id,
        segmentCount: remainingSegments.length,
        charCount: remainingSegments.reduce((sum, s) => sum + s.text.length, 0),
      };

      paragraphs.push(paragraph);
    }

    return paragraphs;
  }

  updateDocumentParagraphs(document: TextDocument): TextDocument {
    const paragraphs = this.segment(document.segments, document);

    return {
      ...document,
      paragraphs,
      metadata: {
        ...document.metadata,
        totalParagraphs: paragraphs.length,
        updatedAt: Date.now(),
      },
    };
  }

  getParagraphForSegment(paragraphs: TextParagraph[], segmentId: number): TextParagraph | null {
    for (const paragraph of paragraphs) {
      if (segmentId >= paragraph.startSegmentId && segmentId <= paragraph.endSegmentId) {
        return paragraph;
      }
    }
    return null;
  }

  getNextParagraph(paragraphs: TextParagraph[], currentParagraphId: number): TextParagraph | null {
    if (currentParagraphId >= paragraphs.length - 1) {
      return null;
    }
    return paragraphs[currentParagraphId + 1];
  }

  getPreviousParagraph(paragraphs: TextParagraph[], currentParagraphId: number): TextParagraph | null {
    if (currentParagraphId <= 0) {
      return null;
    }
    return paragraphs[currentParagraphId - 1];
  }

  getParagraphSegments(paragraphs: TextParagraph[], paragraphId: number, segments: TextSegment[]): TextSegment[] {
    const paragraph = paragraphs[paragraphId];
    if (!paragraph) return [];

    return segments.filter(
      s => s.id >= paragraph.startSegmentId && s.id <= paragraph.endSegmentId
    );
  }

  static create(options?: Partial<ParagraphSegmentationOptions>): ParagraphSegmenter {
    return new ParagraphSegmenter(options);
  }
}
