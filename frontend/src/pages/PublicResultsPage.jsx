import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

function CandidateBar({ candidate, isWinner }) {
  const pct = candidate.percentage || 0;
  return (
    <div style={{
      padding: "0.875rem",
      borderRadius: 10,
      border: `2px solid ${isWinner ? "var(--amber)" : "var(--border)"}`,
      background: isWinner ? "var(--amber-lt)" : "#fff",
      marginBottom: "0.625rem",
    }}>
      <div style={{ display: "flex", alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.75rem", marginBottom: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center",
                      gap: "0.625rem" }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: isWinner ? "var(--amber)" : "var(--ice)",
            display: "flex", alignItems: "center",
            justifyContent: "center",
            fontWeight: 800, fontSize: "1rem",
            color: isWinner ? "#fff" : "var(--slate)",
            flexShrink: 0,
          }}>
            {candidate.candidate_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: "var(--ink)",
                          fontSize: "0.9375rem" }}>
              {candidate.candidate_name}
            </div>
            {isWinner && (
              <span className="badge badge-amber"
                    style={{ fontSize: "0.6875rem", marginTop: 2 }}>
                🏆 Winner
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: "1.25rem", fontWeight: 800,
                        color: isWinner ? "var(--amber)" : "var(--slate)" }}>
            {pct}%
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--slate)" }}>
            {candidate.vote_count} vote{candidate.vote_count !== 1 ? "s" : ""}
          </div>
        </div>
      </div>
      <div className="progress-track">
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: isWinner ? "var(--amber)" : "var(--blue)",
          borderRadius: 999,
          transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>
    </div>
  );
}

function PositionResult({ position }) {
  return (
    <div className="card card-accent-blue"
         style={{ marginBottom: "1.25rem", overflow: "hidden" }}>
      <div style={{
        padding: "1rem 1.25rem",
        borderBottom: "1px solid var(--border)",
        display: "flex", justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div style={{ fontWeight: 700, color: "var(--ink)" }}>
          {position.position_name}
        </div>
        <div style={{ fontSize: "0.8125rem", color: "var(--slate)" }}>
          {position.total_votes} vote{position.total_votes !== 1 ? "s" : ""}
        </div>
      </div>
      <div style={{ padding: "1rem 1.25rem" }}>
        {position.candidates.length === 0 ? (
          <p style={{ color: "var(--slate)", fontSize: "0.875rem",
                      textAlign: "center", padding: "1rem 0" }}>
            No votes recorded yet.
          </p>
        ) : (
          position.candidates.map(c => (
            <CandidateBar
              key={c.candidate_id}
              candidate={c}
              isWinner={c.candidate_name === position.winner
                        && position.total_votes > 0}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function PublicResultsPage() {
  const { election_id } = useParams();
  const [results,  setResults]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [copied,   setCopied]   = useState(false);

  const shareUrl = window.location.href;

  useEffect(() => {
    const load = () => {
      fetch(`${API}/api/analytics/public/results/${election_id}`)
        .then(r => r.json())
        .then(d => {
          if (d.detail) setError(d.detail);
          else setResults(d);
        })
        .catch(() => setError("Failed to load results."))
        .finally(() => setLoading(false));
    };
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [election_id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsApp = () => {
    const text = results
      ? `VoteSecure Results: ${results.election_title}\n${shareUrl}`
      : shareUrl;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank"
    );
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--ice)",
                  display: "flex", alignItems: "center",
                  justifyContent: "center" }}>
      <div className="spinner" />
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", background: "var(--ice)",
                  display: "flex", alignItems: "center",
                  justifyContent: "center", padding: "1.5rem" }}>
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔒</div>
        <h2 style={{ fontWeight: 800, color: "var(--ink)",
                     marginBottom: "0.5rem" }}>
          Results Not Available
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

  if (!results) return null;

  const statusColor = {
    active:   "var(--confirm)",
    closed:   "var(--slate)",
    archived: "var(--slate)",
  }[results.election_status] || "var(--slate)";

  return (
    <div style={{ minHeight: "100vh", background: "var(--ice)" }}>

      <div style={{
        background: "var(--navy)",
        padding: "clamp(2rem, 6vw, 3.5rem) 1.5rem",
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center",
                        gap: "0.625rem", marginBottom: "1.25rem" }}>
            <Link to="/" style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              textDecoration: "none",
            }}>
              <div style={{
                width: 30, height: 30, background: "rgba(255,255,255,0.12)",
                borderRadius: 7, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 15,
              }}>🗳️</div>
              <span style={{ color: "rgba(255,255,255,0.6)",
                             fontSize: "0.8125rem" }}>
                VoteSecure
              </span>
            </Link>
            {results.org_name && (
              <>
                <span style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
                <span style={{ color: "rgba(255,255,255,0.6)",
                               fontSize: "0.8125rem" }}>
                  {results.org_name}
                </span>
              </>
            )}
          </div>

          <h1 style={{
            color: "#fff",
            fontSize: "clamp(1.375rem, 4vw, 2rem)",
            fontWeight: 800,
            margin: "0 0 0.75rem",
            letterSpacing: "-0.02em",
          }}>
            {results.election_title}
          </h1>

          <div style={{ display: "flex", alignItems: "center",
                        gap: "0.75rem", flexWrap: "wrap",
                        marginBottom: "1.5rem" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "0.375rem",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 999, padding: "0.25rem 0.75rem",
              fontSize: "0.8125rem", color: "#fff",
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: statusColor,
                display: "inline-block",
              }} />
              {results.is_live ? "Live Results" : "Final Results"}
            </span>
            {results.is_live && (
              <span style={{ color: "rgba(255,255,255,0.5)",
                             fontSize: "0.75rem" }}>
                Updates every 30 seconds
              </span>
            )}
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "0.75rem",
          }}>
            {[
              { label: "Total Votes",  value: results.total_votes_cast },
              { label: "Registered",   value: results.total_registered },
              { label: "Turnout",      value: `${results.turnout_percent}%` },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: "rgba(255,255,255,0.08)",
                borderRadius: 10, padding: "0.875rem",
                textAlign: "center",
              }}>
                <div style={{ color: "#fff", fontSize: "1.5rem",
                              fontWeight: 800, lineHeight: 1 }}>
                  {value}
                </div>
                <div style={{ color: "rgba(255,255,255,0.5)",
                              fontSize: "0.75rem", marginTop: 4,
                              fontWeight: 600, textTransform: "uppercase",
                              letterSpacing: "0.04em" }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto",
                    padding: "2rem 1.5rem" }}>

        <div className="card" style={{
          padding: "1rem 1.25rem",
          marginBottom: "1.75rem",
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap", gap: "0.75rem",
        }}>
          <div style={{ fontSize: "0.875rem", fontWeight: 600,
                        color: "var(--ink)" }}>
            Share these results
          </div>
          <div style={{ display: "flex", gap: "0.5rem",
                        flexWrap: "wrap" }}>
            <button
              onClick={handleCopy}
              className="btn btn-ghost btn-sm"
              style={{ gap: "0.375rem" }}>
              {copied ? "✓ Copied!" : "Copy Link"}
            </button>
            <button
              onClick={handleWhatsApp}
              className="btn btn-sm"
              style={{
                background: "#25D366", color: "#fff",
                border: "none", gap: "0.375rem",
              }}>
              📱 WhatsApp
            </button>
          </div>
        </div>

        {results.positions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 0",
                        color: "var(--slate)" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>
              📊
            </div>
            <div style={{ fontWeight: 600, color: "var(--ink)" }}>
              No results yet
            </div>
            <div style={{ fontSize: "0.875rem", marginTop: "0.375rem" }}>
              Results will appear here once voting begins.
            </div>
          </div>
        ) : (
          results.positions.map(p => (
            <PositionResult key={p.position_id} position={p} />
          ))
        )}

        <div style={{ textAlign: "center", marginTop: "2rem",
                      padding: "1.5rem 0",
                      borderTop: "1px solid var(--border)" }}>
          <Link to="/" style={{ textDecoration: "none" }}>
            <div style={{ display: "inline-flex", alignItems: "center",
                          gap: "0.5rem" }}>
              <div style={{
                width: 28, height: 28, background: "var(--navy)",
                borderRadius: 6, display: "flex",
                alignItems: "center", justifyContent: "center",
                fontSize: 14,
              }}>🗳️</div>
              <span style={{ fontSize: "0.875rem", color: "var(--slate)",
                             fontWeight: 500 }}>
                Powered by VoteSecure
              </span>
            </div>
          </Link>
          <div style={{ fontSize: "0.75rem", color: "#CBD5E1",
                        marginTop: "0.375rem" }}>
            Secure · Transparent · Auditable
          </div>
        </div>
      </div>
    </div>
  );
}
