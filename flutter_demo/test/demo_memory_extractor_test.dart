import 'package:flutter_demo/data/services/demo_memory_extractor.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('DemoMemoryExtractor', () {
    late DemoMemoryExtractor extractor;

    setUp(() {
      extractor = DemoMemoryExtractor();
    });

    test('extracts naming ritual as bonding memory', () async {
      final result = await extractor.extract('用户说: 以后就叫你小灯吧', '');

      expect(result, isNotNull);
      expect(result!['event'], contains('命名仪式'));
      expect(result['topics'], contains('naming_ritual'));

      final xiang = (result['extra'] as Map)['xiang'] as Map;
      expect(xiang['relationshipState'], equals('bonding'));
      expect(xiang['changeSignal'], equals('becoming_closer'));
      expect(xiang['recallCues'], contains('命名'));
    });

    test('extracts emotional confession with recall cues', () async {
      final result = await extractor.extract(
        '一次对话\n用户说: 今晚下雨，我很孤独，不想回消息\n我回应: *靠近*',
        '',
      );

      expect(result, isNotNull);
      expect(result!['mood'], equals('lonely'));
      expect(result['emotionalValence'], lessThan(0));

      final xiang = (result['extra'] as Map)['xiang'] as Map;
      expect(xiang['eventShape'], equals('emotional_confession'));
      expect(xiang['recallCues'], contains('雨夜'));
      expect(xiang['recallCues'], contains('不想回消息'));
    });

    test('extracts hurtful conflict as withdrawing signal', () async {
      final result = await extractor.extract('用户说: 闭嘴，烦死了，你没用', '');

      expect(result, isNotNull);
      final xiang = (result!['extra'] as Map)['xiang'] as Map;
      expect(xiang['eventShape'], equals('hurtful_conflict'));
      expect(xiang['relationshipState'], equals('wounded_distance'));
      expect(xiang['changeSignal'], equals('withdrawing'));
      expect(result['importance'], greaterThanOrEqualTo(0.8));
    });

    test('ignores low-value casual chat', () async {
      final result = await extractor.extract('用户说: 嗯嗯，今天还行', '');

      expect(result, isNull);
    });

    test('extracts English emotional memory cues', () async {
      final result = await extractor.extract(
        "用户说: It is raining late night and I feel lonely. I don't want to reply to anyone.",
        '',
      );

      expect(result, isNotNull);
      expect(result!['mood'], equals('lonely'));

      final xiang = (result['extra'] as Map)['xiang'] as Map;
      expect(xiang['eventShape'], equals('emotional_confession'));
      expect(xiang['recallCues'], contains('雨夜'));
      expect(xiang['recallCues'], contains('深夜'));
      expect(xiang['recallCues'], contains('不想回消息'));
    });
  });
}
