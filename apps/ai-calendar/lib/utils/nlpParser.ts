export { 
  parseNaturalLanguage, 
  formatTimeRange, 
  formatRelativeDate 
} from '../services/aiParserService';

export type { ParsedResult } from '../services/aiParserService';

export { 
  parseNaturalLanguage as parseNaturalLanguageLegacy 
} from './nlpParserLegacy';

export type { 
  ParsedResult as ParsedResultLegacy 
} from './nlpParserLegacy';
