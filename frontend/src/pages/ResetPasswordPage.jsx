import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PasswordInput from "../components/PasswordInput";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function ResetPasswordPage() {
  const { token }   = useParams();
  const navigate    = useNavigate();
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [done,      setDone]      = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setError(""); setLoading(true);
    try {
      const res  = await fetch(`${API}/api/org/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Reset failed.");
      setDone(true);
      setTimeout(() => navigate("/org/login"), 3000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, var(--navy) 0%, #1251A3 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{ width: 52, height: 52, background: "rgba(255,255,255,0.12)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 0.75rem", border: "1px solid rgba(255,255,255,0.2)" }}>🔒</div>
          <div style={{ color: "#fff", fontSize: "1.375rem", fontWeight: 800 }}>Set New Password</div>
        </div>
        <div className="card animate-in" style={{ padding: "2rem" }}>
          {done ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✓</div>
              <div style={{ fontWeight: 700, color: "var(--confirm)", marginBottom: "0.5rem" }}>Password reset successfully</div>
              <p style={{ color: "var(--slate)", fontSize: "0.875rem" }}>Redirecting you to login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <PasswordInput
                label="New Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                showStrength
              />
              <PasswordInput
                label="Confirm New Password"
                name="confirm"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Re-enter new password"
                required
              />
              {error && <div className="alert alert-error" style={{ borderRadius: 8 }}><span>⚠</span> {error}</div>}
              <button type="submit" className="btn btn-success btn-lg" disabled={loading || !password || !confirm}>
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
