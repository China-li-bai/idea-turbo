export { dataStoreAdapter } from './dataStoreAdapter';
export { unifiedDataService } from './unifiedDataService';

export { eventService } from './eventService';
export { taskService } from './taskService';
export { inspirationService } from './inspirationService';
export { vectorService } from './vectorService';
export { oramaSearchService } from './oramaSearchService';
export { vectorEnhancedService } from './vectorEnhancedService';
export { shiftService } from './shiftService';
export { smartRecommendationService } from './smartRecommendationService';
export { smartReminderService } from './smartReminderService';
export { conflictResolutionService } from './conflictResolutionService';

export type { EventService } from './eventService';
export type { TaskService } from './taskService';
export type { InspirationService } from './inspirationService';
export type { TimeSlot, RecommendationResult, UserPreferences } from './smartRecommendationService';
export type { ReminderConfig, SmartReminderResult, EventImportance } from './smartReminderService';
export type { ConflictInfo, ResolutionOption, ConflictResolution } from './conflictResolutionService';
export type { SimilarItem, SmartTag, DuplicateCheckResult, ContextualLink } from './vectorEnhancedService';
