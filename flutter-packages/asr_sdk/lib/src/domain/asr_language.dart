/// Languages supported by asr_sdk.
///
/// The [code] field matches sherpa-onnx's language strings (e.g. "zh",
/// "en", "auto") so it can be passed directly to model configs without
/// translation.
enum AsrLanguage {
  auto('auto'),
  zh('zh'),
  en('en'),
  yue('yue'),
  ja('ja'),
  ko('ko');

  final String code;
  const AsrLanguage(this.code);

  @override
  String toString() => code;
}
