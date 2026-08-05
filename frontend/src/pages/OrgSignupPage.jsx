import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function OrgSignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    org_name: "", full_name: "", username: "", password: "", email: "",
  });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [result, setResult]     = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/org/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Signup failed.");
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
        <div style={{ width: "100%", maxWidth: 520 }}>
          <div className="card animate-in" style={{ overflow: "hidden" }}>
            <div style={{ background: "var(--confirm)", padding: "2.5rem 2rem", textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>🎉</div>
              <h2 style={{ color: "#fff", fontWeight: 800, fontSize: "1.5rem", margin: "0 0 0.5rem" }}>
                Organisation created!
              </h2>
              <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.9375rem", margin: 0 }}>
                Check your email for your login credentials and invite code.
              </p>
            </div>
            <div style={{ padding: "2rem" }}>
              <div style={{ background: "var(--ice)", border: "1px solid var(--border)", borderRadius: 10, padding: "1.25rem", marginBottom: "1.5rem" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--slate)", marginBottom: "0.875rem" }}>
                  Your invite code
                </div>
                <div style={{ fontFamily: "monospace", fontSize: "1.5rem", fontWeight: 800, color: "var(--navy)", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>
                  {result.invite_code}
                </div>
                <p style={{ fontSize: "0.8125rem", color: "var(--slate)", margin: 0 }}>
                  Share this with {result.admins_needed} more administrator{result.admins_needed !== 1 ? "s" : ""}. They visit <strong>/org/join/{result.invite_code}</strong> to register. Your account activates when all 3 admins have joined.
                </p>
              </div>

              <div className="alert alert-info" style={{ borderRadius: 8, marginBottom: "1.5rem" }}>
                <span>📧</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>Check your email</div>
                  <div style={{ fontSize: "0.8125rem" }}>Your credentials and invite link have been sent to your registered email address.</div>
                </div>
              </div>

              <Link to="/org/login" style={{ display: "block", textAlign: "center", padding: "0.875rem", background: "var(--navy)", color: "#fff", fontWeight: 700, borderRadius: 8, textDecoration: "none", fontSize: "0.9375rem" }}>
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
      <div style={{ width: "100%", maxWidth: 480 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{ width: 52, height: 52, background: "rgba(255,255,255,0.12)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 0.75rem", border: "1px solid rgba(255,255,255,0.2)" }}>🗳️</div>
          <div style={{ color: "#fff", fontSize: "1.375rem", fontWeight: 800, letterSpacing: "-0.01em" }}>Create your organisation</div>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8125rem", marginTop: 4 }}>
            You will be the first admin. 2 more must join before the account activates.
          </div>
        </div>

        <div className="card animate-in" style={{ padding: "2rem" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            <div style={{ background: "var(--ice)", borderRadius: 10, padding: "1rem 1.125rem", borderLeft: "3px solid var(--blue)" }}>
              <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--blue)", marginBottom: "0.25rem" }}>Organisation details</div>
              <div style={{ fontSize: "0.8125rem", color: "var(--slate)" }}>Your organisation name appears on all election ballots and emails.</div>
            </div>

            <div>
              <label className="input-label">Organisation Name *</label>
              <input className="input" value={form.org_name} onChange={e => set("org_name", e.target.value)} placeholder="e.g. AI Professional College SRC" required />
            </div>

            <div style={{ height: 1, background: "var(--border)" }} />

            <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--slate)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Your admin account
            </div>

            <div>
              <label className="input-label">Full Name *</label>
              <input className="input" value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder="Your full name" required />
            </div>

            <div>
              <label className="input-label">Username *</label>
              <input className="input" value={form.username} onChange={e => set("username", e.target.value)} placeholder="Choose a username" required />
            </div>

            <div>
              <label className="input-label">Password *</label>
              <input className="input" type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Min. 8 characters" required minLength={8} />
            </div>

            <div>
              <label className="input-label">Email Address *</label>
              <input className="input" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="Your email for OTP login" required />
              <div style={{ fontSize: "0.75rem", color: "var(--slate)", marginTop: "0.375rem" }}>
                Your login credentials will be sent here. Use an email you can always access.
              </div>
            </div>

            {error && (
              <div className="alert alert-error animate-in" style={{ borderRadius: 8 }}>
                <span>⚠</span> {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-navy btn-lg" style={{ marginTop: "0.25rem" }}>
              {loading ? "Creating organisation..." : "Create Organisation"}
            </button>

            <div style={{ textAlign: "center", fontSize: "0.8125rem", color: "var(--slate)" }}>
              Already have an account?{" "}
              <Link to="/org/login" style={{ color: "var(--blue)", fontWeight: 600, textDecoration: "none" }}>
                Sign in
              </Link>
            </div>
          </form>
        </div>

        <div style={{ textAlign: "center", marginTop: "1.25rem" }}>
          <Link to="/pricing" style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8125rem", textDecoration: "none" }}>
            View pricing plans
          </Link>
        </div>
      </div>
    </div>
  );
}
