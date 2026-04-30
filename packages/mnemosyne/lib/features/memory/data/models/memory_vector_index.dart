import 'package:objectbox/objectbox.dart';

@Entity()
class MemoryVectorIndex {
  @Id()
  int obId = 0;

  String memoryUid;

  @HnswIndex(dimensions: 256, distanceType: VectorDistanceType.cosine)
  @Property(type: PropertyType.floatVector)
  List<double> embedding;

  String modelName;
  int rawDimensions;
  int outputDimensions;
  bool isTruncated;

  int createdAtMs;
  int updatedAtMs;

  MemoryVectorIndex({
    this.obId = 0,
    required this.memoryUid,
    required this.embedding,
    this.modelName = 'embeddinggemma-300m',
    this.rawDimensions = 768,
    this.outputDimensions = 256,
    this.isTruncated = true,
    required this.createdAtMs,
    required this.updatedAtMs,
  });

  MemoryVectorIndex.create({
    required this.memoryUid,
    required this.embedding,
    this.modelName = 'embeddinggemma-300m',
    this.rawDimensions = 768,
    this.outputDimensions = 256,
    this.isTruncated = true,
  })  : createdAtMs = DateTime.now().millisecondsSinceEpoch,
        updatedAtMs = DateTime.now().millisecondsSinceEpoch;

  void updateEmbedding(List<double> newEmbedding, {String? newModelName}) {
    embedding = newEmbedding;
    if (newModelName != null) modelName = newModelName;
    updatedAtMs = DateTime.now().millisecondsSinceEpoch;
  }
}
