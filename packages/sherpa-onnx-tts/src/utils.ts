import { SAMPLE_RATE, WINDOW_SIZE, BUFFER_SAMPLES } from './constants';

export function trimWaveform(waveform: Float32Array): Float32Array {
  const numWindows = Math.ceil(waveform.length / WINDOW_SIZE);
  const windowAmplitudes = new Float32Array(numWindows);
  let maxWindowAmp = 0;

  for (let i = 0; i < numWindows; i++) {
    const start = i * WINDOW_SIZE;
    const end = Math.min(start + WINDOW_SIZE, waveform.length);
    let sum = 0;
    for (let j = start; j < end; j++) {
      sum += Math.abs(waveform[j]);
    }
    const avg = sum / (end - start);
    windowAmplitudes[i] = avg;
    if (avg > maxWindowAmp) maxWindowAmp = avg;
  }

  const threshold = maxWindowAmp * 0.05;

  let startSample = 0;
  for (let i = 0; i < numWindows; i++) {
    if (windowAmplitudes[i] > threshold) {
      const winStart = i * WINDOW_SIZE;
      const winEnd = Math.min(winStart + WINDOW_SIZE, waveform.length);
      for (let j = winStart; j < winEnd; j++) {
        if (Math.abs(waveform[j]) > threshold) {
          startSample = j;
          break;
        }
      }
      break;
    }
  }

  let endSample = waveform.length;
  for (let i = numWindows - 1; i >= 0; i--) {
    if (windowAmplitudes[i] > threshold) {
      const winStart = i * WINDOW_SIZE;
      const winEnd = Math.min(winStart + WINDOW_SIZE, waveform.length);
      for (let j = winEnd - 1; j >= winStart; j--) {
        if (Math.abs(waveform[j]) > threshold) {
          endSample = j + 1;
          break;
        }
      }
      break;
    }
  }

  startSample = Math.max(0, startSample - BUFFER_SAMPLES);
  endSample = Math.min(waveform.length, endSample + BUFFER_SAMPLES);

  return waveform.slice(startSample, endSample);
}

export function createWavBuffer(waveform: Float32Array, sampleRate: number = SAMPLE_RATE): ArrayBuffer {
  const numOfChan = 1;
  const length = waveform.length * numOfChan * 2 + 44;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);

  let pos = 0;

  function writeUint32(val: number) {
    view.setUint32(pos, val, true);
    pos += 4;
  }

  function writeUint16(val: number) {
    view.setUint16(pos, val, true);
    pos += 2;
  }

  writeUint32(0x46464952);
  writeUint32(length - 8);
  writeUint32(0x45564157);

  writeUint32(0x20746d66);
  writeUint32(16);
  writeUint16(1);
  writeUint16(numOfChan);
  writeUint32(sampleRate);
  writeUint32(sampleRate * 2 * numOfChan);
  writeUint16(numOfChan * 2);
  writeUint16(16);

  writeUint32(0x61746164);
  writeUint32(length - pos - 4);

  for (let i = 0; i < waveform.length; i++) {
    const sample = Math.max(-1, Math.min(1, waveform[i]));
    const intSample = sample < 0 ? sample * 32768 : sample * 32767;
    view.setInt16(pos, intSample | 0, true);
    pos += 2;
  }

  return buffer;
}

export function createAudioBuffer(waveform: Float32Array, sampleRate: number = SAMPLE_RATE): AudioBuffer {
  const audioContext = new AudioContext();
  const audioBuffer = audioContext.createBuffer(1, waveform.length, sampleRate);
  audioBuffer.getChannelData(0).set(waveform);
  return audioBuffer;
}

export async function playAudioBuffer(audioBuffer: AudioBuffer): Promise<void> {
  const audioContext = new AudioContext({ sampleRate: audioBuffer.sampleRate });

  if (audioContext.state === 'suspended') {
    console.log('[KokoroTTS] AudioContext suspended, resuming...');
    await audioContext.resume();
  }

  console.log('[KokoroTTS] Playing audio buffer:', audioBuffer.duration, 's', audioBuffer.sampleRate, 'Hz');

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);

  return new Promise((resolve) => {
    source.onended = () => {
      console.log('[KokoroTTS] Audio playback ended');
      audioContext.close();
      resolve();
    };
    source.start();
    console.log('[KokoroTTS] Audio playback started');
  });
}

export function detectWebGPU(): boolean {
  if (typeof navigator === 'undefined') return false;
  return 'gpu' in navigator;
}

export async function checkWebGPUSupport(): Promise<boolean> {
  if (!detectWebGPU()) return false;

  try {
    const adapter = await (navigator as any).gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}
