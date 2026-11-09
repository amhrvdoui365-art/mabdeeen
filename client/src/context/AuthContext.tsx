import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi, type GoogleProfileCompletionPayload, type LoginPayload, type RegisterPayload } from '@/services/auth.service';
import { tokenStorage } from '@/services/api';
import type { AuthUser } from '@/types';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  completeOAuthLogin: (token: string) => Promise<AuthUser>;
  completeGoogleProfile: (payload: GoogleProfileCompletionPayload) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(tokenStorage.get()));

  useEffect(() => {
    const token = tokenStorage.get();

    if (!token) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    authApi
      .me()
      .then((currentUser) => {
        if (!cancelled) {
          setUser(currentUser);
        }
      })
      .catch(() => {
        if (!cancelled) {
          tokenStorage.clear();
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      queryClient.clear();
      setUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [queryClient]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const result = await authApi.login(payload);
      queryClient.clear();
      tokenStorage.set(result.token);
      setUser(result.user);
      return result.user;
    },
    [queryClient],
  );

  const completeOAuthLogin = useCallback(async (token: string) => {
    tokenStorage.set(token);
    queryClient.clear();
    try {
      const currentUser = await authApi.me();
      setUser(currentUser);
      return currentUser;
    } catch (error) {
      tokenStorage.clear();
      setUser(null);
      throw error;
    }
  }, [queryClient]);

  const completeGoogleProfile = useCallback(async (payload: GoogleProfileCompletionPayload) => {
    const updatedUser = await authApi.completeGoogleProfile(payload);
    queryClient.clear();
    setUser(updatedUser);
    return updatedUser;
  }, [queryClient]);

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const result = await authApi.register(payload);
      queryClient.clear();
      tokenStorage.set(result.token);
      setUser(result.user);
      return result.user;
    },
    [queryClient],
  );

  const logout = useCallback(() => {
    tokenStorage.clear();
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    if (!tokenStorage.get()) {
      setUser(null);
      return;
    }

    const currentUser = await authApi.me();
    setUser(currentUser);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, completeOAuthLogin, completeGoogleProfile, register, logout, refreshUser }),
    [user, isLoading, login, completeOAuthLogin, completeGoogleProfile, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};
