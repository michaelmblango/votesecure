import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function CandidateProfilePage() {
  const { candidate_id } = useParams();
  const navigate         = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");

  useEffect(() => {
    fetch(`${API}/api/elections/candidates/${candidate_id}/profile`)
      .then(r => r.json())
      .then(d => {
        if (d.detail) setError(d.detail);
        else setCandidate(d);
      })
      .catch(() => setError("Failed to load candidate profile."))
      .finally(() => setLoading(false));
  }, [candidate_id]);

  if (loading) return (
    <div style={{
      minHeight: "100vh", display: "flex",
      alignItems: "center", justifyContent: "center",
      background: "var(--ice)",
    }}>
      <div className="spinner" />
    </div>
  );

  if (error || !candidate) return (
    <div style={{
      minHeight: "100vh", background: "var(--ice)",
      display: "flex", alignItems: "center",
      justifyContent: "center", padding: "1.5rem",
    }}>
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🙋</div>
        <h2 style={{ fontWeight: 800, color: "var(--ink)",
                     marginBottom: "0.5rem" }}>
          Profile Not Found
        </h2>
        <p style={{ color: "var(--slate)", marginBottom: "1.5rem" }}>
          {error || "This candidate profile could not be found."}
        </p>
        <button
          onClick={() => navigate(-1)}
          className="btn btn-navy">
          Go Back
        </button>
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--ice)",
    }}>
      {/* Header */}
      <div style={{
        background: "var(--navy)",
        padding: "clamp(2rem, 6vw, 3rem) 1.5rem",
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          {/* Breadcrumb */}
          <div style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            marginBottom: "1.5rem", flexWrap: "wrap",
          }}>
            <Link to="/" style={{
              color: "rgba(255,255,255,0.5)",
              textDecoration: "none", fontSize: "0.8125rem",
            }}>
              VoteSecure
            </Link>
            <span style={{ color: "rgba(255,255,255,0.3)" }}>›</span>
            <span style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: "0.8125rem",
            }}>
              {candidate.election_title}
            </span>
            <span style={{ color: "rgba(255,255,255,0.3)" }}>›</span>
            <span style={{
              color: "rgba(255,255,255,0.8)",
              fontSize: "0.8125rem",
            }}>
              {candidate.position_name}
            </span>
          </div>

          {/* Candidate identity */}
          <div style={{
            display: "flex", alignItems: "center",
            gap: "1.5rem", flexWrap: "wrap",
          }}>
            {/* Avatar */}
            {candidate.photo_url ? (
              <img
                src={candidate.photo_url}
                alt={candidate.display_name}
                style={{
                  width: 96, height: 96, borderRadius: "50%",
                  objectFit: "cover", flexShrink: 0,
                  border: "3px solid rgba(255,255,255,0.2)",
                }}
              />
            ) : (
              <div style={{
                width: 96, height: 96, borderRadius: "50%",
                background: "rgba(255,255,255,0.12)",
                border: "3px solid rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center",
                justifyContent: "center",
                fontSize: "2.5rem", fontWeight: 800,
                color: "#fff", flexShrink: 0,
              }}>
                {candidate.display_name.charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <div style={{
                color: "#fff", fontSize: "clamp(1.5rem, 4vw, 2rem)",
                fontWeight: 800, letterSpacing: "-0.02em",
                marginBottom: "0.375rem",
              }}>
                {candidate.display_name}
              </div>
              <div style={{
                display: "flex", alignItems: "center",
                gap: "0.625rem", flexWrap: "wrap",
              }}>
                <span style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 999, padding: "0.25rem 0.875rem",
                  color: "rgba(255,255,255,0.9)",
                  fontSize: "0.8125rem", fontWeight: 600,
                }}>
                  {candidate.position_name}
                </span>
                <span style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "0.8125rem",
                }}>
                  {candidate.election_title}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{
        maxWidth: 680, margin: "0 auto",
        padding: "2rem 1.5rem",
      }}>

        {/* Manifesto */}
        <div className="card" style={{ padding: "1.75rem",
                                       marginBottom: "1.5rem" }}>
          <h2 style={{
            fontSize: "1.0625rem", fontWeight: 700,
            color: "var(--ink)", marginBottom: "1.25rem",
            display: "flex", alignItems: "center", gap: "0.5rem",
          }}>
            📋 Manifesto
          </h2>
          {candidate.manifesto ? (
            <div style={{
              color: "var(--slate)", fontSize: "0.9375rem",
              lineHeight: 1.8,
              whiteSpace: "pre-wrap",
            }}>
              {candidate.manifesto}
            </div>
          ) : (
            <p style={{
              color: "var(--slate)", fontSize: "0.9rem",
              fontStyle: "italic",
            }}>
              No manifesto provided.
            </p>
          )}
        </div>

        {/* Election info */}
        <div className="card card-accent-blue"
             style={{ padding: "1.25rem 1.5rem",
                      marginBottom: "1.5rem" }}>
          <div style={{
            fontSize: "0.75rem", fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.05em",
            color: "var(--slate)", marginBottom: "0.875rem",
          }}>
            Election Details
          </div>
          <div style={{
            display: "flex", flexDirection: "column", gap: "0.5rem",
          }}>
            {[
              { label: "Election",  value: candidate.election_title  },
              { label: "Position",  value: candidate.position_name   },
              { label: "Status",    value: candidate.election_status  },
            ].map(({ label, value }) => (
              <div key={label} style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", fontSize: "0.9rem",
                padding: "0.5rem 0",
                borderBottom: "1px solid var(--border)",
              }}>
                <span style={{ color: "var(--slate)" }}>{label}</span>
                <span style={{
                  fontWeight: 600, color: "var(--ink)",
                  textTransform: "capitalize",
                }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        {candidate.election_status === "active" && (
          <div style={{ textAlign: "center" }}>
            <Link
              to="/login"
              className="btn btn-navy btn-lg"
              style={{ textDecoration: "none" }}>
              Log In to Vote
            </Link>
            <p style={{
              fontSize: "0.8125rem", color: "var(--slate)",
              marginTop: "0.75rem",
            }}>
              You must be a registered voter to cast your ballot.
            </p>
          </div>
        )}

        {/* Back button */}
        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <button
            onClick={() => navigate(-1)}
            className="btn btn-ghost">
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
