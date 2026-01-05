import type { D1Database as CF_D1Database } from '@cloudflare/workers-types';

export interface D1Config {
  binding: string;
  databaseName: string;
  databaseId: string;
}

export class D1Database {
  private db: CF_D1Database;

  constructor(db: CF_D1Database) {
    this.db = db;
  }

  async query(sql: string, params?: any[]) {
    try {
      const stmt = this.db.prepare(sql);
      const result = params ? stmt.bind(...params) : stmt;
      return await result.all();
    } catch (error) {
      console.error('D1 query error:', error);
      throw error;
    }
  }

  async execute(sql: string, params?: any[]) {
    try {
      const stmt = this.db.prepare(sql);
      const result = params ? stmt.bind(...params) : stmt;
      return await result.run();
    } catch (error) {
      console.error('D1 execute error:', error);
      throw error;
    }
  }

  async insert(table: string, data: Record<string, any>) {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);

    const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
    return this.execute(sql, values);
  }

  async update(table: string, id: string, data: Record<string, any>) {
    const setClause = Object.keys(data)
      .map(key => `${key} = ?`)
      .join(', ');
    const values = [...Object.values(data), id];

    const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
    return this.execute(sql, values);
  }

  async delete(table: string, id: string) {
    const sql = `DELETE FROM ${table} WHERE id = ?`;
    return this.execute(sql, [id]);
  }

  async findOne(table: string, id: string) {
    const sql = `SELECT * FROM ${table} WHERE id = ?`;
    const result = await this.query(sql, [id]);
    return result.results?.[0] || null;
  }

  async findAll(table: string) {
    const sql = `SELECT * FROM ${table}`;
    const result = await this.query(sql);
    return result.results || [];
  }
}

export function createD1Database(db: CF_D1Database) {
  return new D1Database(db);
}
