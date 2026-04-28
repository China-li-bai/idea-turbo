import 'package:mnemosyne/features/xiang/xiang_context.dart';

abstract class XiangCaptureService {
  XiangContext capture({
    String? weather,
    String? temperature,
    String? activity,
    String? location,
    String? ambientMood,
    List<SensoryTag>? sensoryTags,
  });
}

class DefaultXiangCaptureService implements XiangCaptureService {
  @override
  XiangContext capture({
    String? weather,
    String? temperature,
    String? activity,
    String? location,
    String? ambientMood,
    List<SensoryTag>? sensoryTags,
  }) {
    return XiangContext(
      weather: weather,
      temperature: temperature,
      activity: activity,
      location: location,
      ambientMood: ambientMood,
      sensoryTags: sensoryTags ?? [],
      capturedAt: DateTime.now(),
    );
  }
}
