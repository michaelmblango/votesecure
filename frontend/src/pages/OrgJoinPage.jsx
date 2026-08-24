import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import PasswordInput from "../components/PasswordInput";

export default function OrgJoinPage() {
  const { invite_code } = useParams();
  const [form, setForm]     = useState({ full_name: "", username: "", password: "", email: "" });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [result, setResult]   = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }
    if (form.password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:8000"}/api/org/join/${invite_code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Join failed.");
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--ice)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
        <div style={{ width: "100%", maxWidth: 460 }}>
          <div className="card animate-in" style={{ overflow: "hidden" }}>
            <div style={{ background: result.org_active ? "var(--confirm)" : "var(--blue)", padding: "2.5rem 2rem", textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>{result.org_active ? "🎉" : "✓"}</div>
              <h2 style={{ color: "#fff", fontWeight: 800, fontSize: "1.375rem", margin: "0 0 0.5rem" }}>
                {result.org_active ? "Organisation is now active!" : "You have joined successfully"}
              </h2>
              <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.9rem", margin: 0 }}>
                {result.org_active
                  ? `All ${result.admin_count} admins have joined. Check your email — everyone has been notified.`
                  : `${result.admin_count} of 3 admins have joined. One more needed to activate the account.`
                }
              </p>
            </div>
            <div style={{ padding: "1.75rem", textAlign: "center" }}>
              <div className="alert alert-info" style={{ borderRadius: 8, marginBottom: "1.5rem", textAlign: "left" }}>
                <span>📧</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>Check your email</div>
                  <div style={{ fontSize: "0.8125rem" }}>Your login credentials have been sent to your registered email address.</div>
                </div>
              </div>
              <Link to="/org/login" style={{ display: "block", padding: "0.875rem", background: "var(--navy)", color: "#fff", fontWeight: 700, borderRadius: 8, textDecoration: "none" }}>
                Go to Admin Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, var(--navy) 0%, #1251A3 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{ width: 52, height: 52, background: "rgba(255,255,255,0.12)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 0.75rem", border: "1px solid rgba(255,255,255,0.2)" }}>🗳️</div>
          <div style={{ color: "#fff", fontSize: "1.375rem", fontWeight: 800 }}>Join your organisation</div>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8125rem", marginTop: 4 }}>
            Invite code: <span style={{ fontFamily: "monospace", color: "#fff", fontWeight: 700 }}>{invite_code}</span>
          </div>
        </div>

        <div className="card animate-in" style={{ padding: "2rem" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label className="input-label">Full Name *</label>
              <input className="input" value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder="Your full name" required />
            </div>
            <div>
              <label className="input-label">Username *</label>
              <input className="input" value={form.username} onChange={e => set("username", e.target.value)} placeholder="Choose a unique username" required />
            </div>
            <PasswordInput
              label="Password"
              value={form.password}
              onChange={e => set("password", e.target.value)}
              placeholder="Min. 8 characters"
              required
              showStrength
            />
            <PasswordInput
              label="Confirm Password"
              name="confirm_password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
            />
            <div>
              <label className="input-label">Email Address *</label>
              <input className="input" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="Your email for OTP login" required />
              <div style={{ fontSize: "0.75rem", color: "var(--slate)", marginTop: "0.375rem" }}>
                Your credentials will be emailed here. You will need them every time you log in.
              </div>
            </div>

            {error && (
              <div className="alert alert-error animate-in" style={{ borderRadius: 8 }}>
                <span>⚠</span> {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-navy btn-lg">
              {loading ? "Joining..." : "Join Organisation"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
