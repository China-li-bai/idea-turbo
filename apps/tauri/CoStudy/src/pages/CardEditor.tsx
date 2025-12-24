import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading";
import { VocabularyCardForm } from "@/components/vocabulary";
// Removed direct Supabase imports - will use CardService and DeckService
import { createVocabularyCardFn as createVocabularyCard } from "@/services/VocabularyService";

// Helper function to generate vocabulary back content
function generateVocabularyBack(vocabularyData: any): string {
  const parts: string[] = [];

  if (vocabularyData.ipa_pronunciation) {
    parts.push(`[${vocabularyData.ipa_pronunciation}]`);
  }

  if (vocabularyData.definitions && vocabularyData.definitions.length > 0) {
    vocabularyData.definitions.forEach((def: any) => {
      const pos = def.part_of_speech ? `(${def.part_of_speech}) ` : '';
      const meaning = def.meaning_zh || def.meaning_en;
      parts.push(`${pos}${meaning}`);

      if (def.example_zh || def.example_en) {
        const example = def.example_zh || def.example_en;
        parts.push(`  Example: ${example}`);
      }
    });
  }

  if (vocabularyData.synonyms && vocabularyData.synonyms.length > 0) {
    parts.push(`Synonyms: ${vocabularyData.synonyms.join(', ')}`);
  }

  if (vocabularyData.antonyms && vocabularyData.antonyms.length > 0) {
    parts.push(`Antonyms: ${vocabularyData.antonyms.join(', ')}`);
  }

  return parts.join('\n');
}

// 统一使用 services - 消除竞态条件

export function CardEditor() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { deckId } = useParams<{ deckId: string }>();

  const [deck, setDeck] = useState<any>(null);
  const [isLoadingDeck, setIsLoadingDeck] = useState(true);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Load deck data
  useEffect(() => {
    if (!deckId) return;

    const loadDeck = async () => {
      try {
        // 使用 DeckService 获取牌组
        const { getDeckService } = await import('@/services/DeckService');
        const deckService = getDeckService();
        const deckData = await deckService.getDeckById(deckId);
        setDeck(deckData);
      } catch (error) {
        console.error("Error loading deck:", error);
      } finally {
        setIsLoadingDeck(false);
      }
    };

    loadDeck();
  }, [deckId]);

  const canSave = useMemo(() => front.trim().length > 0 && back.trim().length > 0, [front, back]);
  const isVocabularyDeck = deck?.deck_type === 'vocabulary';
  const isFlashcardDeck = deck?.deck_type === 'flashcard';

  // 处理数据加载状态
  if (!deckId) {
    return (
      <LoadingState
        message="Invalid deck ID"
        showBackButton
        onBack={() => navigate('/')}
      />
    );
  }

  if (isLoadingDeck) {
    return <LoadingState message="Loading deck..." />;
  }

  if (!deck) {
    return (
      <LoadingState
        message="Deck not found"
        showBackButton
        onBack={() => navigate('/')}
      />
    );
  }

  // 传统卡片保存
  const handleSaveFlashcard = async () => {
    if (!deckId || !canSave || isSaving) return;
    try {
      setIsSaving(true);

      // 使用 CardService 创建卡片
      const { getCardService } = await import('@/services/CardService');
      const cardService = getCardService();
      await cardService.createCard(deckId, front.trim(), back.trim());

      navigate(`/decks/${deckId}/cards`);
    } catch (e) {
      console.error("CardEditor - save error:", e);
    } finally {
      setIsSaving(false);
    }
  };

  // 词汇卡片保存
  const handleSaveVocabulary = async (vocabularyData: any) => {
    if (!deckId || isSaving) return;
    try {
      setIsSaving(true);

      // 使用 CardService 创建基础卡片
      const { getCardService } = await import('@/services/CardService');
      const cardService = getCardService();
      const card = await cardService.createCard(
        deckId,
        vocabularyData.word,
        generateVocabularyBack(vocabularyData)
      );

      if (!card) {
        throw new Error('Failed to create card');
      }

      // Then create vocabulary data
      await createVocabularyCard({
        card_id: card.id,
        word: vocabularyData.word,
        language_code: vocabularyData.language_code || 'en',
        difficulty_level: vocabularyData.difficulty_level as any || null,
        frequency_rank: vocabularyData.frequency_rank || null,
        ipa_pronunciation: vocabularyData.ipa_pronunciation || null,
        audio_url: vocabularyData.audio_url || null,
        accent: vocabularyData.accent as any || null,
        etymology: vocabularyData.etymology || null,
        mnemonic: vocabularyData.mnemonic || null,
        definitions: vocabularyData.definitions || [],
        synonyms: vocabularyData.synonyms || [],
        antonyms: vocabularyData.antonyms || []
      });

      navigate(`/decks/${deckId}/cards`);
    } catch (e) {
      console.error("CardEditor - save vocabulary error:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const getPageTitle = () => {
    if (isVocabularyDeck) return "添加词汇卡片";
    if (isFlashcardDeck) return "添加闪卡";
    return t("cardEditor.title");
  };

  const getDeckTypeIcon = () => {
    if (isVocabularyDeck) return "📚";
    if (isFlashcardDeck) return "🃏";
    return "☰";
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col font-display bg-background dark:bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between px-4 py-2 border-b border-white/10 bg-background dark:bg-background">
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full text-muted-foreground"
          onClick={() => navigate(-1)}
        >
          <span aria-hidden className="sr-only">{t("cardEditor.close")}</span>
          <span className="inline-block h-5 w-5">✕</span>
        </Button>
        <h2 className="text-lg font-semibold text-foreground flex-1 text-center truncate">
          {getPageTitle()}
        </h2>
        {!isVocabularyDeck && (
          <Button
            className="h-10 px-3 rounded-lg"
            onClick={handleSaveFlashcard}
            disabled={!canSave || isSaving}
          >
            {t("cardEditor.save")}
          </Button>
        )}
        {isVocabularyDeck && (
          <div className="w-16" />
        )}
      </header>

      {/* 主体表单 */}
      <main className="flex-1 px-4 py-4">
        {/* 牌组选择（仅展示） */}
        <div className="flex items-center justify-between gap-4 rounded-lg bg-slate-200/50 dark:bg-slate-800/50 px-4 min-h-14 mb-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="text-foreground flex items-center justify-center rounded-lg bg-slate-300 dark:bg-slate-700 shrink-0 size-10">
              <span className="text-sm">{getDeckTypeIcon()}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm md:text-base text-foreground truncate">
                {deck.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {deck.deck_type === 'vocabulary' ? '词汇模式' :
                  deck.deck_type === 'flashcard' ? '闪卡模式' : '混合模式'}
              </p>
            </div>
          </div>
        </div>

        {/* 根据 deck 类型显示不同表单 */}
        {isVocabularyDeck ? (
          <VocabularyCardForm
            onSubmit={handleSaveVocabulary}
            isLoading={isSaving}
          />
        ) : (
          <div className="space-y-6">
            {/* Front */}
            <div className="flex max-w-full flex-wrap items-end gap-4">
              <div className="flex flex-col min-w-40 flex-1">
                <div className="flex items-center justify-between pb-2">
                  <Label htmlFor="front" className="text-base font-medium">{t("cardEditor.front")}</Label>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground border rounded-full px-2 py-0.5">
                    <span>EN</span>
                  </div>
                </div>
                <textarea
                  id="front"
                  value={front}
                  onChange={(e) => setFront(e.target.value)}
                  placeholder={t("cardEditor.frontPlaceholder") || ""}
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-foreground focus:outline-0 focus:ring-2 focus:ring-primary/50 border-slate-300 dark:border-slate-700 bg-slate-200/50 dark:bg-slate-800/50 focus:border-primary min-h-36 placeholder:text-muted-foreground p-[15px] text-base"
                />
              </div>
            </div>

            {/* Back */}
            <div className="flex max-w-full flex-wrap items-end gap-4">
              <div className="flex flex-col min-w-40 flex-1">
                <div className="flex items-center justify-between pb-2">
                  <Label htmlFor="back" className="text-base font-medium">{t("cardEditor.back")}</Label>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground border rounded-full px-2 py-0.5">
                    <span>ZH</span>
                  </div>
                </div>
                <textarea
                  id="back"
                  value={back}
                  onChange={(e) => setBack(e.target.value)}
                  placeholder={t("cardEditor.backPlaceholder") || ""}
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-foreground focus:outline-0 focus:ring-2 focus:ring-primary/50 border-slate-300 dark:border-slate-700 bg-slate-200/50 dark:bg-slate-800/50 focus:border-primary min-h-36 placeholder:text-muted-foreground p-[15px] text-base"
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 底部工具栏（仅传统卡片显示） */}
      {!isVocabularyDeck && (
        <div className="sticky bottom-0 bg-background dark:bg-background border-t border-white/10">
          <div className="flex justify-between gap-2 px-4 py-2">
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="p-2 text-muted-foreground rounded-lg">B</Button>
              <Button variant="ghost" size="icon" className="p-2 text-muted-foreground rounded-lg">I</Button>
              <Button variant="ghost" size="icon" className="p-2 text-muted-foreground rounded-lg">IMG</Button>
              <Button variant="ghost" size="icon" className="p-2 text-muted-foreground rounded-lg">MIC</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CardEditor;