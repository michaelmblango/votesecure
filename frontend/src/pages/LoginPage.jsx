import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [step, setStep]             = useState(1);
  const [studentNumber, setStudentNumber] = useState("");
  const [password, setPassword]     = useState("");
  const [otpCode, setOtpCode]       = useState("");
  const [userId, setUserId]         = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await authAPI.login(studentNumber, password);
      setUserId(res.data.user_id);
      setOtpMessage(res.data.message);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed. Check your credentials.");
    } finally { setLoading(false); }
  };

  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await authAPI.verifyOTP(userId, otpCode);
      const { access_token, user_id, full_name, role } = res.data;
      login(access_token, { user_id, full_name, role });
      navigate(role === "voter" ? "/ballot" : "/admin");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid or expired code.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, var(--navy) 0%, #1251A3 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1.5rem",
    }}>
      <div style={{ width: "100%", maxWidth: 440 }}>

        {/* Logo above card */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{
            width: 52, height: 52, background: "rgba(255,255,255,0.12)",
            borderRadius: 14, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 24, margin: "0 auto 0.75rem",
            border: "1px solid rgba(255,255,255,0.2)",
          }}>🗳️</div>
          <div style={{ color: "#fff", fontSize: "1.375rem", fontWeight: 800, letterSpacing: "-0.01em" }}>
            VoteSecure
          </div>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8125rem", marginTop: 2 }}>
            AI Professional College
          </div>
        </div>

        {/* Card */}
        <div className="card animate-in" style={{ borderRadius: 16, overflow: "hidden" }}>

          {/* Step indicator */}
          <div style={{ padding: "1.25rem 1.75rem 0" }}>
            <div style={{ display: "flex", gap: 6, marginBottom: "1.25rem" }}>
              {[1, 2].map(n => (
                <div key={n} style={{
                  flex: 1, height: 3, borderRadius: 999,
                  background: step >= n ? "var(--blue)" : "var(--border)",
                  transition: "background 0.3s",
                }} />
              ))}
            </div>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--slate)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Step {step} of 2 - {step === 1 ? "Identity Verification" : "Email Confirmation"}
            </div>
          </div>

          <div style={{ padding: "1.25rem 1.75rem 1.75rem" }}>

            {/* STEP 1 */}
            {step === 1 && (
              <form onSubmit={handlePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label className="input-label">Student Registration Number</label>
                  <input
                    className="input"
                    value={studentNumber}
                    onChange={e => setStudentNumber(e.target.value)}
                    placeholder="e.g. CS/2021/001"
                    required
                  />
                </div>
                <div>
                  <label className="input-label">Password</label>
                  <input
                    className="input"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                </div>
                <button type="submit" disabled={loading} className="btn btn-navy btn-lg" style={{ marginTop: "0.25rem", minHeight: "44px" }}>
                  {loading ? <><span className="spinner-sm" style={{ borderTopColor: "#fff" }} /> Verifying...</> : "Continue →"}
                </button>
              </form>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <form onSubmit={handleOTPSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="alert alert-info" style={{ borderRadius: 8 }}>
                  <span style={{ fontSize: "1rem" }}>📧</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>Check your email</div>
                    <div style={{ fontSize: "0.8125rem", opacity: 0.85 }}>{otpMessage}</div>
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
                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="btn btn-success btn-lg" style={{ minHeight: "44px" }}>
                  {loading ? <><span className="spinner-sm" style={{ borderTopColor: "#fff" }} /> Verifying...</> : "Confirm & Sign In"}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(""); setOtpCode(""); }}
                  className="btn btn-ghost" style={{ alignSelf: "center", fontSize: "0.8125rem", minHeight: "44px" }}>
                  ← Back
                </button>
              </form>
            )}

            {error && (
              <div className="alert alert-error animate-in" style={{ marginTop: "1rem", borderRadius: 8 }}>
                <span>⚠</span> {error}
              </div>
            )}

            {/* Verify link */}
            <div className="divider" style={{ margin: "1.25rem 0 0.75rem" }} />
            <div style={{ textAlign: "center" }}>
              <Link to="/verify" style={{ fontSize: "0.8125rem", color: "var(--slate)", textDecoration: "none" }}
                onMouseEnter={e => e.target.style.color = "var(--blue)"}
                onMouseLeave={e => e.target.style.color = "var(--slate)"}>
                🔐 Verify a vote receipt
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
