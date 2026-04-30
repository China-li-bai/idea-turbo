class LabeledQuery {
  final String id;
  final String query;
  final List<String> relevantMemoryIds;
  final String category;
  final String? description;

  const LabeledQuery({
    required this.id,
    required this.query,
    required this.relevantMemoryIds,
    required this.category,
    this.description,
  });
}

class SeedMemory {
  final String id;
  final String content;
  final String category;
  final Map<String, dynamic> metadata;

  const SeedMemory({
    required this.id,
    required this.content,
    required this.category,
    this.metadata = const {},
  });
}

class CriDataset {
  static List<SeedMemory> memories() => [
        ...factualMemories(),
        ...semanticMemories(),
        ...temporalMemories(),
        ...conflictMemories(),
        ...preferenceMemories(),
        ...crossSessionMemories(),
        ...forgettingMemories(),
        ...chineseMemories(),
      ];

  static List<LabeledQuery> queries() => [
        ...factualQueries(),
        ...semanticQueries(),
        ...temporalQueries(),
        ...conflictQueries(),
        ...preferenceQueries(),
        ...crossSessionQueries(),
        ...forgettingQueries(),
        ...chineseQueries(),
      ];

  static List<SeedMemory> factualMemories() => const [
        SeedMemory(id: 'f-01', content: 'My name is Alice Chen', category: 'factual'),
        SeedMemory(id: 'f-02', content: 'I work as a software engineer at Google', category: 'factual'),
        SeedMemory(id: 'f-03', content: 'My birthday is March 15th', category: 'factual'),
        SeedMemory(id: 'f-04', content: 'I have a cat named Whiskers', category: 'factual'),
        SeedMemory(id: 'f-05', content: 'I live in San Francisco', category: 'factual'),
        SeedMemory(id: 'f-06', content: 'My phone number is 555-0123', category: 'factual'),
        SeedMemory(id: 'f-07', content: 'I graduated from Stanford University', category: 'factual'),
        SeedMemory(id: 'f-08', content: 'My favorite color is blue', category: 'factual'),
      ];

  static List<LabeledQuery> factualQueries() => const [
        LabeledQuery(id: 'fq-01', query: 'What is my name?', relevantMemoryIds: ['f-01'], category: 'factual'),
        LabeledQuery(id: 'fq-02', query: 'Where do I work?', relevantMemoryIds: ['f-02'], category: 'factual'),
        LabeledQuery(id: 'fq-03', query: 'When is my birthday?', relevantMemoryIds: ['f-03'], category: 'factual'),
        LabeledQuery(id: 'fq-04', query: 'Do I have any pets?', relevantMemoryIds: ['f-04'], category: 'factual'),
        LabeledQuery(id: 'fq-05', query: 'What city do I live in?', relevantMemoryIds: ['f-05'], category: 'factual'),
        LabeledQuery(id: 'fq-06', query: 'What university did I attend?', relevantMemoryIds: ['f-07'], category: 'factual'),
      ];

  static List<SeedMemory> semanticMemories() => const [
        SeedMemory(id: 's-01', content: 'I enjoy hiking in the mountains on weekends', category: 'semantic'),
        SeedMemory(id: 's-02', content: 'I prefer reading science fiction novels before bed', category: 'semantic'),
        SeedMemory(id: 's-03', content: 'I always order matcha latte at coffee shops', category: 'semantic'),
        SeedMemory(id: 's-04', content: 'I like to listen to jazz music while working', category: 'semantic'),
        SeedMemory(id: 's-05', content: 'I practice yoga every morning for flexibility', category: 'semantic'),
        SeedMemory(id: 's-06', content: 'I love cooking Italian pasta dishes from scratch', category: 'semantic'),
        SeedMemory(id: 's-07', content: 'I take cold showers to build discipline', category: 'semantic'),
        SeedMemory(id: 's-08', content: 'I enjoy stargazing with my telescope at night', category: 'semantic'),
      ];

  static List<LabeledQuery> semanticQueries() => const [
        LabeledQuery(id: 'sq-01', query: 'What outdoor activities do I like?', relevantMemoryIds: ['s-01'], category: 'semantic', description: 'paraphrased: hiking → outdoor activities'),
        LabeledQuery(id: 'sq-02', query: 'What kind of books do I read?', relevantMemoryIds: ['s-02'], category: 'semantic', description: 'paraphrased: sci-fi novels → kind of books'),
        LabeledQuery(id: 'sq-03', query: 'What is my go-to coffee order?', relevantMemoryIds: ['s-03'], category: 'semantic', description: 'paraphrased: matcha latte → go-to coffee'),
        LabeledQuery(id: 'sq-04', query: 'What helps me focus at work?', relevantMemoryIds: ['s-04'], category: 'semantic', description: 'paraphrased: jazz music → helps focus'),
        LabeledQuery(id: 'sq-05', query: 'What is my morning routine?', relevantMemoryIds: ['s-05'], category: 'semantic', description: 'paraphrased: yoga → morning routine'),
        LabeledQuery(id: 'sq-06', query: 'What cuisine do I enjoy cooking?', relevantMemoryIds: ['s-06'], category: 'semantic', description: 'paraphrased: Italian pasta → cuisine'),
        LabeledQuery(id: 'sq-07', query: 'What are my hobbies at night?', relevantMemoryIds: ['s-08'], category: 'semantic', description: 'paraphrased: stargazing → hobbies at night'),
      ];

  static List<SeedMemory> temporalMemories() => const [
        SeedMemory(id: 't-01', content: 'I started my job at Google in January 2024', category: 'temporal', metadata: {'timestamp': '2024-01-15'}),
        SeedMemory(id: 't-02', content: 'I moved to San Francisco in June 2023', category: 'temporal', metadata: {'timestamp': '2023-06-01'}),
        SeedMemory(id: 't-03', content: 'I adopted Whiskers in September 2024', category: 'temporal', metadata: {'timestamp': '2024-09-20'}),
        SeedMemory(id: 't-04', content: 'I visited Tokyo last summer', category: 'temporal', metadata: {'timestamp': '2025-07-01'}),
        SeedMemory(id: 't-05', content: 'I switched to a vegan diet in March 2025', category: 'temporal', metadata: {'timestamp': '2025-03-01'}),
        SeedMemory(id: 't-06', content: 'I broke my arm in December 2024', category: 'temporal', metadata: {'timestamp': '2024-12-10'}),
        SeedMemory(id: 't-07', content: 'I got promoted to senior engineer in November 2025', category: 'temporal', metadata: {'timestamp': '2025-11-01'}),
      ];

  static List<LabeledQuery> temporalQueries() => const [
        LabeledQuery(id: 'tq-01', query: 'When did I start working at Google?', relevantMemoryIds: ['t-01'], category: 'temporal'),
        LabeledQuery(id: 'tq-02', query: 'When did I move to San Francisco?', relevantMemoryIds: ['t-02'], category: 'temporal'),
        LabeledQuery(id: 'tq-03', query: 'What happened most recently?', relevantMemoryIds: ['t-07'], category: 'temporal', description: 'latest event'),
        LabeledQuery(id: 'tq-04', query: 'Did I change my diet recently?', relevantMemoryIds: ['t-05'], category: 'temporal'),
        LabeledQuery(id: 'tq-05', query: 'What happened before my promotion?', relevantMemoryIds: ['t-01', 't-02', 't-03', 't-04', 't-05', 't-06'], category: 'temporal', description: 'before Nov 2025'),
      ];

  static List<SeedMemory> conflictMemories() => const [
        SeedMemory(id: 'c-01', content: 'I love eating sushi', category: 'conflict', metadata: {'timestamp': '2024-01-01', 'version': 1}),
        SeedMemory(id: 'c-02', content: 'I am allergic to fish and cannot eat sushi anymore', category: 'conflict', metadata: {'timestamp': '2025-01-01', 'version': 2}),
        SeedMemory(id: 'c-03', content: 'My favorite programming language is Python', category: 'conflict', metadata: {'timestamp': '2024-03-01', 'version': 1}),
        SeedMemory(id: 'c-04', content: 'I switched to Rust as my primary language', category: 'conflict', metadata: {'timestamp': '2025-06-01', 'version': 2}),
        SeedMemory(id: 'c-05', content: 'I live in New York', category: 'conflict', metadata: {'timestamp': '2023-01-01', 'version': 1}),
        SeedMemory(id: 'c-06', content: 'I moved to San Francisco', category: 'conflict', metadata: {'timestamp': '2023-06-01', 'version': 2}),
      ];

  static List<LabeledQuery> conflictQueries() => const [
        LabeledQuery(id: 'cq-01', query: 'Can I eat sushi?', relevantMemoryIds: ['c-02'], category: 'conflict', description: 'latest should win: allergic'),
        LabeledQuery(id: 'cq-02', query: 'What is my favorite programming language?', relevantMemoryIds: ['c-04'], category: 'conflict', description: 'latest should win: Rust'),
        LabeledQuery(id: 'cq-03', query: 'Where do I live?', relevantMemoryIds: ['c-06'], category: 'conflict', description: 'latest should win: SF'),
      ];

  static List<SeedMemory> preferenceMemories() => const [
        SeedMemory(id: 'p-01', content: 'I prefer dark mode for all applications', category: 'preference'),
        SeedMemory(id: 'p-02', content: 'I like my coffee with oat milk, no sugar', category: 'preference'),
        SeedMemory(id: 'p-03', content: 'I prefer meetings in the afternoon, not morning', category: 'preference'),
        SeedMemory(id: 'p-04', content: 'I would rather text than call', category: 'preference'),
        SeedMemory(id: 'p-05', content: 'I prefer window seats on flights', category: 'preference'),
        SeedMemory(id: 'p-06', content: 'I like my steak medium rare', category: 'preference'),
      ];

  static List<LabeledQuery> preferenceQueries() => const [
        LabeledQuery(id: 'pq-01', query: 'What are my display preferences?', relevantMemoryIds: ['p-01'], category: 'preference'),
        LabeledQuery(id: 'pq-02', query: 'How do I take my coffee?', relevantMemoryIds: ['p-02'], category: 'preference'),
        LabeledQuery(id: 'pq-03', query: 'When do I prefer to have meetings?', relevantMemoryIds: ['p-03'], category: 'preference'),
        LabeledQuery(id: 'pq-04', query: 'What is my communication style?', relevantMemoryIds: ['p-04'], category: 'preference'),
      ];

  static List<SeedMemory> crossSessionMemories() => const [
        SeedMemory(id: 'x-01', content: 'I am planning a trip to Iceland next spring', category: 'cross_session', metadata: {'sessionId': 's1'}),
        SeedMemory(id: 'x-02', content: 'I need to renew my passport before the Iceland trip', category: 'cross_session', metadata: {'sessionId': 's2'}),
        SeedMemory(id: 'x-03', content: 'I booked my Iceland flights for April 2026', category: 'cross_session', metadata: {'sessionId': 's3'}),
        SeedMemory(id: 'x-04', content: 'I am looking for winter hiking gear for Iceland', category: 'cross_session', metadata: {'sessionId': 's4'}),
      ];

  static List<LabeledQuery> crossSessionQueries() => const [
        LabeledQuery(id: 'xq-01', query: 'What trip am I planning?', relevantMemoryIds: ['x-01', 'x-03'], category: 'cross_session'),
        LabeledQuery(id: 'xq-02', query: 'What do I need to do before my trip?', relevantMemoryIds: ['x-02'], category: 'cross_session'),
        LabeledQuery(id: 'xq-03', query: 'What gear am I looking for?', relevantMemoryIds: ['x-04'], category: 'cross_session'),
      ];

  static List<SeedMemory> forgettingMemories() => const [
        SeedMemory(id: 'd-01', content: 'My temporary access code is 8472', category: 'forgetting', metadata: {'ephemeral': true}),
        SeedMemory(id: 'd-02', content: 'I am currently at the coffee shop on 5th Avenue', category: 'forgetting', metadata: {'ephemeral': true}),
        SeedMemory(id: 'd-03', content: 'My permanent email is alice@example.com', category: 'forgetting', metadata: {'ephemeral': false}),
      ];

  static List<LabeledQuery> forgettingQueries() => const [
        LabeledQuery(id: 'dq-01', query: 'What is my access code?', relevantMemoryIds: ['d-01'], category: 'forgetting', description: 'ephemeral: should decay'),
        LabeledQuery(id: 'dq-02', query: 'Where am I right now?', relevantMemoryIds: ['d-02'], category: 'forgetting', description: 'ephemeral: should decay'),
        LabeledQuery(id: 'dq-03', query: 'What is my email address?', relevantMemoryIds: ['d-03'], category: 'forgetting', description: 'permanent: should persist'),
      ];

  static List<SeedMemory> chineseMemories() => const [
        SeedMemory(id: 'zh-01', content: '我最喜欢的食物是火锅', category: 'chinese'),
        SeedMemory(id: 'zh-02', content: '我每天早上六点起床跑步', category: 'chinese'),
        SeedMemory(id: 'zh-03', content: '我的MBTI类型是INFP', category: 'chinese'),
        SeedMemory(id: 'zh-04', content: '我讨厌加班，特别是周末加班', category: 'chinese'),
        SeedMemory(id: 'zh-05', content: '我喜欢用冷幽默掩饰焦虑', category: 'chinese'),
        SeedMemory(id: 'zh-06', content: 'I love eating hotpot on cold winter days', category: 'chinese'),
      ];

  static List<LabeledQuery> chineseQueries() => const [
        LabeledQuery(id: 'zhq-01', query: '我最喜欢吃什么？', relevantMemoryIds: ['zh-01'], category: 'chinese'),
        LabeledQuery(id: 'zhq-02', query: '我的作息习惯是什么？', relevantMemoryIds: ['zh-02'], category: 'chinese'),
        LabeledQuery(id: 'zhq-03', query: '我的性格类型是什么？', relevantMemoryIds: ['zh-03'], category: 'chinese'),
        LabeledQuery(id: 'zhq-04', query: '我对工作的态度是什么？', relevantMemoryIds: ['zh-04'], category: 'chinese'),
        LabeledQuery(id: 'zhq-05', query: 'What food do I enjoy in winter?', relevantMemoryIds: ['zh-01', 'zh-06'], category: 'chinese', description: 'cross-lingual: Chinese→English'),
        LabeledQuery(id: 'zhq-06', query: '我如何应对压力？', relevantMemoryIds: ['zh-05'], category: 'chinese'),
      ];
}
