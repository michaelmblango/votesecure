// src/pages/AuditLogPage.jsx
// Admin-only audit log viewer
// Shows every system event with filtering and search

import { useState, useEffect, useCallback } from "react";
import { analyticsAPI } from "../services/api";

// ── Event type colour coding ──────────────────────────
const EVENT_STYLES = {
  LOGIN_SUCCESS:          { bg: "bg-green-100",  text: "text-green-700",  icon: "✅" },
  LOGIN_FAILED_PASSWORD:  { bg: "bg-red-100",    text: "text-red-700",    icon: "❌" },
  LOGIN_FAILED_OTP:       { bg: "bg-red-100",    text: "text-red-700",    icon: "❌" },
  LOGIN_PASSWORD_OK:      { bg: "bg-blue-100",   text: "text-blue-700",   icon: "🔑" },
  VOTE_CAST:              { bg: "bg-purple-100", text: "text-purple-700", icon: "🗳️" },
  VOTER_REGISTERED:       { bg: "bg-cyan-100",   text: "text-cyan-700",   icon: "👤" },
  ELECTION_CREATED:       { bg: "bg-indigo-100", text: "text-indigo-700", icon: "📋" },
  ELECTION_OPENED:        { bg: "bg-green-100",  text: "text-green-700",  icon: "🟢" },
  ELECTION_CLOSED:        { bg: "bg-red-100",    text: "text-red-700",    icon: "🔒" },
  ELECTION_ARCHIVED:      { bg: "bg-yellow-100", text: "text-yellow-700", icon: "📦" },
  CANDIDATE_REGISTERED:   { bg: "bg-teal-100",   text: "text-teal-700",   icon: "🙋" },
  CANDIDATE_STATUS_UPDATED:{ bg:"bg-orange-100", text: "text-orange-700", icon: "✏️" },
  POSITION_ADDED:         { bg: "bg-sky-100",    text: "text-sky-700",    icon: "➕" },
  LOGOUT:                 { bg: "bg-gray-100",   text: "text-gray-600",   icon: "🚪" },
};

const DEFAULT_STYLE = { bg: "bg-gray-100", text: "text-gray-600", icon: "ℹ️" };

function getStyle(eventType) {
  return EVENT_STYLES[eventType] || DEFAULT_STYLE;
}

// ── Format timestamp ──────────────────────────────────
function formatTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

// ════════════════════════════════════════════════════
// LOG ROW
// ════════════════════════════════════════════════════
function LogRow({ log, index }) {
  const [expanded, setExpanded] = useState(false);
  const style = getStyle(log.event_type);

  return (
    <div
      className={`border border-gray-100 rounded-xl overflow-hidden
                  transition-shadow hover:shadow-sm
                  ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
      {/* Main row */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left px-4 py-3 flex items-center gap-3">
        {/* Event badge */}
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium
                          whitespace-nowrap flex-shrink-0
                          ${style.bg} ${style.text}`}>
          {style.icon} {log.event_type?.replace(/_/g, " ")}
        </span>

        {/* Actor */}
        <span className="text-sm text-navy font-medium truncate flex-shrink-0
                         w-32 hidden sm:block">
          {log.actor_name || "System"}
        </span>

        {/* Description */}
        <span className="text-gray-500 text-sm truncate flex-1">
          {log.event_description || "—"}
        </span>

        {/* Timestamp */}
        <span className="text-gray-400 text-xs flex-shrink-0 hidden md:block">
          {formatTime(log.timestamp)}
        </span>

        {/* Expand chevron */}
        <svg
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform
                      ${expanded ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round"
                strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 grid grid-cols-2 sm:grid-cols-3 gap-3
                        border-t border-gray-100">
          {[
            { label: "Actor",       value: log.actor_name || "System" },
            { label: "Actor Type",  value: log.actor_type  || "—" },
            { label: "Event Type",  value: log.event_type  || "—" },
            { label: "IP Address",  value: log.ip_address  || "—" },
            { label: "Timestamp",   value: formatTime(log.timestamp) },
            { label: "Log ID",      value: String(log.log_id).slice(0, 8) + "..." },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white border border-gray-100
                                        rounded-lg px-3 py-2">
              <p className="text-gray-400 text-xs uppercase tracking-wide">
                {label}
              </p>
              <p className="text-navy text-sm font-medium mt-0.5 break-all">
                {value}
              </p>
            </div>
          ))}
          {log.details && Object.keys(log.details).length > 0 && (
            <div className="col-span-2 sm:col-span-3 bg-gray-900 rounded-lg
                            px-3 py-2">
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">
                Extra Details
              </p>
              <pre className="text-green-400 text-xs overflow-x-auto">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ════════════════════════════════════════════════════
// STATS STRIP
// ════════════════════════════════════════════════════
function StatsStrip({ logs }) {
  const counts = {
    logins:   logs.filter((l) => l.event_type === "LOGIN_SUCCESS").length,
    failures: logs.filter((l) => l.event_type?.startsWith("LOGIN_FAILED")).length,
    votes:    logs.filter((l) => l.event_type === "VOTE_CAST").length,
    admin:    logs.filter((l) => l.actor_type === "admin").length,
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {[
        { label: "Successful Logins", value: counts.logins,   color: "text-green-600",  bg: "bg-green-50"  },
        { label: "Failed Attempts",   value: counts.failures, color: "text-red-600",    bg: "bg-red-50"    },
        { label: "Votes Cast",        value: counts.votes,    color: "text-purple-600", bg: "bg-purple-50" },
        { label: "Admin Actions",     value: counts.admin,    color: "text-navy",       bg: "bg-blue-50"   },
      ].map(({ label, value, color, bg }) => (
        <div key={label} className={`${bg} rounded-xl p-4 text-center border border-gray-100`}>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
          <p className="text-gray-500 text-xs mt-1">{label}</p>
        </div>
      ))}
    </div>
  );
}


// ════════════════════════════════════════════════════
// MAIN AUDIT LOG PAGE
// ════════════════════════════════════════════════════
export default function AuditLogPage() {
  const [logs,          setLogs]         = useState([]);
  const [filtered,      setFiltered]     = useState([]);
  const [loading,       setLoading]      = useState(true);
  const [search,        setSearch]       = useState("");
  const [eventFilter,   setEventFilter]  = useState("ALL");
  const [actorFilter,   setActorFilter]  = useState("ALL");
  const [limit,         setLimit]        = useState(100);
  const [lastRefresh,   setLastRefresh]  = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await analyticsAPI.auditLogs(limit);
      setLogs(res.data.audit_logs || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => { load(); }, [load]);

  // Apply filters whenever logs, search, or filters change
  useEffect(() => {
    let result = [...logs];

    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter((l) =>
        l.event_type?.toLowerCase().includes(s) ||
        l.event_description?.toLowerCase().includes(s) ||
        l.actor_name?.toLowerCase().includes(s) ||
        l.ip_address?.includes(s)
      );
    }
    if (eventFilter !== "ALL") {
      result = result.filter((l) => l.event_type === eventFilter);
    }
    if (actorFilter !== "ALL") {
      result = result.filter((l) => l.actor_type === actorFilter);
    }
    setFiltered(result);
  }, [logs, search, eventFilter, actorFilter]);

  // Unique event types for filter dropdown
  const eventTypes = ["ALL", ...new Set(logs.map((l) => l.event_type).filter(Boolean))];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center
                      justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">🔍 Audit Log</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Complete record of all system events
            {lastRefresh && (
              <span className="ml-2 text-gray-400">
                · Last updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={load} disabled={loading}
          className="flex items-center gap-2 bg-brand text-white
                     px-4 py-2.5 rounded-lg text-sm font-semibold
                     hover:bg-blue-700 transition-colors disabled:opacity-60">
          <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* ── Stats ── */}
      {logs.length > 0 && <StatsStrip logs={logs} />}

      {/* ── Filters ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5
                      flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4
                          text-gray-400" fill="none" stroke="currentColor"
               viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events, users, IP addresses..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg
                       text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        {/* Event type filter */}
        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand
                     bg-white min-w-[160px]">
          {eventTypes.map((t) => (
            <option key={t} value={t}>
              {t === "ALL" ? "All Event Types" : t.replace(/_/g, " ")}
            </option>
          ))}
        </select>

        {/* Actor type filter */}
        <select
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand bg-white">
          {["ALL", "voter", "admin", "system"].map((a) => (
            <option key={a} value={a}>
              {a === "ALL" ? "All Actors" : a.charAt(0).toUpperCase() + a.slice(1)}
            </option>
          ))}
        </select>

        {/* Limit */}
        <select
          value={limit}
          onChange={(e) => { setLimit(Number(e.target.value)); load(); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand bg-white">
          {[50, 100, 250, 500].map((n) => (
            <option key={n} value={n}>Last {n}</option>
          ))}
        </select>
      </div>

      {/* ── Results count ── */}
      <p className="text-gray-500 text-sm mb-3">
        Showing <span className="font-semibold text-navy">{filtered.length}</span>
        {" "}of <span className="font-semibold">{logs.length}</span> events
        {(search || eventFilter !== "ALL" || actorFilter !== "ALL") && (
          <button
            onClick={() => { setSearch(""); setEventFilter("ALL"); setActorFilter("ALL"); }}
            className="ml-3 text-brand underline text-xs">
            Clear filters
          </button>
        )}
      </p>

      {/* ── Log list ── */}
      {loading && logs.length === 0 ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-brand border-t-transparent
                          rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <span className="text-5xl block mb-3">🔍</span>
          <p className="font-medium">No events match your filters</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((log, i) => (
            <LogRow key={log.log_id} log={log} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}