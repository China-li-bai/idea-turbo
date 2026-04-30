enum GoodsCategory {
  outfit,
  voicePack,
  memoryExpansion,
  matchmaker,
  specialEffect,
  title,
}

enum GoodsRarity {
  common,
  rare,
  epic,
  legendary,
  limited,
}

class VirtualGoods {
  final String id;
  final String name;
  final String description;
  final GoodsCategory category;
  final GoodsRarity rarity;
  final int priceCoins;
  final String? previewAssetUrl;
  final Map<String, dynamic> properties;
  final bool isLimited;
  final int? stockRemaining;
  final DateTime? availableUntil;

  const VirtualGoods({
    required this.id,
    required this.name,
    required this.description,
    required this.category,
    required this.rarity,
    required this.priceCoins,
    this.previewAssetUrl,
    this.properties = const {},
    this.isLimited = false,
    this.stockRemaining,
    this.availableUntil,
  });

  bool get isAvailable {
    if (isLimited && stockRemaining != null && stockRemaining! <= 0) return false;
    if (availableUntil != null && DateTime.now().isAfter(availableUntil!)) {
      return false;
    }
    return true;
  }
}

class WalletState {
  final String userId;
  final int coins;
  final int roses;
  final List<String> ownedGoodsIds;
  final DateTime lastDailyRewardAt;
  final int consecutiveLoginDays;

  const WalletState({
    required this.userId,
    required this.coins,
    required this.roses,
    required this.ownedGoodsIds,
    required this.lastDailyRewardAt,
    required this.consecutiveLoginDays,
  });

  WalletState copyWith({
    String? userId,
    int? coins,
    int? roses,
    List<String>? ownedGoodsIds,
    DateTime? lastDailyRewardAt,
    int? consecutiveLoginDays,
  }) =>
      WalletState(
        userId: userId ?? this.userId,
        coins: coins ?? this.coins,
        roses: roses ?? this.roses,
        ownedGoodsIds: ownedGoodsIds ?? this.ownedGoodsIds,
        lastDailyRewardAt: lastDailyRewardAt ?? this.lastDailyRewardAt,
        consecutiveLoginDays:
            consecutiveLoginDays ?? this.consecutiveLoginDays,
      );
}

class PurchaseResult {
  final bool success;
  final String? goodsId;
  final int coinsSpent;
  final int rosesSpent;
  final String? errorMessage;

  const PurchaseResult({
    required this.success,
    this.goodsId,
    this.coinsSpent = 0,
    this.rosesSpent = 0,
    this.errorMessage,
  });
}

class VirtualGoodsService {
  final Map<String, WalletState> _wallets = {};
  final Map<String, VirtualGoods> _catalog = {};

  VirtualGoodsService() {
    _initCatalog();
  }

  WalletState getWallet(String userId) {
    return _wallets[userId] ??
        WalletState(
          userId: userId,
          coins: 100,
          roses: 1,
          ownedGoodsIds: [],
          lastDailyRewardAt: DateTime.fromMillisecondsSinceEpoch(0),
          consecutiveLoginDays: 0,
        );
  }

  List<VirtualGoods> getCatalog({GoodsCategory? category}) {
    final goods = _catalog.values.where((g) => g.isAvailable).toList();
    if (category != null) {
      return goods.where((g) => g.category == category).toList();
    }
    return goods;
  }

  PurchaseResult purchaseWithCoins(String userId, String goodsId) {
    final goods = _catalog[goodsId];
    if (goods == null) {
      return PurchaseResult(
        success: false,
        errorMessage: '商品不存在',
      );
    }
    if (!goods.isAvailable) {
      return PurchaseResult(
        success: false,
        errorMessage: '商品已售罄或已下架',
      );
    }

    final wallet = getWallet(userId);
    if (wallet.ownedGoodsIds.contains(goodsId)) {
      return PurchaseResult(
        success: false,
        errorMessage: '已拥有此商品',
      );
    }
    if (wallet.coins < goods.priceCoins) {
      return PurchaseResult(
        success: false,
        errorMessage: '金币不足，需要${goods.priceCoins}，当前${wallet.coins}',
      );
    }

    final updatedWallet = wallet.copyWith(
      coins: wallet.coins - goods.priceCoins,
      ownedGoodsIds: [...wallet.ownedGoodsIds, goodsId],
    );
    _wallets[userId] = updatedWallet;

    return PurchaseResult(
      success: true,
      goodsId: goodsId,
      coinsSpent: goods.priceCoins,
    );
  }

  PurchaseResult purchaseWithRoses(String userId, String goodsId, int roseCost) {
    final wallet = getWallet(userId);
    if (wallet.roses < roseCost) {
      return PurchaseResult(
        success: false,
        errorMessage: '数字玫瑰不足，需要$roseCost朵，当前${wallet.roses}朵',
      );
    }

    final updatedWallet = wallet.copyWith(
      roses: wallet.roses - roseCost,
    );
    _wallets[userId] = updatedWallet;

    return PurchaseResult(
      success: true,
      goodsId: goodsId,
      rosesSpent: roseCost,
    );
  }

  WalletState claimDailyReward(String userId) {
    final wallet = getWallet(userId);
    final now = DateTime.now();
    final lastRewardDate = wallet.lastDailyRewardAt;

    final isSameDay = lastRewardDate.year == now.year &&
        lastRewardDate.month == now.month &&
        lastRewardDate.day == now.day;

    if (isSameDay) return wallet;

    final isConsecutive = now.difference(lastRewardDate).inDays == 1;
    final newConsecutiveDays =
        isConsecutive ? wallet.consecutiveLoginDays + 1 : 1;

    final baseReward = 10;
    final consecutiveBonus = (newConsecutiveDays - 1) * 2;
    final totalReward = baseReward + consecutiveBonus;

    return wallet.copyWith(
      coins: wallet.coins + totalReward,
      lastDailyRewardAt: now,
      consecutiveLoginDays: newConsecutiveDays,
    );
  }

  WalletState addRoses(String userId, int count) {
    final wallet = getWallet(userId);
    return wallet.copyWith(roses: wallet.roses + count);
  }

  bool ownsGoods(String userId, String goodsId) {
    final wallet = getWallet(userId);
    return wallet.ownedGoodsIds.contains(goodsId);
  }

  void _initCatalog() {
    final items = [
      VirtualGoods(
        id: 'outfit_cyberpunk_cat',
        name: '赛博朋克战衣',
        description: '霓虹色赛博风格装扮，让你的宠物成为最酷的崽',
        category: GoodsCategory.outfit,
        rarity: GoodsRarity.rare,
        priceCoins: 200,
        properties: {'style': 'cyberpunk', 'glowEffect': true},
      ),
      VirtualGoods(
        id: 'outfit_zen_robe',
        name: '禅意道袍',
        description: '宁静致远的东方风格装扮，自带仙气',
        category: GoodsCategory.outfit,
        rarity: GoodsRarity.rare,
        priceCoins: 200,
        properties: {'style': 'zen', 'particleEffect': 'cherry_blossom'},
      ),
      VirtualGoods(
        id: 'voice_mechanical',
        name: '机械音色包',
        description: '未来感十足的机械合成音',
        category: GoodsCategory.voicePack,
        rarity: GoodsRarity.common,
        priceCoins: 100,
        properties: {'voiceId': 'mechanical', 'pitch': 0.8},
      ),
      VirtualGoods(
        id: 'voice_gentle',
        name: '温柔女声包',
        description: '温暖治愈的温柔声音',
        category: GoodsCategory.voicePack,
        rarity: GoodsRarity.common,
        priceCoins: 100,
        properties: {'voiceId': 'gentle_female', 'pitch': 1.1},
      ),
      VirtualGoods(
        id: 'memory_expansion_pro',
        name: '记忆扩容 Pro',
        description: '云端长期记忆库从1000条升级到10000条',
        category: GoodsCategory.memoryExpansion,
        rarity: GoodsRarity.epic,
        priceCoins: 500,
        properties: {'maxCloudMemories': 10000},
      ),
      VirtualGoods(
        id: 'matchmaker_rose',
        name: '数字玫瑰',
        description: '红娘牵线道具，用于交换匹配对象的联系方式',
        category: GoodsCategory.matchmaker,
        rarity: GoodsRarity.common,
        priceCoins: 50,
        properties: {'type': 'rose', 'exchangeFor': 'contact'},
      ),
      VirtualGoods(
        id: 'effect_neon_aura',
        name: '霓虹光环',
        description: '宠物周围环绕霓虹光环特效',
        category: GoodsCategory.specialEffect,
        rarity: GoodsRarity.epic,
        priceCoins: 300,
        properties: {'effectType': 'neon_aura', 'color': '#FF00FF'},
      ),
      VirtualGoods(
        id: 'title_social_warrior',
        name: '社交战士称号',
        description: '成功怼退100个油腻搭讪后解锁的荣耀称号',
        category: GoodsCategory.title,
        rarity: GoodsRarity.legendary,
        priceCoins: 1000,
        properties: {'title': '社交战士', 'requirement': 'rebuttal_100'},
      ),
    ];

    for (final item in items) {
      _catalog[item.id] = item;
    }
  }
}
