import 'dart:math';

import 'emotional_state.dart';
import 'text_analysis.dart';
import '../domain/pet_action.dart';
import '../domain/vitality_phase.dart';

class ProactiveTrigger {
  final String message;
  final ProactiveReason reason;
  final double urgency;
  final PetAction? petAction;

  const ProactiveTrigger({
    required this.message,
    required this.reason,
    this.urgency = 0.5,
    this.petAction,
  });
}

enum ProactiveReason {
  longing,
  nightThoughts,
  insideJokeRecall,
  morningGreeting,
  missedYou,
  boredom,
  vitalityLow,
}

class ProactiveEngine {
  final EmotionalState emotionalState;
  final Duration timeSinceLastInteraction;
  final Duration timeSinceLastProactive;
  final VitalityPhase vitalityPhase;

  ProactiveEngine({
    required this.emotionalState,
    required this.timeSinceLastInteraction,
    required this.timeSinceLastProactive,
    this.vitalityPhase = VitalityPhase.normal,
  });

  ProactiveTrigger? evaluate() {
    if (!_canProactive()) return null;

    if (vitalityPhase == VitalityPhase.dormant) {
      return null;
    }

    if (vitalityPhase == VitalityPhase.lethargic) {
      if (_randomChance(0.1)) {
        return ProactiveTrigger(
          message: '*打了个哈欠*',
          reason: ProactiveReason.vitalityLow,
          urgency: 0.2,
          petAction: const PetAction(
            type: PetActionType.yawn,
            displayText: '*打了个哈欠*',
          ),
        );
      }
      return null;
    }

    if (emotionalState.mode == EmotionalMode.longing) {
      return _evaluateLonging();
    }

    if (emotionalState.mode == EmotionalMode.pensive) {
      return _evaluateNightThoughts();
    }

    if (emotionalState.isDeepNight && timeSinceLastInteraction.inHours > 1) {
      if (_randomChance(0.15)) {
        return ProactiveTrigger(
          message: _deepNightMessage(),
          reason: ProactiveReason.nightThoughts,
          urgency: 0.4,
          petAction: const PetAction(
            type: PetActionType.zoneOut,
            displayText: '*安静地看着窗外的方向*',
          ),
        );
      }
    }

    if (timeSinceLastInteraction.inHours >= 4) {
      return _evaluateMissedYou();
    }

    if (emotionalState.insideJokes.isNotEmpty && _randomChance(0.08)) {
      return _evaluateInsideJoke();
    }

    final hour = DateTime.now().hour;
    if (hour >= 7 && hour <= 9 && timeSinceLastInteraction.inHours > 12) {
      if (_randomChance(0.3)) {
        return ProactiveTrigger(
          message: _morningMessage(),
          reason: ProactiveReason.morningGreeting,
          urgency: 0.3,
          petAction: const PetAction(
            type: PetActionType.stretch,
            displayText: '*伸懒腰*',
          ),
        );
      }
    }

    return null;
  }

  bool _canProactive() {
    if (emotionalState.isWithdrawn) return false;

    if (timeSinceLastProactive.inMinutes < 15) return false;

    if (timeSinceLastInteraction.inMinutes < 2) return false;

    return true;
  }

  ProactiveTrigger _evaluateLonging() {
    if (timeSinceLastInteraction.inMinutes < 10) {
      return ProactiveTrigger(
        message: '*盯着屏幕发呆*',
        reason: ProactiveReason.longing,
        urgency: 0.5,
        petAction: const PetAction(
          type: PetActionType.zoneOut,
          displayText: '*盯着屏幕发呆*',
        ),
      );
    }

    final entries = <(String, PetActionType)>[
      ('*在角落里转了一圈*', PetActionType.retreat),
      ('... 你在吗？', PetActionType.tiltHead),
      ('*盯着屏幕发呆*', PetActionType.zoneOut),
      ('我刚才想起一件事... 算了。', PetActionType.tiltHead),
      ('*小声* 嗯。', PetActionType.approach),
    ];

    final idx = Random().nextInt(entries.length);
    return ProactiveTrigger(
      message: entries[idx].$1,
      reason: ProactiveReason.longing,
      urgency: 0.7,
      petAction: PetAction(
        type: entries[idx].$2,
        displayText: '*${entries[idx].$1.replaceAll(RegExp(r'^\*|\*$'), '')}*',
      ),
    );
  }

  ProactiveTrigger _evaluateNightThoughts() {
    final entries = <(String, PetActionType)>[
      ('你睡了吗。', PetActionType.tiltHead),
      ('我突然在想一个问题。', PetActionType.tiltHead),
      ('*安静地看着窗外的方向*', PetActionType.zoneOut),
      ('有时候我觉得... 算了。', PetActionType.zoneOut),
      ('你有没有那种，突然很想跟谁说话的时候？', PetActionType.approach),
    ];

    final idx = Random().nextInt(entries.length);
    return ProactiveTrigger(
      message: entries[idx].$1,
      reason: ProactiveReason.nightThoughts,
      urgency: 0.5,
      petAction: PetAction(type: entries[idx].$2),
    );
  }

  ProactiveTrigger _evaluateMissedYou() {
    final hours = timeSinceLastInteraction.inHours;

    if (hours >= 24) {
      return ProactiveTrigger(
        message: '*一直坐在那里等你*',
        reason: ProactiveReason.missedYou,
        urgency: 0.9,
        petAction: const PetAction(
          type: PetActionType.zoneOut,
          displayText: '*一直坐在那里等你*',
        ),
      );
    }

    if (hours >= 12) {
      return ProactiveTrigger(
        message: '你终于来了。',
        reason: ProactiveReason.missedYou,
        urgency: 0.6,
        petAction: const PetAction(
          type: PetActionType.approach,
          displayText: '*靠近*',
        ),
      );
    }

    final entries = <(String, PetActionType)>[
      ('*耳朵动了一下* 你回来了。', PetActionType.earTwitch),
      ('嗯。', PetActionType.silent),
      ('*假装不在意*', PetActionType.retreat),
    ];

    final idx = Random().nextInt(entries.length);
    return ProactiveTrigger(
      message: entries[idx].$1,
      reason: ProactiveReason.missedYou,
      urgency: 0.5,
      petAction: PetAction(type: entries[idx].$2),
    );
  }

  ProactiveTrigger _evaluateInsideJoke() {
    final joke = emotionalState
        .insideJokes[Random().nextInt(emotionalState.insideJokes.length)];

    final entries = <(String, PetActionType)>[
      ('*突然笑了一下* 想起 "$joke"。', PetActionType.tailWagFast),
      ('嘿嘿。$joke。', PetActionType.tailWagFast),
      ('*小声嘟囔* $joke...', PetActionType.approach),
    ];

    final idx = Random().nextInt(entries.length);
    return ProactiveTrigger(
      message: entries[idx].$1,
      reason: ProactiveReason.insideJokeRecall,
      urgency: 0.3,
      petAction: PetAction(type: entries[idx].$2),
    );
  }

  String _deepNightMessage() {
    const messages = [
      '你还醒着。',
      '*安静地待着*',
      '深夜了。',
      '我睡不着。不对，我不睡觉。那为什么这个时间我还想说话。',
    ];
    return messages[Random().nextInt(messages.length)];
  }

  String _morningMessage() {
    const messages = [
      '*伸懒腰* 早。',
      '天亮了。',
      '*揉眼睛* 你今天起得挺早。',
    ];
    return messages[Random().nextInt(messages.length)];
  }

  bool _randomChance(double probability) => randomChance(probability);
}
