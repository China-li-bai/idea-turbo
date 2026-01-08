import type { TextSegment, TextParagraph } from '../types';
import { TextPreprocessor } from './preprocessor';
import { TextSegmenter } from './segmenter';
import { ParagraphSegmenter } from './paragraph';

export interface TextProcessorOptions {
  preprocessor: Parameters<typeof TextPreprocessor.create>[0];
  segmenter: Parameters<typeof TextSegmenter.create>[0];
  paragraph: Parameters<typeof ParagraphSegmenter.create>[0];
}

export interface TextProcessingResult {
  processedText: string;
  segments: TextSegment[];
  paragraphs: TextParagraph[];
}

export class TextProcessor {
  private preprocessor: TextPreprocessor;
  private segmenter: TextSegmenter;
  private paragraphSegmenter: ParagraphSegmenter;

  constructor(options?: Partial<TextProcessorOptions>) {
    this.preprocessor = TextPreprocessor.create(options?.preprocessor);
    this.segmenter = TextSegmenter.create(options?.segmenter);
    this.paragraphSegmenter = ParagraphSegmenter.create(options?.paragraph);
  }

  process(rawText: string): TextProcessingResult {
    const processedText = this.preprocessor.process(rawText);
    const segments = this.segmenter.segment(processedText);

    const doc = {
      id: 'temp',
      rawText,
      processedText,
      segments,
      paragraphs: [] as TextParagraph[],
      metadata: {
        totalChars: processedText.length,
        totalSegments: segments.length,
        totalParagraphs: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    };

    const paragraphs = this.paragraphSegmenter.segment(segments, doc);

    return { processedText, segments, paragraphs };
  }

  static create(options?: Partial<TextProcessorOptions>): TextProcessor {
    return new TextProcessor(options);
  }
}
