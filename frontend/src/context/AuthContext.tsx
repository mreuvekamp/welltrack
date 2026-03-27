import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import api, { setTokens, clearTokens, hasAccessToken } from '@/services/api';
import type { User, AuthResponse } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Provides authentication state and actions to the component tree.
 * On mount, checks for existing access token and fetches the user profile.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /** Fetch the current user profile from the API */
  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get<{ user: User }>('/users/me');
      setUser(response.data.user);
    } catch {
      setUser(null);
      clearTokens();
    }
  }, []);

  // On mount, check if we have a stored token and fetch the user profile
  useEffect(() => {
    async function init() {
      if (hasAccessToken()) {
        await refreshUser();
      }
      setLoading(false);
    }
    init();
  }, [refreshUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await api.post<AuthResponse>('/auth/login', {
        email,
        password,
      });
      const { user: userData, accessToken, refreshToken } = response.data;
      setTokens(accessToken, refreshToken);
      setUser(userData);
    },
    [],
  );

  const register = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const response = await api.post<AuthResponse>('/auth/register', {
        email,
        password,
        display_name: displayName,
      });
      const { user: userData, accessToken, refreshToken } = response.data;
      setTokens(accessToken, refreshToken);
      setUser(userData);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('welltrack_refresh_token');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Logout should succeed even if the API call fails
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access authentication state and actions.
 * Must be used within an AuthProvider.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
