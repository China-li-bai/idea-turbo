import 'package:mnemosyne/features/xiang/xiang_context.dart';

abstract class XiangCaptureService {
  XiangContext capture({
    String? weather,
    String? temperature,
    String? activity,
    String? location,
    String? ambientMood,
    String? innerState,
    String? relationshipState,
    String? eventShape,
    String? changeSignal,
    List<SensoryTag>? sensoryTags,
    List<SensoryTag>? recallCues,
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
    String? innerState,
    String? relationshipState,
    String? eventShape,
    String? changeSignal,
    List<SensoryTag>? sensoryTags,
    List<SensoryTag>? recallCues,
  }) {
    return XiangContext(
      weather: weather,
      temperature: temperature,
      activity: activity,
      location: location,
      ambientMood: ambientMood,
      innerState: innerState,
      relationshipState: relationshipState,
      eventShape: eventShape,
      changeSignal: changeSignal,
      sensoryTags: sensoryTags ?? [],
      recallCues: recallCues ?? [],
      capturedAt: DateTime.now(),
    );
  }
}
