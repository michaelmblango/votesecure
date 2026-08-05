import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute   from "./components/ProtectedRoute";
import Navbar           from "./components/Navbar";
import LoadingSpinner   from "./components/LoadingSpinner";

import LoginPage        from "./pages/LoginPage";
import AdminDashboard   from "./pages/AdminDashboard";
import ElectionSetup    from "./pages/ElectionSetup";
import BallotPage       from "./pages/BallotPage";
import ResultsPage      from "./pages/ResultsPage";
import AuditLogPage     from "./pages/AuditLogPage";
import VerifyVotePage   from "./pages/VerifyVotePage";
import NotFound         from "./pages/NotFound";

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner message="Loading VoteSecure..." />;

  return (
    <div className="app-shell">
      {user && <Navbar />}
      <main className="app-main">
        <Routes>
          {/* ── Public ── */}
          <Route path="/login" element={
            user
              ? <Navigate to={user.role === "voter" ? "/ballot" : "/admin"} replace/>
              : <LoginPage />
          }/>
          {/* Verify is public - no login needed */}
          <Route path="/verify" element={<VerifyVotePage />} />

          {/* ── Voter ── */}
          <Route path="/ballot" element={
            <ProtectedRoute><BallotPage /></ProtectedRoute>
          }/>

          {/* ── Shared ── */}
          <Route path="/results" element={
            <ProtectedRoute><ResultsPage /></ProtectedRoute>
          }/>

          {/* ── Admin ── */}
          <Route path="/admin" element={
            <ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>
          }/>
          <Route path="/admin/elections/:id" element={
            <ProtectedRoute adminOnly><ElectionSetup /></ProtectedRoute>
          }/>
          <Route path="/admin/audit" element={
            <ProtectedRoute adminOnly><AuditLogPage /></ProtectedRoute>
          }/>

          {/* ── Default ── */}
          <Route path="/" element={
            <Navigate to={
              user
                ? user.role === "voter" ? "/ballot" : "/admin"
                : "/login"
            } replace/>
          }/>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: "1px solid var(--border)",
        background: "#fff",
        padding: "1.25rem 1.5rem",
        textAlign: "center",
        marginTop: "auto",
      }}>
        <p style={{ fontSize: "0.8125rem", color: "var(--slate)", margin: 0 }}>
          VoteSecure · AI Professional College · Department of Computer Science · 2025/2026
        </p>
        <p style={{ fontSize: "0.75rem", color: "#CBD5E1", margin: "0.25rem 0 0" }}>
          Secure · Transparent · Auditable
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}