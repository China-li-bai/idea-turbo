import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AiMappingService, CsvRow, FieldMapping, AiMappingResult, ImportMode } from '@/services/ai-mapping';


interface AiMappingToggleProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onMappingResult: (mapping: FieldMapping) => void;
  csvRows: CsvRow[];
  availableFields: string[];
  importMode: ImportMode;
  disabled?: boolean;
}

const AiMappingToggle: React.FC<AiMappingToggleProps> = ({
  enabled,
  onEnabledChange,
  onMappingResult,
  csvRows,
  importMode,
  availableFields,
  disabled = false
}) => {
  const { t } = useTranslation();
  const [isAiMapping, setIsAiMapping] = useState(false);
  const [aiMappingError, setAiMappingError] = useState<string | null>(null);
  
  const aiMappingService = new AiMappingService();

  const handleAiMapping = async () => {
    if (!csvRows || csvRows.length === 0) {
      setAiMappingError(t("bulkImport.aiMapping.noCsvData"));
      return;
    }

    setIsAiMapping(true);
    setAiMappingError(null);

    try {
      const result: AiMappingResult = await aiMappingService.performAiMapping(
        csvRows,
        importMode,
        availableFields
      );

      if (result.success && result.mapping) {
        onMappingResult(result.mapping);
      } else {
        setAiMappingError(result.error || t("bulkImport.aiMapping.unknownError"));
      }
    } catch (error) {
      console.error('AI mapping error:', error);
      setAiMappingError(error instanceof Error ? error.message : t("bulkImport.aiMapping.unknownError"));
    } finally {
      setIsAiMapping(false);
    }
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Label className="text-sm">{t("bulkImport.aiMapping.title")}</Label>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
            className="rounded"
            disabled={disabled}
          />
        </div>
      </div>
      
      {/* AI mapping error message */}
      {aiMappingError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {t("bulkImport.aiMapping.error")}: {aiMappingError}
        </div>
      )}
      
      {/* AI mapping button */}
      {enabled && csvRows.length > 0 && (
        <div className="mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAiMapping}
            disabled={isAiMapping || disabled}
            className="text-xs"
          >
            {isAiMapping ? t("bulkImport.aiMapping.analyzing") : t("bulkImport.aiMapping.autoMatch")}
          </Button>
        </div>
      )}
    </div>
  );
};

export default AiMappingToggle;