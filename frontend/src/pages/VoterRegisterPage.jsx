import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import PasswordInput from "../components/PasswordInput";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function VoterRegisterPage() {
  const { code }      = useParams();
  const [invite,      setInvite]    = useState(null);
  const [form,        setForm]      = useState({
    full_name: "", student_number: "",
    password: "", department: "", level: "",
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
      .catch(() => setError("Failed to load invite. Check the link."))
      .finally(() => setLoading(false));
  }, [code]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== confirm) {
      setError("Passwords do not match."); return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters."); return;
    }
    setError(""); setSubmitting(true);
    try {
      const res  = await fetch(
        `${API}/api/voter-invites/register/${code}`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(form),
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
                  alignItems: "center", justifyContent: "center" }}>
      <div className="spinner" />
    </div>
  );

  if (error && !invite) return (
    <div style={{ minHeight: "100vh", background: "var(--ice)",
                  display: "flex", alignItems: "center",
                  justifyContent: "center", padding: "1.5rem" }}>
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
        <h2 style={{ fontWeight: 800, color: "var(--ink)",
                     marginBottom: "0.5rem" }}>
          Invalid Invite
        </h2>
        <p style={{ color: "var(--slate)", marginBottom: "1.5rem" }}>
          {error}
        </p>
        <Link to="/" className="btn btn-navy"
              style={{ textDecoration: "none" }}>
          Go Home
        </Link>
      </div>
    </div>
  );

  if (done) return (
    <div style={{ minHeight: "100vh", background: "var(--ice)",
                  display: "flex", alignItems: "center",
                  justifyContent: "center", padding: "1.5rem" }}>
      <div style={{ maxWidth: 480 }}>
        <div className="card animate-in" style={{ overflow: "hidden" }}>
          <div style={{ background: "var(--confirm)",
                        padding: "2.5rem 2rem", textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>
              ✓
            </div>
            <h2 style={{ color: "#fff", fontWeight: 800,
                         fontSize: "1.5rem", margin: "0 0 0.5rem" }}>
              Registration Complete!
            </h2>
            <p style={{ color: "rgba(255,255,255,0.85)",
                        margin: 0, fontSize: "0.9375rem" }}>
              Your account is pending approval
            </p>
          </div>
          <div style={{ padding: "2rem" }}>
            <div className="alert alert-info"
                 style={{ borderRadius: 8, marginBottom: "1.5rem" }}>
              <span>📧</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                  Check your email
                </div>
                <div style={{ fontSize: "0.8125rem" }}>
                  The administrators of{" "}
                  <strong>{invite?.org_name}</strong> will review your
                  registration. You will receive an email when approved.
                </div>
              </div>
            </div>
            <div style={{ fontSize: "0.875rem", color: "var(--slate)",
                          lineHeight: 1.6 }}>
              Once approved, log in at{" "}
              <Link to="/login"
                    style={{ color: "var(--blue)", fontWeight: 600 }}>
                votesecure.online/login
              </Link>{" "}
              using your student number and password.
            </div>
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

        <div className="card animate-in" style={{ padding: "2rem" }}>
          <div className="alert alert-info"
               style={{ borderRadius: 8, marginBottom: "1.5rem" }}>
            <span>📧</span>
            <div style={{ fontSize: "0.8125rem" }}>
              Registering as <strong>{invite?.email}</strong>
            </div>
          </div>

          <form onSubmit={handleSubmit}
                style={{ display: "flex", flexDirection: "column",
                         gap: "1rem" }}>
            <div>
              <label className="input-label">Full Name *</label>
              <input className="input" value={form.full_name}
                onChange={e => set("full_name", e.target.value)}
                placeholder="Your full name" required />
            </div>

            <div>
              <label className="input-label">Student Number *</label>
              <input className="input" value={form.student_number}
                onChange={e => set("student_number", e.target.value)}
                placeholder="e.g. CS/2021/042" required />
            </div>

            <div style={{ display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "0.75rem" }}>
              <div>
                <label className="input-label">Department</label>
                <input className="input" value={form.department}
                  onChange={e => set("department", e.target.value)}
                  placeholder="e.g. Computer Science" />
              </div>
              <div>
                <label className="input-label">Level / Year</label>
                <input className="input" value={form.level}
                  onChange={e => set("level", e.target.value)}
                  placeholder="e.g. 400" />
              </div>
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

            <button
              type="submit"
              className="btn btn-navy btn-lg"
              disabled={submitting}
              style={{ marginTop: "0.25rem" }}>
              {submitting ? "Registering..." : "Complete Registration"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
