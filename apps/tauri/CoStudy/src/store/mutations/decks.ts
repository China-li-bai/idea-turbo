import type { PGlite } from "@electric-sql/pglite";
import { decks as deckAccess } from "@make-gold/lib/data-access";
import type { DeckRow } from "@make-gold/lib/schema";

/**
 * 建立新牌組
 */
export async function createDeck(db: PGlite, name: string, description?: string): Promise<DeckRow | null> {
  return deckAccess.create(db, name, description);
}