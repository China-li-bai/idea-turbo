class MnemosyneException implements Exception {
  final String message;
  final Object? originalError;
  final StackTrace? stackTrace;

  MnemosyneException(this.message, [this.originalError, this.stackTrace]);

  @override
  String toString() => 'MnemosyneException: $message${originalError != null ? '\nCaused by: $originalError' : ''}';
}

class DatabaseException extends MnemosyneException {
  DatabaseException(super.message, [super.originalError, super.stackTrace]);
}

class MemoryNotFoundException extends MnemosyneException {
  final String? memoryId;

  MemoryNotFoundException(this.memoryId, [super.originalError, super.stackTrace])
      : super('Memory not found: $memoryId');
}

class EncodingException extends MnemosyneException {
  EncodingException(super.message, [super.originalError, super.stackTrace]);
}

class RetrievalException extends MnemosyneException {
  RetrievalException(super.message, [super.originalError, super.stackTrace]);
}
