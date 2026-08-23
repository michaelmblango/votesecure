import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { electionsAPI, licenceAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

const STATUS = {
  draft:    { label: "Draft",    cls: "badge-slate", dot: "#94A3B8" },
  active:   { label: "Live",     cls: "badge-green", dot: "#059669" },
  closed:   { label: "Closed",   cls: "badge-red",   dot: "#DC2626" },
  archived: { label: "Archived", cls: "badge-amber", dot: "#D97706" },
};
const NEXT = {
  draft:  { label: "Open Voting",  next: "active",   cls: "btn-success" },
  active: { label: "Close Voting", next: "closed",   cls: "btn-danger"  },
  closed: { label: "Archive",      next: "archived", cls: "btn-ghost"   },
};

function fmt(dt) {
  if (!dt) return "N/A";
  return new Date(dt).toLocaleString("en-GB", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });
}

// ── Licence Gate Modal ────────────────────────────────────────
// Shown when admin tries to create election requiring paid plan
function LicenceGateModal({ plan, onClose, onLicenceActivated }) {
  const [step, setStep]             = useState("choose"); // choose | request | activate
  const [licenceCode, setLicenceCode] = useState("");
  const [payRef, setPayRef]         = useState("");
  const [payNote, setPayNote]       = useState("");
  const [loading, setLoading]       = useState(false);
  const [message, setMessage]       = useState("");
  const [error, setError]           = useState("");

  const handleRequest = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await licenceAPI.requestLicence({
        plan_name: plan.plan_name,
        payment_reference: payRef,
        receipt_note: payNote,
      });
      setMessage(res.data.message);
      setStep("waiting");
    } catch (err) { setError(err.response?.data?.detail || "Failed to submit."); }
    finally { setLoading(false); }
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await licenceAPI.activate({ licence_code: licenceCode.toUpperCase().trim() });
      onLicenceActivated(res.data);
    } catch (err) { setError(err.response?.data?.detail || "Invalid licence code."); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal animate-in" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--ink)" }}>
            {step === "activate" ? "Enter Licence Code" : "Election Licence Required"}
          </div>
          <div style={{ fontSize: "0.8125rem", color: "var(--slate)", marginTop: 2 }}>
            {plan.plan_name.charAt(0).toUpperCase() + plan.plan_name.slice(1)} plan - up to {plan.max_voters} voters - ${Number(plan.price_usd).toFixed(2)}
          </div>
        </div>

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {step === "choose" && (
            <>
              <div className="alert alert-info" style={{ borderRadius: 8 }}>
                <span>ℹ</span>
                <div style={{ fontSize: "0.875rem" }}>
                  This election requires a paid licence. You can submit your payment receipt and we will email you a licence code, or enter a code you already have.
                </div>
              </div>
              <button className="btn btn-navy" onClick={() => setStep("request")}>
                Submit Payment Receipt
              </button>
              <button className="btn btn-ghost" onClick={() => setStep("activate")}>
                I already have a licence code
              </button>
            </>
          )}

          {step === "request" && (
            <form onSubmit={handleRequest} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="alert alert-warning" style={{ borderRadius: 8 }}>
                <span>💳</span>
                <div style={{ fontSize: "0.875rem" }}>
                  Send your payment of <strong>${Number(plan.price_usd).toFixed(2)}</strong> to{" "}
                  <strong>votesecure.online@gmail.com</strong> then fill in your reference below.
                </div>
              </div>
              <div>
                <label className="input-label">Payment Reference *</label>
                <input className="input" value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="e.g. transaction ID, M-Pesa code, bank reference" required />
              </div>
              <div>
                <label className="input-label">Note (optional)</label>
                <textarea className="input" rows={2} value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Any extra information about your payment" style={{ resize: "none" }} />
              </div>
              {error && <div className="alert alert-error" style={{ borderRadius: 8 }}><span>⚠</span> {error}</div>}
              <button type="submit" className="btn btn-navy" disabled={loading}>
                {loading ? "Submitting..." : "Submit Receipt"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setStep("choose")}>Back</button>
            </form>
          )}

          {step === "waiting" && (
            <>
              <div className="alert alert-success" style={{ borderRadius: 8 }}>
                <span>✓</span>
                <div style={{ fontSize: "0.875rem" }}>{message}</div>
              </div>
              <p style={{ fontSize: "0.875rem", color: "var(--slate)" }}>
                Once you receive your licence code by email, click below to enter it and unlock your election.
              </p>
              <button className="btn btn-navy" onClick={() => setStep("activate")}>
                Enter Licence Code
              </button>
            </>
          )}

          {step === "activate" && (
            <form onSubmit={handleActivate} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label className="input-label">Licence Code *</label>
                <input
                  className="input text-mono"
                  value={licenceCode}
                  onChange={e => setLicenceCode(e.target.value)}
                  placeholder="XXXX-XXXX-XXXX"
                  required
                  style={{ textAlign: "center", fontSize: "1.25rem", letterSpacing: "0.1em" }}
                />
              </div>
              {error && <div className="alert alert-error" style={{ borderRadius: 8 }}><span>⚠</span> {error}</div>}
              <button type="submit" className="btn btn-success" disabled={loading}>
                {loading ? "Activating..." : "Activate Licence"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setStep("choose")}>Back</button>
            </form>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Create Election Modal (plan-aware) ────────────────────────
function CreateElectionModal({ onClose, onCreated }) {
  const [plans, setPlans]           = useState([]);
  const [voterCount, setVoterCount] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [licenceData, setLicenceData]   = useState(null); // set after licence activated
  const [showGate, setShowGate]         = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", election_type: "single_choice",
    start_time: "", end_time: "", eligible_group: "", is_public_results: false,
  });
  const [step, setStep]     = useState("plan");  // plan | details | confirm
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    licenceAPI.plans().then(r => setPlans(r.data.plans || [])).catch(() => {});
  }, []);

  // Determine required plan from voter count
  const requiredPlan = voterCount
    ? plans.find(p => p.max_voters >= Number(voterCount) && p.plan_name !== "custom")
      || plans.find(p => p.plan_name === "custom")
    : null;

  const handleVoterCountNext = () => {
    if (!voterCount || Number(voterCount) < 1) { setError("Enter a valid voter count."); return; }
    setError("");
    setSelectedPlan(requiredPlan);
    if (!requiredPlan) { setError("Could not determine a plan for this voter count."); return; }
    if (requiredPlan.plan_name === "custom") {
      setError("For over 1,000 voters please contact us at votesecure.online@gmail.com");
      return;
    }
    if (requiredPlan.price_usd > 0 && !licenceData) {
      setShowGate(true);
    } else {
      setStep("details");
    }
  };

  const handleLicenceActivated = (data) => {
    setLicenceData(data);
    setShowGate(false);
    setStep("details");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const payload = {
        ...form,
        eligible_group: form.eligible_group || null,
        start_time: new Date(form.start_time).toISOString(),
        end_time:   new Date(form.end_time).toISOString(),
        max_voters: Number(voterCount),
        plan_name:  selectedPlan?.plan_name || "free",
        licence_id: licenceData?.licence_id || null,
      };
      const res = await electionsAPI.create(payload);
      onCreated(res.data.election);
      onClose();
    } catch (err) { setError(err.response?.data?.detail || "Failed to create election."); }
    finally { setLoading(false); }
  };

  return (
    <>
      <div className="modal-backdrop">
        <div className="modal animate-in">
          <div className="modal-header">
            <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--ink)" }}>
              {step === "plan" ? "New Election" : "Election Details"}
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--slate)", marginTop: 2 }}>
              {step === "plan" ? "Start by selecting your voter count" : "Configure your election"}
            </div>
          </div>

          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* STEP: Choose voter count and plan */}
            {step === "plan" && (
              <>
                <div>
                  <label className="input-label">Expected Number of Voters *</label>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    value={voterCount}
                    onChange={e => { setVoterCount(e.target.value); setError(""); }}
                    placeholder="e.g. 45"
                  />
                </div>

                {/* Show required plan */}
                {voterCount && Number(voterCount) > 0 && requiredPlan && (
                  <div className="animate-in" style={{
                    background: requiredPlan.price_usd === 0 ? "var(--confirm-lt)" : "var(--blue-lt)",
                    border: `1px solid ${requiredPlan.price_usd === 0 ? "var(--confirm)" : "var(--blue)"}`,
                    borderRadius: 10, padding: "1rem 1.25rem",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 700, color: "var(--ink)", textTransform: "capitalize" }}>
                          {requiredPlan.plan_name} Plan
                        </div>
                        <div style={{ fontSize: "0.8125rem", color: "var(--slate)", marginTop: 2 }}>
                          Up to {requiredPlan.max_voters.toLocaleString()} voters
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "1.5rem", fontWeight: 800, color: requiredPlan.price_usd === 0 ? "var(--confirm)" : "var(--blue)" }}>
                          {requiredPlan.price_usd === 0 ? "Free" : `$${Number(requiredPlan.price_usd).toFixed(2)}`}
                        </div>
                        {requiredPlan.price_usd > 0 && (
                          <div style={{ fontSize: "0.75rem", color: "var(--slate)" }}>per election</div>
                        )}
                      </div>
                    </div>
                    {licenceData && (
                      <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(0,0,0,0.08)", fontSize: "0.8125rem", color: "var(--confirm)", fontWeight: 600 }}>
                        Licence activated: {licenceData.plan_name} ({licenceData.max_voters} voters)
                      </div>
                    )}
                  </div>
                )}

                {error && <div className="alert alert-error" style={{ borderRadius: 8 }}><span>⚠</span> {error}</div>}

                <button className="btn btn-navy" onClick={handleVoterCountNext} disabled={!voterCount}>
                  {requiredPlan?.price_usd > 0 && !licenceData ? "Continue to Payment" : "Continue"}
                </button>
              </>
            )}

            {/* STEP: Election details form */}
            {step === "details" && (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label className="input-label">Election Title *</label>
                  <input className="input" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="e.g. 2025 Student Union Election" required />
                </div>
                <div>
                  <label className="input-label">Description</label>
                  <textarea className="input" rows={2} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} style={{ resize: "none" }} />
                </div>
                <div>
                  <label className="input-label">Voting Method *</label>
                  <select className="input" value={form.election_type} onChange={e => setForm(f => ({...f, election_type: e.target.value}))}>
                    <option value="single_choice">Single choice - pick one candidate</option>
                    <option value="multi_choice">Multi-choice - pick multiple candidates</option>
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label className="input-label">Start *</label>
                    <input className="input" type="datetime-local" value={form.start_time} onChange={e => setForm(f => ({...f, start_time: e.target.value}))} required />
                  </div>
                  <div>
                    <label className="input-label">End *</label>
                    <input className="input" type="datetime-local" value={form.end_time} onChange={e => setForm(f => ({...f, end_time: e.target.value}))} required />
                  </div>
                </div>
                <div>
                  <label className="input-label">Eligible Group</label>
                  <input className="input" value={form.eligible_group} onChange={e => setForm(f => ({...f, eligible_group: e.target.value}))} placeholder="Leave blank for all voters" />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: "0.625rem", cursor: "pointer" }}>
                  <input type="checkbox" checked={form.is_public_results} onChange={e => setForm(f => ({...f, is_public_results: e.target.checked}))} style={{ width: 16, height: 16, accentColor: "var(--blue)" }} />
                  <span style={{ fontSize: "0.875rem" }}>Show live results during voting</span>
                </label>

                {error && <div className="alert alert-error" style={{ borderRadius: 8 }}><span>⚠</span> {error}</div>}

                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setStep("plan")} style={{ flex: 1 }}>Back</button>
                  <button type="submit" className="btn btn-navy" disabled={loading} style={{ flex: 2 }}>
                    {loading ? "Creating..." : "Create Election"}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>

      {showGate && selectedPlan && (
        <LicenceGateModal
          plan={selectedPlan}
          onClose={() => setShowGate(false)}
          onLicenceActivated={handleLicenceActivated}
        />
      )}
    </>
  );
}

// ── Register Voter Modal ──────────────────────────────────────
function RegisterVoterModal({ onClose }) {
  const fields = [
    { key:"full_name",         label:"Full Name *",        placeholder:"e.g. Aminata Koroma",   type:"text"     },
    { key:"email",             label:"Email Address *",     placeholder:"voter@college.edu",     type:"email"    },
    { key:"student_number",    label:"Student Number *",    placeholder:"e.g. CS/2021/042",      type:"text"     },
    { key:"password",          label:"Password *",          placeholder:"Min. 8 characters",     type:"password" },
    { key:"department",        label:"Department",          placeholder:"e.g. Computer Science", type:"text"     },
    { key:"level",             label:"Level / Year",        placeholder:"e.g. 400",              type:"text"     },
    { key:"eligibility_group", label:"Eligibility Group",   placeholder:"e.g. undergraduate",    type:"text"     },
  ];
  const empty = { full_name:"", email:"", student_number:"", password:"", department:"", level:"", eligibility_group:"" };
  const [form, setForm]       = useState(empty);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError]     = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(""); setSuccess(""); setLoading(true);
    try {
      const { authAPI: aAPI } = await import("../services/api");
      await aAPI.register(form);
      setSuccess(`Voter "${form.full_name}" (${form.student_number}) registered.`);
      setForm(empty);
    } catch (err) { setError(err.response?.data?.detail || "Registration failed."); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal animate-in" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div style={{ fontSize: "1.125rem", fontWeight: 700 }}>Register Voter</div>
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
            {error   && <div className="alert alert-error"   style={{ borderRadius:8 }}><span>⚠</span> {error}</div>}
            {success && <div className="alert alert-success" style={{ borderRadius:8 }}><span>✓</span> {success}</div>}
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
  const accentClass = { active:"card-accent-green", closed:"card-accent-red", archived:"card-accent-amber", draft:"card-accent-slate" }[election.status];

  const changeStatus = async () => {
    if (!nx) return;
    if (!window.confirm(`${nx.label} this election?`)) return;
    setBusy(true);
    try { await electionsAPI.updateStatus(election.election_id, nx.next); onRefresh(); }
    catch (err) { alert(err.response?.data?.detail || "Failed."); }
    finally { setBusy(false); }
  };

  return (
    <div className={`card ${accentClass} animate-in`} style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem" }}>
        <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--ink)", lineHeight: 1.35, flex: 1 }}>{election.title}</div>
        <span className={`badge ${st.cls}`}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.dot }} />
          {st.label}
        </span>
      </div>
      {election.description && (
        <p className="truncate-2" style={{ fontSize: "0.875rem", color: "var(--slate)", margin: 0, lineHeight: 1.5 }}>{election.description}</p>
      )}
      <div className="election-card-stats">
        {[
          { label: "Positions",  value: election.total_positions  ?? 0 },
          { label: "Votes Cast", value: election.total_votes_cast ?? 0 },
          { label: "Max Voters", value: election.max_voters       ?? 10 },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "var(--ice)", borderRadius: 8, padding: "0.5rem 0.625rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--ink)", lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: "0.6875rem", color: "var(--slate)", marginTop: 2, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: "0.8rem", color: "var(--slate)", display: "flex", flexDirection: "column", gap: "0.125rem" }}>
        <span>Opens: {fmt(election.start_time)}</span>
        <span>Closes: {fmt(election.end_time)}</span>
        {election.plan_name && (
          <span style={{ marginTop: "0.125rem" }}>
            <span className={`badge ${election.plan_name === "free" ? "badge-slate" : "badge-blue"}`} style={{ fontSize: "0.7rem" }}>
              {election.plan_name.charAt(0).toUpperCase() + election.plan_name.slice(1)} plan
            </span>
          </span>
        )}
      </div>
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
  const { user } = useAuth();
  const [elections, setElections]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showVoter, setShowVoter]   = useState(false);
  const [filter, setFilter]         = useState("all");

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

      {/* Org context banner */}
      {user?.org_name && (
        <div style={{ background: "var(--navy)", borderRadius: 10, padding: "0.875rem 1.25rem", marginBottom: "1.75rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: 36, height: 36, background: "rgba(255,255,255,0.12)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.125rem" }}>🏛️</div>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.9375rem" }}>{user.org_name}</div>
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.75rem" }}>
                {user.is_owner ? "Organisation Owner" : "Administrator"}
              </div>
            </div>
          </div>
          <span className="badge badge-green" style={{ fontSize: "0.75rem" }}>Active</span>
        </div>
      )}

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
      <div className="stats-grid-4" style={{ gap: "1rem", marginBottom: "2rem" }}>
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
          <button key={s} onClick={() => setFilter(s)} className={`btn btn-sm ${filter === s ? "btn-navy" : "btn-ghost"}`} style={{ textTransform: "capitalize" }}>
            {s === "all" ? "All Elections" : s}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "4rem 0" }}><div className="spinner" /></div>
      ) : visible.length === 0 ? (
        <div style={{ textAlign: "center", padding: "5rem 0", color: "var(--slate)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🗳️</div>
          <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--ink)" }}>No elections found</div>
          <div style={{ fontSize: "0.875rem", marginTop: "0.375rem" }}>
            {filter === "all" ? "Click New Election to get started." : `No ${filter} elections.`}
          </div>
          {filter === "all" && (
            <button className="btn btn-navy" style={{ marginTop: "1.25rem" }} onClick={() => setShowCreate(true)}>
              + Create your first election
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(320px, 100%), 1fr))", gap: "1.25rem" }}>
          {visible.map(e => <ElectionCard key={e.election_id} election={e} onRefresh={load} />)}
        </div>
      )}

      {showCreate && <CreateElectionModal onClose={() => setShowCreate(false)} onCreated={load} />}
      {showVoter  && <RegisterVoterModal  onClose={() => setShowVoter(false)} />}
    </div>
  );
}
