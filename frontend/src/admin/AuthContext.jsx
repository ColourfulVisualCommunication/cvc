import { createContext, useContext, useEffect, useState } from "react";

import { me as fetchMe, login as apiLogin, setToken, clearToken, getToken } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    fetchMe()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const { access_token, ...account } = await apiLogin(email, password);
    setToken(access_token);
    setUser(account);
    return account;
  }

  function logout() {
    // Stateless JWT — nothing to invalidate server-side, this just forgets
    // the token client-side. Fine for a single trusted admin account.
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
