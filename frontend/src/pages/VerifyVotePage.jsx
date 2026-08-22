import { useState } from "react";
import { Link } from "react-router-dom";
import { votesAPI } from "../services/api";

export default function VerifyVotePage() {
  const [hash,    setHash]    = useState("");
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!hash.trim()) return;
    setLoading(true); setError(""); setResult(null);
    try { const r = await votesAPI.verify(hash.trim()); setResult(r.data); }
    catch (err) { setError(err.response?.data?.detail || "Verification failed."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight:"100vh", background:"var(--ice)",
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"flex-start", padding:"3rem 1.5rem",
    }}>
      <div style={{ width:"100%", maxWidth:520 }}>

        {/* Header */}
        <div style={{ textAlign:"center", marginBottom:"2rem" }}>
          <div style={{ width:56, height:56, background:"var(--navy)", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, margin:"0 auto 1rem" }}>🔐</div>
          <h1 style={{ fontSize:"1.75rem", fontWeight:800, color:"var(--ink)", marginBottom:"0.5rem" }}>Verify Your Vote</h1>
          <p style={{ color:"var(--slate)", fontSize:"0.9375rem", lineHeight:1.6, margin:0 }}>
            Enter your receipt code to confirm your ballot was recorded and has not been altered.
          </p>
        </div>

        {/* Input card */}
        <div className="card" style={{ padding:"1.5rem", marginBottom:"1.25rem" }}>
          <form onSubmit={handleVerify} style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
            <div>
              <label className="input-label">Vote Receipt Code</label>
              <textarea
                className="input text-mono"
                value={hash}
                onChange={e => setHash(e.target.value)}
                placeholder="Paste your full receipt hash here..."
                rows={3}
                style={{ resize:"none", lineHeight:1.6 }}
              />
              <div style={{ fontSize:"0.75rem", color:"var(--slate)", marginTop:"0.375rem", wordBreak:"break-all", overflowWrap:"break-word" }}>
                Your receipt looks like: a8f5f167f44f4964e6c998dee827110c...
              </div>
            </div>
            <div style={{ display:"flex", gap:"0.625rem" }}>
              {result && <button type="button" className="btn btn-ghost" style={{ flex:1 }} onClick={() => { setHash(""); setResult(null); setError(""); }}>Clear</button>}
              <button type="submit" className="btn btn-navy" style={{ flex: result ? 1 : undefined, width: result ? undefined : "100%" }} disabled={loading || !hash.trim()}>
                {loading ? "Verifying..." : "Verify Vote"}
              </button>
            </div>
          </form>
        </div>

        {/* Error */}
        {error && <div className="alert alert-error animate-in" style={{ borderRadius:12, marginBottom:"1.25rem" }}><span>⚠</span> {error}</div>}

        {/* Not found */}
        {result && !result.verified && (
          <div className="card animate-in" style={{ overflow:"hidden", marginBottom:"1.25rem" }}>
            <div style={{ background:"var(--danger)", padding:"1.5rem", textAlign:"center", color:"#fff" }}>
              <div style={{ fontSize:"2rem", marginBottom:"0.5rem" }}>✗</div>
              <div style={{ fontWeight:800, fontSize:"1.125rem" }}>Vote Not Found</div>
            </div>
            <div style={{ padding:"1.25rem", textAlign:"center", color:"var(--slate)", fontSize:"0.875rem" }}>
              {result.message} Check that you copied the full receipt code.
            </div>
          </div>
        )}

        {/* Found + integrity ok */}
        {result && result.verified && result.integrity_ok && (
          <div className="card animate-in" style={{ overflow:"hidden", marginBottom:"1.25rem" }}>
            <div style={{ background:"var(--confirm)", padding:"1.75rem", textAlign:"center", color:"#fff" }}>
              <div style={{ width:56, height:56, background:"rgba(255,255,255,0.2)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, margin:"0 auto 0.75rem" }}>✓</div>
              <div style={{ fontWeight:800, fontSize:"1.25rem" }}>Vote Verified</div>
              <div style={{ fontSize:"0.875rem", opacity:0.85, marginTop:4 }}>Recorded and tamper-free</div>
            </div>
            <div style={{ padding:"1.5rem", display:"flex", flexDirection:"column", gap:"0.625rem" }}>
              {[
                { icon:"🗳️", label:"Election",    value: result.election        },
                { icon:"📋", label:"Position",    value: result.position        },
                { icon:"✓",  label:"Voted For",   value: result.candidate_voted },
                { icon:"🕐", label:"Cast At",     value: result.cast_at ? new Date(result.cast_at).toLocaleString("en-GB", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }) : "-" },
              ].map(({ icon, label, value }) => (
                <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0.75rem", background:"var(--ice)", borderRadius:8, border:"1px solid var(--border)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", color:"var(--slate)", fontSize:"0.875rem" }}>
                    <span>{icon}</span> {label}
                  </div>
                  <div style={{ fontWeight:700, color:"var(--ink)", fontSize:"0.9rem" }}>{value}</div>
                </div>
              ))}
              <div className="alert alert-success" style={{ borderRadius:8, marginTop:"0.25rem" }}>
                <span>🔐</span>
                <div>
                  <div style={{ fontWeight:700 }}>Integrity Check Passed</div>
                  <div style={{ fontSize:"0.8125rem" }}>SHA-256 hash matches. Vote has not been altered</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Found but tampered */}
        {result && result.verified && !result.integrity_ok && (
          <div className="card animate-in" style={{ overflow:"hidden", marginBottom:"1.25rem" }}>
            <div style={{ background:"var(--amber)", padding:"1.5rem", textAlign:"center", color:"#fff" }}>
              <div style={{ fontSize:"2rem", marginBottom:"0.5rem" }}>⚠</div>
              <div style={{ fontWeight:800 }}>Integrity Warning</div>
            </div>
            <div style={{ padding:"1.25rem", textAlign:"center", color:"var(--slate)" }}>
              The vote record exists but the hash does not match. Contact your administrator.
            </div>
          </div>
        )}

        {/* How it works */}
        <details className="card" style={{ overflow:"hidden" }}>
          <summary style={{ padding:"1rem 1.25rem", cursor:"pointer", fontWeight:600, color:"var(--ink)", fontSize:"0.875rem", listStyle:"none", display:"flex", justifyContent:"space-between" }}>
            How does verification work?
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
          </summary>
          <div style={{ padding:"0 1.25rem 1.25rem", borderTop:"1px solid var(--border)", fontSize:"0.875rem", color:"var(--slate)", lineHeight:1.7, display:"flex", flexDirection:"column", gap:"0.625rem" }}>
            <p style={{ margin:0 }}>When you vote, VoteSecure computes a SHA-256 hash. This is a 64-character fingerprint of your vote ID, election, candidate, and timestamp.</p>
            <p style={{ margin:0 }}>If even one character in the stored record changes after submission, the recomputed hash will not match. Tampering is mathematically detectable.</p>
            <p style={{ margin:0 }}>Your identity is never revealed by this check. Only that your vote exists and is unchanged.</p>
          </div>
        </details>

        <div style={{ textAlign:"center", marginTop:"1.5rem" }}>
          <Link to="/login" style={{ fontSize:"0.875rem", color:"var(--slate)", textDecoration:"none" }}
            onMouseEnter={e => e.target.style.color = "var(--blue)"}
            onMouseLeave={e => e.target.style.color = "var(--slate)"}>
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
