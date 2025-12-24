import React, { useState, useMemo, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingState, EmptyState } from "@/components/ui/loading";
import { useTranslation } from "react-i18next";
import type { FsrsRating, CardRow, DeckRow } from "@make-gold/lib/schema";
import {
  FSRSCard,
  applyCardRowPatchToFsrsCard,
  getReviewDateForEachRating,
} from "@make-gold/lib/fsrs";
import { VocabularyCardBack } from "@/components/vocabulary";
// Removed direct Supabase imports - now using services
import { useStudySession } from "@/hooks/useStudySession";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useStudyRoom } from "@/contexts/StudyRoomContext";
import {
  LearningPhilosophyBackground,
  type PhilosophyMode,
} from "@/components/study-room/PhilosophyBackground";
import { PhilosophySettings } from "@/components/study-room/PhilosophySettings";
import { LearningCompanions } from "@/components/study-room/LearningCompanions";
import { LearningPulse } from "@/components/study-room/LearningPulse";
import { Settings } from "lucide-react";
import { getDeckService } from "@/services/DeckService";
import { getCardService } from "@/services/CardService";

export const FlashcardReview: React.FC = () => {
  const { t } = useTranslation();
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { userId } = useUserProfile();
  const { broadcast, isConnected } = useStudyRoom();

  // Philosophy settings
  const [philosophyMode, setPhilosophyMode] =
    useState<PhilosophyMode>("campfire");
  const [showSettings, setShowSettings] = useState(false);

  // Load saved philosophy mode
  useEffect(() => {
    const savedMode = localStorage.getItem("philosophy-mode") as PhilosophyMode;
    if (savedMode && ["campfire", "starry", "none"].includes(savedMode)) {
      setPhilosophyMode(savedMode);
    }
  }, []);

  // Save philosophy mode
  const handlePhilosophyModeChange = (mode: PhilosophyMode) => {
    setPhilosophyMode(mode);
    localStorage.setItem("philosophy-mode", mode);
  };

  // Auto-start study session when entering review
  const { recordCardReview, cardsReviewed } = useStudySession({
    userId,
    sessionType: "solo",
    autoStart: true,
    onProgressBroadcast: (cards) => {
      // Broadcast progress milestone to P2P room
      broadcast({
        type: "progress",
        userId,
        cardsReviewed: cards,
      });
    },
  });

  // 使用服务层进行数据访问
  const [cards, setCards] = useState<CardRow[] | null>(null);
  const [deck, setDeck] = useState<DeckRow | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!deckId) return;
      try {
        // 使用 DeckService 和 ReviewService 获取数据

        const deckService = getDeckService();
        const cardService = getCardService();

        // 并行加载牌组和到期卡片
        const [deckResult, cardsResult] = await Promise.all([
          deckService.getDeckById(deckId),
          cardService.getDueCards(deckId),
        ]);

        setDeck(deckResult);
        setCards(cardsResult || []);
      } catch (error) {
        console.error("Failed to load data:", error);
        setCards([]);
        setDeck(null);
      }
    };
    loadData();
  }, [deckId]);

  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const [lastRating, setLastRating] = useState<
    "again" | "hard" | "good" | "easy"
  >("good");

  // Calculate current card and next review time
  const { currentCard, nextReviewDates } = useMemo(() => {
    if (!cards || cards.length === 0)
      return { currentCard: null, nextReviewDates: null };

    const card = cards[currentCardIndex];
    if (!card) return { currentCard: null, nextReviewDates: null };

    try {
      const fsrsCard = applyCardRowPatchToFsrsCard({} as FSRSCard, card);
      const dates = getReviewDateForEachRating(fsrsCard);
      return { currentCard: card, nextReviewDates: dates };
    } catch (error) {
      console.error("Error calculating review dates:", error);
      return { currentCard: card, nextReviewDates: null };
    }
  }, [cards, currentCardIndex]);

  // Handle rating - 使用 CardService
  const handleRating = async (rating: string) => {
    if (!currentCard || isProcessing || !cards) return;

    setIsProcessing(true);
    try {
      const fsrsRating = rating as FsrsRating;

      // 使用 CardService 进行卡片复习

      const cardService = getCardService();
      await cardService.reviewCard(currentCard.id, fsrsRating);

      // Record card review in study session
      const isCorrect = fsrsRating === "good" || fsrsRating === "easy";
      await recordCardReview(isCorrect, fsrsRating, currentCard.id);

      // Show pulse animation and broadcast to study room peers
      setLastRating(rating as "again" | "hard" | "good" | "easy");
      setShowPulse(true);

      broadcast({
        type: "pulse",
        userId,
        intensity: fsrsRating,
        cardId: currentCard.id,
      });

      // Move to next card after a short delay
      setTimeout(() => {
        if (currentCardIndex < cards.length - 1) {
          setCurrentCardIndex(currentCardIndex + 1);
          setShowAnswer(false);
        } else {
          // All cards review completed
          navigate(`/decks/${deckId}/cards`);
        }
      }, 500);
    } catch (error) {
      console.error("Error reviewing card:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Loading state - data not yet loaded
  if (!deckId) {
    return (
      <LoadingState
        message="Invalid deck ID"
        showBackButton
        onBack={() => navigate("/")}
      />
    );
  }

  // Wait for data loading - cards might be null (initializing), deck might be null
  if (cards === null || deck === null) {
    return <LoadingState message="Loading review session..." />;
  }

  // Empty state - no cards due
  if (cards.length === 0) {
    return (
      <EmptyState
        title="No due cards"
        description="All cards in this deck have been reviewed. Come back later!"
        action={
          <Link to={`/decks/${deckId}/cards`}>
            <Button>Back to Deck</Button>
          </Link>
        }
      />
    );
  }

  // Current card does not exist (edge case)
  if (!currentCard) {
    return (
      <LoadingState
        message="Loading card..."
        showBackButton
        onBack={() => navigate(`/decks/${deckId}/cards`)}
      />
    );
  }

  const progress = ((currentCardIndex + 1) / cards.length) * 100;

  return (
    <LearningPhilosophyBackground
      userId={userId}
      isConnected={isConnected}
      className="flex min-h-screen w-full flex-col font-display"
    >
      <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
        <header className="flex flex-col pt-4 px-4">
          <div className="flex items-center justify-between gap-4">
            {/* 学习同伴显示 */}
            <LearningCompanions showMinimal />
            <Link
              to={`/decks/${deckId}/cards`}
              className="flex items-center justify-center rounded-lg h-10 w-10 text-muted-foreground hover:bg-accent/50"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex-1 text-center">
              <h2 className="text-sm font-medium leading-tight tracking-[-0.01em] text-muted-foreground">
                {deck?.name || "Unknown Deck"}
              </h2>
              <p className="text-base font-semibold leading-tight tracking-[-0.01em]">
                Card {currentCardIndex + 1} of {cards.length}
              </p>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center justify-center rounded-lg h-10 w-10 text-muted-foreground hover:bg-accent/50"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
          <div className="w-full mt-4">
            <Progress value={progress} className="h-2" />
          </div>
        </header>

        <main className="flex flex-col flex-1 justify-center items-center p-4">
          <div className="w-full flex flex-col items-center text-center">
            <div className="w-full flex-grow flex items-center justify-center">
              <h1 className="tracking-tight text-3xl md:text-4xl font-bold leading-tight px-4 text-center">
                {currentCard.front}
              </h1>
            </div>
            {showAnswer && (
              <div className="w-full mt-8">
                <div className="border-b border-slate-200 dark:border-slate-700 w-1/4 mx-auto mb-6"></div>
                <VocabularyCardBack
                  cardId={currentCard.id}
                  backContent={currentCard.back}
                  className="pb-3 pt-1 px-4"
                />
              </div>
            )}
          </div>
        </main>

        <footer className="p-4 pb-20 md:pb-6 space-y-4">
          {!showAnswer ? (
            <Button
              onClick={() => setShowAnswer(true)}
              className="w-full h-12 text-base font-medium"
            >
              {t("review.showAnswer")}
            </Button>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm font-normal leading-normal text-center text-muted-foreground">
                {t("review.howWellRecall")}
              </p>
              <div className="grid grid-cols-4 gap-3 w-full max-w-md">
                <button
                  onClick={() => handleRating("again")}
                  disabled={isProcessing}
                  className="flex flex-col items-center justify-center rounded-lg py-2 transition-colors bg-red-500/20 text-red-400 hover:bg-red-500/30"
                >
                  <span className="text-xs font-medium">
                    {t("review.ratings.again")}
                  </span>
                </button>
                <button
                  onClick={() => handleRating("hard")}
                  disabled={isProcessing}
                  className="flex flex-col items-center justify-center rounded-lg py-2 transition-colors bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
                >
                  <span className="text-xs font-medium">
                    {t("review.ratings.hard")}
                  </span>
                </button>
                <button
                  onClick={() => handleRating("good")}
                  disabled={isProcessing}
                  className="flex flex-col items-center justify-center rounded-lg py-2 transition-colors bg-green-500/20 text-green-400 hover:bg-green-500/30"
                >
                  <span className="text-xs font-medium">
                    {t("review.ratings.good")}
                  </span>
                </button>
                <button
                  onClick={() => handleRating("easy")}
                  disabled={isProcessing}
                  className="flex flex-col items-center justify-center rounded-lg py-2 transition-colors bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                >
                  <span className="text-xs font-medium">
                    {t("review.ratings.easy")}
                  </span>
                </button>
              </div>
            </div>
          )}
        </footer>

        {/* Philosophy Settings Modal */}
        <PhilosophySettings
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          currentMode={philosophyMode}
          onModeChange={handlePhilosophyModeChange}
          isConnected={isConnected}
        />

        {/* Learning Pulse Animation */}
        <LearningPulse
          cardId={currentCard?.id || ""}
          rating={lastRating}
          isActive={showPulse}
        />
      </div>
    </LearningPhilosophyBackground>
  );
};
