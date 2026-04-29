import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';

enum PetMood {
  idle,
  listening,
  thinking,
  speaking,
  happy,
  sleepy,
  curious,
  dizzy,
  reading,
}

enum ParticleType {
  heart,
  sparkle,
  note,
}

class Subtitle {
  final String id;
  final String text;
  final double x;
  final double y;
  final DateTime createdAt;
  final bool isUser;

  Subtitle({
    required this.id,
    required this.text,
    required this.x,
    required this.y,
    required this.isUser,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();
}

class Particle {
  final String id;
  final ParticleType type;
  final double x;
  final double y;
  final DateTime createdAt;

  Particle({
    required this.id,
    required this.type,
    required this.x,
    required this.y,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();
}

class PetStore extends ChangeNotifier {
  PetMood _mood = PetMood.idle;
  Offset _lookAt = Offset.zero;
  Offset _petPosition = Offset.zero;
  bool _isPointerDown = false;
  bool _isListening = false;
  bool _isInputOpen = false;

  final List<Subtitle> _subtitles = [];
  final List<Particle> _particles = [];

  Timer? _subtitleCleanupTimer;
  Timer? _particleCleanupTimer;

  PetMood get mood => _mood;
  Offset get lookAt => _lookAt;
  Offset get petPosition => _petPosition;
  bool get isPointerDown => _isPointerDown;
  bool get isListening => _isListening;
  bool get isInputOpen => _isInputOpen;
  List<Subtitle> get subtitles => List.unmodifiable(_subtitles);
  List<Particle> get particles => List.unmodifiable(_particles);

  PetStore() {
    _subtitleCleanupTimer = Timer.periodic(
      const Duration(seconds: 1),
      (_) => _cleanupSubtitles(),
    );
    _particleCleanupTimer = Timer.periodic(
      const Duration(milliseconds: 500),
      (_) => _cleanupParticles(),
    );
  }

  void setMood(PetMood mood) {
    if (_mood == mood) return;
    _mood = mood;
    notifyListeners();
  }

  void setLookAt(Offset position) {
    _lookAt = position;
    notifyListeners();
  }

  void setPetPosition(Offset position) {
    _petPosition = position;
    notifyListeners();
  }

  void setIsPointerDown(bool down) {
    _isPointerDown = down;
    notifyListeners();
  }

  void setIsListening(bool listening) {
    _isListening = listening;
    notifyListeners();
  }

  void setIsInputOpen(bool open) {
    _isInputOpen = open;
    if (open) {
      setMood(PetMood.reading);
    } else if (_mood == PetMood.reading) {
      setMood(PetMood.idle);
    }
    notifyListeners();
  }

  void addSubtitle(String text, double x, double y, {bool isUser = false}) {
    _subtitles.add(Subtitle(
      id: _generateId(),
      text: text,
      x: x,
      y: y,
      isUser: isUser,
    ));
    notifyListeners();
  }

  void removeSubtitle(String id) {
    _subtitles.removeWhere((s) => s.id == id);
    notifyListeners();
  }

  void addParticle(ParticleType type, double x, double y) {
    _particles.add(Particle(
      id: _generateId(),
      type: type,
      x: x,
      y: y,
    ));
    notifyListeners();
  }

  void removeParticle(String id) {
    _particles.removeWhere((p) => p.id == id);
    notifyListeners();
  }

  void _cleanupSubtitles() {
    final now = DateTime.now();
    final expired = _subtitles
        .where((s) => now.difference(s.createdAt).inSeconds > 6)
        .map((s) => s.id)
        .toList();
    if (expired.isNotEmpty) {
      for (final id in expired) {
        _subtitles.removeWhere((s) => s.id == id);
      }
      notifyListeners();
    }
  }

  void _cleanupParticles() {
    final now = DateTime.now();
    final expired = _particles
        .where((p) => now.difference(p.createdAt).inSeconds > 3)
        .map((p) => p.id)
        .toList();
    if (expired.isNotEmpty) {
      for (final id in expired) {
        _particles.removeWhere((p) => p.id == id);
      }
      notifyListeners();
    }
  }

  String _generateId() {
    return '${DateTime.now().microsecondsSinceEpoch}_${Random().nextInt(9999)}';
  }

  @override
  void dispose() {
    _subtitleCleanupTimer?.cancel();
    _particleCleanupTimer?.cancel();
    super.dispose();
  }
}
