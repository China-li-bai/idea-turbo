import 'package:flutter/material.dart';
import 'package:mnemosyne/mnemosyne.dart';
import 'package:mnemosyne/mnemosyne_class.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Mnemosyne Demo',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const MyHomePage(title: 'Mnemosyne Demo'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});

  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  final Mnemosyne _mnemosyne = Mnemosyne();
  final TextEditingController _contentController = TextEditingController();
  final TextEditingController _queryController = TextEditingController();
  final List<MemoryItem> _memories = [];
  final List<MemorySearchResult> _searchResults = [];
  bool _isInitialized = false;

  @override
  void initState() {
    super.initState();
    _initialize();
  }

  Future<void> _initialize() async {
    await _mnemosyne.initialize();
    await _loadRecentMemories();
    setState(() => _isInitialized = true);
  }

  Future<void> _loadRecentMemories() async {
    final memories = await _mnemosyne.getRecent(limit: 50);
    setState(() => _memories.addAll(memories));
  }

  Future<void> _addMemory() async {
    if (_contentController.text.isEmpty) return;

    final context = EncodingContext.capture(
      userMood: UserMood.happy,
      conversationTopic: "Demo",
    );

    await _mnemosyne.remember(
      content: _contentController.text,
      type: MemoryType.episodic,
      importance: 0.7,
      encodingContext: context,
    );

    _contentController.clear();
    _memories.clear();
    await _loadRecentMemories();
  }

  Future<void> _search() async {
    if (_queryController.text.isEmpty) return;

    final results = await _mnemosyne.recall(
      query: _queryController.text,
      limit: 10,
    );

    setState(() => _searchResults
      ..clear()
      ..addAll(results));
  }

  @override
  void dispose() {
    _mnemosyne.close();
    _contentController.dispose();
    _queryController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: Text(widget.title),
      ),
      body: !_isInitialized
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Text('Add Memory', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _contentController,
                            decoration: const InputDecoration(
                              hintText: 'What do you want to remember?',
                              border: OutlineInputBorder(),
                            ),
                            maxLines: 3,
                          ),
                          const SizedBox(height: 8),
                          ElevatedButton(
                            onPressed: _addMemory,
                            child: const Text('Remember'),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Text('Recall Memories', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _queryController,
                            decoration: const InputDecoration(
                              hintText: 'Search your memories...',
                              border: OutlineInputBorder(),
                            ),
                          ),
                          const SizedBox(height: 8),
                          ElevatedButton(
                            onPressed: _search,
                            child: const Text('Recall'),
                          ),
                          const SizedBox(height: 16),
                          if (_searchResults.isNotEmpty)
                            ..._searchResults.map((result) => ListTile(
                                  title: Text(result.memory.content),
                                  subtitle: Text('Score: ${result.totalScore.toStringAsFixed(2)}'),
                                  leading: const Icon(Icons.memory),
                                )),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Text('Recent Memories', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 8),
                          if (_memories.isEmpty)
                            const Center(child: Text('No memories yet'))
                          else
                            ..._memories.map((memory) => ListTile(
                                  title: Text(memory.content),
                                  subtitle: Text('${memory.type.name} - ${memory.createdAt.toString().substring(0, 16)}'),
                                  leading: const Icon(Icons.history),
                                )),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
