import { useState, useEffect } from "react";
import { electionsAPI, analyticsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

function CandidateResult({ candidate, isWinner }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:"0.875rem", padding:"0.875rem",
      borderRadius:10, border:`2px solid ${isWinner ? "var(--amber)" : "var(--border)"}`,
      background: isWinner ? "var(--amber-lt)" : "#fff", marginBottom:"0.625rem",
    }}>
      <div style={{
        width:40, height:40, borderRadius:"50%", flexShrink:0,
        background: isWinner ? "var(--amber)" : "var(--ice)",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontWeight:800, color: isWinner ? "#fff" : "var(--slate)", fontSize:"1.125rem",
      }}>
        {candidate.candidate_name.charAt(0).toUpperCase()}
      </div>
      <div style={{ flex:1 }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
          <span style={{ fontWeight:700, color:"var(--ink)", fontSize:"0.9375rem" }}>{candidate.candidate_name}</span>
          {isWinner && <span className="badge badge-amber">🏆 Leading</span>}
        </div>
        <div style={{ marginTop:6 }}>
          <div className="progress-track" style={{ height:5 }}>
            <div style={{ height:"100%", width:`${candidate.percentage}%`, background: isWinner ? "var(--amber)" : "var(--blue)", borderRadius:999, transition:"width 0.7s" }} />
          </div>
        </div>
      </div>
      <div style={{ fontSize:"1.125rem", fontWeight:800, color: isWinner ? "var(--amber)" : "var(--slate)", flexShrink:0 }}>
        {candidate.percentage}%
      </div>
      <div style={{ fontSize:"0.8125rem", color:"var(--slate)", flexShrink:0 }}>{candidate.vote_count}v</div>
    </div>
  );
}

function PositionResults({ position }) {
  const sorted = [...(position.candidates || [])].sort((a,b) => b.vote_count - a.vote_count);
  return (
    <div className="card card-accent-blue" style={{ marginBottom:"1.25rem" }}>
      <div style={{ padding:"1rem 1.25rem", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontWeight:700, color:"var(--ink)" }}>{position.position_name}</div>
        <div style={{ fontSize:"0.8125rem", color:"var(--slate)" }}>{position.total_votes} votes</div>
      </div>
      <div style={{ padding:"1rem 1.25rem" }}>
        {sorted.length === 0
          ? <p style={{ textAlign:"center", color:"var(--slate)", fontSize:"0.875rem", padding:"1.5rem 0" }}>No votes yet.</p>
          : sorted.map(c => <CandidateResult key={c.candidate_id} candidate={c} isWinner={c.candidate_name === position.winner && position.total_votes > 0} />)
        }
      </div>
    </div>
  );
}

function TurnoutPanel({ electionId }) {
  const [data, setData] = useState([]);
  useEffect(() => { analyticsAPI.turnout(electionId).then(r => setData(r.data.turnout_by_department || [])).catch(() => {}); }, [electionId]);
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.turnout_rate), 1);
  return (
    <div className="card" style={{ padding:"1.25rem", marginBottom:"1.5rem" }}>
      <div style={{ fontWeight:700, color:"var(--ink)", marginBottom:"1rem" }}>Turnout by Department</div>
      {data.map(d => (
        <div key={d.department} style={{ marginBottom:"0.75rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, fontSize:"0.875rem" }}>
            <span style={{ fontWeight:500 }}>{d.department || "Unknown"}</span>
            <span style={{ color:"var(--slate)" }}>{d.voted}/{d.registered} ({d.turnout_rate}%)</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width:`${(d.turnout_rate/max)*100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ElectionResults({ election, onBack, isAdmin }) {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    const load = async () => {
      try { setLoading(true); const r = await analyticsAPI.results(election.election_id); setResults(r.data); }
      catch (err) { setError(err.response?.data?.detail || "Failed to load results."); }
      finally { setLoading(false); }
    };
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [election.election_id]);

  if (loading) return <div style={{ display:"flex", justifyContent:"center", padding:"5rem 0" }}><div className="spinner" /></div>;
  if (error) return <div className="alert alert-error" style={{ borderRadius:8 }}><span>⚠</span> {error}</div>;
  if (!results) return null;

  return (
    <div>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom:"1.5rem" }} onClick={onBack}>← All Elections</button>

      <div className="card card-accent-blue" style={{ padding:"1.5rem", marginBottom:"2rem" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"1rem", marginBottom:"1.25rem" }}>
          <div>
            <h2 style={{ fontSize:"1.375rem", fontWeight:800, color:"var(--ink)", margin:0 }}>{results.election_title}</h2>
            <div style={{ fontSize:"0.875rem", color:"var(--slate)", marginTop:4, textTransform:"capitalize" }}>Status: {results.election_status}</div>
          </div>
          {results.election_status === "active" && <span className="badge badge-green">🔴 Live</span>}
        </div>
        <div className="results-stats-grid">
          {[
            { label:"Total Votes",  value: results.total_votes_cast },
            { label:"Registered",   value: results.total_registered },
            { label:"Turnout",      value: `${results.turnout_percent}%` },
          ].map(({ label, value }) => (
            <div key={label} style={{ background:"var(--ice)", borderRadius:8, padding:"0.875rem", textAlign:"center" }}>
              <div style={{ fontSize:"1.75rem", fontWeight:800, color:"var(--ink)", lineHeight:1 }}>{value}</div>
              <div style={{ fontSize:"0.6875rem", fontWeight:700, color:"var(--slate)", textTransform:"uppercase", letterSpacing:"0.05em", marginTop:3 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {isAdmin && <TurnoutPanel electionId={election.election_id} />}

      <div>{results.positions?.map(p => <PositionResults key={p.position_id} position={p} />)}</div>

      {results.election_status === "active" && (
        <p style={{ textAlign:"center", color:"var(--slate)", fontSize:"0.8125rem", marginTop:"1rem" }}>
          Results refresh automatically every 30 seconds
        </p>
      )}
    </div>
  );
}

function ElectionCard({ election, onSelect }) {
  const st = { active:"badge-green", closed:"badge-red", archived:"badge-amber", draft:"badge-slate" }[election.status] || "badge-slate";
  return (
    <button onClick={() => onSelect(election)} style={{ width:"100%", textAlign:"left", background:"#fff", border:"1px solid var(--border)", borderRadius:12, padding:"1.25rem 1.5rem", cursor:"pointer", transition:"all 0.15s", boxShadow:"var(--shadow)" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--blue)"; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "var(--shadow)"; }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"0.75rem" }}>
        <div style={{ fontWeight:700, color:"var(--ink)", fontSize:"1rem", flex:1 }}>{election.title}</div>
        <span className={`badge ${st}`} style={{ textTransform:"capitalize" }}>{election.status}</span>
      </div>
      {election.description && <p style={{ fontSize:"0.875rem", color:"var(--slate)", margin:"0.5rem 0 0" }} className="truncate-2">{election.description}</p>}
      <div style={{ fontSize:"0.8rem", color:"var(--blue)", fontWeight:600, marginTop:"0.875rem" }}>View Results →</div>
    </button>
  );
}

export default function ResultsPage() {
  const { isAdmin }       = useAuth();
  const [elections, setElections] = useState([]);
  const [selected, setSelected]   = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    electionsAPI.list()
      .then(r => setElections((r.data.elections || []).filter(e => e.status !== "draft")))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (selected) return <div className="page-narrow"><ElectionResults election={selected} onBack={() => setSelected(null)} isAdmin={isAdmin} /></div>;

  return (
    <div className="page-narrow">
      <div style={{ marginBottom:"2rem" }}>
        <h1 style={{ fontSize:"1.5rem", fontWeight:800, color:"var(--ink)", marginBottom:"0.25rem" }}>Results</h1>
        <p style={{ fontSize:"0.9rem", color:"var(--slate)", margin:0 }}>Select an election to view vote counts and outcomes.</p>
      </div>
      {loading && <div style={{ display:"flex", justifyContent:"center", padding:"4rem 0" }}><div className="spinner" /></div>}
      {!loading && elections.length === 0 && (
        <div style={{ textAlign:"center", padding:"5rem 0", color:"var(--slate)" }}>
          <div style={{ fontSize:"3rem", marginBottom:"1rem" }}>📊</div>
          <div style={{ fontWeight:700, color:"var(--ink)", marginBottom:"0.375rem" }}>No results yet</div>
          <div style={{ fontSize:"0.875rem" }}>Results appear once an election opens or closes.</div>
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:"0.875rem" }}>
        {elections.map(e => <ElectionCard key={e.election_id} election={e} onSelect={setSelected} />)}
      </div>
    </div>
  );
}
