import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../ui/design/memory_design.dart';
import '../ui/pages/model_download_page.dart';
import 'services/ai_service.dart';

const _chatStorageKey = 'local_chat_messages_v1';

enum _ChatRole { user, assistant }

class _ChatMessage {
  final _ChatRole role;
  final String text;
  final DateTime createdAt;

  const _ChatMessage({
    required this.role,
    required this.text,
    required this.createdAt,
  });

  bool get isUser => role == _ChatRole.user;

  Map<String, Object> toJson() => {
    'role': role.name,
    'text': text,
    'createdAt': createdAt.toIso8601String(),
  };

  static _ChatMessage? fromJson(Object? value) {
    if (value is! Map<String, dynamic>) return null;
    final roleText = value['role'];
    final text = value['text'];
    final createdAtText = value['createdAt'];
    if (roleText is! String || text is! String || createdAtText is! String) {
      return null;
    }

    final role = roleText == _ChatRole.assistant.name
        ? _ChatRole.assistant
        : _ChatRole.user;
    return _ChatMessage(
      role: role,
      text: text,
      createdAt: DateTime.tryParse(createdAtText) ?? DateTime.now(),
    );
  }
}

class PetAppShell extends StatefulWidget {
  final String modelPath;

  const PetAppShell({super.key, required this.modelPath});

  @override
  State<PetAppShell> createState() => _PetAppShellState();
}

class _PetAppShellState extends State<PetAppShell> {
  final AiService _aiService = AiService();
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FocusNode _focusNode = FocusNode();
  final List<_ChatMessage> _messages = [];

  bool _isInitializing = true;
  bool _isSending = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _initialize();
  }

  @override
  void dispose() {
    _aiService.dispose();
    _textController.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _initialize() async {
    try {
      await _loadMessages();
      await _aiService.initialize(widget.modelPath);
      if (!mounted) return;
      setState(() {
        _isInitializing = false;
        _error = null;
      });
      _scrollToBottom();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isInitializing = false;
        _error = '模型加载失败: $e';
      });
    }
  }

  Future<void> _loadMessages() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_chatStorageKey);
    if (raw == null || raw.isEmpty) return;

    final decoded = jsonDecode(raw);
    if (decoded is! List) return;

    _messages
      ..clear()
      ..addAll(decoded.map(_ChatMessage.fromJson).whereType<_ChatMessage>());
  }

  Future<void> _saveMessages() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _chatStorageKey,
      jsonEncode(_messages.map((message) => message.toJson()).toList()),
    );
  }

  Future<void> _sendMessage() async {
    final text = _textController.text.trim();
    if (text.isEmpty || _isSending || _isInitializing) return;

    final userMessage = _ChatMessage(
      role: _ChatRole.user,
      text: text,
      createdAt: DateTime.now(),
    );

    setState(() {
      _messages.add(userMessage);
      _isSending = true;
      _error = null;
    });
    _textController.clear();
    await _saveMessages();
    _scrollToBottom();

    try {
      final result = await _aiService.generateResponse(
        text,
        history: _messages
            .where((message) => message != userMessage)
            .map(
              (message) => AiConversationMessage(
                role: message.isUser
                    ? AiConversationRole.user
                    : AiConversationRole.assistant,
                text: message.text,
              ),
            )
            .toList(),
      );

      if (!mounted) return;
      setState(() {
        _messages.add(
          _ChatMessage(
            role: _ChatRole.assistant,
            text: result.text,
            createdAt: DateTime.now(),
          ),
        );
      });
      await _saveMessages();
      _scrollToBottom();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = '发送失败: $e';
      });
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  Future<void> _clearMessages() async {
    setState(() => _messages.clear());
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_chatStorageKey);
  }

  void _openModels() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const ModelDownloadPage()),
    );
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: MemoryPalette.ink,
      appBar: AppBar(
        title: const Text('聊天'),
        backgroundColor: MemoryPalette.ink,
        foregroundColor: MemoryPalette.paper,
        actions: [
          IconButton(
            tooltip: '清空聊天',
            onPressed: _messages.isEmpty ? null : _clearMessages,
            icon: const Icon(Icons.delete_outline),
          ),
          IconButton(
            tooltip: '本地模型',
            onPressed: _openModels,
            icon: const Icon(Icons.memory),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            if (_isInitializing) const LinearProgressIndicator(),
            if (_error != null)
              _StatusBanner(text: _error!, color: MemoryPalette.rust),
            Expanded(
              child: _messages.isEmpty
                  ? _buildEmptyState()
                  : ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                      itemCount: _messages.length,
                      itemBuilder: (context, index) {
                        return _ChatBubble(message: _messages[index]);
                      },
                    ),
            ),
            _buildComposer(),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Text(
          '开始一段本地聊天',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: MemoryPalette.paper.withValues(alpha: 0.58),
            fontSize: 16,
          ),
        ),
      ),
    );
  }

  Widget _buildComposer() {
    return Container(
      padding: EdgeInsets.fromLTRB(
        16,
        12,
        16,
        12 + MediaQuery.of(context).padding.bottom,
      ),
      decoration: BoxDecoration(
        color: MemoryPalette.ink.withValues(alpha: 0.96),
        border: Border(
          top: BorderSide(color: MemoryPalette.paper.withValues(alpha: 0.10)),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: TextField(
              controller: _textController,
              focusNode: _focusNode,
              enabled: !_isInitializing && !_isSending,
              minLines: 1,
              maxLines: 5,
              textInputAction: TextInputAction.send,
              onSubmitted: (_) => _sendMessage(),
              style: const TextStyle(color: MemoryPalette.paper, fontSize: 16),
              decoration: InputDecoration(
                hintText: _isInitializing ? '正在加载模型...' : '输入消息',
                hintStyle: TextStyle(
                  color: MemoryPalette.paper.withValues(alpha: 0.40),
                ),
                filled: true,
                fillColor: MemoryPalette.paper.withValues(alpha: 0.07),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(18),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          SizedBox(
            width: 48,
            height: 48,
            child: FilledButton(
              onPressed: _isSending || _isInitializing ? null : _sendMessage,
              style: FilledButton.styleFrom(
                padding: EdgeInsets.zero,
                backgroundColor: MemoryPalette.gold,
                foregroundColor: MemoryPalette.ink,
                disabledBackgroundColor: MemoryPalette.paper.withValues(
                  alpha: 0.10,
                ),
              ),
              child: _isSending
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.send),
            ),
          ),
        ],
      ),
    );
  }
}

class _ChatBubble extends StatelessWidget {
  final _ChatMessage message;

  const _ChatBubble({required this.message});

  @override
  Widget build(BuildContext context) {
    final isUser = message.isUser;
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.78,
        ),
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isUser
              ? MemoryPalette.gold.withValues(alpha: 0.90)
              : MemoryPalette.paper.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(16),
          border: isUser
              ? null
              : Border.all(color: MemoryPalette.paper.withValues(alpha: 0.10)),
        ),
        child: Text(
          message.text,
          style: TextStyle(
            color: isUser ? MemoryPalette.ink : MemoryPalette.paper,
            fontSize: 15.5,
            height: 1.45,
          ),
        ),
      ),
    );
  }
}

class _StatusBanner extends StatelessWidget {
  final String text;
  final Color color;

  const _StatusBanner({required this.text, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      color: color.withValues(alpha: 0.18),
      child: Text(text, style: TextStyle(color: color, fontSize: 13)),
    );
  }
}
