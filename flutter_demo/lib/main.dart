import 'dart:io';

import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'core/product/product_copy.dart';
import 'data/models/model_config.dart';
import 'data/services/asr_model_bootstrap.dart';
import 'pet/pet_app_shell.dart';
import 'ui/design/memory_design.dart';
import 'ui/pages/model_download_page.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: ProductCopy.productTitle,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: MemoryPalette.gold,
          brightness: Brightness.dark,
        ),
        scaffoldBackgroundColor: MemoryPalette.ink,
        fontFamily: 'sans',
        useMaterial3: true,
      ),
      home: const _AppEntry(),
    );
  }
}

class _AppEntry extends StatefulWidget {
  const _AppEntry();

  @override
  State<_AppEntry> createState() => _AppEntryState();
}

class _AppEntryState extends State<_AppEntry> {
  bool _isChecking = true;
  String? _existingModelPath;

  @override
  void initState() {
    super.initState();
    _checkState();
  }

  Future<void> _checkState() async {
    final prefs = await SharedPreferences.getInstance();

    String? modelPath;
    final dir = await getApplicationDocumentsDirectory();

    final selectedModel = findModelByFilename(
      prefs.getString(selectedModelFilenamePrefsKey),
    );
    final selectedFile = selectedModel == null
        ? null
        : File('${dir.path}/${selectedModel.filename}');
    if (selectedFile != null && await selectedFile.exists()) {
      modelPath = selectedFile.path;
    } else {
      final defaultFile = File('${dir.path}/${defaultModelConfig.filename}');
      if (await defaultFile.exists()) {
        modelPath = defaultFile.path;
        await prefs.setString(
          selectedModelFilenamePrefsKey,
          defaultModelConfig.filename,
        );
      }
    }

    if (modelPath == null) {
      for (final model in availableModels) {
        final file = File('${dir.path}/${model.filename}');
        if (await file.exists()) {
          modelPath = file.path;
          await prefs.setString(selectedModelFilenamePrefsKey, model.filename);
          break;
        }
      }
    }

    if (!mounted) return;
    setState(() {
      _isChecking = false;
      _existingModelPath = modelPath;
    });

    // Kick off background download of the default streaming ASR model.
    // Non-blocking: if the model is already on disk, this is a no-op.
    // The engine itself is NOT initialized here — that is deferred to
    // AsrModelBootstrap.requestEngine() when the user actually needs ASR.
    // ignore: unawaited_futures
    AsrModelBootstrap.instance.bootstrap();
  }

  @override
  Widget build(BuildContext context) {
    if (_isChecking) {
      return const Scaffold(
        backgroundColor: MemoryPalette.ink,
        body: Center(
          child: CircularProgressIndicator(color: MemoryPalette.gold),
        ),
      );
    }

    if (_existingModelPath != null) {
      return PetAppShell(modelPath: _existingModelPath!);
    }

    return const ModelDownloadPage();
  }
}
