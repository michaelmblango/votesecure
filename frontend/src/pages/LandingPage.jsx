import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

// ── Animated counter ──────────────────────────────────────────
function Counter({ target, suffix = "" }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const step     = Math.ceil(target / 40);
    const interval = setInterval(() => {
      setCount(prev => {
        if (prev + step >= target) { clearInterval(interval); return target; }
        return prev + step;
      });
    }, 30);
    return () => clearInterval(interval);
  }, [target]);
  return <span>{count.toLocaleString()}{suffix}</span>;
}

export default function LandingPage() {
  const [stats, setStats] = useState(null);
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    // Load public stats for social proof (unauthenticated endpoint - no PII)
    fetch(`${API}/api/public/stats`)
    .then(r => r.ok ? r.json() : null)
    .then(d => { if (d) setStats(d); })
    .catch(() => {});

    // Load plans for pricing preview
    fetch(`${API}/api/org/plans`)
    .then(r => r.json())
    .then(d => setPlans(d.plans || []))
    .catch(() => {});
  }, []);

  return (
    <div style={{ overflowX: "hidden" }}>

      {/* ═══════════════════════════════════════════════════════
          HERO SECTION
      ═══════════════════════════════════════════════════════ */}
      <section style={{
        background: "linear-gradient(160deg, #0A0F1E 0%, #0D2B55 60%, #1565C0 100%)",
        padding: "clamp(4rem, 10vw, 7rem) 1.5rem clamp(3rem, 8vw, 6rem)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background grid pattern */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.04,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />

        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div className="hero-grid" style={{ position: "relative", zIndex: 1 }}>

            {/* Left — copy */}
            <div style={{ maxWidth: 640 }}>
              {/* Badge */}
              <div style={{
                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 999, padding: "0.375rem 1rem",
                marginBottom: "1.75rem",
              }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22C55E", flexShrink: 0 }} />
                <span style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.8125rem", fontWeight: 500 }}>
                  Live at AI Professional College
                </span>
              </div>

              <h1 style={{
                color: "#fff",
                fontSize: "clamp(2.25rem, 6vw, 3.75rem)",
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
                margin: "0 0 1.25rem",
              }}>
                Secure elections
                <br />
                <span style={{ color: "#60A5FA" }}>your institution</span>
                <br />
                can trust
              </h1>

              <p style={{
                color: "rgba(255,255,255,0.65)",
                fontSize: "clamp(1rem, 2.5vw, 1.1875rem)",
                lineHeight: 1.7,
                margin: "0 0 2.25rem",
                maxWidth: 520,
              }}>
                VoteSecure replaces slow, error-prone paper ballots with a
                cryptographically secure, fully auditable digital voting platform.
                Built for universities, student unions, corporations, and community organisations.
              </p>

              {/* CTAs */}
              <div style={{ display: "flex", gap: "0.875rem", flexWrap: "wrap" }}>
                <Link to="/org/signup" style={{
                  display: "inline-flex", alignItems: "center", gap: "0.5rem",
                  background: "#fff", color: "#0D2B55",
                  fontWeight: 800, fontSize: "0.9375rem",
                  padding: "0.875rem 1.75rem", borderRadius: 10,
                  textDecoration: "none",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
                  transition: "transform 0.15s, box-shadow 0.15s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.3)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.25)"; }}>
                  Start for free
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                </Link>
                <Link to="/pricing" style={{
                  display: "inline-flex", alignItems: "center", gap: "0.5rem",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#fff", fontWeight: 600, fontSize: "0.9375rem",
                  padding: "0.875rem 1.75rem", borderRadius: 10,
                  textDecoration: "none", transition: "background 0.15s",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.14)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}>
                  View pricing
                </Link>
              </div>

              {/* Trust signals */}
              <div style={{
                display: "flex", gap: "1.5rem", marginTop: "2.25rem",
                flexWrap: "wrap",
              }}>
                {[
                  { icon: "🔒", text: "End-to-end encrypted" },
                  { icon: "🔍", text: "Fully auditable" },
                  { icon: "🆓", text: "Free up to 10 voters" },
                ].map(({ icon, text }) => (
                  <div key={text} style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                    <span style={{ fontSize: "0.875rem" }}>{icon}</span>
                    <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.8125rem" }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — visual mockup */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 20,
                padding: "1.5rem",
                width: "100%",
                maxWidth: 420,
                backdropFilter: "blur(10px)",
              }}>
                {/* Mock ballot */}
                <div style={{ background: "#fff", borderRadius: 12, padding: "1.25rem", marginBottom: "0.875rem" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--slate)", marginBottom: "0.875rem" }}>
                    2025 Student Union Election
                  </div>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--ink)", marginBottom: "0.75rem" }}>
                    Student Union President
                  </div>
                  {[
                    { name: "Aminata Koroma",    selected: true  },
                    { name: "Ibrahim Conteh",     selected: false },
                    { name: "Fatima Sesay",       selected: false },
                  ].map(({ name, selected }) => (
                    <div key={name} style={{
                      display: "flex", alignItems: "center", gap: "0.625rem",
                      padding: "0.625rem 0.75rem", borderRadius: 8, marginBottom: "0.375rem",
                      border: `2px solid ${selected ? "#1565C0" : "#E2E8F0"}`,
                      background: selected ? "#EEF4FB" : "#FAFBFD",
                    }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: "50%",
                        border: `2px solid ${selected ? "#1565C0" : "#CBD5E1"}`,
                        background: selected ? "#1565C0" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        {selected && <svg width="10" height="10" fill="white" viewBox="0 0 12 12"><path d="M10 3L5 8.5 2 5.5l-1 1 4 4 6-7-1-1z"/></svg>}
                      </div>
                      <span style={{ fontSize: "0.8125rem", fontWeight: selected ? 600 : 400, color: selected ? "#0D2B55" : "var(--slate)" }}>
                        {name}
                      </span>
                    </div>
                  ))}
                  <button style={{
                    width: "100%", marginTop: "0.75rem",
                    padding: "0.625rem", borderRadius: 8,
                    background: "#0D2B55", color: "#fff",
                    border: "none", fontWeight: 700, fontSize: "0.875rem",
                    cursor: "pointer",
                  }}>
                    Submit Vote
                  </button>
                </div>

                {/* Mock receipt */}
                <div style={{
                  background: "rgba(34,197,94,0.12)",
                  border: "1px solid rgba(34,197,94,0.25)",
                  borderRadius: 10, padding: "0.875rem",
                  display: "flex", alignItems: "center", gap: "0.625rem",
                }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#22C55E", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="14" height="14" fill="white" viewBox="0 0 12 12"><path d="M10 3L5 8.5 2 5.5l-1 1 4 4 6-7-1-1z"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#065F46" }}>Vote recorded</div>
                    <div style={{ fontSize: "0.7rem", color: "#059669", fontFamily: "monospace", marginTop: 2 }}>
                      a8f5f167f44f4964...
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          PROBLEM STRIP
      ═══════════════════════════════════════════════════════ */}
      <section style={{ background: "#fff", padding: "3rem 1.5rem", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: "0.875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--slate)", marginBottom: "1rem" }}>
            The problem with manual voting
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))", gap: "1.5rem" }}>
            {[
              { icon: "📋", title: "Paper ballots are slow", desc: "Counting takes hours. Results are delayed. Disputes follow." },
              { icon: "🙋", title: "Identity fraud happens", desc: "Manual verification is inconsistent. Anyone can impersonate a voter." },
              { icon: "🔎", title: "No audit trail", desc: "When disputes arise, there is nothing to investigate. Trust collapses." },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ padding: "1.25rem", background: "var(--ice)", borderRadius: 12, textAlign: "left" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.625rem" }}>{icon}</div>
                <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: "0.375rem", fontSize: "0.9375rem" }}>{title}</div>
                <div style={{ color: "var(--slate)", fontSize: "0.875rem", lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FEATURES
      ═══════════════════════════════════════════════════════ */}
      <section style={{ padding: "clamp(3rem, 8vw, 5rem) 1.5rem", background: "var(--ice)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)", fontWeight: 800, color: "var(--ink)", margin: "0 0 0.75rem", letterSpacing: "-0.02em" }}>
              Built on three guarantees
            </h2>
            <p style={{ color: "var(--slate)", fontSize: "1.0625rem", maxWidth: 520, margin: "0 auto" }}>
              Every design decision in VoteSecure traces back to these.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", gap: "1.5rem" }}>
            {[
              {
                color:   "#1565C0",
                bg:      "#EEF4FB",
                icon:    "🔐",
                title:   "Voter authentication",
                desc:    "Two-factor login combining your institutional ID with a one-time code sent to your registered email. No one can vote on your behalf.",
                points:  ["Password + OTP verification", "Account lockout after failed attempts", "Every login event logged"],
              },
              {
                color:   "#059669",
                bg:      "#DCFCE7",
                icon:    "🗳️",
                title:   "Ballot secrecy",
                desc:    "Your vote is permanently separated from your identity at the database level. No administrator, query, or report can link you to your choice.",
                points:  ["Schema-level anonymity", "No voter-to-candidate link possible", "Verified by independent audit"],
              },
              {
                color:   "#D97706",
                bg:      "#FEF3C7",
                icon:    "🔍",
                title:   "Vote integrity",
                desc:    "Every ballot receives a SHA-256 cryptographic receipt the moment it is cast. If the record is altered, the tampering is mathematically detectable.",
                points:  ["Cryptographic receipt per vote", "Public verification endpoint", "Tamper-evident audit trail"],
              },
            ].map(({ color, bg, icon, title, desc, points }) => (
              <div key={title} className="card" style={{ padding: "1.75rem", borderTop: `3px solid ${color}` }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.375rem", marginBottom: "1rem" }}>
                  {icon}
                </div>
                <h3 style={{ fontWeight: 700, color: "var(--ink)", marginBottom: "0.5rem", fontSize: "1.0625rem" }}>{title}</h3>
                <p style={{ color: "var(--slate)", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "1rem" }}>{desc}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                  {points.map(p => (
                    <div key={p} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", color: "var(--slate)" }}>
                      <span style={{ color, fontWeight: 700, flexShrink: 0 }}>✓</span> {p}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          HOW IT WORKS
      ═══════════════════════════════════════════════════════ */}
      <section style={{ padding: "clamp(3rem, 8vw, 5rem) 1.5rem", background: "#fff" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)", fontWeight: 800, color: "var(--ink)", margin: "0 0 0.75rem", letterSpacing: "-0.02em" }}>
              Up and running in minutes
            </h2>
            <p style={{ color: "var(--slate)", fontSize: "1.0625rem", maxWidth: 480, margin: "0 auto" }}>
              No technical knowledge required. No infrastructure to manage.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              {
                step: "01",
                title: "Create your organisation",
                desc:  "Sign up with a minimum of three administrators. Each receives their own credentials. Your account activates automatically when all three have joined.",
                color: "#1565C0",
              },
              {
                step: "02",
                title: "Set up your election",
                desc:  "Create an election, define the positions, register candidates, and add your eligible voter list. Free for up to 10 voters. Paid plans start at $49.",
                color: "#059669",
              },
              {
                step: "03",
                title: "Voters authenticate and vote",
                desc:  "Each voter logs in with their registration number and a one-time email code. They see their ballot, make their choice, and receive a cryptographic receipt.",
                color: "#D97706",
              },
              {
                step: "04",
                title: "Results publish automatically",
                desc:  "When voting closes, results are tallied instantly. Winners are declared per position. Any voter can verify their receipt at any time.",
                color: "#0D2B55",
              },
            ].map(({ step, title, desc, color }, idx, arr) => (
              <div key={step} style={{ display: "flex", gap: "1.5rem", paddingBottom: idx < arr.length - 1 ? "2rem" : 0 }}>
                {/* Step number + connector */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: "50%",
                    background: color, color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: "0.875rem", flexShrink: 0,
                  }}>
                    {step}
                  </div>
                  {idx < arr.length - 1 && (
                    <div style={{ width: 2, flex: 1, background: "var(--border)", margin: "0.5rem 0" }} />
                  )}
                </div>
                {/* Content */}
                <div style={{ paddingTop: "0.625rem", paddingBottom: idx < arr.length - 1 ? "1rem" : 0 }}>
                  <h3 style={{ fontWeight: 700, color: "var(--ink)", margin: "0 0 0.375rem", fontSize: "1.0625rem" }}>{title}</h3>
                  <p style={{ color: "var(--slate)", fontSize: "0.9rem", lineHeight: 1.6, margin: 0 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          STATS / SOCIAL PROOF
      ═══════════════════════════════════════════════════════ */}
      <section style={{ background: "var(--navy)", padding: "clamp(2.5rem, 6vw, 4rem) 1.5rem" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "2rem" }}>
            Trusted by institutions
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(160px, 100%), 1fr))", gap: "2rem" }}>
            {[
              { value: stats?.votes                || 0, label: "Votes cast",        suffix: "+" },
              { value: stats?.elections             || 0, label: "Elections run",      suffix: "+" },
              { value: stats?.active_organisations  || 0, label: "Active organisations", suffix: "+" },
              { value: 100,                               label: "Uptime guarantee",    suffix: "%" },
            ].map(({ value, label, suffix }) => (
              <div key={label}>
                <div style={{ fontSize: "clamp(2rem, 5vw, 2.75rem)", fontWeight: 800, color: "#fff", lineHeight: 1 }}>
                  <Counter target={value} suffix={suffix} />
                </div>
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.8125rem", marginTop: "0.375rem" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          PRICING PREVIEW
      ═══════════════════════════════════════════════════════ */}
      <section style={{ padding: "clamp(3rem, 8vw, 5rem) 1.5rem", background: "var(--ice)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)", fontWeight: 800, color: "var(--ink)", margin: "0 0 0.5rem", letterSpacing: "-0.02em" }}>
            Simple pricing
          </h2>
          <p style={{ color: "var(--slate)", fontSize: "1.0625rem", marginBottom: "2.5rem" }}>
            Start free. Pay only when you need more voters.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))", gap: "1rem", marginBottom: "2rem" }}>
            {plans.slice(0, 4).map(p => (
              <div key={p.plan_id} className="card" style={{ padding: "1.25rem", textAlign: "left" }}>
                <div style={{ fontWeight: 700, color: "var(--ink)", textTransform: "capitalize", marginBottom: "0.375rem" }}>{p.plan_name}</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--navy)", marginBottom: "0.25rem" }}>
                  {p.price_usd === 0 ? "Free" : `$${Number(p.price_usd).toFixed(0)}`}
                </div>
                <div style={{ fontSize: "0.8125rem", color: "var(--slate)" }}>
                  Up to {p.max_voters} voters
                </div>
              </div>
            ))}
          </div>
          <Link to="/pricing" style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            color: "var(--blue)", fontWeight: 600, fontSize: "0.9375rem",
            textDecoration: "none",
          }}>
            See all plans and features
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FINAL CTA
      ═══════════════════════════════════════════════════════ */}
      <section style={{
        padding: "clamp(3rem, 8vw, 5rem) 1.5rem",
        background: "linear-gradient(135deg, #0A0F1E 0%, #0D2B55 100%)",
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🗳️</div>
          <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)", fontWeight: 800, color: "#fff", margin: "0 0 0.875rem", letterSpacing: "-0.02em" }}>
            Ready to run your first election?
          </h2>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "1.0625rem", margin: "0 0 2rem", lineHeight: 1.6 }}>
            Free for up to 10 voters. No credit card required.
            Takes 5 minutes to set up.
          </p>
          <div style={{ display: "flex", gap: "0.875rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/org/signup" style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              background: "#fff", color: "#0D2B55",
              fontWeight: 800, fontSize: "1rem",
              padding: "0.875rem 2rem", borderRadius: 10,
              textDecoration: "none",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}>
              Create your organisation
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
            </Link>
            <Link to="/verify" style={{
              display: "inline-flex", alignItems: "center",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "rgba(255,255,255,0.75)", fontWeight: 600, fontSize: "0.9375rem",
              padding: "0.875rem 1.75rem", borderRadius: 10,
              textDecoration: "none",
            }}>
              Verify a vote
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════ */}
      <footer style={{
        background: "#0A0F1E",
        padding: "2rem 1.5rem",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <div style={{ width: 30, height: 30, background: "var(--navy)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🗳️</div>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.875rem" }}>VoteSecure</div>
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.6875rem" }}>AI Professional College</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            {[
              { to: "/pricing",    label: "Pricing"      },
              { to: "/org/signup", label: "Sign Up"       },
              { to: "/org/login",  label: "Admin Login"   },
              { to: "/login",      label: "Voter Login"   },
              { to: "/verify",     label: "Verify Vote"   },
            ].map(({ to, label }) => (
              <Link key={to} to={to} style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.8125rem", textDecoration: "none" }}
                onMouseEnter={e => e.target.style.color = "rgba(255,255,255,0.7)"}
                onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.35)"}>
                {label}
              </Link>
            ))}
          </div>
          <div style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.75rem" }}>
            2025 VoteSecure. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
