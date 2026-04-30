import 'dart:convert';
import 'dart:io';

class LoCoMoMessage {
  final String speaker;
  final String diaId;
  final String text;

  const LoCoMoMessage({
    required this.speaker,
    required this.diaId,
    required this.text,
  });

  factory LoCoMoMessage.fromJson(Map<String, dynamic> json) => LoCoMoMessage(
        speaker: json['speaker'] as String? ?? '',
        diaId: json['dia_id'] as String? ?? '',
        text: json['text'] as String? ?? '',
      );
}

class LoCoMoQA {
  final String question;
  final dynamic answer;
  final dynamic evidence;
  final int category;

  const LoCoMoQA({
    required this.question,
    required this.answer,
    required this.evidence,
    required this.category,
  });

  factory LoCoMoQA.fromJson(Map<String, dynamic> json) => LoCoMoQA(
        question: json['question'] as String? ?? '',
        answer: json['answer'],
        evidence: json['evidence'],
        category: json['category'] as int? ?? 0,
      );

  static String categoryLabel(int cat) {
    switch (cat) {
      case 1:
        return 'single_hop';
      case 2:
        return 'multi_hop';
      case 3:
        return 'temporal';
      case 4:
        return 'open_domain';
      case 5:
        return 'adversarial';
      default:
        return 'unknown';
    }
  }
}

class LoCoMoConversation {
  final String sampleId;
  final String speakerA;
  final String speakerB;
  final Map<String, List<LoCoMoMessage>> sessions;
  final Map<String, String> sessionTimestamps;
  final List<LoCoMoQA> qa;

  const LoCoMoConversation({
    required this.sampleId,
    required this.speakerA,
    required this.speakerB,
    required this.sessions,
    required this.sessionTimestamps,
    required this.qa,
  });

  int get totalMessages =>
      sessions.values.fold(0, (sum, msgs) => sum + msgs.length);

  int get sessionCount => sessions.length;

  List<LoCoMoMessage> get allMessages {
    final sorted = sessions.entries.toList()
      ..sort((a, b) {
        final numA = int.tryParse(a.key.replaceAll('session_', '')) ?? 0;
        final numB = int.tryParse(b.key.replaceAll('session_', '')) ?? 0;
        return numA.compareTo(numB);
      });
    return sorted.expand((e) => e.value).toList();
  }
}

class LoCoMoDataset {
  final List<LoCoMoConversation> conversations;

  const LoCoMoDataset({required this.conversations});

  int get totalConversations => conversations.length;

  int get totalQA =>
      conversations.fold(0, (sum, c) => sum + c.qa.length);

  int get totalMessages =>
      conversations.fold(0, (sum, c) => sum + c.totalMessages);

  Map<String, int> get qaCategoryCounts {
    final counts = <String, int>{};
    for (final conv in conversations) {
      for (final q in conv.qa) {
        final label = LoCoMoQA.categoryLabel(q.category);
        counts[label] = (counts[label] ?? 0) + 1;
      }
    }
    return counts;
  }

  List<LoCoMoQA> get qaByCategory {
    final all = <LoCoMoQA>[];
    for (final conv in conversations) {
      all.addAll(conv.qa);
    }
    return all;
  }

  List<LoCoMoQA> qaForCategory(int category) =>
      qaByCategory.where((q) => q.category == category).toList();

  static Future<LoCoMoDataset> load(String jsonPath) async {
    final file = File(jsonPath);
    if (!await file.exists()) {
      throw FileSystemException('LoCoMo dataset not found', jsonPath);
    }

    final content = await file.readAsString();
    final jsonList = jsonDecode(content) as List;

    final conversations = <LoCoMoConversation>[];
    for (final item in jsonList) {
      final map = item as Map<String, dynamic>;
      final conv = _parseConversation(map);
      conversations.add(conv);
    }

    return LoCoMoDataset(conversations: conversations);
  }

  static LoCoMoConversation _parseConversation(Map<String, dynamic> map) {
    final sampleId = map['sample_id'] as String? ?? '';

    final convData = map['conversation'] as Map<String, dynamic>? ?? {};
    final speakerA = convData['speaker_a'] as String? ?? '';
    final speakerB = convData['speaker_b'] as String? ?? '';

    final sessions = <String, List<LoCoMoMessage>>{};
    final timestamps = <String, String>{};

    for (final key in convData.keys) {
      if (key.startsWith('session_') && !key.endsWith('date_time')) {
        final sessionData = convData[key];
        if (sessionData is List) {
          sessions[key] = sessionData
              .map((m) => LoCoMoMessage.fromJson(m as Map<String, dynamic>))
              .toList();
        }
      }
      if (key.startsWith('session_') && key.endsWith('date_time')) {
        timestamps[key] = convData[key] as String? ?? '';
      }
    }

    final qaList = <LoCoMoQA>[];
    if (map['qa'] is List) {
      for (final q in map['qa'] as List) {
        qaList.add(LoCoMoQA.fromJson(q as Map<String, dynamic>));
      }
    }

    return LoCoMoConversation(
      sampleId: sampleId,
      speakerA: speakerA,
      speakerB: speakerB,
      sessions: sessions,
      sessionTimestamps: timestamps,
      qa: qaList,
    );
  }
}
