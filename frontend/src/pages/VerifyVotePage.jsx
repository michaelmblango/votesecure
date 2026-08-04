// src/pages/VerifyVotePage.jsx
// Public vote verification — any voter can confirm
// their vote was counted using their receipt hash
// No login required for this page

import { useState } from "react";
import { votesAPI } from "../services/api";
import { Link } from "react-router-dom";

export default function VerifyVotePage() {
  const [hash,    setHash]    = useState("");
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!hash.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await votesAPI.verify(hash.trim());
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setHash("");
    setResult(null);
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50
                    flex flex-col items-center justify-start pt-12 px-4 pb-12">

      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-brand rounded-2xl flex items-center
                        justify-center mx-auto mb-4 shadow-lg">
          <span className="text-3xl">🔐</span>
        </div>
        <h1 className="text-3xl font-bold text-navy">Verify Your Vote</h1>
        <p className="text-gray-500 mt-2 max-w-md">
          Enter the receipt code you received after voting to confirm
          your ballot was counted and has not been tampered with.
        </p>
      </div>

      {/* Input card */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200
                      w-full max-w-lg overflow-hidden">
        <div className="bg-navy px-6 py-4">
          <p className="text-white font-semibold">Vote Receipt Verification</p>
          <p className="text-blue-300 text-xs mt-0.5">
            Powered by SHA-256 cryptographic integrity check
          </p>
        </div>

        <form onSubmit={handleVerify} className="p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Vote Receipt Code
          </label>
          <textarea
            value={hash}
            onChange={(e) => setHash(e.target.value)}
            placeholder="Paste your full receipt hash here..."
            rows={3}
            className="w-full border border-gray-300 rounded-xl px-4 py-3
                       font-mono text-sm focus:outline-none focus:ring-2
                       focus:ring-brand resize-none text-gray-700"
          />
          <p className="text-gray-400 text-xs mt-1.5">
            Your receipt looks like: a8f5f167f44f4964e6c998dee827110c...
          </p>

          <div className="flex gap-3 mt-4">
            {result || error ? (
              <button
                type="button" onClick={handleClear}
                className="flex-1 border border-gray-300 text-gray-600 py-3
                           rounded-xl text-sm hover:bg-gray-50 transition-colors">
                Clear
              </button>
            ) : null}
            <button
              type="submit"
              disabled={loading || !hash.trim()}
              className="flex-1 bg-brand hover:bg-blue-700 text-white font-bold
                         py-3 rounded-xl transition-colors disabled:opacity-50 text-sm">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none"
                       stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                  Verifying...
                </span>
              ) : "🔍 Verify Vote"}
            </button>
          </div>
        </form>
      </div>

      {/* Error state */}
      {error && (
        <div className="mt-5 w-full max-w-lg bg-red-50 border border-red-200
                        rounded-2xl p-5 text-center">
          <span className="text-4xl block mb-2">⚠️</span>
          <p className="text-red-700 font-semibold">{error}</p>
        </div>
      )}

      {/* Result: NOT FOUND */}
      {result && !result.verified && (
        <div className="mt-5 w-full max-w-lg bg-red-50 border border-red-200
                        rounded-2xl overflow-hidden">
          <div className="bg-red-600 px-6 py-4 text-center">
            <span className="text-4xl block mb-1">❌</span>
            <h2 className="text-white font-bold text-lg">Vote Not Found</h2>
          </div>
          <div className="p-6 text-center">
            <p className="text-red-700 text-sm">{result.message}</p>
            <p className="text-gray-500 text-xs mt-3">
              Double-check your receipt code. Make sure you copied the full hash.
            </p>
          </div>
        </div>
      )}

      {/* Result: FOUND + INTEGRITY OK */}
      {result && result.verified && result.integrity_ok && (
        <div className="mt-5 w-full max-w-lg bg-white border border-green-200
                        rounded-2xl overflow-hidden shadow-lg">
          <div className="bg-green-600 px-6 py-5 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center
                            justify-center mx-auto mb-2">
              <span className="text-4xl">✓</span>
            </div>
            <h2 className="text-white font-bold text-xl">Vote Verified</h2>
            <p className="text-green-100 text-sm mt-1">
              Your vote was recorded and has not been tampered with
            </p>
          </div>

          <div className="p-6 space-y-4">
            {/* Details grid */}
            <div className="grid grid-cols-1 gap-3">
              {[
                { label: "Election",   value: result.election,        icon: "🗳️" },
                { label: "Position",   value: result.position,        icon: "📋" },
                { label: "Voted For",  value: result.candidate_voted, icon: "✅" },
                { label: "Cast At",    value: result.cast_at
                    ? new Date(result.cast_at).toLocaleString("en-GB", {
                        day:"2-digit", month:"short", year:"numeric",
                        hour:"2-digit", minute:"2-digit",
                      })
                    : "—",                                             icon: "🕐" },
              ].map(({ label, value, icon }) => (
                <div key={label}
                     className="flex items-center justify-between bg-gray-50
                                border border-gray-100 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span>{icon}</span>
                    <span className="text-gray-500 text-sm">{label}</span>
                  </div>
                  <span className="font-semibold text-navy text-sm text-right">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Integrity badge */}
            <div className="bg-green-50 border border-green-200 rounded-xl
                            px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center
                              justify-center flex-shrink-0">
                <span className="text-white text-sm">🔐</span>
              </div>
              <div>
                <p className="text-green-800 font-semibold text-sm">
                  Integrity Check Passed
                </p>
                <p className="text-green-600 text-xs">
                  SHA-256 hash matches — vote record has not been altered
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Result: FOUND but TAMPERED */}
      {result && result.verified && !result.integrity_ok && (
        <div className="mt-5 w-full max-w-lg bg-yellow-50 border border-yellow-300
                        rounded-2xl overflow-hidden">
          <div className="bg-yellow-500 px-6 py-4 text-center">
            <span className="text-4xl block mb-1">⚠️</span>
            <h2 className="text-white font-bold text-lg">Integrity Warning</h2>
          </div>
          <div className="p-6">
            <p className="text-yellow-800 font-semibold text-center mb-3">
              Vote found but integrity check failed.
            </p>
            <p className="text-gray-600 text-sm text-center">
              The vote record may have been altered after submission.
              Please contact your election administrator immediately.
            </p>
          </div>
        </div>
      )}

      {/* How it works explanation */}
      <div className="mt-8 w-full max-w-lg">
        <details className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <summary className="px-5 py-4 cursor-pointer text-sm font-medium
                              text-gray-700 hover:bg-gray-50 transition-colors
                              list-none flex items-center justify-between">
            <span>ℹ️ How does vote verification work?</span>
            <svg className="w-4 h-4 text-gray-400" fill="none"
                 stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                    strokeWidth={2} d="M19 9l-7 7-7-7"/>
            </svg>
          </summary>
          <div className="px-5 pb-5 pt-2 space-y-2 text-sm text-gray-500
                          border-t border-gray-100">
            <p>
              When you cast your vote, VoteSecure generates a unique
              <strong className="text-navy"> SHA-256 cryptographic hash</strong> — a
              64-character fingerprint of your vote.
            </p>
            <p>
              This hash is calculated from your vote ID, election, candidate,
              and timestamp. If even one character in the record changes after
              submission, the hash will not match — making tampering detectable.
            </p>
            <p>
              Your <strong className="text-navy">identity is never revealed</strong> by
              this check. Only that your vote exists and is unchanged.
            </p>
          </div>
        </details>
      </div>

      {/* Back to login */}
      <div className="mt-6 text-center">
        <Link to="/login"
          className="text-brand text-sm hover:underline transition-colors">
          ← Back to Login
        </Link>
      </div>
    </div>
  );
}