import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { authAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  // Which step we're on: 1 = password, 2 = OTP
  const [step, setStep]               = useState(1);
  const [studentNumber, setStudentNumber] = useState("");
  const [password, setPassword]       = useState("");
  const [otpCode, setOtpCode]         = useState("");
  const [userId, setUserId]           = useState("");
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [otpMessage, setOtpMessage]   = useState("");

  // ── Step 1: Password ────────────────────────────────────
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authAPI.login(studentNumber, password);
      setUserId(res.data.user_id);
      setOtpMessage(res.data.message);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: OTP ─────────────────────────────────────────
  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authAPI.verifyOTP(userId, otpCode);
      const { access_token, user_id, full_name, role } = res.data;

      // Store token and user in context + localStorage
      login(access_token, { user_id, full_name, role });

      // Redirect based on role
      if (role === "voter") {
        navigate("/ballot");
      } else {
        navigate("/admin");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy to-brand
                    flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-navy px-8 py-6 text-center">
          <span className="text-4xl">🗳️</span>
          <h1 className="text-white font-bold text-2xl mt-2">VoteSecure</h1>
          <p className="text-blue-300 text-sm">AI Professional College</p>
        </div>

        {/* Progress Bar */}
        <div className="flex">
          <div className={`h-1 flex-1 transition-colors duration-500
                          ${step >= 1 ? "bg-brand" : "bg-gray-200"}`} />
          <div className={`h-1 flex-1 transition-colors duration-500
                          ${step >= 2 ? "bg-brand" : "bg-gray-200"}`} />
        </div>

        <div className="px-8 py-8">
          <p className="text-center text-sm text-gray-400 mb-6">
            Step {step} of 2 — {step === 1 ? "Identity Verification" : "Email Verification"}
          </p>

          {/* ── STEP 1: Password ── */}
          {step === 1 && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student Registration Number
                </label>
                <input
                  type="text"
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                  placeholder="e.g. CS/2021/001"
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-3
                             focus:outline-none focus:ring-2 focus:ring-brand text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-3
                             focus:outline-none focus:ring-2 focus:ring-brand text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand hover:bg-blue-700 text-white font-semibold
                           py-3 rounded-lg transition-colors disabled:opacity-60 mt-2">
                {loading ? "Verifying..." : "Continue →"}
              </button>
            </form>
          )}

          {/* ── STEP 2: OTP ── */}
          {step === 2 && (
            <form onSubmit={handleOTPSubmit} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <p className="text-blue-800 text-sm">{otpMessage}</p>
                <p className="text-blue-600 text-xs mt-1">
                  Check your terminal if running in development mode
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/, ""))}
                  placeholder="000000"
                  maxLength={6}
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-4
                             text-center text-3xl tracking-[0.5em] font-mono
                             focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold
                           py-3 rounded-lg transition-colors disabled:opacity-60">
                {loading ? "Verifying..." : "Verify & Login"}
              </button>
              <button
                type="button"
                onClick={() => { setStep(1); setError(""); setOtpCode(""); }}
                className="w-full text-gray-500 text-sm hover:text-gray-700 underline">
                ← Back to password
              </button>
            </form>
          )}

          {/* Error message */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700
                            text-sm rounded-lg px-4 py-3">
              ⚠️ {error}
            </div>
          )}
        </div>
                  {/* Verify vote link — no login needed */}
                  <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <Link
              to="/verify"
              className="text-brand text-sm hover:underline transition-colors">
              🔐 Verify your vote receipt
            </Link>
          </div>
      </div>
    </div>
  );
}