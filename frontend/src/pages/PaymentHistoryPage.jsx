import { useState, useEffect, useCallback } from "react";
import { licenceAPI } from "../services/api";

const STATUS_BADGE = {
  submitted:    "badge-amber",
  under_review: "badge-blue",
  verified:     "badge-green",
  rejected:     "badge-red",
};

function fmt(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await licenceAPI.paymentHistory();
      setPayments(r.data.payments || []);
      setError("");
    } catch {
      setError("Failed to load payment history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="page">
      <div className="section-header">
        <div>
          <div className="section-title">Payment History</div>
          <div className="section-sub">
            Licence purchases and payment receipts for your organisation
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ borderRadius: 8, marginBottom: "1.25rem" }}>
          <span>⚠</span> {error}
        </div>
      )}

      <div className="card" style={{ overflow: "hidden" }}>
        {loading && payments.length === 0 ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "4rem 0" }}>
            <div className="spinner" />
          </div>
        ) : payments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--slate)" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>💳</div>
            <div style={{ fontWeight: 600, color: "var(--ink)" }}>No payments yet</div>
            <div style={{ fontSize: "0.875rem", marginTop: "0.375rem" }}>
              Submitted licence payment receipts will appear here.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ minWidth: 720 }}>
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Reference</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Licence</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.payment_id}>
                    <td>
                      <span className="badge badge-blue" style={{ textTransform: "capitalize" }}>
                        {p.plan_name}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      ${Number(p.amount_usd).toFixed(2)}
                    </td>
                    <td style={{
                      fontSize: "0.8125rem", color: "var(--slate)",
                      maxWidth: 180, overflow: "hidden",
                      textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {p.payment_reference}
                    </td>
                    <td style={{ fontSize: "0.8125rem", color: "var(--slate)" }}>
                      {fmt(p.created_at)}
                    </td>
                    <td>
                      <span
                        className={`badge ${STATUS_BADGE[p.status] || "badge-slate"}`}
                        style={{ textTransform: "capitalize" }}>
                        {(p.status || "").replace(/_/g, " ")}
                      </span>
                    </td>
                    <td>
                      {p.licence_code ? (
                        <span style={{
                          fontFamily: "monospace", fontSize: "0.8125rem",
                          fontWeight: 700, color: "var(--confirm)",
                        }}>
                          {p.licence_code}
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.8125rem", color: "var(--slate)" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
