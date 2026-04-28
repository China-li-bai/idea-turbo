import 'package:flutter_test/flutter_test.dart';
import 'package:mnemosyne/features/memory/domain/entities/encoding_context.dart';
import 'package:mnemosyne/core/constants.dart';

void main() {
  group('EncodingContext', () {
    group('construction', () {
      test('should create with all fields', () {
        final ctx = EncodingContext(
          userMood: UserMood.happy,
          arousalLevel: 0.8,
          valence: 0.6,
          socialContext: SocialContext.withFriends,
          timeOfDay: TimeOfDay.evening,
          dayOfWeek: DayOfWeek.weekend,
          conversationTopic: 'travel',
        );

        expect(ctx.userMood, equals(UserMood.happy));
        expect(ctx.arousalLevel, equals(0.8));
        expect(ctx.valence, equals(0.6));
        expect(ctx.socialContext, equals(SocialContext.withFriends));
        expect(ctx.timeOfDay, equals(TimeOfDay.evening));
        expect(ctx.dayOfWeek, equals(DayOfWeek.weekend));
        expect(ctx.conversationTopic, equals('travel'));
      });

      test('should create with defaults', () {
        final ctx = EncodingContext();

        expect(ctx.userMood, isNull);
        expect(ctx.arousalLevel, isNull);
        expect(ctx.valence, isNull);
        expect(ctx.socialContext, isNull);
        expect(ctx.timeOfDay, isNull);
        expect(ctx.dayOfWeek, isNull);
        expect(ctx.conversationTopic, isNull);
      });
    });

    group('calculateMatchScore', () {
      test('should return 0.0 when current context has no fields', () {
        final ctx = EncodingContext(userMood: UserMood.happy);
        final empty = EncodingContext();
        expect(ctx.calculateMatchScore(empty), equals(0.0));
      });

      test('should return 0.0 when self has no fields', () {
        final ctx = EncodingContext();
        final other = EncodingContext(userMood: UserMood.happy);
        expect(ctx.calculateMatchScore(other), equals(0.0));
      });

      test('should score matching mood higher', () {
        final stored = EncodingContext(userMood: UserMood.happy);
        final matching = EncodingContext(userMood: UserMood.happy);
        final mismatching = EncodingContext(userMood: UserMood.sad);

        final matchScore = stored.calculateMatchScore(matching);
        final mismatchScore = stored.calculateMatchScore(mismatching);

        expect(matchScore, greaterThan(mismatchScore));
      });

      test('should score matching social context', () {
        final stored = EncodingContext(socialContext: SocialContext.withFriends);
        final matching = EncodingContext(socialContext: SocialContext.withFriends);
        final mismatching = EncodingContext(socialContext: SocialContext.alone);

        final matchScore = stored.calculateMatchScore(matching);
        final mismatchScore = stored.calculateMatchScore(mismatching);

        expect(matchScore, greaterThan(mismatchScore));
      });

      test('should combine multiple matching dimensions', () {
        final stored = EncodingContext(
          userMood: UserMood.happy,
          socialContext: SocialContext.withFriends,
          timeOfDay: TimeOfDay.evening,
        );
        final current = EncodingContext(
          userMood: UserMood.happy,
          socialContext: SocialContext.withFriends,
          timeOfDay: TimeOfDay.evening,
        );

        final score = stored.calculateMatchScore(current);

        expect(score, closeTo(1.0, 0.01));
      });

      test('should handle partial matches', () {
        final stored = EncodingContext(
          userMood: UserMood.happy,
          socialContext: SocialContext.withFriends,
        );
        final current = EncodingContext(
          userMood: UserMood.happy,
          socialContext: SocialContext.alone,
        );

        final score = stored.calculateMatchScore(current);

        expect(score, greaterThan(0));
        expect(score, lessThan(1.0));
      });

      test('should handle arousal level similarity', () {
        final stored = EncodingContext(arousalLevel: 0.8);
        final close = EncodingContext(arousalLevel: 0.75);
        final far = EncodingContext(arousalLevel: 0.2);

        final closeScore = stored.calculateMatchScore(close);
        final farScore = stored.calculateMatchScore(far);

        expect(closeScore, greaterThan(farScore));
      });
    });

    group('capture factory', () {
      test('should auto-detect time of day', () {
        final ctx = EncodingContext.capture();
        expect(ctx.timeOfDay, isNotNull);
        expect(ctx.dayOfWeek, isNotNull);
        expect(ctx.capturedAt, isNotNull);
      });

      test('should accept explicit parameters', () {
        final ctx = EncodingContext.capture(
          userMood: UserMood.excited,
          arousalLevel: 0.9,
          conversationTopic: 'coding',
        );

        expect(ctx.userMood, equals(UserMood.excited));
        expect(ctx.arousalLevel, equals(0.9));
        expect(ctx.conversationTopic, equals('coding'));
      });
    });

    group('serialization', () {
      test('should round-trip through JSON', () {
        final original = EncodingContext(
          userMood: UserMood.excited,
          arousalLevel: 0.9,
          valence: 0.7,
          socialContext: SocialContext.atWork,
          timeOfDay: TimeOfDay.night,
          dayOfWeek: DayOfWeek.weekday,
          conversationTopic: 'debugging',
        );

        final json = original.toJson();
        final restored = EncodingContext.fromJson(json);

        expect(restored.userMood, equals(UserMood.excited));
        expect(restored.arousalLevel, equals(0.9));
        expect(restored.valence, equals(0.7));
        expect(restored.socialContext, equals(SocialContext.atWork));
        expect(restored.timeOfDay, equals(TimeOfDay.night));
        expect(restored.dayOfWeek, equals(DayOfWeek.weekday));
        expect(restored.conversationTopic, equals('debugging'));
      });

      test('should handle null fields in JSON', () {
        final original = EncodingContext();
        final json = original.toJson();
        final restored = EncodingContext.fromJson(json);

        expect(restored.userMood, isNull);
        expect(restored.arousalLevel, isNull);
      });
    });

    group('copyWith', () {
      test('should copy with new values', () {
        final original = EncodingContext(userMood: UserMood.happy);
        final copied = original.copyWith(arousalLevel: 0.9);

        expect(copied.userMood, equals(UserMood.happy));
        expect(copied.arousalLevel, equals(0.9));
      });
    });
  });
}
