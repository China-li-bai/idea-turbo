import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, CreditCard, Layers } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Removed direct Supabase import - now using DeckService
import type { DeckType } from "@make-gold/lib/schema";

interface CreateDeckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeckCreated?: () => void;
}

const DECK_TYPES = [
  {
    type: 'flashcard' as const,
    icon: CreditCard,
    title: '闪卡模式',
    description: '传统问答卡片',
    color: 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-900 dark:bg-blue-950 dark:hover:bg-blue-900 dark:border-blue-800 dark:text-blue-100'
  },
  {
    type: 'vocabulary' as const,
    icon: BookOpen,
    title: '词汇模式',
    description: '结构化词汇学习',
    color: 'bg-green-50 hover:bg-green-100 border-green-200 text-green-900 dark:bg-green-950 dark:hover:bg-green-900 dark:border-green-800 dark:text-green-100'
  },
  {
    type: 'mixed' as const,
    icon: Layers,
    title: '混合模式',
    description: '灵活的多类型卡片',
    color: 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-900 dark:bg-purple-950 dark:hover:bg-purple-900 dark:border-purple-800 dark:text-purple-100'
  }
] as const;

export function CreateDeckDialog({
  open,
  onOpenChange,
  onDeckCreated,
}: CreateDeckDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deckType, setDeckType] = useState<DeckType>('mixed');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError(t("decks.createDialog.nameRequired"));
      return;
    }



    setIsLoading(true);
    setError("");

    try {
      // 使用 DeckService 而非直接调用 Supabase
      const { getDeckService } = await import('@/services/DeckService');
      const deckService = getDeckService();

      await deckService.createDeck(
        name.trim(),
        description.trim() || undefined,
        deckType
      );

      // Reset form
      setName("");
      setDescription("");
      setDeckType('mixed');

      // Close dialog
      onOpenChange(false);

      // Notify parent to refresh
      onDeckCreated?.();
    } catch (err) {
      console.error("Failed to create deck:", err);
      setError("Failed to create deck. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setName("");
      setDescription("");
      setDeckType('mixed');
      setError("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("decks.createDialog.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            {/* Deck Type Selection */}
            <div className="grid gap-3">
              <Label className="text-sm font-medium">选择卡片集类型</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {DECK_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = deckType === type.type;

                  return (
                    <button
                      key={type.type}
                      type="button"
                      onClick={() => setDeckType(type.type)}
                      className={`
                        p-4 border-2 rounded-lg transition-all duration-200 text-left
                        ${isSelected
                          ? `${type.color} border-current ring-2 ring-current ring-opacity-20`
                          : 'border-gray-200 hover:border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 dark:border-gray-700 dark:hover:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-750 dark:text-gray-300'
                        }
                        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                      disabled={isLoading}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-sm mb-1">{type.title}</h3>
                          <p className="text-xs opacity-75 leading-relaxed">{type.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Name Input */}
            <div className="grid gap-2">
              <Label htmlFor="name">{t("decks.createDialog.nameLabel")}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("decks.createDialog.namePlaceholder")}
                disabled={isLoading}
                className={error ? "border-red-500" : ""}
                autoFocus
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            {/* Description Input */}
            <div className="grid gap-2">
              <Label htmlFor="description">
                {t("decks.createDialog.descriptionLabel")}
              </Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("decks.createDialog.descriptionPlaceholder")}
                disabled={isLoading}
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {t("decks.createDialog.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="w-full sm:w-auto"
            >
              {isLoading ? "Creating..." : t("decks.createDialog.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}