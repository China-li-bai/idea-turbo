import 'package:flutter/material.dart';
import 'pet_store.dart';
import 'layers/habitat_layer.dart';
import 'layers/entity_layer.dart';
import 'layers/spatial_ui_layer.dart';
import 'layers/gesture_layer.dart';
import 'layers/hud_layer.dart';
import 'services/ai_service.dart';

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
  String _initStatus = '正在唤醒镇岳...';

  @override
  void initState() {
    super.initState();
    _initializeAi();
  }

  @override
  void dispose() {
    _store.dispose();
    _aiService.dispose();
    super.dispose();
  }

  Future<void> _initializeAi() async {
    try {
      setState(() => _initStatus = '正在加载思维模型...');
      await _aiService.initialize(widget.modelPath);
      if (!mounted) return;
      setState(() {
        _isInitializing = false;
        _initStatus = '';
      });

      final size = MediaQuery.of(context).size;
      _store.addSubtitle(
        '*伸了个懒腰* 嗯... 你来了。',
        size.width * 0.5 - 80,
        size.height * 0.35,
        isUser: false,
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isInitializing = false;
        _initStatus = '唤醒失败: $e';
      });
    }
  }

  Future<String> _handleSendMessage(String message) async {
    return _aiService.generateResponse(message);
  }

  @override
  Widget build(BuildContext context) {
    if (_isInitializing) {
      return _buildLoadingScreen();
    }

    return Scaffold(
      body: Container(
        color: Colors.black,
        child: Stack(
          fit: StackFit.expand,
          children: [
            HabitatLayer(store: _store),
            EntityLayer(store: _store),
            SpatialUILayer(store: _store),
            GestureLayer(store: _store),
            HUDLayer(
              store: _store,
              onSendMessage: _handleSendMessage,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLoadingScreen() {
    return Scaffold(
      backgroundColor: Colors.black,
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
                  child: const Text(
                    '🐱',
                    style: TextStyle(fontSize: 64),
                  ),
                );
              },
            ),
            const SizedBox(height: 24),
            Text(
              _initStatus,
              style: TextStyle(
                color: Colors.white.withOpacity(0.7),
                fontSize: 16,
                letterSpacing: 1.5,
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: 120,
              child: LinearProgressIndicator(
                backgroundColor: Colors.white.withOpacity(0.1),
                valueColor: AlwaysStoppedAnimation<Color>(
                  Colors.amber.withOpacity(0.6),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
