import { env as hf, StyleTextToSpeech2Model, AutoTokenizer, Tensor, RawAudio } from "@huggingface/transformers";
import { phonemize, is_chinese_voice } from "./phonemize.js";
import { TextSplitterStream } from "./splitter.js";
import { getVoiceData, VOICES } from "./voices.js";

const STYLE_DIM = 256;
const SAMPLE_RATE = 24000;

export class KokoroTTS {
  constructor(model, tokenizer) {
    this.model = model;
    this.tokenizer = tokenizer;
  }

  static async from_pretrained(model_id, { dtype = "fp32", device = null, progress_callback = null } = {}) {
    const model = StyleTextToSpeech2Model.from_pretrained(model_id, { progress_callback, dtype, device });
    const tokenizer = AutoTokenizer.from_pretrained(model_id, { progress_callback });

    const info = await Promise.all([model, tokenizer]);
    return new KokoroTTS(...info);
  }

  get voices() {
    return VOICES;
  }

  list_voices() {
    console.table(VOICES);
  }

  _validate_voice(voice) {
    if (!VOICES.hasOwnProperty(voice)) {
      console.error(`Voice "${voice}" not found. Available voices:`);
      console.table(VOICES);
      throw new Error(`Voice "${voice}" not found. Should be one of: ${Object.keys(VOICES).join(", ")}.`);
    }
    
    if (is_chinese_voice(voice)) {
      return "z";
    }
    
    const language = voice.at(0);
    return language;
  }

  async generate(text, { voice = "af_heart", speed = 1 } = {}) {
    const language = this._validate_voice(voice);

    const phonemes = await phonemize(text, language);
    const { input_ids } = this.tokenizer(phonemes, {
      truncation: true,
    });

    return this.generate_from_ids(input_ids, { voice, speed });
  }

  async generate_from_ids(input_ids, { voice = "af_heart", speed = 1 } = {}) {
    const num_tokens = Math.min(Math.max(input_ids.dims.at(-1) - 2, 0), 509);

    const data = await getVoiceData(voice);
    const offset = num_tokens * STYLE_DIM;
    const voiceData = data.slice(offset, offset + STYLE_DIM);

    const inputs = {
      input_ids,
      style: new Tensor("float32", voiceData, [1, STYLE_DIM]),
      speed: new Tensor("float32", [speed], [1]),
    };

    const { waveform } = await this.model(inputs);
    return new RawAudio(waveform.data, SAMPLE_RATE);
  }

  async *stream(text, { voice = "af_heart", speed = 1, split_pattern = null } = {}) {
    const language = this._validate_voice(voice);

    let splitter;
    if (text instanceof TextSplitterStream) {
      splitter = text;
    } else if (typeof text === "string") {
      splitter = new TextSplitterStream();
      const chunks = split_pattern
        ? text
          .split(split_pattern)
          .map((chunk) => chunk.trim())
          .filter((chunk) => chunk.length > 0)
        : [text];
      splitter.push(...chunks);
    } else {
      throw new Error("Invalid input type. Expected string or TextSplitterStream.");
    }
    for await (const sentence of splitter) {
      const phonemes = await phonemize(sentence, language);
      const { input_ids } = this.tokenizer(phonemes, {
        truncation: true,
      });

      const audio = await this.generate_from_ids(input_ids, { voice, speed });
      yield { text: sentence, phonemes, audio };
    }
  }
}

export const env = {
  set cacheDir(value) {
    hf.cacheDir = value
  },
  get cacheDir() {
    return hf.cacheDir
  },
  set wasmPaths(value) {
    hf.backends.onnx.wasm.wasmPaths = value;
  },
  get wasmPaths() {
    return hf.backends.onnx.wasm.wasmPaths;
  },
};

export { TextSplitterStream };
