// src/pages/AdminDashboard.jsx
// Main admin dashboard — shows all elections with stats
// and lets admins create new elections

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { electionsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

// ── Status badge colours ──────────────────────────────────
const STATUS_STYLES = {
  draft:    "bg-gray-100 text-gray-600 border-gray-300",
  active:   "bg-green-100 text-green-700 border-green-300",
  closed:   "bg-red-100 text-red-700 border-red-300",
  archived: "bg-yellow-100 text-yellow-700 border-yellow-300",
};

const STATUS_ICONS = {
  draft:    "✏️",
  active:   "🟢",
  closed:   "🔒",
  archived: "📦",
};

// ── Format datetime for display ───────────────────────────
function formatDate(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ════════════════════════════════════════════════════════
// CREATE ELECTION MODAL
// ════════════════════════════════════════════════════════
function CreateElectionModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title:             "",
    description:       "",
    election_type:     "single_choice",
    start_time:        "",
    end_time:          "",
    eligible_group:    "",
    is_public_results: false,
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        ...form,
        eligible_group: form.eligible_group || null,
        // Convert local datetime strings to ISO format
        start_time: new Date(form.start_time).toISOString(),
        end_time:   new Date(form.end_time).toISOString(),
      };
      const res = await electionsAPI.create(payload);
      onCreated(res.data.election);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create election.");
    } finally {
      setLoading(false);
    }
  };

  return (
    // Backdrop
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center
                    z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg
                      max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-navy px-6 py-4 flex items-center justify-between
                        rounded-t-2xl">
          <h2 className="text-white font-bold text-lg">➕ Create New Election</h2>
          <button onClick={onClose}
            className="text-blue-300 hover:text-white text-2xl leading-none">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Election Title *
            </label>
            <input
              name="title" value={form.title} onChange={handleChange}
              required placeholder="e.g. 2025 Student Union Election"
              className="w-full border border-gray-300 rounded-lg px-3 py-2
                         text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description" value={form.description} onChange={handleChange}
              rows={3} placeholder="Brief description of this election..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2
                         text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Voting Method *
            </label>
            <select
              name="election_type" value={form.election_type} onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2
                         text-sm focus:outline-none focus:ring-2 focus:ring-brand">
              <option value="single_choice">Single Choice (pick one candidate)</option>
              <option value="multi_choice">Multi Choice (pick multiple candidates)</option>
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date & Time *
              </label>
              <input
                type="datetime-local" name="start_time"
                value={form.start_time} onChange={handleChange} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2
                           text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date & Time *
              </label>
              <input
                type="datetime-local" name="end_time"
                value={form.end_time} onChange={handleChange} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2
                           text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>

          {/* Eligible group */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Eligible Group
              <span className="text-gray-400 font-normal ml-1">(leave blank for all voters)</span>
            </label>
            <input
              name="eligible_group" value={form.eligible_group} onChange={handleChange}
              placeholder="e.g. undergraduate, postgraduate, staff"
              className="w-full border border-gray-300 rounded-lg px-3 py-2
                         text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          {/* Public results toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div className="relative">
              <input
                type="checkbox" name="is_public_results"
                checked={form.is_public_results} onChange={handleChange}
                className="sr-only"
              />
              <div className={`w-10 h-6 rounded-full transition-colors
                              ${form.is_public_results ? "bg-brand" : "bg-gray-300"}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full
                                 shadow transition-transform
                                 ${form.is_public_results ? "translate-x-5" : "translate-x-1"}`} />
              </div>
            </div>
            <span className="text-sm text-gray-700">
              Show live results during voting
            </span>
          </label>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200
                          rounded-lg px-3 py-2">
              ⚠️ {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-600 py-2.5
                         rounded-lg text-sm hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-brand text-white py-2.5 rounded-lg text-sm
                         font-semibold hover:bg-blue-700 transition-colors
                         disabled:opacity-60">
              {loading ? "Creating..." : "Create Election"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════
// REGISTER VOTER MODAL
// ════════════════════════════════════════════════════════
function RegisterVoterModal({ onClose }) {
  const [form, setForm] = useState({
    full_name: "", email: "", student_number: "",
    password: "", department: "", level: "", eligibility_group: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error,   setError]   = useState("");

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    setLoading(true);
    try {
      const { authAPI: aAPI } = await import("../services/api");
      await aAPI.register(form);
      setSuccess(`✅ Voter "${form.full_name}" (${form.student_number}) registered successfully!`);
      setForm({ full_name:"", email:"", student_number:"",
                password:"", department:"", level:"", eligibility_group:"" });
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg
                      max-h-[90vh] overflow-y-auto">
        <div className="bg-navy px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-white font-bold text-lg">👤 Register New Voter</h2>
          <button onClick={onClose}
            className="text-blue-300 hover:text-white text-2xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {[
            { label: "Full Name *",           name: "full_name",       placeholder: "e.g. Aminata Koroma" },
            { label: "Email Address *",        name: "email",           placeholder: "e.g. aminata@college.edu", type: "email" },
            { label: "Student Number *",       name: "student_number",  placeholder: "e.g. CS/2021/042" },
            { label: "Password *",             name: "password",        placeholder: "Min. 8 characters", type: "password" },
            { label: "Department",             name: "department",      placeholder: "e.g. Computer Science" },
            { label: "Level / Year",           name: "level",           placeholder: "e.g. 400" },
            { label: "Eligibility Group",      name: "eligibility_group", placeholder: "e.g. undergraduate" },
          ].map(({ label, name, placeholder, type = "text" }) => (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type={type} name={name} value={form[name]}
                onChange={handleChange} placeholder={placeholder}
                required={label.includes("*")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          ))}

          {error   && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">⚠️ {error}</p>}
          {success && <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">{success}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50">
              Close
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-green-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-60">
              {loading ? "Registering..." : "Register Voter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════
// ELECTION CARD
// ════════════════════════════════════════════════════════
function ElectionCard({ election, onStatusChange }) {
  const navigate  = useNavigate();
  const [updating, setUpdating] = useState(false);

  const NEXT_STATUS = {
    draft:  { label: "Open Voting",  next: "active",   color: "bg-green-600 hover:bg-green-700" },
    active: { label: "Close Voting", next: "closed",   color: "bg-red-600 hover:bg-red-700" },
    closed: { label: "Archive",      next: "archived", color: "bg-yellow-600 hover:bg-yellow-700" },
  };
  const transition = NEXT_STATUS[election.status];

  const handleStatusChange = async () => {
    if (!transition) return;
    const confirm_msg = `Are you sure you want to ${transition.label} this election?`;
    if (!window.confirm(confirm_msg)) return;
    setUpdating(true);
    try {
      await electionsAPI.updateStatus(election.election_id, transition.next);
      onStatusChange();
    } catch (err) {
      alert(err.response?.data?.detail || "Status update failed.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200
                    hover:shadow-md transition-shadow overflow-hidden">
      {/* Coloured top bar by status */}
      <div className={`h-1.5 ${
        election.status === "active"   ? "bg-green-500" :
        election.status === "closed"   ? "bg-red-500"   :
        election.status === "archived" ? "bg-yellow-500": "bg-gray-300"
      }`} />

      <div className="p-5">
        {/* Title + status badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-bold text-navy text-base leading-tight flex-1">
            {election.title}
          </h3>
          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium
                            whitespace-nowrap ${STATUS_STYLES[election.status]}`}>
            {STATUS_ICONS[election.status]} {election.status}
          </span>
        </div>

        {/* Description */}
        {election.description && (
          <p className="text-gray-500 text-sm mb-3 line-clamp-2">
            {election.description}
          </p>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "Positions",    value: election.total_positions ?? "—" },
            { label: "Votes Cast",   value: election.total_votes_cast ?? 0  },
            { label: "Type",         value: election.election_type === "single_choice"
                                            ? "Single" : "Multi" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-lg p-2 text-center">
              <p className="text-navy font-bold text-lg leading-none">{value}</p>
              <p className="text-gray-400 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Dates */}
        <div className="text-xs text-gray-400 space-y-0.5 mb-4">
          <p>🕐 Start: <span className="text-gray-600">{formatDate(election.start_time)}</span></p>
          <p>🕐 End:   <span className="text-gray-600">{formatDate(election.end_time)}</span></p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/admin/elections/${election.election_id}`)}
            className="flex-1 bg-brand text-white text-sm py-2 rounded-lg
                       hover:bg-blue-700 transition-colors font-medium">
            ⚙️ Manage
          </button>
          {transition && (
            <button
              onClick={handleStatusChange} disabled={updating}
              className={`flex-1 text-white text-sm py-2 rounded-lg
                          transition-colors font-medium disabled:opacity-60
                          ${transition.color}`}>
              {updating ? "..." : transition.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════
// MAIN ADMIN DASHBOARD
// ════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const { user } = useAuth();
  const [elections,       setElections]       = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showVoterModal,  setShowVoterModal]  = useState(false);
  const [filterStatus,    setFilterStatus]    = useState("all");

  const loadElections = async () => {
    try {
      setLoading(true);
      const res = await electionsAPI.list();
      setElections(res.data.elections || []);
    } catch (err) {
      console.error("Failed to load elections:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadElections(); }, []);

  // Summary counts
  const counts = {
    total:    elections.length,
    active:   elections.filter((e) => e.status === "active").length,
    draft:    elections.filter((e) => e.status === "draft").length,
    closed:   elections.filter((e) => e.status === "closed").length,
  };

  const filtered = filterStatus === "all"
    ? elections
    : elections.filter((e) => e.status === filterStatus);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center
                      justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy">
            Admin Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Welcome back, {user?.full_name}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowVoterModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5
                       rounded-lg text-sm font-semibold transition-colors">
            👤 Register Voter
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-brand hover:bg-blue-700 text-white px-4 py-2.5
                       rounded-lg text-sm font-semibold transition-colors">
            ➕ New Election
          </button>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Elections", value: counts.total,  color: "text-navy",        bg: "bg-blue-50"   },
          { label: "Active Now",      value: counts.active, color: "text-green-700",   bg: "bg-green-50"  },
          { label: "Draft",           value: counts.draft,  color: "text-gray-600",    bg: "bg-gray-50"   },
          { label: "Closed",          value: counts.closed, color: "text-red-600",     bg: "bg-red-50"    },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-4 text-center border border-gray-100`}>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-gray-500 text-sm mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Filter Tabs ── */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {["all", "draft", "active", "closed", "archived"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium
                        transition-colors border capitalize
                        ${filterStatus === s
                          ? "bg-navy text-white border-navy"
                          : "bg-white text-gray-600 border-gray-300 hover:border-navy"}`}>
            {s === "all" ? "All Elections" : `${STATUS_ICONS[s]} ${s}`}
          </button>
        ))}
      </div>

      {/* ── Elections Grid ── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-brand border-t-transparent
                          rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <span className="text-5xl block mb-3">🗳️</span>
          <p className="text-lg font-medium">No elections found</p>
          <p className="text-sm mt-1">
            {filterStatus === "all"
              ? "Click \"New Election\" to create your first one."
              : `No elections with status "${filterStatus}".`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((election) => (
            <ElectionCard
              key={election.election_id}
              election={election}
              onStatusChange={loadElections}
            />
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {showCreateModal && (
        <CreateElectionModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => loadElections()}
        />
      )}
      {showVoterModal && (
        <RegisterVoterModal onClose={() => setShowVoterModal(false)} />
      )}
    </div>
  );
}