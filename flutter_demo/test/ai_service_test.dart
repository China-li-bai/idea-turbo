import 'package:flutter_demo/pet/services/ai_service.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('local chat uses complete-answer generation settings', () {
    const params = AiService.localChatGenerationParams;

    expect(params.maxTokens, greaterThanOrEqualTo(768));
    expect(params.temp, greaterThanOrEqualTo(0.7));
    expect(params.topP, greaterThanOrEqualTo(0.9));
    expect(params.stopSequences, isEmpty);
  });
}
