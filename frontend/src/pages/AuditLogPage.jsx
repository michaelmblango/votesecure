import { useState, useEffect, useCallback } from "react";
import { analyticsAPI } from "../services/api";

const EVENT_STYLE = {
  LOGIN_SUCCESS:           { cls:"badge-green",  icon:"✓" },
  LOGIN_FAILED_PASSWORD:   { cls:"badge-red",    icon:"✗" },
  LOGIN_FAILED_OTP:        { cls:"badge-red",    icon:"✗" },
  LOGIN_PASSWORD_OK:       { cls:"badge-blue",   icon:"🔑" },
  VOTE_CAST:               { cls:"badge-blue",   icon:"🗳" },
  VOTER_REGISTERED:        { cls:"badge-green",  icon:"👤" },
  ELECTION_CREATED:        { cls:"badge-slate",  icon:"📋" },
  ELECTION_OPENED:         { cls:"badge-green",  icon:"▶" },
  ELECTION_CLOSED:         { cls:"badge-red",    icon:"■" },
  ELECTION_ARCHIVED:       { cls:"badge-amber",  icon:"📦" },
  CANDIDATE_REGISTERED:    { cls:"badge-slate",  icon:"🙋" },
  CANDIDATE_STATUS_UPDATED:{ cls:"badge-amber",  icon:"✏" },
  LOGOUT:                  { cls:"badge-slate",  icon:"→" },
};
const DEF = { cls:"badge-slate", icon:"·" };

function fmt(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("en-GB", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit", second:"2-digit" });
}

function LogRow({ log, index }) {
  const [open, setOpen] = useState(false);
  const s = EVENT_STYLE[log.event_type] || DEF;

  return (
    <div style={{ borderBottom:"1px solid var(--border)", background: index % 2 === 0 ? "#fff" : "var(--ice)" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width:"100%", textAlign:"left", padding:"0.75rem 1.25rem",
        display:"flex", alignItems:"center", gap:"0.875rem",
        cursor:"pointer", background:"transparent", border:"none",
      }}>
        <span className={`badge ${s.cls}`} style={{ flexShrink:0, minWidth:120, justifyContent:"flex-start" }}>
          {s.icon} {(log.event_type || "UNKNOWN").replace(/_/g, " ")}
        </span>
        <span className="audit-col-actor" style={{ fontSize:"0.875rem", fontWeight:600, color:"var(--ink)", width:160, flexShrink:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {log.actor_name || "System"}
        </span>
        <span style={{ fontSize:"0.875rem", color:"var(--slate)", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {log.event_description || "-"}
        </span>
        <span className="audit-col-time" style={{ fontSize:"0.8rem", color:"var(--slate)", flexShrink:0, fontFamily:"monospace" }}>
          {fmt(log.timestamp)}
        </span>
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink:0, color:"var(--slate)", transform: open ? "rotate(180deg)" : undefined, transition:"transform 0.2s" }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
      {open && (
        <div className="animate-in audit-detail-grid" style={{ padding:"0.875rem 1.25rem 1.125rem", borderTop:"1px solid var(--border)" }}>
          {[
            ["Actor",      log.actor_name || "System"],
            ["Actor Type", log.actor_type  || "-"],
            ["Event",      log.event_type  || "-"],
            ["IP Address", log.ip_address  || "-"],
            ["Timestamp",  fmt(log.timestamp)],
            ["Log ID",     String(log.log_id || "").slice(0, 8) + "..."],
          ].map(([label, value]) => (
            <div key={label} style={{ background:"#fff", border:"1px solid var(--border)", borderRadius:8, padding:"0.75rem" }}>
              <div style={{ fontSize:"0.6875rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:"var(--slate)", marginBottom:3 }}>{label}</div>
              <div style={{ fontSize:"0.875rem", fontWeight:600, color:"var(--ink)" }}>{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AuditLogPage() {
  const [logs,        setLogs]       = useState([]);
  const [filtered,    setFiltered]   = useState([]);
  const [loading,     setLoading]    = useState(true);
  const [search,      setSearch]     = useState("");
  const [eventFilter, setEvent]      = useState("ALL");
  const [actorFilter, setActor]      = useState("ALL");
  const [limit,       setLimit]      = useState(100);
  const [refreshed,   setRefreshed]  = useState(null);

  const load = useCallback(async () => {
    try { setLoading(true); const r = await analyticsAPI.auditLogs(limit); setLogs(r.data.audit_logs || []); setRefreshed(new Date()); }
    catch {} finally { setLoading(false); }
  }, [limit]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let r = [...logs];
    if (search.trim()) { const s = search.toLowerCase(); r = r.filter(l => (l.event_type||"").toLowerCase().includes(s) || (l.event_description||"").toLowerCase().includes(s) || (l.actor_name||"").toLowerCase().includes(s) || (l.ip_address||"").includes(s)); }
    if (eventFilter !== "ALL") r = r.filter(l => l.event_type === eventFilter);
    if (actorFilter !== "ALL") r = r.filter(l => l.actor_type === actorFilter);
    setFiltered(r);
  }, [logs, search, eventFilter, actorFilter]);

  const eventTypes = ["ALL", ...new Set(logs.map(l => l.event_type).filter(Boolean))];

  const counts = {
    logins:   logs.filter(l => l.event_type === "LOGIN_SUCCESS").length,
    failures: logs.filter(l => l.event_type?.startsWith("LOGIN_FAILED")).length,
    votes:    logs.filter(l => l.event_type === "VOTE_CAST").length,
    admin:    logs.filter(l => l.actor_type === "admin").length,
  };

  return (
    <div className="page">
      <div className="section-header">
        <div>
          <div className="section-title">Audit Log</div>
          <div className="section-sub">
            Complete system event trail
            {refreshed && <span style={{ marginLeft:"0.5rem" }}>· Updated {refreshed.toLocaleTimeString()}</span>}
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ animation: loading ? "spin 0.7s linear infinite" : undefined }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid-4" style={{ marginBottom:"1.75rem" }}>
        {[
          { label:"Successful Logins", value: counts.logins,   color:"var(--confirm)" },
          { label:"Failed Attempts",   value: counts.failures, color:"var(--danger)"  },
          { label:"Votes Cast",        value: counts.votes,    color:"var(--blue)"    },
          { label:"Admin Actions",     value: counts.admin,    color:"var(--navy)"    },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card">
            <div className="stat-value" style={{ color }}>{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ padding:"1rem 1.25rem", marginBottom:"1.25rem", display:"flex", gap:"0.75rem", flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ position:"relative", flex:"1 1 200px" }}>
          <input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events, users, IPs..." style={{ paddingLeft:"2.25rem" }} />
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ position:"absolute", left:"0.75rem", top:"50%", transform:"translateY(-50%)", color:"var(--slate)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
        <select className="input" value={eventFilter} onChange={e => setEvent(e.target.value)} style={{ width:"auto", flex:"0 0 auto" }}>
          {eventTypes.map(t => <option key={t} value={t}>{t === "ALL" ? "All Events" : t.replace(/_/g," ")}</option>)}
        </select>
        <select className="input" value={actorFilter} onChange={e => setActor(e.target.value)} style={{ width:"auto", flex:"0 0 auto" }}>
          {["ALL","voter","admin","system"].map(a => <option key={a} value={a}>{a === "ALL" ? "All Actors" : a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
        </select>
        <select className="input" value={limit} onChange={e => setLimit(Number(e.target.value))} style={{ width:"auto", flex:"0 0 auto" }}>
          {[50,100,250,500].map(n => <option key={n} value={n}>Last {n}</option>)}
        </select>
      </div>

      {/* Count */}
      <div style={{ fontSize:"0.875rem", color:"var(--slate)", marginBottom:"0.875rem", display:"flex", alignItems:"center", gap:"0.75rem" }}>
        <span>Showing <strong style={{ color:"var(--ink)" }}>{filtered.length}</strong> of <strong>{logs.length}</strong> events</span>
        {(search || eventFilter !== "ALL" || actorFilter !== "ALL") && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(""); setEvent("ALL"); setActor("ALL"); }}>Clear filters</button>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ overflow:"hidden" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:"0.875rem", padding:"0.625rem 1.25rem", borderBottom:"2px solid var(--border)", background:"#FAFBFD" }}>
          <span style={{ minWidth:120, fontSize:"0.75rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:"var(--slate)" }}>Event</span>
          <span className="audit-col-actor" style={{ width:160, fontSize:"0.75rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:"var(--slate)" }}>Actor</span>
          <span style={{ flex:1, fontSize:"0.75rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:"var(--slate)" }}>Description</span>
          <span className="audit-col-time" style={{ fontSize:"0.75rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:"var(--slate)" }}>Time</span>
          <span style={{ width:16 }} />
        </div>

        {loading && logs.length === 0 ? (
          <div style={{ display:"flex", justifyContent:"center", padding:"4rem 0" }}><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"4rem 0", color:"var(--slate)" }}>
            <div style={{ fontSize:"2.5rem", marginBottom:"0.75rem" }}>🔍</div>
            <div style={{ fontWeight:600, color:"var(--ink)" }}>No events match</div>
          </div>
        ) : (
          filtered.map((log, i) => <LogRow key={log.log_id} log={log} index={i} />)
        )}
      </div>
    </div>
  );
}
