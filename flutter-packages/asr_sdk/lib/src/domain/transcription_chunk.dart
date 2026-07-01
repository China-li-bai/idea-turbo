/// One incremental chunk emitted by a streaming recognition session.
///
/// Streaming ASR produces two kinds of updates:
/// - [partialText]: provisional, may change as more audio arrives.
/// - [committedText]: finalized when [isEndpoint] is true (end of utterance).
class TranscriptionChunk {
  /// Provisional text for the current utterance. Updated continuously.
  final String partialText;

  /// Finalized text for the just-completed utterance. Only non-null when
  /// [isEndpoint] is true.
  final String? committedText;

  /// True when the engine detected an endpoint (sentence boundary / pause).
  /// Consumers should persist [committedText] and reset their partial view.
  final bool isEndpoint;

  const TranscriptionChunk({
    required this.partialText,
    this.committedText,
    this.isEndpoint = false,
  });

  @override
  String toString() =>
      'TranscriptionChunk(partial="$partialText", committed=$committedText, endpoint=$isEndpoint)';
}
