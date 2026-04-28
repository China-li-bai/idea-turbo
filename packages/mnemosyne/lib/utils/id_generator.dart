import 'dart:math';

class IdGenerator {
  static final Random _random = Random();

  static String generate() {
    return '${DateTime.now().millisecondsSinceEpoch}_${_random.nextInt(10000).toString().padLeft(4, '0')}';
  }

  static String generateShort() {
    return DateTime.now().millisecondsSinceEpoch.toString();
  }
}
