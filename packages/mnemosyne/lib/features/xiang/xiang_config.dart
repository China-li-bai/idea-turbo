class XiangConfig {
  final double weatherDecayHalfLifeDays;
  final double activityDecayHalfLifeDays;
  final double locationDecayHalfLifeDays;
  final double ambientMoodDecayHalfLifeDays;
  final double innerStateDecayHalfLifeDays;
  final double relationshipStateDecayHalfLifeDays;
  final double eventShapeDecayHalfLifeDays;
  final double changeSignalDecayHalfLifeDays;
  final double recallCueDecayHalfLifeDays;
  final double sensoryTagDecayHalfLifeDays;
  final double resonanceThreshold;
  final double sceneTriggerThreshold;
  final double maxResonanceBoost;
  final double overRetrievalFactor;
  final double weatherMatchWeight;
  final double activityMatchWeight;
  final double locationMatchWeight;
  final double ambientMoodMatchWeight;
  final double innerStateMatchWeight;
  final double relationshipStateMatchWeight;
  final double eventShapeMatchWeight;
  final double changeSignalMatchWeight;
  final double recallCueMatchWeight;
  final double sensoryTagMatchWeight;
  final double encodingContextBridgeWeight;

  const XiangConfig({
    this.weatherDecayHalfLifeDays = 7.0,
    this.activityDecayHalfLifeDays = 14.0,
    this.locationDecayHalfLifeDays = 30.0,
    this.ambientMoodDecayHalfLifeDays = 10.0,
    this.innerStateDecayHalfLifeDays = 21.0,
    this.relationshipStateDecayHalfLifeDays = 45.0,
    this.eventShapeDecayHalfLifeDays = 60.0,
    this.changeSignalDecayHalfLifeDays = 45.0,
    this.recallCueDecayHalfLifeDays = 30.0,
    this.sensoryTagDecayHalfLifeDays = 5.0,
    this.resonanceThreshold = 0.3,
    this.sceneTriggerThreshold = 0.6,
    this.maxResonanceBoost = 2.0,
    this.overRetrievalFactor = 3.0,
    this.weatherMatchWeight = 0.20,
    this.activityMatchWeight = 0.25,
    this.locationMatchWeight = 0.15,
    this.ambientMoodMatchWeight = 0.15,
    this.innerStateMatchWeight = 0.25,
    this.relationshipStateMatchWeight = 0.20,
    this.eventShapeMatchWeight = 0.25,
    this.changeSignalMatchWeight = 0.20,
    this.recallCueMatchWeight = 0.30,
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
      case 'innerState':
        return innerStateDecayHalfLifeDays;
      case 'relationshipState':
        return relationshipStateDecayHalfLifeDays;
      case 'eventShape':
        return eventShapeDecayHalfLifeDays;
      case 'changeSignal':
        return changeSignalDecayHalfLifeDays;
      case 'recallCue':
        return recallCueDecayHalfLifeDays;
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
      case 'innerState':
        return innerStateMatchWeight;
      case 'relationshipState':
        return relationshipStateMatchWeight;
      case 'eventShape':
        return eventShapeMatchWeight;
      case 'changeSignal':
        return changeSignalMatchWeight;
      case 'recallCue':
        return recallCueMatchWeight;
      default:
        return sensoryTagMatchWeight;
    }
  }
}
