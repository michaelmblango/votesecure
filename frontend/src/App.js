import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import LoadingSpinner from "./components/LoadingSpinner";

// Pages
import LoginPage      from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import ElectionSetup  from "./pages/ElectionSetup";
import BallotPage     from "./pages/BallotPage";
import ResultsPage    from "./pages/ResultsPage";
import NotFound       from "./pages/NotFound";

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner message="Loading VoteSecure..." />;

  return (
    <div className="min-h-screen flex flex-col">
      {user && <Navbar />}
      <main className="flex-1">
        <Routes>
          {/* Public */}
          <Route path="/login" element={
            user ? <Navigate to={user.role === "voter" ? "/ballot" : "/admin"} replace />
                 : <LoginPage />
          } />

          {/* Voter routes */}
          <Route path="/ballot" element={
            <ProtectedRoute><BallotPage /></ProtectedRoute>
          } />

          {/* Admin routes */}
          <Route path="/admin" element={
            <ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/admin/elections/:id" element={
            <ProtectedRoute adminOnly><ElectionSetup /></ProtectedRoute>
          } />

          {/* Shared */}
          <Route path="/results" element={
            <ProtectedRoute><ResultsPage /></ProtectedRoute>
          } />

          {/* Default redirect */}
          <Route path="/" element={
            <Navigate to={user
              ? (user.role === "voter" ? "/ballot" : "/admin")
              : "/login"
            } replace />
          } />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
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