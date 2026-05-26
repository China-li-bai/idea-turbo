import 'package:flutter/material.dart';
import '../pet_store.dart';

class GestureLayer extends StatefulWidget {
  final PetStore store;
  const GestureLayer({super.key, required this.store});

  @override
  State<GestureLayer> createState() => _GestureLayerState();
}

class _GestureLayerState extends State<GestureLayer> {
  DateTime? _lastTapTime;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onPanUpdate: (details) {
        widget.store.setLookAt(details.globalPosition);
      },
      onTapDown: (details) {
        widget.store.setIsPointerDown(true);
        widget.store.setLookAt(details.globalPosition);

        final now = DateTime.now();
        final isDoubleTap = _lastTapTime != null &&
            now.difference(_lastTapTime!).inMilliseconds < 300;
        _lastTapTime = now;

        if (isDoubleTap) {
          widget.store.setMood(PetMood.happy);
          widget.store.addParticle(ParticleType.heart, details.globalPosition.dx,
              details.globalPosition.dy);
        } else {
          widget.store.setMood(PetMood.curious);
          widget.store.addParticle(ParticleType.sparkle, details.globalPosition.dx,
              details.globalPosition.dy);
          Future.delayed(const Duration(seconds: 1), () {
            if (widget.store.mood == PetMood.curious) {
              widget.store.setMood(PetMood.idle);
            }
          });
        }
      },
      onTapUp: (_) {
        widget.store.setIsPointerDown(false);
      },
      onTapCancel: () {
        widget.store.setIsPointerDown(false);
      },
      onLongPressStart: (details) {
        widget.store.setIsPointerDown(true);
        widget.store.setLookAt(details.globalPosition);
        widget.store.addParticle(ParticleType.heart, details.globalPosition.dx,
            details.globalPosition.dy);
      },
      onLongPressEnd: (_) {
        widget.store.setIsPointerDown(false);
      },
      onLongPressMoveUpdate: (details) {
        widget.store.setLookAt(details.globalPosition);
      },
      child: const SizedBox.expand(),
    );
  }
}
