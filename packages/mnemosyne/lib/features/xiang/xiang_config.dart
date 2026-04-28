class XiangConfig {
  final double weatherDecayHalfLifeDays;
  final double activityDecayHalfLifeDays;
  final double locationDecayHalfLifeDays;
  final double ambientMoodDecayHalfLifeDays;
  final double sensoryTagDecayHalfLifeDays;
  final double resonanceThreshold;
  final double sceneTriggerThreshold;
  final double maxResonanceBoost;
  final double overRetrievalFactor;
  final double weatherMatchWeight;
  final double activityMatchWeight;
  final double locationMatchWeight;
  final double ambientMoodMatchWeight;
  final double sensoryTagMatchWeight;
  final double encodingContextBridgeWeight;

  const XiangConfig({
    this.weatherDecayHalfLifeDays = 7.0,
    this.activityDecayHalfLifeDays = 14.0,
    this.locationDecayHalfLifeDays = 30.0,
    this.ambientMoodDecayHalfLifeDays = 10.0,
    this.sensoryTagDecayHalfLifeDays = 5.0,
    this.resonanceThreshold = 0.3,
    this.sceneTriggerThreshold = 0.6,
    this.maxResonanceBoost = 2.0,
    this.overRetrievalFactor = 3.0,
    this.weatherMatchWeight = 0.20,
    this.activityMatchWeight = 0.25,
    this.locationMatchWeight = 0.15,
    this.ambientMoodMatchWeight = 0.15,
    this.sensoryTagMatchWeight = 0.15,
    this.encodingContextBridgeWeight = 0.10,
  });

  double decayHalfLifeFor(String category) {
    switch (category) {
      case 'weather':
        return weatherDecayHalfLifeDays;
      case 'temperature':
        return weatherDecayHalfLifeDays * 0.8;
      case 'activity':
        return activityDecayHalfLifeDays;
      case 'location':
        return locationDecayHalfLifeDays;
      case 'ambientMood':
        return ambientMoodDecayHalfLifeDays;
      default:
        return sensoryTagDecayHalfLifeDays;
    }
  }

  double matchWeightFor(String category) {
    switch (category) {
      case 'weather':
        return weatherMatchWeight;
      case 'temperature':
        return weatherMatchWeight * 0.8;
      case 'activity':
        return activityMatchWeight;
      case 'location':
        return locationMatchWeight;
      case 'ambientMood':
        return ambientMoodMatchWeight;
      default:
        return sensoryTagMatchWeight;
    }
  }
}
