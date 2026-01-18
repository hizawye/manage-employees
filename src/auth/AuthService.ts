import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from '../database';
import { User, UserRow } from '../models/User';

const AUTH_STORAGE_KEY = '@auth/user';
const PBKDF2_ITERATIONS = 10000;
const SALT_LENGTH = 32;

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

    // Generate salt and hash password
    const salt = this.generateSalt();
    const passwordHash = await this.hashPassword(password, salt);

    // Insert user
    const result = await db.runAsync(
      'INSERT INTO users (username, password_hash, salt, created_at) VALUES (?, ?, ?, ?)',
      [username, passwordHash, salt, new Date().toISOString()]
    );

    const user: User = {
      id: result.lastInsertRowId,
      username,
      createdAt: new Date().toISOString(),
    };

    // Store session
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));

    return user;
  }

  /**
   * Login an existing user
   */
  static async login(username: string, password: string): Promise<User> {
    const db = await getDatabase();

    // Get user with password hash and salt
    const users = await db.getAllAsync<UserRow>(
      'SELECT id, username, password_hash, salt, created_at FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      throw new Error('Invalid credentials');
    }

    const userRow = users[0];

    // Verify password
    const passwordHash = await this.hashPassword(password, userRow.salt);
    const isValid = await this.constantTimeCompare(passwordHash, userRow.password_hash);

    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    const user: User = {
      id: userRow.id,
      username: userRow.username,
      createdAt: userRow.createdAt,
    };

    // Store session
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));

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
    const userJson = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (!userJson) {
      return null;
    }
    return JSON.parse(userJson);
  }

  /**
   * Hash password using PBKDF2
   */
  private static async hashPassword(password: string, salt: string): Promise<string> {
    const key = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password + salt
    );

    // Additional PBKDF2-like iterations for security
    let hash = key;
    for (let i = 0; i < PBKDF2_ITERATIONS; i++) {
      hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        hash + salt
      );
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
  private static async constantTimeCompare(a: string, b: string): Promise<boolean> {
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
}
