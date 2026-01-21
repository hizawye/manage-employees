import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../models/User';
import { AuthService } from './AuthService';

export interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isGuest: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  convertGuestToUser: (username: string, password: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Compute isGuest from user state
  const isGuest = user?.isGuest ?? false;

  // Load user from AsyncStorage on mount
  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    const loggedInUser = await AuthService.login(username, password);
    setUser(loggedInUser);
  };

  const signup = async (username: string, password: string) => {
    const newUser = await AuthService.signup(username, password);
    setUser(newUser);
  };

  const logout = async () => {
    await AuthService.logout();
    setUser(null);
  };

  const continueAsGuest = async () => {
    const guestUser = await AuthService.createGuestUser();
    setUser(guestUser);
  };

  const convertGuestToUser = async (username: string, password: string) => {
    const convertedUser = await AuthService.convertGuestToUser(username, password);
    setUser(convertedUser);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isGuest, login, signup, logout, continueAsGuest, convertGuestToUser }}>
      {children}
    </AuthContext.Provider>
  );
}
