/// asr_sdk — On-device speech-to-text SDK for Flutter.
///
/// This package provides a stable engine abstraction over on-device ASR
/// backends (sherpa-onnx by default). It is intentionally free of business
/// logic: consumers (e.g. mnemosyne domain layer) inject an [AsrEngine]
/// implementation and consume transcripts via the typed value objects
/// exported below.
///
/// Architecture role (per idea-turbo .trae/rules/architecture.md):
///   flutter_demo (Presentation)
///       ↓ depends on
///   asr_sdk (Flutter SDK wrapper)
///       ↓ depends on
///   sherpa_onnx (Infrastructure — native ASR engine)
///
/// asr_sdk MUST NOT depend on mnemosyne or flutter_demo.
library asr_sdk;

// Core
export 'package:asr_sdk/src/core/asr_exception.dart';
export 'package:asr_sdk/src/core/asr_constants.dart';

// Domain
export 'package:asr_sdk/src/domain/asr_language.dart';
export 'package:asr_sdk/src/domain/asr_model_config.dart';
export 'package:asr_sdk/src/domain/transcription_request.dart';
export 'package:asr_sdk/src/domain/transcription_result.dart';
export 'package:asr_sdk/src/domain/transcription_chunk.dart';
export 'package:asr_sdk/src/domain/asr_engine.dart';

// Infrastructure
export 'package:asr_sdk/src/infrastructure/asr_model_registry.dart';
export 'package:asr_sdk/src/infrastructure/asr_model_loader.dart';
export 'package:asr_sdk/src/infrastructure/asr_model_manager.dart';
export 'package:asr_sdk/src/infrastructure/fake_asr_engine.dart';
export 'package:asr_sdk/src/infrastructure/sherpa_onnx_asr_engine.dart';

// Streaming (audio source-agnostic; consumers feed PCM frames)
export 'package:asr_sdk/src/streaming/streaming_recognizer.dart';
export 'package:asr_sdk/src/streaming/streaming_asr_session.dart';
