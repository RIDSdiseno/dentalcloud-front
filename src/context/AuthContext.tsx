import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api, setAccessToken } from '../api/client';
import type { ClinicaModules } from '../api/clinicas';

export type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  clinicaId: string | null;
  clinicaModules: ClinicaModules | null;
  clinicaTipo: string | null;
  clinicaName: string | null;
  clinicaLogoUrl: string | null;
  rxEnabled: boolean | null;
  slotDurationMinutes: number | null;
  permissions: Record<string, boolean> | null;
};

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const authenticatedRef = useRef(false);

  useEffect(() => {
    api
      .post('/auth/refresh')
      .then(({ data }) => {
        if (authenticatedRef.current) return;
        setAccessToken(data.accessToken);
        setUser(data.user);
      })
      .catch(() => {
        if (authenticatedRef.current) return;
        setAccessToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password });
    authenticatedRef.current = true;
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user as User;
  }

  async function logout() {
    await api.post('/auth/logout').catch(() => {});
    setAccessToken(null);
    setUser(null);
  }

  function updateUser(patch: Partial<User>) {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
