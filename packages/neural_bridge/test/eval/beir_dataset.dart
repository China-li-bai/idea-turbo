import 'dart:convert';
import 'dart:io';

class BeirDocument {
  final String id;
  final String title;
  final String text;

  const BeirDocument({
    required this.id,
    required this.title,
    required this.text,
  });

  String get fullText => title.isNotEmpty ? '$title. $text' : text;

  factory BeirDocument.fromJson(Map<String, dynamic> json) => BeirDocument(
        id: json['_id'] as String? ?? '',
        title: json['title'] as String? ?? '',
        text: json['text'] as String? ?? '',
      );
}

class BeirQuery {
  final String id;
  final String text;

  const BeirQuery({required this.id, required this.text});

  factory BeirQuery.fromJson(Map<String, dynamic> json) => BeirQuery(
        id: json['_id'] as String? ?? '',
        text: json['text'] as String? ?? '',
      );
}

class BeirQRel {
  final String queryId;
  final String corpusId;
  final int score;

  const BeirQRel({
    required this.queryId,
    required this.corpusId,
    required this.score,
  });
}

class BeirDataset {
  final String name;
  final Map<String, BeirDocument> corpus;
  final Map<String, BeirQuery> queries;
  final Map<String, List<BeirQRel>> qrels;

  const BeirDataset({
    required this.name,
    required this.corpus,
    required this.queries,
    required this.qrels,
  });

  int get corpusSize => corpus.length;
  int get queryCount => queries.length;
  int get qrelCount => qrels.values.fold(0, (sum, list) => sum + list.length);

  List<String> relevantDocIdsForQuery(String queryId) =>
      qrels[queryId]
          ?.where((r) => r.score > 0)
          .map((r) => r.corpusId)
          .toList() ??
      [];

  static Future<BeirDataset> load({
    required String name,
    required String dataDir,
    String split = 'test',
  }) async {
    final corpusFile = File('$dataDir/corpus.jsonl');
    final queriesFile = File('$dataDir/queries.jsonl');
    final qrelsFile = File('$dataDir/qrels/$split.tsv');

    if (!await corpusFile.exists()) {
      throw FileSystemException('BEIR corpus not found', corpusFile.path);
    }
    if (!await queriesFile.exists()) {
      throw FileSystemException('BEIR queries not found', queriesFile.path);
    }
    if (!await qrelsFile.exists()) {
      throw FileSystemException('BEIR qrels not found', qrelsFile.path);
    }

    final corpus = <String, BeirDocument>{};
    await for (final line in corpusFile.openRead()
        .transform(utf8.decoder)
        .transform(const LineSplitter())) {
      if (line.trim().isEmpty) continue;
      final doc = BeirDocument.fromJson(
          jsonDecode(line) as Map<String, dynamic>);
      corpus[doc.id] = doc;
    }

    final queries = <String, BeirQuery>{};
    await for (final line in queriesFile.openRead()
        .transform(utf8.decoder)
        .transform(const LineSplitter())) {
      if (line.trim().isEmpty) continue;
      final q = BeirQuery.fromJson(
          jsonDecode(line) as Map<String, dynamic>);
      queries[q.id] = q;
    }

    final qrels = <String, List<BeirQRel>>{};
    final qrelsContent = await qrelsFile.readAsString();
    for (final line in qrelsContent.split('\n')) {
      if (line.trim().isEmpty) continue;
      final parts = line.split('\t');
      if (parts.length < 3) continue;
      if (parts[0] == 'query-id') continue;

      final rel = BeirQRel(
        queryId: parts[0].trim(),
        corpusId: parts[1].trim(),
        score: int.tryParse(parts[2].trim()) ?? 0,
      );
      qrels.putIfAbsent(rel.queryId, () => []);
      qrels[rel.queryId]!.add(rel);
    }

    return BeirDataset(
      name: name,
      corpus: corpus,
      queries: queries,
      qrels: qrels,
    );
  }
}
