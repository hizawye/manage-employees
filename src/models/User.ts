export interface User {
  id: number;
  username: string;
  createdAt: string;
}

// Internal database row (password_hash and salt are never exposed)
export interface UserRow extends User {
  password_hash: string;
  salt: string;
}
