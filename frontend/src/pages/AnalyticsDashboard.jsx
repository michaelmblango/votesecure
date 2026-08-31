import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { analyticsAPI } from "../services/api";

// ── Mini stat card ────────────────────────────────────────────
function Stat({ label, value, color = "var(--ink)", sub }) {
  return (
    <div className="stat-card">
      <div className="stat-value" style={{ color }}>
        {value ?? 0}
      </div>
      <div className="stat-label">{label}</div>
      {sub && (
        <div style={{ fontSize: "0.75rem", color: "var(--slate)",
                      marginTop: "0.25rem" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ── Turnout bar ───────────────────────────────────────────────
function TurnoutBar({ election }) {
  const pct = Number(election.turnout_pct) || 0;
  const statusColor = {
    active:   "var(--confirm)",
    closed:   "var(--slate)",
    archived: "var(--slate)",
  }[election.status] || "var(--slate)";

  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "center", marginBottom: "0.375rem",
                    gap: "0.5rem" }}>
        <div style={{ fontSize: "0.875rem", fontWeight: 600,
                      color: "var(--ink)", flex: 1,
                      overflow: "hidden", textOverflow: "ellipsis",
                      whiteSpace: "nowrap" }}>
          {election.title}
        </div>
        <div style={{ display: "flex", alignItems: "center",
                      gap: "0.625rem", flexShrink: 0 }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700,
                         color: statusColor,
                         textTransform: "capitalize" }}>
            {election.status}
          </span>
          <span style={{ fontSize: "0.9375rem", fontWeight: 800,
                         color: "var(--ink)" }}>
            {pct}%
          </span>
        </div>
      </div>
      <div className="progress-track">
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: pct >= 70
            ? "var(--confirm)"
            : pct >= 40
            ? "var(--blue)"
            : "var(--amber)",
          borderRadius: 999,
          transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>
      <div style={{ fontSize: "0.75rem", color: "var(--slate)",
                    marginTop: "0.25rem" }}>
        {election.voted} of {election.registered} voters
      </div>
    </div>
  );
}

// ── Activity sparkline (simple bar chart) ─────────────────────
function ActivityChart({ data }) {
  if (!data || data.length === 0) return (
    <div style={{ textAlign: "center", padding: "2rem",
                  color: "var(--slate)", fontSize: "0.875rem" }}>
      No activity data yet
    </div>
  );

  const max = Math.max(...data.map(d => d.event_count), 1);

  return (
    <div style={{ display: "flex", alignItems: "flex-end",
                  gap: 3, height: 80, padding: "0.5rem 0" }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              height: "100%" }}>
          <div
            title={`${d.day}: ${d.event_count} events`}
            style={{
              width: "100%",
              height: `${Math.max((d.event_count / max) * 100, 8)}%`,
              background: "var(--blue)",
              borderRadius: "3px 3px 0 0",
              opacity: 0.7 + (d.event_count / max) * 0.3,
              cursor: "default",
              transition: "opacity 0.2s",
            }}
          />
        </div>
      ))}
    </div>
  );
}

// ── Recent election row ───────────────────────────────────────
function ElectionRow({ election }) {
  const statusBadge = {
    active:   "badge-green",
    draft:    "badge-slate",
    closed:   "badge-red",
    archived: "badge-amber",
  }[election.status] || "badge-slate";

  const turnout = election.registered_count > 0
    ? Math.round((election.voted_count / election.registered_count) * 100)
    : 0;

  return (
    <tr>
      <td>
        <Link
          to={`/admin/elections/${election.election_id}`}
          style={{ fontWeight: 600, color: "var(--ink)",
                   textDecoration: "none" }}>
          {election.title}
        </Link>
        <div style={{ fontSize: "0.75rem", color: "var(--slate)",
                      marginTop: 2, textTransform: "capitalize" }}>
          {election.plan_name || "free"} plan
        </div>
      </td>
      <td>
        <span className={`badge ${statusBadge}`}
              style={{ textTransform: "capitalize" }}>
          {election.status}
        </span>
      </td>
      <td style={{ fontSize: "0.875rem",
                   color: "var(--slate)",
                   textAlign: "center" }}>
        {election.position_count}
      </td>
      <td style={{ fontSize: "0.875rem",
                   color: "var(--slate)",
                   textAlign: "center" }}>
        {election.vote_count}
      </td>
      <td>
        <div style={{ display: "flex", alignItems: "center",
                      gap: "0.5rem" }}>
          <div className="progress-track" style={{ flex: 1 }}>
            <div style={{
              height: "100%", width: `${turnout}%`,
              background: turnout >= 70
                ? "var(--confirm)"
                : "var(--blue)",
              borderRadius: 999,
            }} />
          </div>
          <span style={{ fontSize: "0.8125rem", fontWeight: 700,
                         color: "var(--ink)", flexShrink: 0 }}>
            {turnout}%
          </span>
        </div>
      </td>
    </tr>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function AnalyticsDashboard() {
  const navigate = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await analyticsAPI.orgOverview();
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load analytics.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center",
                  padding: "5rem 0" }}>
      <div className="spinner" />
    </div>
  );

  if (error) return (
    <div className="page">
      <div className="alert alert-error" style={{ borderRadius: 10 }}>
        <span>⚠</span> {error}
      </div>
    </div>
  );

  if (!data) return null;

  const { elections, voters, candidates,
          votes, licences, recent_elections,
          turnout_data, activity } = data;

  return (
    <div className="page">
      <button className="btn btn-ghost btn-sm"
              style={{ marginBottom: "1.5rem" }}
              onClick={() => navigate("/admin")}>
        Back to Dashboard
      </button>

      <div className="section-header">
        <div>
          <div className="section-title">Analytics</div>
          <div className="section-sub">
            Performance overview across all elections
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}>
          Refresh
        </button>
      </div>

      {/* ── TOP STATS ── */}
      <div style={{ display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(160px, 1fr))",
                    gap: "1rem",
                    marginBottom: "2rem" }}>
        <Stat label="Total Elections"
              value={elections.total_elections}
              color="var(--navy)" />
        <Stat label="Active Now"
              value={elections.active_elections}
              color="var(--confirm)" />
        <Stat label="Total Votes"
              value={votes.total_votes}
              color="var(--blue)" />
        <Stat label="Approved Voters"
              value={voters.total_approved}
              color="var(--ink)" />
        <Stat label="Pending Voters"
              value={voters.pending_approval}
              color="var(--amber)"
              sub="Need approval" />
        <Stat label="Candidates"
              value={candidates.total_approved}
              color="var(--ink)" />
        <Stat label="Licences Available"
              value={licences.available}
              color="var(--confirm)"
              sub={`${licences.used || 0} used`} />
        <Stat label="Pending Candidates"
              value={candidates.pending_approval}
              color="var(--amber)"
              sub="Need approval" />
      </div>

      {/* ── TWO COLUMN SECTION ── */}
      <div style={{ display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1.5rem",
                    marginBottom: "2rem" }}
           className="analytics-grid">

        {/* Turnout by election */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ fontWeight: 700, color: "var(--ink)",
                        marginBottom: "1.25rem",
                        fontSize: "0.9375rem" }}>
            Voter Turnout by Election
          </div>
          {turnout_data.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem 0",
                          color: "var(--slate)",
                          fontSize: "0.875rem" }}>
              No elections with voter data yet.
            </div>
          ) : (
            turnout_data.map((e, i) => (
              <TurnoutBar key={i} election={e} />
            ))
          )}
        </div>

        {/* Activity chart */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ fontWeight: 700, color: "var(--ink)",
                        marginBottom: "0.5rem",
                        fontSize: "0.9375rem" }}>
            Admin Activity — Last 30 Days
          </div>
          <div style={{ fontSize: "0.8125rem",
                        color: "var(--slate)",
                        marginBottom: "1rem" }}>
            {activity.length} active days,{" "}
            {activity.reduce((s, d) => s + d.event_count, 0)}{" "}
            total events
          </div>
          <ActivityChart data={activity} />

          {/* Voter breakdown */}
          <div style={{ marginTop: "1.5rem",
                        paddingTop: "1.25rem",
                        borderTop: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 700, color: "var(--ink)",
                          marginBottom: "0.875rem",
                          fontSize: "0.875rem" }}>
              Voter Registration Status
            </div>
            {[
              { label: "Approved",         value: voters.total_approved,  color: "var(--confirm)" },
              { label: "Pending Approval", value: voters.pending_approval,color: "var(--amber)"   },
              { label: "Invited",          value: voters.invite_pending,  color: "var(--slate)"   },
              { label: "Rejected",         value: voters.total_rejected,  color: "var(--danger)"  },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center",
                padding: "0.5rem 0",
                borderBottom: "1px solid var(--border)",
                fontSize: "0.875rem",
              }}>
                <div style={{ display: "flex",
                              alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ width: 10, height: 10,
                                borderRadius: "50%",
                                background: color,
                                flexShrink: 0 }} />
                  <span style={{ color: "var(--slate)" }}>
                    {label}
                  </span>
                </div>
                <span style={{ fontWeight: 700,
                               color: "var(--ink)" }}>
                  {value || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RECENT ELECTIONS TABLE ── */}
      <div className="card" style={{ overflow: "hidden",
                                     marginBottom: "2rem" }}>
        <div style={{ padding: "1.25rem 1.5rem",
                      borderBottom: "1px solid var(--border)",
                      fontWeight: 700, color: "var(--ink)" }}>
          Recent Elections
        </div>
        {recent_elections.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center",
                        color: "var(--slate)",
                        fontSize: "0.875rem" }}>
            No elections yet.{" "}
            <Link to="/admin" style={{ color: "var(--blue)" }}>
              Create your first election
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table"
                   style={{ minWidth: 600 }}>
              <thead>
                <tr>
                  <th>Election</th>
                  <th>Status</th>
                  <th style={{ textAlign: "center" }}>
                    Positions
                  </th>
                  <th style={{ textAlign: "center" }}>
                    Votes
                  </th>
                  <th>Turnout</th>
                </tr>
              </thead>
              <tbody>
                {recent_elections.map(e => (
                  <ElectionRow
                    key={e.election_id}
                    election={e}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── QUICK ACTIONS ── */}
      {(voters.pending_approval > 0 ||
        candidates.pending_approval > 0) && (
        <div className="card card-accent-amber"
             style={{ padding: "1.25rem 1.5rem" }}>
          <div style={{ fontWeight: 700, color: "var(--ink)",
                        marginBottom: "0.875rem" }}>
            Action Required
          </div>
          <div style={{ display: "flex", gap: "0.75rem",
                        flexWrap: "wrap" }}>
            {voters.pending_approval > 0 && (
              <Link to="/admin/voters"
                    className="btn btn-sm"
                    style={{ textDecoration: "none",
                             background: "var(--amber)",
                             color: "#fff", border: "none" }}>
                Review {voters.pending_approval} pending voter
                {voters.pending_approval !== 1 ? "s" : ""}
              </Link>
            )}
            {candidates.pending_approval > 0 && (
              <Link to="/admin/candidates/pending"
                    className="btn btn-sm"
                    style={{ textDecoration: "none",
                             background: "var(--amber)",
                             color: "#fff", border: "none" }}>
                Review {candidates.pending_approval} pending
                candidate
                {candidates.pending_approval !== 1 ? "s" : ""}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
