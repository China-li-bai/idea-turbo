import { tokenize } from './tokenizer';
import type { TextProcessorChunk } from './types';
import { pinyin } from 'pinyin-pro';

const phonemeMap: Record<string, string> = {
  a: 'ɑ',
  b: 'b',
  c: 'k',
  d: 'd',
  e: 'ɛ',
  f: 'f',
  g: 'ɡ',
  h: 'h',
  i: 'ɪ',
  j: 'dʒ',
  k: 'k',
  l: 'l',
  m: 'm',
  n: 'n',
  o: 'oʊ',
  p: 'p',
  q: 'k',
  r: 'ɹ',
  s: 's',
  t: 't',
  u: 'u',
  v: 'v',
  w: 'w',
  x: 'ks',
  y: 'j',
  z: 'z',
  th: 'θ',
  sh: 'ʃ',
  ch: 'tʃ',
  ng: 'ŋ',
  ai: 'aɪ',
  au: 'aʊ',
  oi: 'ɔɪ',
  ou: 'aʊ',
  ea: 'iː',
  ee: 'iː',
  oo: 'uː',
  ar: 'ɑːr',
  or: 'ɔːr',
  er: 'ɜːr',
  ir: 'ɜːr',
  ur: 'ɜːr',
};

const pinyinToIpa: Record<string, string> = {
  a: 'ɑ',
  ai: 'aɪ',
  an: 'an',
  ang: 'ɑŋ',
  ao: 'aʊ',
  b: 'p',
  c: 'tsʰ',
  ch: 'tʂʰ',
  d: 't',
  e: 'ɤ',
  ei: 'eɪ',
  en: 'ən',
  eng: 'ɤŋ',
  er: 'ɚ',
  f: 'f',
  g: 'k',
  h: 'x',
  i: 'i',
  ia: 'iɑ',
  ian: 'iɛn',
  iang: 'iɑŋ',
  iao: 'iaʊ',
  ie: 'iɛ',
  in: 'in',
  ing: 'iŋ',
  iong: 'iʊŋ',
  iu: 'iou',
  j: 'tɕ',
  k: 'kʰ',
  l: 'l',
  m: 'm',
  n: 'n',
  ng: 'ŋ',
  o: 'ɔ',
  ong: 'ʊŋ',
  ou: 'oʊ',
  p: 'pʰ',
  q: 'tɕʰ',
  r: 'ʐ',
  s: 's',
  sh: 'ʂ',
  t: 'tʰ',
  u: 'u',
  ua: 'uɑ',
  uai: 'uaɪ',
  uan: 'uan',
  uang: 'uɑŋ',
  ue: 'yɛ',
  ui: 'ueɪ',
  un: 'un',
  uo: 'uɔ',
  v: 'y',
  van: 'yɛn',
  ve: 'yɛ',
  vn: 'yn',
  w: 'w',
  x: 'ɕ',
  y: 'j',
  z: 'ts',
  zh: 'tʂ',
};

function normalizeText(text: string): string {
  return text
    .replaceAll('\u2018', "'")
    .replaceAll('\u2019', "'")
    .replaceAll('\u00AB', '(')
    .replaceAll('\u00BB', ')')
    .replaceAll('\u201C', '"')
    .replaceAll('\u201D', '"')
    .replace(/\u3001/g, ', ')
    .replace(/\u3002/g, '. ')
    .replace(/\uFF01/g, '! ')
    .replace(/\uFF0C/g, ', ')
    .replace(/\uFF1A/g, ': ')
    .replace(/\uFF1B/g, '; ')
    .replace(/\uFF1F/g, '? ')
    .replaceAll('\n', '  ')
    .replaceAll('\t', '  ')
    .trim();
}

export async function phonemize(text: string, langId: string): Promise<string> {
  const normalized = normalizeText(text);
  
  if (langId === 'cmn') {
    return phonemizeChinese(text);
  }
  
  return phonemizeEnglish(text);
}

function phonemizeChinese(text: string): string {
  const py = pinyin(text, { toneType: 'symbol', pattern: 'num' });
  const ipaParts: string[] = [];
  
  for (const part of py) {
    const pinyinStr = pinyinToIpa[part] || pinyinToIpa[part];
    if (pinyinToIpa[part]) {
      ipaParts.push(pinyinToIpa[part]);
    }
  }
  
  return ipaParts.join(' ');
}

function phonemizeEnglish(text: string): string {
  const normalized = normalizeText(text);
  const words = normalized.toLowerCase().split(/\s+/);
  const phonemes: string[] = [];

  for (const word of words) {
    if (!word) continue;

    let i = 0;
    let wordPhonemes = '';

    while (i < word.length) {
      let found = false;

      for (let len = 3; len >= 1; len--) {
        const substr = word.substring(i, i + len);
        if (phonemeMap[substr]) {
          wordPhonemes += phonemeMap[substr] + ' ';
          i += len;
          found = true;
          break;
        }
      }

      if (!found) {
        const char = word[i];
        if (/[a-zA-Z]/.test(char)) {
          wordPhonemes += phonemeMap[char] || char;
        } else if (/[0-9]/.test(char)) {
          wordPhonemes += char;
        }
        i++;
      }
    }

    phonemes.push(wordPhonemes.trim());
  }

  return phonemes.join(' ');
}

export function sanitizeText(rawText: string): string {
  return rawText
    .replace(/\.\s+/g, '[0.4s]')
    .replace(/,\s+/g, '[0.2s]')
    .replace(/;\s+/g, '[0.4s]')
    .replace(/:\s+/g, '[0.3s]')
    .replace(/!\s+/g, '![0.1s]')
    .replace(/\?\s+/g, '?[0.1s]')
    .replace(/\n+/g, '[0.4s]')
    .trim();
}

export function segmentText(sanitizedText: string): string[] {
  const regex = /(\[[0-9]+(?:\.[0-9]+)?s\])/g;
  return sanitizedText
    .split(regex)
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

export function isSilenceMarker(segment: string): boolean {
  return /^\[[0-9]+(?:\.[0-9]+)?s\]$/.test(segment.trim());
}

export function extractSilenceDuration(marker: string): number {
  const match = marker.trim().match(/^\[([0-9]+(?:\.[0-9]+)?)s\]$/);
  return match ? parseFloat(match[1]) : 0;
}

function createPhonemeSubChunks(phonemes: string, tokensPerChunk: number): string[] {
  if (phonemes.length <= tokensPerChunk) return [phonemes];

  const chunks: string[] = [];
  let currentChunk = '';

  for (const phoneme of phonemes) {
    if (currentChunk.length >= tokensPerChunk) {
      chunks.push(currentChunk);
      currentChunk = '';
    }
    currentChunk += phoneme;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

export async function preprocessText(
  text: string,
  lang: string,
  tokensPerChunk: number
): Promise<TextProcessorChunk[]> {
  const chunks: TextProcessorChunk[] = [];
  const sanitized = sanitizeText(text);
  const segments = segmentText(sanitized);

  for (const segment of segments) {
    if (isSilenceMarker(segment)) {
      const durationSeconds = extractSilenceDuration(segment);
      chunks.push({ type: 'silence', durationSeconds });
      continue;
    }

    const phonemized = await phonemize(segment, lang);
    const phonemizedChunks = createPhonemeSubChunks(phonemized, tokensPerChunk);

    for (const phonemeChunk of phonemizedChunks) {
      const tokens = tokenize(phonemeChunk);
      chunks.push({ type: 'text', content: phonemeChunk, tokens });
    }
  }

  return chunks;
}
