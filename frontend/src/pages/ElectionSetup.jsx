// src/pages/ElectionSetup.jsx
// Manage a single election: positions, candidates, approval

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { electionsAPI } from "../services/api";

// ════════════════════════════════════════════════════════
// ADD POSITION MODAL
// ════════════════════════════════════════════════════════
function AddPositionModal({ electionId, onClose, onAdded }) {
  const [form, setForm] = useState({
    position_name: "", description: "", max_votes: 1, display_order: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await electionsAPI.addPosition(electionId, {
        ...form, max_votes: Number(form.max_votes),
        display_order: Number(form.display_order),
      });
      onAdded();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add position.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="bg-navy px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-white font-bold">➕ Add Position</h2>
          <button onClick={onClose} className="text-blue-300 hover:text-white text-2xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Position Name *</label>
            <input
              value={form.position_name}
              onChange={(e) => setForm((f) => ({ ...f, position_name: e.target.value }))}
              placeholder="e.g. Student Union President"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2} placeholder="Brief description of this role..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Votes
                <span className="text-gray-400 font-normal ml-1">(per voter)</span>
              </label>
              <input
                type="number" min={1} value={form.max_votes}
                onChange={(e) => setForm((f) => ({ ...f, max_votes: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
              <input
                type="number" min={0} value={form.display_order}
                onChange={(e) => setForm((f) => ({ ...f, display_order: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>
          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">⚠️ {error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-brand text-white py-2.5 rounded-lg text-sm font-semibold
                         hover:bg-blue-700 disabled:opacity-60">
              {loading ? "Adding..." : "Add Position"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════
// ADD CANDIDATE MODAL
// ════════════════════════════════════════════════════════
function AddCandidateModal({ electionId, positionId, positionName, onClose, onAdded }) {
  const [form, setForm] = useState({
    display_name: "", manifesto: "", display_order: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await electionsAPI.addCandidate(electionId, positionId, {
        ...form,
        photo_url: null,
        display_order: Number(form.display_order),
      });
      onAdded();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add candidate.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="bg-navy px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-white font-bold">➕ Add Candidate</h2>
            <p className="text-blue-300 text-xs mt-0.5">For: {positionName}</p>
          </div>
          <button onClick={onClose} className="text-blue-300 hover:text-white text-2xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Candidate Name *</label>
            <input
              value={form.display_name}
              onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              placeholder="e.g. Aminata Koroma"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Manifesto / Bio</label>
            <textarea
              value={form.manifesto}
              onChange={(e) => setForm((f) => ({ ...f, manifesto: e.target.value }))}
              rows={4}
              placeholder="Candidate's key promises or background..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
            <input
              type="number" min={0} value={form.display_order}
              onChange={(e) => setForm((f) => ({ ...f, display_order: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">⚠️ {error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-brand text-white py-2.5 rounded-lg text-sm font-semibold
                         hover:bg-blue-700 disabled:opacity-60">
              {loading ? "Adding..." : "Add Candidate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════
// CANDIDATE ROW CARD
// ════════════════════════════════════════════════════════
function CandidateRow({ candidate, electionId, onUpdate, electionStatus }) {
  const [loading, setLoading] = useState(false);

  const handleApproval = async (newStatus) => {
    setLoading(true);
    try {
      await electionsAPI.approveCandidate(electionId, candidate.candidate_id, newStatus);
      onUpdate();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to update candidate.");
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = {
    pending:  "bg-yellow-100 text-yellow-700 border-yellow-300",
    approved: "bg-green-100 text-green-700 border-green-300",
    rejected: "bg-red-100 text-red-700 border-red-300",
  }[candidate.approval_status];

  return (
    <div className="flex items-start justify-between gap-3 p-4 bg-gray-50
                    rounded-xl border border-gray-200 hover:border-brand/30
                    transition-colors">
      {/* Avatar + info */}
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-full bg-brand/10 text-brand
                        flex items-center justify-center font-bold text-lg
                        flex-shrink-0">
          {candidate.display_name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-navy text-sm">{candidate.display_name}</p>
          {candidate.manifesto && (
            <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">
              {candidate.manifesto}
            </p>
          )}
          <span className={`inline-block mt-1.5 text-xs px-2 py-0.5
                            rounded-full border font-medium ${statusBadge}`}>
            {candidate.approval_status}
          </span>
        </div>
      </div>

      {/* Approval buttons — only for draft elections */}
      {electionStatus === "draft" && (
        <div className="flex gap-2 flex-shrink-0">
          {candidate.approval_status !== "approved" && (
            <button
              onClick={() => handleApproval("approved")}
              disabled={loading}
              className="text-xs bg-green-600 hover:bg-green-700 text-white
                         px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60">
              ✓ Approve
            </button>
          )}
          {candidate.approval_status !== "rejected" && (
            <button
              onClick={() => handleApproval("rejected")}
              disabled={loading}
              className="text-xs bg-red-500 hover:bg-red-600 text-white
                         px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60">
              ✗ Reject
            </button>
          )}
        </div>
      )}
    </div>
  );
}


// ════════════════════════════════════════════════════════
// POSITION PANEL
// ════════════════════════════════════════════════════════
function PositionPanel({ position, election, onUpdate }) {
  const [showAddCandidate, setShowAddCandidate] = useState(false);

  const approved = position.candidates?.filter((c) => c.approval_status === "approved").length ?? 0;
  const pending  = position.candidates?.filter((c) => c.approval_status === "pending").length  ?? 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Position header */}
      <div className="bg-gradient-to-r from-navy to-brand px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-base">{position.position_name}</h3>
            {position.description && (
              <p className="text-blue-200 text-xs mt-0.5">{position.description}</p>
            )}
          </div>
          <div className="text-right text-xs text-blue-200 space-y-0.5">
            <p>✅ {approved} approved</p>
            {pending > 0 && <p>⏳ {pending} pending</p>}
          </div>
        </div>
      </div>

      {/* Candidates list */}
      <div className="p-4 space-y-3">
        {(!position.candidates || position.candidates.length === 0) ? (
          <p className="text-gray-400 text-sm text-center py-4">
            No candidates yet. Add the first one below.
          </p>
        ) : (
          position.candidates.map((c) => (
            <CandidateRow
              key={c.candidate_id}
              candidate={c}
              electionId={election.election_id}
              electionStatus={election.status}
              onUpdate={onUpdate}
            />
          ))
        )}

        {/* Add candidate button — only for draft elections */}
        {election.status === "draft" && (
          <button
            onClick={() => setShowAddCandidate(true)}
            className="w-full border-2 border-dashed border-gray-300
                       hover:border-brand text-gray-400 hover:text-brand
                       py-2.5 rounded-xl text-sm transition-colors mt-2">
            + Add Candidate
          </button>
        )}
      </div>

      {showAddCandidate && (
        <AddCandidateModal
          electionId={election.election_id}
          positionId={position.position_id}
          positionName={position.position_name}
          onClose={() => setShowAddCandidate(false)}
          onAdded={onUpdate}
        />
      )}
    </div>
  );
}


// ════════════════════════════════════════════════════════
// MAIN ELECTION SETUP PAGE
// ════════════════════════════════════════════════════════
export default function ElectionSetup() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [election,         setElection]         = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [showAddPosition,  setShowAddPosition]  = useState(false);
  const [statusUpdating,   setStatusUpdating]   = useState(false);

  const loadElection = async () => {
    try {
      setLoading(true);
      const res = await electionsAPI.get(id);
      setElection(res.data);
    } catch (err) {
      console.error("Failed to load election:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadElection(); }, [id]);

  const STATUS_NEXT = {
    draft:  { label: "Open Voting",  next: "active",   color: "bg-green-600 hover:bg-green-700" },
    active: { label: "Close Voting", next: "closed",   color: "bg-red-600 hover:bg-red-700"     },
    closed: { label: "Archive",      next: "archived", color: "bg-yellow-600 hover:bg-yellow-700" },
  };

  const handleStatusChange = async () => {
    const transition = STATUS_NEXT[election.status];
    if (!transition) return;
    if (!window.confirm(`Are you sure you want to ${transition.label}?`)) return;
    setStatusUpdating(true);
    try {
      await electionsAPI.updateStatus(id, transition.next);
      await loadElection();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed.");
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-brand border-t-transparent
                      rounded-full animate-spin" />
    </div>
  );

  if (!election) return (
    <div className="text-center py-20 text-gray-400">
      <p>Election not found.</p>
      <button onClick={() => navigate("/admin")}
        className="mt-4 text-brand underline text-sm">← Back to Dashboard</button>
    </div>
  );

  const transition = STATUS_NEXT[election.status];
  const totalApproved = election.positions
    ?.flatMap((p) => p.candidates || [])
    .filter((c) => c.approval_status === "approved").length ?? 0;
  const totalPending = election.positions
    ?.flatMap((p) => p.candidates || [])
    .filter((c) => c.approval_status === "pending").length ?? 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* ── Back button ── */}
      <button
        onClick={() => navigate("/admin")}
        className="flex items-center gap-1 text-gray-500 hover:text-navy
                   text-sm mb-6 transition-colors">
        ← Back to Dashboard
      </button>

      {/* ── Election Header ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200
                      overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-navy to-brand p-6">
          <div className="flex flex-col sm:flex-row sm:items-start
                          justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-white font-bold text-xl">{election.title}</h1>
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium
                                  capitalize whitespace-nowrap
                                  ${election.status === "active"
                                    ? "bg-green-100 text-green-700 border-green-300"
                                    : election.status === "closed"
                                    ? "bg-red-100 text-red-700 border-red-300"
                                    : "bg-white/20 text-white border-white/30"}`}>
                  {election.status}
                </span>
              </div>
              {election.description && (
                <p className="text-blue-200 text-sm">{election.description}</p>
              )}
            </div>
            {transition && (
              <button
                onClick={handleStatusChange} disabled={statusUpdating}
                className={`${transition.color} text-white px-5 py-2.5 rounded-xl
                             text-sm font-semibold transition-colors
                             disabled:opacity-60 whitespace-nowrap`}>
                {statusUpdating ? "Updating..." : transition.label}
              </button>
            )}
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y
                        sm:divide-y-0 divide-gray-100">
          {[
            { label: "Positions",         value: election.positions?.length ?? 0 },
            { label: "Approved Candidates", value: totalApproved },
            { label: "Pending Approval",  value: totalPending,
              color: totalPending > 0 ? "text-yellow-600" : undefined },
            { label: "Eligible Group",    value: election.eligible_group ?? "All Voters" },
          ].map(({ label, value, color }) => (
            <div key={label} className="px-5 py-3 text-center">
              <p className={`text-2xl font-bold text-navy ${color || ""}`}>{value}</p>
              <p className="text-gray-400 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section header ── */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-navy">Positions & Candidates</h2>
        {election.status === "draft" && (
          <button
            onClick={() => setShowAddPosition(true)}
            className="bg-brand text-white px-4 py-2 rounded-lg text-sm
                       font-semibold hover:bg-blue-700 transition-colors">
            ➕ Add Position
          </button>
        )}
      </div>

      {/* ── Positions ── */}
      {(!election.positions || election.positions.length === 0) ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl
                        border-2 border-dashed border-gray-200">
          <span className="text-5xl block mb-3">📋</span>
          <p className="font-medium">No positions yet</p>
          <p className="text-sm mt-1">Add positions to define what voters are choosing.</p>
          {election.status === "draft" && (
            <button
              onClick={() => setShowAddPosition(true)}
              className="mt-4 bg-brand text-white px-5 py-2 rounded-lg text-sm
                         font-semibold hover:bg-blue-700 transition-colors">
              ➕ Add First Position
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {election.positions.map((position) => (
            <PositionPanel
              key={position.position_id}
              position={position}
              election={election}
              onUpdate={loadElection}
            />
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {showAddPosition && (
        <AddPositionModal
          electionId={id}
          onClose={() => setShowAddPosition(false)}
          onAdded={loadElection}
        />
      )}
    </div>
  );
}