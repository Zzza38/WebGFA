import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../data/webgfa.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for better concurrent access
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password TEXT NOT NULL,
        permissions TEXT DEFAULT '',
        session_id TEXT DEFAULT '',
        save_data TEXT DEFAULT '{}',
        email TEXT,
        creation_date TEXT,
        creation_id TEXT,
        reset_id TEXT,
        coins REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS coin_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        amount REAL NOT NULL,
        reason TEXT NOT NULL,
        balance REAL NOT NULL,
        FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        username TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        edited INTEGER DEFAULT 0 CHECK (edited IN (0, 1))
    );

    CREATE TABLE IF NOT EXISTS game_popularity (
        game_name TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        premium INTEGER DEFAULT 0 CHECK (premium IN (0, 1)),
        all_time INTEGER DEFAULT 0,
        monthly INTEGER DEFAULT 0,
        weekly INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_coin_history_username ON coin_history(username);
    CREATE INDEX IF NOT EXISTS idx_users_session_id ON users(session_id);
`);

// Prepared statements for common operations
const statements = {
    // Users
    getUserByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
    getUserBySessionId: db.prepare('SELECT * FROM users WHERE session_id = ?'),
    getAllUsers: db.prepare('SELECT * FROM users'),
    insertUser: db.prepare(`
        INSERT INTO users (username, password, permissions, session_id, save_data, email, creation_date, creation_id, reset_id, coins)
        VALUES (@username, @password, @permissions, @session_id, @save_data, @email, @creation_date, @creation_id, @reset_id, @coins)
    `),
    updateUser: db.prepare(`
        UPDATE users SET
            password = @password,
            permissions = @permissions,
            session_id = @session_id,
            save_data = @save_data,
            email = @email,
            creation_date = @creation_date,
            creation_id = @creation_id,
            reset_id = @reset_id,
            coins = @coins
        WHERE username = @username
    `),
    deleteUser: db.prepare('DELETE FROM users WHERE username = ?'),
    updateSessionId: db.prepare('UPDATE users SET session_id = ? WHERE username = ?'),
    updatePassword: db.prepare('UPDATE users SET password = ? WHERE username = ?'),
    updatePermissions: db.prepare('UPDATE users SET permissions = ? WHERE username = ?'),
    updateSaveData: db.prepare('UPDATE users SET save_data = ? WHERE username = ?'),
    updateCoins: db.prepare('UPDATE users SET coins = ? WHERE username = ?'),
    updateCreationId: db.prepare('UPDATE users SET creation_id = ? WHERE username = ?'),
    updateResetId: db.prepare('UPDATE users SET reset_id = ? WHERE username = ?'),
    sessionExists: db.prepare('SELECT 1 FROM users WHERE session_id = ?'),

    // Coin History
    getCoinHistory: db.prepare('SELECT * FROM coin_history WHERE username = ? ORDER BY id DESC'),
    insertCoinHistory: db.prepare(`
        INSERT INTO coin_history (username, timestamp, amount, reason, balance)
        VALUES (@username, @timestamp, @amount, @reason, @balance)
    `),

    // Messages
    getMessage: db.prepare('SELECT * FROM messages WHERE id = ?'),
    getAllMessages: db.prepare('SELECT * FROM messages ORDER BY id ASC'),
    insertMessage: db.prepare(`
        INSERT INTO messages (content, username, timestamp, edited)
        VALUES (@content, @username, @timestamp, @edited)
    `),
    updateMessage: db.prepare('UPDATE messages SET content = ?, edited = 1 WHERE id = ?'),
    deleteMessage: db.prepare('DELETE FROM messages WHERE id = ?'),

    // Game Popularity
    getGamePopularity: db.prepare('SELECT * FROM game_popularity WHERE game_name = ?'),
    getAllGamePopularity: db.prepare('SELECT * FROM game_popularity ORDER BY all_time DESC'),
    upsertGamePopularity: db.prepare(`
        INSERT INTO game_popularity (game_name, url, premium, all_time, monthly, weekly)
        VALUES (@game_name, @url, @premium, @all_time, @monthly, @weekly)
        ON CONFLICT(game_name) DO UPDATE SET
            all_time = @all_time,
            monthly = @monthly,
            weekly = @weekly
    `),
    incrementGamePopularity: db.prepare(`
        UPDATE game_popularity SET
            all_time = all_time + 1,
            monthly = monthly + 1,
            weekly = weekly + 1
        WHERE game_name = ?
    `),
    resetMonthlyPopularity: db.prepare('UPDATE game_popularity SET monthly = 0'),
    resetWeeklyPopularity: db.prepare('UPDATE game_popularity SET weekly = 0'),

    // Metadata
    getMetadata: db.prepare('SELECT value FROM metadata WHERE key = ?'),
    setMetadata: db.prepare('INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)'),
};

// User type for TypeScript
export interface DbUser {
    username: string;
    password: string;
    permissions: string;
    session_id: string;
    save_data: string;
    email: string | null;
    creation_date: string | null;
    creation_id: string | null;
    reset_id: string | null;
    coins: number;
}

export interface DbCoinHistory {
    id: number;
    username: string;
    timestamp: string;
    amount: number;
    reason: string;
    balance: number;
}

export interface DbMessage {
    id: number;
    content: string;
    username: string;
    timestamp: string;
    edited: number; // 0 or 1
}

export interface DbGamePopularity {
    game_name: string;
    url: string;
    premium: number; // 0 or 1
    all_time: number;
    monthly: number;
    weekly: number;
}

// Helper functions
export const users = {
    get: (username: string): DbUser | undefined => statements.getUserByUsername.get(username) as DbUser | undefined,
    getBySessionId: (sessionId: string): DbUser | undefined => statements.getUserBySessionId.get(sessionId) as DbUser | undefined,
    getAll: (): DbUser[] => statements.getAllUsers.all() as DbUser[],
    exists: (username: string): boolean => !!statements.getUserByUsername.get(username),
    sessionExists: (sessionId: string): boolean => !!statements.sessionExists.get(sessionId),
    create: (user: Partial<DbUser> & { username: string; password: string }) => {
        const fullUser = {
            username: user.username,
            password: user.password,
            permissions: user.permissions ?? '',
            session_id: user.session_id ?? '',
            save_data: user.save_data ?? '{}',
            email: user.email ?? null,
            creation_date: user.creation_date ?? null,
            creation_id: user.creation_id ?? null,
            reset_id: user.reset_id ?? null,
            coins: user.coins ?? 0,
        };
        return statements.insertUser.run(fullUser);
    },
    update: (user: DbUser) => statements.updateUser.run(user),
    delete: (username: string) => statements.deleteUser.run(username),
    setSessionId: (username: string, sessionId: string) => statements.updateSessionId.run(sessionId, username),
    setPassword: (username: string, password: string) => statements.updatePassword.run(password, username),
    setPermissions: (username: string, permissions: string) => statements.updatePermissions.run(permissions, username),
    setSaveData: (username: string, saveData: string) => statements.updateSaveData.run(saveData, username),
    setCoins: (username: string, coins: number) => statements.updateCoins.run(coins, username),
    setCreationId: (username: string, creationId: string | null) => statements.updateCreationId.run(creationId, username),
    setResetId: (username: string, resetId: string | null) => statements.updateResetId.run(resetId, username),
};

export const coinHistory = {
    get: (username: string): DbCoinHistory[] => statements.getCoinHistory.all(username) as DbCoinHistory[],
    add: (entry: Omit<DbCoinHistory, 'id'>) => statements.insertCoinHistory.run(entry),
};

export const messages = {
    get: (id: number): DbMessage | undefined => statements.getMessage.get(id) as DbMessage | undefined,
    getAll: (): DbMessage[] => statements.getAllMessages.all() as DbMessage[],
    create: (msg: Omit<DbMessage, 'id'>) => statements.insertMessage.run(msg),
    update: (id: number, content: string) => statements.updateMessage.run(content, id),
    delete: (id: number) => statements.deleteMessage.run(id),
    getNextId: (): number => {
        const result = db.prepare('SELECT MAX(id) as maxId FROM messages').get() as { maxId: number | null };
        return (result.maxId ?? 0) + 1;
    },
};

export const gamePopularity = {
    get: (gameName: string): DbGamePopularity | undefined => statements.getGamePopularity.get(gameName) as DbGamePopularity | undefined,
    getAll: (): DbGamePopularity[] => statements.getAllGamePopularity.all() as DbGamePopularity[],
    upsert: (game: DbGamePopularity) => statements.upsertGamePopularity.run(game),
    increment: (gameName: string) => statements.incrementGamePopularity.run(gameName),
    resetMonthly: () => statements.resetMonthlyPopularity.run(),
    resetWeekly: () => statements.resetWeeklyPopularity.run(),
};

export const metadata = {
    get: (key: string): string | undefined => {
        const row = statements.getMetadata.get(key) as { value: string } | undefined;
        return row?.value;
    },
    set: (key: string, value: string) => statements.setMetadata.run(key, value),
};

// Transaction helper
export const transaction = <T>(fn: () => T): T => {
    return db.transaction(fn)();
};

// Export raw db for edge cases
export { db };
