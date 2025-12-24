/**
 * 统一数据访问层 (Unified Data Access Layer)
 * 
 * 符合 Linus 编码哲学的设计：
 * 1. 简单胜过复杂 - 单一入口点，无过度抽象
 * 2. 透明度 - 数据访问路径清晰可见
 * 3. 单一职责 - 专注于数据访问路由
 * 4. 无魔法 - 无隐藏的数据访问逻辑
 * 
 * 这个层作为本地数据库和 Supabase 的统一入口点，
 * 根据配置决定使用本地数据库还是远程 Supabase。
 */

import { PGlite } from "@electric-sql/pglite";
import { getSupabaseClient } from "@make-gold/lib/supabase-ios14.tsx";
import { getSingletonInitializedPGlite } from "@make-gold/lib/pglite";
import { shouldUseCloudOnlyModeForPlatform } from "./PlatformDetectionService";

// 数据源类型
export type DataSource = 'local' | 'supabase' | 'hybrid';

// 统一数据访问配置
export interface DataAccessConfig {
  dataSource: DataSource;
  // 本地数据库实例（仅当 dataSource 为 'local' 或 'hybrid' 时需要）
  localDb?: PGlite;
  // Supabase 配置（仅当 dataSource 为 'supabase' 或 'hybrid' 时需要）
  supabaseConfig?: {
    url?: string;
    anonKey?: string;
  };
}

// 统一查询结果
export interface QueryResult<T> {
  data: T | null;
  error: Error | null;
  source: DataSource;
}

// 统一插入结果
export interface InsertResult<T> {
  data: T | null;
  error: Error | null;
  source: DataSource;
}

// 统一更新结果
export interface UpdateResult<T> {
  data: T | null;
  error: Error | null;
  source: DataSource;
}

// 统一删除结果
export interface DeleteResult {
  error: Error | null;
  source: DataSource;
}

/**
 * 统一数据访问类
 * 
 * 这个类作为本地数据库和 Supabase 的统一入口点，
 * 根据配置决定使用本地数据库还是远程 Supabase。
 * 
 * 设计原则：
 * - 简单直接：每个方法只做一件事
 * - 透明度：明确标识数据来源
 * - 错误处理：简单统一的错误处理
 */
class UnifiedDataAccess {
  private config: DataAccessConfig;
  private supabaseClient = getSupabaseClient();

  constructor(config: DataAccessConfig) {
    this.config = config;
  }

  /**
   * 强制设置数据源类型
   * 用于在运行时根据用户状态调整数据源
   */
  setDataSource(dataSource: DataSource): void {
    this.config.dataSource = dataSource;
  }

  /**
   * 获取当前数据源类型
   */
  getDataSource(): DataSource {
    return this.config.dataSource;
  }

  /**
   * 检查是否使用本地数据库
   */
  isUsingLocal(): boolean {
    return this.config.dataSource === 'local' || this.config.dataSource === 'hybrid';
  }

  /**
   * 检查是否使用 Supabase
   */
  isUsingSupabase(): boolean {
    return this.config.dataSource === 'supabase' || this.config.dataSource === 'hybrid';
  }

  /**
   * 获取本地数据库实例 (从Provider获取，避免重复初始化)
   */
  private async getLocalDb(): Promise<PGlite> {
    if (this.config.localDb) {
      return this.config.localDb;
    }

    // 使用已经初始化的单例实例，避免重复初始化
    // 注意：如果是iOS14用户或未登录用户，getSingletonInitializedPGlite会抛出错误
    try {
      const db = await getSingletonInitializedPGlite();
      this.config.localDb = db;
      return db;
    } catch (error) {
      // iOS14用户或未登录用户可能没有初始化本地数据库
      console.warn('[UnifiedDataAccess] 本地数据库未初始化，这可能是预期行为（iOS14用户或未登录用户）');
      throw new Error('Local database not initialized: ' + error);
    }
  }

  /**
   * 在本地数据库上下文中执行操作
   * 
   * 允许服务层直接访问 PGlite 实例以复用 packages/lib 中的纯函数
   * 如果当前不是使用本地数据库，则返回 null
   */
  async executeLocal<T>(fn: (db: PGlite) => Promise<T>): Promise<T | null> {
    if (!this.isUsingLocal()) {
      return null;
    }

    try {
      const db = await this.getLocalDb();
      return await fn(db);
    } catch (error) {
      console.error('[UnifiedDataAccess] executeLocal failed:', error);
      throw error;
    }
  }

  /**
   * 统一查询方法
   * 
   * 根据配置决定使用本地数据库还是 Supabase
   * 
   * @param table 表名
   * @param columns 要查询的列，默认为所有列
   * @param filters 过滤条件，格式为 { column: value }
   * @param orderBy 排序条件，格式为 { column: 'asc' | 'desc' }
   * @param limit 限制返回的行数
   * @returns Promise<QueryResult<T[]>>
   */
  async select<T = any>(
    table: string,
    columns: string = '*',
    filters?: Record<string, any>,
    orderBy?: Record<string, 'asc' | 'desc'>,
    limit?: number
  ): Promise<QueryResult<T[]>> {
    try {
      // 验证表名，防止 SQL 注入
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
        throw new Error(`Invalid table name: ${table}`);
      }

      // 验证列名，防止 SQL 注入
      if (columns !== '*' && !/^[a-zA-Z_][a-zA-Z0-9_]*(,\s*[a-zA-Z_][a-zA-Z0-9_]*)*$/.test(columns)) {
        throw new Error(`Invalid column name: ${columns}`);
      }

      // 根据数据源选择查询方式
      if (this.isUsingLocal()) {
        return await this.selectFromLocal<T>(table, columns, filters, orderBy, limit);
      } else if (this.isUsingSupabase()) {
        return await this.selectFromSupabase<T>(table, columns, filters, orderBy, limit);
      } else {
        throw new Error('No valid data source configured');
      }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
        source: this.config.dataSource
      };
    }
  }

  /**
   * 统一批量插入方法
   * 
   * @param table 表名
   * @param dataArray 要插入的数据数组
   * @returns Promise<InsertResult<T[]>>
   */
  async insertBatch<T = any>(
    table: string,
    dataArray: Record<string, any>[]
  ): Promise<InsertResult<T[]>> {
    try {
      // 验证表名，防止 SQL 注入
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
        throw new Error(`Invalid table name: ${table}`);
      }

      if (!dataArray || dataArray.length === 0) {
        return {
          data: [],
          error: null,
          source: this.config.dataSource
        };
      }

      // 根据数据源选择插入方式
      if (this.isUsingLocal()) {
        return await this.insertBatchIntoLocal<T>(table, dataArray);
      } else if (this.isUsingSupabase()) {
        return await this.insertBatchIntoSupabase<T>(table, dataArray);
      } else {
        throw new Error('No valid data source configured');
      }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
        source: this.config.dataSource
      };
    }
  }
  /**
   * 统一插入方法
   * 
   * @param table 表名
   * @param data 要插入的数据
   * @returns Promise<InsertResult<T>>
   */
  async insert<T = any>(
    table: string,
    data: Record<string, any>
  ): Promise<InsertResult<T>> {
    try {
      // 验证表名，防止 SQL 注入
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
        throw new Error(`Invalid table name: ${table}`);
      }

      // 根据数据源选择插入方式
      if (this.isUsingLocal()) {
        return await this.insertIntoLocal<T>(table, data);
      } else if (this.isUsingSupabase()) {
        return await this.insertIntoSupabase<T>(table, data);
      } else {
        throw new Error('No valid data source configured');
      }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
        source: this.config.dataSource
      };
    }
  }

  /**
   * 统一更新方法
   * 
   * @param table 表名
   * @param data 要更新的数据
   * @param filters 过滤条件，格式为 { column: value }
   * @returns Promise<UpdateResult<T>>
   */
  async update<T = any>(
    table: string,
    data: Record<string, any>,
    filters: Record<string, any>
  ): Promise<UpdateResult<T>> {
    try {
      // 验证表名，防止 SQL 注入
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
        throw new Error(`Invalid table name: ${table}`);
      }

      // 根据数据源选择更新方式
      if (this.isUsingLocal()) {
        return await this.updateLocal<T>(table, data, filters);
      } else if (this.isUsingSupabase()) {
        return await this.updateSupabase<T>(table, data, filters);
      } else {
        throw new Error('No valid data source configured');
      }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
        source: this.config.dataSource
      };
    }
  }

  /**
   * 统一删除方法
   * 
   * @param table 表名
   * @param filters 过滤条件，格式为 { column: value }
   * @returns Promise<DeleteResult>
   */
  async delete(
    table: string,
    filters: Record<string, any>
  ): Promise<DeleteResult> {
    try {
      // 验证表名，防止 SQL 注入
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
        throw new Error(`Invalid table name: ${table}`);
      }

      // 根据数据源选择删除方式
      if (this.isUsingLocal()) {
        return await this.deleteFromLocal(table, filters);
      } else if (this.isUsingSupabase()) {
        return await this.deleteFromSupabase(table, filters);
      } else {
        throw new Error('No valid data source configured');
      }
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error(String(error)),
        source: this.config.dataSource
      };
    }
  }

  /**
   * 从本地数据库查询
   */
  private async selectFromLocal<T>(
    table: string,
    columns: string,
    filters?: Record<string, any>,
    orderBy?: Record<string, 'asc' | 'desc'>,
    limit?: number
  ): Promise<QueryResult<T[]>> {
    const db = await this.getLocalDb();

    let query = `SELECT ${columns} FROM ${table}`;
    const params: any[] = [];
    let paramIndex = 1;

    // 添加 WHERE 条件
    if (filters && Object.keys(filters).length > 0) {
      const whereConditions = Object.keys(filters).map(key => {
        params.push(filters[key]);
        return `${key} = $${paramIndex++}`;
      });
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // 添加 ORDER BY 条件
    if (orderBy) {
      const orderConditions = Object.keys(orderBy).map(key => `${key} ${orderBy[key].toUpperCase()}`);
      query += ` ORDER BY ${orderConditions.join(', ')}`;
    }

    // 添加 LIMIT 条件
    if (limit) {
      params.push(limit);
      query += ` LIMIT $${paramIndex}`;
    }

    const result = await db.query<T>(query, params);

    return {
      data: result.rows,
      error: null,
      source: 'local'
    };
  }

  /**
   * 从 Supabase 查询
   */
  private async selectFromSupabase<T>(
    table: string,
    columns: string,
    filters?: Record<string, any>,
    orderBy?: Record<string, 'asc' | 'desc'>,
    limit?: number
  ): Promise<QueryResult<T[]>> {
    let query = this.supabaseClient.from(table).select(columns);

    // 添加 WHERE 条件
    if (filters) {
      Object.keys(filters).forEach(key => {
        query = query.eq(key, filters[key]);
      });
    }

    // 添加 ORDER BY 条件
    if (orderBy) {
      Object.keys(orderBy).forEach(key => {
        query = query.order(key, { ascending: orderBy[key] === 'asc' });
      });
    }

    // 添加 LIMIT 条件
    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return {
      data: data as T[],
      error: null,
      source: 'supabase'
    };
  }

  /**
   * 插入到本地数据库
   */
  private async insertIntoLocal<T>(
    table: string,
    data: Record<string, any>
  ): Promise<InsertResult<T>> {
    const db = await this.getLocalDb();

    const columns = Object.keys(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const values = Object.values(data);

    const query = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await db.query<T>(query, values);

    return {
      data: result.rows[0] || null,
      error: null,
      source: 'local'
    };
  }

  /**
   * 批量插入到 Supabase
   */
  private async insertBatchIntoSupabase<T>(
    table: string,
    dataArray: Record<string, any>[]
  ): Promise<InsertResult<T[]>> {
    const { data: result, error } = await this.supabaseClient
      .from(table)
      .insert(dataArray)
      .select();

    if (error) {
      throw error;
    }

    return {
      data: result as T[],
      error: null,
      source: 'supabase'
    };
  }

  /**
   * 批量插入到本地数据库
   */
  private async insertBatchIntoLocal<T>(
    table: string,
    dataArray: Record<string, any>[]
  ): Promise<InsertResult<T[]>> {
    const db = await this.getLocalDb();
    
    // 构建批量插入SQL
    if (dataArray.length === 0) {
      return {
        data: [],
        error: null,
        source: 'local'
      };
    }

    const columns = Object.keys(dataArray[0]);
    const placeholderRows = dataArray.map((_, rowIndex) => {
      const rowPlaceholders = columns.map((_, colIndex) => 
        `$${rowIndex * columns.length + colIndex + 1}`
      );
      return `(${rowPlaceholders.join(', ')})`;
    });

    const values = dataArray.flatMap(row => Object.values(row));

    const query = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES ${placeholderRows.join(', ')}
      RETURNING *
    `;

    const result = await db.query<T>(query, values);

    return {
      data: result.rows,
      error: null,
      source: 'local'
    };
  }

  /**
   * 插入到 Supabase
   */
  private async insertIntoSupabase<T>(
    table: string,
    data: Record<string, any>
  ): Promise<InsertResult<T>> {
    const { data: result, error } = await this.supabaseClient
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      data: result as T,
      error: null,
      source: 'supabase'
    };
  }

  /**
   * 更新本地数据库
   */
  private async updateLocal<T>(
    table: string,
    data: Record<string, any>,
    filters: Record<string, any>
  ): Promise<UpdateResult<T>> {
    const db = await this.getLocalDb();

    const setClause = Object.keys(data).map((key, i) => `${key} = $${i + 1}`).join(', ');
    const whereClause = Object.keys(filters).map((key, i) => `${key} = $${Object.keys(data).length + i + 1}`).join(' AND ');
    const values = [...Object.values(data), ...Object.values(filters)];

    const query = `
      UPDATE ${table}
      SET ${setClause}
      WHERE ${whereClause}
      RETURNING *
    `;

    const result = await db.query<T>(query, values);

    return {
      data: result.rows[0] || null,
      error: null,
      source: 'local'
    };
  }

  /**
   * 更新 Supabase
   */
  private async updateSupabase<T>(
    table: string,
    data: Record<string, any>,
    filters: Record<string, any>
  ): Promise<UpdateResult<T>> {
    let query = this.supabaseClient.from(table).update(data);

    // 添加 WHERE 条件
    Object.keys(filters).forEach(key => {
      query = query.eq(key, filters[key]);
    });

    const { data: result, error } = await query.select().single();

    if (error) {
      throw error;
    }

    return {
      data: result as T,
      error: null,
      source: 'supabase'
    };
  }

  /**
   * 从本地数据库删除
   */
  private async deleteFromLocal(
    table: string,
    filters: Record<string, any>
  ): Promise<DeleteResult> {
    const db = await this.getLocalDb();

    const whereClause = Object.keys(filters).map((key, i) => `${key} = $${i + 1}`).join(' AND ');
    const values = Object.values(filters);

    const query = `DELETE FROM ${table} WHERE ${whereClause}`;

    await db.query(query, values);

    return {
      error: null,
      source: 'local'
    };
  }

  /**
   * 从 Supabase 删除
   */
  private async deleteFromSupabase(
    table: string,
    filters: Record<string, any>
  ): Promise<DeleteResult> {
    let query = this.supabaseClient.from(table).delete();

    // 添加 WHERE 条件
    Object.keys(filters).forEach(key => {
      query = query.eq(key, filters[key]);
    });

    const { error } = await query;

    if (error) {
      throw error;
    }

    return {
      error: null,
      source: 'supabase'
    };
  }
}

import { createDefaultDataAccessConfig } from "../config/dataSource";

// 默认配置 - 从环境变量读取
const defaultConfig: DataAccessConfig = createDefaultDataAccessConfig();

// 创建默认实例
let defaultInstance: UnifiedDataAccess | null = null;

/**
 * 获取默认的统一数据访问实例
 * 
 * 默认使用本地 SQLite (PGlite)
 * iOS 14 高级订阅用户需要通过 checkAndUpdateDataSource() 方法更新数据源
 * 
 * @param config 可选配置，如果不提供则使用默认配置
 * @returns UnifiedDataAccess 实例
 */
export function getUnifiedDataAccess(config?: DataAccessConfig): UnifiedDataAccess {
  if (!defaultInstance || config) {
    const finalConfig = config || defaultConfig;
    defaultInstance = new UnifiedDataAccess(finalConfig);

    // 开发环境下记录配置信息
    if (import.meta.env?.DEV) {
      console.log('[UnifiedDataAccess] 初始化配置:', {
        dataSource: finalConfig.dataSource,
        hasLocalDb: !!finalConfig.localDb,
        hasSupabaseConfig: !!finalConfig.supabaseConfig,
      });
    }
  }
  return defaultInstance;
}

/**
 * 检查并更新数据源配置
 * 在用户登录后调用，根据用户状态决定是否使用云端模式
 * 
 * 注意：简化版本，不再自动检查用户状态以避免循环依赖
 * 调用方需要显式传入用户权限状态
 */
export async function checkAndUpdateDataSource(hasSupabaseAccess?: boolean): Promise<void> {
  // 简化版：只检查平台，不检查用户状态
  const shouldUseCloud = shouldUseCloudOnlyModeForPlatform() || (hasSupabaseAccess === true);
  
  if (shouldUseCloud && defaultInstance) {
    defaultInstance.setDataSource('supabase');
    console.log('[UnifiedDataAccess] 已切换到云端模式');
  }
}

/**
 * 重置默认实例（用于测试或配置更新）
 */
export function resetUnifiedDataAccess(): void {
  defaultInstance = null;
}

/**
 * 创建新的统一数据访问实例
 * 
 * @param config 配置
 * @returns UnifiedDataAccess 实例
 */
export function createUnifiedDataAccess(config: DataAccessConfig): UnifiedDataAccess {
  return new UnifiedDataAccess(config);
}

// 导出类型和类
export { UnifiedDataAccess };
export default UnifiedDataAccess;