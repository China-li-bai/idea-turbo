export const MEMORY_CONSTANTS = {
  MAX_CONTENT_LENGTH: 10000,
  MAX_EMBEDDING_DIMENSION: 1536,
  MAX_TAGS_COUNT: 20,
  MAX_TAG_LENGTH: 50,
  MAX_RELATED_ITEMS_COUNT: 100,
  MAX_ENTITIES_COUNT: 50,
  MAX_EXAMPLES_COUNT: 20,
  MAX_TOP_RESULTS_COUNT: 100,
  
  MAX_SHORT_TERM_MEMORIES: 100,
  MAX_LONG_TERM_MEMORIES: 1000,
  MAX_WORKING_MEMORIES: 50,
  
  DEFAULT_CONFIDENCE_THRESHOLD: 0.5,
  MIN_CONFIDENCE_THRESHOLD: 0.0,
  MAX_CONFIDENCE_THRESHOLD: 1.0,
  
  DEFAULT_SEARCH_LIMIT: 50,
  MAX_SEARCH_LIMIT: 1000,
  MIN_SEARCH_LIMIT: 1,
  
  DEFAULT_CONSOLIDATION_INTERVAL: 24 * 60 * 60 * 1000,
  MIN_CONSOLIDATION_INTERVAL: 60 * 60 * 1000,
  MAX_CONSOLIDATION_INTERVAL: 7 * 24 * 60 * 60 * 1000,
  
  SHORT_TERM_MEMORY_TTL: 7 * 24 * 60 * 60 * 1000,
  LONG_TERM_MEMORY_TTL: 365 * 24 * 60 * 60 * 1000,
  WORKING_MEMORY_TTL: 24 * 60 * 60 * 1000,
  
  MIN_IMPORTANCE: 'low' as const,
  MAX_IMPORTANCE: 'high' as const,
  
  DEFAULT_EMBEDDING_MODEL: 'Xenova/multilingual-e5-small',
  
  STORAGE_KEY_PREFIX: 'ai-calendar-memory-',
  STORAGE_VERSION: 1,
  
  DEBUG_LOG_PREFIX: '[MemorySystem]',
} as const;

export const MEMORY_LIMITS = {
  validateContentLength(content: string): boolean {
    return content.length > 0 && content.length <= MEMORY_CONSTANTS.MAX_CONTENT_LENGTH;
  },
  
  validateEmbeddingDimension(embedding: number[]): boolean {
    return embedding.length > 0 && embedding.length <= MEMORY_CONSTANTS.MAX_EMBEDDING_DIMENSION;
  },
  
  validateTagsCount(tags: string[]): boolean {
    return tags.length <= MEMORY_CONSTANTS.MAX_TAGS_COUNT;
  },
  
  validateTagLength(tag: string): boolean {
    return tag.length > 0 && tag.length <= MEMORY_CONSTANTS.MAX_TAG_LENGTH;
  },
  
  validateConfidence(confidence: number): boolean {
    return confidence >= MEMORY_CONSTANTS.MIN_CONFIDENCE_THRESHOLD &&
           confidence <= MEMORY_CONSTANTS.MAX_CONFIDENCE_THRESHOLD;
  },
  
  validateSearchLimit(limit: number): boolean {
    return limit >= MEMORY_CONSTANTS.MIN_SEARCH_LIMIT &&
           limit <= MEMORY_CONSTANTS.MAX_SEARCH_LIMIT;
  },
  
  validateMemoryCount(count: number, type: 'short-term' | 'long-term' | 'working'): boolean {
    const maxCount = type === 'short-term' 
      ? MEMORY_CONSTANTS.MAX_SHORT_TERM_MEMORIES
      : type === 'long-term'
      ? MEMORY_CONSTANTS.MAX_LONG_TERM_MEMORIES
      : MEMORY_CONSTANTS.MAX_WORKING_MEMORIES;
    
    return count >= 0 && count <= maxCount;
  },
} as const;
