import 'gemma_embedding_provider.dart';

class FlutterGemmaAdapter {
  static OnDeviceEmbeddingCallback createCallback({
    required Future<List<double>> Function(String text) getEmbedding,
  }) {
    return (String text) async {
      final embedding = await getEmbedding(text);
      return embedding;
    };
  }

  static GemmaEmbeddingConfig createConfig({
    required Future<List<double>> Function(String text) getEmbedding,
    int maxSequenceLength = 8192,
    String modelAssetPath = 'assets/models/embeddinggemma-300m/',
    String? huggingFaceToken,
  }) {
    return GemmaEmbeddingConfig(
      inferenceCallback: createCallback(getEmbedding: getEmbedding),
      maxSequenceLength: maxSequenceLength,
      modelAssetPath: modelAssetPath,
      huggingFaceToken: huggingFaceToken,
    );
  }
}
