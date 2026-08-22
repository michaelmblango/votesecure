import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PLAN_ICONS = {
  free:         "🆓",
  starter:      "🌱",
  basic:        "📋",
  standard:     "⚡",
  professional: "🏛️",
  enterprise:   "🏢",
  custom:       "🤝",
};

export default function PricingPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL || "http://localhost:8000"}/api/org/plans`)
      .then(r => r.json())
      .then(d => setPlans(d.plans || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--ice)" }}>

      {/* Hero */}
      <div style={{ background: "var(--navy)", padding: "clamp(2rem, 6vw, 4rem) 1.25rem clamp(1.5rem, 4vw, 3rem)", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🗳️</div>
          <h1 style={{ color: "#fff", fontSize: "2.25rem", fontWeight: 800, margin: "0 0 1rem", letterSpacing: "-0.02em" }}>
            Simple, transparent pricing
          </h1>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "1.0625rem", lineHeight: 1.7, margin: 0 }}>
            Start free. Pay only when you need more voters.
            Every plan includes full security, audit logs, and real-time results.
          </p>
        </div>
      </div>

      {/* Plans */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "3rem 1.5rem" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "4rem 0" }}>
            <div className="spinner" />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))", gap: "1.25rem" }}>
            {plans.map((plan, idx) => {
              const isPopular   = plan.plan_name === "standard";
              const isCustom    = plan.plan_name === "custom";
              const isFree      = plan.plan_name === "free";

              return (
                <div key={plan.plan_id} style={{
                  background: isPopular ? "var(--navy)" : "#fff",
                  border: isPopular ? "2px solid var(--navy)" : "1px solid var(--border)",
                  borderRadius: 16,
                  padding: "1.75rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  position: "relative",
                  boxShadow: isPopular ? "0 8px 32px rgba(13,43,85,0.25)" : "var(--shadow)",
                }}>
                  {isPopular && (
                    <div style={{
                      position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                      background: "var(--blue)", color: "#fff",
                      fontSize: "0.75rem", fontWeight: 700, padding: "0.25rem 0.875rem",
                      borderRadius: 999, whiteSpace: "nowrap",
                    }}>
                      Most Popular
                    </div>
                  )}

                  {/* Plan name */}
                  <div>
                    <div style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>
                      {PLAN_ICONS[plan.plan_name] || "📦"}
                    </div>
                    <div style={{ fontSize: "1.125rem", fontWeight: 800, color: isPopular ? "#fff" : "var(--ink)", textTransform: "capitalize" }}>
                      {plan.plan_name}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: isPopular ? "rgba(255,255,255,0.65)" : "var(--slate)", marginTop: "0.25rem" }}>
                      {plan.description}
                    </div>
                  </div>

                  {/* Price */}
                  <div style={{ borderTop: `1px solid ${isPopular ? "rgba(255,255,255,0.15)" : "var(--border)"}`, paddingTop: "1rem" }}>
                    {isCustom ? (
                      <div style={{ fontSize: "1.5rem", fontWeight: 800, color: isPopular ? "#fff" : "var(--ink)" }}>
                        Contact us
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem" }}>
                        <span style={{ fontSize: "0.9375rem", color: isPopular ? "rgba(255,255,255,0.6)" : "var(--slate)", fontWeight: 500 }}>$</span>
                        <span style={{ fontSize: "2.5rem", fontWeight: 800, color: isPopular ? "#fff" : "var(--ink)", lineHeight: 1 }}>
                          {plan.price_usd === 0 ? "0" : Number(plan.price_usd).toFixed(0)}
                        </span>
                        {!isFree && (
                          <span style={{ fontSize: "0.875rem", color: isPopular ? "rgba(255,255,255,0.6)" : "var(--slate)" }}>
                            per election
                          </span>
                        )}
                      </div>
                    )}
                    <div style={{ marginTop: "0.5rem" }}>
                      <span className="badge" style={{
                        background: isPopular ? "rgba(255,255,255,0.15)" : "var(--blue-lt)",
                        color: isPopular ? "#fff" : "var(--blue)",
                        fontSize: "0.8125rem",
                      }}>
                        Up to {plan.max_voters >= 99999 ? "1,000+" : plan.max_voters.toLocaleString()} voters
                      </span>
                    </div>
                  </div>

                  {/* Features */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {[
                      "Two-factor authentication",
                      "Ballot secrecy guaranteed",
                      "Real-time results dashboard",
                      "Full audit trail",
                      "Vote receipt verification",
                      plan.plan_name !== "free" ? "Priority email support" : "Community support",
                    ].map(f => (
                      <div key={f} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: isPopular ? "rgba(255,255,255,0.8)" : "var(--slate)" }}>
                        <span style={{ color: isPopular ? "#6EE7B7" : "var(--confirm)", fontWeight: 700, flexShrink: 0 }}>✓</span>
                        {f}
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div style={{ marginTop: "0.5rem" }}>
                    {isCustom ? (
                      <a href="mailto:votesecure.online@gmail.com" style={{ display: "block", textAlign: "center", padding: "0.75rem", borderRadius: 8, fontWeight: 700, fontSize: "0.9375rem", textDecoration: "none", background: "var(--blue)", color: "#fff" }}>
                        Contact Us
                      </a>
                    ) : (
                      <Link to="/org/signup" style={{ display: "block", textAlign: "center", padding: "0.75rem", borderRadius: 8, fontWeight: 700, fontSize: "0.9375rem", textDecoration: "none", background: isPopular ? "#fff" : "var(--navy)", color: isPopular ? "var(--navy)" : "#fff" }}>
                        {isFree ? "Get started free" : "Get started"}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* FAQ strip */}
        <div style={{ marginTop: "4rem", maxWidth: 720, margin: "4rem auto 0" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--ink)", textAlign: "center", marginBottom: "2rem" }}>
            Common questions
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: "var(--border)", borderRadius: 12, overflow: "hidden" }}>
            {[
              {
                q: "How does payment work?",
                a: "When you create an election requiring a paid plan, you send your payment receipt to votesecure.online@gmail.com with your organisation name and plan. We verify and email you a one-time licence code within one business day. You enter the code to unlock that election.",
              },
              {
                q: "Is the free plan really free?",
                a: "Yes. Up to 10 voters, one election at a time, no credit card required. All security features included.",
              },
              {
                q: "Can I run multiple elections?",
                a: "Yes. Each election requires its own licence for paid plans. Free elections are unlimited.",
              },
              {
                q: "What counts as a voter?",
                a: "Any person registered in the system who is eligible to vote in a specific election.",
              },
              {
                q: "Is my data secure?",
                a: "Voter identity is permanently separated from ballot content at the database level. No administrator can link a voter to their candidate choice. All votes are cryptographically hashed.",
              },
            ].map(({ q, a }) => (
              <details key={q} style={{ background: "#fff" }}>
                <summary style={{ padding: "1.125rem 1.25rem", cursor: "pointer", fontWeight: 600, color: "var(--ink)", fontSize: "0.9375rem", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  {q}
                  <span style={{ color: "var(--slate)", fontSize: "1.25rem", lineHeight: 1, flexShrink: 0, marginLeft: "1rem" }}>+</span>
                </summary>
                <div style={{ padding: "0 1.25rem 1.25rem", color: "var(--slate)", fontSize: "0.9rem", lineHeight: 1.7, borderTop: "1px solid var(--border)" }}>
                  {a}
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div style={{ textAlign: "center", marginTop: "3.5rem", padding: "clamp(1.5rem, 4vw, 2.5rem)", background: "var(--navy)", borderRadius: 16 }}>
          <h2 style={{ color: "#fff", fontSize: "1.5rem", fontWeight: 800, margin: "0 0 0.75rem" }}>
            Ready to run your first election?
          </h2>
          <p style={{ color: "rgba(255,255,255,0.65)", margin: "0 0 1.5rem", fontSize: "0.9375rem" }}>
            Takes 5 minutes to set up. Free for up to 10 voters.
          </p>
          <Link to="/org/signup" style={{ display: "inline-block", background: "#fff", color: "var(--navy)", fontWeight: 800, fontSize: "1rem", padding: "0.875rem 2rem", borderRadius: 8, textDecoration: "none" }}>
            Create your organisation
          </Link>
        </div>
      </div>
    </div>
  );
}
