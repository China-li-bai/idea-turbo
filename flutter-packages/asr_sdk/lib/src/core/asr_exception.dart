/// Exception hierarchy for asr_sdk.
///
/// Follows mnemosyne's convention (single base class + typed subclasses).
/// Errors are thrown as exceptions because they represent unexpected or
/// recoverable infrastructure failures; expected business outcomes (e.g.
/// "no speech detected") are expressed via the typed result objects.
import 'package:asr_sdk/src/domain/asr_language.dart';

class AsrException implements Exception {
  final String message;
  final Object? originalError;
  final StackTrace? stackTrace;

  AsrException(this.message, [this.originalError, this.stackTrace]);

  @override
  String toString() =>
      'AsrException: $message${originalError != null ? '\nCaused by: $originalError' : ''}';
}

/// Thrown when [AsrEngine] methods are called before [AsrEngine.initialize].
class AsrNotInitializedException extends AsrException {
  AsrNotInitializedException() : super('ASR engine not initialized');
}

/// Thrown when a model id cannot be resolved by [AsrModelRegistry], or when
/// the model files are missing on disk after a failed/incomplete download.
class AsrModelNotFoundException extends AsrException {
  final String modelId;
  AsrModelNotFoundException(this.modelId, [String? message])
      : super(message ?? 'ASR model not found: $modelId');
}

/// Thrown when [AsrEngine.initialize] fails (corrupt model, native error, etc).
class AsrInitializationException extends AsrException {
  AsrInitializationException(super.message, [super.originalError, super.stackTrace]);
}

/// Thrown when transcription fails (decode error, I/O error, etc).
class AsrTranscriptionException extends AsrException {
  AsrTranscriptionException(super.message, [super.originalError, super.stackTrace]);
}

/// Thrown when the requested [AsrLanguage] is not supported by the active model.
class AsrUnsupportedLanguageException extends AsrException {
  final AsrLanguage language;
  AsrUnsupportedLanguageException(this.language)
      : super('Language not supported by current model: $language');
}
