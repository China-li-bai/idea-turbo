import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import * as XLSX from 'xlsx';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { AiMappingToggle, FieldMappingPreview } from "@/components/ai-mapping";
import { useSubscription } from "@/services/SubscriptionManager";
import { SubscriptionType } from "@/types/subscription";

// New Services
import type { FlashcardImportData, VocabularyImportData } from "@/services/ImportService";

import type { DeckRow, DeckType } from "@make-gold/lib/schema";
import {
  parseCsv,
  mapRowsToCardInputs,
  type BulkImportField,
  type BulkImportMapping,
  type VocabularyImportField,
  mapRowsToVocabularyInputs,
} from "@make-gold/lib/import";

// Responsive container: centered and width-limited, mobile-friendly
export default function BulkImport() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [fileName, setFileName] = useState<string>("");
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<BulkImportMapping>({
    column1: "question",
    column2: "answer",
    firstRowIsHeader: true,
  });
  // Vocabulary field mapping (column-defined), length matches CSV column count
  const [vocabFields, setVocabFields] = useState<VocabularyImportField[]>([]);

  const [decks, setDecks] = useState<DeckRow[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importMessage, setImportMessage] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  // AI smart mapping toggle state
  const [aiMappingEnabled, setAiMappingEnabled] = useState(false);
  
  // 用户订阅状态
  const [userId] = useState(() => 'current-user-id'); // TODO: 从AuthContext获取真实userId
  const { subscriptionStatus, isLoading: subscriptionLoading, checkFeatureAccess } = useSubscription(userId);
  // Allow import mode selection in mixed decks
  const [importModeForMixed, setImportModeForMixed] = useState<"flashcard" | "vocabulary">("flashcard");

  useEffect(() => {
    const loadDecks = async () => {
      try {
        // Use DeckService
        const { getDeckService } = await import('@/services/DeckService');
        const deckService = getDeckService();
        const ds = await deckService.getAllDecks();
        setDecks(ds);
        if (ds.length && !selectedDeckId) setSelectedDeckId(ds[0].id);
      } catch (error) {
        console.error("Error loading decks:", error);
      }
    };

    loadDecks();
  }, []);

  const selectedDeck: DeckRow | undefined = useMemo(() => decks.find(d => d.id === selectedDeckId), [decks, selectedDeckId]);
  
  // 检查AI功能访问权限
  const hasAIAccess = useMemo(() => {
    if (!subscriptionStatus) return false;
    return subscriptionStatus.type === SubscriptionType.PREMIUM || subscriptionStatus.type === SubscriptionType.PREMIUM_PLUS;
  }, [subscriptionStatus]);
  
  // AI功能订阅状态描述
  const subscriptionStatusDisplay = useMemo(() => {
    if (subscriptionLoading) return { text: '检查订阅状态...', isPremium: false };
    if (!subscriptionStatus) return { text: '未登录', isPremium: false };
    
    switch (subscriptionStatus.type) {
      case SubscriptionType.PREMIUM:
        return { text: '高级会员', isPremium: true };
      case SubscriptionType.PREMIUM_PLUS:
        return { text: '超级会员', isPremium: true };
      default:
        return { text: '免费版本', isPremium: false };
    }
  }, [subscriptionStatus, subscriptionLoading]);
  const effectiveDeckType: DeckType = useMemo(() => {
    if (!selectedDeck) return 'flashcard';
    return selectedDeck.deck_type;
  }, [selectedDeck]);

  const isFlashcardMode = useMemo(() => {
    if (effectiveDeckType === 'mixed') return importModeForMixed === 'flashcard';
    return effectiveDeckType === 'flashcard';
  }, [effectiveDeckType, importModeForMixed]);

  const isVocabularyMode = !isFlashcardMode;

  // Keep vocabFields synchronized with column count, set reasonable defaults
  useEffect(() => {
    const colCount = rawRows[0]?.length ?? 0;
    if (colCount <= 0) {
      setVocabFields([]);
      return;
    }
    setVocabFields((prev) => {
      const next = Array.from({ length: colCount }, (_, i) => prev[i] ?? 'ignore');
      if (!prev.length && rawRows.length > 0 && mapping.firstRowIsHeader) {
        // Check for ipa_pronunciation in headers
        const headers = rawRows[0];
        const ipaIndex = headers.findIndex(h => h === 'ipa_pronunciation');

        // First-time initialization defaults: word, meaning_zh, meaning_en, part_of_speech, example_zh, example_en
        const defaults: VocabularyImportField[] = [
          'word',
          'meaning_zh',
          'meaning_en',
          'part_of_speech',
          'example_zh',
          'example_en',
        ];

        // If ipa_pronunciation is found, include it in defaults
        if (ipaIndex !== -1) {
          defaults.splice(4, 0, 'ipa_pronunciation'); // Insert after part_of_speech
        }

        for (let i = 0; i < Math.min(defaults.length, colCount); i++) {
          next[i] = defaults[i];
        }
      } else if (!prev.length) {
        // First-time initialization defaults without header detection
        const defaults: VocabularyImportField[] = [
          'word',
          'meaning_zh',
          'meaning_en',
          'part_of_speech',
          'example_zh',
          'example_en',
        ];
        for (let i = 0; i < Math.min(defaults.length, colCount); i++) {
          next[i] = defaults[i];
        }
      }
      return next;
    });
  }, [rawRows, mapping.firstRowIsHeader]);

  const mappedFlashcards = useMemo(() => mapRowsToCardInputs(rawRows, mapping), [rawRows, mapping]);

  const mappedVocabulary = useMemo(() => mapRowsToVocabularyInputs(rawRows, vocabFields, mapping.firstRowIsHeader), [rawRows, vocabFields, mapping.firstRowIsHeader]);

  const onFileSelected = async (file: File) => {
    try {
      let rows: string[][] = [];

      // Check file type and handle accordingly
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Handle Excel file
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });

        // Read the first worksheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to 2D array
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        rows = jsonData.map((row: any) => (Array.isArray(row) ? row : []).map((cell: any) => String(cell || '')));

        // Special handling for vocabulary import with UK/US phonetics
        if (isVocabularyMode && rows.length > 0 && mapping.firstRowIsHeader) {
          const headers = rows[0];
          const ukPhoneticsIndex = headers.findIndex(h => h.includes('UK') && h.includes('Phonetics'));
          const usPhoneticsIndex = headers.findIndex(h => h.includes('US') && h.includes('Phonetics'));

          // If both UK and US phonetics columns exist, merge them into a single ipa_pronunciation column
          if (ukPhoneticsIndex !== -1 && usPhoneticsIndex !== -1) {
            // Process each data row
            for (let i = 1; i < rows.length; i++) {
              const ukPhonetics = rows[i][ukPhoneticsIndex] || '';
              const usPhonetics = rows[i][usPhoneticsIndex] || '';

              // Merge UK and US phonetics with a delimiter
              if (ukPhonetics && usPhonetics) {
                rows[i][ukPhoneticsIndex] = `${ukPhonetics} | ${usPhonetics}`;
              } else if (ukPhonetics || usPhonetics) {
                rows[i][ukPhoneticsIndex] = ukPhonetics || usPhonetics;
              }

              // Remove the US phonetics column
              rows[i].splice(usPhoneticsIndex, 1);
            }

            // Update headers - rename UK phonetics to ipa_pronunciation and remove US phonetics
            headers[ukPhoneticsIndex] = 'ipa_pronunciation';
            headers.splice(usPhoneticsIndex, 1);
          }
          // If only UK phonetics exists, rename it to ipa_pronunciation
          else if (ukPhoneticsIndex !== -1) {
            headers[ukPhoneticsIndex] = 'ipa_pronunciation';
          }
          // If only US phonetics exists, rename it to ipa_pronunciation
          else if (usPhoneticsIndex !== -1) {
            headers[usPhoneticsIndex] = 'ipa_pronunciation';
          }
        }
      } else {
        // Handle CSV file
        const text = await file.text();
        rows = parseCsv(text);

        // Special handling for vocabulary import with UK/US phonetics
        if (isVocabularyMode && rows.length > 0 && mapping.firstRowIsHeader) {
          const headers = rows[0];
          const ukPhoneticsIndex = headers.findIndex(h => h.includes('UK') && h.includes('Phonetics'));
          const usPhoneticsIndex = headers.findIndex(h => h.includes('US') && h.includes('Phonetics'));

          // If both UK and US phonetics columns exist, merge them into a single ipa_pronunciation column
          if (ukPhoneticsIndex !== -1 && usPhoneticsIndex !== -1) {
            // Process each data row
            for (let i = 1; i < rows.length; i++) {
              const ukPhonetics = rows[i][ukPhoneticsIndex] || '';
              const usPhonetics = rows[i][usPhoneticsIndex] || '';

              // Merge UK and US phonetics with a delimiter
              if (ukPhonetics && usPhonetics) {
                rows[i][ukPhoneticsIndex] = `${ukPhonetics} | ${usPhonetics}`;
              } else if (ukPhonetics || usPhonetics) {
                rows[i][ukPhoneticsIndex] = ukPhonetics || usPhonetics;
              }

              // Remove the US phonetics column
              rows[i].splice(usPhoneticsIndex, 1);
            }

            // Update headers - rename UK phonetics to ipa_pronunciation and remove US phonetics
            headers[ukPhoneticsIndex] = 'ipa_pronunciation';
            headers.splice(usPhoneticsIndex, 1);
          }
          // If only UK phonetics exists, rename it to ipa_pronunciation
          else if (ukPhoneticsIndex !== -1) {
            headers[ukPhoneticsIndex] = 'ipa_pronunciation';
          }
          // If only US phonetics exists, rename it to ipa_pronunciation
          else if (usPhoneticsIndex !== -1) {
            headers[usPhoneticsIndex] = 'ipa_pronunciation';
          }
        }
      }

      setFileName(file.name);
      setRawRows(rows);
    } catch (error) {
      console.error('File parsing failed:', error);
      setImportError(t("bulkImport.errors.fileParseFailed", { message: error instanceof Error ? error.message : t("bulkImport.errors.unknownError") }));
    }
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = async (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) await onFileSelected(f);
  };

  const onImport = async () => {
    if (!selectedDeckId) return;
    // Use mappedFlashcards instead of importInputsFlashcards (which was undefined/missing in previous code)
    const flashcardCount = mappedFlashcards.length;
    const vocabCount = mappedVocabulary.length;
    const totalCount = isFlashcardMode ? flashcardCount : vocabCount;
    if (totalCount === 0) return;

    setIsImporting(true);
    setImportProgress(0);
    setImportMessage(t("bulkImport.progress.preparing"));
    setImportError(null);
    setImportSuccess(false);

    try {
      // Import ImportService dynamically
      const { getImportService } = await import('@/services/ImportService');
      const importService = getImportService();

      if (isFlashcardMode) {
        // Prepare flashcard import data
        const flashcardData: FlashcardImportData[] = mappedFlashcards.map(item => ({
          front: item.front,
          back: item.back
        }));

        // Use import service
        setImportMessage(t("bulkImport.progress.importingCards", { count: flashcardData.length }));
        await importService.importFlashcards(
          selectedDeckId,
          flashcardData,
          100, // Process 100 cards per batch
          (processed, total) => {
            const progress = Math.round((processed / total) * 100);
            setImportProgress(progress);
            setImportMessage(t("bulkImport.progress.importedCards", { processed, total }));
          }
        );

        setImportMessage(t("bulkImport.success.cardsImported", { count: flashcardData.length }));
      } else {
        // Prepare vocabulary import data
        setImportMessage(t("bulkImport.progress.importingVocabulary", { count: vocabCount }));

        const vocabularyData: VocabularyImportData[] = mappedVocabulary.map(vocab => ({
          word: vocab.word,
          language_code: vocab.language_code || 'en',
          difficulty_level: vocab.difficulty_level,
          frequency_rank: vocab.frequency_rank,
          ipa_pronunciation: vocab.ipa_pronunciation,
          audio_url: vocab.audio_url,
          accent: vocab.accent,
          etymology: vocab.etymology,
          mnemonic: vocab.mnemonic,
          definitions: vocab.definitions || [],
          synonyms: vocab.synonyms || [],
          antonyms: vocab.antonyms || []
        }));

        // Use import service
        await importService.importVocabularyCards(
          selectedDeckId,
          vocabularyData,
          100, // Process 100 vocabulary per batch
          (processed, total) => {
            const progress = Math.round((processed / total) * 100);
            setImportProgress(progress);
            setImportMessage(t("bulkImport.progress.importedVocabulary", { processed, total }));
          }
        );

        setImportMessage(t("bulkImport.success.vocabularyImported", { count: vocabularyData.length }));
        setImportProgress(100);
      }

      setImportSuccess(true);
      // Reset form
      setRawRows([]);
      setFileName("");

      // Navigate to deck after import completion
      setTimeout(() => {
        navigate(`/decks/${selectedDeckId}/cards`);
      }, 2000);
    } catch (err) {
      console.error('Bulk import failed:', err);
      setImportError(t("bulkImport.errors.importFailed", { message: err instanceof Error ? err.message : t("bulkImport.errors.unknownError") }));
    } finally {
      setIsImporting(false);
    }
  };

  // Handle AI mapping results - 确保只有高级用户可以使用
  const handleAiMappingResult = (aiMapping: any) => {
    // 二重验证：即使UI层被绕过，也要在逻辑层验证权限
    if (!hasAIAccess) {
      console.warn('未授权的AI映射访问尝试');
      navigate('/subscription');
      return;
    }
    
    if (isFlashcardMode) {
      const newMapping = { ...mapping };
      Object.keys(aiMapping).forEach(key => {
        if (key === 'column1' || key === 'column2') {
          newMapping[key] = aiMapping[key] as BulkImportField;
        }
      });
      setMapping(newMapping);
    } else {
      // For vocabulary mode, we need to map CSV column names to field indices
      const headers = mapping.firstRowIsHeader && rawRows.length > 0 ? rawRows[0] : [];
      const newVocabFields: VocabularyImportField[] = [];

      // Initialize with ignore for all columns
      const columnCount = rawRows[0]?.length || 0;
      for (let i = 0; i < columnCount; i++) {
        newVocabFields.push('ignore');
      }

      // Map AI results to column indices
      Object.keys(aiMapping).forEach(csvColumnName => {
        // Try exact match first
        let columnIndex = headers.findIndex(header => header === csvColumnName);

        // If exact match fails, try case-insensitive match
        if (columnIndex === -1) {
          columnIndex = headers.findIndex(header =>
            header.toLowerCase().trim() === csvColumnName.toLowerCase().trim()
          );
        }

        // If still not found, try partial match (contains)
        if (columnIndex === -1) {
          columnIndex = headers.findIndex(header =>
            header.toLowerCase().includes(csvColumnName.toLowerCase().trim()) ||
            csvColumnName.toLowerCase().trim().includes(header.toLowerCase())
          );
        }

        // If found, update the field at that index
        if (columnIndex !== -1 && columnIndex < columnCount) {
          newVocabFields[columnIndex] = aiMapping[csvColumnName] as VocabularyImportField;
        }
      });

      setVocabFields(newVocabFields);
    }
  };

  // Convert CSV row data to format suitable for AI mapping
  const convertToCsvRows = () => {
    if (rawRows.length === 0) return [];

    // Get column names (if there's a header row)
    const hasHeader = mapping.firstRowIsHeader;
    const headerRow = hasHeader ? rawRows[0] : [];
    const dataRows = hasHeader ? rawRows.slice(1) : rawRows;

    // Create column name mapping
    const columnNames = headerRow.length > 0
      ? headerRow
      : Array.from({ length: rawRows[0]?.length || 0 }, (_, i) => `column${i + 1}`);

    // Convert data rows to objects
    return dataRows.slice(0, 5).map(row => {
      const rowObj: any = {};
      columnNames.forEach((colName, index) => {
        rowObj[colName] = row[index] || '';
      });
      return rowObj;
    });
  };

  // Get available field list
  const getAvailableFields = () => {
    if (isFlashcardMode) {
      return ['question', 'answer', 'tags', 'notes', 'ignore'];
    } else {
      return [
        'word', 'meaning_zh', 'meaning_en', 'part_of_speech',
        'example_zh', 'example_en', 'synonyms', 'antonyms',
        'language_code', 'difficulty_level', 'frequency_rank',
        'ipa_pronunciation', 'audio_url', 'accent', 'etymology', 'mnemonic', 'ignore'
      ];
    }
  };

  const handleDownloadTemplate = () => {
    const isHeader = mapping.firstRowIsHeader;
    if (isFlashcardMode) {
      const header = isHeader ? `${t("bulkImport.template.question")},${t("bulkImport.template.answer")}\n` : '';
      const sample = `${t("bulkImport.template.sampleData.question")},${t("bulkImport.template.sampleData.answer")}\n${t("bulkImport.template.sampleData.question2")},${t("bulkImport.template.sampleData.answer2")}\n${t("bulkImport.template.sampleData.question3")},${t("bulkImport.template.sampleData.answer3")}\n`;
      const blob = new Blob([header + sample], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bulk_import_template_flashcard.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }
    // CSV template for vocabulary (consistent with schema fields, example contains 1 record)
    const header = isHeader
      ? [
        t("bulkImport.template.word"), t("bulkImport.template.meaning_zh"), t("bulkImport.template.meaning_en"), t("bulkImport.template.part_of_speech"), t("bulkImport.template.example_zh"), t("bulkImport.template.example_en"),
        t("bulkImport.template.synonyms"), t("bulkImport.template.antonyms"), t("bulkImport.template.language_code"), t("bulkImport.template.difficulty_level"), t("bulkImport.template.frequency_rank"),
        t("bulkImport.template.ipa_pronunciation"), t("bulkImport.template.audio_url"), t("bulkImport.template.accent"), t("bulkImport.template.etymology"), t("bulkImport.template.mnemonic")
      ].join(',') + '\n'
      : '';
    const sampleRow = [
      t("bulkImport.template.sampleData.word"), t("bulkImport.template.sampleData.meaning_zh"), t("bulkImport.template.sampleData.meaning_en"), t("bulkImport.template.sampleData.part_of_speech"), t("bulkImport.template.sampleData.example_zh"), t("bulkImport.template.sampleData.example_en"),
      t("bulkImport.template.sampleData.synonyms"), t("bulkImport.template.sampleData.antonyms"), t("bulkImport.template.sampleData.language_code"), t("bulkImport.template.sampleData.difficulty_level"), t("bulkImport.template.sampleData.frequency_rank"),
      t("bulkImport.template.sampleData.ipa_pronunciation"), t("bulkImport.template.sampleData.audio_url"), t("bulkImport.template.sampleData.accent"), t("bulkImport.template.sampleData.etymology"), t("bulkImport.template.sampleData.mnemonic")
    ].join(',') + '\n';
    const blob = new Blob([header + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_import_template_vocabulary.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const setCol = (idx: 1 | 2, val: BulkImportField) => {
    setMapping((m) => ({ ...m, [idx === 1 ? 'column1' : 'column2']: val }));
  };

  return (
    <div className="mx-auto w-full max-w-lg md:max-w-3xl px-4 md:px-8 py-6 md:py-10 pb-20 md:pb-10">
      {/* Top return and title */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/decks')}>{t('bulkImport.back')}</Button>
          <h1 className="text-xl md:text-2xl font-semibold">{t('bulkImport.title')}</h1>
        </div>
        {subscriptionStatusDisplay.isPremium && (
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full border border-purple-200">
            <div className="w-4 h-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
            <span className="text-sm font-medium text-purple-800">{subscriptionStatusDisplay.text}</span>
          </div>
        )}
      </div>

      {/* Upload area */}
      <Card className="mb-6">
        <CardContent className="p-4 md:p-6">
          <h2 className="text-lg font-medium mb-2">{t('bulkImport.upload.title')}</h2>
          <p className="text-sm text-muted-foreground mb-4">{t('bulkImport.upload.desc')}</p>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="border-2 border-dashed rounded-lg p-6 md:p-8 text-center text-muted-foreground"
          >
            <div className="mb-3">{t('bulkImport.upload.drop')}</div>
            <div className="text-xs mb-3">{t("bulkImport.upload.supportedFormats")}</div>
            <input
              type="file"
              accept=".csv,.txt,.xlsx,.xls"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFileSelected(f);
              }}
            />
            {fileName && <div className="mt-3 text-xs text-foreground">{fileName}</div>}
          </div>

          <button className="mt-3 text-xs underline" onClick={handleDownloadTemplate}>
            {t('bulkImport.upload.downloadTemplate')}
          </button>
        </CardContent>
      </Card>

      {/* Field mapping (switches with deck_type) */}
      <Card className="mb-6">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">{t('bulkImport.mapping.title')}</h2>
          </div>

          {/* AI智能字段映射 - 高级订阅专享 */}
          {hasAIAccess ? (
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-purple-800">🤖 AI 智能字段映射</h3>
                  <span className="text-xs px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-medium">
                    {subscriptionStatusDisplay.text}
                  </span>
                </div>
              </div>
              <p className="text-sm text-purple-700 mb-4">
                AI 将自动分析您的数据结构，智能映射到标准字段格式，节省90%的手动配置时间
              </p>
              <AiMappingToggle
                enabled={aiMappingEnabled}
                onEnabledChange={setAiMappingEnabled}
                onMappingResult={handleAiMappingResult}
                csvRows={convertToCsvRows()}
                availableFields={getAvailableFields()}
                importMode={isFlashcardMode ? 'flashcard' : 'vocabulary'}
              />
            </div>
          ) : (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-amber-800">🤖 AI 智能字段映射</h3>
                  <span className="text-xs px-2 py-1 bg-amber-500 text-white rounded-full">
                    {subscriptionStatusDisplay.text}
                  </span>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-amber-300">
                <div className="text-amber-800 mb-3">
                  <div className="font-medium text-base mb-2">🚀 解锁AI超能力</div>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>智能识别任意CSV格式，自动适配标准字段</li>
                    <li>99.9%识别准确率，支持中英文混合数据</li>
                    <li>一键映射复杂字段，节省90%配置时间</li>
                    <li>专业算法优化，高级会员专享技术</li>
                  </ul>
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                  onClick={() => navigate('/subscription')}
                >
                  立即升级到高级版 →
                </Button>
              </div>
            </div>
          )}

          {/* Field mapping preview - also displayed when AI mapping is not enabled */}
          {rawRows.length > 0 && (
            <FieldMappingPreview
              csvHeaders={mapping.firstRowIsHeader ? rawRows[0] : Array.from({ length: rawRows[0]?.length || 0 }, (_, i) => t("bulkImport.mapping.column", { n: i + 1 }))}
              importMode={isFlashcardMode ? 'flashcard' : 'vocabulary'}
            />
          )}

          {isFlashcardMode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">{t('bulkImport.mapping.column', { n: 1 })}</Label>
                <select
                  className="w-full rounded-md border bg-background p-2"
                  value={mapping.column1}
                  onChange={(e) => setCol(1, e.target.value as BulkImportField)}
                >
                  <option value="question">{t('bulkImport.fields.question')}</option>
                  <option value="answer">{t('bulkImport.fields.answer')}</option>
                  <option value="tags">{t('bulkImport.fields.tags')}</option>
                  <option value="notes">{t('bulkImport.fields.notes')}</option>
                  <option value="ignore">{t('bulkImport.fields.ignore')}</option>
                </select>
              </div>
              <div>
                <Label className="mb-2 block">{t('bulkImport.mapping.column', { n: 2 })}</Label>
                <select
                  className="w-full rounded-md border bg-background p-2"
                  value={mapping.column2}
                  onChange={(e) => setCol(2, e.target.value as BulkImportField)}
                >
                  <option value="question">{t('bulkImport.fields.question')}</option>
                  <option value="answer">{t('bulkImport.fields.answer')}</option>
                  <option value="tags">{t('bulkImport.fields.tags')}</option>
                  <option value="notes">{t('bulkImport.fields.notes')}</option>
                  <option value="ignore">{t('bulkImport.fields.ignore')}</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vocabFields.map((field, idx) => (
                <div key={idx}>
                  <Label className="mb-2 block">{t('bulkImport.mapping.column', { n: idx + 1 })}</Label>
                  <select
                    className="w-full rounded-md border bg-background p-2"
                    value={field}
                    onChange={(e) => {
                      const val = e.target.value as VocabularyImportField;
                      setVocabFields((prev) => prev.map((f, i) => (i === idx ? val : f)));
                    }}
                  >
                    {/* Basic vocabulary fields */}
                    <option value="word">{t('bulkImport.fields.word')}</option>
                    <option value="meaning_zh">{t('bulkImport.fields.meaning_zh')}</option>
                    <option value="meaning_en">{t('bulkImport.fields.meaning_en')}</option>
                    <option value="part_of_speech">{t('bulkImport.fields.part_of_speech')}</option>
                    <option value="example_zh">{t('bulkImport.fields.example_zh')}</option>
                    <option value="example_en">{t('bulkImport.fields.example_en')}</option>
                    <option value="synonyms">{t('bulkImport.fields.synonyms')}</option>
                    <option value="antonyms">{t('bulkImport.fields.antonyms')}</option>
                    {/* Extended attributes */}
                    <option value="language_code">{t('bulkImport.fields.language_code')}</option>
                    <option value="difficulty_level">{t('bulkImport.fields.difficulty_level')}</option>
                    <option value="frequency_rank">{t('bulkImport.fields.frequency_rank')}</option>
                    <option value="ipa_pronunciation">{t('bulkImport.fields.ipa_pronunciation')}</option>
                    <option value="audio_url">{t('bulkImport.fields.audio_url')}</option>
                    <option value="accent">{t('bulkImport.fields.accent')}</option>
                    <option value="etymology">{t('bulkImport.fields.etymology')}</option>
                    <option value="mnemonic">{t('bulkImport.fields.mnemonic')}</option>
                    <option value="ignore">{t('bulkImport.fields.ignore')}</option>
                  </select>
                </div>
              ))}
              {vocabFields.length === 0 && (
                <div className="text-sm text-muted-foreground">{t('bulkImport.preview.empty')}</div>
              )}
            </div>
          )}

          {/* Import options */}
          <h3 className="mt-6 text-base font-medium">{t('bulkImport.options.title')}</h3>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <Label className="mb-2 block">{t('bulkImport.options.deck')}</Label>
              <select
                className="w-full rounded-md border bg-background p-2"
                value={selectedDeckId}
                onChange={(e) => setSelectedDeckId(e.target.value)}
              >
                {decks.map((d) => (
                  <option value={d.id} key={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            {effectiveDeckType === 'mixed' && (
              <div>
                <Label className="mb-2 block">{t('bulkImport.options.importAs')}</Label>
                <select
                  className="w-full rounded-md border bg-background p-2"
                  value={importModeForMixed}
                  onChange={(e) => setImportModeForMixed(e.target.value as any)}
                >
                  <option value="flashcard">{t('bulkImport.deckTypes.flashcard')}</option>
                  <option value="vocabulary">{t('bulkImport.deckTypes.vocabulary')}</option>
                </select>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={mapping.firstRowIsHeader}
                onChange={(e) => setMapping((m) => ({ ...m, firstRowIsHeader: e.target.checked }))}
              />
              {t('bulkImport.options.headerRow')}
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="mb-6">
        <CardContent className="p-4 md:p-6">
          <h2 className="text-lg font-medium mb-3">{t('bulkImport.preview.title')}</h2>
          <div className="overflow-x-auto">
            {isFlashcardMode ? (
              <table className="w-full text-sm table-fixed">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="px-3 py-2 text-left w-1/2">{t('bulkImport.fields.question')}</th>
                    <th className="px-3 py-2 text-left w-1/2">{t('bulkImport.fields.answer')}</th>
                  </tr>
                </thead>
                <tbody>
                  {mappedFlashcards.slice(0, 5).map((m, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-3 py-2 truncate">{m.front}</td>
                      <td className="px-3 py-2 truncate">{m.back}</td>
                    </tr>
                  ))}
                  {mappedFlashcards.length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-center text-muted-foreground" colSpan={2}>
                        {t('bulkImport.preview.empty')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-sm table-fixed">
                <thead>
                  <tr className="text-muted-foreground">
                    {vocabFields.includes('word') && (
                      <th className="px-3 py-2 text-left">{t('bulkImport.fields.word')}</th>
                    )}
                    {vocabFields.includes('ipa_pronunciation') && (
                      <th className="px-3 py-2 text-left">{t('bulkImport.fields.ipa_pronunciation')}</th>
                    )}
                    {vocabFields.includes('meaning_zh') && (
                      <th className="px-3 py-2 text-left">{t('bulkImport.fields.meaning_zh')}</th>
                    )}
                    {vocabFields.includes('meaning_en') && (
                      <th className="px-3 py-2 text-left">{t('bulkImport.fields.meaning_en')}</th>
                    )}
                    {vocabFields.includes('example_zh') && (
                      <th className="px-3 py-2 text-left">{t('bulkImport.fields.example_zh')}</th>
                    )}
                    {vocabFields.includes('example_en') && (
                      <th className="px-3 py-2 text-left">{t('bulkImport.fields.example_en')}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {mappedVocabulary.slice(0, 5).map((m, idx) => (
                    <tr key={idx} className="border-t">
                      {vocabFields.includes('word') && (
                        <td className="px-3 py-2 truncate">{m.word}</td>
                      )}
                      {vocabFields.includes('ipa_pronunciation') && (
                        <td className="px-3 py-2 truncate">{m.ipa_pronunciation || ''}</td>
                      )}
                      {vocabFields.includes('meaning_zh') && (
                        <td className="px-3 py-2 truncate">{m.definitions?.[0]?.meaning_zh || ''}</td>
                      )}
                      {vocabFields.includes('meaning_en') && (
                        <td className="px-3 py-2 truncate">{m.definitions?.[0]?.meaning_en || ''}</td>
                      )}
                      {vocabFields.includes('example_zh') && (
                        <td className="px-3 py-2 truncate">{m.definitions?.[0]?.example_zh || ''}</td>
                      )}
                      {vocabFields.includes('example_en') && (
                        <td className="px-3 py-2 truncate">{m.definitions?.[0]?.example_en || ''}</td>
                      )}
                    </tr>
                  ))}
                  {mappedVocabulary.length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-center text-muted-foreground" colSpan={vocabFields.filter(f => f !== 'ignore').length || 1}>
                        {t('bulkImport.preview.empty')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Import progress display */}
      {isImporting && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">{t("bulkImport.progress.title")}</span>
            <span className="text-sm text-blue-700">{importProgress}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2.5 mb-2">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${importProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-blue-700">{importMessage}</p>
        </div>
      )}

      {/* Import success message */}
      {importSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-green-800">{importMessage}</p>
          </div>
          <p className="text-xs text-green-600 mt-1">{t("bulkImport.import.redirecting")}</p>
        </div>
      )}

      {/* Import error message */}
      {importError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-800">{importError}</p>
          </div>
        </div>
      )}

      {/* Import button */}
      <div className="fixed bottom-20 md:bottom-4 left-0 right-0 z-20 p-4 md:p-0 md:static md:z-auto">
        <Button
          className={`w-full md:w-auto ${
            hasAIAccess && aiMappingEnabled 
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600' 
              : ''
          }`}
          disabled={!selectedDeckId || (isFlashcardMode ? mappedFlashcards.length === 0 : mappedVocabulary.length === 0) || isImporting}
          onClick={onImport}
        >
          {isImporting ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t("bulkImport.import.inProgress")}
            </span>
          ) : (
            <span className="flex items-center">
              {hasAIAccess && aiMappingEnabled && (
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              )}
              {t('bulkImport.importCta', { count: isFlashcardMode ? mappedFlashcards.length : mappedVocabulary.length })}
              {hasAIAccess && aiMappingEnabled && (
                <span className="ml-2 text-xs opacity-90">AI优化</span>
              )}
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}