import 'dart:io';

import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'data/models/model_config.dart';
import 'core/product/product_copy.dart';
import 'pet/pet_app_shell.dart';
import 'ui/pages/onboarding_page.dart';

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
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
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
  bool? _onboardingComplete;
  String? _existingModelPath;

  @override
  void initState() {
    super.initState();
    _checkState();
  }

  Future<void> _checkState() async {
    final prefs = await SharedPreferences.getInstance();
    final done = prefs.getBool('onboarding_complete') ?? false;

    String? modelPath;
    if (done) {
      final dir = await getApplicationDocumentsDirectory();
      for (final model in availableModels) {
        final file = File('${dir.path}/${model.filename}');
        if (await file.exists()) {
          modelPath = file.path;
          break;
        }
      }
    }

    if (!mounted) return;
    setState(() {
      _onboardingComplete = done;
      _existingModelPath = modelPath;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_onboardingComplete == null) {
      return const Scaffold(
        backgroundColor: Color(0xFF0A0A1A),
        body: Center(child: CircularProgressIndicator(color: Colors.amber)),
      );
    }

    if (_onboardingComplete! && _existingModelPath != null) {
      return PetAppShell(modelPath: _existingModelPath!);
    }

    return const OnboardingPage();
  }
}
