// app/(auth)/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginUser, registerUser, refreshUserToken, getUserProfile } from './api';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

interface AuthContextType {
  user: any | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: { username: string; email: string; password: string; bio?: string }) => Promise<void>;
  loginWithTokens: (access: string, refresh: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('access_token');
        const storedRefresh = await AsyncStorage.getItem('refresh_token');

        // 1) Try current access token
        if (storedToken) {
          try {
            setToken(storedToken);
            const profile = await getUserProfile(storedToken);
            setUser(profile);
            return; // success
          } catch (err: any) {
            // fall through to refresh flow
            console.log('Access token invalid, attempting refresh...', err);
          }
        }

        // 2) Try to refresh using refresh token
        if (storedRefresh) {
          try {
            const data = await refreshUserToken(storedRefresh);
            const newAccess = data?.access;
            if (newAccess) {
              await AsyncStorage.setItem('access_token', newAccess);
              setToken(newAccess);
              const profile = await getUserProfile(newAccess);
              setUser(profile);
              return; // success
            }
          } catch (err) {
            console.error('Refresh token flow failed:', err);
          }
        }

        // 3) If all fails, logout
        await logout();
      } catch (error) {
        console.error('Token validation failed unexpectedly:', error);
        await logout();
      } finally {
        setLoading(false);
      }
    };
    checkToken();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const data = await loginUser({ email, password });
      await AsyncStorage.setItem('access_token', data.access);
      await AsyncStorage.setItem('refresh_token', data.refresh);
      setToken(data.access);
      // Fetch fresh profile (ensures latest avatar URL fields)
      const profile = await getUserProfile(data.access);
      setUser(profile);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (userData: { username: string; email: string; password: string; bio?: string }) => {
    try {
      const data = await registerUser(userData);
      await AsyncStorage.setItem('access_token', data.access);
      await AsyncStorage.setItem('refresh_token', data.refresh);
      setToken(data.access);
      const profile = await getUserProfile(data.access);
      setUser(profile);
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  };

  const loginWithTokens = async (access: string, refresh: string) => {
    try {
      await AsyncStorage.setItem('access_token', access);
      await AsyncStorage.setItem('refresh_token', refresh);
      setToken(access);
      const profile = await getUserProfile(access);
      setUser(profile);
    } catch (error) {
      console.error('Login with tokens error:', error);
      throw error;
    }
  };

  const logout = async () => {
    // Clear app tokens
    await AsyncStorage.removeItem('access_token');
    await AsyncStorage.removeItem('refresh_token');

    // Proactively sign out from Google so the next login shows the account chooser
    try {
      await GoogleSignin.signOut();
    } catch (err) {
      console.warn('Google signOut failed (safe to ignore if not signed in):', err);
    }

    // Optional: revoke access to ensure full disconnect (ignore errors)
    try {
      await GoogleSignin.revokeAccess();
    } catch {}

    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, loginWithTokens, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
