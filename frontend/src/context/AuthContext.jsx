// frontend/src/context/AuthContext.jsx
// Global auth state - available to every component in the app
// Stores: current user, login function, logout function

import { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);  // true while checking saved token

  // On app load: check if a valid token already exists in localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem("vs_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("vs_user");
        localStorage.removeItem("vs_token");
      }
    }
    setLoading(false);
  }, []);

  // Called after successful OTP verification
  const login = (token, userData) => {
    localStorage.setItem("vs_token", token);
    localStorage.setItem("vs_user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    try { await authAPI.logout(); } catch {}
    localStorage.removeItem("vs_token");
    localStorage.removeItem("vs_user");
    setUser(null);
  };

  const isAdmin = user?.role === "system_admin" || user?.role === "election_admin";
  const isVoter = user?.role === "voter";

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin, isVoter }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook - any component calls: const { user, logout } = useAuth();
export const useAuth = () => useContext(AuthContext);