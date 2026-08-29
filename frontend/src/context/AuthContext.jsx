import { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("vs_user");
    if (savedUser) {
      try { setUser(JSON.parse(savedUser)); }
      catch { localStorage.removeItem("vs_user"); localStorage.removeItem("vs_token"); }
    }
    setLoading(false);
  }, []);

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

  // Role helpers
  const isVoter    = user?.role === "voter";
  const isOrgAdmin = user?.role === "election_admin" || user?.role === "system_admin";
  const isAdmin    = isOrgAdmin;
  const isOwner    = user?.is_owner === true;

  const permissions = {
    canCreateElections:   user?.is_owner === true,
    canInviteVoters:      user?.is_owner === true,
    canInviteCandidates:  user?.is_owner === true,
    canApproveVoters:     !!user,
    canApproveCandidates: !!user,
    canViewAuditLog:      !!user,
    canViewResults:       !!user,
  };

  return (
    <AuthContext.Provider value={{
      user, login, logout, loading,
      isAdmin, isVoter, isOrgAdmin, isOwner,
      permissions,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
