import { NextRequest, NextResponse } from 'next/server';
import { oramaSearchService } from '@/lib/services/oramaSearchService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    if (action === 'stats') {
      const stats = oramaSearchService.getStats();
      return NextResponse.json({
        success: true,
        stats,
        isInitialized: oramaSearchService.isInitialized,
        currentModel: oramaSearchService['currentModelType'],
        dimensions: oramaSearchService['dimensions'],
      });
    }

    if (action === 'test-search') {
      const query = searchParams.get('query') || '测试';
      const results = await oramaSearchService.hybridSearch(query, { k: 5, similarity: 0.5 });
      return NextResponse.json({
        success: true,
        query,
        resultsCount: results.length,
        results: results.map(r => ({
          id: r.id,
          title: r.title,
          score: r.score,
          type: r.type,
        })),
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use ?action=stats or ?action=test-search&query=xxx',
    });
  } catch (error) {
    console.error('[Diagnostic API] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, params } = body;

    if (action === 'reindex') {
      const { useUnifiedStore } = await import('@/lib/stores/unifiedStore');
      const items = useUnifiedStore.getState().items;
      
      console.log(`[Diagnostic API] Reindexing ${items.length} items...`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const item of items) {
        try {
          await oramaSearchService.indexItem(item);
          successCount++;
        } catch (error) {
          console.error(`[Diagnostic API] Failed to index item ${item.id}:`, error);
          errorCount++;
        }
      }
      
      return NextResponse.json({
        success: true,
        message: `Reindexed ${successCount} items, ${errorCount} errors`,
        totalItems: items.length,
        successCount,
        errorCount,
      });
    }

    if (action === 'clear-orama') {
      await oramaSearchService.clear();
      return NextResponse.json({
        success: true,
        message: 'Orama database cleared',
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use action=reindex or action=clear-orama',
    });
  } catch (error) {
    console.error('[Diagnostic API] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
