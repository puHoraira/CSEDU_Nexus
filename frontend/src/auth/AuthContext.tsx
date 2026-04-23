import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest, ApiUser, AuthPayload, getAuthTokenEventName, setApiAccessToken } from "../lib/api";

type RegisterInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  studentId: string;
  batch: number;
  currentYear: number;
  experience?: string;
};

type RegisterTeacherInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  designation: string;
  phone?: string;
  experience?: string;
};

type AuthContextValue = {
  user: ApiUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  registerTeacher: (input: RegisterTeacherInput) => Promise<void>;
  setUserProfile: (nextUser: ApiUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const storageKey = "csedu_nexus_auth";

function readStoredAuth(): { user: ApiUser | null; token: string | null } {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { user: null, token: null };
    return JSON.parse(raw) as { user: ApiUser | null; token: string | null };
  } catch {
    return { user: null, token: null };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = readStoredAuth();
    setUser(stored.user);
    setToken(stored.token);
    setApiAccessToken(stored.token);
    setLoading(false);
  }, []);

  useEffect(() => {
    setApiAccessToken(token);
  }, [token]);

  useEffect(() => {
    function handleTokenRefreshed(event: Event) {
      const custom = event as CustomEvent<{ token: string | null }>;
      const nextToken = custom.detail?.token || null;
      setToken(nextToken);
      if (!nextToken) {
        setUser(null);
      }
    }

    const eventName = getAuthTokenEventName();
    window.addEventListener(eventName, handleTokenRefreshed as EventListener);

    return () => {
      window.removeEventListener(eventName, handleTokenRefreshed as EventListener);
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    localStorage.setItem(storageKey, JSON.stringify({ user, token }));
  }, [loading, user, token]);

  async function applyAuth(result: AuthPayload) {
    setUser(result.user);
    setToken(result.accessToken);
  }

  async function login(email: string, password: string) {
    const result = await apiRequest<AuthPayload>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    await applyAuth(result);
  }

  async function register(input: RegisterInput) {
    const result = await apiRequest<AuthPayload>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
    await applyAuth(result);
  }

  async function registerTeacher(input: RegisterTeacherInput) {
    const result = await apiRequest<AuthPayload>("/auth/register-teacher", {
      method: "POST",
      body: JSON.stringify(input),
    });
    await applyAuth(result);
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem(storageKey);
  }

  function setUserProfile(nextUser: ApiUser) {
    setUser(nextUser);
  }

  const value = useMemo(
    () => ({ user, token, loading, login, register, registerTeacher, setUserProfile, logout }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
