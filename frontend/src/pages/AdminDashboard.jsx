import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { electionsAPI, authAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

// ── Status config ─────────────────────────────────────────────
const STATUS = {
  draft:    { label: "Draft",    cls: "badge-slate", dot: "#94A3B8" },
  active:   { label: "Live",     cls: "badge-green", dot: "#059669" },
  closed:   { label: "Closed",   cls: "badge-red",   dot: "#DC2626" },
  archived: { label: "Archived", cls: "badge-amber",  dot: "#D97706" },
};

const NEXT = {
  draft:  { label: "Open Voting",  next: "active",   cls: "btn-success" },
  active: { label: "Close Voting", next: "closed",   cls: "btn-danger"  },
  closed: { label: "Archive",      next: "archived", cls: "btn-ghost"   },
};

function fmt(dt) {
  if (!dt) return "-";
  return new Date(dt).toLocaleString("en-GB", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });
}

// ── Create Election Modal ─────────────────────────────────────
function CreateElectionModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title:"", description:"", election_type:"single_choice",
    start_time:"", end_time:"", eligible_group:"", is_public_results: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await electionsAPI.create({
        ...form,
        eligible_group: form.eligible_group || null,
        start_time: new Date(form.start_time).toISOString(),
        end_time:   new Date(form.end_time).toISOString(),
      });
      onCreated(res.data.election);
      onClose();
    } catch (err) { setError(err.response?.data?.detail || "Failed to create election."); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal animate-in">
        <div className="modal-header">
          <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--ink)" }}>New Election</div>
          <div style={{ fontSize: "0.8125rem", color: "var(--slate)", marginTop: 2 }}>Configure the election details below</div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label className="input-label">Election Title *</label>
              <input className="input" value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. 2025 Student Union Election" required />
            </div>
            <div>
              <label className="input-label">Description</label>
              <textarea className="input" rows={2} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Brief description..." style={{ resize: "none" }} />
            </div>
            <div>
              <label className="input-label">Voting Method *</label>
              <select className="input" value={form.election_type} onChange={e => set("election_type", e.target.value)}>
                <option value="single_choice">Single choice - pick one candidate</option>
                <option value="multi_choice">Multi-choice - pick multiple candidates</option>
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label className="input-label">Start *</label>
                <input className="input" type="datetime-local" value={form.start_time} onChange={e => set("start_time", e.target.value)} required />
              </div>
              <div>
                <label className="input-label">End *</label>
                <input className="input" type="datetime-local" value={form.end_time} onChange={e => set("end_time", e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="input-label">Eligible Group</label>
              <input className="input" value={form.eligible_group} onChange={e => set("eligible_group", e.target.value)} placeholder="Leave blank for all voters" />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "0.625rem", cursor: "pointer", userSelect: "none" }}>
              <input type="checkbox" checked={form.is_public_results} onChange={e => set("is_public_results", e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--blue)" }} />
              <span style={{ fontSize: "0.875rem", color: "var(--ink)" }}>Show live results during voting</span>
            </label>
            {error && <div className="alert alert-error" style={{ borderRadius: 8 }}><span>⚠</span> {error}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-navy" disabled={loading}>
              {loading ? "Creating..." : "Create Election"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Register Voter Modal ──────────────────────────────────────
function RegisterVoterModal({ onClose }) {
  const fields = [
    { key:"full_name",        label:"Full Name *",         placeholder:"e.g. Aminata Koroma",    type:"text"     },
    { key:"email",            label:"Email Address *",      placeholder:"voter@college.edu",      type:"email"    },
    { key:"student_number",   label:"Student Number *",     placeholder:"e.g. CS/2021/042",       type:"text"     },
    { key:"password",         label:"Password *",           placeholder:"Min. 8 characters",      type:"password" },
    { key:"department",       label:"Department",           placeholder:"e.g. Computer Science",  type:"text"     },
    { key:"level",            label:"Level / Year",         placeholder:"e.g. 400",               type:"text"     },
    { key:"eligibility_group",label:"Eligibility Group",   placeholder:"e.g. undergraduate",     type:"text"     },
  ];
  const empty = { full_name:"", email:"", student_number:"", password:"", department:"", level:"", eligibility_group:"" };
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError]     = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(""); setSuccess(""); setLoading(true);
    try {
      await authAPI.register(form);
      setSuccess(`Voter "${form.full_name}" (${form.student_number}) registered.`);
      setForm(empty);
    } catch (err) { setError(err.response?.data?.detail || "Registration failed."); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal animate-in" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--ink)" }}>Register Voter</div>
          <div style={{ fontSize: "0.8125rem", color: "var(--slate)", marginTop: 2 }}>Add an eligible voter to the system</div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {fields.map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label className="input-label">{label}</label>
                <input className="input" type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} required={label.includes("*")} />
              </div>
            ))}
            {error   && <div className="alert alert-error"   style={{ borderRadius: 8 }}><span>⚠</span> {error}</div>}
            {success && <div className="alert alert-success" style={{ borderRadius: 8 }}><span>✓</span> {success}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
            <button type="submit" className="btn btn-success" disabled={loading}>
              {loading ? "Registering..." : "Register Voter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Election Card ─────────────────────────────────────────────
function ElectionCard({ election, onRefresh }) {
  const navigate    = useNavigate();
  const [busy, setBusy] = useState(false);
  const st  = STATUS[election.status] || STATUS.draft;
  const nx  = NEXT[election.status];

  const changeStatus = async () => {
    if (!nx) return;
    if (!window.confirm(`${nx.label} this election?`)) return;
    setBusy(true);
    try { await electionsAPI.updateStatus(election.election_id, nx.next); onRefresh(); }
    catch (err) { alert(err.response?.data?.detail || "Failed."); }
    finally { setBusy(false); }
  };

  const accentClass = { active:"card-accent-green", closed:"card-accent-red", archived:"card-accent-amber", draft:"card-accent-slate" }[election.status];

  return (
    <div className={`card ${accentClass} animate-in`} style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
      {/* Title row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem" }}>
        <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--ink)", lineHeight: 1.35, flex: 1 }}>
          {election.title}
        </div>
        <span className={`badge ${st.cls}`}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.dot }} />
          {st.label}
        </span>
      </div>

      {election.description && (
        <p className="truncate-2" style={{ fontSize: "0.875rem", color: "var(--slate)", margin: 0, lineHeight: 1.5 }}>
          {election.description}
        </p>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
        {[
          { label: "Positions",  value: election.total_positions  ?? "-" },
          { label: "Votes Cast", value: election.total_votes_cast ?? 0   },
          { label: "Type",       value: election.election_type === "single_choice" ? "Single" : "Multi" },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "var(--ice)", borderRadius: 8, padding: "0.5rem 0.625rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--ink)", lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: "0.6875rem", color: "var(--slate)", marginTop: 2, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Dates */}
      <div style={{ fontSize: "0.8rem", color: "var(--slate)", display: "flex", flexDirection: "column", gap: "0.125rem" }}>
        <span>Opens: {fmt(election.start_time)}</span>
        <span>Closes: {fmt(election.end_time)}</span>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
        <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => navigate(`/admin/elections/${election.election_id}`)}>
          Manage
        </button>
        {nx && (
          <button className={`btn ${nx.cls} btn-sm`} style={{ flex: 1 }} disabled={busy} onClick={changeStatus}>
            {busy ? "..." : nx.label}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────
export default function AdminDashboard() {
  const { user }  = useAuth();
  const [elections, setElections]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showCreate, setShowCreate]     = useState(false);
  const [showVoter, setShowVoter]       = useState(false);
  const [filter, setFilter]             = useState("all");

  const load = async () => {
    try { setLoading(true); const r = await electionsAPI.list(); setElections(r.data.elections || []); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const counts = {
    total:    elections.length,
    active:   elections.filter(e => e.status === "active").length,
    draft:    elections.filter(e => e.status === "draft").length,
    closed:   elections.filter(e => e.status === "closed").length,
  };

  const visible = filter === "all" ? elections : elections.filter(e => e.status === filter);

  return (
    <div className="page">

      {/* Header */}
      <div className="section-header">
        <div>
          <div className="section-title">Dashboard</div>
          <div className="section-sub">Welcome back, {user?.full_name}</div>
        </div>
        <div style={{ display: "flex", gap: "0.625rem" }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowVoter(true)}>+ Register Voter</button>
          <button className="btn btn-navy btn-sm"  onClick={() => setShowCreate(true)}>+ New Election</button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid-4" style={{ marginBottom: "2rem" }}>
        {[
          { label: "Total",  value: counts.total,  color: "var(--ink)"     },
          { label: "Live",   value: counts.active, color: "var(--confirm)" },
          { label: "Draft",  value: counts.draft,  color: "var(--slate)"   },
          { label: "Closed", value: counts.closed, color: "var(--danger)"  },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card">
            <div className="stat-value" style={{ color }}>{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {["all", "draft", "active", "closed", "archived"].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`btn btn-sm ${filter === s ? "btn-navy" : "btn-ghost"}`}
            style={{ textTransform: "capitalize" }}>
            {s === "all" ? "All Elections" : s}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "4rem 0" }}>
          <div className="spinner" />
        </div>
      ) : visible.length === 0 ? (
        <div style={{ textAlign: "center", padding: "5rem 0", color: "var(--slate)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>🗳️</div>
          <div style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--ink)" }}>No elections found</div>
          <div style={{ fontSize: "0.875rem", marginTop: "0.375rem" }}>
            {filter === "all" ? "Click \"New Election\" to create your first one." : `No elections with status "${filter}".`}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.25rem" }}>
          {visible.map(e => <ElectionCard key={e.election_id} election={e} onRefresh={load} />)}
        </div>
      )}

      {showCreate && <CreateElectionModal onClose={() => setShowCreate(false)} onCreated={load} />}
      {showVoter  && <RegisterVoterModal  onClose={() => setShowVoter(false)} />}
    </div>
  );
}
