import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { electionsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

const STATUS = {
  draft:    { label: "Draft",  cls: "badge-slate" },
  active:   { label: "Live",   cls: "badge-green" },
  closed:   { label: "Closed", cls: "badge-red"   },
  archived: { label: "Archived",cls:"badge-amber"  },
};
const NEXT = {
  draft:  { label: "Open Voting",  next: "active",   cls: "btn-success" },
  active: { label: "Close Voting", next: "closed",   cls: "btn-danger"  },
  closed: { label: "Archive",      next: "archived", cls: "btn-ghost"   },
};

// ── Add Position Modal ────────────────────────────────────────
function AddPositionModal({ electionId, onClose, onAdded }) {
  const [form, setForm] = useState({ position_name:"", description:"", max_votes:1, display_order:0 });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError("");
    try { await electionsAPI.addPosition(electionId, { ...form, max_votes: Number(form.max_votes) }); onAdded(); onClose(); }
    catch (err) { setError(err.response?.data?.detail || "Failed."); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal animate-in" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <div style={{ fontSize: "1.125rem", fontWeight: 700 }}>Add Position</div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display:"flex", flexDirection:"column", gap:"0.875rem" }}>
            <div>
              <label className="input-label">Position Name *</label>
              <input className="input" value={form.position_name} onChange={e => setForm(f => ({...f, position_name: e.target.value}))} placeholder="e.g. Student Union President" required />
            </div>
            <div>
              <label className="input-label">Description</label>
              <textarea className="input" rows={2} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} style={{ resize:"none" }} />
            </div>
            <div>
              <label className="input-label">Max Votes Per Voter</label>
              <input className="input" type="number" min={1} value={form.max_votes} onChange={e => setForm(f => ({...f, max_votes: e.target.value}))} />
            </div>
            {error && <div className="alert alert-error" style={{ borderRadius:8 }}><span>⚠</span> {error}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-navy" disabled={loading}>{loading ? "Adding..." : "Add Position"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Candidate Modal ───────────────────────────────────────
function AddCandidateModal({ electionId, positionId, positionName, onClose, onAdded }) {
  const [form, setForm] = useState({ display_name:"", manifesto:"", display_order:0 });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError("");
    try { await electionsAPI.addCandidate(electionId, positionId, { ...form, photo_url: null }); onAdded(); onClose(); }
    catch (err) { setError(err.response?.data?.detail || "Failed."); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal animate-in" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <div style={{ fontSize: "1.125rem", fontWeight: 700 }}>Add Candidate</div>
          <div style={{ fontSize: "0.8rem", color: "var(--slate)", marginTop:2 }}>Position: {positionName}</div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display:"flex", flexDirection:"column", gap:"0.875rem" }}>
            <div>
              <label className="input-label">Candidate Name *</label>
              <input className="input" value={form.display_name} onChange={e => setForm(f => ({...f, display_name: e.target.value}))} placeholder="e.g. Aminata Koroma" required />
            </div>
            <div>
              <label className="input-label">Manifesto / Bio</label>
              <textarea className="input" rows={4} value={form.manifesto} onChange={e => setForm(f => ({...f, manifesto: e.target.value}))} placeholder="Key promises or background..." style={{ resize:"none" }} />
            </div>
            {error && <div className="alert alert-error" style={{ borderRadius:8 }}><span>⚠</span> {error}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-navy" disabled={loading}>{loading ? "Adding..." : "Add Candidate"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Candidate Row ─────────────────────────────────────────────
function CandidateRow({ candidate, electionId, electionStatus, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const approval = async (status) => {
    setLoading(true);
    try { await electionsAPI.approveCandidate(electionId, candidate.candidate_id, status); onUpdate(); }
    catch (err) { alert(err.response?.data?.detail || "Failed."); }
    finally { setLoading(false); }
  };
  const badgeCls = { approved:"badge-green", pending:"badge-amber", rejected:"badge-red" }[candidate.approval_status];

  return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:"0.875rem", padding:"0.875rem 0", borderBottom:"1px solid var(--border)" }}>
      <div style={{ width:40, height:40, borderRadius:"50%", background:"var(--ice)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:"1.125rem", color:"var(--blue)", flexShrink:0, border:"2px solid var(--blue-lt)" }}>
        {candidate.display_name.charAt(0).toUpperCase()}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:600, color:"var(--ink)", fontSize:"0.9375rem" }}>{candidate.display_name}</div>
        {candidate.manifesto && (
          <details style={{ marginTop: 4 }}>
            <summary style={{
              fontSize: "0.8125rem", color: "var(--blue)",
              cursor: "pointer", fontWeight: 600, listStyle: "none",
            }}>
              View manifesto
            </summary>
            <div style={{
              fontSize: "0.8125rem", color: "var(--slate)",
              marginTop: "0.5rem", lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              padding: "0.75rem",
              background: "var(--ice)",
              borderRadius: 8,
            }}>
              {candidate.manifesto}
            </div>
          </details>
        )}
        <span className={`badge ${badgeCls}`} style={{ marginTop:6 }}>{candidate.approval_status}</span>
      </div>
      {electionStatus === "draft" && (
        <div style={{ display:"flex", gap:"0.375rem", flexShrink:0 }}>
          {candidate.approval_status !== "approved" && (
            <button className="btn btn-success btn-sm" disabled={loading} onClick={() => approval("approved")}>Approve</button>
          )}
          {candidate.approval_status !== "rejected" && (
            <button className="btn btn-danger btn-sm" disabled={loading} onClick={() => approval("rejected")}>Reject</button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Position Panel ────────────────────────────────────────────
function PositionPanel({ position, election, onUpdate }) {
  const { isOwner } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const approved = position.candidates?.filter(c => c.approval_status === "approved").length ?? 0;

  return (
    <div className="card" style={{ overflow:"hidden" }}>
      <div style={{ padding:"1rem 1.25rem", background:"var(--navy)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ color:"#fff", fontWeight:700 }}>{position.position_name}</div>
          {position.description && <div style={{ color:"rgba(255,255,255,0.6)", fontSize:"0.8125rem", marginTop:2 }}>{position.description}</div>}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
          <span className="badge badge-green">{approved} approved</span>
          {election.status === "draft" && isOwner && (
            <button className="btn btn-ghost btn-sm" style={{ color:"#fff", borderColor:"rgba(255,255,255,0.3)", background:"rgba(255,255,255,0.1)" }} onClick={() => setShowAdd(true)}>
              + Candidate
            </button>
          )}
        </div>
      </div>
      <div style={{ padding:"0 1.25rem" }}>
        {(!position.candidates || position.candidates.length === 0) ? (
          <div style={{ padding:"2rem 0", textAlign:"center", color:"var(--slate)", fontSize:"0.875rem" }}>
            No candidates yet. {election.status === "draft" && "Add the first one above."}
          </div>
        ) : (
          position.candidates.map(c => (
            <CandidateRow key={c.candidate_id} candidate={c} electionId={election.election_id} electionStatus={election.status} onUpdate={onUpdate} />
          ))
        )}
      </div>
      {showAdd && (
        <AddCandidateModal
          electionId={election.election_id}
          positionId={position.position_id}
          positionName={position.position_name}
          onClose={() => setShowAdd(false)}
          onAdded={onUpdate}
        />
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function ElectionSetup() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isOwner } = useAuth();
  const [election, setElection]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [showAddPos, setShowAddPos] = useState(false);
  const [busy, setBusy]             = useState(false);

  const load = async () => {
    try { setLoading(true); const r = await electionsAPI.get(id); setElection(r.data); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const changeStatus = async () => {
    const nx = NEXT[election?.status];
    if (!nx || !window.confirm(`${nx.label}?`)) return;
    setBusy(true);
    try { await electionsAPI.updateStatus(id, nx.next); await load(); }
    catch (err) { alert(err.response?.data?.detail || "Failed."); }
    finally { setBusy(false); }
  };

  if (loading) return (
    <div style={{ display:"flex", justifyContent:"center", padding:"5rem 0" }}>
      <div className="spinner" />
    </div>
  );
  if (!election) return (
    <div style={{ textAlign:"center", padding:"5rem 0", color:"var(--slate)" }}>
      Election not found. <button className="btn btn-ghost btn-sm" onClick={() => navigate("/admin")}>Back</button>
    </div>
  );

  const st = STATUS[election.status] || STATUS.draft;
  const nx = NEXT[election.status];
  const totalApproved = election.positions?.flatMap(p => p.candidates || []).filter(c => c.approval_status === "approved").length ?? 0;

  return (
    <div className="page">
      <button className="btn btn-ghost btn-sm" style={{ marginBottom:"1.5rem" }} onClick={() => navigate("/admin")}>
        ← Back to Dashboard
      </button>

      {/* Election header card */}
      <div className="card card-accent-blue" style={{ padding:"1.5rem", marginBottom:"2rem" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"1rem", flexWrap:"wrap" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:"0.75rem", marginBottom:"0.375rem" }}>
              <h1 style={{ fontSize:"1.375rem", fontWeight:800, color:"var(--ink)", margin:0 }}>{election.title}</h1>
              <span className={`badge ${st.cls}`}>{st.label}</span>
            </div>
            {election.description && <p style={{ color:"var(--slate)", fontSize:"0.9rem", margin:0 }}>{election.description}</p>}
          </div>
          {nx && isOwner && (
            <button className={`btn ${nx.cls}`} disabled={busy} onClick={changeStatus}>
              {busy ? "Updating..." : nx.label}
            </button>
          )}
        </div>

        {/* Stats strip */}
        <div className="stats-grid-4" style={{ gap:"0.75rem", marginTop:"1.25rem" }}>
          {[
            { label:"Positions",       value: election.positions?.length ?? 0 },
            { label:"Approved",        value: totalApproved },
            { label:"Eligible Group",  value: election.eligible_group ?? "All Voters" },
            { label:"Type",            value: election.election_type === "single_choice" ? "Single Choice" : "Multi Choice" },
          ].map(({ label, value }) => (
            <div key={label} style={{ background:"var(--ice)", borderRadius:8, padding:"0.75rem 1rem", textAlign:"center" }}>
              <div style={{ fontWeight:800, fontSize:"1.25rem", color:"var(--ink)", lineHeight:1 }}>{value}</div>
              <div style={{ fontSize:"0.6875rem", color:"var(--slate)", marginTop:3, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.04em" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Positions section */}
      <div className="section-header">
        <div className="section-title">Positions & Candidates</div>
        {election.status === "draft" && isOwner && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddPos(true)}>+ Add Position</button>
        )}
      </div>

      {(!election.positions || election.positions.length === 0) ? (
        <div style={{ textAlign:"center", padding:"4rem 0", color:"var(--slate)", border:"2px dashed var(--border)", borderRadius:12 }}>
          <div style={{ fontSize:"2.5rem", marginBottom:"0.75rem" }}>📋</div>
          <div style={{ fontWeight:600, color:"var(--ink)" }}>No positions yet</div>
          <div style={{ fontSize:"0.875rem", marginTop:"0.375rem" }}>Define what voters are choosing between.</div>
          {election.status === "draft" && isOwner && (
            <button className="btn btn-primary" style={{ marginTop:"1.25rem" }} onClick={() => setShowAddPos(true)}>+ Add First Position</button>
          )}
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
          {election.positions.map(p => <PositionPanel key={p.position_id} position={p} election={election} onUpdate={load} />)}
        </div>
      )}

      {showAddPos && <AddPositionModal electionId={id} onClose={() => setShowAddPos(false)} onAdded={load} />}
    </div>
  );
}
