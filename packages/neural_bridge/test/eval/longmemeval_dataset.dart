import 'dart:convert';
import 'dart:io';

enum LongMemEvalQuestionType {
  singleSessionUser,
  singleSessionAssistant,
  singleSessionPreference,
  temporalReasoning,
  knowledgeUpdate,
  multiSession,
}

class LongMemEvalTurn {
  final String role;
  final String content;
  final bool hasAnswer;

  const LongMemEvalTurn({
    required this.role,
    required this.content,
    this.hasAnswer = false,
  });

  factory LongMemEvalTurn.fromJson(Map<String, dynamic> json) => LongMemEvalTurn(
        role: json['role'] as String? ?? '',
        content: json['content'] as String? ?? '',
        hasAnswer: json['has_answer'] as bool? ?? false,
      );
}

class LongMemEvalInstance {
  final String questionId;
  final LongMemEvalQuestionType questionType;
  final String question;
  final dynamic answer;
  final String questionDate;
  final List<String> haystackDates;
  final List<String> haystackSessionIds;
  final List<List<LongMemEvalTurn>> haystackSessions;
  final List<String> answerSessionIds;

  const LongMemEvalInstance({
    required this.questionId,
    required this.questionType,
    required this.question,
    required this.answer,
    required this.questionDate,
    required this.haystackDates,
    required this.haystackSessionIds,
    required this.haystackSessions,
    required this.answerSessionIds,
  });

  bool get isAbstention => questionId.endsWith('_abs');

  String get answerText => answer?.toString() ?? '';

  int get totalTurns =>
      haystackSessions.fold(0, (sum, session) => sum + session.length);

  int get evidenceTurnCount => haystackSessions.fold(
      0,
      (sum, session) =>
          sum + session.where((t) => t.hasAnswer).length);

  List<LongMemEvalTurn> get evidenceTurns => haystackSessions
      .expand((s) => s)
      .where((t) => t.hasAnswer)
      .toList();

  String get fullConversationText => haystackSessions
      .map((session) => session
          .map((t) => '${t.role}: ${t.content}')
          .join('\n'))
      .join('\n---\n');

  factory LongMemEvalInstance.fromJson(Map<String, dynamic> json) {
    final typeStr = json['question_type'] as String? ?? '';
    final typeMap = <String, LongMemEvalQuestionType>{
      'single-session-user': LongMemEvalQuestionType.singleSessionUser,
      'single-session-assistant': LongMemEvalQuestionType.singleSessionAssistant,
      'single-session-preference': LongMemEvalQuestionType.singleSessionPreference,
      'temporal-reasoning': LongMemEvalQuestionType.temporalReasoning,
      'knowledge-update': LongMemEvalQuestionType.knowledgeUpdate,
      'multi-session': LongMemEvalQuestionType.multiSession,
    };

    final sessions = <List<LongMemEvalTurn>>[];
    for (final session in json['haystack_sessions'] as List? ?? []) {
      final turns = <LongMemEvalTurn>[];
      for (final turn in session as List) {
        turns.add(
            LongMemEvalTurn.fromJson(turn as Map<String, dynamic>));
      }
      sessions.add(turns);
    }

    return LongMemEvalInstance(
      questionId: json['question_id'] as String? ?? '',
      questionType: typeMap[typeStr] ?? LongMemEvalQuestionType.multiSession,
      question: json['question'] as String? ?? '',
      answer: json['answer'],
      questionDate: json['question_date'] as String? ?? '',
      haystackDates: (json['haystack_dates'] as List?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      haystackSessionIds: (json['haystack_session_ids'] as List?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      haystackSessions: sessions,
      answerSessionIds: (json['answer_session_ids'] as List?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
    );
  }
}

class LongMemEvalDataset {
  final List<LongMemEvalInstance> instances;
  final String variant;

  const LongMemEvalDataset({
    required this.instances,
    required this.variant,
  });

  int get totalInstances => instances.length;
  int get totalTurns => instances.fold(0, (sum, i) => sum + i.totalTurns);
  int get abstentionCount => instances.where((i) => i.isAbstention).length;

  Map<LongMemEvalQuestionType, int> get typeDistribution {
    final dist = <LongMemEvalQuestionType, int>{};
    for (final i in instances) {
      dist[i.questionType] = (dist[i.questionType] ?? 0) + 1;
    }
    return dist;
  }

  List<LongMemEvalInstance> byType(LongMemEvalQuestionType type) =>
      instances.where((i) => i.questionType == type).toList();

  List<LongMemEvalInstance> get nonAbstention =>
      instances.where((i) => !i.isAbstention).toList();

  static Future<LongMemEvalDataset> load({
    required String filePath,
    String variant = 'oracle',
  }) async {
    final file = File(filePath);
    if (!await file.exists()) {
      throw FileSystemException('LongMemEval data not found', filePath);
    }

    final content = await file.readAsString();
    final json = jsonDecode(content) as List;

    final instances = json
        .map((item) =>
            LongMemEvalInstance.fromJson(item as Map<String, dynamic>))
        .toList();

    return LongMemEvalDataset(instances: instances, variant: variant);
  }
}
