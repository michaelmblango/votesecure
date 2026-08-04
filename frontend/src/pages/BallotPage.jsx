// src/pages/BallotPage.jsx
// The voting ballot — what every voter sees after logging in
// Shows all active elections they are eligible for
// Enforces one vote per position in the UI (backed by server rules)

import { useState, useEffect } from "react";
import { electionsAPI, votesAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

// ════════════════════════════════════════════════════════
// VOTE CONFIRMATION MODAL
// Shows before final submission — prevents accidental votes
// ════════════════════════════════════════════════════════
function ConfirmModal({ candidate, position, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center
                    justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm
                      overflow-hidden">
        <div className="bg-navy px-6 py-5 text-center">
          <span className="text-4xl block mb-2">🗳️</span>
          <h2 className="text-white font-bold text-lg">Confirm Your Vote</h2>
          <p className="text-blue-300 text-sm mt-1">This action cannot be undone</p>
        </div>
        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4
                          text-center mb-5">
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">
              Position
            </p>
            <p className="text-navy font-bold text-base">{position}</p>
            <div className="my-3 border-t border-blue-100" />
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">
              Your Candidate
            </p>
            <p className="text-brand font-bold text-xl">{candidate}</p>
          </div>
          <p className="text-gray-500 text-xs text-center mb-5">
            By confirming, you agree that this is your final choice.
            Your vote is anonymous and cannot be changed after submission.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel} disabled={loading}
              className="flex-1 border border-gray-300 text-gray-600 py-3
                         rounded-xl text-sm hover:bg-gray-50 transition-colors
                         disabled:opacity-50">
              Cancel
            </button>
            <button
              onClick={onConfirm} disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white
                         py-3 rounded-xl text-sm font-bold transition-colors
                         disabled:opacity-60">
              {loading ? "Submitting..." : "✓ Confirm Vote"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════
// VOTE SUCCESS SCREEN
// Shown after a vote is cast successfully
// ════════════════════════════════════════════════════════
function VoteSuccess({ receipt, onDone }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(receipt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center
                    justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm
                      overflow-hidden text-center">
        <div className="bg-green-600 px-6 py-8">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center
                          justify-center mx-auto mb-3">
            <span className="text-4xl">✓</span>
          </div>
          <h2 className="text-white font-bold text-xl">Vote Recorded!</h2>
          <p className="text-green-100 text-sm mt-1">
            Your vote has been securely submitted
          </p>
        </div>
        <div className="p-6">
          <p className="text-gray-600 text-sm mb-3">
            Save your receipt code to verify your vote later:
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4">
            <p className="font-mono text-xs text-gray-700 break-all leading-relaxed">
              {receipt}
            </p>
          </div>
          <button
            onClick={handleCopy}
            className="w-full border border-brand text-brand py-2.5 rounded-xl
                       text-sm font-medium hover:bg-blue-50 transition-colors mb-3">
            {copied ? "✓ Copied!" : "📋 Copy Receipt"}
          </button>
          <button
            onClick={onDone}
            className="w-full bg-brand text-white py-2.5 rounded-xl text-sm
                       font-bold hover:bg-blue-700 transition-colors">
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════
// CANDIDATE CARD — on the ballot
// ════════════════════════════════════════════════════════
function CandidateCard({ candidate, selected, onSelect, disabled }) {
  return (
    <button
      onClick={() => !disabled && onSelect(candidate.candidate_id)}
      disabled={disabled}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all
                  duration-200 group
                  ${disabled
                    ? "opacity-60 cursor-not-allowed bg-gray-50 border-gray-200"
                    : selected
                    ? "border-brand bg-blue-50 shadow-md scale-[1.01]"
                    : "border-gray-200 bg-white hover:border-brand/50 hover:shadow-sm"
                  }`}>
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center
                         text-xl font-bold flex-shrink-0 transition-colors
                         ${selected
                           ? "bg-brand text-white"
                           : "bg-gray-100 text-gray-500 group-hover:bg-blue-100"}`}>
          {candidate.display_name.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`font-bold text-base transition-colors
                           ${selected ? "text-brand" : "text-navy"}`}>
              {candidate.display_name}
            </p>
            {/* Selection indicator */}
            <div className={`w-6 h-6 rounded-full border-2 flex items-center
                             justify-center flex-shrink-0 transition-all
                             ${selected
                               ? "border-brand bg-brand"
                               : "border-gray-300"}`}>
              {selected && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                  <path d="M10 3L5 8.5 2 5.5l-1 1 4 4 6-7-1-1z"/>
                </svg>
              )}
            </div>
          </div>
          {candidate.manifesto && (
            <p className="text-gray-500 text-sm mt-1 line-clamp-3 leading-relaxed">
              {candidate.manifesto}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}


// ════════════════════════════════════════════════════════
// POSITION BALLOT SECTION
// One section per position in an election
// ════════════════════════════════════════════════════════
function PositionBallot({
  position, election, hasVoted,
  selectedCandidate, onSelect,
  onVoteCast,
}) {
  const [confirming, setConfirming]   = useState(false);
  const [voteLoading, setVoteLoading] = useState(false);
  const [receipt, setReceipt]         = useState(null);
  const [error, setError]             = useState("");

  const selected = selectedCandidate
    ? position.candidates?.find((c) => c.candidate_id === selectedCandidate)
    : null;

  const handleVoteSubmit = async () => {
    setVoteLoading(true);
    setError("");
    try {
      const res = await votesAPI.cast(
        election.election_id,
        position.position_id,
        selectedCandidate,
      );
      setConfirming(false);
      setReceipt(res.data.vote_hash);
    } catch (err) {
      setConfirming(false);
      setError(err.response?.data?.detail || "Vote submission failed.");
    } finally {
      setVoteLoading(false);
    }
  };

  const handleReceiptDone = () => {
    setReceipt(null);
    onVoteCast();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm
                    overflow-hidden">
      {/* Position header */}
      <div className={`px-6 py-4 ${
        hasVoted
          ? "bg-green-600"
          : "bg-gradient-to-r from-navy to-brand"
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-lg">
              {position.position_name}
            </h3>
            {position.description && (
              <p className="text-blue-200 text-sm mt-0.5">{position.description}</p>
            )}
          </div>
          {hasVoted && (
            <div className="bg-white/20 rounded-full px-4 py-1.5">
              <span className="text-white text-sm font-medium">✓ Voted</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-5">
        {hasVoted ? (
          // Already voted — show confirmation
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center
                            justify-center mx-auto mb-3">
              <span className="text-3xl">✓</span>
            </div>
            <p className="text-green-700 font-semibold">
              Your vote for this position has been recorded.
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Ballot secrecy is preserved — your choice is anonymous.
            </p>
          </div>
        ) : (
          <>
            {/* Candidates */}
            <p className="text-gray-500 text-sm mb-4">
              Select one candidate, then click Submit Vote.
            </p>
            <div className="space-y-3 mb-5">
              {position.candidates?.length > 0 ? (
                position.candidates.map((candidate) => (
                  <CandidateCard
                    key={candidate.candidate_id}
                    candidate={candidate}
                    selected={selectedCandidate === candidate.candidate_id}
                    onSelect={onSelect}
                    disabled={false}
                  />
                ))
              ) : (
                <p className="text-center text-gray-400 py-8">
                  No approved candidates for this position yet.
                </p>
              )}
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200
                            rounded-xl px-4 py-3 mb-4">
                ⚠️ {error}
              </p>
            )}

            {/* Submit button */}
            {position.candidates?.length > 0 && (
              <button
                onClick={() => setConfirming(true)}
                disabled={!selectedCandidate}
                className="w-full bg-brand hover:bg-blue-700 text-white font-bold
                           py-3.5 rounded-xl transition-colors disabled:opacity-40
                           disabled:cursor-not-allowed text-sm">
                {selectedCandidate
                  ? `Submit Vote for ${selected?.display_name}`
                  : "Select a candidate to continue"}
              </button>
            )}
          </>
        )}
      </div>

      {/* Confirm modal */}
      {confirming && selected && (
        <ConfirmModal
          candidate={selected.display_name}
          position={position.position_name}
          loading={voteLoading}
          onConfirm={handleVoteSubmit}
          onCancel={() => setConfirming(false)}
        />
      )}

      {/* Success receipt modal */}
      {receipt && (
        <VoteSuccess receipt={receipt} onDone={handleReceiptDone} />
      )}
    </div>
  );
}


// ════════════════════════════════════════════════════════
// ELECTION BALLOT — one full election
// ════════════════════════════════════════════════════════
function ElectionBallot({ election }) {
  // Track selected candidate per position: { position_id: candidate_id }
  const [selections, setSelections]   = useState({});
  // Track which positions this voter has voted in
  const [votedPositions, setVotedPositions] = useState({});
  const [loadingStatus, setLoadingStatus]   = useState(true);

  // Check voting status for each position on load
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await votesAPI.getStatus(election.election_id);
        const voted = {};
        res.data.positions_voted?.forEach((p) => {
          if (p.has_voted) voted[p.position_id] = true;
        });
        setVotedPositions(voted);
      } catch {
        // Non-critical — just show unvoted state
      } finally {
        setLoadingStatus(false);
      }
    };
    checkStatus();
  }, [election.election_id]);

  const handleSelect = (positionId, candidateId) => {
    setSelections((prev) => ({ ...prev, [positionId]: candidateId }));
  };

  const handleVoteCast = async (positionId) => {
    // Mark this position as voted
    setVotedPositions((prev) => ({ ...prev, [positionId]: true }));
    // Clear selection for this position
    setSelections((prev) => {
      const copy = { ...prev };
      delete copy[positionId];
      return copy;
    });
    // Refresh status from server
    try {
      const res = await votesAPI.getStatus(election.election_id);
      const voted = {};
      res.data.positions_voted?.forEach((p) => {
        if (p.has_voted) voted[p.position_id] = true;
      });
      setVotedPositions(voted);
    } catch {}
  };

  const totalPositions  = election.positions?.length ?? 0;
  const votedCount      = Object.keys(votedPositions).length;
  const allDone         = totalPositions > 0 && votedCount >= totalPositions;

  return (
    <div className="mb-10">
      {/* Election header */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm
                      overflow-hidden mb-5">
        <div className="bg-gradient-to-r from-navy to-brand p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-white font-bold text-xl">{election.title}</h2>
              {election.description && (
                <p className="text-blue-200 text-sm mt-1">{election.description}</p>
              )}
            </div>
            <span className="bg-green-400 text-green-900 text-xs font-bold
                             px-3 py-1 rounded-full whitespace-nowrap">
              🟢 LIVE
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600 font-medium">Voting Progress</span>
            <span className="text-brand font-bold">
              {votedCount} / {totalPositions} positions
            </span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all duration-500"
              style={{ width: `${totalPositions > 0
                ? (votedCount / totalPositions) * 100 : 0}%` }}
            />
          </div>
          {allDone && (
            <div className="mt-3 bg-green-50 border border-green-200 rounded-xl
                            px-4 py-3 text-center">
              <p className="text-green-700 font-semibold text-sm">
                🎉 You have completed voting in this election!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Position ballots */}
      {loadingStatus ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-brand border-t-transparent
                          rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-5">
          {election.positions?.map((position) => (
            <PositionBallot
              key={position.position_id}
              position={position}
              election={election}
              hasVoted={!!votedPositions[position.position_id]}
              selectedCandidate={selections[position.position_id]}
              onSelect={(candId) => handleSelect(position.position_id, candId)}
              onVoteCast={() => handleVoteCast(position.position_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}


// ════════════════════════════════════════════════════════
// MAIN BALLOT PAGE
// ════════════════════════════════════════════════════════
export default function BallotPage() {
  const { user }          = useAuth();
  const [elections, setElections] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await electionsAPI.list();
        // Filter to only active elections
        const active = (res.data.elections || []).filter(
          (e) => e.status === "active"
        );
        // Load full detail (with positions + candidates) for each
        const detailed = await Promise.all(
          active.map((e) => electionsAPI.get(e.election_id)
            .then((r) => r.data))
        );
        setElections(detailed);
      } catch (err) {
        setError("Failed to load elections. Please refresh.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Your Ballot</h1>
        <p className="text-gray-500 text-sm mt-1">
          Hello, <span className="font-medium text-navy">{user?.full_name}</span>.
          Cast your votes below. All choices are final and anonymous.
        </p>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-brand border-t-transparent
                          rounded-full animate-spin mb-4" />
          <p className="text-gray-400 text-sm">Loading your ballot...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl
                        px-5 py-4 text-sm mb-6">
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && elections.length === 0 && (
        <div className="text-center py-20">
          <span className="text-6xl block mb-4">🗳️</span>
          <h2 className="text-xl font-bold text-navy mb-2">
            No Active Elections
          </h2>
          <p className="text-gray-400 text-sm">
            There are no elections currently open for voting.
            Check back later or contact your administrator.
          </p>
        </div>
      )}

      {!loading && elections.map((election) => (
        <ElectionBallot key={election.election_id} election={election} />
      ))}
    </div>
  );
}