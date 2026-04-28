class MnemosyneConstants {
  static const String defaultDatabaseName = 'mnemosyne.db';
  static const double defaultDecayLambda = 0.0001;
  static const double defaultPruningThreshold = 0.1;
  static const double defaultImportanceBase = 0.5;
  static const int defaultRetrievalLimit = 10;
  static const int defaultWorkingMemoryLimit = 20;

  static const double semanticWeight = 0.3;
  static const double keywordWeight = 0.25;
  static const double recencyWeight = 0.15;
  static const double importanceWeight = 0.15;
  static const double contextMatchWeight = 0.15;

  static const double minImportance = 0.0;
  static const double maxImportance = 1.0;
  static const double minArousal = 0.0;
  static const double maxArousal = 1.0;
  static const double minValence = -1.0;
  static const double maxValence = 1.0;

  static const double noveltyKNN = 5;
  static const double noveltyBoostMax = 0.3;
  static const double noveltyThreshold = 0.6;
}

enum MemoryType {
  episodic,
  semantic,
  preference,
  instruction,
}

enum UserMood {
  happy,
  sad,
  neutral,
  anxious,
  excited,
  angry,
}

enum TimeOfDay {
  morning,
  afternoon,
  evening,
  night,
}

enum DayOfWeek {
  weekday,
  weekend,
}

enum SocialContext {
  alone,
  withFriends,
  atWork,
  commuting,
}
