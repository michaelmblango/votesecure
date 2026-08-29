// Wraps pages that require login.
// Redirects to /login if no user is found.
// Redirects to /ballot if a non-admin (voter or candidate) tries
// to access admin pages.

import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "./LoadingSpinner";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner message="Checking session..." />;
  if (!user)   return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "election_admin" && user.role !== "system_admin") {
    return <Navigate to="/ballot" replace />;
  }

  return children;
}