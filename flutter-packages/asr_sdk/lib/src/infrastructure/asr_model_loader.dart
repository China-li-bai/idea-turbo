import 'dart:async';
import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import 'package:asr_sdk/src/core/asr_exception.dart';
import 'package:asr_sdk/src/domain/asr_model_config.dart';

/// Downloads, verifies, and extracts ASR model archives.
///
/// Phase 1 PoC scope:
///   - HTTP download via `dart:io` HttpClient (no extra deps).
///   - SHA-256 verification when [AsrModelConfig.sha256] is set.
///   - Archive extraction via the platform `tar` command (available on
///     macOS/Linux/Android; Windows requires WSL or a future native port).
///     For Phase 2 we will bundle a Dart tar/bzip2 decoder to remove this
///     external dependency.
///
/// Idempotency:
///   - If the target model directory already contains the expected model file,
///     [download] is a no-op. Use [forceRedownload] to override.
///   - Partial downloads are written to a `.part` temp file and renamed
///     atomically on success.
class AsrModelLoader {
  AsrModelLoader({HttpClient? httpClient}) : _httpClient = httpClient;

  final HttpClient? _httpClient;

  /// Returns the directory that should contain the extracted model files.
  ///
  /// Override via the `ASR_MODEL_DIR` environment variable for desktop
  /// testing; otherwise defaults to
  /// `<app documents>/asr_models/<model.id>/`.
  Future<String> modelDirectoryFor(AsrModelConfig model) async {
    final env = Platform.environment['ASR_MODEL_DIR'];
    if (env != null && env.isNotEmpty) {
      return p.join(env, model.id);
    }
    final dir = await getApplicationDocumentsDirectory();
    return p.join(dir.path, 'asr_models', model.id);
  }

  /// Returns true if the model files appear to be present on disk.
  Future<bool> isPresent(AsrModelConfig model) async {
    final dir = await modelDirectoryFor(model);
    final modelFile = File(p.join(dir, model.modelPath));
    final tokensFile = File(p.join(dir, model.tokensPath));
    return await modelFile.exists() && await tokensFile.exists();
  }

  /// Downloads and extracts [model] if not already present.
  ///
  /// Set [forceRedownload] to true to delete the existing directory and
  /// re-download. Set [onProgress] to receive download progress updates
  /// (receivedBytes, totalBytes).
  ///
  /// Throws [AsrModelDownloadException] on network/IO/verification failure.
  Future<void> download(
    AsrModelConfig model, {
    bool forceRedownload = false,
    void Function(int received, int? total)? onProgress,
  }) async {
    final dir = await modelDirectoryFor(model);
    if (await isPresent(model) && !forceRedownload) {
      return; // already downloaded
    }

    final dirHandle = Directory(dir);
    if (forceRedownload && await dirHandle.exists()) {
      await dirHandle.delete(recursive: true);
    }
    await dirHandle.create(recursive: true);

    final archivePath = p.join(dir, _archiveFileName(model.downloadUrl));
    try {
      await _downloadFile(
        model.downloadUrl,
        archivePath,
        onProgress: onProgress,
      );
      if (model.sha256 != null && model.sha256!.isNotEmpty) {
        await _verifySha256(archivePath, model.sha256!);
      }
      await _extractArchive(archivePath, dir);
    } catch (e, st) {
      // Clean up partial state so the next call can retry cleanly.
      await dirHandle.delete(recursive: true);
      throw AsrModelDownloadException(
        model.id,
        'Failed to download/extract model ${model.id}',
        e,
        st,
      );
    } finally {
      final archive = File(archivePath);
      if (await archive.exists()) {
        await archive.delete();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  String _archiveFileName(String url) {
    final uri = Uri.parse(url);
    return uri.pathSegments.isNotEmpty ? uri.pathSegments.last : 'model.archive';
  }

  Future<void> _downloadFile(
    String url,
    String destPath, {
    void Function(int received, int? total)? onProgress,
  }) async {
    final client = _httpClient ?? HttpClient();
    final file = await File('$destPath.part').create(recursive: true);
    final sink = file.openWrite();

    try {
      final request = await client.getUrl(Uri.parse(url));
      final response = await request.close();
      if (response.statusCode != 200) {
        throw AsrModelDownloadException(
          '',
          'HTTP ${response.statusCode} downloading $url',
        );
      }

      final total = response.contentLength > 0 ? response.contentLength : null;
      var received = 0;
      await for (final chunk in response) {
        sink.add(chunk);
        received += chunk.length;
        onProgress?.call(received, total);
      }
      await sink.flush();
    } finally {
      await sink.close();
      if (_httpClient == null) client.close();
    }

    await file.rename(destPath);
  }

  Future<void> _verifySha256(String filePath, String expected) async {
    final file = File(filePath);
    final digest = await sha256.bind(file.openRead()).first;
    final actual = digest.toString();
    if (actual.toLowerCase() != expected.toLowerCase()) {
      throw AsrModelDownloadException(
        '',
        'SHA-256 mismatch: expected=$expected actual=$actual',
      );
    }
  }

  /// Extracts the archive at [archivePath] into [destDir].
  ///
  /// Supports `.tar.bz2` (sherpa-onnx default) and `.zip`. Uses the platform
  /// `tar` command for tar.bz2 and `unzip` for zip. Both are available on
  /// macOS/Linux/Android; Windows requires WSL or bundled binaries (Phase 2).
  Future<void> _extractArchive(String archivePath, String destDir) async {
    final name = p.basename(archivePath).toLowerCase();
    if (name.endsWith('.tar.bz2') || name.endsWith('.tbz2')) {
      await _runProcess('tar', ['-xjf', archivePath, '-C', destDir]);
    } else if (name.endsWith('.tar.gz') || name.endsWith('.tgz')) {
      await _runProcess('tar', ['-xzf', archivePath, '-C', destDir]);
    } else if (name.endsWith('.zip')) {
      await _runProcess('unzip', ['-o', archivePath, '-d', destDir]);
    } else {
      throw AsrModelDownloadException(
        '',
        'Unsupported archive format: $archivePath '
        '(supported: .tar.bz2, .tar.gz, .zip)',
      );
    }

    // Many sherpa-onnx archives extract to a single top-level folder
    // (e.g. sherpa-onnx-sense-voice-...-int8/). Promote its contents up
    // so the engine can address files directly relative to model dir.
    await _flattenSingleTopLevelFolder(destDir);
  }

  Future<void> _flattenSingleTopLevelFolder(String destDir) async {
    final entries = Directory(destDir).listSync(followLinks: false);
    if (entries.length != 1) return;
    final only = entries.first;
    if (only is! Directory) return;

    // Move every entry inside `only` up into `destDir`.
    for (final entry in only.listSync(followLinks: false)) {
      final newName = p.join(destDir, p.basename(entry.path));
      await entry.rename(newName);
    }
    await only.delete();
  }

  Future<void> _runProcess(String executable, List<String> args) async {
    final result = await Process.run(executable, args);
    if (result.exitCode != 0) {
      throw AsrModelDownloadException(
        '',
        '$executable ${args.join(' ')} failed with exit ${result.exitCode}: '
        '${result.stderr}',
      );
    }
  }
}

/// Thrown when model download or extraction fails.
class AsrModelDownloadException extends AsrException {
  final String modelId;
  AsrModelDownloadException(
    this.modelId,
    String message, [
    Object? originalError,
    StackTrace? stackTrace,
  ]) : super(message, originalError, stackTrace);
}

// crypto's sha256 returns Digest; bind it via the stream API to avoid pulling
// in extra imports. This file is the only consumer in asr_sdk.
// ignore_for_file: implementation_imports
