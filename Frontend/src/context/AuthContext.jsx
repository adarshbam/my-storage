import { createContext, useContext, useState, useEffect } from "react";
import { getUser } from "../lib/utils";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      await getUser(setUser);
      setLoading(false);
    }
    loadUser();

    // Listen for real-time subscription & profile updates
    const handleRefresh = () => {
      getUser(setUser);
    };
    window.addEventListener("subscription:updated", handleRefresh);
    window.addEventListener("auth:refresh", handleRefresh);

    return () => {
      window.removeEventListener("subscription:updated", handleRefresh);
      window.removeEventListener("auth:refresh", handleRefresh);
    };
  }, []);

  console.log(user?.role);

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
