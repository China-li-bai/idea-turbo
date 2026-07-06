import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sherpa_onnx/sherpa_onnx.dart' as sherpa;

import 'package:asr_sdk/src/core/asr_exception.dart';
import 'package:asr_sdk/src/domain/asr_engine.dart';
import 'package:asr_sdk/src/domain/asr_language.dart';
import 'package:asr_sdk/src/domain/asr_model_config.dart';
import 'package:asr_sdk/src/domain/transcription_chunk.dart';
import 'package:asr_sdk/src/domain/transcription_request.dart';
import 'package:asr_sdk/src/domain/transcription_result.dart';
import 'package:asr_sdk/src/streaming/streaming_asr_session.dart';
import 'package:asr_sdk/src/streaming/streaming_recognizer.dart';

/// Sherpa-onnx-backed [AsrEngine] implementation.
///
/// Wraps either [sherpa.OfflineRecognizer] or [sherpa.OnlineRecognizer]
/// depending on [AsrModelConfig.mode]. One engine instance hosts one model;
/// switch by [dispose] + re-[initialize].
///
/// Lifecycle:
///   1. [initialize] loads the native lib (process-global, idempotent) and
///      constructs the recognizer. Idempotent for the same model id.
///   2. [transcribeFile] for batch, [startStreamRecognition] for realtime.
///   3. [dispose] releases native resources.
///
/// The native sherpa-onnx C library and the llamadart (llama.cpp) library
/// have disjoint native dependencies, so they coexist in one process.
/// Inference threads default to 1 to minimize contention with llamadart
/// running on the same isolate; raise [numThreads] for desktop-only builds.
class SherpaOnnxAsrEngine implements AsrEngine {
  SherpaOnnxAsrEngine({this.numThreads = 1});

  /// Inference threads passed to sherpa-onnx.
  final int numThreads;

  bool _initialized = false;
  AsrModelConfig? _model;

  sherpa.OfflineRecognizer? _offlineRecognizer;
  sherpa.OnlineRecognizer? _onlineRecognizer;

  /// Process-global: sherpa.initBindings() is idempotent.
  static bool _bindingsInitialized = false;

  @override
  bool get isInitialized => _initialized;

  @override
  AsrModelConfig? get activeModel => _model;

  @override
  Future<void> initialize({required AsrModelConfig model}) async {
    if (_initialized) {
      if (_model?.id == model.id) return;
      throw AsrInitializationException(
        'Cannot switch model without dispose. '
        'Active: ${_model?.id}, requested: ${model.id}',
      );
    }

    if (!_bindingsInitialized) {
      sherpa.initBindings();
      _bindingsInitialized = true;
    }

    final modelDir = await _resolveModelDirectory(model);
    await _verifyModelFiles(model, modelDir);

    try {
      switch (model.mode) {
        case AsrModelMode.offline:
          _offlineRecognizer = _buildOfflineRecognizer(model, modelDir);
          break;
        case AsrModelMode.streaming:
          _onlineRecognizer = _buildOnlineRecognizer(model, modelDir);
          break;
      }
    } catch (e, st) {
      throw AsrInitializationException(
        'Failed to initialize sherpa-onnx for model ${model.id}',
        e,
        st,
      );
    }

    _model = model;
    _initialized = true;
  }

  @override
  Future<TranscriptionResult> transcribeFile(
    TranscriptionRequest request,
  ) async {
    _ensureInitialized();
    _ensureLanguageSupported(request.language);

    final file = File(request.audioFilePath);
    if (!await file.exists()) {
      throw AsrTranscriptionException(
        'Audio file not found: ${request.audioFilePath}',
      );
    }
    if (await file.length() == 0) {
      throw AsrTranscriptionException(
        'Audio file is empty: ${request.audioFilePath}',
      );
    }

    final recognizer = _offlineRecognizer;
    if (recognizer == null) {
      throw AsrTranscriptionException(
        'transcribeFile requires an offline model. '
        'Active model ${_model!.id} is streaming-only.',
      );
    }

    final stopwatch = Stopwatch()..start();
    final wave = sherpa.readWave(request.audioFilePath);
    if (wave.samples.isEmpty) {
      throw AsrTranscriptionException(
        'Failed to decode audio (empty samples): ${request.audioFilePath}',
      );
    }

    final stream = recognizer.createStream();
    try {
      stream.acceptWaveform(samples: wave.samples, sampleRate: wave.sampleRate);
      recognizer.decode(stream);
      final result = recognizer.getResult(stream);
      stopwatch.stop();

      final text = result.text.trim();
      return TranscriptionResult(
        text: text,
        segments: [
          TranscriptionSegment(
            text: text,
            start: Duration.zero,
            end: Duration(
              milliseconds:
                  (wave.samples.length / wave.sampleRate * 1000).round(),
            ),
          ),
        ],
        processingTime: stopwatch.elapsed,
        detectedLanguage:
            _resolveDetectedLanguage(result.lang, request.language),
      );
    } finally {
      stream.free();
    }
  }

  @override
  Stream<TranscriptionChunk> startStreamRecognition({
    AsrLanguage language = AsrLanguage.auto,
  }) async* {
    // Adapter that exposes a StreamingAsrSession as a plain
    // Stream<TranscriptionChunk>. The session is owned by the stream: when
    // the subscription is cancelled or the stream closes (session.stop),
    // the native resources are released.
    //
    // Consumers that need finer control (e.g. explicitly calling stop after
    // the user taps a stop button) should call [createStreamingSession]
    // instead and own the session lifecycle themselves.
    final session = createStreamingSession(language: language);
    session.start();
    try {
      yield* session.chunks;
    } finally {
      await session.dispose();
    }
  }

  /// Creates a [StreamingAsrSession] bound to this engine's active
  /// streaming recognizer.
  ///
  /// The caller owns the session lifecycle: call [StreamingAsrSession.start],
  /// feed audio frames, observe [StreamingAsrSession.chunks], and call
  /// [StreamingAsrSession.stop] + [StreamingAsrSession.dispose] when done.
  ///
  /// Throws [AsrTranscriptionException] if the engine is not initialized
  /// with a streaming model.
  StreamingAsrSession createStreamingSession({
    AsrLanguage language = AsrLanguage.auto,
  }) {
    _ensureInitialized();
    _ensureLanguageSupported(language);

    final recognizer = _onlineRecognizer;
    if (recognizer == null) {
      throw AsrTranscriptionException(
        'createStreamingSession requires a streaming model. '
        'Active model ${_model!.id} is offline-only.',
      );
    }
    final adapter = _SherpaStreamingRecognizerAdapter(
      recognizer: recognizer,
      languageCode: language == AsrLanguage.auto ? null : language.code,
    );
    return StreamingAsrSession(recognizer: adapter);
  }

  @override
  Future<void> dispose() async {
    _offlineRecognizer?.free();
    _offlineRecognizer = null;
    _onlineRecognizer?.free();
    _onlineRecognizer = null;
    _initialized = false;
    _model = null;
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  void _ensureInitialized() {
    if (!_initialized) throw AsrNotInitializedException();
  }

  void _ensureLanguageSupported(AsrLanguage? language) {
    final lang = language ?? AsrLanguage.auto;
    if (_model != null && !_model!.supportsLanguage(lang)) {
      throw AsrUnsupportedLanguageException(lang);
    }
  }

  /// Resolves the local directory containing the model files for [model].
  ///
  /// Override via the `ASR_MODEL_DIR` environment variable for desktop
  /// testing; otherwise defaults to
  /// `<app documents>/asr_models/<model.id>/`.
  Future<String> _resolveModelDirectory(AsrModelConfig model) async {
    final env = Platform.environment['ASR_MODEL_DIR'];
    if (env != null && env.isNotEmpty) {
      return p.join(env, model.id);
    }
    final dir = await getApplicationDocumentsDirectory();
    return p.join(dir.path, 'asr_models', model.id);
  }

  Future<void> _verifyModelFiles(
    AsrModelConfig model,
    String modelDir,
  ) async {
    final modelFile = p.join(modelDir, model.modelPath);
    final tokensFile = p.join(modelDir, model.tokensPath);
    if (!await File(modelFile).exists()) {
      throw AsrModelNotFoundException(
        model.id,
        'model file missing at $modelFile. '
        'Run AsrModelLoader.download(model) first.',
      );
    }
    if (!await File(tokensFile).exists()) {
      throw AsrModelNotFoundException(
        model.id,
        'tokens file missing at $tokensFile',
      );
    }
  }

  sherpa.OfflineRecognizer _buildOfflineRecognizer(
    AsrModelConfig model,
    String modelDir,
  ) {
    final tokens = p.join(modelDir, model.tokensPath);
    final offlineModel = sherpa.OfflineModelConfig(
      tokens: tokens,
      numThreads: numThreads,
      provider: 'cpu',
      debug: false,
      modelType: _offlineModelType(model.type),
      senseVoice: model.type == AsrModelType.senseVoice
          ? sherpa.OfflineSenseVoiceModelConfig(
              model: p.join(modelDir, model.modelPath),
              language: 'auto',
              useInverseTextNormalization: true,
            )
          : const sherpa.OfflineSenseVoiceModelConfig(),
      whisper: model.type == AsrModelType.whisper
          ? sherpa.OfflineWhisperModelConfig(
              encoder: model.encoderPath != null
                  ? p.join(modelDir, model.encoderPath!)
                  : '',
              decoder: model.decoderPath != null
                  ? p.join(modelDir, model.decoderPath!)
                  : '',
              language: 'auto',
              task: 'transcribe',
            )
          : const sherpa.OfflineWhisperModelConfig(),
      moonshine: model.type == AsrModelType.moonshine
          ? sherpa.OfflineMoonshineModelConfig(
              encoder: model.encoderPath != null
                  ? p.join(modelDir, model.encoderPath!)
                  : '',
              mergedDecoder: model.decoderPath != null
                  ? p.join(modelDir, model.decoderPath!)
                  : '',
            )
          : const sherpa.OfflineMoonshineModelConfig(),
      paraformer: model.type == AsrModelType.paraformer
          ? sherpa.OfflineParaformerModelConfig(
              model: p.join(modelDir, model.modelPath),
            )
          : const sherpa.OfflineParaformerModelConfig(),
    );

    return sherpa.OfflineRecognizer(
      sherpa.OfflineRecognizerConfig(model: offlineModel),
    );
  }

  sherpa.OnlineRecognizer _buildOnlineRecognizer(
    AsrModelConfig model,
    String modelDir,
  ) {
    final tokens = p.join(modelDir, model.tokensPath);
    final onlineModel = sherpa.OnlineModelConfig(
      tokens: tokens,
      numThreads: numThreads,
      provider: 'cpu',
      debug: false,
      modelType: _onlineModelType(model.type),
      transducer: model.type == AsrModelType.zipformer
          ? sherpa.OnlineTransducerModelConfig(
              encoder: model.encoderPath != null
                  ? p.join(modelDir, model.encoderPath!)
                  : '',
              decoder: model.decoderPath != null
                  ? p.join(modelDir, model.decoderPath!)
                  : '',
              joiner: model.joinerPath != null
                  ? p.join(modelDir, model.joinerPath!)
                  : '',
            )
          : const sherpa.OnlineTransducerModelConfig(),
    );

    return sherpa.OnlineRecognizer(
      sherpa.OnlineRecognizerConfig(
        model: onlineModel,
        decodingMethod: 'greedy_search',
        enableEndpoint: true,
        rule1MinTrailingSilence: 2.4,
        rule2MinTrailingSilence: 1.2,
        rule3MinUtteranceLength: 20,
      ),
    );
  }

  String _offlineModelType(AsrModelType type) {
    switch (type) {
      case AsrModelType.senseVoice:
        return 'sense_voice';
      case AsrModelType.whisper:
        return 'whisper';
      case AsrModelType.moonshine:
        return 'moonshine';
      case AsrModelType.paraformer:
        return 'paraformer';
      case AsrModelType.zipformer:
        return 'zipformer';
    }
  }

  String _onlineModelType(AsrModelType type) {
    switch (type) {
      case AsrModelType.zipformer:
        return 'zipformer';
      case AsrModelType.moonshine:
        return 'moonshine';
      case AsrModelType.senseVoice:
      case AsrModelType.whisper:
      case AsrModelType.paraformer:
        return '';
    }
  }

  AsrLanguage _resolveDetectedLanguage(
    String sherpaLang,
    AsrLanguage? requested,
  ) {
    if (requested != null && requested != AsrLanguage.auto) return requested;
    final byCode = AsrLanguage.values.where((l) => l.code == sherpaLang);
    return byCode.isEmpty ? AsrLanguage.auto : byCode.first;
  }
}

/// Adapts [sherpa.OnlineRecognizer] to the backend-agnostic
/// [StreamingRecognizer] interface used by [StreamingAsrSession].
class _SherpaStreamingRecognizerAdapter implements StreamingRecognizer {
  _SherpaStreamingRecognizerAdapter({
    required sherpa.OnlineRecognizer recognizer,
    required String? languageCode,
  })  : _recognizer = recognizer,
        _languageCode = languageCode;

  final sherpa.OnlineRecognizer _recognizer;
  final String? _languageCode;

  @override
  StreamingRecognizerStream createStream() {
    final stream = _recognizer.createStream();
    // Hint the language for multilingual models that support setOption
    // (e.g. Nemotron). Sherpa-onnx silently ignores unknown keys on
    // other models, so this is safe to always set.
    final code = _languageCode;
    if (code != null && code.isNotEmpty) {
      stream.setOption(key: 'language', value: code);
    }
    return _SherpaStreamingStreamAdapter(
      recognizer: _recognizer,
      stream: stream,
    );
  }
}

class _SherpaStreamingStreamAdapter implements StreamingRecognizerStream {
  _SherpaStreamingStreamAdapter({
    required sherpa.OnlineRecognizer recognizer,
    required sherpa.OnlineStream stream,
  })  : _recognizer = recognizer,
        _stream = stream;

  final sherpa.OnlineRecognizer _recognizer;
  final sherpa.OnlineStream _stream;

  @override
  void acceptWaveform({required Float32List samples, required int sampleRate}) {
    _stream.acceptWaveform(samples: samples, sampleRate: sampleRate);
  }

  @override
  void decode() => _recognizer.decode(_stream);

  @override
  String get partialText => _recognizer.getResult(_stream).text;

  @override
  bool isEndpoint() => _recognizer.isEndpoint(_stream);

  @override
  void reset() => _recognizer.reset(_stream);

  @override
  void inputFinished() => _stream.inputFinished();

  @override
  void free() => _stream.free();
}
