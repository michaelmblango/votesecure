import { useState, useEffect, useCallback } from "react";
import { approvalsAPI } from "../services/api";

function ApprovalCard({ request, currentAdminId, onVoted }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const myVote    = request.votes?.find(v => v.admin_id === currentAdminId);
  const pending   = request.total_required - (request.votes?.length || 0);

  const handleVote = async (vote) => {
    setLoading(true); setError("");
    try {
      await approvalsAPI.vote(request.request_id, vote);
      onVoted();
    } catch (err) {
      setError(err.response?.data?.detail || "Vote failed.");
    } finally { setLoading(false); }
  };

  const timeLeft = () => {
    const diff = new Date(request.expires_at) - new Date();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / 3600000);
    const mins  = Math.floor((diff % 3600000) / 60000);
    if (hours > 24) return `${Math.floor(hours / 24)}d remaining`;
    if (hours > 0)  return `${hours}h ${mins}m remaining`;
    return `${mins}m remaining`;
  };

  return (
    <div className="card card-accent-amber animate-in" style={{ padding: "1.25rem 1.5rem" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "1rem" }}>
        <div>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--amber)", marginBottom: "0.25rem" }}>
            Approval Required
          </div>
          <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: "1rem" }}>
            {request.action_label}
          </div>
          <div style={{ fontSize: "0.8125rem", color: "var(--slate)", marginTop: "0.25rem" }}>
            Requested by {request.initiated_by_name}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <span className="badge badge-amber" style={{ fontSize: "0.75rem" }}>
            {timeLeft()}
          </span>
        </div>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", marginBottom: "0.375rem" }}>
          <span style={{ color: "var(--slate)" }}>Approval progress</span>
          <span style={{ fontWeight: 700, color: "var(--ink)" }}>
            {request.total_approved} of {request.total_required} approved
          </span>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{
              width: `${(request.total_approved / request.total_required) * 100}%`,
              background: request.total_approved === request.total_required
                ? "var(--confirm)" : "var(--amber)",
            }}
          />
        </div>
      </div>

      {/* Admin votes status */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", marginBottom: "1rem" }}>
        {request.votes?.map(v => (
          <div key={v.admin_id} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0.5rem 0.75rem", borderRadius: 8,
            background: v.vote === "approved" ? "var(--confirm-lt)" : "var(--danger-lt)",
          }}>
            <span style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--ink)" }}>
              {v.admin_name}
              {v.admin_id === currentAdminId && " (you)"}
            </span>
            <span className={`badge ${v.vote === "approved" ? "badge-green" : "badge-red"}`}>
              {v.vote === "approved" ? "✓ Approved" : "✗ Rejected"}
            </span>
          </div>
        ))}
        {Array.from({ length: pending }).map((_, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0.5rem 0.75rem", borderRadius: 8,
            background: "var(--ice)", border: "1px dashed var(--border)",
          }}>
            <span style={{ fontSize: "0.8125rem", color: "var(--slate)" }}>
              Pending admin
            </span>
            <span className="badge badge-slate">Awaiting vote</span>
          </div>
        ))}
      </div>

      {/* My vote actions */}
      {!myVote ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {error && (
            <div className="alert alert-error" style={{ borderRadius: 8, marginBottom: "0.25rem" }}>
              <span>⚠</span> {error}
            </div>
          )}
          <div style={{ display: "flex", gap: "0.625rem" }}>
            <button
              className="btn btn-success"
              style={{ flex: 1 }}
              disabled={loading}
              onClick={() => handleVote("approved")}>
              {loading ? "..." : "✓ Approve"}
            </button>
            <button
              className="btn btn-danger"
              style={{ flex: 1 }}
              disabled={loading}
              onClick={() => handleVote("rejected")}>
              {loading ? "..." : "✗ Reject"}
            </button>
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--slate)", textAlign: "center", margin: 0 }}>
            One rejection cancels this action for all admins.
          </p>
        </div>
      ) : (
        <div className={`alert ${myVote.vote === "approved" ? "alert-success" : "alert-error"}`}
             style={{ borderRadius: 8 }}>
          <span>{myVote.vote === "approved" ? "✓" : "✗"}</span>
          <span style={{ fontSize: "0.875rem" }}>
            You {myVote.vote} this request.
            {myVote.vote === "approved" && pending > 0
              ? ` Waiting for ${pending} more admin(s).`
              : ""}
          </span>
        </div>
      )}
    </div>
  );
}

export default function ApprovalPanel({ adminId, onData }) {
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await approvalsAPI.getPending();
      const list = res.data.pending_approvals || [];
      setRequests(list);
      onData?.(list);
    } catch {}
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    // Poll every 30 seconds for new approvals
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) return null;
  if (requests.length === 0) return null;

  return (
    <div style={{ marginBottom: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem" }}>
        <div style={{
          width: 24, height: 24, borderRadius: "50%",
          background: "var(--amber)", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.75rem", fontWeight: 800, flexShrink: 0,
        }}>
          {requests.length}
        </div>
        <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: "1rem" }}>
          Pending Approvals
        </div>
        <span style={{ fontSize: "0.8125rem", color: "var(--slate)" }}>
          — your vote is required
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {requests.map(req => (
          <ApprovalCard
            key={req.request_id}
            request={req}
            currentAdminId={adminId}
            onVoted={load}
          />
        ))}
      </div>
    </div>
  );
}
