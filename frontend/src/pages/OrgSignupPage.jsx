import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PasswordInput from "../components/PasswordInput";

export default function OrgSignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    org_name: "", full_name: "", username: "", password: "", email: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [result, setResult]     = useState(null);
  const [copied, setCopied]     = useState(false);

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
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:8000"}/api/org/signup`, {
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
    const inviteLink = `${window.location.origin}/org/join/${result.invite_code}`;

    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, var(--navy) 0%, #1251A3 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
        <div style={{ width: "100%", maxWidth: 520 }}>
          <div className="card animate-in" style={{ overflow: "hidden" }}>

            {/* Success header */}
            <div style={{ background: "var(--confirm)", padding: "2.5rem 2rem", textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>🎉</div>
              <h2 style={{ color: "#fff", fontWeight: 800, fontSize: "1.5rem", margin: "0 0 0.5rem" }}>
                Organisation created!
              </h2>
              <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.9375rem", margin: 0 }}>
                Invite {result.admins_needed} more administrator{result.admins_needed !== 1 ? "s" : ""} to activate your account
              </p>
            </div>

            <div style={{ padding: "2rem" }}>

              {/* Step indicator */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--confirm)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.875rem", flexShrink: 0 }}>1</div>
                <div style={{ flex: 1, height: 2, background: "var(--border)" }} />
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--border)", color: "var(--slate)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.875rem", flexShrink: 0 }}>2</div>
                <div style={{ flex: 1, height: 2, background: "var(--border)" }} />
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--border)", color: "var(--slate)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.875rem", flexShrink: 0 }}>3</div>
              </div>
              <p style={{ fontSize: "0.8125rem", color: "var(--slate)", marginBottom: "1.5rem" }}>
                You are Admin 1. Share the invite link below with 2 more administrators.
                Each admin clicks the link, creates their own account, and receives their own login credentials.
                Your account activates automatically when all 3 have joined.
              </p>

              {/* Invite link box */}
              <div style={{ marginBottom: "1.25rem" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--slate)", marginBottom: "0.5rem" }}>
                  Admin Invite Link
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "stretch" }}>
                  <div style={{ flex: 1, background: "var(--ice)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.75rem 1rem", fontFamily: "monospace", fontSize: "0.8125rem", color: "var(--ink)", wordBreak: "break-all", lineHeight: 1.5 }}>
                    {inviteLink}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(inviteLink);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2500);
                    }}
                    style={{ flexShrink: 0, padding: "0.75rem 1rem", background: copied ? "var(--confirm)" : "var(--navy)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.8125rem", transition: "background 0.2s", minWidth: 80 }}>
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--slate)", marginTop: "0.5rem" }}>
                  Share via WhatsApp, SMS, or email. The link works for all remaining admins.
                </p>
              </div>

              {/* Email check notice */}
              <div className="alert alert-info" style={{ borderRadius: 8, marginBottom: "1.5rem" }}>
                <span>📧</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>Check your email</div>
                  <div style={{ fontSize: "0.8125rem" }}>Your login credentials and this invite link have been sent to your email address.</div>
                </div>
              </div>

              <a
                href={`https://wa.me/?text=${encodeURIComponent("Join our VoteSecure organisation as an admin. Click this link to register: " + inviteLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "0.75rem", background: "#25D366", color: "#fff", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "1.125rem" }}>📱</span>
                Share via WhatsApp
              </a>

              <a
                href={`mailto:?subject=${encodeURIComponent("Join VoteSecure as Admin")}&body=${encodeURIComponent("You are invited to join our VoteSecure organisation as an administrator.\n\nClick this link to register:\n" + inviteLink + "\n\nYou will need to create your own username and password.")}`}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "0.75rem", background: "var(--ice)", border: "1px solid var(--border)", color: "var(--ink)", borderRadius: 8, textDecoration: "none", fontWeight: 600, fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                <span>✉️</span>
                Share via Email
              </a>

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
                Your login credentials will be sent here. Use an email you can always access.
              </div>
            </div>

            {error && (
              <div className="alert alert-error animate-in" style={{ borderRadius: 8 }}>
                <span>⚠</span> {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-navy btn-lg" style={{ marginTop: "0.25rem", minHeight: "44px" }}>
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
