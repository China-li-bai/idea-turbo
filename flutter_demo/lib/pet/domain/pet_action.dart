enum PetActionType {
  tiltHead,
  approach,
  retreat,
  curlUp,
  earTwitch,
  blink,
  yawn,
  stretch,
  zoneOut,
  tailWagFast,
  silent,
}

class PetAction {
  final PetActionType type;
  final String? displayText;
  final Duration duration;

  const PetAction({
    required this.type,
    this.displayText,
    this.duration = const Duration(seconds: 2),
  });

  static PetAction silent({String? text}) => PetAction(
        type: PetActionType.silent,
        displayText: text ?? '*沉默*',
        duration: const Duration(milliseconds: 1500),
      );
}

class ParsedResponse {
  final String text;
  final List<PetAction> actions;

  const ParsedResponse({required this.text, required this.actions});

  bool get hasActions => actions.isNotEmpty;

  bool get isActionOnly => text.trim().isEmpty && actions.isNotEmpty;
}

class ActionRegistry {
  static const Map<String, PetActionType> _keywordMap = {
    '歪头': PetActionType.tiltHead,
    '凑近': PetActionType.approach,
    '靠近': PetActionType.approach,
    '后退': PetActionType.retreat,
    '缩回': PetActionType.retreat,
    '退后': PetActionType.retreat,
    '蜷缩': PetActionType.curlUp,
    '耳朵动': PetActionType.earTwitch,
    '眨': PetActionType.blink,
    '哈欠': PetActionType.yawn,
    '伸懒腰': PetActionType.stretch,
    '发呆': PetActionType.zoneOut,
    '摇尾巴': PetActionType.tailWagFast,
    '打呼噜': PetActionType.tailWagFast,
  };

  static const Map<PetActionType, String> _displayTextMap = {
    PetActionType.tiltHead: '*歪头*',
    PetActionType.approach: '*凑近*',
    PetActionType.retreat: '*后退*',
    PetActionType.curlUp: '*蜷缩起来*',
    PetActionType.earTwitch: '*耳朵动了一下*',
    PetActionType.blink: '*眨眨眼*',
    PetActionType.yawn: '*打了个哈欠*',
    PetActionType.stretch: '*伸了个懒腰*',
    PetActionType.zoneOut: '*发呆*',
    PetActionType.tailWagFast: '*摇了摇尾巴*',
    PetActionType.silent: '*沉默*',
  };

  static PetActionType? resolveType(String actionText) {
    for (final entry in _keywordMap.entries) {
      if (actionText.contains(entry.key)) {
        return entry.value;
      }
    }
    return null;
  }

  static String displayTextFor(PetActionType type) =>
      _displayTextMap[type] ?? '*动作*';

  static String get actionPromptSection {
    final buffer = StringBuffer();
    buffer.writeln('可用动作：');
    for (final entry in _displayTextMap.entries) {
      if (entry.key == PetActionType.silent) continue;
      buffer.writeln('- ${entry.value}');
    }
    return buffer.toString();
  }
}

class ActionParser {
  static final _actionPattern = RegExp(r'\*([^*]+)\*');

  static ParsedResponse parse(String rawOutput) {
    final actions = <PetAction>[];
    final textParts = <String>[];

    for (final match in _actionPattern.allMatches(rawOutput)) {
      final actionText = match.group(1)!;
      final actionType = ActionRegistry.resolveType(actionText);

      if (actionType != null) {
        actions.add(PetAction(
          type: actionType,
          displayText: '*$actionText*',
        ));
      } else {
        textParts.add(actionText);
      }
    }

    var cleanText = rawOutput;
    for (final match in _actionPattern.allMatches(rawOutput)) {
      final actionText = match.group(1)!;
      final actionType = ActionRegistry.resolveType(actionText);
      if (actionType != null) {
        cleanText = cleanText.replaceFirst('*$actionText*', '').trim();
      }
    }

    return ParsedResponse(
      text: cleanText.isEmpty && textParts.isNotEmpty
          ? textParts.join(' ')
          : cleanText,
      actions: actions,
    );
  }
}
