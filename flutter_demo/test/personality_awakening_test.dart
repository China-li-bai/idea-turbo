import 'package:flutter_test/flutter_test.dart';
import 'package:mnemosyne/features/pet/vitality/personality_awakening.dart';

void main() {
  test('feedInteraction tracks distinct active days', () {
    final service = DefaultPersonalityAwakeningService();
    final yesterday = DateTime.now().subtract(const Duration(days: 1));

    service.restoreProfile(
      'zhenyue',
      PersonalityProfile(
        petId: 'zhenyue',
        totalInteractions: 10,
        daysActive: 2,
        lastInteractionAt: yesterday,
      ),
    );

    final updated = service.feedInteraction('zhenyue', '我相信你');
    final sameDay = service.feedInteraction('zhenyue', '谢谢你还记得');

    expect(updated.daysActive, equals(3));
    expect(sameDay.daysActive, equals(3));
    expect(sameDay.lastInteractionAt, isNotNull);
  });
}
