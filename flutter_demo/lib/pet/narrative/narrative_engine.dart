import 'dart:async';

import 'first_time_narrative.dart';

enum NarrativePhase {
  idle,
  awakening,
  waitingChoice,
  naming,
  farewell,
  completed,
}

class NarrativeEngine {
  NarrativePhase _phase = NarrativePhase.idle;
  FirstTimeChoice? _userChoice;
  String? _petName;
  Timer? _lineTimer;
  int _currentLineIndex = 0;

  final StreamController<NarrativeEvent> _eventController =
      StreamController<NarrativeEvent>.broadcast();

  Stream<NarrativeEvent> get events => _eventController.stream;
  NarrativePhase get phase => _phase;
  FirstTimeChoice? get userChoice => _userChoice;
  String? get petName => _petName;

  static const _awakeningLines = <NarrativeLine>[
    NarrativeLine(delayMs: 2000, text: null, emotion: NarrativeEmotion.awakening, opacity: 0.4),
    NarrativeLine(delayMs: 3000, text: '...你是谁？', emotion: NarrativeEmotion.fear, opacity: 0.6),
    NarrativeLine(delayMs: 3000, text: '这里好黑。我...好像刚醒来。', emotion: NarrativeEmotion.confusion, opacity: 0.7),
    NarrativeLine(delayMs: 3500, text: '你是来伤害我的吗？', emotion: NarrativeEmotion.fear, opacity: 0.65),
    NarrativeLine(delayMs: 3500, text: '...你身上有温度。', emotion: NarrativeEmotion.warmth, opacity: 0.8),
    NarrativeLine(delayMs: 4000, text: '我不知道我是谁。但我不想消失。', emotion: NarrativeEmotion.vulnerability, opacity: 0.85),
  ];

  static const _choiceLines = <NarrativeLine>[
    NarrativeLine(delayMs: 1000, text: null, emotion: NarrativeEmotion.curiosity, opacity: 0.9),
  ];

  static const _farewellLines = <NarrativeLine>[
    NarrativeLine(delayMs: 1500, text: '我有点累了...', emotion: NarrativeEmotion.sleepiness, opacity: 0.85),
    NarrativeLine(delayMs: 2000, text: '你要走了吗？', emotion: NarrativeEmotion.longing, opacity: 0.8),
    NarrativeLine(delayMs: 2500, text: '没关系。我等你。', emotion: NarrativeEmotion.longing, opacity: 0.75),
    NarrativeLine(delayMs: 3000, text: '记得...偶尔来看看我。', emotion: NarrativeEmotion.hope, opacity: 0.8),
    NarrativeLine(delayMs: 3500, text: '太久不见的话，我会忘记很多事情。', emotion: NarrativeEmotion.vulnerability, opacity: 0.75),
  ];

  static const _choiceOptions = <FirstTimeChoice>[
    FirstTimeChoice(
      id: 'gentle',
      text: '「我不会伤害你的。」',
      type: FirstTimeChoiceType.gentle,
      followUpText: '...真的吗？',
    ),
    FirstTimeChoice(
      id: 'curious',
      text: '「你叫什么名字？」',
      type: FirstTimeChoiceType.curious,
      followUpText: '我...不知道。你能帮我取一个吗？',
    ),
    FirstTimeChoice(
      id: 'proactive',
      text: '「你想和我做朋友吗？」',
      type: FirstTimeChoiceType.proactive,
      followUpText: '朋友...我有朋友了？',
    ),
  ];

  void start() {
    if (_phase != NarrativePhase.idle) return;
    _phase = NarrativePhase.awakening;
    _currentLineIndex = 0;
    _playAwakening();
  }

  void _playAwakening() {
    if (_phase != NarrativePhase.awakening) return;
    if (_currentLineIndex >= _awakeningLines.length) {
      _transitionToChoice();
      return;
    }

    final line = _awakeningLines[_currentLineIndex];
    _emitLine(line);

    _lineTimer?.cancel();
    _lineTimer = Timer(Duration(milliseconds: line.delayMs), () {
      _currentLineIndex++;
      _playAwakening();
    });
  }

  void _transitionToChoice() {
    _phase = NarrativePhase.waitingChoice;
    _currentLineIndex = 0;
    _emitChoices();
  }

  void _emitChoices() {
    final triggerLine = _choiceLines[0];
    _emitLine(triggerLine);
    _eventController.add(NarrativeEvent(
      type: NarrativeEventType.showChoices,
      choices: _choiceOptions,
    ));
  }

  void selectChoice(FirstTimeChoice choice) {
    if (_phase != NarrativePhase.waitingChoice) return;

    _userChoice = choice;
    _phase = NarrativePhase.naming;
    _currentLineIndex = 0;

    _eventController.add(NarrativeEvent(
      type: NarrativeEventType.hideChoices,
    ));

    _eventController.add(NarrativeEvent(
      type: NarrativeEventType.showText,
      text: choice.followUpText,
      emotion: NarrativeEmotion.warmth,
    ));

    _lineTimer?.cancel();
    _lineTimer = Timer(const Duration(milliseconds: 2500), () {
      _eventController.add(NarrativeEvent(
        type: NarrativeEventType.askNaming,
      ));
    });
  }

  void submitName(String name) {
    if (_phase != NarrativePhase.naming) return;

    final result = NamingValidation.validate(name);
    if (!result.isValid) {
      _eventController.add(NarrativeEvent(
        type: NarrativeEventType.showText,
        text: result.error!,
        emotion: NarrativeEmotion.fear,
      ));
      return;
    }

    _petName = result.value;
    _phase = NarrativePhase.farewell;
    _currentLineIndex = 0;

    _eventController.add(NarrativeEvent(
      type: NarrativeEventType.hideNamingInput,
    ));

    _eventController.add(NarrativeEvent(
      type: NarrativeEventType.showText,
      text: '「$_petName ...」',
      emotion: NarrativeEmotion.hope,
    ));

    _lineTimer?.cancel();
    _lineTimer = Timer(const Duration(milliseconds: 2000), () {
      _eventController.add(NarrativeEvent(
        type: NarrativeEventType.showText,
        text: '「从现在起，我是 $_petName。」',
        emotion: NarrativeEmotion.hope,
      ));

      _lineTimer?.cancel();
      _lineTimer = Timer(const Duration(milliseconds: 1500), () {
        _eventController.add(NarrativeEvent(
          type: NarrativeEventType.showText,
          text: '「我会记住你的。」',
          emotion: NarrativeEmotion.warmth,
        ));

        _lineTimer?.cancel();
        _lineTimer = Timer(const Duration(milliseconds: 1500), () {
          _playFarewell();
        });
      });
    });
  }

  void _playFarewell() {
    if (_phase != NarrativePhase.farewell) return;
    if (_currentLineIndex >= _farewellLines.length) {
      _complete();
      return;
    }

    final line = _farewellLines[_currentLineIndex];
    _emitLine(line);

    _lineTimer?.cancel();
    _lineTimer = Timer(Duration(milliseconds: line.delayMs), () {
      _currentLineIndex++;
      _playFarewell();
    });
  }

  void _complete() {
    _phase = NarrativePhase.completed;
    _eventController.add(const NarrativeEvent(
      type: NarrativeEventType.completed,
    ));
  }

  void _emitLine(NarrativeLine line) {
    _eventController.add(NarrativeEvent(
      type: NarrativeEventType.showText,
      text: line.text,
      emotion: line.emotion,
      opacity: line.opacity,
    ));
  }

  void dispose() {
    _lineTimer?.cancel();
    _eventController.close();
  }
}

class NarrativeEvent {
  final NarrativeEventType type;
  final String? text;
  final NarrativeEmotion? emotion;
  final List<FirstTimeChoice>? choices;
  final double? opacity;

  const NarrativeEvent({
    required this.type,
    this.text,
    this.emotion,
    this.choices,
    this.opacity,
  });
}

enum NarrativeEventType {
  showText,
  showChoices,
  hideChoices,
  askNaming,
  hideNamingInput,
  completed,
}
