import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function OrgLoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [step, setStep]         = useState(1);
  const [form, setForm]         = useState({ username: "", password: "" });
  const [otpCode, setOtpCode]   = useState("");
  const [adminId, setAdminId]   = useState("");
  const [orgName, setOrgName]   = useState("");
  const [otpMsg, setOtpMsg]     = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleStep1 = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:8000"}/api/org/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Login failed.");
      setAdminId(data.org_admin_id);
      setOrgName(data.org_name);
      setOtpMsg(data.message);
      setStep(2);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleStep2 = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:8000"}/api/org/login/otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_admin_id: adminId, otp_code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Invalid code.");
      login(data.access_token, {
        user_id:   data.org_admin_id,
        full_name: data.full_name,
        role:      "election_admin",
        org_id:    data.org_id,
        org_name:  data.org_name,
        is_owner:  data.is_owner,
      });
      navigate("/admin");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, var(--navy) 0%, #1251A3 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{ width: 52, height: 52, background: "rgba(255,255,255,0.12)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 0.75rem", border: "1px solid rgba(255,255,255,0.2)" }}>🗳️</div>
          <div style={{ color: "#fff", fontSize: "1.375rem", fontWeight: 800 }}>Admin Sign In</div>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8125rem", marginTop: 4 }}>
            {step === 2 ? orgName : "VoteSecure Organisation Portal"}
          </div>
        </div>

        <div className="card animate-in" style={{ overflow: "hidden" }}>
          <div style={{ padding: "0 1.75rem", paddingTop: "1.25rem" }}>
            <div style={{ display: "flex", gap: 6, marginBottom: "1.25rem" }}>
              {[1, 2].map(n => (
                <div key={n} style={{ flex: 1, height: 3, borderRadius: 999, background: step >= n ? "var(--blue)" : "var(--border)", transition: "background 0.3s" }} />
              ))}
            </div>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--slate)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Step {step} of 2 - {step === 1 ? "Credentials" : "Email Verification"}
            </div>
          </div>

          <div style={{ padding: "1.25rem 1.75rem 1.75rem" }}>
            {step === 1 && (
              <form onSubmit={handleStep1} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label className="input-label">Username</label>
                  <input className="input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="Your admin username" required />
                </div>
                <div>
                  <label className="input-label">Password</label>
                  <input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Your password" required />
                </div>
                <button type="submit" disabled={loading} className="btn btn-navy btn-lg" style={{ marginTop: "0.25rem", minHeight: "44px" }}>
                  {loading ? "Verifying..." : "Continue"}
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleStep2} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="alert alert-info" style={{ borderRadius: 8 }}>
                  <span>📧</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>Check your email</div>
                    <div style={{ fontSize: "0.8125rem" }}>{otpMsg}</div>
                  </div>
                </div>
                <div>
                  <label className="input-label">6-Digit Verification Code</label>
                  <input
                    className="input text-mono"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    maxLength={6}
                    required
                    style={{ textAlign: "center", fontSize: "2rem", letterSpacing: "0.4em", padding: "0.875rem" }}
                  />
                </div>
                <button type="submit" disabled={loading || otpCode.length !== 6} className="btn btn-success btn-lg" style={{ minHeight: "44px" }}>
                  {loading ? "Verifying..." : "Sign In"}
                </button>
                <button type="button" onClick={() => { setStep(1); setError(""); setOtpCode(""); }} className="btn btn-ghost" style={{ alignSelf: "center", fontSize: "0.8125rem", minHeight: "44px" }}>
                  Back
                </button>
              </form>
            )}

            {error && (
              <div className="alert alert-error animate-in" style={{ marginTop: "1rem", borderRadius: 8 }}>
                <span>⚠</span> {error}
              </div>
            )}

            <div className="divider" style={{ margin: "1.25rem 0 0.75rem" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
              <Link to="/login" style={{ color: "var(--slate)", textDecoration: "none" }}>Voter login</Link>
              <Link to="/org/signup" style={{ color: "var(--blue)", fontWeight: 600, textDecoration: "none" }}>Create organisation</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
