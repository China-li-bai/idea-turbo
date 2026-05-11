class PetLocalDataSource {
  final Future<String> Function(String key) _read;
  final Future<void> Function(String key, String value) _write;

  PetLocalDataSource({
    required Future<String> Function(String key) read,
    required Future<void> Function(String key, String value) write,
  })  : _read = read,
        _write = write;

  static String snapshotKey(String petId) => 'pet_snapshot_$petId';
  static String vitalityKey(String petId) => 'pet_vitality_$petId';
  static String personalityKey(String petId) => 'pet_personality_$petId';
  static String resonanceKey(String petId) => 'pet_resonance_$petId';

  Future<String?> read(String key) async {
    final value = await _read(key);
    return value.isEmpty ? null : value;
  }

  Future<void> write(String key, String value) async {
    await _write(key, value);
  }

  Future<void> delete(String key) async {
    await _write(key, '');
  }
}
