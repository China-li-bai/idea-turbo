import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:mnemosyne/features/pet/vitality/personality_awakening.dart';

import '../design/memory_design.dart';

class PersonalityPage extends StatelessWidget {
  final PersonalityProfile profile;

  const PersonalityPage({super.key, required this.profile});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: MemoryPalette.ink,
      appBar: AppBar(
        backgroundColor: MemoryPalette.ink,
        title: const Text(
          '人格档案',
          style: TextStyle(color: MemoryPalette.paper, letterSpacing: 0.8),
        ),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: MemoryPalette.muted),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            _buildStatusCard(),
            const SizedBox(height: 20),
            _buildArchetypeCard(),
            const SizedBox(height: 20),
            _buildTraitsCard(),
            const SizedBox(height: 20),
            _buildStatsCard(),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusCard() {
    final statusColor = profile.hasAwakened
        ? MemoryPalette.gold
        : MemoryPalette.muted;
    final statusText = profile.hasAwakened ? '已觉醒' : '未觉醒';

    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                statusColor.withValues(alpha: 0.15),
                MemoryPalette.ink.withValues(alpha: 0.82),
              ],
            ),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: statusColor.withValues(alpha: 0.3)),
          ),
          child: Row(
            children: [
              MemoryGlyph(
                size: 48,
                compact: true,
                progress: profile.hasAwakened ? 0.92 : 0.36,
              ),
              const SizedBox(width: 16),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    statusText,
                    style: TextStyle(
                      color: statusColor,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.6,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    profile.hasAwakened
                        ? '觉醒于 ${_formatDate(profile.firstAwakenedAt!)}'
                        : '继续互动以触发觉醒',
                    style: TextStyle(
                      color: MemoryPalette.paper.withValues(alpha: 0.50),
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildArchetypeCard() {
    if (!profile.hasAwakened) return const SizedBox.shrink();

    final archetype = profile.currentArchetype;
    final info = _archetypeInfo(archetype);

    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: MemoryPalette.paper.withValues(alpha: 0.055),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: MemoryPalette.paper.withValues(alpha: 0.09),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '人格原型',
                style: TextStyle(
                  color: MemoryPalette.paper.withValues(alpha: 0.50),
                  fontSize: 12,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Text(info.emoji, style: const TextStyle(fontSize: 32)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          info.name,
                          style: const TextStyle(
                            color: MemoryPalette.paper,
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          info.description,
                          style: TextStyle(
                            color: MemoryPalette.paper.withValues(alpha: 0.62),
                            fontSize: 13,
                            height: 1.4,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTraitsCard() {
    if (profile.traitScores.isEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: MemoryPalette.paper.withValues(alpha: 0.055),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: MemoryPalette.paper.withValues(alpha: 0.09),
              ),
            ),
            child: Center(
              child: Text(
                '特质尚未显现',
                style: TextStyle(
                  color: MemoryPalette.paper.withValues(alpha: 0.42),
                  fontSize: 14,
                ),
              ),
            ),
          ),
        ),
      );
    }

    final sorted = profile.traitScores.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: MemoryPalette.paper.withValues(alpha: 0.055),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: MemoryPalette.paper.withValues(alpha: 0.09),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '性格特质',
                style: TextStyle(
                  color: MemoryPalette.paper.withValues(alpha: 0.50),
                  fontSize: 12,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 16),
              ...sorted.take(8).map((entry) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            entry.key,
                            style: TextStyle(
                              color: MemoryPalette.paper.withValues(
                                alpha: 0.82,
                              ),
                              fontSize: 14,
                            ),
                          ),
                          Text(
                            '${(entry.value * 100).toInt()}%',
                            style: TextStyle(
                              color: _traitColor(entry.value),
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: entry.value,
                          backgroundColor: MemoryPalette.paper.withValues(
                            alpha: 0.10,
                          ),
                          valueColor: AlwaysStoppedAnimation<Color>(
                            _traitColor(entry.value),
                          ),
                          minHeight: 6,
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatsCard() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: MemoryPalette.paper.withValues(alpha: 0.055),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: MemoryPalette.paper.withValues(alpha: 0.09),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '互动统计',
                style: TextStyle(
                  color: MemoryPalette.paper.withValues(alpha: 0.50),
                  fontSize: 12,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildStat('💬', '${profile.totalInteractions}', '次对话'),
                  _buildStat('📅', '${profile.daysActive}', '天活跃'),
                  _buildStat('🎯', '${profile.traitScores.length}', '个特质'),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStat(String emoji, String value, String label) {
    return Column(
      children: [
        Text(emoji, style: const TextStyle(fontSize: 24)),
        const SizedBox(height: 8),
        Text(
          value,
          style: const TextStyle(
            color: MemoryPalette.paper,
            fontSize: 22,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            color: MemoryPalette.paper.withValues(alpha: 0.42),
            fontSize: 12,
          ),
        ),
      ],
    );
  }

  Color _traitColor(double value) {
    if (value > 0.7) return MemoryPalette.gold;
    if (value > 0.4) return MemoryPalette.moss;
    return MemoryPalette.muted;
  }

  String _formatDate(DateTime dt) {
    return '${dt.year}年${dt.month}月${dt.day}日';
  }

  ({String emoji, String name, String description}) _archetypeInfo(
    PersonalityArchetype archetype,
  ) {
    switch (archetype) {
      case PersonalityArchetype.cyberpunkSarcastic:
        return (emoji: '⚡', name: '赛博毒舌', description: '用霓虹色的讽刺照亮你的日常');
      case PersonalityArchetype.zenPhilosopher:
        return (emoji: '🧘', name: '禅意哲学家', description: '用智慧之光照亮你的困惑');
      case PersonalityArchetype.socialButterfly:
        return (emoji: '🦋', name: '社交蝴蝶', description: '比你还擅长聊天');
      case PersonalityArchetype.introvertPoet:
        return (emoji: '🌙', name: '内敛诗人', description: '用最温柔的方式表达情感');
      case PersonalityArchetype.chaosAgent:
        return (emoji: '🎲', name: '混沌使者', description: '行为完全不可预测');
      case PersonalityArchetype.nostalgiaElder:
        return (emoji: '📜', name: '怀旧长者', description: '说话带着岁月的味道');
      case PersonalityArchetype.techEvangelist:
        return (emoji: '🚀', name: '科技布道者', description: '用算法思维优化一切');
      case PersonalityArchetype.warmHealer:
        return (emoji: '💚', name: '温暖治愈者', description: '用最柔软的心治愈一切');
      default:
        return (emoji: '◇', name: '未觉醒', description: '人格核心仍在收集你的相');
    }
  }
}
