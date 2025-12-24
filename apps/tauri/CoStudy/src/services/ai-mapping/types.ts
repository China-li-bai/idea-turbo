export interface CsvRow {
  [key: string]: string;
}

export interface FieldMapping {
  [csvColumn: string]: string;
}

export interface AiMappingResult {
  success: boolean;
  mapping?: FieldMapping;
  error?: string;
}

export interface AiMappingConfig {
  provider: string;
  apiKey?: string;
  baseUrl?: string;
}

export type ImportMode = 'flashcard' | 'vocabulary';