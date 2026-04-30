import 'npc_entity.dart';

class NpcPoolConfig {
  final double nearbyRadiusMeters;
  final int maxNpcPerArea;
  final Duration npcRefreshInterval;
  final bool enableBrandNpc;
  final bool enableSeasonalNpc;

  const NpcPoolConfig({
    this.nearbyRadiusMeters = 5000,
    this.maxNpcPerArea = 20,
    this.npcRefreshInterval = const Duration(hours: 24),
    this.enableBrandNpc = true,
    this.enableSeasonalNpc = true,
  });
}

class NpcInteractionResult {
  final String npcId;
  final String response;
  final String? couponCode;
  final String? couponDescription;
  final bool unlockedAchievement;
  final String? achievementName;
  final List<String> newDialogueUnlocked;

  const NpcInteractionResult({
    required this.npcId,
    required this.response,
    this.couponCode,
    this.couponDescription,
    this.unlockedAchievement = false,
    this.achievementName,
    this.newDialogueUnlocked = const [],
  });
}

abstract class NpcPoolService {
  List<NpcEntity> getNearbyNpcs(double latitude, double longitude);
  NpcEntity? getNpcById(String id);
  Future<NpcInteractionResult> interactWithNpc(
    String npcId,
    String userMessage, {
    String? userId,
  });
  List<NpcEntity> searchNpcsByPoi(String poiName);
  void refreshPool();
  int get totalActiveNpcs;
}

class DefaultNpcPoolService implements NpcPoolService {
  final NpcPoolConfig config;
  final List<NpcEntity> _npcPool;
  final Map<String, int> _dailyInteractionCounts = {};
  DateTime? _lastRefreshTime;

  DefaultNpcPoolService({
    this.config = const NpcPoolConfig(),
    List<NpcEntity>? initialPool,
  }) : _npcPool = initialPool ?? _buildDefaultPool() {
    _lastRefreshTime = DateTime.now();
  }

  @override
  List<NpcEntity> getNearbyNpcs(double latitude, double longitude) {
    _maybeRefresh();
    return _npcPool
        .where((npc) =>
            npc.isAvailable &&
            npc.location.isNearby(
              latitude,
              longitude,
              maxDistanceMeters: config.nearbyRadiusMeters,
            ))
        .toList()
      ..sort((a, b) {
        final distA = NpcLocation.haversineDistance(
            latitude, longitude, a.location.latitude, a.location.longitude);
        final distB = NpcLocation.haversineDistance(
            latitude, longitude, b.location.latitude, b.location.longitude);
        return distA.compareTo(distB);
      });
  }

  @override
  NpcEntity? getNpcById(String id) {
    _maybeRefresh();
    try {
      return _npcPool.firstWhere((npc) => npc.id == id);
    } catch (_) {
      return null;
    }
  }

  @override
  Future<NpcInteractionResult> interactWithNpc(
    String npcId,
    String userMessage, {
    String? userId,
  }) async {
    final npc = getNpcById(npcId);
    if (npc == null || !npc.isAvailable) {
      return NpcInteractionResult(
        npcId: npcId,
        response: '这只宠物好像不在附近了...',
      );
    }

    final countKey = '${npcId}_${DateTime.now().toIso8601String().substring(0, 10)}';
    _dailyInteractionCounts[countKey] =
        (_dailyInteractionCounts[countKey] ?? 0) + 1;

    final dialogueIndex =
        _dailyInteractionCounts[countKey]! % npc.personality.dialoguePool.length;
    final response = npc.personality.dialoguePool.isNotEmpty
        ? npc.personality.dialoguePool[dialogueIndex]
        : npc.personality.catchphrase;

    String? couponCode;
    String? couponDesc;
    if (npc.couponId != null && _dailyInteractionCounts[countKey]! % 3 == 0) {
      couponCode = npc.couponId;
      couponDesc = npc.personality.brandInfo['couponDesc'];
    }

    return NpcInteractionResult(
      npcId: npcId,
      response: response,
      couponCode: couponCode,
      couponDescription: couponDesc,
      unlockedAchievement: _dailyInteractionCounts[countKey]! == 5,
      achievementName: _dailyInteractionCounts[countKey]! == 5
          ? '${npc.personality.name}的老朋友'
          : null,
    );
  }

  @override
  List<NpcEntity> searchNpcsByPoi(String poiName) {
    _maybeRefresh();
    final keyword = poiName.toLowerCase();
    return _npcPool
        .where((npc) =>
            npc.isAvailable &&
            (npc.location.poiName?.toLowerCase().contains(keyword) == true ||
                npc.location.displayName.toLowerCase().contains(keyword)))
        .toList();
  }

  @override
  void refreshPool() {
    _dailyInteractionCounts.clear();
    _lastRefreshTime = DateTime.now();
  }

  @override
  int get totalActiveNpcs =>
      _npcPool.where((npc) => npc.isAvailable).length;

  void _maybeRefresh() {
    if (_lastRefreshTime == null) {
      refreshPool();
      return;
    }
    final elapsed = DateTime.now().difference(_lastRefreshTime!);
    if (elapsed >= config.npcRefreshInterval) {
      refreshPool();
    }
  }

  static List<NpcEntity> _buildDefaultPool() {
    return [
      NpcEntity(
        id: 'npc_starbucks_cat',
        type: NpcType.brand,
        rarity: NpcRarity.common,
        personality: NpcPersonality(
          name: '咖咖',
          species: '猫',
          catchphrase: '咖啡因中毒的打工猫，随时准备摸鱼',
          personalityDesc: '一只在星巴克常驻的打工猫，对咖啡了如指掌，喜欢吐槽上班族的日常',
          dialoguePool: [
            '又来买美式？你的黑眼圈已经比我还深了喵~',
            '今天的拿铁有隐藏彩蛋，你猜猜是什么？',
            '我观察人类三年了，结论是：周一最需要我喵~',
            '偷偷告诉你，下午3点来买有惊喜喵~',
          ],
          interests: ['咖啡', '摸鱼', '观察人类'],
          brandInfo: {'brand': 'Starbucks', 'couponDesc': '星巴克满30减5'},
        ),
        location: NpcLocation(
          latitude: 39.9334,
          longitude: 116.4539,
          displayName: '北京三里屯太古里',
          poiName: '星巴克三里屯店',
        ),
        couponId: 'SB2026SPRING',
      ),
      NpcEntity(
        id: 'npc_library_owl',
        type: NpcType.cultural,
        rarity: NpcRarity.rare,
        personality: NpcPersonality(
          name: '墨墨',
          species: '猫头鹰',
          catchphrase: '知识就是力量，但睡眠更重要',
          personalityDesc: '图书馆的学霸猫头鹰，博学多才但有点社恐，喜欢引用冷知识',
          dialoguePool: [
            '你知道吗？猫头鹰的脖子能转270度，但我选择不转，因为懒。',
            '这本书我翻过了，第三章有个惊天大秘密...',
            '嘘——图书馆里禁止大声喧哗，但内心可以尖叫。',
            '今天读了第42本书，答案是42果然没错。',
          ],
          interests: ['读书', '冷知识', '安静'],
        ),
        location: NpcLocation(
          latitude: 39.9992,
          longitude: 116.3266,
          displayName: '北京大学图书馆',
          poiName: '北大图书馆',
        ),
      ),
      NpcEntity(
        id: 'npc_gym_hamster',
        type: NpcType.landmark,
        rarity: NpcRarity.common,
        personality: NpcPersonality(
          name: '铁柱',
          species: '仓鼠',
          catchphrase: '举铁使我快乐，吃坚果使我更强',
          personalityDesc: '健身房里的肌肉仓鼠，虽然小但意志力惊人，热衷于激励别人',
          dialoguePool: [
            '兄弟！今天练了吗？我刚刚推了自身体重100倍的坚果！',
            '别放弃！连我这小短手都能举起来，你也可以！',
            '蛋白粉还是坚果？我选坚果，纯天然喵~',
            '你看起来需要一组深蹲来唤醒灵魂！',
          ],
          interests: ['健身', '坚果', '激励'],
        ),
        location: NpcLocation(
          latitude: 31.2304,
          longitude: 121.4737,
          displayName: '上海安福路',
          poiName: '安福路健身房',
        ),
      ),
      NpcEntity(
        id: 'npc_park_fox',
        type: NpcType.cultural,
        rarity: NpcRarity.epic,
        personality: NpcPersonality(
          name: '阿涂',
          species: '狐狸',
          catchphrase: '城市丛林里最狡猾的观察者',
          personalityDesc: '公园里的哲学家狐狸，喜欢观察人类行为并发表犀利点评',
          dialoguePool: [
            '人类真有趣，明明有手机导航却还是迷路。',
            '我观察了1000对情侣，结论是：牵手散步的走得最慢。',
            '这个公园的日落，我看了365天，每天都不一样。',
            '你闻到了吗？春天的味道，混着外卖和希望。',
          ],
          interests: ['观察', '哲学', '日落'],
        ),
        location: NpcLocation(
          latitude: 31.2397,
          longitude: 121.4903,
          displayName: '上海静安公园',
          poiName: '静安公园',
        ),
      ),
      NpcEntity(
        id: 'npc_campus_cat',
        type: NpcType.community,
        rarity: NpcRarity.common,
        personality: NpcPersonality(
          name: '学分',
          species: '猫',
          catchphrase: '期末考试期间，我是全校最受欢迎的',
          personalityDesc: '大学城里的学霸猫，考试周被疯狂抚摸求好运，平时在食堂蹭饭',
          dialoguePool: [
            '摸我一下，期末必过！两次的话...更稳！',
            '今天食堂的红烧肉不错，我替你尝过了。',
            '考研还是保研？我选蹭研——蹭着研究生学长取暖。',
            '图书馆座位已满，但我的肚皮还有空位。',
          ],
          interests: ['学习', '蹭饭', '考试周'],
        ),
        location: NpcLocation(
          latitude: 30.2741,
          longitude: 120.1551,
          displayName: '杭州浙江大学紫金港校区',
          poiName: '浙大紫金港',
        ),
      ),
    ];
  }
}
