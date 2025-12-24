import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings,
  MoreVertical,
  Plus,
  Layers,
  RefreshCw,
  Wifi,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { CreateDeckDialog } from "../components/CreateDeckDialog";
import type { DeckRow } from "@make-gold/lib/schema";

// New Services
import { getDeckService } from "@/services/DeckService";
import { getCardService } from "@/services/CardService";

interface DeckWithCounts extends DeckRow {
  newCount: number;
  learningCount: number;
  reviewCount: number;
  totalCount: number;
}

export function DeckList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [decks, setDecks] = useState<DeckRow[]>([]);
  const [countsMap, setCountsMap] = useState<
    Record<
      string,
      { new: number; learning: number; review: number; total: number }
    >
  >({});
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Load decks and counts
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const deckService = getDeckService();
      const cardService = getCardService();

      // 1. Get all decks
      const allDecks = await deckService.getAllDecks();
      setDecks(allDecks);

      // 2. Get counts for each deck
      const newCountsMap: Record<string, any> = {};
      await Promise.all(
        allDecks.map(async (deck) => {
          const counts = await cardService.getCardCounts(deck.id);
          newCountsMap[deck.id] = counts;
        })
      );
      setCountsMap(newCountsMap);
    } catch (error) {
      console.error("Failed to load decks:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 合并数据和计数
  const decksWithCounts: DeckWithCounts[] = decks.map((deck) => ({
    ...deck,
    newCount: countsMap[deck.id]?.new || 0,
    learningCount: countsMap[deck.id]?.learning || 0,
    reviewCount: countsMap[deck.id]?.review || 0,
    totalCount: countsMap[deck.id]?.total || 0,
  }));

  if (loading && decks.length === 0) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col font-display bg-background dark:bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between px-4 py-2 backdrop-blur-sm bg-background/80 dark:bg-background/80">
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full text-muted-foreground"
          onClick={() => navigate("/settings")}
        >
          <Settings className="h-5 w-5" />
        </Button>

        <div className="flex flex-col items-center">
          <h1 className="text-lg font-semibold text-foreground">
            {t("decks.title")}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full text-muted-foreground"
            onClick={() => navigate("/sync")}
            aria-label="同步数据"
          >
            <Wifi className="h-6 w-6" />
          </Button>
          {/* <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full text-primary"
            onClick={() => setShowCreateDialog(true)}
            aria-label={t("buttons.createDeck")}
          >
            <Plus className="h-6 w-6" />
          </Button> */}
        </div>
      </header>

      {/* Main Content: Deck List */}
      <main className="flex-1 space-y-3 px-4 py-4 pb-24 md:pb-0">
        {decksWithCounts.length > 0 ? (
          decksWithCounts.map((deck) => (
            <Card
              key={deck.id}
              className="cursor-pointer flex flex-col gap-3 rounded-lg shadow-sm transition-all hover:bg-accent/50 dark:hover:bg-gray-800/50"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/decks/${deck.id}/cards`);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-foreground">
                        {deck.name}
                      </h3>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          deck.deck_type === "flashcard"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                            : deck.deck_type === "vocabulary"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                        }`}
                      >
                        {deck.deck_type}
                      </span>
                    </div>
                    {deck.description && (
                      <p className="text-xs text-muted-foreground mb-1">
                        {deck.description}
                      </p>
                    )}
                    <p className="text-sm font-normal text-muted-foreground">
                      {t("decks.cardInfo", {
                        newCount: deck.newCount,
                        learningCount: deck.learningCount,
                        reviewCount: deck.reviewCount,
                      })}
                    </p>
                  </div>
        
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted dark:bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${
                          deck.totalCount > 0
                            ? ((deck.totalCount - deck.newCount) /
                                deck.totalCount) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          /* Empty State */
          <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 p-6 text-center dark:border-gray-700">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Layers className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">
              {t("decks.emptyState.title")}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("decks.emptyState.description", {
                icon: <Plus className="h-4 w-4 mx-1" />,
              })}
            </p>
          </div>
        )}
      </main>

      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-24 right-6">
        <Button
          size="icon"
          className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-primary text-white shadow-lg transition-transform hover:scale-105"
          onClick={() => setShowCreateDialog(true)}
          aria-label={t("buttons.createDeck")}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Create Deck Dialog */}
      <CreateDeckDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onDeckCreated={() => {
          loadData();
        }}
      />
    </div>
  );
}
