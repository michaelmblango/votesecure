import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

function superFetch(path, options = {}) {
  const token = localStorage.getItem("vs_super_token");
  return fetch(`${API}/api/super${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
}

function StatBlock({ label, value, color = "var(--ink)" }) {
  return (
    <div className="stat-card">
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function GenerateLicenceModal({ org, plans, onClose, onGenerated }) {
  const [planName, setPlanName] = useState("");
  const [notes, setNotes]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [result, setResult]     = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res  = await superFetch("/licences/generate", {
        method: "POST",
        body: JSON.stringify({ org_id: org.org_id, plan_name: planName, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed.");
      setResult(data);
      onGenerated();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal animate-in" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div style={{ fontWeight: 700, fontSize: "1.0625rem" }}>Generate Licence</div>
          <div style={{ fontSize: "0.8125rem", color: "var(--slate)", marginTop: 2 }}>{org.org_name}</div>
        </div>
        {result ? (
          <div className="modal-body">
            <div className="alert alert-success" style={{ borderRadius: 10, marginBottom: "1rem" }}>
              <span>✓</span>
              <div>
                <div style={{ fontWeight: 700 }}>Licence generated and emailed</div>
                <div style={{ fontSize: "0.8125rem" }}>Sent to {result.emailed_to}</div>
              </div>
            </div>
            <div style={{ background: "var(--ice)", borderRadius: 10, padding: "1.25rem", textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--slate)", marginBottom: "0.5rem" }}>Licence Code</div>
              <div style={{ fontFamily: "monospace", fontSize: "1.5rem", fontWeight: 800, color: "var(--navy)", letterSpacing: "0.1em" }}>{result.licence_code}</div>
              <div style={{ fontSize: "0.8125rem", color: "var(--slate)", marginTop: "0.5rem" }}>{result.plan} plan - up to {result.max_voters} voters</div>
            </div>
            <div className="modal-footer" style={{ marginTop: "1rem" }}>
              <button className="btn btn-navy" style={{ width: "100%" }} onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label className="input-label">Plan *</label>
                <select className="input" value={planName} onChange={e => setPlanName(e.target.value)} required>
                  <option value="">Select a plan</option>
                  {plans.filter(p => p.plan_name !== "free" && p.plan_name !== "custom").map(p => (
                    <option key={p.plan_id} value={p.plan_name}>
                      {p.plan_name.charAt(0).toUpperCase() + p.plan_name.slice(1)} - up to {p.max_voters} voters - ${Number(p.price_usd).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="input-label">Notes (payment reference etc.)</label>
                <textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. PayPal ref #ABC123 verified 2025-08-23" style={{ resize: "none" }} />
              </div>
              {error && <div className="alert alert-error" style={{ borderRadius: 8 }}><span>⚠</span> {error}</div>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-navy" disabled={loading || !planName}>
                {loading ? "Generating..." : "Generate and Email"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function OrgRow({ org, plans, onRefresh }) {
  const [showLicence, setShowLicence] = useState(false);
  const [busy, setBusy]               = useState(false);

  const statusBadge = {
    active:    "badge-green",
    pending:   "badge-amber",
    suspended: "badge-red",
  }[org.status] || "badge-slate";

  const handleAction = async (action) => {
    if (!window.confirm(`${action} ${org.org_name}?`)) return;
    setBusy(true);
    try {
      await superFetch(`/organisations/${org.org_id}/action`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      onRefresh();
    } catch {}
    finally { setBusy(false); }
  };

  return (
    <>
      <tr>
        <td>
          <div style={{ fontWeight: 600, color: "var(--ink)" }}>{org.org_name}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--slate)" }}>{org.contact_email}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--slate)" }}>
            Created: {new Date(org.created_at).toLocaleDateString("en-GB")}
          </div>
        </td>
        <td>
          <span className={`badge ${statusBadge}`} style={{ textTransform: "capitalize" }}>
            {org.status}
          </span>
        </td>
        <td style={{ fontSize: "0.875rem", color: "var(--slate)" }}>
          {org.admin_count} admins / {org.election_count} elections / {org.licence_count} licences
        </td>
        <td>
          <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowLicence(true)}>
              Generate Licence
            </button>
            {org.status === "pending" && (
              <button className="btn btn-success btn-sm" disabled={busy} onClick={() => handleAction("activate")}>
                Activate
              </button>
            )}
            {org.status === "active" && (
              <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => handleAction("suspend")}>
                Suspend
              </button>
            )}
            {org.status === "suspended" && (
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => handleAction("reactivate")}>
                Reactivate
              </button>
            )}
          </div>
        </td>
      </tr>
      {showLicence && (
        <GenerateLicenceModal
          org={org}
          plans={plans}
          onClose={() => setShowLicence(false)}
          onGenerated={onRefresh}
        />
      )}
    </>
  );
}

export default function SuperDashboard() {
  const navigate = useNavigate();
  const [stats,   setStats]   = useState(null);
  const [orgs,    setOrgs]    = useState([]);
  const [licences,setLicences]= useState([]);
  const [plans,   setPlans]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState("orgs");

  const load = useCallback(async () => {
    const token = localStorage.getItem("vs_super_token");
    if (!token) { navigate("/super/login"); return; }
    try {
      setLoading(true);
      const [sRes, oRes, lRes, pRes] = await Promise.all([
        superFetch("/stats"),
        superFetch("/organisations"),
        superFetch("/licences"),
        superFetch("/plans"),
      ]);
      if (sRes.status === 401 || sRes.status === 403) {
        localStorage.removeItem("vs_super_token");
        navigate("/super/login");
        return;
      }
      const [s, o, l, p] = await Promise.all([sRes.json(), oRes.json(), lRes.json(), pRes.json()]);
      setStats(s);
      setOrgs(o.organisations || []);
      setLicences(l.licences   || []);
      setPlans(p.plans         || []);
    } catch {}
    finally { setLoading(false); }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const handleLogout = () => {
    localStorage.removeItem("vs_super_token");
    navigate("/super/login");
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0A0F1E", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="spinner" style={{ borderTopColor: "#fff" }} />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--ice)" }}>
      {/* Super admin navbar */}
      <div style={{ background: "#0A0F1E", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "0 1.5rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.25rem" }}>🛡️</span>
            <div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: "0.9375rem" }}>VoteSecure Platform Admin</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.6875rem" }}>Super Admin Portal</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ color: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.15)" }} onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </div>

      <div className="page">
        {/* Stats */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(160px, 100%), 1fr))", gap: "1rem", marginBottom: "2rem" }}>
            <StatBlock label="Total Orgs"       value={stats.organisations.total}   color="var(--ink)"     />
            <StatBlock label="Active Orgs"      value={stats.organisations.active}  color="var(--confirm)" />
            <StatBlock label="Pending Orgs"     value={stats.organisations.pending} color="var(--amber)"   />
            <StatBlock label="Licences Issued"  value={stats.licences.total}        color="var(--blue)"    />
            <StatBlock label="Licences Used"    value={stats.licences.used}         color="var(--slate)"   />
            <StatBlock label="Total Elections"  value={stats.platform.elections}    color="var(--navy)"    />
            <StatBlock label="Total Voters"     value={stats.platform.voters}       color="var(--ink)"     />
            <StatBlock label="Total Votes Cast" value={stats.platform.votes}        color="var(--confirm)" />
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "2px solid var(--border)", paddingBottom: "0" }}>
          {[
            { key: "orgs",     label: "Organisations" },
            { key: "licences", label: "Licences"      },
            { key: "plans",    label: "Plans"         },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                padding: "0.625rem 1.25rem",
                fontWeight: tab === t.key ? 700 : 500,
                color: tab === t.key ? "var(--blue)" : "var(--slate)",
                background: "transparent",
                border: "none",
                borderBottom: tab === t.key ? "2px solid var(--blue)" : "2px solid transparent",
                marginBottom: -2,
                cursor: "pointer",
                fontSize: "0.9rem",
              }}>
              {t.label}
            </button>
          ))}
          <button onClick={load} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--slate)", fontSize: "0.8125rem" }}>
            Refresh
          </button>
        </div>

        {/* Organisations tab */}
        {tab === "orgs" && (
          <div className="card" style={{ overflow: "hidden" }}>
            {orgs.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "var(--slate)" }}>No organisations yet.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="data-table" style={{ minWidth: 640 }}>
                  <thead>
                    <tr>
                      <th>Organisation</th>
                      <th>Status</th>
                      <th>Stats</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orgs.map(o => <OrgRow key={o.org_id} org={o} plans={plans} onRefresh={load} />)}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Licences tab */}
        {tab === "licences" && (
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table className="data-table" style={{ minWidth: 700 }}>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Organisation</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {licences.map((l, i) => (
                    <tr key={i}>
                      <td><span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.875rem" }}>{l.licence_code}</span></td>
                      <td style={{ fontSize: "0.875rem" }}>{l.org_name || "N/A"}</td>
                      <td>
                        <span className="badge badge-blue" style={{ textTransform: "capitalize" }}>
                          {l.plan_name} / {l.max_voters} voters
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${l.status === "used" ? "badge-slate" : l.status === "unused" ? "badge-green" : "badge-red"}`}>
                          {l.status}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.8125rem", color: "var(--slate)" }}>
                        {new Date(l.created_at).toLocaleDateString("en-GB")}
                      </td>
                      <td style={{ fontSize: "0.8125rem", color: "var(--slate)", maxWidth: 200 }} className="truncate-2">
                        {l.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Plans tab */}
        {tab === "plans" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(240px, 100%), 1fr))", gap: "1rem" }}>
            {plans.map(p => (
              <div key={p.plan_id} className="card" style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                  <div style={{ fontWeight: 700, textTransform: "capitalize", color: "var(--ink)" }}>{p.plan_name}</div>
                  <span className={`badge ${p.is_active ? "badge-green" : "badge-red"}`}>
                    {p.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--navy)", marginBottom: "0.25rem" }}>
                  ${Number(p.price_usd).toFixed(2)}
                </div>
                <div style={{ fontSize: "0.8125rem", color: "var(--slate)" }}>
                  Up to {p.max_voters >= 99999 ? "1,000+" : p.max_voters.toLocaleString()} voters
                </div>
                <div style={{ fontSize: "0.8125rem", color: "var(--slate)", marginTop: "0.25rem" }}>{p.description}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
