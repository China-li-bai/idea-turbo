import { UnifiedCalendarItem } from './unified';

export type MemoryType = 'short-term' | 'long-term' | 'working';

export type MemoryCategory = 
  | 'query' 
  | 'result' 
  | 'feedback' 
  | 'preference' 
  | 'pattern' 
  | 'context';

export interface MemoryItem {
  id: string;
  type: MemoryType;
  category: MemoryCategory;
  
  content: string;
  embedding?: number[];
  
  metadata: {
    timestamp: number;
    sessionId?: string;
    source: 'user' | 'system' | 'consolidated';
    confidence: number;
    accessCount: number;
    lastAccessedAt: number;
    
    tags?: string[];
    relatedItemIds?: string[];
    importance: 'low' | 'medium' | 'high';
    
    expiresAt?: number;
    consolidatedFrom?: string[];
  };
}

export interface QueryMemory extends MemoryItem {
  category: 'query';
  metadata: MemoryItem['metadata'] & {
    queryType: 'search' | 'create' | 'update' | 'delete' | 'analyze';
    intent?: string;
    entities?: Array<{
      type: string;
      value: string;
      confidence: number;
    }>;
  };
}

export interface ResultMemory extends MemoryItem {
  category: 'result';
  metadata: MemoryItem['metadata'] & {
    queryId: string;
    resultCount: number;
    topResults: Array<{
      itemId: string;
      score: number;
    }>;
    userAction?: 'clicked' | 'ignored' | 'modified' | 'saved';
  };
}

export interface FeedbackMemory extends MemoryItem {
  category: 'feedback';
  metadata: MemoryItem['metadata'] & {
    targetMemoryId: string;
    feedbackType: 'positive' | 'negative' | 'neutral';
    feedbackDetail?: string;
    rating?: number;
  };
}

export interface PreferenceMemory extends MemoryItem {
  category: 'preference';
  metadata: MemoryItem['metadata'] & {
    preferenceType: 'time' | 'location' | 'category' | 'priority' | 'style';
    preferenceValue: unknown;
    strength: number;
    context?: string;
  };
}

export interface PatternMemory extends MemoryItem {
  category: 'pattern';
  metadata: MemoryItem['metadata'] & {
    patternType: 'temporal' | 'behavioral' | 'contextual';
    pattern: string;
    frequency: number;
    lastOccurrence: number;
    examples: string[];
  };
}

export interface ContextMemory extends MemoryItem {
  category: 'context';
  metadata: MemoryItem['metadata'] & {
    contextType: 'session' | 'task' | 'goal';
    relatedItems: UnifiedCalendarItem[];
    activeDuration: number;
  };
}

export type SpecificMemory = 
  | QueryMemory 
  | ResultMemory 
  | FeedbackMemory 
  | PreferenceMemory 
  | PatternMemory 
  | ContextMemory;

export interface MemorySearchOptions {
  query?: string;
  types?: MemoryType[];
  categories?: MemoryCategory[];
  tags?: string[];
  timeRange?: {
    start: number;
    end: number;
  };
  limit?: number;
  minConfidence?: number;
  includeEmbeddings?: boolean;
}

export interface MemorySearchResult {
  memories: MemoryItem[];
  total: number;
  hasMore: boolean;
  queryTime: number;
}

export interface MemoryConsolidationOptions {
  maxAge?: number;
  minAccessCount?: number;
  minConfidence?: number;
  preserveCategories?: MemoryCategory[];
}

export interface MemoryConsolidationResult {
  consolidated: number;
  archived: number;
  deleted: number;
  patterns: PatternMemory[];
  duration: number;
}

export interface MemoryStats {
  totalMemories: number;
  byType: Record<MemoryType, number>;
  byCategory: Record<MemoryCategory, number>;
  averageConfidence: number;
  oldestMemory: number;
  newestMemory: number;
  totalSize: number;
}

export interface MemorySystem {
  initialize(): Promise<void>;
  
  addMemory(memory: Omit<MemoryItem, 'id' | 'metadata'> & { 
    metadata?: Partial<MemoryItem['metadata']> 
  }): Promise<MemoryItem>;
  
  getMemory(id: string): Promise<MemoryItem | null>;
  
  updateMemory(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem | null>;
  
  deleteMemory(id: string): Promise<boolean>;
  
  searchMemories(options: MemorySearchOptions): Promise<MemorySearchResult>;
  
  getRelatedMemories(memoryId: string, limit?: number): Promise<MemoryItem[]>;
  
  recordAccess(memoryId: string): Promise<void>;
  
  consolidate(options?: MemoryConsolidationOptions): Promise<MemoryConsolidationResult>;
  
  getStats(): Promise<MemoryStats>;
  
  clear(): Promise<void>;
  
  export(): Promise<MemoryItem[]>;
  
  import(memories: MemoryItem[]): Promise<void>;
}

export interface MemoryStorage {
  initialize(): Promise<void>;
  
  save(memory: MemoryItem): Promise<void>;
  
  get(id: string): Promise<MemoryItem | null>;
  
  update(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem | null>;
  
  delete(id: string): Promise<boolean>;
  
  query(options: MemorySearchOptions): Promise<MemorySearchResult>;
  
  clear(): Promise<void>;
  
  count(): Promise<number>;
}

export interface MemoryEmbeddingService {
  generateEmbedding(text: string): Promise<number[]>;
  
  similarity(embedding1: number[], embedding2: number[]): number;
  
  findSimilar(
    embedding: number[], 
    memories: MemoryItem[], 
    threshold?: number
  ): Array<{ memory: MemoryItem; score: number }>;
}

export interface MemoryConfig {
  enabled: boolean;
  maxShortTermMemories: number;
  maxLongTermMemories: number;
  consolidationInterval: number;
  minConfidenceThreshold: number;
  embeddingModel: string;
  encryptionEnabled: boolean;
  debugMode: boolean;
}

export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  enabled: true,
  maxShortTermMemories: 100,
  maxLongTermMemories: 1000,
  consolidationInterval: 24 * 60 * 60 * 1000,
  minConfidenceThreshold: 0.5,
  embeddingModel: 'Xenova/multilingual-e5-small',
  encryptionEnabled: true,
  debugMode: false,
};
