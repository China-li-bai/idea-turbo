import type { Language } from './types';

export const languages: Language[] = [
  { id: 'en-us', name: 'English (US)' },
  { id: 'en-gb', name: 'English (GB)' },
  { id: 'ja', name: 'Japanese' },
  { id: 'cmn', name: 'Chinese' },
  { id: 'es-419', name: 'Spanish' },
  { id: 'hi', name: 'Hindi' },
  { id: 'it', name: 'Italian' },
  { id: 'pt-br', name: 'Portuguese (BR)' },
];

export const languagesMap: Record<string, Language> = Object.fromEntries(
  languages.map((lang) => [lang.id, lang])
);
