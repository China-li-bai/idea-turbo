import 'dart:convert';
import 'dart:io';

class MemBenchMessage {
  final int mid;
  final String message;
  final String time;
  final String place;

  const MemBenchMessage({
    required this.mid,
    required this.message,
    required this.time,
    required this.place,
  });

  factory MemBenchMessage.fromJson(Map<String, dynamic> json) => MemBenchMessage(
        mid: json['mid'] as int? ?? json['sid'] as int? ?? 0,
        message: json['message'] as String? ??
            '${json['user_message'] as String? ?? ''} ${json['assistant_message'] as String? ?? ''}'.trim(),
        time: json['time'] as String? ?? '',
        place: json['place'] as String? ?? '',
      );
}

class MemBenchQA {
  final int qid;
  final String question;
  final dynamic answer;
  final List<int> targetStepIds;
  final dynamic choices;
  final String groundTruth;
  final String time;

  const MemBenchQA({
    required this.qid,
    required this.question,
    required this.answer,
    required this.targetStepIds,
    this.choices,
    required this.groundTruth,
    required this.time,
  });

  String get answerText {
    if (answer is String) return answer as String;
    if (answer is List) return (answer as List).join('; ');
    return answer?.toString() ?? '';
  }

  factory MemBenchQA.fromJson(Map<String, dynamic> json) => MemBenchQA(
        qid: json['qid'] as int? ?? 0,
        question: json['question'] as String? ?? '',
        answer: json['answer'],
        targetStepIds: _parseIntList(json['target_step_id']),
        choices: json['choices'],
        groundTruth: json['ground_truth'] as String? ?? '',
        time: json['time'] as String? ?? '',
      );
}

class MemBenchItem {
  final int tid;
  final List<MemBenchMessage> messageList;
  final MemBenchQA qa;

  const MemBenchItem({
    required this.tid,
    required this.messageList,
    required this.qa,
  });

  factory MemBenchItem.fromJson(Map<String, dynamic> json) => MemBenchItem(
        tid: json['tid'] as int? ?? 0,
        messageList: _parseMessageList(json['message_list']),
        qa: MemBenchQA.fromJson(json['QA'] as Map<String, dynamic>? ?? {}),
      );
}

List<int> _parseIntList(dynamic raw) {
  if (raw is! List) return [];
  final result = <int>[];
  for (final item in raw) {
    if (item is int) {
      result.add(item);
    } else if (item is List) {
      result.addAll(_parseIntList(item));
    }
  }
  return result;
}

List<MemBenchMessage> _parseMessageList(dynamic raw) {
  if (raw is! List) return [];

  if (raw.isEmpty) return [];

  final first = raw.first;
  if (first is Map<String, dynamic>) {
    return raw
        .map((m) => MemBenchMessage.fromJson(m as Map<String, dynamic>))
        .toList();
  }

  if (first is List) {
    final flat = <MemBenchMessage>[];
    int midCounter = 0;
    for (final session in raw) {
      if (session is! List) continue;
      for (final turn in session) {
        if (turn is Map<String, dynamic>) {
          flat.add(MemBenchMessage.fromJson({
            'mid': midCounter++,
            ...turn,
          }));
        }
      }
    }
    return flat;
  }

  return [];
}

enum MemBenchCategory {
  roles,
  events,
  items,
  places,
  hybrid,
  movie,
  food,
  book,
  multiAgent,
}

enum MemBenchDifficulty {
  simple,
  noisy,
  conditional,
  comparative,
  aggregative,
  highlevel,
  highlevelRec,
  lowlevelRec,
  knowledgeUpdate,
  postProcessing,
  recMultiSession,
}

class MemBenchDataset {
  final Map<MemBenchCategory, Map<MemBenchDifficulty, List<MemBenchItem>>> data;

  const MemBenchDataset({required this.data});

  int get totalItems =>
      data.values.fold(0, (sum, diffMap) =>
          sum + diffMap.values.fold(0, (s, items) => s + items.length));

  int get totalMessages => data.values.fold(
      0,
      (sum, diffMap) => sum +
          diffMap.values.fold(
              0, (s, items) => s + items.fold(0, (s2, i) => s2 + i.messageList.length)));

  static Future<MemBenchDataset> load(String baseDir) async {
    final data = <MemBenchCategory, Map<MemBenchDifficulty, List<MemBenchItem>>>{};

    final categoryMap = <String, MemBenchCategory>{
      'roles': MemBenchCategory.roles,
      'events': MemBenchCategory.events,
      'items': MemBenchCategory.items,
      'places': MemBenchCategory.places,
      'hybrid': MemBenchCategory.hybrid,
      'movie': MemBenchCategory.movie,
      'food': MemBenchCategory.food,
      'book': MemBenchCategory.book,
      'multi_agent': MemBenchCategory.multiAgent,
    };

    final difficultyMap = <String, MemBenchDifficulty>{
      'simple': MemBenchDifficulty.simple,
      'noisy': MemBenchDifficulty.noisy,
      'conditional': MemBenchDifficulty.conditional,
      'comparative': MemBenchDifficulty.comparative,
      'aggregative': MemBenchDifficulty.aggregative,
      'highlevel': MemBenchDifficulty.highlevel,
      'highlevel_rec': MemBenchDifficulty.highlevelRec,
      'lowlevel_rec': MemBenchDifficulty.lowlevelRec,
      'knowledge_update': MemBenchDifficulty.knowledgeUpdate,
      'post_processing': MemBenchDifficulty.postProcessing,
      'RecMultiSession': MemBenchDifficulty.recMultiSession,
    };

    for (final agentDir in ['ThirdAgent', 'FirstAgent']) {
      final dir = Directory('$baseDir/MemData/$agentDir');
      if (!await dir.exists()) continue;

      await for (final file in dir.list()) {
        if (file is! File || !file.path.endsWith('.json')) continue;

        final fileName =
            file.path.split('/').last.replaceAll('.json', '');
        final difficulty = difficultyMap[fileName];

        if (difficulty == null) continue;

        final content = await file.readAsString();
        final json = jsonDecode(content) as Map<String, dynamic>;

        for (final catEntry in categoryMap.entries) {
          final catData = json[catEntry.key];
          if (catData is! List) continue;

          data.putIfAbsent(catEntry.value, () => {});
          data[catEntry.value]!.putIfAbsent(difficulty, () => []);

          for (final item in catData) {
            data[catEntry.value]![difficulty]!
                .add(MemBenchItem.fromJson(item as Map<String, dynamic>));
          }
        }
      }
    }

    return MemBenchDataset(data: data);
  }

  List<MemBenchItem> itemsForCategory(MemBenchCategory category) =>
      data[category]?.values.expand((items) => items).toList() ?? [];

  List<MemBenchItem> itemsForDifficulty(MemBenchDifficulty difficulty) =>
      data.values
          .where((diffMap) => diffMap.containsKey(difficulty))
          .expand((diffMap) => diffMap[difficulty]!)
          .toList();
}
