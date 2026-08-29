import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import PasswordInput from "../components/PasswordInput";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function VoterRegisterPage() {
  const { code }      = useParams();
  const [invite,      setInvite]    = useState(null);
  const [step,        setStep]      = useState(1);
  const [form,        setForm]      = useState({
    username: "", password: "", full_name: "", department: "",
  });
  const [confirm,     setConfirm]   = useState("");
  const [loading,     setLoading]   = useState(true);
  const [submitting,  setSubmitting] = useState(false);
  const [error,       setError]     = useState("");
  const [done,        setDone]      = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    fetch(`${API}/api/voter-invites/register/${code}`)
      .then(r => r.json())
      .then(d => {
        if (d.detail) setError(d.detail);
        else setInvite(d);
      })
      .catch(() => setError("Failed to load invite."))
      .finally(() => setLoading(false));
  }, [code]);

  const handleStep1 = (e) => {
    e.preventDefault();
    if (!form.username.trim() || form.username.trim().length < 3) {
      setError("Username must be at least 3 characters."); return;
    }
    if (form.password !== confirm) {
      setError("Passwords do not match."); return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters."); return;
    }
    setError("");
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSubmitting(true);
    try {
      const res  = await fetch(
        `${API}/api/voter-invites/register/${code}`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            username:   form.username.trim(),
            password:   form.password,
            full_name:  form.full_name,
            department: form.department || null,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registration failed.");
      setDone(true);
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  background: "var(--ice)" }}>
      <div className="spinner" />
    </div>
  );

  if (error && !invite) return (
    <div style={{ minHeight: "100vh", background: "var(--ice)",
                  display: "flex", alignItems: "center",
                  justifyContent: "center", padding: "1.5rem" }}>
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>
          ⚠️
        </div>
        <h2 style={{ fontWeight: 800, color: "var(--ink)",
                     marginBottom: "0.5rem" }}>
          Invalid Invite Link
        </h2>
        <p style={{ color: "var(--slate)", marginBottom: "1.5rem",
                    lineHeight: 1.6 }}>
          {error}
        </p>
        <Link to="/" className="btn btn-navy"
              style={{ textDecoration: "none" }}>
          Go to VoteSecure
        </Link>
      </div>
    </div>
  );

  if (done) return (
    <div style={{ minHeight: "100vh", background: "var(--ice)",
                  display: "flex", alignItems: "center",
                  justifyContent: "center", padding: "1.5rem" }}>
      <div style={{ maxWidth: 480 }}>
        <div className="card animate-in"
             style={{ overflow: "hidden" }}>
          <div style={{ background: "var(--confirm)",
                        padding: "2.5rem 2rem",
                        textAlign: "center" }}>
            <div style={{ fontSize: "3rem",
                          marginBottom: "0.75rem" }}>✓</div>
            <h2 style={{ color: "#fff", fontWeight: 800,
                         fontSize: "1.5rem",
                         margin: "0 0 0.5rem" }}>
              Registration Complete!
            </h2>
            <p style={{ color: "rgba(255,255,255,0.85)",
                        margin: 0, fontSize: "0.9375rem" }}>
              Your account is pending approval
            </p>
          </div>
          <div style={{ padding: "2rem" }}>
            <div style={{
              background: "var(--ice)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "1.25rem",
              marginBottom: "1.5rem",
            }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            color: "var(--slate)",
                            marginBottom: "0.75rem" }}>
                Your username
              </div>
              <div style={{ fontFamily: "monospace",
                            fontSize: "1.25rem",
                            fontWeight: 800,
                            color: "var(--navy)" }}>
                {form.username}
              </div>
              <div style={{ fontSize: "0.8125rem",
                            color: "var(--slate)",
                            marginTop: "0.375rem" }}>
                Save this — you will need it to log in.
              </div>
            </div>

            <div className="alert alert-info"
                 style={{ borderRadius: 8, marginBottom: "1.5rem" }}>
              <span>📧</span>
              <div>
                <div style={{ fontWeight: 600,
                              fontSize: "0.875rem" }}>
                  Check your email
                </div>
                <div style={{ fontSize: "0.8125rem" }}>
                  The administrators of{" "}
                  <strong>{invite?.org_name}</strong> will
                  review your registration. Once approved you
                  will receive an email with your login
                  credentials.
                </div>
              </div>
            </div>

            <Link to="/login" className="btn btn-navy"
                  style={{ display: "block", textAlign: "center",
                           textDecoration: "none" }}>
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, var(--navy) 0%, #1251A3 100%)",
      display: "flex", alignItems: "center",
      justifyContent: "center", padding: "1.5rem",
    }}>
      <div style={{ width: "100%", maxWidth: 480 }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{
            width: 52, height: 52,
            background: "rgba(255,255,255,0.12)",
            borderRadius: 14,
            display: "flex", alignItems: "center",
            justifyContent: "center",
            fontSize: 24, margin: "0 auto 0.75rem",
            border: "1px solid rgba(255,255,255,0.2)",
          }}>🗳️</div>
          <div style={{ color: "#fff", fontSize: "1.375rem",
                        fontWeight: 800 }}>
            Voter Registration
          </div>
          <div style={{ color: "rgba(255,255,255,0.7)",
                        fontSize: "0.875rem", marginTop: 4 }}>
            {invite?.org_name}
          </div>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: 6,
                      marginBottom: "1.25rem" }}>
          {[1, 2].map(n => (
            <div key={n} style={{
              flex: 1, height: 3, borderRadius: 999,
              background: step >= n
                ? "#fff" : "rgba(255,255,255,0.2)",
              transition: "background 0.3s",
            }} />
          ))}
        </div>

        <div className="card animate-in"
             style={{ padding: "2rem" }}>

          {/* Email pre-fill notice */}
          <div className="alert alert-info"
               style={{ borderRadius: 8, marginBottom: "1.5rem" }}>
            <span>📧</span>
            <div style={{ fontSize: "0.8125rem" }}>
              Registering with email:{" "}
              <strong>{invite?.email}</strong>
            </div>
          </div>

          {/* Step 1: Username + password */}
          {step === 1 && (
            <form onSubmit={handleStep1}
                  style={{ display: "flex",
                           flexDirection: "column",
                           gap: "1rem" }}>
              <div style={{
                fontSize: "0.75rem", fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--slate)",
              }}>
                Step 1 of 2 — Create your login credentials
              </div>

              <div>
                <label className="input-label">
                  Choose a Username *
                </label>
                <input
                  className="input"
                  value={form.username}
                  onChange={e => set("username",
                    e.target.value.toLowerCase().trim())}
                  placeholder="e.g. john.doe or j.doe99"
                  required
                />
                <div style={{ fontSize: "0.75rem",
                              color: "var(--slate)",
                              marginTop: "0.375rem" }}>
                  You will use this to log in. Letters, numbers,
                  dots and underscores only.
                </div>
              </div>

              <PasswordInput
                label="Choose a Password"
                value={form.password}
                onChange={e => set("password", e.target.value)}
                placeholder="Min. 8 characters"
                required
                showStrength
              />

              <PasswordInput
                label="Confirm Password"
                name="confirm"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Re-enter your password"
                required
              />

              {error && (
                <div className="alert alert-error animate-in"
                     style={{ borderRadius: 8 }}>
                  <span>⚠</span> {error}
                </div>
              )}

              <button type="submit"
                      className="btn btn-navy btn-lg">
                Continue →
              </button>
            </form>
          )}

          {/* Step 2: Name + department */}
          {step === 2 && (
            <form onSubmit={handleSubmit}
                  style={{ display: "flex",
                           flexDirection: "column",
                           gap: "1rem" }}>
              <div style={{
                fontSize: "0.75rem", fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--slate)",
              }}>
                Step 2 of 2 — Your details
              </div>

              <div>
                <label className="input-label">Full Name *</label>
                <input
                  className="input"
                  value={form.full_name}
                  onChange={e => set("full_name", e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </div>

              <div>
                <label className="input-label">
                  Department / Faculty
                </label>
                <input
                  className="input"
                  value={form.department}
                  onChange={e => set("department", e.target.value)}
                  placeholder="e.g. Computer Science (optional)"
                />
              </div>

              {error && (
                <div className="alert alert-error animate-in"
                     style={{ borderRadius: 8 }}>
                  <span>⚠</span> {error}
                </div>
              )}

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ flex: 1 }}
                  onClick={() => { setStep(1); setError(""); }}>
                  Back
                </button>
                <button
                  type="submit"
                  className="btn btn-navy"
                  style={{ flex: 2 }}
                  disabled={submitting}>
                  {submitting
                    ? "Registering..."
                    : "Complete Registration"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
