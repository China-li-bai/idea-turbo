import type { TextDocument, TextProcessingResult } from '../types';
import { validateTextInput, generateId } from '../utils';

export interface PreprocessingOptions {
  removeExtraWhitespace: boolean;
  normalizeNewlines: boolean;
  trimLines: boolean;
  removeSpecialChars: boolean;
  preserveParagraphs: boolean;
  maxLineLength: number;
}

export const defaultPreprocessingOptions: PreprocessingOptions = {
  removeExtraWhitespace: true,
  normalizeNewlines: true,
  trimLines: true,
  removeSpecialChars: false,
  preserveParagraphs: true,
  maxLineLength: 0,
};

export class TextPreprocessor {
  private options: PreprocessingOptions;

  constructor(options: Partial<PreprocessingOptions> = {}) {
    this.options = { ...defaultPreprocessingOptions, ...options };
  }

  process(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    let processed = text;

    if (this.options.normalizeNewlines) {
      processed = processed.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    }

    if (this.options.removeExtraWhitespace) {
      processed = processed
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n');
    }

    if (this.options.trimLines) {
      processed = processed
        .split('\n')
        .map(line => line.trim())
        .join('\n');
    }

    if (this.options.preserveParagraphs) {
      processed = processed
        .replace(/\n/g, '\n\n')
        .replace(/\n{3,}/g, '\n\n');
    }

    if (this.options.maxLineLength > 0) {
      processed = this.wrapLines(processed, this.options.maxLineLength);
    }

    if (this.options.removeSpecialChars) {
      processed = processed.replace(/[^\p{L}\p{N}\p{P}\p{Zs}\n]/gu, '');
    }

    return processed.trim();
  }

  private wrapLines(text: string, maxLength: number): string {
    const lines = text.split('\n');
    const wrapped: string[] = [];

    for (const line of lines) {
      if (line.length <= maxLength) {
        wrapped.push(line);
      } else {
        let remaining = line;
        while (remaining.length > maxLength) {
          let cutIndex = remaining.lastIndexOf(' ', maxLength);
          if (cutIndex === -1) {
            cutIndex = maxLength;
          }
          wrapped.push(remaining.slice(0, cutIndex));
          remaining = remaining.slice(cutIndex).trim();
        }
        if (remaining) {
          wrapped.push(remaining);
        }
      }
    }

    return wrapped.join('\n');
  }

  static create(options?: Partial<PreprocessingOptions>): TextPreprocessor {
    return new TextPreprocessor(options);
  }
}

export function preprocessText(
  text: string,
  options?: Partial<PreprocessingOptions>
): string {
  const preprocessor = TextPreprocessor.create(options);
  return preprocessor.process(text);
}

export async function processTextDocument(
  rawText: string,
  options?: Partial<PreprocessingOptions>
): Promise<TextProcessingResult> {
  const startTime = performance.now();

  try {
    const validation = validateTextInput(rawText);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        processingTime: performance.now() - startTime,
      };
    }

    const preprocessor = TextPreprocessor.create(options);
    const processedText = preprocessor.process(rawText);

    if (!processedText) {
      return {
        success: false,
        error: '预处理后文本为空',
        processingTime: performance.now() - startTime,
      };
    }

    return {
      success: true,
      document: {
        id: generateId(),
        rawText,
        processedText,
        segments: [],
        paragraphs: [],
        metadata: {
          totalChars: processedText.length,
          totalSegments: 0,
          totalParagraphs: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      },
      processingTime: performance.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '预处理失败',
      processingTime: performance.now() - startTime,
    };
  }
}
