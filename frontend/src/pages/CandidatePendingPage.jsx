import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { candidateInviteAPI } from "../services/api";

function PendingCandidateCard({ candidate, onDecision }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handle = async (approved) => {
    setLoading(true); setError("");
    try {
      const res = await candidateInviteAPI.decide(
        candidate.invite_id, { approved }
      );
      onDecision(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed.");
    } finally { setLoading(false); }
  };

  return (
    <div className="card card-accent-blue animate-in"
         style={{ padding: "1.25rem 1.5rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "1rem", marginBottom: "0.875rem" }}>
        <div>
          <div style={{ fontWeight: 700, color: "var(--ink)",
                        fontSize: "1rem" }}>
            {candidate.candidate_name || "Pending"}
          </div>
          <div style={{ fontSize: "0.8125rem",
                        color: "var(--slate)", marginTop: 2 }}>
            {candidate.email}
          </div>
          <div style={{ fontSize: "0.8125rem",
                        color: "var(--slate)" }}>
            {candidate.position_name} — {candidate.election_title}
          </div>
        </div>
        <span className="badge badge-amber">Pending</span>
      </div>

      {candidate.manifesto && (
        <details style={{ marginBottom: "0.875rem" }}>
          <summary style={{ fontSize: "0.8125rem",
                            color: "var(--blue)",
                            cursor: "pointer",
                            fontWeight: 600,
                            listStyle: "none" }}>
            View manifesto
          </summary>
          <div style={{ fontSize: "0.8125rem",
                        color: "var(--slate)",
                        marginTop: "0.5rem",
                        lineHeight: 1.6,
                        padding: "0.75rem",
                        background: "var(--ice)",
                        borderRadius: 8,
                        whiteSpace: "pre-wrap" }}>
            {candidate.manifesto}
          </div>
        </details>
      )}

      {error && (
        <div className="alert alert-error"
             style={{ borderRadius: 8,
                      marginBottom: "0.75rem" }}>
          <span>⚠</span> {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.625rem" }}>
        <button className="btn btn-success btn-sm"
                style={{ flex: 1 }}
                disabled={loading}
                onClick={() => handle(true)}>
          Approve
        </button>
        <button className="btn btn-danger btn-sm"
                style={{ flex: 1 }}
                disabled={loading}
                onClick={() => handle(false)}>
          Reject
        </button>
      </div>
    </div>
  );
}

export default function CandidatePendingPage() {
  const navigate = useNavigate();
  const [pending,  setPending]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await candidateInviteAPI.pending();
      setPending(res.data.pending || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="page-narrow">
      <button className="btn btn-ghost btn-sm"
              style={{ marginBottom: "1.5rem" }}
              onClick={() => navigate("/admin")}>
        Back to Dashboard
      </button>

      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800,
                     color: "var(--ink)",
                     marginBottom: "0.25rem" }}>
          Candidate Approvals
        </h1>
        <p style={{ fontSize: "0.9rem", color: "var(--slate)",
                    margin: 0 }}>
          Review and approve candidate registrations.
          Approved candidates appear on the ballot automatically.
        </p>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center",
                      padding: "4rem 0" }}>
          <div className="spinner" />
        </div>
      ) : pending.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 0",
                      color: "var(--slate)" }}>
          <div style={{ fontSize: "3rem",
                        marginBottom: "1rem" }}>✓</div>
          <div style={{ fontWeight: 700, color: "var(--ink)",
                        marginBottom: "0.375rem" }}>
            No pending candidates
          </div>
          <div style={{ fontSize: "0.875rem" }}>
            All candidates have been reviewed.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex",
                      flexDirection: "column",
                      gap: "1.25rem" }}>
          {pending.map(c => (
            <PendingCandidateCard
              key={c.invite_id}
              candidate={c}
              onDecision={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}
