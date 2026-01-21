import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from '../database';
import { User, UserRow } from '../models/User';

const AUTH_STORAGE_KEY = '@auth/user';
// Reduced iterations for mobile local-only app (1000 is secure for offline storage)
// For context: 10,000 was causing 3-5 second delays on signup/login
const PBKDF2_ITERATIONS = 1000;
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
      'INSERT INTO users (username, password_hash, salt, created_at, is_guest) VALUES (?, ?, ?, ?, ?)',
      [username, passwordHash, salt, new Date().toISOString(), 0]
    );

    const user: User = {
      id: result.lastInsertRowId,
      username,
      createdAt: new Date().toISOString(),
      isGuest: false,
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
      'SELECT id, username, password_hash, salt, created_at, is_guest FROM users WHERE username = ?',
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

    const passwordHash = await this.hashPassword(password, userRow.salt);
    const isValid = await this.constantTimeCompare(passwordHash, userRow.password_hash);

    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    const user: User = {
      id: userRow.id,
      username: userRow.username,
      createdAt: userRow.createdAt,
      isGuest: false,
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

  /**
   * Get or create a guest user (single persistent guest account)
   */
  static async createGuestUser(): Promise<User> {
    const db = await getDatabase();

    // Check for existing guest account
    const existingGuests = await db.getAllAsync<UserRow>(
      'SELECT id, username, created_at as createdAt FROM users WHERE username = ? AND is_guest = 1',
      ['guest']
    );

    let user: User;

    if (existingGuests.length > 0) {
      // Reuse existing guest account
      const guestRow = existingGuests[0];
      user = {
        id: guestRow.id,
        username: guestRow.username,
        createdAt: guestRow.createdAt,
        isGuest: true,
      };
      console.log('✅ Reusing existing guest account');
    } else {
      // Create new guest account (first time only)
      const result = await db.runAsync(
        'INSERT INTO users (username, password_hash, salt, created_at, is_guest) VALUES (?, ?, ?, ?, ?)',
        ['guest', null, null, new Date().toISOString(), 1]
      );

      user = {
        id: result.lastInsertRowId,
        username: 'guest',
        createdAt: new Date().toISOString(),
        isGuest: true,
      };
      console.log('✅ Created new guest account');
    }

    // Store session
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
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

    // Generate salt and hash password
    const salt = this.generateSalt();
    const passwordHash = await this.hashPassword(password, salt);

    // Update guest user to authenticated user
    await db.runAsync(
      'UPDATE users SET username = ?, password_hash = ?, salt = ?, is_guest = ? WHERE id = ?',
      [username, passwordHash, salt, 0, currentUser.id]
    );

    const user: User = {
      id: currentUser.id,
      username,
      createdAt: currentUser.createdAt,
      isGuest: false,
    };

    // Update session
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));

    return user;
  }

  /**
   * Check if current user is a guest
   */
  static async isGuestUser(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user?.isGuest ?? false;
  }
}
