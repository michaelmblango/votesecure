// src/pages/ResultsPage.jsx
// Election results with live vote counts, progress bars,
// winner declaration, and turnout statistics

import { useState, useEffect } from "react";
import { electionsAPI, analyticsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

// ════════════════════════════════════════════════════════
// CANDIDATE RESULT ROW
// Shows candidate name, vote count, percentage bar, winner badge
// ════════════════════════════════════════════════════════
function CandidateResult({ candidate, isWinner, totalVotes }) {
  return (
    <div className={`p-4 rounded-xl border-2 transition-all
                     ${isWinner
                       ? "border-yellow-400 bg-yellow-50"
                       : "border-gray-100 bg-white"}`}>
      <div className="flex items-center gap-3 mb-2">
        {/* Avatar */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center
                         font-bold text-base flex-shrink-0
                         ${isWinner
                           ? "bg-yellow-400 text-white"
                           : "bg-gray-100 text-gray-500"}`}>
          {candidate.candidate_name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-navy text-sm">
              {candidate.candidate_name}
            </p>
            {isWinner && (
              <span className="text-xs bg-yellow-400 text-yellow-900
                               font-bold px-2 py-0.5 rounded-full">
                🏆 WINNER
              </span>
            )}
          </div>
          <p className="text-gray-400 text-xs">
            {candidate.vote_count} vote{candidate.vote_count !== 1 ? "s" : ""}
          </p>
        </div>

        <p className={`text-lg font-bold flex-shrink-0
                       ${isWinner ? "text-yellow-600" : "text-gray-600"}`}>
          {candidate.percentage}%
        </p>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700
                      ${isWinner ? "bg-yellow-400" : "bg-brand"}`}
          style={{ width: `${candidate.percentage}%` }}
        />
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════
// POSITION RESULTS PANEL
// ════════════════════════════════════════════════════════
function PositionResults({ position }) {
  // Sort candidates by vote count descending
  const sorted = [...(position.candidates || [])].sort(
    (a, b) => b.vote_count - a.vote_count
  );
  const winnerName = position.winner;

  return (
    <div className="bg-white rounded-2xl border border-gray-200
                    shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-navy to-brand px-5 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-base">
            {position.position_name}
          </h3>
          <span className="text-blue-200 text-sm">
            {position.total_votes} vote{position.total_votes !== 1 ? "s" : ""}
          </span>
        </div>
        {winnerName && (
          <p className="text-yellow-300 text-sm mt-1">
            🏆 {winnerName} leads
          </p>
        )}
      </div>

      <div className="p-4 space-y-3">
        {sorted.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-6">
            No votes cast for this position yet.
          </p>
        ) : (
          sorted.map((candidate) => (
            <CandidateResult
              key={candidate.candidate_id}
              candidate={candidate}
              isWinner={candidate.candidate_name === winnerName && position.total_votes > 0}
              totalVotes={position.total_votes}
            />
          ))
        )}
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════
// TURNOUT CHART (Admin only)
// Simple bar chart by department
// ════════════════════════════════════════════════════════
function TurnoutPanel({ electionId }) {
  const [turnout, setTurnout] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsAPI.turnout(electionId)
      .then((res) => setTurnout(res.data.turnout_by_department || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [electionId]);

  if (loading) return (
    <div className="flex justify-center py-8">
      <div className="w-6 h-6 border-2 border-brand border-t-transparent
                      rounded-full animate-spin" />
    </div>
  );

  if (turnout.length === 0) return null;

  const maxRate = Math.max(...turnout.map((d) => d.turnout_rate), 1);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-6">
      <h3 className="font-bold text-navy mb-4">📊 Turnout by Department</h3>
      <div className="space-y-3">
        {turnout.map((dept) => (
          <div key={dept.department}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-700 font-medium truncate flex-1">
                {dept.department}
              </span>
              <span className="text-gray-500 text-xs ml-3 flex-shrink-0">
                {dept.voted}/{dept.registered} ({dept.turnout_rate}%)
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-all duration-500"
                style={{ width: `${(dept.turnout_rate / maxRate) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════
// SINGLE ELECTION RESULTS VIEW
// ════════════════════════════════════════════════════════
function ElectionResults({ electionId, electionTitle, onBack, isAdmin }) {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await analyticsAPI.results(electionId);
        setResults(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to load results.");
      } finally {
        setLoading(false);
      }
    };
    load();
    // Auto-refresh every 30 seconds for live elections
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [electionId]);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-10 h-10 border-4 border-brand border-t-transparent
                      rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl
                    px-5 py-4 text-sm">
      ⚠️ {error}
    </div>
  );

  if (!results) return null;

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-gray-500 hover:text-navy
                   text-sm mb-6 transition-colors">
        ← All Elections
      </button>

      {/* Results header */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm
                      overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-navy to-brand p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-white font-bold text-xl">
                {results.election_title}
              </h2>
              <p className="text-blue-200 text-sm mt-1 capitalize">
                Status: {results.election_status}
              </p>
            </div>
            {results.election_status === "active" && (
              <span className="bg-green-400 text-green-900 text-xs font-bold
                               px-3 py-1 rounded-full whitespace-nowrap">
                🔴 LIVE
              </span>
            )}
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 divide-x divide-gray-100">
          {[
            { label: "Total Votes",   value: results.total_votes_cast },
            { label: "Registered",    value: results.total_registered  },
            { label: "Turnout",       value: `${results.turnout_percent}%` },
          ].map(({ label, value }) => (
            <div key={label} className="px-4 py-4 text-center">
              <p className="text-2xl font-bold text-navy">{value}</p>
              <p className="text-gray-400 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Admin turnout chart */}
      {isAdmin && <TurnoutPanel electionId={electionId} />}

      {/* Position results */}
      <div className="space-y-5">
        {results.positions?.length > 0 ? (
          results.positions.map((position) => (
            <PositionResults key={position.position_id} position={position} />
          ))
        ) : (
          <div className="text-center py-10 text-gray-400">
            No results available yet.
          </div>
        )}
      </div>

      {/* Live refresh notice */}
      {results.election_status === "active" && (
        <p className="text-center text-gray-400 text-xs mt-6">
          🔄 Results refresh automatically every 30 seconds
        </p>
      )}
    </div>
  );
}


// ════════════════════════════════════════════════════════
// ELECTION SELECTION CARD
// ════════════════════════════════════════════════════════
function ElectionSelectCard({ election, onSelect }) {
  const statusColor = {
    active:   "bg-green-100 text-green-700",
    closed:   "bg-red-100 text-red-700",
    archived: "bg-gray-100 text-gray-600",
    draft:    "bg-blue-100 text-blue-700",
  }[election.status] || "bg-gray-100 text-gray-600";

  return (
    <button
      onClick={() => onSelect(election)}
      className="w-full bg-white border border-gray-200 rounded-xl p-5
                 hover:border-brand hover:shadow-md transition-all text-left group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-navy text-base group-hover:text-brand
                        transition-colors leading-tight">
            {election.title}
          </p>
          {election.description && (
            <p className="text-gray-400 text-sm mt-1 line-clamp-1">
              {election.description}
            </p>
          )}
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium
                          flex-shrink-0 capitalize ${statusColor}`}>
          {election.status}
        </span>
      </div>
      <div className="flex items-center gap-1 mt-3 text-brand text-sm font-medium">
        View Results
        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform"
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5l7 7-7 7"/>
        </svg>
      </div>
    </button>
  );
}


// ════════════════════════════════════════════════════════
// MAIN RESULTS PAGE
// ════════════════════════════════════════════════════════
export default function ResultsPage() {
  const { user, isAdmin }       = useAuth();
  const [elections, setElections] = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await electionsAPI.list();
        // Show only elections that have results (active/closed/archived)
        const withResults = (res.data.elections || []).filter(
          (e) => e.status !== "draft"
        );
        setElections(withResults);
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (selected) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <ElectionResults
          electionId={selected.election_id}
          electionTitle={selected.title}
          onBack={() => setSelected(null)}
          isAdmin={isAdmin}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Election Results</h1>
        <p className="text-gray-500 text-sm mt-1">
          Select an election to view vote counts and results.
        </p>
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-brand border-t-transparent
                          rounded-full animate-spin" />
        </div>
      )}

      {!loading && elections.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <span className="text-5xl block mb-4">📊</span>
          <p className="font-medium text-lg">No results available yet</p>
          <p className="text-sm mt-1">
            Results appear once an election is opened or closed.
          </p>
        </div>
      )}

      {!loading && elections.length > 0 && (
        <div className="space-y-4">
          {elections.map((election) => (
            <ElectionSelectCard
              key={election.election_id}
              election={election}
              onSelect={setSelected}
            />
          ))}
        </div>
      )}
    </div>
  );
}