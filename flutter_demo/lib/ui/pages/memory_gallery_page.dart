import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:mnemosyne/core/constants.dart';
import 'package:mnemosyne/features/memory/domain/entities/memory_item.dart';

class MemoryGalleryPage extends StatelessWidget {
  final List<MemoryItem> memories;

  const MemoryGalleryPage({super.key, required this.memories});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        title: const Text(
          '记忆画廊',
          style: TextStyle(
            color: Colors.white,
            letterSpacing: 2,
          ),
        ),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white54),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: memories.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    '🐱',
                    style: TextStyle(
                      fontSize: 64,
                      color: Colors.white.withValues(alpha: 0.3),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    '还没有记忆',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.4),
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '多和镇岳聊聊天吧',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.3),
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: memories.length,
              itemBuilder: (context, index) {
                final memory = memories[index];
                return _MemoryCard(memory: memory);
              },
            ),
    );
  }
}

class _MemoryCard extends StatelessWidget {
  final MemoryItem memory;

  const _MemoryCard({required this.memory});

  @override
  Widget build(BuildContext context) {
    final timeStr = _formatTime(memory.createdAt);
    final typeIcon = memory.type == MemoryType.semantic ? '🧠' : '📝';
    final importanceStars = '⭐' * (memory.importance * 5).round().clamp(1, 5);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(typeIcon, style: const TextStyle(fontSize: 16)),
                    const SizedBox(width: 8),
                    Text(
                      timeStr,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.4),
                        fontSize: 12,
                      ),
                    ),
                    const Spacer(),
                    Text(
                      importanceStars,
                      style: const TextStyle(fontSize: 10),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  memory.content,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.85),
                    fontSize: 14,
                    height: 1.5,
                  ),
                ),
                if (memory.keywords.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: memory.keywords.map((kw) {
                      return Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.amber.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: Colors.amber.withValues(alpha: 0.2),
                          ),
                        ),
                        child: Text(
                          kw,
                          style: TextStyle(
                            color: Colors.amber.withValues(alpha: 0.7),
                            fontSize: 11,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _formatTime(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inMinutes < 1) return '刚刚';
    if (diff.inMinutes < 60) return '${diff.inMinutes}分钟前';
    if (diff.inHours < 24) return '${diff.inHours}小时前';
    if (diff.inDays < 7) return '${diff.inDays}天前';
    return '${dt.month}/${dt.day} ${dt.hour}:${dt.minute.toString().padLeft(2, '0')}';
  }
}
