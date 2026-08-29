import { Link } from "react-router-dom";

export default function AboutPage() {
  const team = [
    {
      name:  "Michael M. Blango",
      role:  "Lead Developer",
      bio:   "Computer Science final year student at AI Professional College. Designed and built the VoteSecure platform from the ground up.",
      initial: "M",
    },
    {
      name:  "Sheku Francis Ngakui",
      role:  "Developer",
      bio:   "Computer Science final year student. Contributed to frontend development and user experience design.",
      initial: "S",
    },
    {
      name:  "Magid Grant",
      role:  "Developer",
      bio:   "Computer Science final year student. Contributed to backend development and system architecture.",
      initial: "M",
    },
  ];

  const values = [
    {
      icon:  "🔐",
      title: "Security first",
      desc:  "Every design decision in VoteSecure starts with security. Two-factor authentication, cryptographic vote hashing, and schema-level ballot anonymity are not optional features — they are the foundation.",
    },
    {
      icon:  "🔍",
      title: "Radical transparency",
      desc:  "Every vote is cryptographically receipted. Every system event is logged. Results are publicly verifiable. We build systems that can prove they work correctly.",
    },
    {
      icon:  "🌍",
      title: "Accessible to all",
      desc:  "Institutions in developing regions deserve the same quality of electoral infrastructure as anywhere else. VoteSecure is priced to be accessible and built to work on any device.",
    },
    {
      icon:  "📋",
      title: "Accountable governance",
      desc:  "Strong institutions depend on legitimate elections. We take seriously the responsibility of providing the infrastructure that democratic processes run on.",
    },
  ];

  const milestones = [
    {
      year:  "2024",
      event: "VoteSecure conceived as a final year project at AI Professional College, Department of Computer Science.",
    },
    {
      year:  "2025",
      event: "Core voting engine built with two-factor authentication, ballot secrecy, and cryptographic vote integrity.",
    },
    {
      year:  "2025",
      event: "SaaS platform launched. Multi-organisation support, licence-based pricing, and super admin panel deployed.",
    },
    {
      year:  "2026",
      event: "Live at votesecure.online. Serving institutions across West Africa.",
    },
  ];

  return (
    <div style={{ overflowX: "hidden" }}>

      {/* Hero */}
      <section style={{
        background: "linear-gradient(160deg, #0A0F1E 0%, #0D2B55 60%, #1565C0 100%)",
        padding: "clamp(4rem, 10vw, 6rem) 1.5rem",
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1.25rem" }}>🗳️</div>
          <h1 style={{
            color: "#fff",
            fontSize: "clamp(2rem, 5vw, 3rem)",
            fontWeight: 800,
            margin: "0 0 1.25rem",
            letterSpacing: "-0.02em",
          }}>
            Built to make elections trustworthy
          </h1>
          <p style={{
            color: "rgba(255,255,255,0.65)",
            fontSize: "clamp(1rem, 2.5vw, 1.125rem)",
            lineHeight: 1.7,
            margin: "0 0 2rem",
          }}>
            VoteSecure started as a final year project at AI Professional
            College in Sierra Leone. It became something more — a platform
            that gives any institution the tools to run elections that are
            secure, transparent, and worth trusting.
          </p>
          <Link to="/org/signup" className="btn btn-lg"
            style={{
              background: "#fff", color: "var(--navy)",
              fontWeight: 800, textDecoration: "none",
            }}>
            Start for free
          </Link>
        </div>
      </section>

      {/* Mission */}
      <section style={{
        background: "#fff",
        padding: "clamp(3rem, 8vw, 5rem) 1.5rem",
      }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ display: "grid",
                        gridTemplateColumns: "1fr",
                        gap: "3rem",
                        alignItems: "center" }}>
            <div>
              <p style={{
                fontSize: "0.875rem", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.08em",
                color: "var(--slate)", marginBottom: "1rem",
              }}>
                Our mission
              </p>
              <h2 style={{
                fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
                fontWeight: 800, color: "var(--ink)",
                margin: "0 0 1.25rem", letterSpacing: "-0.02em",
              }}>
                Every institution deserves elections it can stand behind
              </h2>
              <p style={{
                color: "var(--slate)", fontSize: "1.0625rem",
                lineHeight: 1.75, margin: "0 0 1rem",
              }}>
                Manual paper-based elections are slow, error-prone, and
                impossible to audit properly. When results are disputed,
                there is nothing to investigate. Trust breaks down.
              </p>
              <p style={{
                color: "var(--slate)", fontSize: "1.0625rem",
                lineHeight: 1.75, margin: 0,
              }}>
                VoteSecure gives institutions a better option. Not just
                faster counting — a system where every vote is
                cryptographically receipted, every action is logged,
                and results are verifiable by anyone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section style={{
        background: "var(--ice)",
        padding: "clamp(3rem, 8vw, 5rem) 1.5rem",
      }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 style={{
              fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
              fontWeight: 800, color: "var(--ink)",
              margin: "0 0 0.75rem", letterSpacing: "-0.02em",
            }}>
              What we stand for
            </h2>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1.25rem",
          }}>
            {values.map(({ icon, title, desc }) => (
              <div key={title} className="card"
                   style={{ padding: "1.75rem" }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: "var(--blue-lt)",
                  display: "flex", alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.5rem", marginBottom: "1rem",
                }}>
                  {icon}
                </div>
                <h3 style={{
                  fontWeight: 700, color: "var(--ink)",
                  marginBottom: "0.5rem", fontSize: "1rem",
                }}>
                  {title}
                </h3>
                <p style={{
                  color: "var(--slate)", fontSize: "0.9rem",
                  lineHeight: 1.7, margin: 0,
                }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section style={{
        background: "#fff",
        padding: "clamp(3rem, 8vw, 5rem) 1.5rem",
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 style={{
              fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
              fontWeight: 800, color: "var(--ink)",
              margin: "0 0 0.75rem", letterSpacing: "-0.02em",
            }}>
              How we got here
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column",
                        gap: 0 }}>
            {milestones.map(({ year, event }, idx, arr) => (
              <div key={idx} style={{ display: "flex", gap: "1.5rem" }}>
                <div style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "center", flexShrink: 0,
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: "var(--navy)", color: "#fff",
                    display: "flex", alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800, fontSize: "0.75rem",
                  }}>
                    {year}
                  </div>
                  {idx < arr.length - 1 && (
                    <div style={{
                      width: 2, flex: 1,
                      background: "var(--border)",
                      margin: "0.5rem 0",
                    }} />
                  )}
                </div>
                <div style={{
                  paddingTop: "0.625rem",
                  paddingBottom: idx < arr.length - 1 ? "2rem" : 0,
                }}>
                  <p style={{
                    color: "var(--slate)", fontSize: "0.9375rem",
                    lineHeight: 1.6, margin: 0,
                  }}>
                    {event}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section style={{
        background: "var(--ice)",
        padding: "clamp(3rem, 8vw, 5rem) 1.5rem",
      }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 style={{
              fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
              fontWeight: 800, color: "var(--ink)",
              margin: "0 0 0.75rem", letterSpacing: "-0.02em",
            }}>
              The team
            </h2>
            <p style={{
              color: "var(--slate)", fontSize: "1.0625rem",
              maxWidth: 480, margin: "0 auto",
            }}>
              VoteSecure was built by three Computer Science students
              at AI Professional College, Sierra Leone.
            </p>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1.25rem",
          }}>
            {team.map(({ name, role, bio, initial }) => (
              <div key={name} className="card"
                   style={{ padding: "1.75rem", textAlign: "center" }}>
                <div style={{
                  width: 64, height: 64, borderRadius: "50%",
                  background: "var(--navy)",
                  display: "flex", alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.5rem", fontWeight: 800,
                  color: "#fff", margin: "0 auto 1rem",
                }}>
                  {initial}
                </div>
                <div style={{
                  fontWeight: 700, color: "var(--ink)",
                  marginBottom: "0.25rem",
                }}>
                  {name}
                </div>
                <div style={{
                  fontSize: "0.8125rem", fontWeight: 600,
                  color: "var(--blue)", marginBottom: "0.75rem",
                }}>
                  {role}
                </div>
                <p style={{
                  color: "var(--slate)", fontSize: "0.875rem",
                  lineHeight: 1.6, margin: 0,
                }}>
                  {bio}
                </p>
              </div>
            ))}
          </div>
          <div style={{
            textAlign: "center", marginTop: "2rem",
            color: "var(--slate)", fontSize: "0.9rem",
          }}>
            Supervised by <strong style={{ color: "var(--ink)" }}>
              Mr. Kallon
            </strong>, Department of Computer Science,
            AI Professional College.
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: "clamp(3rem, 8vw, 5rem) 1.5rem",
        background: "linear-gradient(135deg, #0A0F1E 0%, #0D2B55 100%)",
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2 style={{
            color: "#fff",
            fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
            fontWeight: 800, margin: "0 0 0.875rem",
            letterSpacing: "-0.02em",
          }}>
            Run your first election today
          </h2>
          <p style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: "1.0625rem", margin: "0 0 2rem",
          }}>
            Free for up to 10 voters. No credit card required.
          </p>
          <div style={{ display: "flex", gap: "0.875rem",
                        justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/org/signup" className="btn btn-lg"
              style={{
                background: "#fff", color: "var(--navy)",
                fontWeight: 800, textDecoration: "none",
              }}>
              Create your organisation
            </Link>
            <Link to="/contact" className="btn btn-lg"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff", fontWeight: 600,
                textDecoration: "none",
              }}>
              Get in touch
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        background: "#0A0F1E",
        padding: "2rem 1.5rem",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{
          maxWidth: 1100, margin: "0 auto",
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap", gap: "1rem",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "0.625rem",
          }}>
            <div style={{
              width: 30, height: 30, background: "var(--navy)",
              borderRadius: 7, display: "flex",
              alignItems: "center", justifyContent: "center",
              fontSize: 15,
            }}>🗳️</div>
            <div>
              <div style={{ color: "#fff", fontWeight: 700,
                            fontSize: "0.875rem" }}>
                VoteSecure
              </div>
              <div style={{ color: "rgba(255,255,255,0.3)",
                            fontSize: "0.6875rem" }}>
                AI Professional College
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "1.5rem",
                        flexWrap: "wrap" }}>
            {[
              { to: "/",           label: "Home"         },
              { to: "/about",      label: "About"        },
              { to: "/pricing",    label: "Pricing"      },
              { to: "/contact",    label: "Contact"      },
              { to: "/org/signup", label: "Sign Up"      },
              { to: "/login",      label: "Voter Login"  },
            ].map(({ to, label }) => (
              <Link key={to} to={to} style={{
                color: "rgba(255,255,255,0.35)",
                fontSize: "0.8125rem", textDecoration: "none",
              }}>
                {label}
              </Link>
            ))}
          </div>
          <div style={{ color: "rgba(255,255,255,0.2)",
                        fontSize: "0.75rem" }}>
            2025 VoteSecure. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
