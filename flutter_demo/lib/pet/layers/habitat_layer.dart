import 'dart:ui';

import 'package:flutter/material.dart';
import '../pet_store.dart';

class HabitatLayer extends StatefulWidget {
  final PetStore store;
  const HabitatLayer({super.key, required this.store});

  @override
  State<HabitatLayer> createState() => _HabitatLayerState();
}

class _HabitatLayerState extends State<HabitatLayer>
    with SingleTickerProviderStateMixin {
  late AnimationController _breathController;
  Offset _parallaxOffset = Offset.zero;

  @override
  void initState() {
    super.initState();
    _breathController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 8),
    )..repeat(reverse: true);

    widget.store.addListener(_onStoreChanged);
  }

  @override
  void dispose() {
    _breathController.dispose();
    widget.store.removeListener(_onStoreChanged);
    super.dispose();
  }

  void _onStoreChanged() {
    if (!mounted) return;
    final lookAt = widget.store.lookAt;
    final size = MediaQuery.of(context).size;
    final dx = (lookAt.dx - size.width / 2) / size.width * -0.05;
    final dy = (lookAt.dy - size.height / 2) / size.height * -0.05;
    setState(() {
      _parallaxOffset = Offset(dx * size.width, dy * size.height);
    });
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return AnimatedBuilder(
      animation: _breathController,
      builder: (context, _) {
        final breathVal = _breathController.value;
        final glowScale = 0.8 + breathVal * 0.2;

        return Container(
          width: size.width,
          height: size.height,
          color: Colors.black,
          child: Stack(
            children: [
              Transform.translate(
                offset: _parallaxOffset,
                child: Container(
                  width: size.width * 1.2,
                  height: size.height * 1.2,
                  decoration: const BoxDecoration(
                    gradient: RadialGradient(
                      center: Alignment(0, -0.4),
                      radius: 1.2,
                      colors: [
                        Color(0xFF1A1E29),
                        Color(0xFF080A10),
                        Color(0xFF000000),
                      ],
                      stops: [0.0, 0.6, 1.0],
                    ),
                  ),
                ),
              ),
              BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 60, sigmaY: 60),
                child: Container(color: Colors.black.withValues(alpha: 0.2)),
              ),
              Positioned(
                top: -size.height * 0.15,
                left: size.width * 0.1,
                child: AnimatedScale(
                  scale: glowScale,
                  duration: const Duration(milliseconds: 200),
                  child: Container(
                    width: size.width * 0.8,
                    height: size.height * 0.5,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: RadialGradient(
                        colors: [
                          Colors.blue.withValues(alpha: 0.10),
                          Colors.blue.withValues(alpha: 0.0),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              Positioned(
                bottom: -size.height * 0.1,
                left: -size.width * 0.1,
                child: Container(
                  width: size.width * 0.5,
                  height: size.height * 0.3,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        Colors.green.withValues(alpha: 0.05),
                        Colors.green.withValues(alpha: 0.0),
                      ],
                    ),
                  ),
                ),
              ),
              Positioned(
                bottom: -size.height * 0.05,
                right: -size.width * 0.1,
                child: Container(
                  width: size.width * 0.4,
                  height: size.height * 0.25,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        Colors.amber.withValues(alpha: 0.04),
                        Colors.amber.withValues(alpha: 0.0),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
