import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Clock, TrendingUp, MoreVertical, PlayCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DeckRow, CardRow, FsrsState } from "@make-gold/lib/schema";
// Removed direct Supabase imports - now using services
import { formatDistanceToNow } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";

type FilterTab = "all" | "new" | "learning" | "review";

export function DeckDetail() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { deckId } = useParams<{ deckId: string }>();


  const [deck, setDeck] = useState<DeckRow | null>(null);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [filteredCards, setFilteredCards] = useState<CardRow[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [counts, setCounts] = useState({ new: 0, learning: 0, review: 0, total: 0 });
  const [dueCounts, setDueCounts] = useState({ new: 0, learning: 0, review: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (deckId) {
      const fetchData = async () => {
        try {
          setIsLoading(true);

          // 使用服务层获取数据
          const { getDeckService } = await import('@/services/DeckService');
          const { getCardService } = await import('@/services/CardService');

          const deckService = getDeckService();
          const cardService = getCardService();

          // 并行获取牌组、卡片和统计数据
          const [deckData, cardData, allCountsData, dueCountsData] = await Promise.all([
            deckService.getDeckById(deckId),
            cardService.getCardsByDeck(deckId),
            cardService.getCardCounts(deckId, false),
            cardService.getCardCounts(deckId, true),
          ]);

          setDeck(deckData);
          setCards(cardData);
          setFilteredCards(cardData);
          setCounts(allCountsData);
          setDueCounts(dueCountsData);
        } catch (error) {
          console.error("Error fetching deck detail:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [deckId]);

  // Filter cards when activeFilter changes
  useEffect(() => {
    console.log("DeckDetail - Filtering cards, activeFilter:", activeFilter);
    if (activeFilter === "all") {
      setFilteredCards(cards);
    } else {
      const stateMap: Record<Exclude<FilterTab, "all">, FsrsState> = {
        new: "new",
        learning: "learning",
        review: "review",
      };
      const targetState = stateMap[activeFilter];
      const filtered = cards.filter((card) => card.state === targetState);
      console.log("DeckDetail - Filtered cards:", filtered.length, "state:", targetState);
      setFilteredCards(filtered);
    }
  }, [activeFilter, cards]);

  const handleStartReview = () => {
    navigate(`/decks/${deckId}`);
  };

  const getDateLocale = () => {
    return i18n.language === "zh" ? zhCN : enUS;
  };

  const formatDueDate = (dueDate: string | Date) => {
    const now = new Date();
    const due = new Date(dueDate);

    console.log("formatDueDate - Input:", dueDate, "Parsed:", due, "Now:", now);

    if (due <= now) {
      return t("deckDetail.dueNow");
    }

    return formatDistanceToNow(due, {
      addSuffix: true,
      locale: getDateLocale(),
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!deck) {
    return <div className="flex items-center justify-center min-h-screen">Deck not found</div>;
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col font-display bg-background dark:bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between px-4 py-2 backdrop-blur-sm bg-background/80 dark:bg-background/80">
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full text-muted-foreground"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">{deck.name}</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full text-muted-foreground">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>{t("decks.menu.edit")}</DropdownMenuItem>
            <DropdownMenuItem>{t("decks.menu.share")}</DropdownMenuItem>
            <DropdownMenuItem>{t("decks.menu.delete")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Main Content */}
      <main className="flex-1 space-y-4 px-4 py-4 pb-24 md:pb-0">
        {/* Stats Summary Card */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="space-y-3">
              <p className="text-sm font-normal text-muted-foreground">
                {t("decks.cardInfo", {
                  newCount: dueCounts.new,
                  learningCount: dueCounts.learning,
                  reviewCount: dueCounts.review,
                })}
              </p>
              <div className="flex items-center gap-3">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted dark:bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${counts.total > 0 ? ((counts.total - counts.new) / counts.total) * 100 : 0
                        }%`,
                    }}
                  />
                </div>
              </div>
              {counts.total > 0 && (
                <Button
                  className="w-full flex items-center gap-2"
                  onClick={handleStartReview}
                  disabled={dueCounts.new + dueCounts.learning + dueCounts.review === 0}
                >
                  <PlayCircle className="h-5 w-5" />
                  {t("deckDetail.startReview")}
                  {dueCounts.new + dueCounts.learning + dueCounts.review === 0 && (
                    <span className="text-xs opacity-70 ml-2">
                      ({t("deckDetail.noDueCards")})
                    </span>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(["all", "new", "learning", "review"] as FilterTab[]).map((filter) => (
            <Button
              key={filter}
              variant={activeFilter === filter ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter(filter)}
              className="whitespace-nowrap"
            >
              {t(`deckDetail.filters.${filter}`)}
              {filter !== "all" && (
                <span className="ml-1.5 text-xs">
                  ({filter === "new" ? counts.new : filter === "learning" ? counts.learning : counts.review})
                </span>
              )}
            </Button>
          ))}
        </div>

        {/* Cards List */}
        {filteredCards.length > 0 ? (
          <div className="space-y-3">
            {filteredCards.map((card) => (
              <Card
                key={card.id}
                className="cursor-pointer transition-all hover:bg-accent/50 dark:hover:bg-gray-800/50"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold mb-2 line-clamp-2">
                        {card.front}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDueDate(card.due)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          <span>
                            {t("deckDetail.cardStats", {
                              difficulty: card.difficulty.toFixed(1),
                              reps: card.reps,
                            })}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                          {t(`deckDetail.states.${card.state}`)}
                        </span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground flex-shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>{t("deckDetail.cardMenu.edit")}</DropdownMenuItem>
                        <DropdownMenuItem>{t("deckDetail.cardMenu.delete")}</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 p-6 text-center dark:border-gray-700">
            <h3 className="text-base font-semibold text-foreground">{t("deckDetail.emptyState.title")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("deckDetail.emptyState.description")}</p>
          </div>
        )}
      </main>

      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-24 right-6">
        <Button
          size="icon"
          className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-primary text-white shadow-lg transition-transform hover:scale-105"
          onClick={() => navigate(`/decks/${deckId}/cards/new`)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
