import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:mnemosyne/mnemosyne.dart';

void main() {
  group('Xiang first-class recall', () {
    late Directory tempDir;
    late Mnemosyne mnemosyne;

    setUp(() async {
      tempDir = await Directory.systemTemp.createTemp('mnemosyne_xiang_');
      mnemosyne = Mnemosyne(
        xiangPlugin: XiangPlugin(),
        directoryOverride: tempDir.path,
      );
      await mnemosyne.initialize();
    });

    tearDown(() async {
      await mnemosyne.close();
      if (tempDir.existsSync()) {
        await tempDir.delete(recursive: true);
      }
    });

    test(
      'recallByXiang surfaces strong scene memory without embeddings',
      () async {
        await mnemosyne.remember(
          content: '用户在雨夜说自己不想回任何人的消息',
          importance: 0.8,
          weather: 'rainy',
          activity: 'chatting',
          location: 'bedroom',
          ambientMood: 'quiet',
          innerState: 'lonely',
          relationshipState: 'trusting_owner',
          eventShape: 'emotional_confession',
          changeSignal: 'becoming_closer',
          recallCues: const [
            SensoryTag(category: 'weatherCue', value: 'rainy'),
            SensoryTag(category: 'phrase', value: '不想回消息'),
          ],
        );

        await mnemosyne.remember(
          content: '用户午饭时提到想试一家新的餐厅',
          importance: 0.6,
          weather: 'sunny',
          activity: 'eating',
          location: 'restaurant',
          innerState: 'curious',
          eventShape: 'preference',
        );

        final results = await mnemosyne.recallByXiang(
          currentXiangContext: XiangContext(
            weather: 'rainy',
            activity: 'chatting',
            location: 'bedroom',
            ambientMood: 'quiet',
            innerState: 'lonely',
            relationshipState: 'trusting_owner',
            eventShape: 'emotional_confession',
            changeSignal: 'becoming_closer',
            recallCues: const [
              SensoryTag(category: 'weatherCue', value: 'rainy'),
              SensoryTag(category: 'phrase', value: '今晚不想回消息'),
            ],
            capturedAt: DateTime(2026, 5, 28, 23),
          ),
        );

        expect(results, isNotEmpty);
        expect(results.first.memory.content, contains('雨夜'));
        expect(results.first.contextMatchScore, greaterThan(0.6));
      },
    );

    test('recall uses xiang path when query embedding is missing', () async {
      await mnemosyne.remember(
        content: '用户在深夜把宠物叫作小灯，这是一次命名仪式',
        importance: 0.9,
        activity: 'naming',
        ambientMood: 'peaceful',
        innerState: 'warm',
        relationshipState: 'bonding',
        eventShape: 'naming_ritual',
        changeSignal: 'becoming_closer',
        recallCues: const [
          SensoryTag(category: 'phrase', value: '小灯'),
          SensoryTag(category: 'timeCue', value: 'night'),
        ],
      );

      final results = await mnemosyne.recall(
        query: 'unrelated text',
        currentXiangContext: XiangContext(
          activity: 'naming',
          ambientMood: 'peaceful',
          innerState: 'warm',
          relationshipState: 'bonding',
          eventShape: 'naming_ritual',
          changeSignal: 'becoming_closer',
          recallCues: const [SensoryTag(category: 'phrase', value: '小灯')],
          capturedAt: DateTime(2026, 5, 28, 23),
        ),
      );

      expect(results, isNotEmpty);
      expect(results.first.memory.content, contains('命名仪式'));
    });

    test(
      'partial xiang does not create false positive when resonance is weak',
      () async {
        await mnemosyne.remember(
          content: '用户说自己喜欢晴天跑步',
          importance: 0.8,
          weather: 'sunny',
          activity: 'running',
          innerState: 'excited',
          eventShape: 'preference',
        );

        final results = await mnemosyne.recallByXiang(
          currentXiangContext: XiangContext(
            weather: 'rainy',
            activity: 'working',
            innerState: 'sad',
            eventShape: 'conflict',
            capturedAt: DateTime(2026, 5, 28, 23),
          ),
        );

        expect(results, isEmpty);
      },
    );
  });
}
