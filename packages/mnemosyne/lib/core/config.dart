import 'package:mnemosyne/core/constants.dart';

class MnemosyneConfig {
  final String databaseName;
  final double decayLambda;
  final double pruningThreshold;
  final int retrievalLimit;
  final int workingMemoryLimit;
  final double semanticWeight;
  final double keywordWeight;
  final double recencyWeight;
  final double importanceWeight;
  final double contextMatchWeight;
  final bool enableDecay;
  final bool enableConsolidation;

  const MnemosyneConfig({
    this.databaseName = MnemosyneConstants.defaultDatabaseName,
    this.decayLambda = MnemosyneConstants.defaultDecayLambda,
    this.pruningThreshold = MnemosyneConstants.defaultPruningThreshold,
    this.retrievalLimit = MnemosyneConstants.defaultRetrievalLimit,
    this.workingMemoryLimit = MnemosyneConstants.defaultWorkingMemoryLimit,
    this.semanticWeight = MnemosyneConstants.semanticWeight,
    this.keywordWeight = MnemosyneConstants.keywordWeight,
    this.recencyWeight = MnemosyneConstants.recencyWeight,
    this.importanceWeight = MnemosyneConstants.importanceWeight,
    this.contextMatchWeight = MnemosyneConstants.contextMatchWeight,
    this.enableDecay = true,
    this.enableConsolidation = true,
  });

  MnemosyneConfig copyWith({
    String? databaseName,
    double? decayLambda,
    double? pruningThreshold,
    int? retrievalLimit,
    int? workingMemoryLimit,
    double? semanticWeight,
    double? keywordWeight,
    double? recencyWeight,
    double? importanceWeight,
    double? contextMatchWeight,
    bool? enableDecay,
    bool? enableConsolidation,
  }) {
    return MnemosyneConfig(
      databaseName: databaseName ?? this.databaseName,
      decayLambda: decayLambda ?? this.decayLambda,
      pruningThreshold: pruningThreshold ?? this.pruningThreshold,
      retrievalLimit: retrievalLimit ?? this.retrievalLimit,
      workingMemoryLimit: workingMemoryLimit ?? this.workingMemoryLimit,
      semanticWeight: semanticWeight ?? this.semanticWeight,
      keywordWeight: keywordWeight ?? this.keywordWeight,
      recencyWeight: recencyWeight ?? this.recencyWeight,
      importanceWeight: importanceWeight ?? this.importanceWeight,
      contextMatchWeight: contextMatchWeight ?? this.contextMatchWeight,
      enableDecay: enableDecay ?? this.enableDecay,
      enableConsolidation: enableConsolidation ?? this.enableConsolidation,
    );
  }
}
