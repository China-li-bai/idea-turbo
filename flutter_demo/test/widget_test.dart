import 'package:flutter/material.dart';
import 'package:flutter_demo/ui/pages/memory_gallery_page.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('memory gallery presents xiang-based product positioning', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(home: MemoryGalleryPage(memories: [])),
    );

    expect(find.text('记忆相册'), findsOneWidget);
    expect(find.text('还没有形成可回忆的相'), findsOneWidget);
    expect(find.text('不是聊天记录，是会被相触发的情感记忆'), findsOneWidget);
  });
}
