import 'package:mnemosyne/features/social/report/daily_report_entity.dart';

enum SharePlatform {
  wechat,
  weibo,
  xiaohongshu,
  douyin,
  qq,
  link,
}

class ShareContent {
  final String title;
  final String description;
  final String? imageUrl;
  final String? webUrl;
  final SharePlatform platform;
  final String? appWatermark;
  final String? downloadQrCodeUrl;

  const ShareContent({
    required this.title,
    required this.description,
    this.imageUrl,
    this.webUrl,
    required this.platform,
    this.appWatermark,
    this.downloadQrCodeUrl,
  });
}

class ShareResult {
  final bool success;
  final SharePlatform platform;
  final String? shareId;
  final String? error;
  final DateTime sharedAt;

  const ShareResult({
    required this.success,
    required this.platform,
    this.shareId,
    this.error,
    required this.sharedAt,
  });
}

abstract class ShareService {
  Future<ShareResult> share(ShareContent content);
  Future<ShareResult> shareDailyReport(DailyReport report, SharePlatform platform);
  Future<ShareResult> shareChatHighlight(ChatHighlight highlight, SharePlatform platform);
  Future<String> generateShareImage(DailyReport report);
  Future<String> generateHighlightImage(ChatHighlight highlight);
}

class StubShareService implements ShareService {
  @override
  Future<ShareResult> share(ShareContent content) async {
    return ShareResult(
      success: true,
      platform: content.platform,
      shareId: 'share_${DateTime.now().millisecondsSinceEpoch}',
      sharedAt: DateTime.now(),
    );
  }

  @override
  Future<ShareResult> shareDailyReport(DailyReport report, SharePlatform platform) async {
    return share(ShareContent(
      title: report.headline,
      description: report.shareText,
      platform: platform,
    ));
  }

  @override
  Future<ShareResult> shareChatHighlight(ChatHighlight highlight, SharePlatform platform) async {
    return share(ShareContent(
      title: '我的宠物高能瞬间！',
      description: '"${highlight.petResponse}"',
      platform: platform,
    ));
  }

  @override
  Future<String> generateShareImage(DailyReport report) async {
    return 'stub://share_image_${report.id}';
  }

  @override
  Future<String> generateHighlightImage(ChatHighlight highlight) async {
    return 'stub://highlight_image_${highlight.petResponse.hashCode.abs()}';
  }
}
