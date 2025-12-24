import { useState, useRef, useEffect } from "react";
import { Plus, Minus, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CreateVocabularyCardInput } from "@make-gold/lib/vocabulary-data-access";
import type { DifficultyLevel, AccentType } from "@make-gold/lib/schema";

interface VocabularyCardFormProps {
  onSubmit: (data: Omit<CreateVocabularyCardInput, 'card_id'>) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

interface Definition {
  part_of_speech: string;
  meaning_en: string;
  meaning_zh: string;
  example_en: string;
  example_zh: string;
}

const DIFFICULTY_LEVELS: { value: DifficultyLevel; label: string }[] = [
  { value: 'beginner', label: '初级' },
  { value: 'intermediate', label: '中级' },
  { value: 'advanced', label: '高级' },
];

const ACCENT_TYPES: { value: AccentType; label: string }[] = [
  { value: 'US', label: '美音' },
  { value: 'UK', label: '英音' },
  { value: 'AU', label: '澳音' },
];

const COMMON_POS = ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'pronoun', 'conjunction', 'interjection'];

export function VocabularyCardForm({ onSubmit, isLoading, className }: VocabularyCardFormProps) {
  // 基础词汇信息
  const [word, setWord] = useState("");
  const [ipa, setIpa] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [accent, setAccent] = useState<AccentType>('US');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('beginner');
  const [etymology, setEtymology] = useState("");
  const [mnemonic, setMnemonic] = useState("");
  
  // 释义列表
  const [definitions, setDefinitions] = useState<Definition[]>([
    { part_of_speech: 'noun', meaning_en: '', meaning_zh: '', example_en: '', example_zh: '' }
  ]);
  
  // 同反义词
  const [synonyms, setSynonyms] = useState<string[]>(['']);
  const [antonyms, setAntonyms] = useState<string[]>(['']);
  
  const wordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    wordInputRef.current?.focus();
  }, []);

  const addDefinition = () => {
    setDefinitions([...definitions, { part_of_speech: 'noun', meaning_en: '', meaning_zh: '', example_en: '', example_zh: '' }]);
  };

  const removeDefinition = (index: number) => {
    if (definitions.length > 1) {
      setDefinitions(definitions.filter((_, i) => i !== index));
    }
  };

  const updateDefinition = (index: number, field: keyof Definition, value: string) => {
    const updated = [...definitions];
    updated[index] = { ...updated[index], [field]: value };
    setDefinitions(updated);
  };

  const addSynonym = () => setSynonyms([...synonyms, '']);
  const removeSynonym = (index: number) => setSynonyms(synonyms.filter((_, i) => i !== index));
  const updateSynonym = (index: number, value: string) => {
    const updated = [...synonyms];
    updated[index] = value;
    setSynonyms(updated);
  };

  const addAntonym = () => setAntonyms([...antonyms, '']);
  const removeAntonym = (index: number) => setAntonyms(antonyms.filter((_, i) => i !== index));
  const updateAntonym = (index: number, value: string) => {
    const updated = [...antonyms];
    updated[index] = value;
    setAntonyms(updated);
  };

  const handleSubmit = async () => {
    if (!word.trim()) return;
    
    const filteredDefinitions = definitions.filter(def => 
      def.meaning_en.trim() || def.meaning_zh.trim()
    ).map((def, index) => ({
      part_of_speech: def.part_of_speech,
      meaning_en: def.meaning_en.trim(),
      meaning_zh: def.meaning_zh.trim(),
      example_en: def.example_en.trim() || undefined,
      example_zh: def.example_zh.trim() || undefined,
      definition_order: index + 1
    }));

    const filteredSynonyms = synonyms.filter(s => s.trim()).map(s => s.trim());
    const filteredAntonyms = antonyms.filter(a => a.trim()).map(a => a.trim());

    await onSubmit({
      word: word.trim(),
      language_code: 'en',
      difficulty_level: difficulty,
      ipa_pronunciation: ipa.trim() || undefined,
      audio_url: audioUrl.trim() || undefined,
      accent: accent,
      etymology: etymology.trim() || undefined,
      mnemonic: mnemonic.trim() || undefined,
      definitions: filteredDefinitions,
      synonyms: filteredSynonyms.length > 0 ? filteredSynonyms : undefined,
      antonyms: filteredAntonyms.length > 0 ? filteredAntonyms : undefined,
    });
  };

  const canSave = word.trim() && definitions.some(def => def.meaning_en.trim() || def.meaning_zh.trim());

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* 基础词汇信息 */}
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="word" className="text-base font-medium">单词 *</Label>
          <Input
            ref={wordInputRef}
            id="word"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="输入英文单词"
            className="text-lg"
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="ipa">音标 (IPA)</Label>
            <div className="relative">
              <Input
                id="ipa"
                value={ipa}
                onChange={(e) => setIpa(e.target.value)}
                placeholder="/ˈwɜːrd/"
                disabled={isLoading}
              />
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="accent">口音</Label>
            <select
              id="accent"
              value={accent}
              onChange={(e) => setAccent(e.target.value as AccentType)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
            >
              {ACCENT_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="audio-url">音频链接</Label>
          <div className="flex gap-2">
            <Input
              id="audio-url"
              value={audioUrl}
              onChange={(e) => setAudioUrl(e.target.value)}
              placeholder="https://..."
              disabled={isLoading}
            />
            {audioUrl && (
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => {
                  const audio = new Audio(audioUrl);
                  audio.play().catch(console.error);
                }}
                disabled={isLoading}
              >
                <Volume2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="difficulty">难度等级</Label>
          <select
            id="difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
          >
            {DIFFICULTY_LEVELS.map(level => (
              <option key={level.value} value={level.value}>{level.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 释义列表 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">释义 *</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addDefinition}
            disabled={isLoading}
          >
            <Plus className="h-4 w-4 mr-1" />
            添加释义
          </Button>
        </div>
        
        {definitions.map((def, index) => (
          <div key={index} className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">释义 {index + 1}</Label>
              {definitions.length > 1 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeDefinition(index)}
                  disabled={isLoading}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label>词性</Label>
                <select
                  value={def.part_of_speech}
                  onChange={(e) => updateDefinition(index, 'part_of_speech', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isLoading}
                >
                  {COMMON_POS.map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>英文释义</Label>
                  <Input
                    value={def.meaning_en}
                    onChange={(e) => updateDefinition(index, 'meaning_en', e.target.value)}
                    placeholder="English definition"
                    disabled={isLoading}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>中文翻译</Label>
                  <Input
                    value={def.meaning_zh}
                    onChange={(e) => updateDefinition(index, 'meaning_zh', e.target.value)}
                    placeholder="中文释义"
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>英文例句</Label>
                  <Input
                    value={def.example_en}
                    onChange={(e) => updateDefinition(index, 'example_en', e.target.value)}
                    placeholder="Example sentence"
                    disabled={isLoading}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>例句翻译</Label>
                  <Input
                    value={def.example_zh}
                    onChange={(e) => updateDefinition(index, 'example_zh', e.target.value)}
                    placeholder="例句中文翻译"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 同反义词 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 同义词 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">同义词</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addSynonym}
              disabled={isLoading}
            >
              <Plus className="h-4 w-4 mr-1" />
              添加
            </Button>
          </div>
          {synonyms.map((synonym, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={synonym}
                onChange={(e) => updateSynonym(index, e.target.value)}
                placeholder="同义词"
                disabled={isLoading}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => removeSynonym(index)}
                disabled={isLoading}
              >
                <Minus className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* 反义词 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">反义词</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addAntonym}
              disabled={isLoading}
            >
              <Plus className="h-4 w-4 mr-1" />
              添加
            </Button>
          </div>
          {antonyms.map((antonym, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={antonym}
                onChange={(e) => updateAntonym(index, e.target.value)}
                placeholder="反义词"
                disabled={isLoading}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => removeAntonym(index)}
                disabled={isLoading}
              >
                <Minus className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* 扩展信息 */}
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="etymology">词源</Label>
          <Input
            id="etymology"
            value={etymology}
            onChange={(e) => setEtymology(e.target.value)}
            placeholder="词汇来源和历史"
            disabled={isLoading}
          />
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="mnemonic">记忆技巧</Label>
          <Input
            id="mnemonic"
            value={mnemonic}
            onChange={(e) => setMnemonic(e.target.value)}
            placeholder="助记方法或记忆提示"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="pt-4">
        <Button
          onClick={handleSubmit}
          disabled={!canSave || isLoading}
          className="w-full"
        >
          {isLoading ? "保存中..." : "保存词汇卡片"}
        </Button>
      </div>
    </div>
  );
}