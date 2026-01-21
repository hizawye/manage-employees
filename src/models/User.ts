export interface User {
  id: number;
  username: string;
  createdAt: string;
  isGuest: boolean;
}

// Internal database row (password_hash and salt are never exposed)
export interface UserRow extends User {
  password_hash: string | null;
  salt: string | null;
  is_guest: number;
}
