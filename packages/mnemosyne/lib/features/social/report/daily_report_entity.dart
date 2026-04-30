class ChatHighlight {
  final String strangerName;
  final String strangerAvatar;
  final String petResponse;
  final String strangerMessage;
  final DateTime timestamp;
  final HighlightType type;
  final String? matchReason;

  const ChatHighlight({
    required this.strangerName,
    required this.strangerAvatar,
    required this.petResponse,
    required this.strangerMessage,
    required this.timestamp,
    required this.type,
    this.matchReason,
  });
}

enum HighlightType {
  wittyRebuttal,
  soulMatch,
  creepyBlock,
  funnyExchange,
  deepConversation,
}

class SoulMatchCandidate {
  final String userId;
  final String nickname;
  final String avatar;
  final double matchScore;
  final String mbtiType;
  final List<String> sharedInterests;
  final String matchReason;
  final String? contactCard;

  const SoulMatchCandidate({
    required this.userId,
    required this.nickname,
    required this.avatar,
    required this.matchScore,
    required this.mbtiType,
    this.sharedInterests = const [],
    required this.matchReason,
    this.contactCard,
  });
}

class DailyReport {
  final String id;
  final String petId;
  final DateTime date;
  final int totalApproaches;
  final int successfulRebuttals;
  final int soulMatches;
  final int creepyBlocks;
  final List<ChatHighlight> highlights;
  final List<SoulMatchCandidate> soulMatchCandidates;
  final String petMoodSummary;
  final String headline;
  final String shareText;

  const DailyReport({
    required this.id,
    required this.petId,
    required this.date,
    required this.totalApproaches,
    required this.successfulRebuttals,
    required this.soulMatches,
    required this.creepyBlocks,
    required this.highlights,
    required this.soulMatchCandidates,
    required this.petMoodSummary,
    required this.headline,
    required this.shareText,
  });
}

class ShareCardConfig {
  final String template;
  final String brandWatermark;
  final String downloadQrCodeUrl;
  final int maxHighlights;
  final bool includeAppDownloadLink;

  const ShareCardConfig({
    this.template = 'default',
    required this.brandWatermark,
    required this.downloadQrCodeUrl,
    this.maxHighlights = 3,
    this.includeAppDownloadLink = true,
  });
}

class ShareCard {
  final DailyReport report;
  final ShareCardConfig config;
  final String cardId;
  final DateTime generatedAt;

  const ShareCard({
    required this.report,
    required this.config,
    required this.cardId,
    required this.generatedAt,
  });

  String get shareTitle => report.headline;

  String get shareDescription {
    final buffer = StringBuffer();
    buffer.writeln(report.headline);
    buffer.writeln();
    buffer.writeln('📊 昨夜战报：');
    buffer.writeln('  • ${report.totalApproaches} 人搭讪');
    buffer.writeln('  • ${report.successfulRebuttals} 人被怼退');
    buffer.writeln('  • ${report.soulMatches} 位灵魂契合');
    if (report.highlights.isNotEmpty) {
      buffer.writeln();
      buffer.writeln('🔥 高能瞬间：');
      for (final h in report.highlights.take(config.maxHighlights)) {
        buffer.writeln('  "${h.petResponse}"');
      }
    }
    if (config.includeAppDownloadLink) {
      buffer.writeln();
      buffer.writeln('📱 ${config.brandWatermark}');
    }
    return buffer.toString();
  }
}
