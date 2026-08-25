import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { voterInviteAPI } from "../services/api";

function InviteVotersModal({ onClose, onSent }) {
  const [mode,    setMode]    = useState("single");
  const [email,   setEmail]   = useState("");
  const [bulk,    setBulk]    = useState("");
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState("");

  const handleSingle = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await voterInviteAPI.send({ email });
      setResult({ sent: 1, skipped: 0 });
      onSent();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to send invite.");
    } finally { setLoading(false); }
  };

  const handleBulk = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const emails = bulk
        .split(/[\n,;]/)
        .map(e => e.trim())
        .filter(e => e.includes("@"));
      if (emails.length === 0) {
        setError("No valid emails found.");
        setLoading(false);
        return;
      }
      const res = await voterInviteAPI.sendBulk({ emails });
      setResult(res.data);
      onSent();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed.");
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal animate-in" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div style={{ fontWeight: 700, fontSize: "1.0625rem" }}>
            Invite Voters
          </div>
          <div style={{ fontSize: "0.8125rem", color: "var(--slate)",
                        marginTop: 2 }}>
            Send registration links to voter email addresses
          </div>
        </div>

        {result ? (
          <div className="modal-body">
            <div className="alert alert-success"
                 style={{ borderRadius: 10 }}>
              <span>✓</span>
              <div>
                <div style={{ fontWeight: 700 }}>
                  {result.sent} invite{result.sent !== 1 ? "s" : ""} sent
                </div>
                {result.skipped > 0 && (
                  <div style={{ fontSize: "0.8125rem" }}>
                    {result.skipped} skipped (already invited)
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer" style={{ marginTop: "1rem" }}>
              <button className="btn btn-navy"
                      style={{ width: "100%" }}
                      onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex",
                          borderBottom: "1px solid var(--border)",
                          padding: "0 1.75rem" }}>
              {[
                { key: "single", label: "Single Email" },
                { key: "bulk",   label: "Bulk Emails"  },
              ].map(t => (
                <button key={t.key} onClick={() => setMode(t.key)}
                  style={{
                    padding: "0.75rem 1rem",
                    background: "none", border: "none",
                    borderBottom: mode === t.key
                      ? "2px solid var(--blue)"
                      : "2px solid transparent",
                    color: mode === t.key
                      ? "var(--blue)" : "var(--slate)",
                    fontWeight: mode === t.key ? 700 : 400,
                    cursor: "pointer", fontSize: "0.875rem",
                    marginBottom: -1,
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            {mode === "single" ? (
              <form onSubmit={handleSingle}>
                <div className="modal-body"
                     style={{ display: "flex", flexDirection: "column",
                              gap: "1rem" }}>
                  <div>
                    <label className="input-label">
                      Voter Email Address *
                    </label>
                    <input className="input" type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="voter@college.edu" required />
                  </div>
                  {error && (
                    <div className="alert alert-error"
                         style={{ borderRadius: 8 }}>
                      <span>⚠</span> {error}
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost"
                          onClick={onClose}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-navy"
                          disabled={loading}>
                    {loading ? "Sending..." : "Send Invite"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleBulk}>
                <div className="modal-body"
                     style={{ display: "flex", flexDirection: "column",
                              gap: "1rem" }}>
                  <div>
                    <label className="input-label">
                      Email Addresses *
                    </label>
                    <textarea className="input" rows={6}
                      value={bulk}
                      onChange={e => setBulk(e.target.value)}
                      placeholder={"voter1@college.edu\nvoter2@college.edu\nvoter3@college.edu\n\nOne per line, or separated by commas."}
                      style={{ resize: "vertical",
                               fontFamily: "monospace",
                               fontSize: "0.8125rem" }}
                    />
                    <div style={{ fontSize: "0.75rem",
                                  color: "var(--slate)",
                                  marginTop: "0.375rem" }}>
                      One email per line, or separated by commas.
                      Maximum 100 per batch.
                    </div>
                  </div>
                  {error && (
                    <div className="alert alert-error"
                         style={{ borderRadius: 8 }}>
                      <span>⚠</span> {error}
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost"
                          onClick={onClose}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-navy"
                          disabled={loading}>
                    {loading ? "Sending..." : "Send All Invites"}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PendingVoterCard({ voter, onDecision }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handle = async (approved) => {
    setLoading(true); setError("");
    try {
      const res = await voterInviteAPI.decide(
        voter.invite_id, { approved }
      );
      onDecision(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed.");
    } finally { setLoading(false); }
  };

  const pendingCount = voter.approvals_needed - (voter.approval_votes?.length || 0);

  return (
    <div className="card card-accent-blue animate-in"
         style={{ padding: "1.25rem 1.5rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "1rem", marginBottom: "0.875rem" }}>
        <div>
          <div style={{ fontWeight: 700, color: "var(--ink)",
                        fontSize: "1rem" }}>
            {voter.voter_name || "Pending registration"}
          </div>
          <div style={{ fontSize: "0.8125rem",
                        color: "var(--slate)", marginTop: 2 }}>
            {voter.email}
          </div>
          {voter.student_number && (
            <div style={{ fontSize: "0.8125rem", color: "var(--slate)" }}>
              {voter.student_number}
              {voter.department ? ` · ${voter.department}` : ""}
              {voter.level ? ` · Level ${voter.level}` : ""}
            </div>
          )}
        </div>
        <span className="badge badge-amber">Pending</span>
      </div>

      <div style={{ marginBottom: "0.875rem" }}>
        <div style={{ fontSize: "0.75rem", color: "var(--slate)",
                      marginBottom: "0.375rem" }}>
          {voter.approvals_given} of {voter.approvals_needed} approvals
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{
            width: `${(voter.approvals_given / voter.approvals_needed) * 100}%`,
            background: "var(--blue)",
          }} />
        </div>
      </div>

      {voter.approval_votes && voter.approval_votes.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap",
                      gap: "0.375rem", marginBottom: "0.875rem" }}>
          {voter.approval_votes.map((v, i) => (
            <span key={i}
                  className={`badge ${v.approved ? "badge-green" : "badge-red"}`}>
              {v.approved ? "✓" : "✗"} {v.admin_name}
            </span>
          ))}
          {Array.from({ length: pendingCount }).map((_, i) => (
            <span key={`pending-${i}`} className="badge badge-slate">
              Awaiting vote
            </span>
          ))}
        </div>
      )}

      {error && (
        <div className="alert alert-error"
             style={{ borderRadius: 8, marginBottom: "0.75rem" }}>
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

export default function VoterManagementPage() {
  const navigate = useNavigate();
  const [tab,        setTab]        = useState("pending");
  const [pending,    setPending]    = useState([]);
  const [allInvites, setAllInvites] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pendRes, allRes] = await Promise.all([
        voterInviteAPI.pendingApprovals(),
        voterInviteAPI.list(),
      ]);
      setPending(pendRes.data.pending   || []);
      setAllInvites(allRes.data.invites || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const statusBadge = (status) => ({
    pending:    "badge-amber",
    registered: "badge-blue",
    approved:   "badge-green",
    rejected:   "badge-red",
    expired:    "badge-slate",
  }[status] || "badge-slate");

  return (
    <div className="page">
      <button className="btn btn-ghost btn-sm"
              style={{ marginBottom: "1.5rem" }}
              onClick={() => navigate("/admin")}>
        Back to Dashboard
      </button>

      <div className="section-header">
        <div>
          <div className="section-title">Voter Management</div>
          <div className="section-sub">
            Invite voters, approve registrations, manage eligibility
          </div>
        </div>
        <button className="btn btn-navy btn-sm"
                onClick={() => setShowInvite(true)}>
          + Invite Voters
        </button>
      </div>

      <div style={{ display: "flex", gap: "0.5rem",
                    marginBottom: "1.5rem",
                    borderBottom: "2px solid var(--border)",
                    paddingBottom: 0 }}>
        {[
          { key: "pending", label: "Pending Approval",
            count: pending.length },
          { key: "all",     label: "All Invites", count: null },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "0.625rem 1rem",
            background: "none", border: "none",
            borderBottom: tab === t.key
              ? "2px solid var(--blue)"
              : "2px solid transparent",
            color: tab === t.key ? "var(--blue)" : "var(--slate)",
            fontWeight: tab === t.key ? 700 : 400,
            cursor: "pointer", fontSize: "0.875rem",
            marginBottom: -2,
            display: "flex", alignItems: "center", gap: "0.5rem",
          }}>
            {t.label}
            {t.count !== null && t.count > 0 && (
              <span style={{
                background: "var(--amber)", color: "#fff",
                borderRadius: 999, fontSize: "0.6875rem",
                fontWeight: 800,
                padding: "0.125rem 0.375rem",
                minWidth: 18, textAlign: "center",
              }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center",
                      padding: "4rem 0" }}>
          <div className="spinner" />
        </div>
      ) : tab === "pending" ? (
        pending.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 0",
                        color: "var(--slate)" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✓</div>
            <div style={{ fontWeight: 700, color: "var(--ink)",
                          marginBottom: "0.375rem" }}>
              No pending approvals
            </div>
            <div style={{ fontSize: "0.875rem" }}>
              All registered voters have been reviewed.
            </div>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(320px, 100%), 1fr))",
            gap: "1.25rem",
          }}>
            {pending.map(v => (
              <PendingVoterCard
                key={v.invite_id}
                voter={v}
                onDecision={load}
              />
            ))}
          </div>
        )
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          {allInvites.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center",
                          color: "var(--slate)" }}>
              No invites sent yet. Click Invite Voters to get started.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table" style={{ minWidth: 600 }}>
                <thead>
                  <tr>
                    <th>Voter</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Invited</th>
                    <th>Approvals</th>
                  </tr>
                </thead>
                <tbody>
                  {allInvites.map(inv => (
                    <tr key={inv.invite_id}>
                      <td style={{ fontWeight: 600 }}>
                        {inv.voter_name || "Not yet registered"}
                      </td>
                      <td style={{ fontSize: "0.875rem",
                                   color: "var(--slate)" }}>
                        {inv.email}
                      </td>
                      <td>
                        <span className={`badge ${statusBadge(inv.status)}`}
                              style={{ textTransform: "capitalize" }}>
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.8125rem",
                                   color: "var(--slate)" }}>
                        {new Date(inv.created_at)
                          .toLocaleDateString("en-GB")}
                      </td>
                      <td style={{ fontSize: "0.875rem" }}>
                        {inv.approvals_given}/{inv.approvals_needed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showInvite && (
        <InviteVotersModal
          onClose={() => setShowInvite(false)}
          onSent={load}
        />
      )}
    </div>
  );
}
