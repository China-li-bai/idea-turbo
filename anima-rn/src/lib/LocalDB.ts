let SQLiteModule: any = null

async function getSQLite() {
  if (!SQLiteModule) {
    SQLiteModule = await import('expo-sqlite')
  }
  return SQLiteModule
}

type SQLiteDatabase = any

const DB_NAME = 'anima_local.db'

let db: SQLiteDatabase | null = null

export async function initLocalDB(): Promise<SQLiteDatabase> {
  if (db) return db

  const SQLite = await getSQLite()
  db = await SQLite.openDatabaseAsync(DB_NAME)

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS pets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      species TEXT NOT NULL,
      personality TEXT NOT NULL DEFAULT '[]',
      backstory TEXT DEFAULT '',
      avatar_emoji TEXT DEFAULT '🐱',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS episodic_memories (
      id TEXT PRIMARY KEY,
      pet_id TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      privacy_level INTEGER NOT NULL DEFAULT 2 CHECK(privacy_level IN (1, 2, 3)),
      tags TEXT NOT NULL DEFAULT '[]',
      importance REAL NOT NULL DEFAULT 0.5,
      access_count INTEGER NOT NULL DEFAULT 0,
      last_accessed TEXT,
      embedding_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_epi_pet_id ON episodic_memories(pet_id);
    CREATE INDEX IF NOT EXISTS idx_epi_privacy ON episodic_memories(privacy_level);
    CREATE INDEX IF NOT EXISTS idx_epi_timestamp ON episodic_memories(timestamp);
    CREATE INDEX IF NOT EXISTS idx_epi_importance ON episodic_memories(importance DESC);

    CREATE TABLE IF NOT EXISTS semantic_facts (
      id TEXT PRIMARY KEY,
      pet_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'fact' CHECK(category IN ('personality', 'preference', 'fact', 'relationship')),
      confidence REAL NOT NULL DEFAULT 0.5,
      source_episodic_ids TEXT NOT NULL DEFAULT '[]',
      privacy_level INTEGER NOT NULL DEFAULT 2 CHECK(privacy_level IN (1, 2, 3)),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(pet_id, key),
      FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sem_pet_id ON semantic_facts(pet_id);
    CREATE INDEX IF NOT EXISTS idx_sem_category ON semantic_facts(category);
    CREATE INDEX IF NOT EXISTS idx_sem_privacy ON semantic_facts(privacy_level);
    CREATE INDEX IF NOT EXISTS idx_sem_confidence ON semantic_facts(confidence DESC);

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      pet_id TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'pet', 'visitor')),
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      metadata TEXT DEFAULT '{}',
      FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_conv_conversation_id ON conversations(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_conv_timestamp ON conversations(timestamp);

    CREATE TABLE IF NOT EXISTS memory_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    INSERT OR IGNORE INTO memory_config(key, value) VALUES ('last_consolidation', '');
    INSERT OR IGNORE INTO memory_config(key, value) VALUES ('total_episodic_count', '0');
    INSERT OR IGNORE INTO memory_config(key, value) VALUES ('auto_decay_enabled', '1');
  `)

  console.log('[LocalDB] ✅ 数据库初始化完成')
  return db
}

export function getDB(): SQLiteDatabase {
  if (!db) throw new Error('[LocalDB] 数据库未初始化，请先调用 initLocalDB()')
  return db
}

export async function closeDB(): Promise<void> {
  if (db) {
    await db.closeAsync()
    db = null
  }
}

export interface EpisodicRow {
  id: string
  pet_id: string
  content: string
  timestamp: string
  privacy_level: number
  tags: string
  importance: number
  access_count: number
  last_accessed: string | null
  embedding_json: string | null
  created_at: string
}

export interface SemanticRow {
  id: string
  pet_id: string
  key: string
  value: string
  category: string
  confidence: number
  source_episodic_ids: string
  privacy_level: number
  created_at: string
  updated_at: string
}

export async function insertEpisodicMemory(
  memory: Omit<EpisodicRow, 'access_count' | 'last_accessed' | 'created_at'>
): Promise<void> {
  const database = getDB()
  await database.runAsync(
    `INSERT OR REPLACE INTO episodic_memories 
     (id, pet_id, content, timestamp, privacy_level, tags, importance, embedding_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      memory.id,
      memory.pet_id,
      memory.content,
      memory.timestamp,
      memory.privacy_level,
      memory.tags,
      memory.importance,
      memory.embedding_json ?? null,
    ]
  )

  await database.runAsync(
    `UPDATE memory_config SET value = (SELECT CAST(COUNT(*) AS TEXT) FROM episodic_memories) WHERE key = 'total_episodic_count'`
  )
}

export async function getEpisodicMemories(
  petId: string,
  options?: { limit?: number; maxPrivacyLevel?: PrivacyLevel }
): Promise<EpisodicRow[]> {
  const database = getDB()
  const limit = options?.limit ?? 50
  const maxPrivacy = options?.maxPrivacyLevel ?? 3

  const rows = await database.getAllAsync<EpisodicRow>(
    `SELECT * FROM episodic_memories 
     WHERE pet_id = ? AND privacy_level <= ?
     ORDER BY importance DESC, last_accessed DESC
     LIMIT ?`,
    [petId, maxPrivacy, limit]
  )
  return rows
}

export async function getRecentEpisodicMemories(
  petId: string,
  limit: number = 10
): Promise<EpisodicRow[]> {
  const database = getDB()
  return await database.getAllAsync<EpisodicRow>(
    `SELECT * FROM episodic_memories 
     WHERE pet_id = ?
     ORDER BY timestamp DESC
     LIMIT ?`,
    [petId, limit]
  )
}

export async function updateEpisodicAccess(id: string): Promise<void> {
  const database = getDB()
  await database.runAsync(
    `UPDATE episodic_memories 
     SET access_count = access_count + 1, 
         last_accessed = datetime('now')
     WHERE id = ?`,
    [id]
  )
}

export async function decayAllEpisodicMemories(factor: number = 0.95): Promise<number> {
  const database = getDB()
  const result = await database.runAsync(
    `UPDATE episodic_memories 
     SET importance = importance * ?
     WHERE importance > 0.01`,
    [factor]
  )
  return result.changes ?? 0
}

export async function deleteWeakMemories(threshold: number = 0.15): Promise<number> {
  const database = getDB()
  const result = await database.runAsync(
    `DELETE FROM episodic_memories WHERE importance < ? AND access_count = 0`,
    [threshold]
  )
  return result.changes ?? 0
}

export async function insertSemanticFact(
  fact: Omit<SemanticRow, 'created_at' | 'updated_at'>
): Promise<void> {
  const database = getDB()
  const now = new Date().toISOString()
  await database.runAsync(
    `INSERT OR REPLACE INTO semantic_facts 
     (id, pet_id, key, value, category, confidence, source_episodic_ids, privacy_level, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(pet_id, key) DO UPDATE SET
       value = excluded.value,
       confidence = MAX(excluded.confidence, semantic_facts.confidence) + 0.05,
       source_episodic_ids = excluded.source_episodic_ids,
       updated_at = ?`,
    [
      fact.id, fact.pet_id, fact.key, fact.value, fact.category,
      fact.confidence, fact.source_episodic_ids, fact.privacy_level,
      now, now,
    ]
  )
}

export async function getSemanticFacts(
  petId: string,
  options?: { categories?: string[]; maxPrivacyLevel?: PrivacyLevel }
): Promise<SemanticRow[]> {
  const database = getDB()
  const maxPrivacy = options?.maxPrivacyLevel ?? 3

  let sql = `SELECT * FROM semantic_facts WHERE pet_id = ? AND privacy_level <= ?`
  const params: any[] = [petId, maxPrivacy]

  if (options?.categories && options.categories.length > 0) {
    const placeholders = options.categories.map(() => '?').join(',')
    sql += ` AND category IN (${placeholders})`
    params.push(...options.categories)
  }

  sql += ` ORDER BY confidence DESC`

  return await database.getAllAsync<SemanticRow>(sql, params)
}

export async function boostSemanticConfidence(petId: string, key: string, boost: number = 0.1): Promise<void> {
  const database = getDB()
  await database.runAsync(
    `UPDATE semantic_facts SET confidence = MIN(confidence + ?, 1.0), updated_at = datetime('now')
     WHERE pet_id = ? AND key = ?`,
    [boost, petId, key]
  )
}

export async function insertConversation(
  petId: string,
  conversationId: string,
  role: 'user' | 'pet' | 'visitor',
  content: string,
  metadata?: Record<string, any>
): Promise<void> {
  const database = getDB()
  await database.runAsync(
    `INSERT INTO conversations (id, pet_id, conversation_id, role, content, metadata)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [`conv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, petId, conversationId, role, content, JSON.stringify(metadata ?? {})]
  )
}

export async function getRecentConversations(
  petId: string,
  conversationId: string,
  limit: number = 20
): Promise<Array<{ role: string; content: string; timestamp: string }>> {
  const database = getDB()
  return await database.getAllAsync(
    `SELECT role, content, timestamp FROM conversations 
     WHERE pet_id = ? AND conversation_id = ?
     ORDER BY timestamp ASC
     LIMIT ?`,
    [petId, conversationId, limit]
  )
}

export async function getConversationCountSince(petId: string, sinceIso: string): Promise<number> {
  const database = getDB()
  const result = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM conversations WHERE pet_id = ? AND timestamp > ?`,
    [petId, sinceIso]
  )
  return result?.count ?? 0
}

export async function getConfigValue(key: string): Promise<string | null> {
  const database = getDB()
  const row = await database.getFirstAsync<{ value: string }>(
    `SELECT value FROM memory_config WHERE key = ?`, [key]
  )
  return row?.value ?? null
}

export async function setConfigValue(key: string, value: string): Promise<void> {
  const database = getDB()
  await database.runAsync(
    `INSERT OR REPLACE INTO memory_config(key, value) VALUES (?, ?)`, [key, value]
  )
}

export async function getDBStats(): Promise<{
  episodicCount: number
  semanticCount: number
  conversationCount: number
  petCount: number
}> {
  const database = getDB()
  const epi = await database.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM episodic_memories')
  const sem = await database.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM semantic_facts')
  const conv = await database.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM conversations')
  const pet = await database.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM pets')

  return {
    episodicCount: epi?.c ?? 0,
    semanticCount: sem?.c ?? 0,
    conversationCount: conv?.c ?? 0,
    petCount: pet?.c ?? 0,
  }
}
