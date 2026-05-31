import 'package:flutter/material.dart';

import 'pet_store.dart';
import 'layers/habitat_layer.dart';
import 'layers/entity_layer.dart';
import 'layers/spatial_ui_layer.dart';
import 'layers/gesture_layer.dart';
import 'layers/hud_layer.dart';
import 'services/ai_service.dart';
import '../core/product/product_copy.dart';
import '../ui/pages/model_download_page.dart';
import '../ui/design/memory_design.dart';

class PetAppShell extends StatefulWidget {
  final String modelPath;

  const PetAppShell({super.key, required this.modelPath});

  @override
  State<PetAppShell> createState() => _PetAppShellState();
}

class _PetAppShellState extends State<PetAppShell> {
  final PetStore _store = PetStore();
  final AiService _aiService = AiService();
  bool _isInitializing = true;
  String _initStatus = '正在加载本地模型...';

  @override
  void initState() {
    super.initState();
    _initialize();
  }

  @override
  void dispose() {
    _store.dispose();
    _aiService.dispose();
    super.dispose();
  }

  Future<void> _initialize() async {
    try {
      setState(() => _initStatus = '正在加载本地模型...');
      await _aiService.initialize(widget.modelPath);

      if (!mounted) return;
      setState(() {
        _isInitializing = false;
        _initStatus = '';
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isInitializing = false;
        _initStatus = '唤醒失败: $e';
      });
    }
  }

  Future<String> _handleSendMessage(String message) async {
    final result = await _aiService.generateResponse(message);
    return result.text;
  }

  void _openModels() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const ModelDownloadPage()),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isInitializing) {
      return _buildLoadingScreen();
    }

    return Scaffold(
      body: Container(
        color: MemoryPalette.ink,
        child: Stack(
          fit: StackFit.expand,
          children: [
            HabitatLayer(store: _store),
            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Spacer(flex: 5),
                  EntityLayer(store: _store),
                  const Spacer(flex: 1),
                ],
              ),
            ),
            SpatialUILayer(store: _store),
            GestureLayer(store: _store),
            HUDLayer(
              store: _store,
              onSendMessage: _handleSendMessage,
              onOpenModels: _openModels,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLoadingScreen() {
    return Scaffold(
      backgroundColor: MemoryPalette.ink,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: 1),
              duration: const Duration(seconds: 2),
              builder: (context, value, _) {
                return Opacity(
                  opacity: value,
                  child: MemoryGlyph(size: 92, progress: value),
                );
              },
            ),
            const SizedBox(height: 24),
            Text(
              ProductCopy.slogan,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: MemoryPalette.paper.withValues(alpha: 0.52),
                fontSize: 13,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              _initStatus,
              style: TextStyle(
                color: MemoryPalette.paper.withValues(alpha: 0.76),
                fontSize: 15,
                letterSpacing: 0.8,
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: 120,
              child: LinearProgressIndicator(
                backgroundColor: MemoryPalette.paper.withValues(alpha: 0.08),
                valueColor: AlwaysStoppedAnimation<Color>(
                  MemoryPalette.gold.withValues(alpha: 0.76),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
