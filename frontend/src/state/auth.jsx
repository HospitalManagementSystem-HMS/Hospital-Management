import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { clearToken, getToken, setToken } from "../lib/authStorage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getToken());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refreshMe() {
    const t = getToken();
    if (!t) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const resp = await api.get("/auth/me");
      setUser(resp.data.user);
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setTokenState(getToken());
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login({ email, password }) {
    const resp = await api.post("/auth/login", { email, password });
    setToken(resp.data.token);
    setTokenState(resp.data.token);
    setUser(resp.data.user);
  }

  async function register({ email, password, name }) {
    const resp = await api.post("/auth/register", { email, password, name });
    setToken(resp.data.token);
    setTokenState(resp.data.token);
    setUser(resp.data.user);
  }

  function logout() {
    clearToken();
    setTokenState("");
    setUser(null);
  }

  const value = useMemo(
    () => ({ token, user, loading, login, register, logout, refreshMe }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

