import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:mnemosyne/features/pet/solo_play/pet_diary_service.dart';

import '../design/memory_design.dart';

class DiaryPage extends StatelessWidget {
  final List<DiaryEntry> entries;
  final VoidCallback? onGenerateDiary;

  const DiaryPage({super.key, required this.entries, this.onGenerateDiary});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: MemoryPalette.ink,
      appBar: AppBar(
        backgroundColor: MemoryPalette.ink,
        title: const Text(
          '内心独白',
          style: TextStyle(color: MemoryPalette.paper, letterSpacing: 0.8),
        ),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: MemoryPalette.muted),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          if (onGenerateDiary != null)
            IconButton(
              icon: const Icon(Icons.auto_stories, color: MemoryPalette.gold),
              onPressed: onGenerateDiary,
              tooltip: '写日记',
            ),
        ],
      ),
      body: entries.isEmpty
          ? _buildEmptyState()
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: entries.length,
              itemBuilder: (context, index) {
                final entry = entries.reversed.toList()[index];
                return _buildDiaryCard(entry);
              },
            ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const MemoryGlyph(size: 68, compact: true),
          const SizedBox(height: 16),
          Text(
            '还没有日记',
            style: TextStyle(
              color: MemoryPalette.paper.withValues(alpha: 0.52),
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '多互动几次，它会开始记录内心世界',
            style: TextStyle(
              color: MemoryPalette.paper.withValues(alpha: 0.34),
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDiaryCard(DiaryEntry entry) {
    final typeLabel = _typeLabel(entry.type);

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  _typeColor(entry.type).withValues(alpha: 0.1),
                  MemoryPalette.ink.withValues(alpha: 0.82),
                ],
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: _typeColor(entry.type).withValues(alpha: 0.2),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const MemoryGlyph(size: 22, compact: true),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        entry.title,
                        style: const TextStyle(
                          color: MemoryPalette.paper,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: _typeColor(entry.type).withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        typeLabel,
                        style: TextStyle(
                          color: _typeColor(entry.type),
                          fontSize: 10,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  entry.content,
                  style: TextStyle(
                    color: MemoryPalette.paper.withValues(alpha: 0.82),
                    fontSize: 14,
                    height: 1.6,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Icon(
                      Icons.access_time,
                      size: 12,
                      color: MemoryPalette.paper.withValues(alpha: 0.34),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      _formatDate(entry.writtenAt),
                      style: TextStyle(
                        color: MemoryPalette.paper.withValues(alpha: 0.34),
                        fontSize: 11,
                      ),
                    ),
                    if (entry.tags.isNotEmpty) ...[
                      const SizedBox(width: 12),
                      ...entry.tags
                          .take(3)
                          .map(
                            (tag) => Padding(
                              padding: const EdgeInsets.only(right: 4),
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 6,
                                  vertical: 1,
                                ),
                                decoration: BoxDecoration(
                                  color: MemoryPalette.paper.withValues(
                                    alpha: 0.06,
                                  ),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  '#$tag',
                                  style: TextStyle(
                                    color: MemoryPalette.paper.withValues(
                                      alpha: 0.34,
                                    ),
                                    fontSize: 10,
                                  ),
                                ),
                              ),
                            ),
                          ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime dt) {
    return '${dt.month}月${dt.day}日 ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }

  String _typeLabel(DiaryEntryType type) {
    return switch (type) {
      DiaryEntryType.dailyObservation => '日常',
      DiaryEntryType.moodReflection => '心情',
      DiaryEntryType.ownerHabit => '观察',
      DiaryEntryType.dreamRecord => '梦境',
      DiaryEntryType.adventureNote => '冒险',
      DiaryEntryType.specialOccasion => '特别',
    };
  }

  Color _typeColor(DiaryEntryType type) {
    return switch (type) {
      DiaryEntryType.dailyObservation => MemoryPalette.moss,
      DiaryEntryType.moodReflection => MemoryPalette.rust,
      DiaryEntryType.ownerHabit => MemoryPalette.gold,
      DiaryEntryType.dreamRecord => const Color(0xFF8E9A8A),
      DiaryEntryType.adventureNote => const Color(0xFF9A8F74),
      DiaryEntryType.specialOccasion => const Color(0xFFB48276),
    };
  }
}
