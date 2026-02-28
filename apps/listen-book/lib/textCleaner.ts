export class TextCleaner {
  private static CONTROL_CHARS_REGEX = /[\x00-\x1F\x7F-\x9F]/g;
  private static EXTRA_WHITESPACE_REGEX = /\s+/g;
  private static TRIM_WHITESPACE_REGEX = /^\s+|\s+$/g;
  private static HTML_TAGS_REGEX = /<[^>]*>/g;

  static clean(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text
      .replace(this.HTML_TAGS_REGEX, '')
      .replace(this.CONTROL_CHARS_REGEX, '')
      .replace(this.EXTRA_WHITESPACE_REGEX, ' ')
      .replace(this.TRIM_WHITESPACE_REGEX, '');
  }

  static removeControlChars(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }
    return text.replace(this.CONTROL_CHARS_REGEX, '');
  }

  static normalizeWhitespace(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }
    return text
      .replace(this.EXTRA_WHITESPACE_REGEX, ' ')
      .replace(this.TRIM_WHITESPACE_REGEX, '');
  }

  static removeHtmlTags(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }
    return text.replace(this.HTML_TAGS_REGEX, '');
  }

  static removeSpecialChars(text: string, keepPunctuation: boolean = true): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    if (keepPunctuation) {
      return text.replace(/[^\w\s\u4e00-\u9fa5.,!?;:'"()\-]/g, '');
    }

    return text.replace(/[^\w\s\u4e00-\u9fa5]/g, '');
  }
}
