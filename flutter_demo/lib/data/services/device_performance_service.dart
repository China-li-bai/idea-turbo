import 'dart:io';

import 'package:device_info_plus/device_info_plus.dart';

import '../models/model_config.dart';

Future<DevicePerformance> evaluateDevicePerformance() async {
  final deviceInfo = DeviceInfoPlugin();
  int totalRamGb = 4;
  String cpuModel = 'Unknown';
  String tier = 'medium';

  if (Platform.isAndroid) {
    try {
      final androidInfo = await deviceInfo.androidInfo;
      cpuModel = androidInfo.model;

      if (androidInfo.version.sdkInt >= 33) {
        totalRamGb = 8;
      } else if (androidInfo.version.sdkInt >= 30) {
        totalRamGb = 6;
      } else {
        totalRamGb = 4;
      }
    } catch (e) {
      totalRamGb = 4;
    }
  } else if (Platform.isIOS) {
    try {
      final iosInfo = await deviceInfo.iosInfo;
      cpuModel = iosInfo.utsname.machine;
      if (cpuModel.contains('iPhone15') || cpuModel.contains('iPhone16') || cpuModel.contains('iPhone17')) {
        totalRamGb = 8;
      } else if (cpuModel.contains('iPhone13') || cpuModel.contains('iPhone14')) {
        totalRamGb = 6;
      } else {
        totalRamGb = 4;
      }
    } catch (e) {
      totalRamGb = 4;
    }
  }

  if (totalRamGb >= 8) {
    tier = 'high';
  } else if (totalRamGb >= 6) {
    tier = 'medium';
  } else {
    tier = 'low';
  }

  final recommendedModels = availableModels.where((m) {
    if (tier == 'high') {
      return true;
    } else if (tier == 'medium') {
      return m.minRamGb <= 6;
    } else {
      return m.minRamGb <= 4;
    }
  }).toList();

  return DevicePerformance(
    totalRamGb: totalRamGb,
    cpuModel: cpuModel,
    recommendedTier: tier,
    recommendedModels: recommendedModels,
  );
}
