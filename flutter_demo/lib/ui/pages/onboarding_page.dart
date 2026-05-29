import 'dart:io';
import 'dart:math';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../data/models/model_config.dart';
import '../../core/product/product_copy.dart';
import '../../pet/pet_app_shell.dart';
import '../design/memory_design.dart';

enum GenesisPhase {
  voidState,
  pulseDetected,
  soulSyncing,
  collapsing,
  birth,
  sysLog,
  preparing,
}

class OnboardingPage extends StatefulWidget {
  const OnboardingPage({super.key});

  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends State<OnboardingPage>
    with TickerProviderStateMixin {
  GenesisPhase _phase = GenesisPhase.voidState;
  double _syncProgress = 0;
  double _downloadProgress = 0;
  String _prepareStatus = '';
  List<_Particle> _particles = [];
  late AnimationController _pulseController;
  late AnimationController _mandalaController;
  late AnimationController _birthController;
  late AnimationController _glitchController;
  int _sysLogLineIndex = 0;

  static const _sysLogLines = [
    '[SYS_LOG] 情感记忆核心已锚定。',
    '[SYS_LOG] 当前形态：[人格胚胎 - 观测态]',
    '[SYS_LOG] 相索引：等待第一组触发点',
    '[SYS_LOG] 长期关系链路：已连接',
    '[SYS_LOG] ⚠ 警告：该人格会被你的情绪与选择塑形。',
    '[SYS_LOG] ⚠ 命名、信任、沉默和冲突都将留下痕迹。',
    '[SYS_LOG] ⚠ 请谨慎交付记忆。',
  ];

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);

    _mandalaController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 20),
    )..repeat();

    _birthController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );

    _glitchController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 100),
    );

    _startHeartbeat();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _mandalaController.dispose();
    _birthController.dispose();
    _glitchController.dispose();
    super.dispose();
  }

  void _startHeartbeat() {
    Future.delayed(const Duration(milliseconds: 800), () {
      if (!mounted || _phase != GenesisPhase.voidState) return;
      HapticFeedback.lightImpact();
      Future.delayed(const Duration(milliseconds: 200), () {
        if (!mounted) return;
        HapticFeedback.lightImpact();
      });
      _startHeartbeat();
    });
  }

  void _onLongPressStart(LongPressStartDetails details) {
    if (_phase != GenesisPhase.voidState) return;

    setState(() {
      _phase = GenesisPhase.soulSyncing;
      _syncProgress = 0;
    });

    _spawnParticles(details.globalPosition);
    _advanceSync();
  }

  void _onLongPressMoveUpdate(LongPressMoveUpdateDetails details) {
    if (_phase != GenesisPhase.soulSyncing) return;
    _spawnParticles(details.globalPosition);
  }

  void _onLongPressEnd(LongPressEndDetails details) {
    if (_phase == GenesisPhase.soulSyncing && _syncProgress < 1.0) {
      setState(() {
        _phase = GenesisPhase.voidState;
        _syncProgress = 0;
        _particles.clear();
      });
      _startHeartbeat();
    }
  }

  void _advanceSync() {
    if (_phase != GenesisPhase.soulSyncing) return;

    Future.delayed(const Duration(milliseconds: 50), () {
      if (!mounted || _phase != GenesisPhase.soulSyncing) return;

      setState(() {
        _syncProgress += 0.018;
      });

      if (_syncProgress >= 0.3 && _syncProgress < 0.35) {
        HapticFeedback.mediumImpact();
      }
      if (_syncProgress >= 0.6 && _syncProgress < 0.65) {
        HapticFeedback.mediumImpact();
      }

      if (_syncProgress >= 1.0) {
        _triggerCollapse();
        return;
      }

      _advanceSync();
    });
  }

  void _spawnParticles(Offset center) {
    final rng = Random();
    for (int i = 0; i < 3; i++) {
      final angle = rng.nextDouble() * 2 * pi;
      final dist = 30.0 + rng.nextDouble() * 80;
      final hue =
          (center.dx * 0.5 + center.dy * 0.3 + _syncProgress * 200) % 360;
      _particles.add(
        _Particle(
          x: center.dx + cos(angle) * dist,
          y: center.dy + sin(angle) * dist,
          vx: cos(angle) * (1.5 + rng.nextDouble() * 2),
          vy: sin(angle) * (1.5 + rng.nextDouble() * 2),
          life: 1.0,
          hue: hue,
          size: 2 + rng.nextDouble() * 4,
        ),
      );
    }
    if (_particles.length > 200) {
      _particles = _particles.sublist(_particles.length - 200);
    }
  }

  void _triggerCollapse() {
    setState(() {
      _phase = GenesisPhase.collapsing;
    });

    HapticFeedback.heavyImpact();

    Future.delayed(const Duration(milliseconds: 600), () {
      if (!mounted) return;
      setState(() {
        _phase = GenesisPhase.birth;
        _particles.clear();
      });
      _birthController.forward();

      Future.delayed(const Duration(milliseconds: 800), () {
        if (!mounted) return;
        HapticFeedback.heavyImpact();
        setState(() {
          _phase = GenesisPhase.sysLog;
          _sysLogLineIndex = 0;
        });
        _revealSysLog();
      });
    });
  }

  void _revealSysLog() {
    if (_sysLogLineIndex < _sysLogLines.length) {
      Future.delayed(const Duration(milliseconds: 400), () {
        if (!mounted) return;
        setState(() {
          _sysLogLineIndex++;
        });
        _revealSysLog();
      });
    } else {
      Future.delayed(const Duration(milliseconds: 1200), () {
        if (!mounted) return;
        _beginPreparation();
      });
    }
  }

  Future<void> _beginPreparation() async {
    setState(() {
      _phase = GenesisPhase.preparing;
      _prepareStatus = '正在下载本地思维核心...';
      _downloadProgress = 0;
    });

    final modelPath = await _ensureModelReady();

    if (!mounted) return;

    if (modelPath != null) {
      setState(() => _prepareStatus = '记忆底座已就绪，正在进入观测舱...');
      await Future.delayed(const Duration(milliseconds: 800));

      if (!mounted) return;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('onboarding_complete', true);

      if (!mounted) return;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => PetAppShell(modelPath: modelPath)),
      );
    } else {
      setState(() {
        _phase = GenesisPhase.sysLog;
        _prepareStatus = '连接失败，请检查网络后重试';
      });
    }
  }

  Future<String?> _ensureModelReady() async {
    final dir = await getApplicationDocumentsDirectory();

    for (final model in availableModels) {
      final file = File('${dir.path}/${model.filename}');
      if (await file.exists()) {
        return file.path;
      }
    }

    final recommended = availableModels.where((m) => m.minRamGb <= 4).toList();
    final target = recommended.isNotEmpty
        ? recommended.first
        : availableModels.first;

    try {
      final savePath = '${dir.path}/${target.filename}';
      final dio = Dio();
      await dio.download(
        target.url,
        savePath,
        onReceiveProgress: (received, total) {
          if (total > 0 && mounted) {
            setState(() {
              _downloadProgress = received / total;
              _prepareStatus =
                  '正在下载本地思维核心... ${(received / total * 100).toStringAsFixed(0)}%';
            });
          }
        },
      );
      return savePath;
    } catch (e) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: MemoryPalette.ink,
      body: GestureDetector(
        onLongPressStart: _onLongPressStart,
        onLongPressMoveUpdate: _onLongPressMoveUpdate,
        onLongPressEnd: _onLongPressEnd,
        child: Stack(
          fit: StackFit.expand,
          children: [
            _buildPhaseContent(),
            if (_phase == GenesisPhase.soulSyncing ||
                _phase == GenesisPhase.collapsing)
              _buildParticles(),
          ],
        ),
      ),
    );
  }

  Widget _buildPhaseContent() {
    switch (_phase) {
      case GenesisPhase.voidState:
        return _buildVoidState();
      case GenesisPhase.pulseDetected:
        return _buildVoidState();
      case GenesisPhase.soulSyncing:
        return _buildSoulSyncing();
      case GenesisPhase.collapsing:
        return _buildCollapsing();
      case GenesisPhase.birth:
        return _buildBirth();
      case GenesisPhase.sysLog:
        return _buildSysLog();
      case GenesisPhase.preparing:
        return _buildPreparing();
    }
  }

  Widget _buildVoidState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          AnimatedBuilder(
            animation: _pulseController,
            builder: (context, _) {
              final pulse = _pulseController.value;
              return Opacity(
                opacity: 0.15 + pulse * 0.25,
                child: Container(
                  width: 120 + pulse * 20,
                  height: 120 + pulse * 20,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: MemoryPalette.paper.withValues(
                        alpha: 0.10 + pulse * 0.15,
                      ),
                      width: 1,
                    ),
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 48),
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: 1),
            duration: const Duration(seconds: 3),
            builder: (context, value, _) {
              return Opacity(
                opacity: value * 0.6,
                child: Text(
                  ProductCopy.slogan,
                  style: TextStyle(
                    color: MemoryPalette.paper.withValues(alpha: 0.58),
                    fontSize: 14,
                    letterSpacing: 0.4,
                    fontFamily: 'monospace',
                  ),
                  textAlign: TextAlign.center,
                ),
              );
            },
          ),
          const SizedBox(height: 24),
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: 1),
            duration: const Duration(seconds: 4),
            builder: (context, value, _) {
              return Opacity(
                opacity: value * 0.4,
                child: Text(
                  '长按屏幕中央，建立第一条情感记忆链路',
                  style: TextStyle(
                    color: MemoryPalette.gold.withValues(alpha: 0.62),
                    fontSize: 12,
                    letterSpacing: 0.8,
                    fontFamily: 'monospace',
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildSoulSyncing() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          AnimatedBuilder(
            animation: _mandalaController,
            builder: (context, _) {
              return CustomPaint(
                size: const Size(200, 200),
                painter: _SyncMandalaPainter(
                  progress: _syncProgress,
                  rotation: _mandalaController.value * 2 * pi,
                ),
              );
            },
          ),
          const SizedBox(height: 32),
          Text(
            '灵魂拓印中... ${(_syncProgress * 100).toStringAsFixed(0)}%',
            style: TextStyle(
              color: MemoryPalette.paper.withValues(alpha: 0.76),
              fontSize: 14,
              letterSpacing: 0.8,
              fontFamily: 'monospace',
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '松开将中断连接',
            style: TextStyle(
              color: MemoryPalette.rust.withValues(alpha: 0.64),
              fontSize: 11,
              letterSpacing: 1,
              fontFamily: 'monospace',
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCollapsing() {
    return Center(
      child: AnimatedBuilder(
        animation: _birthController,
        builder: (context, _) {
          final t = _birthController.value;
          final scale = 2.0 - t * 1.5;
          final opacity = 1.0 - t;
          return Opacity(
            opacity: opacity.clamp(0.0, 1.0),
            child: Transform.scale(
              scale: scale.clamp(0.1, 2.0),
              child: CustomPaint(
                size: const Size(200, 200),
                painter: _SyncMandalaPainter(
                  progress: 1.0,
                  rotation: _mandalaController.value * 8 * pi,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildBirth() {
    return Center(
      child: AnimatedBuilder(
        animation: _birthController,
        builder: (context, _) {
          final t = Curves.easeOut.transform(_birthController.value);
          return Opacity(
            opacity: t,
            child: Transform.scale(
              scale: 0.3 + t * 0.7,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 120,
                    height: 120,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: RadialGradient(
                        colors: [
                          MemoryPalette.gold.withValues(alpha: 0.18),
                          MemoryPalette.paper.withValues(alpha: 0.05),
                          Colors.transparent,
                        ],
                      ),
                    ),
                    child: const Center(child: MemoryGlyph(size: 82)),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildSysLog() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    MemoryPalette.gold.withValues(alpha: 0.10),
                    Colors.transparent,
                  ],
                ),
              ),
              child: const Center(child: MemoryGlyph(size: 54, compact: true)),
            ),
          ),
          const SizedBox(height: 40),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: MemoryPalette.ink.withValues(alpha: 0.82),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: MemoryPalette.moss.withValues(alpha: 0.34),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: MemoryPalette.moss.withValues(alpha: 0.84),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'SYSTEM TERMINAL',
                      style: TextStyle(
                        color: MemoryPalette.moss.withValues(alpha: 0.72),
                        fontSize: 10,
                        letterSpacing: 2,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                ...List.generate(_sysLogLineIndex, (i) {
                  final line = _sysLogLines[i];
                  final isWarning = line.contains('⚠');
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: TweenAnimationBuilder<double>(
                      tween: Tween(begin: 0, end: 1),
                      duration: const Duration(milliseconds: 300),
                      builder: (context, value, _) {
                        return Opacity(
                          opacity: value,
                          child: Text(
                            line,
                            style: TextStyle(
                              color: isWarning
                                  ? MemoryPalette.gold.withValues(alpha: 0.9)
                                  : MemoryPalette.moss.withValues(alpha: 0.76),
                              fontSize: 12,
                              fontFamily: 'monospace',
                              height: 1.6,
                            ),
                          ),
                        );
                      },
                    ),
                  );
                }),
                if (_sysLogLineIndex >= _sysLogLines.length &&
                    _prepareStatus.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: Text(
                      _prepareStatus,
                      style: TextStyle(
                        color: MemoryPalette.moss.withValues(alpha: 0.72),
                        fontSize: 12,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ),
              ],
            ),
          ),
          if (_sysLogLineIndex >= _sysLogLines.length)
            Padding(
              padding: const EdgeInsets.only(top: 24),
              child: Center(
                child: Text(
                  '第一条记忆链路已建立',
                  style: TextStyle(
                    color: MemoryPalette.paper.withValues(alpha: 0.34),
                    fontSize: 12,
                    letterSpacing: 4,
                    fontFamily: 'monospace',
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPreparing() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          AnimatedBuilder(
            animation: _mandalaController,
            builder: (context, _) {
              return CustomPaint(
                size: const Size(100, 100),
                painter: _SyncMandalaPainter(
                  progress: _downloadProgress,
                  rotation: _mandalaController.value * 2 * pi,
                ),
              );
            },
          ),
          const SizedBox(height: 32),
          Text(
            _prepareStatus,
            style: TextStyle(
              color: MemoryPalette.paper.withValues(alpha: 0.76),
              fontSize: 14,
              letterSpacing: 1,
              fontFamily: 'monospace',
            ),
          ),
          if (_downloadProgress > 0 && _downloadProgress < 1) ...[
            const SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 60),
              child: LinearProgressIndicator(
                value: _downloadProgress,
                backgroundColor: MemoryPalette.paper.withValues(alpha: 0.08),
                valueColor: const AlwaysStoppedAnimation<Color>(
                  MemoryPalette.gold,
                ),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildParticles() {
    return CustomPaint(
      size: MediaQuery.of(context).size,
      painter: _ParticlePainter(
        particles: _particles,
        collapsing: _phase == GenesisPhase.collapsing,
      ),
    );
  }
}

class _Particle {
  double x;
  double y;
  double vx;
  double vy;
  double life;
  double hue;
  double size;

  _Particle({
    required this.x,
    required this.y,
    required this.vx,
    required this.vy,
    required this.life,
    required this.hue,
    required this.size,
  });
}

class _ParticlePainter extends CustomPainter {
  final List<_Particle> particles;
  final bool collapsing;

  _ParticlePainter({required this.particles, required this.collapsing});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);

    for (final p in particles) {
      if (collapsing) {
        final dx = center.dx - p.x;
        final dy = center.dy - p.y;
        p.x += dx * 0.15;
        p.y += dy * 0.15;
        p.life -= 0.05;
      } else {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.015;
      }

      if (p.life <= 0) continue;

      final color = HSLColor.fromAHSL(p.life * 0.8, p.hue, 0.8, 0.6).toColor();
      final paint = Paint()..color = color;
      canvas.drawCircle(Offset(p.x, p.y), p.size * p.life, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _ParticlePainter oldDelegate) => true;
}

class _SyncMandalaPainter extends CustomPainter {
  final double progress;
  final double rotation;

  _SyncMandalaPainter({required this.progress, required this.rotation});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 * 0.8;

    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.rotate(rotation);

    final sides = 5;
    for (int ring = 0; ring < 3; ring++) {
      final ringProgress = (progress * 3 - ring).clamp(0.0, 1.0);
      if (ringProgress <= 0) continue;

      final ringRadius = radius * (0.4 + ring * 0.3);
      final paint = Paint()
        ..color = HSLColor.fromAHSL(
          ringProgress * 0.6,
          45 + ring * 30,
          0.7,
          0.5 + ringProgress * 0.2,
        ).toColor()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5;

      final path = Path();
      for (int i = 0; i <= sides; i++) {
        final angle = (i / sides) * 2 * pi - pi / 2;
        final x = cos(angle) * ringRadius * ringProgress;
        final y = sin(angle) * ringRadius * ringProgress;
        if (i == 0) {
          path.moveTo(x, y);
        } else {
          path.lineTo(x, y);
        }
      }
      path.close();
      canvas.drawPath(path, paint);

      for (int i = 0; i < sides; i++) {
        final angle = (i / sides) * 2 * pi - pi / 2;
        final x = cos(angle) * ringRadius * ringProgress;
        final y = sin(angle) * ringRadius * ringProgress;
        final dotPaint = Paint()
          ..color = HSLColor.fromAHSL(
            ringProgress * 0.9,
            45 + ring * 30,
            0.8,
            0.6,
          ).toColor();
        canvas.drawCircle(Offset(x, y), 3 * ringProgress, dotPaint);
      }
    }

    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _SyncMandalaPainter oldDelegate) =>
      progress != oldDelegate.progress || rotation != oldDelegate.rotation;
}
