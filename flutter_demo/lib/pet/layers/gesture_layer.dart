import 'package:flutter/material.dart';
import '../pet_store.dart';

class GestureLayer extends StatelessWidget {
  final PetStore store;
  const GestureLayer({super.key, required this.store});

  @override
  Widget build(BuildContext context) {
    DateTime? lastTapTime;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onPanUpdate: (details) {
        store.setLookAt(details.globalPosition);
      },
      onTapDown: (details) {
        store.setIsPointerDown(true);
        store.setLookAt(details.globalPosition);

        final now = DateTime.now();
        final isDoubleTap = lastTapTime != null &&
            now.difference(lastTapTime!).inMilliseconds < 300;
        lastTapTime = now;

        if (isDoubleTap) {
          store.setMood(PetMood.happy);
          store.addParticle(ParticleType.heart, details.globalPosition.dx,
              details.globalPosition.dy);
        } else {
          store.setMood(PetMood.curious);
          store.addParticle(ParticleType.sparkle, details.globalPosition.dx,
              details.globalPosition.dy);
          Future.delayed(const Duration(seconds: 1), () {
            if (store.mood == PetMood.curious) {
              store.setMood(PetMood.idle);
            }
          });
        }
      },
      onTapUp: (_) {
        store.setIsPointerDown(false);
      },
      onTapCancel: () {
        store.setIsPointerDown(false);
      },
      onLongPressStart: (details) {
        store.setIsPointerDown(true);
        store.setLookAt(details.globalPosition);
        store.addParticle(ParticleType.heart, details.globalPosition.dx,
            details.globalPosition.dy);
      },
      onLongPressEnd: (_) {
        store.setIsPointerDown(false);
      },
      onLongPressMoveUpdate: (details) {
        store.setLookAt(details.globalPosition);
      },
      child: const SizedBox.expand(),
    );
  }
}
