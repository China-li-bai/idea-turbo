export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: string[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface VectorEntry {
  id: string;
  vector: number[];
  metadata: CalendarEvent;
}

export interface SearchResult {
  event: CalendarEvent;
  score: number;
}

export interface EmbeddingConfig {
  modelName: string;
  useWebGPU: boolean;
  cacheEnabled: boolean;
}

export interface VectorDBConfig {
  dimension: number;
  topK: number;
}

export interface RAGConfig {
  apiEndpoint: string;
  apiKey?: string;
  model: string;
  maxContextLength: number;
}

export interface CalendarConfig {
  dbName: string;
  embedding: EmbeddingConfig;
  vectorDB: VectorDBConfig;
  rag?: RAGConfig;
}

export const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
  modelName: "Xenova/multilingual-e5-small",
  useWebGPU: true,
  cacheEnabled: true,
};

export const DEFAULT_VECTOR_DB_CONFIG: VectorDBConfig = {
  dimension: 384,
  topK: 3,
};

export const DEFAULT_CALENDAR_CONFIG: CalendarConfig = {
  dbName: "local-first-ai-calendar",
  embedding: DEFAULT_EMBEDDING_CONFIG,
  vectorDB: DEFAULT_VECTOR_DB_CONFIG,
};
