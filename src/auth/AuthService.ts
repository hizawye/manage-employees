import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import { getDatabase } from '../database';
import { User, UserRow } from '../models/User';

const AUTH_STORAGE_KEY = '@auth/user';
const SESSION_VERSION = 2;
const HASH_ALGORITHM = 'pbkdf2_sha256';
const PBKDF2_ITERATIONS = 100_000;
const SALT_LENGTH = 32;

interface StoredSession {
  userId: number;
  sessionVersion: number;
}

interface UserLookupRow {
  id: number;
  username: string;
  createdAt: string;
  is_guest: number;
}

function mapUserRow(row: UserLookupRow): User {
  return {
    id: row.id,
    username: row.username,
    createdAt: row.createdAt,
    isGuest: row.is_guest === 1,
  };
}

export class AuthService {
  /**
   * Sign up a new user
   */
  static async signup(username: string, password: string): Promise<User> {
    this.validateUsername(username);
    this.validatePassword(password);

    const db = await getDatabase();

    // Check if username already exists
    const existing = await db.getAllAsync<{ id: number }>(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existing.length > 0) {
      throw new Error('Username already exists');
    }

    const passwordHash = this.hashPassword(password);
    const now = new Date().toISOString();

    // Insert user
    const result = await db.runAsync(
      'INSERT INTO users (username, password_hash, salt, created_at, is_guest) VALUES (?, ?, ?, ?, ?)',
      [username, passwordHash, null, now, 0]
    );

    const user: User = {
      id: result.lastInsertRowId,
      username,
      createdAt: now,
      isGuest: false,
    };

    await this.claimLegacyData(user.id);
    await this.storeSession(user.id);

    return user;
  }

  /**
   * Login an existing user
   */
  static async login(username: string, password: string): Promise<User> {
    const db = await getDatabase();

    // Get user with password hash and salt
    const users = await db.getAllAsync<UserRow>(
      'SELECT id, username, password_hash, salt, created_at as createdAt, is_guest FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      throw new Error('Invalid credentials');
    }

    const userRow = users[0];

    // Guest users cannot login with password
    if (userRow.is_guest === 1) {
      throw new Error('Invalid credentials');
    }

    // Verify password (both hash and salt must exist for non-guest users)
    if (!userRow.password_hash || !userRow.salt) {
      throw new Error('Invalid credentials');
    }

    const isValid = await this.verifyPassword(password, userRow.password_hash, userRow.salt);

    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    if (!this.isModernHash(userRow.password_hash)) {
      await db.runAsync(
        'UPDATE users SET password_hash = ?, salt = ? WHERE id = ?',
        [this.hashPassword(password), null, userRow.id]
      );
    }

    const user: User = {
      id: userRow.id,
      username: userRow.username,
      createdAt: userRow.createdAt,
      isGuest: false,
    };

    await this.storeSession(user.id);

    return user;
  }

  /**
   * Logout current user
   */
  static async logout(): Promise<void> {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  }

  /**
   * Get current logged-in user
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      const userJson = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (!userJson) {
        return null;
      }
      const parsed = JSON.parse(userJson);
      const userId = this.getStoredUserId(parsed);

      if (!userId) {
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
      }

      const db = await getDatabase();
      const row = await db.getFirstAsync<UserLookupRow>(
        'SELECT id, username, created_at as createdAt, is_guest FROM users WHERE id = ?',
        [userId]
      );

      if (!row) {
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
      }

      if (parsed.sessionVersion !== SESSION_VERSION) {
        await this.storeSession(row.id);
      }

      return mapUserRow(row);
    } catch {
      // Corrupted storage — clear it and force re-login
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
  }

  private static async storeSession(userId: number): Promise<void> {
    const session: StoredSession = { userId, sessionVersion: SESSION_VERSION };
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  }

  private static getStoredUserId(value: unknown): number | null {
    if (!value || typeof value !== 'object') return null;
    const candidate = value as { userId?: unknown; id?: unknown };
    const userId = typeof candidate.userId === 'number' ? candidate.userId : candidate.id;
    return typeof userId === 'number' && Number.isInteger(userId) && userId > 0 ? userId : null;
  }

  private static hashPassword(password: string): string {
    const salt = this.generateSalt();
    const hash = pbkdf2(sha256, utf8ToBytes(password), hexToBytes(salt), {
      c: PBKDF2_ITERATIONS,
      dkLen: 32,
    });

    return `${HASH_ALGORITHM}$${PBKDF2_ITERATIONS}$${salt}$${bytesToHex(hash)}`;
  }

  private static async verifyPassword(password: string, storedHash: string, legacySalt?: string | null): Promise<boolean> {
    if (this.isModernHash(storedHash)) {
      const [, iterationsValue, salt, hash] = storedHash.split('$');
      const iterations = Number(iterationsValue);
      if (!iterations || !salt || !hash) return false;

      const candidate = pbkdf2(sha256, utf8ToBytes(password), hexToBytes(salt), {
        c: iterations,
        dkLen: 32,
      });

      return this.constantTimeCompare(bytesToHex(candidate), hash);
    }

    if (!legacySalt) return false;
    const legacyHash = await this.legacyHashPassword(password, legacySalt);
    return this.constantTimeCompare(legacyHash, storedHash);
  }

  private static isModernHash(hash: string): boolean {
    return hash.startsWith(`${HASH_ALGORITHM}$`);
  }

  private static async legacyHashPassword(password: string, salt: string): Promise<string> {
    const key = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password + salt);

    let hash = key;
    for (let i = 0; i < 1000; i++) {
      hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, hash + salt);
    }

    return hash;
  }

  /**
   * Generate a random salt
   */
  private static generateSalt(): string {
    const randomBytes = Crypto.getRandomBytes(SALT_LENGTH);
    return Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private static constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Validate username format
   */
  private static validateUsername(username: string): void {
    if (!username || username.length < 3 || username.length > 20) {
      throw new Error('Username must be between 3 and 20 characters');
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error('Username can only contain letters, numbers, and underscores');
    }
  }

  /**
   * Validate password strength
   */
  private static validatePassword(password: string): void {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    if (!/\d/.test(password)) {
      throw new Error('Password must contain at least one number');
    }
  }

  /**
   * Create a private guest user for this session.
   */
  static async createGuestUser(): Promise<User> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const username = `guest_${Date.now()}_${this.generateSalt().slice(0, 8)}`;
    const result = await db.runAsync(
      'INSERT INTO users (username, password_hash, salt, created_at, is_guest) VALUES (?, ?, ?, ?, ?)',
      [username, null, null, now, 1]
    );

    const user: User = {
      id: result.lastInsertRowId,
      username,
      createdAt: now,
      isGuest: true,
    };

    await this.claimLegacyData(user.id);
    await this.storeSession(user.id);
    return user;
  }

  /**
   * Convert guest user to authenticated account
   */
  static async convertGuestToUser(username: string, password: string): Promise<User> {
    const currentUser = await this.getCurrentUser();

    if (!currentUser || !currentUser.isGuest) {
      throw new Error('Not logged in as guest');
    }

    this.validateUsername(username);
    this.validatePassword(password);

    const db = await getDatabase();

    // Check if username already exists
    const existing = await db.getAllAsync<{ id: number }>(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existing.length > 0) {
      throw new Error('Username already exists');
    }

    const passwordHash = this.hashPassword(password);

    // Update guest user to authenticated user
    const result = await db.runAsync(
      'UPDATE users SET username = ?, password_hash = ?, salt = ?, is_guest = ? WHERE id = ?',
      [username, passwordHash, null, 0, currentUser.id]
    );

    if (result.changes === 0) {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      throw new Error('Not logged in as guest');
    }

    const user: User = {
      id: currentUser.id,
      username,
      createdAt: currentUser.createdAt,
      isGuest: false,
    };

    await this.storeSession(user.id);

    return user;
  }

  /**
   * Check if current user is a guest
   */
  static async isGuestUser(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user?.isGuest ?? false;
  }

  private static async claimLegacyData(userId: number): Promise<void> {
    const db = await getDatabase();
    const legacy = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM users WHERE username = ?',
      ['legacy_import']
    );

    if (!legacy || legacy.id === userId) return;

    await db.withTransactionAsync(async () => {
      await this.claimTableRows(db, 'employees', legacy.id, userId);
      await this.claimTableRows(db, 'attendance', legacy.id, userId);
      await this.claimTableRows(db, 'payments', legacy.id, userId);
      await this.claimTableRows(db, 'logs', legacy.id, userId);
      await db.runAsync('DELETE FROM users WHERE id = ? AND username = ?', [legacy.id, 'legacy_import']);
    });
  }

  private static async claimTableRows(
    db: SQLite.SQLiteDatabase,
    tableName: string,
    fromUserId: number,
    toUserId: number
  ): Promise<void> {
    const table = await db.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
      [tableName]
    );

    if (!table) return;

    const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName});`);
    if (!columns.some((column: { name: string }) => column.name === 'user_id')) return;

    await db.runAsync(`UPDATE ${tableName} SET user_id = ? WHERE user_id = ?`, [toUserId, fromUserId]);
  }
}
