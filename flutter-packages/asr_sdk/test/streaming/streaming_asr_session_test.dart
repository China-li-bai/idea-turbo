import 'dart:async';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:asr_sdk/asr_sdk.dart';

void main() {
  group('buildChunkForDecodeResult', () {
    test('returns null on empty partial and no endpoint', () {
      final chunk = buildChunkForDecodeResult(
        partial: '',
        isEndpoint: false,
        previousCommitted: '',
      );
      expect(chunk, isNull);
    });

    test('returns partial chunk when text is present and no endpoint', () {
      final chunk = buildChunkForDecodeResult(
        partial: ' hello ',
        isEndpoint: false,
        previousCommitted: '',
      );
      expect(chunk, isNotNull);
      expect(chunk!.isEndpoint, isFalse);
      expect(chunk.partialText, 'hello');
      // Non-endpoint chunks do not carry committed text.
      expect(chunk.committedText, isNull);
    });

    test('returns endpoint chunk with merged committed text', () {
      final chunk = buildChunkForDecodeResult(
        partial: 'world',
        isEndpoint: true,
        previousCommitted: 'hello',
      );
      expect(chunk, isNotNull);
      expect(chunk!.isEndpoint, isTrue);
      expect(chunk.partialText, 'world');
      expect(chunk.committedText, 'hello world');
    });

    test('endpoint with empty partial preserves previous committed', () {
      final chunk = buildChunkForDecodeResult(
        partial: '',
        isEndpoint: true,
        previousCommitted: 'hello',
      );
      expect(chunk, isNotNull);
      expect(chunk!.isEndpoint, isTrue);
      expect(chunk.partialText, isEmpty);
      expect(chunk.committedText, 'hello');
    });

    test('first endpoint from empty previous yields partial text only', () {
      final chunk = buildChunkForDecodeResult(
        partial: 'first',
        isEndpoint: true,
        previousCommitted: '',
      );
      expect(chunk!.committedText, 'first');
    });
  });

  group('mergeCommitted', () {
    test('empty previous returns utterance', () {
      expect(mergeCommitted('', 'hi'), 'hi');
    });
    test('empty utterance returns previous', () {
      expect(mergeCommitted('prev', ''), 'prev');
    });
    test('both empty returns empty', () {
      expect(mergeCommitted('', ''), '');
    });
    test('both present joins with space', () {
      expect(mergeCommitted('a b', 'c d'), 'a b c d');
    });
  });

  group('StreamingAsrSession', () {
    late _FakeStreamingRecognizer recognizer;
    late StreamingAsrSession session;

    setUp(() {
      recognizer = _FakeStreamingRecognizer();
      session = StreamingAsrSession(recognizer: recognizer);
    });

    tearDown(() async {
      await session.dispose();
    });

    test('isActive is false before start', () {
      expect(session.isActive, isFalse);
    });

    test('isActive is true after start and before stop', () {
      session.start();
      expect(session.isActive, isTrue);
    });

    test('feed before start throws StateError', () {
      expect(
        () => session.feed(Float32List(0)),
        throwsStateError,
      );
    });

    test('feed after stop throws StateError', () {
      session.start();
      session.stop();
      expect(
        () => session.feed(Float32List(0)),
        throwsStateError,
      );
    });

    test('start called twice throws StateError', () {
      session.start();
      expect(session.start, throwsStateError);
    });

    test('dispose is idempotent', () async {
      await session.dispose();
      await session.dispose();
    });

    test('dispose implies stop', () async {
      session.start();
      await session.dispose();
      expect(session.isActive, isFalse);
    });

    test('feed empty samples does not throw and does not decode', () {
      session.start();
      session.feed(Float32List(0));
      expect(recognizer.lastStream?.decodeCount, 0);
    });

    test('partial chunk is emitted on each feed; final endpoint on stop',
        () async {
      final chunks = <TranscriptionChunk>[];
      final completer = Completer<void>();
      final sub = session.chunks.listen(
        chunks.add,
        onDone: completer.complete,
      );

      recognizer.partialSequence = ['he', 'hello'];
      session.start();
      session.feed(Float32List.fromList([0.1, 0.2]));
      session.feed(Float32List.fromList([0.3, 0.4]));
      session.stop();
      await completer.future;

      // Two partial chunks + one final endpoint chunk from stop.
      expect(chunks.length, 3);
      expect(chunks[0].partialText, 'he');
      expect(chunks[0].isEndpoint, isFalse);
      expect(chunks[1].partialText, 'hello');
      expect(chunks[1].isEndpoint, isFalse);
      expect(chunks[2].isEndpoint, isTrue);
      expect(chunks[2].partialText, 'hello');
      expect(chunks[2].committedText, 'hello');

      await sub.cancel();
    });

    test('endpoint chunk carries committed text', () async {
      final chunks = <TranscriptionChunk>[];
      final sub = session.chunks.listen(chunks.add);

      // partialSequence simulates two successive utterances: 'hello world'
      // is the partial for utterance 1, 'second utterance' is the partial
      // for utterance 2. endpointAfter = 1 means each feed triggers an
      // endpoint (i.e. each feed finalizes one utterance).
      recognizer.partialSequence = ['hello world', 'second utterance'];
      recognizer.endpointAfter = 1;

      session.start();
      session.feed(Float32List.fromList([0.1])); // endpoint 'hello world'
      session.feed(Float32List.fromList([0.2])); // endpoint 'second utterance'
      await Future<void>.delayed(Duration.zero);

      expect(chunks.length, 2);

      expect(chunks[0].partialText, 'hello world');
      expect(chunks[0].isEndpoint, isTrue);
      expect(chunks[0].committedText, 'hello world');

      expect(chunks[1].partialText, 'second utterance');
      expect(chunks[1].isEndpoint, isTrue);
      expect(chunks[1].committedText, 'hello world second utterance');

      await sub.cancel();
    });

    test('empty partial without endpoint emits nothing across whole session',
        () async {
      final chunks = <TranscriptionChunk>[];
      final completer = Completer<void>();
      final sub = session.chunks.listen(
        chunks.add,
        onDone: completer.complete,
      );

      recognizer.partialSequence = ['', ''];
      session.start();
      session.feed(Float32List.fromList([0.1]));
      session.feed(Float32List.fromList([0.2]));
      session.stop();
      await completer.future;

      // No partials, no endpoint text → nothing emitted.
      expect(chunks, isEmpty);

      await sub.cancel();
    });

    test('stop flushes a final endpoint chunk', () async {
      final chunks = <TranscriptionChunk>[];
      final completer = Completer<void>();
      final sub = session.chunks.listen(
        chunks.add,
        onDone: completer.complete,
      );

      recognizer.partialSequence = ['lingering partial'];
      session.start();
      session.feed(Float32List.fromList([0.1]));
      session.stop();
      await completer.future;

      // 1 partial chunk + 1 final endpoint chunk carrying the lingering text.
      expect(chunks.length, 2);
      final last = chunks.last;
      expect(last.isEndpoint, isTrue);
      expect(last.partialText, 'lingering partial');
      expect(last.committedText, 'lingering partial');

      await sub.cancel();
    });

    test('multiple endpoints accumulate committed text across session',
        () async {
      final chunks = <TranscriptionChunk>[];
      final completer = Completer<void>();
      final sub = session.chunks.listen(
        chunks.add,
        onDone: completer.complete,
      );

      recognizer.partialSequence = ['one', 'two', 'three'];
      recognizer.endpointAfter = 1;

      session.start();
      session.feed(Float32List.fromList([0.1])); // 'one' endpoint
      session.feed(Float32List.fromList([0.2])); // 'two' endpoint
      session.feed(Float32List.fromList([0.3])); // 'three' endpoint
      session.stop();
      await completer.future;

      // Three endpoint chunks, one per utterance. stop emits nothing extra
      // because the last endpoint already cleared the partial.
      final endpoints = chunks.where((c) => c.isEndpoint).toList();
      expect(endpoints.length, 3);

      expect(endpoints[0].committedText, 'one');
      expect(endpoints[1].committedText, 'one two');
      expect(endpoints[2].committedText, 'one two three');

      await sub.cancel();
    });

    test('subscription cancel triggers session dispose', () async {
      final sub = session.chunks.listen((_) {});
      await sub.cancel();
      expect(session.start, throwsStateError);
    });

    test('stream accepts at most one subscriber', () {
      session.start();
      session.chunks.listen((_) {});
      expect(
        () => session.chunks.listen((_) {}),
        throwsA(isA<StateError>()),
      );
    });
  });
}

/// Fake [StreamingRecognizer] that emits canned [partialText] values per
/// feed, and triggers [isEndpoint] after a configurable number of feeds
/// since the last reset.
class _FakeStreamingRecognizer implements StreamingRecognizer {
  _FakeStreamingStream? lastStream;

  /// Per-feed canned partial text. Index = total feed count - 1.
  /// If feed count exceeds length, the last consumed partial persists
  /// until the next reset (matching real recognizer behavior).
  List<String> partialSequence = const <String>[];

  /// If set, [isEndpoint] returns true after this many feeds since the
  /// last reset. Otherwise never.
  int? endpointAfter;

  @override
  _FakeStreamingStream createStream() {
    final stream = _FakeStreamingStream(this);
    lastStream = stream;
    return stream;
  }
}

class _FakeStreamingStream implements StreamingRecognizerStream {
  _FakeStreamingStream(this._owner);

  final _FakeStreamingRecognizer _owner;

  int decodeCount = 0;
  int _totalFeeds = 0;
  int _feedsSinceReset = 0;
  bool _partialCleared = false;

  @override
  void acceptWaveform({required Float32List samples, required int sampleRate}) {
    _totalFeeds++;
    _feedsSinceReset++;
    _partialCleared = false;
  }

  @override
  void decode() {
    decodeCount++;
  }

  @override
  String get partialText {
    if (_partialCleared) return '';
    final seq = _owner.partialSequence;
    if (seq.isEmpty) return '';
    final idx = _totalFeeds - 1;
    if (idx < 0 || idx >= seq.length) return '';
    return seq[idx];
  }

  @override
  bool isEndpoint() {
    final after = _owner.endpointAfter;
    if (after == null) return false;
    return _feedsSinceReset >= after;
  }

  @override
  void reset() {
    _feedsSinceReset = 0;
    _partialCleared = true;
  }

  @override
  void inputFinished() {}

  @override
  void free() {}
}
