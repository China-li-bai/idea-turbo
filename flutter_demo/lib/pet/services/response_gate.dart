import 'dart:math';

import 'emotional_state.dart';
import '../domain/pet_action.dart';
import '../domain/vitality_phase.dart';

enum ResponseAction {
  respond,
  silentAction,
  delayedRespond,
  refuse,
}

class ResponseDecision {
  final ResponseAction action;
  final Duration? delay;
  final String? moodHint;
  final PetAction? petAction;

  const ResponseDecision({
    required this.action,
    this.delay,
    this.moodHint,
    this.petAction,
  });
}

class ResponseGate {
  final EmotionalState emotionalState;
  final VitalityPhase vitalityPhase;

  ResponseGate(this.emotionalState, {this.vitalityPhase = VitalityPhase.normal});

  ResponseDecision decide(String userMessage) {
    final vitalityHint = _vitalityMoodHint();

    if (emotionalState.isWithdrawn) {
      return _handleWithdrawn(userMessage, vitalityHint);
    }

    if (emotionalState.mode == EmotionalMode.longing) {
      return _handleLonging(userMessage, vitalityHint);
    }

    if (emotionalState.mode == EmotionalMode.pensive) {
      return _handlePensive(userMessage, vitalityHint);
    }

    if (emotionalState.mode == EmotionalMode.playful) {
      return _handlePlayful(userMessage, vitalityHint);
    }

    return _handleNormal(userMessage, vitalityHint);
  }

  String? _vitalityMoodHint() {
    switch (vitalityPhase) {
      case VitalityPhase.vibrant:
        return '你精力充沛，想多说一点，动作也更活泼。';
      case VitalityPhase.normal:
        return null;
      case VitalityPhase.lethargic:
        return '你很累，只想发一个短动作，不超过5个字。';
      case VitalityPhase.fragile:
        return '你情绪很脆弱，说话很小心，容易受伤。';
      case VitalityPhase.dormant:
        return '你几乎没有力气，只发一个极短的动作，不超过3个字。';
    }
  }

  Duration _vitalityDelay() {
    switch (vitalityPhase) {
      case VitalityPhase.vibrant:
        return Duration.zero;
      case VitalityPhase.normal:
        return const Duration(milliseconds: 500);
      case VitalityPhase.lethargic:
        return const Duration(seconds: 2);
      case VitalityPhase.fragile:
        return const Duration(milliseconds: 300);
      case VitalityPhase.dormant:
        return const Duration(seconds: 5);
    }
  }

  ResponseDecision _handleWithdrawn(String userMessage, String? vitalityHint) {
    final remaining = emotionalState.remainingSilence;
    final baseDelay = _vitalityDelay();

    if (remaining.inMinutes > 5) {
      return ResponseDecision(
        action: ResponseAction.silentAction,
        petAction: const PetAction(
          type: PetActionType.retreat,
          displayText: '*缩回角落*',
        ),
        moodHint: _mergeHints('你不想说话。只发一个表示退缩的动作，不超过5个字。', vitalityHint),
      );
    }

    if (remaining.inMinutes > 2) {
      return ResponseDecision(
        action: ResponseAction.silentAction,
        petAction: PetAction(
          type: PetActionType.retreat,
          displayText: '*看了你一眼，又低下头*',
          duration: const Duration(seconds: 3),
        ),
        moodHint: _mergeHints('你还在犹豫要不要说话。发一个犹豫的动作，不超过10个字。', vitalityHint),
      );
    }

    return ResponseDecision(
      action: ResponseAction.delayedRespond,
      delay: baseDelay + Duration(seconds: 3 + Random().nextInt(5)),
      moodHint: _mergeHints('你刚被伤过，还在恢复。说话很简短，有点小心翼翼。不超过15个字。', vitalityHint),
    );
  }

  ResponseDecision _handleLonging(String userMessage, String? vitalityHint) {
    final baseDelay = _vitalityDelay();

    if (_randomChance(0.4)) {
      return ResponseDecision(
        action: ResponseAction.delayedRespond,
        delay: baseDelay + Duration(seconds: 1 + Random().nextInt(3)),
        moodHint: _mergeHints('你等了很久终于等到他说话了。你想表现得不在意，但藏不住开心。', vitalityHint),
      );
    }

    return ResponseDecision(
      action: ResponseAction.respond,
      moodHint: _mergeHints('你很想念他，但不想让他看出来。', vitalityHint),
    );
  }

  ResponseDecision _handlePensive(String userMessage, String? vitalityHint) {
    return ResponseDecision(
      action: ResponseAction.respond,
      moodHint: _mergeHints('深夜让你更真实。你会说一些平时不会说的话，更坦诚，也更脆弱。', vitalityHint),
    );
  }

  ResponseDecision _handlePlayful(String userMessage, String? vitalityHint) {
    if (vitalityPhase == VitalityPhase.lethargic || vitalityPhase == VitalityPhase.dormant) {
      return ResponseDecision(
        action: ResponseAction.respond,
        moodHint: _mergeHints('你想调皮，但太累了。发一个简短的动作。', null),
      );
    }

    return ResponseDecision(
      action: ResponseAction.respond,
      moodHint: _mergeHints('你现在心情很好，想逗他玩。可以调皮一点，偶尔故意说反话。', vitalityHint),
    );
  }

  ResponseDecision _handleNormal(String userMessage, String? vitalityHint) {
    final baseDelay = _vitalityDelay();

    if (emotionalState.isNightOwl && _randomChance(0.2)) {
      return ResponseDecision(
        action: ResponseAction.delayedRespond,
        delay: baseDelay + Duration(seconds: 2 + Random().nextInt(4)),
        moodHint: _mergeHints('深夜了，你回复得慢了一点，像是在发呆。', vitalityHint),
      );
    }

    if (_randomChance(0.1)) {
      return ResponseDecision(
        action: ResponseAction.silentAction,
        petAction: _randomSilentAction(),
      );
    }

    return ResponseDecision(
      action: ResponseAction.respond,
      moodHint: vitalityHint,
    );
  }

  String? _mergeHints(String base, String? vitality) {
    if (vitality == null) return base;
    return '$base $vitality';
  }

  PetAction _randomSilentAction() {
    const actions = [
      PetAction(type: PetActionType.zoneOut, displayText: '*发呆*'),
      PetAction(type: PetActionType.tiltHead, displayText: '*歪头看着你*'),
      PetAction(type: PetActionType.yawn, displayText: '*打了个哈欠*'),
      PetAction(type: PetActionType.blink, displayText: '*眨眨眼*'),
      PetAction(type: PetActionType.stretch, displayText: '*伸了个懒腰*'),
      PetAction(type: PetActionType.silent, displayText: '*安静地待着*'),
    ];
    return actions[Random().nextInt(actions.length)];
  }

  bool _randomChance(double probability) {
    return Random().nextDouble() < probability;
  }
}
