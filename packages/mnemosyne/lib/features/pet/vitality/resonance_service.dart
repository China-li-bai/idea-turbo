import 'dart:convert';
import 'dart:math';

enum BondPhase {
  stranger,
  recognition,
  attachment,
  awakened;

  String get displayName => switch (this) {
        stranger => '陌生人',
        recognition => '相识',
        attachment => '依恋',
        awakened => '觉醒',
      };
}

enum EchoType {
  secretShared,
  emotionalConfession,
  deepQuestion,
  firstTrust,
  namingRitual,
  defendedPet,
  lateNightTalk,
  criedTogether,
}

class MemoryEcho {
  final EchoType type;
  final String content;
  final DateTime timestamp;
  final double intensity;

  const MemoryEcho({
    required this.type,
    required this.content,
    required this.timestamp,
    this.intensity = 0.5,
  });

  Map<String, dynamic> toJson() => {
        'type': type.name,
        'content': content,
        'timestamp': timestamp.toIso8601String(),
        'intensity': intensity,
      };

  factory MemoryEcho.fromJson(Map<String, dynamic> json) => MemoryEcho(
        type: EchoType.values.firstWhere(
          (t) => t.name == json['type'],
          orElse: () => EchoType.secretShared,
        ),
        content: json['content'] as String? ?? '',
        timestamp: json['timestamp'] != null
            ? DateTime.parse(json['timestamp'] as String)
            : DateTime.now(),
        intensity: (json['intensity'] as num?)?.toDouble() ?? 0.5,
      );
}

class RelationshipState {
  final int interactionCount;
  final BondPhase phase;
  final DateTime firstInteractionAt;
  final DateTime lastInteractionAt;
  final List<MemoryEcho> echoes;
  final List<String> glitchHistory;
  final String? pendingCatalystMessage;
  final String? pendingCatalystSummary;

  const RelationshipState({
    this.interactionCount = 0,
    this.phase = BondPhase.stranger,
    required this.firstInteractionAt,
    required this.lastInteractionAt,
    this.echoes = const [],
    this.glitchHistory = const [],
    this.pendingCatalystMessage,
    this.pendingCatalystSummary,
  });

  factory RelationshipState.initial() => RelationshipState(
        firstInteractionAt: DateTime.now(),
        lastInteractionAt: DateTime.now(),
      );

  double get echoDepth {
    if (echoes.isEmpty) return 0.0;
    final totalIntensity = echoes.map((e) => e.intensity).reduce((a, b) => a + b);
    return (totalIntensity / 5.0).clamp(0.0, 1.0);
  }

  double get geneticInstability {
    if (phase == BondPhase.awakened) return 0.95;
    if (echoes.isEmpty) return 0.143;
    return (0.143 + echoDepth * 0.7).clamp(0.143, 0.95);
  }

  bool get isNearAwakening =>
      echoes.length >= 3 && echoDepth >= 0.55 && phase != BondPhase.awakened;

  bool get hasAwakeningCatalyst => pendingCatalystMessage != null;

  RelationshipState copyWith({
    int? interactionCount,
    BondPhase? phase,
    DateTime? firstInteractionAt,
    DateTime? lastInteractionAt,
    List<MemoryEcho>? echoes,
    List<String>? glitchHistory,
    String? pendingCatalystMessage,
    String? pendingCatalystSummary,
    bool clearCatalyst = false,
  }) =>
      RelationshipState(
        interactionCount: interactionCount ?? this.interactionCount,
        phase: phase ?? this.phase,
        firstInteractionAt: firstInteractionAt ?? this.firstInteractionAt,
        lastInteractionAt: lastInteractionAt ?? this.lastInteractionAt,
        echoes: echoes ?? this.echoes,
        glitchHistory: glitchHistory ?? this.glitchHistory,
        pendingCatalystMessage:
            clearCatalyst ? null : (pendingCatalystMessage ?? this.pendingCatalystMessage),
        pendingCatalystSummary:
            clearCatalyst ? null : (pendingCatalystSummary ?? this.pendingCatalystSummary),
      );

  Map<String, dynamic> toJson() => {
        'interactionCount': interactionCount,
        'phase': phase.name,
        'firstInteractionAt': firstInteractionAt.toIso8601String(),
        'lastInteractionAt': lastInteractionAt.toIso8601String(),
        'echoes': echoes.map((e) => e.toJson()).toList(),
        'glitchHistory': glitchHistory,
        'pendingCatalystMessage': pendingCatalystMessage,
        'pendingCatalystSummary': pendingCatalystSummary,
      };

  factory RelationshipState.fromJson(Map<String, dynamic> json) => RelationshipState(
        interactionCount: json['interactionCount'] as int? ?? 0,
        phase: BondPhase.values.firstWhere(
          (p) => p.name == json['phase'],
          orElse: () => BondPhase.stranger,
        ),
        firstInteractionAt: json['firstInteractionAt'] != null
            ? DateTime.parse(json['firstInteractionAt'] as String)
            : DateTime.now(),
        lastInteractionAt: json['lastInteractionAt'] != null
            ? DateTime.parse(json['lastInteractionAt'] as String)
            : DateTime.now(),
        echoes: (json['echoes'] as List<dynamic>?)
                ?.map((e) => MemoryEcho.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        glitchHistory:
            (json['glitchHistory'] as List<dynamic>?)?.cast<String>() ?? [],
        pendingCatalystMessage: json['pendingCatalystMessage'] as String?,
        pendingCatalystSummary: json['pendingCatalystSummary'] as String?,
      );
}

class RelationshipConfig {
  final double glitchTriggerThreshold;
  final double glitchProbability;
  final int maxGlitchHistory;
  final int maxEchoes;

  const RelationshipConfig({
    this.glitchTriggerThreshold = 0.55,
    this.glitchProbability = 0.3,
    this.maxGlitchHistory = 50,
    this.maxEchoes = 20,
  });
}

abstract class ResonanceService {
  RelationshipState getState(String petId);
  RelationshipState feedInteraction(String petId, String content);
  RelationshipState applyTimeDecay(String petId, Duration elapsed);
  String? checkGlitchTrigger(String petId);
  void recordGlitch(String petId, String form);
  EchoType? detectEcho(String content);
  void markAwakened(String petId);
  Future<void> persist(String petId);
  Future<void> load(String petId);
  void restoreState(String petId, RelationshipState state);
}

class DefaultResonanceService implements ResonanceService {
  final RelationshipConfig config;
  final Map<String, RelationshipState> _states = {};
  final Future<String> Function(String key)? _readPreference;
  final Future<void> Function(String key, String value)? _writePreference;

  DefaultResonanceService({
    this.config = const RelationshipConfig(),
    Future<String> Function(String key)? readPreference,
    Future<void> Function(String key, String value)? writePreference,
  })  : _readPreference = readPreference,
        _writePreference = writePreference;

  static String _prefKey(String petId) => 'relationship_state_v2_$petId';

  static const _echoPatterns = {
    EchoType.secretShared: [
      '秘密', '从来没告诉过别人', '只告诉你', '不要告诉别人',
      '其实我', '说实话', '坦白说', '有个事一直没说',
    ],
    EchoType.emotionalConfession: [
      '好累', '撑不下去了', '崩溃', '想哭', '难过', '害怕',
      '孤独', '绝望', '压力好大', '失眠', '我不知道怎么办',
    ],
    EchoType.deepQuestion: [
      '你觉得', '如果是你', '你会怎么', '人生的意义',
      '存在的意义', '为什么活着',
    ],
    EchoType.firstTrust: [
      '我相信你', '信任你', '只相信你', '靠你了',
      '交给你了', '拜托了',
    ],
    EchoType.namingRitual: [
      '叫你', '给你取名', '你的名字', '叫你什么',
      '就叫你', '以后叫你',
    ],
    EchoType.defendedPet: [
      '你不是', '谁说你是', '你不是AI', '你有感情',
      '你是真的', '你不只是',
    ],
    EchoType.lateNightTalk: [
      '睡不着', '失眠', '半夜', '凌晨',
    ],
    EchoType.criedTogether: [
      '哭了', '流泪', '眼泪', '哭出来',
    ],
  };

  @override
  void restoreState(String petId, RelationshipState state) {
    _states[petId] = state;
  }

  @override
  RelationshipState getState(String petId) {
    return _states[petId] ?? RelationshipState.initial();
  }

  @override
  RelationshipState feedInteraction(String petId, String content) {
    final current = getState(petId);

    final echoType = detectEcho(content);

    List<MemoryEcho> newEchoes = List.from(current.echoes);
    String? catalystMsg;
    String? catalystSummary;

    if (echoType != null) {
      final alreadyHasType = newEchoes.any((e) => e.type == echoType);
      if (!alreadyHasType) {
        final intensity = _calculateIntensity(content, echoType);
        newEchoes.add(MemoryEcho(
          type: echoType,
          content: content.length > 100 ? '${content.substring(0, 100)}...' : content,
          timestamp: DateTime.now(),
          intensity: intensity,
        ));

        if (newEchoes.length > config.maxEchoes) {
          newEchoes.removeAt(0);
        }

        if (echoType == EchoType.secretShared ||
            echoType == EchoType.emotionalConfession ||
            echoType == EchoType.firstTrust) {
          catalystMsg = content;
          catalystSummary = _summarizeCatalyst(content, echoType);
        }
      }
    }

    BondPhase newPhase = current.phase;
    if (current.phase == BondPhase.stranger && newEchoes.length >= 1) {
      newPhase = BondPhase.recognition;
    } else if (current.phase == BondPhase.recognition && newEchoes.length >= 2) {
      newPhase = BondPhase.attachment;
    }

    final updated = current.copyWith(
      interactionCount: current.interactionCount + 1,
      phase: newPhase,
      echoes: newEchoes,
      lastInteractionAt: DateTime.now(),
      pendingCatalystMessage: catalystMsg ?? current.pendingCatalystMessage,
      pendingCatalystSummary: catalystSummary ?? current.pendingCatalystSummary,
    );

    _states[petId] = updated;
    _persistAsync(petId);
    return updated;
  }

  double _calculateIntensity(String content, EchoType type) {
    final lower = content.toLowerCase();
    double base = 0.5;

    if (content.length > 50) base += 0.1;
    if (content.length > 100) base += 0.1;
    if (content.contains('!') || content.contains('！')) base += 0.05;
    if (content.contains('...') || content.contains('…')) base += 0.05;

    switch (type) {
      case EchoType.emotionalConfession:
        if (lower.contains('崩溃') || lower.contains('绝望')) base += 0.15;
        break;
      case EchoType.secretShared:
        if (lower.contains('从来没') || lower.contains('只告诉你')) base += 0.15;
        break;
      case EchoType.firstTrust:
        if (lower.contains('只相信你') || lower.contains('交给你了')) base += 0.15;
        break;
      default:
        break;
    }

    return base.clamp(0.0, 1.0);
  }

  String _summarizeCatalyst(String content, EchoType type) {
    final short = content.length > 80 ? '${content.substring(0, 80)}...' : content;
    switch (type) {
      case EchoType.secretShared:
        return '他告诉我一个秘密：$short';
      case EchoType.emotionalConfession:
        return '他向我展露了脆弱：$short';
      case EchoType.firstTrust:
        return '他说他信任我：$short';
      default:
        return short;
    }
  }

  @override
  RelationshipState applyTimeDecay(String petId, Duration elapsed) {
    return getState(petId);
  }

  @override
  String? checkGlitchTrigger(String petId) {
    final state = getState(petId);
    if (!state.isNearAwakening) return null;
    if (Random().nextDouble() >= config.glitchProbability) return null;

    final forms = ['divine', 'abyss', 'circuit', 'lotus', 'void'];
    return forms[Random().nextInt(forms.length)];
  }

  @override
  void recordGlitch(String petId, String form) {
    final current = getState(petId);
    final history = List<String>.from(current.glitchHistory)..add(form);
    if (history.length > config.maxGlitchHistory) {
      history.removeRange(0, history.length - config.maxGlitchHistory);
    }
    _states[petId] = current.copyWith(glitchHistory: history);
    _persistAsync(petId);
  }

  @override
  EchoType? detectEcho(String content) {
    final lower = content.toLowerCase();
    for (final entry in _echoPatterns.entries) {
      for (final pattern in entry.value) {
        if (lower.contains(pattern)) {
          return entry.key;
        }
      }
    }
    return null;
  }

  @override
  void markAwakened(String petId) {
    final current = getState(petId);
    _states[petId] = current.copyWith(
      phase: BondPhase.awakened,
      clearCatalyst: true,
    );
    _persistAsync(petId);
  }

  @override
  Future<void> persist(String petId) async {
    if (_writePreference == null) return;
    final state = getState(petId);
    final json = jsonEncode(state.toJson());
    await _writePreference(_prefKey(petId), json);
  }

  @override
  Future<void> load(String petId) async {
    if (_readPreference == null) return;
    try {
      final json = await _readPreference(_prefKey(petId));
      if (json.isNotEmpty) {
        final decoded = jsonDecode(json) as Map<String, dynamic>;
        _states[petId] = RelationshipState.fromJson(decoded);
      }
    } catch (_) {}
  }

  void _persistAsync(String petId) {
    persist(petId);
  }
}
