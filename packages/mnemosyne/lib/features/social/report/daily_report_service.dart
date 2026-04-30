import 'daily_report_entity.dart';

class ReportConfig {
  final Duration reportGenerationTime;
  final double soulMatchThreshold;
  final double creepyDetectionThreshold;
  final int maxHighlightsPerReport;
  final int maxSoulMatchesPerReport;

  const ReportConfig({
    this.reportGenerationTime = const Duration(hours: 6),
    this.soulMatchThreshold = 0.85,
    this.creepyDetectionThreshold = 0.7,
    this.maxHighlightsPerReport = 5,
    this.maxSoulMatchesPerReport = 3,
  });
}

class SocialInteractionRecord {
  final String id;
  final String strangerId;
  final String strangerName;
  final String strangerAvatar;
  final String strangerMbti;
  final List<String> messages;
  final String petResponse;
  final DateTime timestamp;
  final double matchScore;
  final double creepinessScore;
  final bool wasBlocked;
  final List<String> sharedInterests;

  const SocialInteractionRecord({
    required this.id,
    required this.strangerId,
    required this.strangerName,
    required this.strangerAvatar,
    required this.strangerMbti,
    required this.messages,
    required this.petResponse,
    required this.timestamp,
    required this.matchScore,
    required this.creepinessScore,
    required this.wasBlocked,
    required this.sharedInterests,
  });
}

abstract class DailyReportService {
  Future<DailyReport> generateReport(
    String petId,
    List<SocialInteractionRecord> interactions,
  );
  ShareCard generateShareCard(DailyReport report, ShareCardConfig config);
  List<DailyReport> getReportHistory(String petId);
}

class DefaultDailyReportService implements DailyReportService {
  final ReportConfig config;
  final Map<String, List<DailyReport>> _reportHistory = {};

  DefaultDailyReportService({this.config = const ReportConfig()});

  @override
  Future<DailyReport> generateReport(
    String petId,
    List<SocialInteractionRecord> interactions,
  ) async {
    final totalApproaches = interactions.length;
    final successfulRebuttals =
        interactions.where((i) => i.creepinessScore > config.creepyDetectionThreshold).length;
    final soulMatches = interactions
        .where((i) => i.matchScore >= config.soulMatchThreshold)
        .length;
    final creepyBlocks =
        interactions.where((i) => i.wasBlocked).length;

    final highlights = _extractHighlights(interactions);
    final soulMatchCandidates = _extractSoulMatches(interactions);

    final headline = _generateHeadline(
      totalApproaches: totalApproaches,
      successfulRebuttals: successfulRebuttals,
      soulMatches: soulMatches,
    );

    final shareText = _generateShareText(
      headline: headline,
      totalApproaches: totalApproaches,
      successfulRebuttals: successfulRebuttals,
      soulMatches: soulMatches,
      highlights: highlights,
    );

    final report = DailyReport(
      id: 'report_${petId}_${DateTime.now().millisecondsSinceEpoch}',
      petId: petId,
      date: DateTime.now(),
      totalApproaches: totalApproaches,
      successfulRebuttals: successfulRebuttals,
      soulMatches: soulMatches,
      creepyBlocks: creepyBlocks,
      highlights: highlights,
      soulMatchCandidates: soulMatchCandidates,
      petMoodSummary: _generateMoodSummary(interactions),
      headline: headline,
      shareText: shareText,
    );

    final history = _reportHistory[petId] ?? [];
    history.insert(0, report);
    _reportHistory[petId] = history;

    return report;
  }

  @override
  ShareCard generateShareCard(DailyReport report, ShareCardConfig config) {
    return ShareCard(
      report: report,
      config: config,
      cardId: 'card_${report.id}',
      generatedAt: DateTime.now(),
    );
  }

  @override
  List<DailyReport> getReportHistory(String petId) {
    return List.unmodifiable(_reportHistory[petId] ?? []);
  }

  List<ChatHighlight> _extractHighlights(
      List<SocialInteractionRecord> interactions) {
    final highlights = <ChatHighlight>[];

    for (final interaction in interactions) {
      if (interaction.creepinessScore > config.creepyDetectionThreshold &&
          !interaction.wasBlocked) {
        highlights.add(ChatHighlight(
          strangerName: interaction.strangerName,
          strangerAvatar: interaction.strangerAvatar,
          petResponse: interaction.petResponse,
          strangerMessage: interaction.messages.isNotEmpty
              ? interaction.messages.first
              : '',
          timestamp: interaction.timestamp,
          type: HighlightType.wittyRebuttal,
        ));
      }

      if (interaction.matchScore >= config.soulMatchThreshold) {
        highlights.add(ChatHighlight(
          strangerName: interaction.strangerName,
          strangerAvatar: interaction.strangerAvatar,
          petResponse: interaction.petResponse,
          strangerMessage: interaction.messages.isNotEmpty
              ? interaction.messages.first
              : '',
          timestamp: interaction.timestamp,
          type: HighlightType.soulMatch,
          matchReason: interaction.sharedInterests.isNotEmpty
              ? '你们都爱${interaction.sharedInterests.first}'
              : null,
        ));
      }

      if (highlights.length >= config.maxHighlightsPerReport) break;
    }

    return highlights;
  }

  List<SoulMatchCandidate> _extractSoulMatches(
      List<SocialInteractionRecord> interactions) {
    return interactions
        .where((i) => i.matchScore >= config.soulMatchThreshold)
        .take(config.maxSoulMatchesPerReport)
        .map((i) => SoulMatchCandidate(
              userId: i.strangerId,
              nickname: i.strangerName,
              avatar: i.strangerAvatar,
              matchScore: i.matchScore,
              mbtiType: i.strangerMbti,
              sharedInterests: i.sharedInterests,
              matchReason: i.sharedInterests.isNotEmpty
                  ? '你们都爱${i.sharedInterests.join('和')}，灵魂契合度${(i.matchScore * 100).toInt()}%'
                  : '灵魂契合度${(i.matchScore * 100).toInt()}%',
            ))
        .toList();
  }

  String _generateHeadline({
    required int totalApproaches,
    required int successfulRebuttals,
    required int soulMatches,
  }) {
    if (totalApproaches == 0) {
      return '🌙 昨晚你的宠物独自守夜，无人打扰';
    }
    if (soulMatches > 0 && successfulRebuttals > 0) {
      return '🔥 昨夜战报：怼退$successfulRebuttals人，捕获$soulMatches位灵魂伴侣！';
    }
    if (soulMatches > 0) {
      return '✨ 昨夜你的宠物为你筛选出$soulMatches位精神契合者！';
    }
    if (successfulRebuttals > 0) {
      return '⚔️ 昨夜战报：你的宠物成功怼退$successfulRebuttals个油腻搭讪！';
    }
    return '💤 昨晚共有$totalApproaches人向你的宠物搭讪';
  }

  String _generateShareText({
    required String headline,
    required int totalApproaches,
    required int successfulRebuttals,
    required int soulMatches,
    required List<ChatHighlight> highlights,
  }) {
    final buffer = StringBuffer();
    buffer.writeln(headline);
    buffer.writeln();
    buffer.writeln('📊 数据概览：');
    buffer.writeln('  搭讪数：$totalApproaches');
    buffer.writeln('  怼退数：$successfulRebuttals');
    buffer.writeln('  灵魂匹配：$soulMatches');
    if (highlights.isNotEmpty) {
      buffer.writeln();
      buffer.writeln('💬 高能瞬间：');
      for (final h in highlights.take(2)) {
        buffer.writeln('  "${h.petResponse}"');
      }
    }
    return buffer.toString();
  }

  String _generateMoodSummary(List<SocialInteractionRecord> interactions) {
    if (interactions.isEmpty) return '平静';
    final avgMatch = interactions
            .map((i) => i.matchScore)
            .reduce((a, b) => a + b) /
        interactions.length;
    final avgCreep = interactions
            .map((i) => i.creepinessScore)
            .reduce((a, b) => a + b) /
        interactions.length;

    if (avgMatch > 0.7) return '开心！遇到了很多有趣的人';
    if (avgCreep > 0.5) return '有点累...遇到了一些奇怪的人';
    return '还行吧，平平无奇的一晚';
  }
}
