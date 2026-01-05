export type SchemaType = 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';

export interface SchemaField {
  type: SchemaType;
  required?: boolean;
  default?: any;
  validate?: (value: any) => boolean;
}

export interface SchemaDefinition {
  [collection: string]: {
    [field: string]: SchemaField;
  };
}

export interface SchemaConfig {
  definition: SchemaDefinition;
  version: string;
}

export class SchemaManager {
  private config: SchemaConfig;
  private validators: Map<string, (data: any) => boolean> = new Map();

  constructor(config: SchemaConfig) {
    this.config = config;
    this.buildValidators();
  }

  private buildValidators() {
    for (const [collection, fields] of Object.entries(this.config.definition)) {
      this.validators.set(collection, (data: any) => this.validateData(collection, data));
    }
  }

  private validateData(collection: string, data: any): boolean {
    const fields = this.config.definition[collection];
    if (!fields) return false;

    for (const [fieldName, fieldDef] of Object.entries(fields)) {
      const value = data[fieldName];

      if (fieldDef.required && value === undefined) {
        console.error(`[Schema] Field ${collection}.${fieldName} is required`);
        return false;
      }

      if (value !== undefined && !this.validateFieldType(value, fieldDef)) {
        console.error(`[Schema] Field ${collection}.${fieldName} has invalid type`);
        return false;
      }

      if (fieldDef.validate && value !== undefined && !fieldDef.validate(value)) {
        console.error(`[Schema] Field ${collection}.${fieldName} failed custom validation`);
        return false;
      }
    }

    return true;
  }

  private validateFieldType(value: any, fieldDef: SchemaField): boolean {
    switch (fieldDef.type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'date':
        return !isNaN(Date.parse(value));
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      default:
        return false;
    }
  }

  validate(collection: string, data: any): boolean {
    const validator = this.validators.get(collection);
    if (!validator) {
      console.warn(`[Schema] No validator found for collection: ${collection}`);
      return true;
    }

    return validator(data);
  }

  getCollectionSchema(collection: string) {
    return this.config.definition[collection];
  }

  getAllCollections(): string[] {
    return Object.keys(this.config.definition);
  }

  getVersion(): string {
    return this.config.version;
  }

  applyDefaults(collection: string, data: any): any {
    const fields = this.config.definition[collection];
    if (!fields) {
      console.log('[SchemaManager] No schema found for collection:', collection);
      return data;
    }

    const result = { ...data };

    console.log('[SchemaManager] Applying defaults for collection:', collection);
    console.log('[SchemaManager] Original data:', JSON.stringify(data, null, 2));

    for (const [fieldName, fieldDef] of Object.entries(fields)) {
      if (result[fieldName] === undefined && fieldDef.default !== undefined) {
        const defaultValue = typeof fieldDef.default === 'function' 
          ? fieldDef.default() 
          : fieldDef.default;
        console.log('[SchemaManager] Applied default for', fieldName, ':', defaultValue);
        result[fieldName] = defaultValue;
      }
    }

    console.log('[SchemaManager] Final data:', JSON.stringify(result, null, 2));
    return result;
  }

  inferType<T extends Record<string, any>>(data: T): SchemaType {
    if (Array.isArray(data)) return 'array';
    if (data === null) return 'object';
    if (typeof data === 'object') return 'object';
    if (typeof data === 'boolean') return 'boolean';
    if (typeof data === 'number') return 'number';
    if (typeof data === 'string') {
      return !isNaN(Date.parse(data)) ? 'date' : 'string';
    }
    return 'object';
  }
}

export function createSchema(config: SchemaConfig): SchemaManager {
  return new SchemaManager(config);
}

export function defineSchema<T extends SchemaDefinition>(definition: T, version: string = '1.0.0'): SchemaConfig {
  return {
    definition,
    version,
  };
}
