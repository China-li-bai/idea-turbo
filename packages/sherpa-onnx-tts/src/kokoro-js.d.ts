declare module 'kokoro-js' {
  export interface KokoroTTSOptions {
    dtype?: 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16';
    device?: 'wasm' | 'webgpu' | 'cpu';
  }

  export interface GenerateOptions {
    voice: string;
  }

  export interface AudioOutput {
    toWav(): Uint8Array;
    save(path: string): void;
  }

  export class KokoroTTS {
    static from_pretrained(model_id: string, options?: KokoroTTSOptions): Promise<KokoroTTS>;
    generate(text: string, options: GenerateOptions): Promise<AudioOutput>;
    list_voices(): string[];
    stream(splitter: any): AsyncIterable<any>;
  }
}
