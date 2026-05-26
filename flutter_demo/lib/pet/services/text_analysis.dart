import 'dart:math';

final _random = Random();

bool randomChance(double probability) {
  return _random.nextDouble() < probability;
}

bool detectWarmth(String content) {
  final lower = content.toLowerCase();
  const patterns = [
    '想你', '担心你', '在乎你', '喜欢你', '谢谢你',
    '对不起', '抱歉', '我错了', '回来', '别走',
    '陪着你', '我在', '不会走', '你很重要',
  ];
  return patterns.any((p) => lower.contains(p));
}

bool detectHurtful(String content) {
  final lower = content.toLowerCase();
  const patterns = [
    '闭嘴', '烦死了', '滚', '讨厌你', '你好烦',
    '别说了', '够了', '不想理你', '你很烦', '走开',
    '没用的东西', '废物', '假', '你只是', '你不过',
    '算了', '无所谓', '随便吧',
  ];
  return patterns.any((p) => lower.contains(p));
}
