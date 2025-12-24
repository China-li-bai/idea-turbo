import { describe, it, expect, beforeAll } from 'vitest';
import { DeckService } from '../src/services/DeckService';
import { CardService } from '../src/services/CardService';
import { UnifiedDataAccess } from '../src/services/UnifiedDataAccess';

describe('Supabase Integration Test', () => {
    let deckService: DeckService;
    let cardService: CardService;
    let createdDeckId: string;

    beforeAll(() => {
        // Ensure we are in Supabase mode
        // We can't easily overwrite import.meta.env in the running context if it's already loaded,
        // but we can pass the config directly to UnifiedDataAccess if we wanted.
        // However, UnifiedDataAccess uses getDataSourceFromEnv which reads import.meta.env.
        // Vitest populates import.meta.env from .env files.

        // Vitest automatically loads .env files into import.meta.env

        // We will force the configuration by instantiating UnifiedDataAccess with explicit config
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.warn('Skipping Supabase test: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
            return;
        }

        const dataAccess = new UnifiedDataAccess({
            dataSource: 'supabase',
            supabaseConfig: {
                url: supabaseUrl,
                anonKey: supabaseKey
            }
        });

        cardService = new CardService(dataAccess);
        deckService = new DeckService(dataAccess, cardService);
    });

    it('should create a deck in Supabase', async () => {
        if (!deckService) return;

        const deckName = `Supabase Test Deck ${Date.now()} `;
        const deck = await deckService.createDeck(deckName, 'Created via integration test');

        expect(deck).toBeDefined();
        expect(deck?.name).toBe(deckName);
        expect(deck?.id).toBeDefined();

        createdDeckId = deck!.id;
        console.log(`Created Deck ID: ${createdDeckId} `);
    });

    it('should create a card in the new deck', async () => {
        if (!createdDeckId || !cardService) return;

        const front = 'Supabase Front';
        const back = 'Supabase Back';

        const card = await cardService.createCard(createdDeckId, front, back);

        expect(card).toBeDefined();
        expect(card?.front).toBe(front);
        expect(card?.deck_id).toBe(createdDeckId);
        console.log(`Created Card ID: ${card?.id} `);
    });

    it('should retrieve the deck and verify card count', async () => {
        if (!createdDeckId || !deckService) return;

        const counts = await deckService.getCardCounts(createdDeckId);
        expect(counts.total).toBeGreaterThanOrEqual(1);
        console.log('Card Counts:', counts);
    });

    // Cleanup
    it('should delete the test deck', async () => {
        if (!createdDeckId || !deckService) return;

        const result = await deckService.deleteDeck(createdDeckId);
        expect(result).toBe(true);
        console.log('Deleted Test Deck');
    });
});
