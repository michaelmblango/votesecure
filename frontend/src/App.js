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
    <div className="min-h-screen flex flex-col bg-gray-50">
      {user && <Navbar />}
      <main className="flex-1">
        <Routes>
          {/* ── Public ── */}
          <Route path="/login" element={
            user
              ? <Navigate to={user.role === "voter" ? "/ballot" : "/admin"} replace/>
              : <LoginPage />
          }/>
          {/* Verify is public — no login needed */}
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
      <footer className="bg-navy text-center py-4 mt-8">
        <p className="text-blue-400 text-xs">
          VoteSecure · AI Professional College · Department of Computer Science
        </p>
        <p className="text-blue-600 text-xs mt-0.5">
          Final Year Project 2024/2025 · Secure · Transparent · Auditable
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