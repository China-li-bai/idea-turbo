import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImportMode } from '@/services/ai-mapping';

interface FieldMappingPreviewProps {
  csvHeaders: string[];
  importMode: ImportMode;
  className?: string;
}

// Database required fields definition
const REQUIRED_FIELDS = {
  flashcard: ['front', 'back'],
  vocabulary: ['word', 'meaning_zh']
};

const FieldMappingPreview: React.FC<FieldMappingPreviewProps> = ({
  csvHeaders,
  importMode,
  className = ''
}) => {
  const { t } = useTranslation();
  const requiredFields = REQUIRED_FIELDS[importMode];
  
  return (
    <Card className={`mb-4 ${className}`}>
      <CardContent className="p-4">
        <h3 className="text-base font-medium mb-3">{t("bulkImport.mapping.title")}</h3>
        
        {/* CSV header fields */}
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2 text-muted-foreground">{t("bulkImport.mapping.detectedHeaders")}</h4>
          <div className="flex flex-wrap gap-2">
            {csvHeaders.length > 0 ? (
              csvHeaders.map((header, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {header}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">{t("bulkImport.mapping.noHeadersDetected")}</span>
            )}
          </div>
        </div>
        
        {/* Database required fields */}
        <div>
          <h4 className="text-sm font-medium mb-2 text-muted-foreground">
            {importMode === 'flashcard' ? t("bulkImport.deckTypes.flashcard") : t("bulkImport.deckTypes.vocabulary")}{t("bulkImport.mapping.requiredFields")}
          </h4>
          <div className="flex flex-wrap gap-2">
            {requiredFields.map((field, index) => (
              <Badge key={index} variant="destructive" className="text-xs">
                {t(`bulkImport.fields.${field}`) || field} *
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            * {t("bulkImport.mapping.requiredNote")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default FieldMappingPreview;