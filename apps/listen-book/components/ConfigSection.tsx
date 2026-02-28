'use client';

import { TTSConfig } from '../lib/tts/types';
import { getAllProfiles } from '../lib/tts/profiles';
import { SearchableSelect } from './SearchableSelect';
import { useI18n } from '../lib/i18n/context';

interface ConfigSectionProps {
  config: TTSConfig;
  voices: SpeechSynthesisVoice[];
  onConfigChange: (config: Partial<TTSConfig>) => void;
  currentServiceName?: string;
  serviceType?: 'auto' | 'webspeech' | 'edgetts';
}

export function ConfigSection({ config, voices, onConfigChange, currentServiceName, serviceType }: ConfigSectionProps) {
  const { t } = useI18n();
  const profiles = getAllProfiles();

  const handleProfileChange = (profileName: string) => {
    if (profileName === '') {
      return;
    }

    const profile = profiles.find(p => p.name === profileName);
    if (profile) {
      onConfigChange(profile.config);
    }
  };

  return (
    <div className="space-y-4">
      {currentServiceName && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
              {t.config.currentTTSService}: {currentServiceName}
            </span>
            {serviceType === 'auto' && (
              <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                {t.service.autoSelect}
              </span>
            )}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          {t.config.profile}
        </label>
        <select
          value={profiles.find(p => 
            p.config.rate === config.rate && 
            p.config.pitch === config.pitch && 
            p.config.volume === config.volume
          )?.name || ''}
          onChange={(e) => handleProfileChange(e.target.value)}
          className="w-full p-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">{t.config.custom}</option>
          {profiles.map((profile) => (
            <option key={profile.name} value={profile.name}>
              {profile.name} - {profile.description}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            {t.config.rate}: {config.rate?.toFixed(1)}
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={config.rate || 1}
            onChange={(e) => onConfigChange({ rate: parseFloat(e.target.value) })}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            {t.config.pitch}: {config.pitch?.toFixed(1)}
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={config.pitch || 1}
            onChange={(e) => onConfigChange({ pitch: parseFloat(e.target.value) })}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            {t.config.volume}: {config.volume?.toFixed(1)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={config.volume || 1}
            onChange={(e) => onConfigChange({ volume: parseFloat(e.target.value) })}
            className="w-full"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          {t.config.voiceSelection}
        </label>
        <SearchableSelect
          value={config.voiceURI || ''}
          onChange={(value) => onConfigChange({ voiceURI: value })}
          options={[
            { value: '', label: t.config.defaultVoice },
            ...voices.map((voice) => ({
              value: voice.voiceURI,
              label: `${voice.name} (${voice.lang})`,
            })),
          ]}
          placeholder={t.config.voiceSelection}
          searchPlaceholder={t.config.searchVoice}
          className="w-full"
        />
      </div>
    </div>
  );
}
