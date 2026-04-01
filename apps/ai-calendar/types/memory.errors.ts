export type MemoryErrorCode =
  | 'MEMORY_NOT_FOUND'
  | 'MEMORY_ALREADY_EXISTS'
  | 'MEMORY_VALIDATION_ERROR'
  | 'MEMORY_STORAGE_ERROR'
  | 'MEMORY_EMBEDDING_ERROR'
  | 'MEMORY_CONSOLIDATION_ERROR'
  | 'MEMORY_ENCRYPTION_ERROR'
  | 'MEMORY_DECRYPTION_ERROR'
  | 'MEMORY_SIZE_EXCEEDED'
  | 'MEMORY_COUNT_EXCEEDED'
  | 'MEMORY_EXPIRED'
  | 'MEMORY_ACCESS_DENIED'
  | 'MEMORY_INITIALIZATION_ERROR'
  | 'MEMORY_EXPORT_ERROR'
  | 'MEMORY_IMPORT_ERROR';

export class MemoryError extends Error {
  constructor(
    public code: MemoryErrorCode,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MemoryError';
  }
}

export class MemoryNotFoundError extends MemoryError {
  constructor(memoryId: string) {
    super(
      'MEMORY_NOT_FOUND',
      `Memory with ID ${memoryId} not found`,
      { memoryId }
    );
  }
}

export class MemoryValidationError extends MemoryError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('MEMORY_VALIDATION_ERROR', message, details);
  }
}

export class MemoryStorageError extends MemoryError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('MEMORY_STORAGE_ERROR', message, details);
  }
}

export class MemoryEmbeddingError extends MemoryError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('MEMORY_EMBEDDING_ERROR', message, details);
  }
}

export class MemorySizeExceededError extends MemoryError {
  constructor(currentSize: number, maxSize: number) {
    super(
      'MEMORY_SIZE_EXCEEDED',
      `Memory size ${currentSize} exceeds maximum allowed size ${maxSize}`,
      { currentSize, maxSize }
    );
  }
}

export class MemoryCountExceededError extends MemoryError {
  constructor(currentCount: number, maxCount: number, memoryType: string) {
    super(
      'MEMORY_COUNT_EXCEEDED',
      `${memoryType} memory count ${currentCount} exceeds maximum allowed count ${maxCount}`,
      { currentCount, maxCount, memoryType }
    );
  }
}

export class MemoryExpiredError extends MemoryError {
  constructor(memoryId: string, expiredAt: number) {
    super(
      'MEMORY_EXPIRED',
      `Memory ${memoryId} expired at ${new Date(expiredAt).toISOString()}`,
      { memoryId, expiredAt }
    );
  }
}

export class MemoryAccessDeniedError extends MemoryError {
  constructor(memoryId: string, reason: string) {
    super(
      'MEMORY_ACCESS_DENIED',
      `Access denied to memory ${memoryId}: ${reason}`,
      { memoryId, reason }
    );
  }
}

export type Result<T, E = Error> = 
  | { success: true; value: T }
  | { success: false; error: E };

export function Ok<T>(value: T): Result<T> {
  return { success: true, value };
}

export function Err<E>(error: E): Result<never, E> {
  return { success: false, error };
}

export function tryAsync<T>(
  promise: Promise<T>
): Promise<Result<T, Error>> {
  return promise
    .then(value => ({ success: true as const, value }))
    .catch((error: Error) => ({ success: false as const, error }));
}
