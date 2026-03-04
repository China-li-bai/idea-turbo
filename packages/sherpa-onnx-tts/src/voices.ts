import type { Voice } from './types';
import { languagesMap } from './languages';

const enUs = languagesMap['en-us'];
const enGb = languagesMap['en-gb'];
const ja = languagesMap['ja'];
const cmn = languagesMap['cmn'];
const es = languagesMap['es-419'];
const hi = languagesMap['hi'];
const it = languagesMap['it'];
const ptBr = languagesMap['pt-br'];

export const voices: Voice[] = [
  { id: 'af_heart', name: 'Heart', lang: enUs, gender: 'Female', targetQuality: 'A', overallGrade: 'A' },
  { id: 'af_alloy', name: 'Alloy', lang: enUs, gender: 'Female', targetQuality: 'B', overallGrade: 'C' },
  { id: 'af_aoede', name: 'Aoede', lang: enUs, gender: 'Female', targetQuality: 'B', overallGrade: 'C+' },
  { id: 'af_bella', name: 'Bella', lang: enUs, gender: 'Female', targetQuality: 'A', overallGrade: 'A-' },
  { id: 'af_jessica', name: 'Jessica', lang: enUs, gender: 'Female', targetQuality: 'C', overallGrade: 'D' },
  { id: 'af_kore', name: 'Kore', lang: enUs, gender: 'Female', targetQuality: 'B', overallGrade: 'C+' },
  { id: 'af_nicole', name: 'Nicole', lang: enUs, gender: 'Female', targetQuality: 'B', overallGrade: 'B-' },
  { id: 'af_nova', name: 'Nova', lang: enUs, gender: 'Female', targetQuality: 'B', overallGrade: 'C' },
  { id: 'af_river', name: 'River', lang: enUs, gender: 'Female', targetQuality: 'C', overallGrade: 'D' },
  { id: 'af_sarah', name: 'Sarah', lang: enUs, gender: 'Female', targetQuality: 'B', overallGrade: 'C+' },
  { id: 'af_sky', name: 'Sky', lang: enUs, gender: 'Female', targetQuality: 'B', overallGrade: 'C-' },
  { id: 'am_adam', name: 'Adam', lang: enUs, gender: 'Male', targetQuality: 'D', overallGrade: 'F+' },
  { id: 'am_echo', name: 'Echo', lang: enUs, gender: 'Male', targetQuality: 'C', overallGrade: 'D' },
  { id: 'am_eric', name: 'Eric', lang: enUs, gender: 'Male', targetQuality: 'C', overallGrade: 'D' },
  { id: 'am_fenrir', name: 'Fenrir', lang: enUs, gender: 'Male', targetQuality: 'B', overallGrade: 'C+' },
  { id: 'am_liam', name: 'Liam', lang: enUs, gender: 'Male', targetQuality: 'C', overallGrade: 'D' },
  { id: 'am_michael', name: 'Michael', lang: enUs, gender: 'Male', targetQuality: 'B', overallGrade: 'C+' },
  { id: 'am_onyx', name: 'Onyx', lang: enUs, gender: 'Male', targetQuality: 'C', overallGrade: 'D' },
  { id: 'am_puck', name: 'Puck', lang: enUs, gender: 'Male', targetQuality: 'B', overallGrade: 'C+' },
  { id: 'am_santa', name: 'Santa', lang: enUs, gender: 'Male', targetQuality: 'C', overallGrade: 'D-' },
  { id: 'bf_emma', name: 'Emma', lang: enGb, gender: 'Female', targetQuality: 'B', overallGrade: 'B-' },
  { id: 'bf_isabella', name: 'Isabella', lang: enGb, gender: 'Female', targetQuality: 'B', overallGrade: 'C' },
  { id: 'bf_alice', name: 'Alice', lang: enGb, gender: 'Female', targetQuality: 'C', overallGrade: 'D' },
  { id: 'bf_lily', name: 'Lily', lang: enGb, gender: 'Female', targetQuality: 'C', overallGrade: 'D' },
  { id: 'bm_george', name: 'George', lang: enGb, gender: 'Male', targetQuality: 'B', overallGrade: 'C' },
  { id: 'bm_lewis', name: 'Lewis', lang: enGb, gender: 'Male', targetQuality: 'C', overallGrade: 'D+' },
  { id: 'bm_daniel', name: 'Daniel', lang: enGb, gender: 'Male', targetQuality: 'C', overallGrade: 'D' },
  { id: 'bm_fable', name: 'Fable', lang: enGb, gender: 'Male', targetQuality: 'B', overallGrade: 'C' },
  { id: 'ef_dora', name: 'Dora', lang: es, gender: 'Female', targetQuality: 'C', overallGrade: 'D' },
  { id: 'em_alex', name: 'Alex', lang: es, gender: 'Male', targetQuality: 'C', overallGrade: 'D' },
  { id: 'em_santa', name: 'Santa', lang: es, gender: 'Male', targetQuality: 'C', overallGrade: 'D' },
  { id: 'jf_alpha', name: 'Alpha', lang: ja, gender: 'Female', targetQuality: 'B', overallGrade: 'C+' },
  { id: 'jf_gongitsune', name: 'Gongitsune', lang: ja, gender: 'Female', targetQuality: 'B', overallGrade: 'C' },
  { id: 'jf_nezumi', name: 'Nezumi', lang: ja, gender: 'Female', targetQuality: 'B', overallGrade: 'C-' },
  { id: 'jf_tebukuro', name: 'Tebukuro', lang: ja, gender: 'Female', targetQuality: 'B', overallGrade: 'C' },
  { id: 'jm_kumo', name: 'Kumo', lang: ja, gender: 'Male', targetQuality: 'B', overallGrade: 'C-' },
  { id: 'zf_xiaobei', name: 'Xiaobei', lang: cmn, gender: 'Female', targetQuality: 'C', overallGrade: 'D' },
  { id: 'zf_xiaoni', name: 'Xiaoni', lang: cmn, gender: 'Female', targetQuality: 'C', overallGrade: 'D' },
  { id: 'zf_xiaoxiao', name: 'Xiaoxiao', lang: cmn, gender: 'Female', targetQuality: 'C', overallGrade: 'D' },
  { id: 'zf_xiaoyi', name: 'Xiaoyi', lang: cmn, gender: 'Female', targetQuality: 'C', overallGrade: 'D' },
  { id: 'zm_yunjian', name: 'Yunjian', lang: cmn, gender: 'Male', targetQuality: 'C', overallGrade: 'D' },
  { id: 'zm_yunxi', name: 'Yunxi', lang: cmn, gender: 'Male', targetQuality: 'C', overallGrade: 'D' },
  { id: 'zm_yunxia', name: 'Yunxia', lang: cmn, gender: 'Male', targetQuality: 'C', overallGrade: 'D' },
  { id: 'zm_yunyang', name: 'Yunyang', lang: cmn, gender: 'Male', targetQuality: 'C', overallGrade: 'D' },
  { id: 'hf_alpha', name: 'Alpha', lang: hi, gender: 'Female', targetQuality: 'B', overallGrade: 'C' },
  { id: 'hf_beta', name: 'Beta', lang: hi, gender: 'Female', targetQuality: 'B', overallGrade: 'C' },
  { id: 'hm_omega', name: 'Omega', lang: hi, gender: 'Male', targetQuality: 'B', overallGrade: 'C' },
  { id: 'hm_psi', name: 'Psi', lang: hi, gender: 'Male', targetQuality: 'B', overallGrade: 'C' },
  { id: 'if_sara', name: 'Sara', lang: it, gender: 'Female', targetQuality: 'B', overallGrade: 'C' },
  { id: 'im_nicola', name: 'Nicola', lang: it, gender: 'Male', targetQuality: 'B', overallGrade: 'C' },
  { id: 'pf_dora', name: 'Dora', lang: ptBr, gender: 'Female', targetQuality: 'C', overallGrade: 'D' },
  { id: 'pm_alex', name: 'Alex', lang: ptBr, gender: 'Male', targetQuality: 'C', overallGrade: 'D' },
  { id: 'pm_santa', name: 'Santa', lang: ptBr, gender: 'Male', targetQuality: 'C', overallGrade: 'D' },
];

export const voicesMap: Record<string, Voice> = Object.fromEntries(
  voices.map((voice) => [voice.id, voice])
);

export const voicesByLang: Record<string, Voice[]> = voices.reduce(
  (acc, voice) => {
    const langId = voice.lang.id;
    if (!acc[langId]) acc[langId] = [];
    acc[langId].push(voice);
    return acc;
  },
  {} as Record<string, Voice[]>
);

export const defaultVoice = voices[0];
