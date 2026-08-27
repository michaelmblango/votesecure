import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
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
import ApprovalsPage    from "./pages/ApprovalsPage";
import VoterRegisterPage   from "./pages/VoterRegisterPage";
import VoterManagementPage from "./pages/VoterManagementPage";
import PaymentHistoryPage  from "./pages/PaymentHistoryPage";
import VerifyVotePage   from "./pages/VerifyVotePage";
import NotFound         from "./pages/NotFound";
import LandingPage      from "./pages/LandingPage";
import PricingPage      from "./pages/PricingPage";
import OrgSignupPage    from "./pages/OrgSignupPage";
import OrgJoinPage      from "./pages/OrgJoinPage";
import OrgLoginPage     from "./pages/OrgLoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage  from "./pages/ResetPasswordPage";
import SuperLoginPage   from "./pages/SuperAdmin/SuperLoginPage";
import SuperDashboard   from "./pages/SuperAdmin/SuperDashboard";
import PublicResultsPage from "./pages/PublicResultsPage";
import CandidateProfilePage from "./pages/CandidateProfilePage";

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner message="Loading VoteSecure..." />;

  return (
    <div className="app-shell">
      <Navbar />
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
          {/* Voter self-registration - no ProtectedRoute, voters access
              this before they have an account */}
          <Route path="/voter/register/:code" element={<VoterRegisterPage />} />

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
          <Route path="/admin/approvals" element={
            <ProtectedRoute adminOnly><ApprovalsPage /></ProtectedRoute>
          }/>
          <Route path="/admin/voters" element={
            <ProtectedRoute adminOnly><VoterManagementPage /></ProtectedRoute>
          }/>
          <Route path="/admin/billing" element={
            <ProtectedRoute adminOnly><PaymentHistoryPage /></ProtectedRoute>
          }/>

          {/* ── Organisation / SaaS ── */}
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/org/signup" element={<OrgSignupPage />} />
          <Route path="/org/join/:invite_code" element={<OrgJoinPage />} />
          <Route path="/org/login" element={<OrgLoginPage />} />
          <Route path="/org/forgot-password"       element={<ForgotPasswordPage />} />
          <Route path="/org/reset-password/:token" element={<ResetPasswordPage />} />

          {/* ── Default ── */}
          <Route path="/" element={
            user
              ? <Navigate to={user.role === "voter" ? "/ballot" : "/admin"} replace/>
              : <LandingPage />
          }/>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {/* ── Footer ── */}
      {/* LandingPage has its own dark footer built in, so the shared
          footer here only shows for logged-in users on their pages. */}
      {user && (
        <footer style={{
          borderTop: "1px solid var(--border)",
          background: "#fff",
          padding: "1.25rem 1.5rem",
          textAlign: "center",
          marginTop: "auto",
        }}>
          <p style={{ fontSize: "0.8125rem", color: "var(--slate)", margin: 0 }}>
            VoteSecure · AI Professional College · Department of Computer Science · 2025/2026
            <Link to="/pricing" style={{ color: "#94A3B8", fontSize: "0.8125rem", textDecoration: "none", marginLeft: "1rem" }}>Pricing</Link>
            <Link to="/org/signup" style={{ color: "#94A3B8", fontSize: "0.8125rem", textDecoration: "none", marginLeft: "1rem" }}>Create Organisation</Link>
          </p>
          <p style={{ fontSize: "0.75rem", color: "#CBD5E1", margin: "0.25rem 0 0" }}>
            Secure · Transparent · Auditable
          </p>
        </footer>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Super admin routes render standalone - no shared public Navbar/footer */}
          <Route path="/super/login"     element={<SuperLoginPage />} />
          <Route path="/super/dashboard" element={<SuperDashboard />} />
          {/* Public results share page - standalone, no navbar/footer, no auth */}
          <Route path="/results/public/:election_id" element={<PublicResultsPage />} />
          {/* Public candidate profile page - standalone, no navbar/footer, no auth */}
          <Route path="/candidates/:candidate_id" element={<CandidateProfilePage />} />
          <Route path="/*" element={<AppRoutes />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}