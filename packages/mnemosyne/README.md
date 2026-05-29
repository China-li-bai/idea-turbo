# Mnemosyne

A cognitive memory system for Flutter applications, inspired by human memory architecture.
In this repository, Mnemosyne is the emotional memory infrastructure behind the
product promise: **创造属于你的AI人格，它记得你、理解你、陪你长大**.

See [MEMORY_PHILOSOPHY.md](MEMORY_PHILOSOPHY.md) for the guiding principle:
Mnemosyne remembers through Xiang, then recalls through resonant triggers.

## Features

- **Memory Types**: Episodic, Semantic, Preference, Instruction
- **Encoding Context**: Captures mood, time, topic, and social context for better recall
- **Xiang Recall**: Stores scene, inner state, relationship, event shape, change, and recall cues
- **Decay & Forgetting**: Memories decay over time, emotionally charged memories last longer
- **Hybrid Search**: Combines keyword search and (future) semantic search with context matching
- **Importance Scoring**: Prioritize important memories
- **Rehearsal Boost**: Accessing a memory strengthens it

## Installation

Add to your `pubspec.yaml`:

```yaml
dependencies:
  mnemosyne: ^0.1.0
```

## Quick Start

```dart
import 'package:mnemosyne/mnemosyne.dart';

void main() async {
  final mnemosyne = Mnemosyne();
  await mnemosyne.initialize();

  // Remember something
  await mnemosyne.remember(
    content: "User likes dark theme and prefers efficient solutions",
    type: MemoryType.preference,
    importance: 0.8,
  );

  // Recall later
  final results = await mnemosyne.recall(query: "user preferences");
  for (final result in results) {
    print('${result.memory.content} (score: ${result.totalScore})');
  }

  await mnemosyne.close();
}
```

## Advanced Usage

### Encoding Context

```dart
final context = EncodingContext.capture(
  userMood: UserMood.happy,
  conversationTopic: "Flutter development",
  arousalLevel: 0.7,
);

await mnemosyne.remember(
  content: "We discussed state management in Flutter",
  type: MemoryType.episodic,
  encodingContext: context,
);
```

### Configuration

```dart
final config = MnemosyneConfig(
  decayLambda: 0.00005,
  pruningThreshold: 0.15,
  retrievalLimit: 20,
);

final mnemosyne = Mnemosyne(config: config);
```

### Maintenance

```dart
// Apply decay to all memories
await mnemosyne.decay();

// Prune weak memories
await mnemosyne.prune();
```

## Architecture

Mnemosyne uses a clean architecture approach:

- **Domain Layer**: Entities, Repositories, Use Cases
- **Data Layer**: Models, Data Sources (SQLite with FTS5)
- **Service Layer**: Decay, Keyword Extraction, Memory Management

## License

MIT License
