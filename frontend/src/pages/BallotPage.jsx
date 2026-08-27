import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { electionsAPI, votesAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

// ── Confirm Modal ─────────────────────────────────────────────
function ConfirmModal({ candidate, position, onConfirm, onCancel, loading }) {
  return (
    <div className="modal-backdrop">
      <div className="modal animate-in" style={{ maxWidth: 400 }}>
        <div style={{ padding:"2rem 1.75rem", textAlign:"center" }}>
          <div style={{ width:56, height:56, background:"var(--blue-lt)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, margin:"0 auto 1.25rem" }}>🗳️</div>
          <div style={{ fontSize:"1.25rem", fontWeight:800, color:"var(--ink)", marginBottom:"0.25rem" }}>Confirm Your Vote</div>
          <div style={{ fontSize:"0.875rem", color:"var(--slate)", marginBottom:"1.5rem" }}>This cannot be undone.</div>
          <div className="card" style={{ padding:"1.25rem", marginBottom:"1.5rem", textAlign:"left" }}>
            <div style={{ fontSize:"0.75rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:"var(--slate)", marginBottom:4 }}>Position</div>
            <div style={{ fontWeight:600, color:"var(--ink)", marginBottom:"0.875rem" }}>{position}</div>
            <div style={{ fontSize:"0.75rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:"var(--slate)", marginBottom:4 }}>Your Choice</div>
            <div style={{ fontWeight:700, fontSize:"1.125rem", color:"var(--blue)" }}>{candidate}</div>
          </div>
          <div style={{ fontSize:"0.8125rem", color:"var(--slate)", marginBottom:"1.5rem" }}>Your vote is anonymous and cannot be changed after submission.</div>
          <div style={{ display:"flex", gap:"0.75rem" }}>
            <button className="btn btn-ghost" style={{ flex:1 }} onClick={onCancel} disabled={loading}>Cancel</button>
            <button className="btn btn-success" style={{ flex:1 }} onClick={onConfirm} disabled={loading}>
              {loading ? "Submitting..." : "✓ Confirm Vote"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Vote Success Modal ────────────────────────────────────────
function VoteSuccess({ receipt, onDone }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(receipt); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="modal-backdrop">
      <div className="modal animate-in" style={{ maxWidth: 400 }}>
        <div style={{ background:"var(--confirm)", padding:"2rem 1.75rem", textAlign:"center" }}>
          <div style={{ width:56, height:56, background:"rgba(255,255,255,0.2)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, margin:"0 auto 1rem" }}>✓</div>
          <div style={{ color:"#fff", fontSize:"1.25rem", fontWeight:800 }}>Vote Recorded</div>
          <div style={{ color:"rgba(255,255,255,0.8)", fontSize:"0.875rem", marginTop:4 }}>Your ballot has been securely submitted</div>
        </div>
        <div style={{ padding:"1.5rem 1.75rem" }}>
          <div style={{ fontSize:"0.875rem", color:"var(--slate)", marginBottom:"0.75rem" }}>Save your receipt to verify your vote later:</div>
          <div style={{ background:"var(--ice)", border:"1px solid var(--border)", borderRadius:8, padding:"0.875rem 1rem", marginBottom:"1rem" }}>
            <div className="text-mono" style={{ fontSize:"0.8rem", color:"var(--ink)", wordBreak:"break-all", lineHeight:1.6 }}>{receipt}</div>
          </div>
          <button className="btn btn-ghost" style={{ width:"100%", marginBottom:"0.625rem" }} onClick={copy}>{copied ? "✓ Copied!" : "Copy Receipt"}</button>
          <button className="btn btn-navy" style={{ width:"100%" }} onClick={onDone}>Continue</button>
        </div>
      </div>
    </div>
  );
}

// ── Candidate Card ────────────────────────────────────────────
function CandidateCard({ candidate, selected, onSelect, disabled }) {
  // A plain div (not <button>) because it needs to contain a nested
  // <Link> for "View full profile" - an <a> inside a <button> is
  // invalid HTML and browsers will hoist/break it. role="button" +
  // onKeyDown keeps it keyboard-accessible.
  const activate = () => !disabled && onSelect(candidate.candidate_id);
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-pressed={selected}
      onClick={activate}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); }
      }}
      style={{
        width:"100%", textAlign:"left", padding:"1rem 1.125rem",
        borderRadius:10, border:`2px solid ${selected ? "var(--blue)" : "var(--border)"}`,
        background: selected ? "var(--blue-lt)" : "#fff",
        cursor: disabled ? "not-allowed" : "pointer",
        transition:"all 0.15s", display:"flex", alignItems:"flex-start", gap:"0.875rem",
        opacity: disabled ? 0.6 : 1,
        transform: selected ? "none" : undefined,
        boxShadow: selected ? "0 0 0 3px rgba(21,101,192,0.15)" : "none",
      }}>
      <div style={{
        width:42, height:42, borderRadius:"50%", flexShrink:0,
        background: selected ? "var(--blue)" : "var(--ice)",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontWeight:800, fontSize:"1.125rem",
        color: selected ? "#fff" : "var(--slate)",
        transition:"all 0.15s",
      }}>
        {candidate.display_name.charAt(0).toUpperCase()}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:700, color: selected ? "var(--blue)" : "var(--ink)", fontSize:"0.9375rem" }}>
          {candidate.display_name}
        </div>
        {candidate.manifesto && (
          <div className="truncate-2" style={{ fontSize:"0.8125rem", color:"var(--slate)", marginTop:"0.25rem", lineHeight:1.5 }}>
            {candidate.manifesto}
          </div>
        )}
        {candidate.manifesto && (
          <Link
            to={`/candidates/${candidate.candidate_id}`}
            onClick={e => e.stopPropagation()}
            style={{
              fontSize: "0.75rem",
              color: "var(--blue)",
              textDecoration: "none",
              fontWeight: 600,
              display: "inline-block",
              marginTop: "0.375rem",
            }}>
            View full profile →
          </Link>
        )}
      </div>
      <div style={{
        width:22, height:22, borderRadius:"50%", flexShrink:0,
        border:`2px solid ${selected ? "var(--blue)" : "var(--border)"}`,
        background: selected ? "var(--blue)" : "transparent",
        display:"flex", alignItems:"center", justifyContent:"center",
        transition:"all 0.15s",
      }}>
        {selected && <svg width="12" height="12" fill="white" viewBox="0 0 12 12"><path d="M10 3L5 8.5 2 5.5l-1 1 4 4 6-7-1-1z"/></svg>}
      </div>
    </div>
  );
}

// ── Position Ballot ───────────────────────────────────────────
function PositionBallot({ position, election, hasVoted, selectedCandidate, onSelect, onVoteCast }) {
  const [confirming, setConfirming] = useState(false);
  const [voteLoading, setVoteLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [error, setError]     = useState("");

  const selected = selectedCandidate ? position.candidates?.find(c => c.candidate_id === selectedCandidate) : null;

  const handleVote = async () => {
    setVoteLoading(true); setError("");
    try {
      const res = await votesAPI.cast(election.election_id, position.position_id, selectedCandidate);
      setConfirming(false);
      setReceipt(res.data.vote_hash);
    } catch (err) { setConfirming(false); setError(err.response?.data?.detail || "Vote failed."); }
    finally { setVoteLoading(false); }
  };

  const handleDone = () => { setReceipt(null); onVoteCast(); };

  const accentClass = hasVoted ? "card-accent-green" : "card-accent-blue";

  return (
    <div className={`card ${accentClass}`} style={{ overflow:"hidden" }}>
      {/* Header */}
      <div style={{
        padding:"1rem 1.25rem",
        background: hasVoted ? "var(--confirm)" : "var(--navy)",
        display:"flex", alignItems:"center", justifyContent:"space-between",
      }}>
        <div>
          <div style={{ color:"#fff", fontWeight:700, fontSize:"1rem" }}>{position.position_name}</div>
          {position.description && <div style={{ color:"rgba(255,255,255,0.65)", fontSize:"0.8125rem", marginTop:2 }}>{position.description}</div>}
        </div>
        {hasVoted && <span className="badge" style={{ background:"rgba(255,255,255,0.2)", color:"#fff" }}>✓ Voted</span>}
      </div>

      <div style={{ padding:"1.25rem" }}>
        {hasVoted ? (
          <div style={{ textAlign:"center", padding:"1.5rem 0" }}>
            <div style={{ fontSize:"2rem", marginBottom:"0.5rem" }}>✓</div>
            <div style={{ fontWeight:600, color:"var(--confirm)" }}>Your vote has been recorded</div>
            <div style={{ fontSize:"0.8125rem", color:"var(--slate)", marginTop:4 }}>Ballot secrecy is preserved. Your choice is anonymous.</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize:"0.875rem", color:"var(--slate)", marginBottom:"1rem" }}>
              Select one candidate, then submit.
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"0.625rem", marginBottom:"1.25rem" }}>
              {position.candidates?.length > 0 ? (
                position.candidates.map(c => (
                  <CandidateCard key={c.candidate_id} candidate={c} selected={selectedCandidate === c.candidate_id} onSelect={onSelect} disabled={false} />
                ))
              ) : (
                <div style={{ textAlign:"center", padding:"2rem", color:"var(--slate)", fontSize:"0.875rem" }}>No approved candidates yet.</div>
              )}
            </div>
            {error && <div className="alert alert-error" style={{ marginBottom:"1rem", borderRadius:8 }}><span>⚠</span> {error}</div>}
            {position.candidates?.length > 0 && (
              <button
                className="btn btn-primary"
                style={{ width:"100%" }}
                disabled={!selectedCandidate}
                onClick={() => setConfirming(true)}>
                {selectedCandidate ? `Submit Vote for ${selected?.display_name}` : "Select a candidate to continue"}
              </button>
            )}
          </>
        )}
      </div>

      {confirming && selected && <ConfirmModal candidate={selected.display_name} position={position.position_name} loading={voteLoading} onConfirm={handleVote} onCancel={() => setConfirming(false)} />}
      {receipt && <VoteSuccess receipt={receipt} onDone={handleDone} />}
    </div>
  );
}

// ── Election Ballot ───────────────────────────────────────────
function ElectionBallot({ election }) {
  const [selections, setSelections]       = useState({});
  const [votedPositions, setVotedPositions] = useState({});
  const [loadingStatus, setLoadingStatus]   = useState(true);

  useEffect(() => {
    votesAPI.getStatus(election.election_id)
      .then(res => {
        const v = {};
        res.data.positions_voted?.forEach(p => { if (p.has_voted) v[p.position_id] = true; });
        setVotedPositions(v);
      })
      .catch(() => {})
      .finally(() => setLoadingStatus(false));
  }, [election.election_id]);

  const handleVoteCast = async (positionId) => {
    setVotedPositions(p => ({ ...p, [positionId]: true }));
    setSelections(s => { const c = {...s}; delete c[positionId]; return c; });
    try {
      const res = await votesAPI.getStatus(election.election_id);
      const v = {};
      res.data.positions_voted?.forEach(p => { if (p.has_voted) v[p.position_id] = true; });
      setVotedPositions(v);
    } catch {}
  };

  const total   = election.positions?.length ?? 0;
  const voted   = Object.keys(votedPositions).length;
  const allDone = total > 0 && voted >= total;
  const pct     = total > 0 ? (voted / total) * 100 : 0;

  return (
    <div style={{ marginBottom:"3rem" }}>
      {/* Election header */}
      <div className="card card-accent-blue" style={{ padding:"1.25rem 1.5rem", marginBottom:"1.5rem" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"1rem" }}>
          <div>
            <div style={{ fontSize:"1.125rem", fontWeight:800, color:"var(--ink)" }}>{election.title}</div>
            {election.description && <div style={{ fontSize:"0.875rem", color:"var(--slate)", marginTop:3 }}>{election.description}</div>}
          </div>
          <span className="badge badge-green">🟢 Live</span>
        </div>
        {/* Progress */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"0.5rem" }}>
          <span style={{ fontSize:"0.8125rem", fontWeight:600, color:"var(--slate)" }}>Progress</span>
          <span style={{ fontSize:"0.8125rem", fontWeight:700, color:"var(--blue)" }}>{voted}/{total} positions</span>
        </div>
        <div className="progress-track">
          <div className={`progress-fill ${allDone ? "progress-fill-green" : ""}`} style={{ width:`${pct}%` }} />
        </div>
        {allDone && (
          <div className="alert alert-success animate-in" style={{ marginTop:"0.875rem", borderRadius:8 }}>
            <span>🎉</span> You have completed voting in this election!
          </div>
        )}
      </div>

      {loadingStatus ? (
        <div style={{ display:"flex", justifyContent:"center", padding:"3rem 0" }}><div className="spinner" /></div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
          {election.positions?.map(p => (
            <PositionBallot
              key={p.position_id}
              position={p}
              election={election}
              hasVoted={!!votedPositions[p.position_id]}
              selectedCandidate={selections[p.position_id]}
              onSelect={cId => setSelections(s => ({ ...s, [p.position_id]: cId }))}
              onVoteCast={() => handleVoteCast(p.position_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function BallotPage() {
  const { user }  = useAuth();
  const [elections, setElections] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await electionsAPI.list();
        const active = (res.data.elections || []).filter(e => e.status === "active");
        const detailed = await Promise.all(active.map(e => electionsAPI.get(e.election_id).then(r => r.data)));
        setElections(detailed);
      } catch { setError("Failed to load elections. Please refresh."); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  return (
    <div className="page-narrow">
      <div style={{ marginBottom:"2rem" }}>
        <h1 style={{ fontSize:"1.5rem", fontWeight:800, color:"var(--ink)", marginBottom:"0.25rem" }}>Your Ballot</h1>
        <p style={{ fontSize:"0.9rem", color:"var(--slate)", margin:0 }}>
          Hello, <strong style={{ color:"var(--ink)" }}>{user?.full_name}</strong>. All votes are final and anonymous.
        </p>
      </div>

      {loading && <div style={{ display:"flex", justifyContent:"center", padding:"4rem 0" }}><div className="spinner" /></div>}
      {error && <div className="alert alert-error" style={{ borderRadius:8 }}><span>⚠</span> {error}</div>}
      {!loading && !error && elections.length === 0 && (
        <div style={{ textAlign:"center", padding:"5rem 0", color:"var(--slate)" }}>
          <div style={{ fontSize:"3rem", marginBottom:"1rem" }}>🗳️</div>
          <div style={{ fontSize:"1.125rem", fontWeight:700, color:"var(--ink)", marginBottom:"0.375rem" }}>No Active Elections</div>
          <div style={{ fontSize:"0.875rem" }}>There are no elections open for voting right now.</div>
        </div>
      )}
      {!loading && elections.map(e => <ElectionBallot key={e.election_id} election={e} />)}
    </div>
  );
}
