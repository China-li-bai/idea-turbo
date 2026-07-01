import 'dart:async';

import 'package:asr_sdk/src/core/asr_exception.dart';
import 'package:asr_sdk/src/domain/asr_engine.dart';
import 'package:asr_sdk/src/domain/asr_language.dart';
import 'package:asr_sdk/src/domain/asr_model_config.dart';
import 'package:asr_sdk/src/domain/transcription_chunk.dart';
import 'package:asr_sdk/src/domain/transcription_request.dart';
import 'package:asr_sdk/src/domain/transcription_result.dart';

/// In-memory [AsrEngine] implementation for tests and demos.
///
/// Scripts deterministic responses so consumers can develop UI and
/// business logic without a real ASR backend. NOT for production.
class FakeAsrEngine implements AsrEngine {
  @override
  bool get isInitialized => _initialized;
  bool _initialized = false;

  @override
  AsrModelConfig? get activeModel => _model;
  AsrModelConfig? _model;

  final List<String> _scriptedResponses = [];
  int _responseIndex = 0;

  /// Scripts the texts returned by subsequent [transcribeFile] calls.
  /// Calls cycle through the list. If empty, a default placeholder is used.
  void scriptResponses(List<String> responses) {
    _scriptedResponses
      ..clear()
      ..addAll(responses);
    _responseIndex = 0;
  }

  @override
  Future<void> initialize({required AsrModelConfig model}) async {
    _model = model;
    _initialized = true;
  }

  @override
  Future<TranscriptionResult> transcribeFile(
    TranscriptionRequest request,
  ) async {
    _ensureInitialized();
    _ensureLanguageSupported(request.language);
    final text = _nextScriptedText();
    return TranscriptionResult(
      text: text,
      segments: [
        TranscriptionSegment(
          text: text,
          start: Duration.zero,
          end: const Duration(seconds: 1),
          confidence: 0.99,
        ),
      ],
      processingTime: const Duration(milliseconds: 50),
      detectedLanguage: request.language ?? AsrLanguage.auto,
      confidence: 0.99,
    );
  }

  @override
  Stream<TranscriptionChunk> startStreamRecognition({
    AsrLanguage language = AsrLanguage.auto,
  }) async* {
    _ensureInitialized();
    _ensureLanguageSupported(language);
    // Emit a partial then a committed chunk to mimic real streaming.
    yield const TranscriptionChunk(
      partialText: 'hello',
      committedText: null,
      isEndpoint: false,
    );
    yield const TranscriptionChunk(
      partialText: 'hello world',
      committedText: 'hello world',
      isEndpoint: true,
    );
  }

  @override
  Future<void> dispose() async {
    _initialized = false;
    _model = null;
    _scriptedResponses.clear();
    _responseIndex = 0;
  }

  void _ensureInitialized() {
    if (!_initialized) throw AsrNotInitializedException();
  }

  void _ensureLanguageSupported(AsrLanguage? language) {
    final lang = language ?? AsrLanguage.auto;
    if (_model != null && !_model!.supportsLanguage(lang)) {
      throw AsrUnsupportedLanguageException(lang);
    }
  }

  String _nextScriptedText() {
    if (_scriptedResponses.isEmpty) return 'fake transcription';
    final text = _scriptedResponses[_responseIndex % _scriptedResponses.length];
    _responseIndex++;
    return text;
  }
}
