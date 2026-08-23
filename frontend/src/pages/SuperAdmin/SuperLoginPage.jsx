import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function SuperLoginPage() {
  const navigate = useNavigate();
  const [form, setForm]     = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res  = await fetch(`${API}/api/super/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Login failed.");
      localStorage.setItem("vs_super_token", data.access_token);
      navigate("/super/dashboard");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0A0F1E 0%, #0D2B55 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ width: 56, height: 56, background: "rgba(255,255,255,0.08)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 1rem", border: "1px solid rgba(255,255,255,0.15)" }}>🛡️</div>
          <div style={{ color: "#fff", fontSize: "1.375rem", fontWeight: 800 }}>Platform Admin</div>
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.8125rem", marginTop: 4 }}>VoteSecure Super Admin Portal</div>
        </div>
        <div className="card animate-in" style={{ padding: "2rem" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label className="input-label">Username</label>
              <input className="input" value={form.username} onChange={e => setForm(f => ({...f, username: e.target.value}))} required />
            </div>
            <div>
              <label className="input-label">Password</label>
              <input className="input" type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} required />
            </div>
            {error && <div className="alert alert-error" style={{ borderRadius: 8 }}><span>⚠</span> {error}</div>}
            <button type="submit" className="btn btn-navy btn-lg" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
