import { z } from 'zod';

export const MemoryTypeSchema = z.enum(['short-term', 'long-term', 'working']);

export const MemoryCategorySchema = z.enum([
  'query',
  'result',
  'feedback',
  'preference',
  'pattern',
  'context',
]);

export const MemoryMetadataSchema = z.object({
  timestamp: z.number().positive(),
  sessionId: z.string().uuid().optional(),
  source: z.enum(['user', 'system', 'consolidated']),
  confidence: z.number().min(0).max(1),
  accessCount: z.number().int().nonnegative(),
  lastAccessedAt: z.number().positive(),
  
  tags: z.array(z.string().max(50)).max(20).optional(),
  relatedItemIds: z.array(z.string().uuid()).max(100).optional(),
  importance: z.enum(['low', 'medium', 'high']),
  
  expiresAt: z.number().positive().optional(),
  consolidatedFrom: z.array(z.string().uuid()).max(50).optional(),
});

export const MemoryItemSchema = z.object({
  id: z.string().uuid(),
  type: MemoryTypeSchema,
  category: MemoryCategorySchema,
  
  content: z.string().min(1).max(10000),
  embedding: z.array(z.number()).max(1536).optional(),
  
  metadata: MemoryMetadataSchema,
});

export const QueryMemorySchema = MemoryItemSchema.extend({
  category: z.literal('query'),
  metadata: MemoryMetadataSchema.extend({
    queryType: z.enum(['search', 'create', 'update', 'delete', 'analyze']),
    intent: z.string().max(500).optional(),
    entities: z.array(z.object({
      type: z.string().max(50),
      value: z.string().max(500),
      confidence: z.number().min(0).max(1),
    })).max(50).optional(),
  }),
});

export const ResultMemorySchema = MemoryItemSchema.extend({
  category: z.literal('result'),
  metadata: MemoryMetadataSchema.extend({
    queryId: z.string().uuid(),
    resultCount: z.number().int().nonnegative(),
    topResults: z.array(z.object({
      itemId: z.string().uuid(),
      score: z.number().min(0).max(1),
    })).max(100),
    userAction: z.enum(['clicked', 'ignored', 'modified', 'saved']).optional(),
  }),
});

export const FeedbackMemorySchema = MemoryItemSchema.extend({
  category: z.literal('feedback'),
  metadata: MemoryMetadataSchema.extend({
    targetMemoryId: z.string().uuid(),
    feedbackType: z.enum(['positive', 'negative', 'neutral']),
    feedbackDetail: z.string().max(5000).optional(),
    rating: z.number().int().min(1).max(5).optional(),
  }),
});

export const PreferenceMemorySchema = MemoryItemSchema.extend({
  category: z.literal('preference'),
  metadata: MemoryMetadataSchema.extend({
    preferenceType: z.enum(['time', 'location', 'category', 'priority', 'style']),
    preferenceValue: z.unknown(),
    strength: z.number().min(0).max(1),
    context: z.string().max(500).optional(),
  }),
});

export const PatternMemorySchema = MemoryItemSchema.extend({
  category: z.literal('pattern'),
  metadata: MemoryMetadataSchema.extend({
    patternType: z.enum(['temporal', 'behavioral', 'contextual']),
    pattern: z.string().max(5000),
    frequency: z.number().int().nonnegative(),
    lastOccurrence: z.number().positive(),
    examples: z.array(z.string().max(500)).max(20),
  }),
});

export const ContextMemorySchema = MemoryItemSchema.extend({
  category: z.literal('context'),
  metadata: MemoryMetadataSchema.extend({
    contextType: z.enum(['session', 'task', 'goal']),
    relatedItems: z.array(z.unknown()).max(100),
    activeDuration: z.number().nonnegative(),
  }),
});

export const SpecificMemorySchema = z.discriminatedUnion('category', [
  QueryMemorySchema,
  ResultMemorySchema,
  FeedbackMemorySchema,
  PreferenceMemorySchema,
  PatternMemorySchema,
  ContextMemorySchema,
]);

export const MemorySearchOptionsSchema = z.object({
  query: z.string().max(5000).optional(),
  types: z.array(MemoryTypeSchema).max(3).optional(),
  categories: z.array(MemoryCategorySchema).max(6).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  timeRange: z.object({
    start: z.number().positive(),
    end: z.number().positive(),
  }).refine(data => data.start < data.end, {
    message: "Start time must be before end time",
  }).optional(),
  limit: z.number().int().min(1).max(5000).optional(),
  minConfidence: z.number().min(0).max(1).optional(),
  includeEmbeddings: z.boolean().optional(),
});

export const MemoryConsolidationOptionsSchema = z.object({
  maxAge: z.number().positive().optional(),
  minAccessCount: z.number().int().nonnegative().optional(),
  minConfidence: z.number().min(0).max(1).optional(),
  preserveCategories: z.array(MemoryCategorySchema).max(6).optional(),
});

export const MemoryConfigSchema = z.object({
  enabled: z.boolean(),
  maxShortTermMemories: z.number().int().min(10).max(10000),
  maxLongTermMemories: z.number().int().min(100).max(100000),
  consolidationInterval: z.number().positive(),
  minConfidenceThreshold: z.number().min(0).max(1),
  embeddingModel: z.string().min(1).max(200),
  encryptionEnabled: z.boolean(),
  debugMode: z.boolean(),
});

export function validateMemoryItem(data: unknown) {
  return MemoryItemSchema.safeParse(data);
}

export function validateSpecificMemory(data: unknown) {
  return SpecificMemorySchema.safeParse(data);
}

export function validateSearchOptions(data: unknown) {
  return MemorySearchOptionsSchema.safeParse(data);
}

export function validateConfig(data: unknown) {
  return MemoryConfigSchema.safeParse(data);
}
