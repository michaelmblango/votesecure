import { useState } from "react";
import { Link } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res  = await fetch(`${API}/api/org/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed.");
      setDone(true);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, var(--navy) 0%, #1251A3 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{ width: 52, height: 52, background: "rgba(255,255,255,0.12)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 0.75rem", border: "1px solid rgba(255,255,255,0.2)" }}>🔑</div>
          <div style={{ color: "#fff", fontSize: "1.375rem", fontWeight: 800 }}>Reset Password</div>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8125rem", marginTop: 4 }}>
            Enter your admin email address
          </div>
        </div>
        <div className="card animate-in" style={{ padding: "2rem" }}>
          {done ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📧</div>
              <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: "0.5rem" }}>
                Check your email
              </div>
              <p style={{ color: "var(--slate)", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
                If an account exists for <strong>{email}</strong>, you will receive
                a password reset link shortly.
              </p>
              <Link to="/org/login" className="btn btn-navy" style={{ textDecoration: "none", display: "block", textAlign: "center" }}>
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label className="input-label">Email Address *</label>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Your admin email address"
                  required
                />
              </div>
              {error && <div className="alert alert-error" style={{ borderRadius: 8 }}><span>⚠</span> {error}</div>}
              <button type="submit" className="btn btn-navy btn-lg" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
              <Link to="/org/login" style={{ textAlign: "center", color: "var(--slate)", fontSize: "0.8125rem", textDecoration: "none" }}>
                Back to Login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
