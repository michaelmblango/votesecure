import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ApprovalPanel from "../components/ApprovalPanel";

export default function ApprovalsPage() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [count,   setCount]   = useState(null); // null = not loaded yet

  return (
    <div className="page-narrow">
      <button
        className="btn btn-ghost btn-sm"
        style={{ marginBottom: "1.5rem" }}
        onClick={() => navigate("/admin")}>
        Back to Dashboard
      </button>

      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--ink)", marginBottom: "0.25rem" }}>
          Admin Approvals
        </h1>
        <p style={{ fontSize: "0.9rem", color: "var(--slate)", margin: 0 }}>
          Sensitive actions require approval from all administrators.
          One rejection cancels the action entirely.
        </p>
      </div>

      <ApprovalPanel adminId={user?.user_id} onData={list => setCount(list.length)} />

      {count === 0 && (
        <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--slate)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>✓</div>
          <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: "0.375rem" }}>
            No pending approvals
          </div>
          <div style={{ fontSize: "0.875rem" }}>
            All sensitive actions are up to date.
          </div>
        </div>
      )}
    </div>
  );
}
