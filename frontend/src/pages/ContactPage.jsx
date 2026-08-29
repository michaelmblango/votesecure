import { useState } from "react";
import { Link } from "react-router-dom";

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "", email: "", organisation: "",
    subject: "", message: "",
  });
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const mailto = `mailto:votesecure.online@gmail.com`
        + `?subject=${encodeURIComponent(
            `[VoteSecure Contact] ${form.subject} — ${form.organisation || form.name}`
          )}`
        + `&body=${encodeURIComponent(
            `Name: ${form.name}\n`
          + `Email: ${form.email}\n`
          + `Organisation: ${form.organisation || "Not provided"}\n`
          + `\nMessage:\n${form.message}`
          )}`;
      window.location.href = mailto;
      setSent(true);
    } catch {
      setError("Something went wrong. Please email us directly.");
    } finally { setLoading(false); }
  };

  const contacts = [
    {
      icon:  "📧",
      label: "Email",
      value: "votesecure.online@gmail.com",
      href:  "mailto:votesecure.online@gmail.com",
    },
    {
      icon:  "🌐",
      label: "Website",
      value: "votesecure.online",
      href:  "https://votesecure.online",
    },
    {
      icon:  "🏛️",
      label: "Institution",
      value: "AI Professional College, Sierra Leone",
      href:  null,
    },
  ];

  const faqs = [
    {
      q: "How quickly will I receive my licence code after payment?",
      a: "We verify payments within one business day and email your licence code immediately after verification.",
    },
    {
      q: "Can I upgrade my plan mid-election?",
      a: "Yes. Purchase a higher-tier licence and apply it when creating your next election. Existing elections are not affected.",
    },
    {
      q: "What payment methods do you accept?",
      a: "We accept mobile money, bank transfer, and any payment method you can provide a reference for. Contact us to discuss options.",
    },
    {
      q: "Can VoteSecure be used for national elections?",
      a: "VoteSecure is designed for institutional elections — universities, student unions, corporations, and community organisations. For national elections, additional legal and security requirements apply.",
    },
    {
      q: "Is my voter data stored securely?",
      a: "Yes. All data is stored on encrypted servers. Voter identity is permanently separated from ballot content at the database level — no administrator can link a voter to their choice.",
    },
  ];

  return (
    <div style={{ overflowX: "hidden" }}>

      {/* Hero */}
      <section style={{
        background: "var(--navy)",
        padding: "clamp(3rem, 8vw, 5rem) 1.5rem",
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h1 style={{
            color: "#fff",
            fontSize: "clamp(1.75rem, 5vw, 2.75rem)",
            fontWeight: 800, margin: "0 0 1rem",
            letterSpacing: "-0.02em",
          }}>
            Get in touch
          </h1>
          <p style={{
            color: "rgba(255,255,255,0.65)",
            fontSize: "1.0625rem", lineHeight: 1.7, margin: 0,
          }}>
            Questions about pricing, custom plans, or how VoteSecure
            works? We respond to every message.
          </p>
        </div>
      </section>

      {/* Contact form + info */}
      <section style={{
        padding: "clamp(3rem, 8vw, 5rem) 1.5rem",
        background: "var(--ice)",
      }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "2.5rem",
          }}>

            {/* Form */}
            <div>
              {sent ? (
                <div className="card animate-in"
                     style={{ padding: "3rem", textAlign: "center" }}>
                  <div style={{ fontSize: "3rem",
                                marginBottom: "1rem" }}>📧</div>
                  <h2 style={{ fontWeight: 800, color: "var(--ink)",
                               marginBottom: "0.5rem" }}>
                    Message prepared
                  </h2>
                  <p style={{
                    color: "var(--slate)", lineHeight: 1.6,
                    marginBottom: "1.5rem",
                  }}>
                    Your email client should have opened with the
                    message pre-filled. If it did not, email us
                    directly at{" "}
                    <a href="mailto:votesecure.online@gmail.com"
                       style={{ color: "var(--blue)" }}>
                      votesecure.online@gmail.com
                    </a>
                  </p>
                  <button
                    className="btn btn-ghost"
                    onClick={() => setSent(false)}>
                    Send another message
                  </button>
                </div>
              ) : (
                <div className="card" style={{ padding: "2rem" }}>
                  <h2 style={{
                    fontSize: "1.25rem", fontWeight: 700,
                    color: "var(--ink)", marginBottom: "1.5rem",
                  }}>
                    Send us a message
                  </h2>
                  <form onSubmit={handleSubmit}
                        style={{ display: "flex",
                                 flexDirection: "column",
                                 gap: "1rem" }}>
                    <div style={{ display: "grid",
                                  gridTemplateColumns: "1fr 1fr",
                                  gap: "0.75rem" }}>
                      <div>
                        <label className="input-label">
                          Full Name *
                        </label>
                        <input className="input"
                          value={form.name}
                          onChange={e => set("name", e.target.value)}
                          placeholder="Your name" required />
                      </div>
                      <div>
                        <label className="input-label">
                          Email Address *
                        </label>
                        <input className="input" type="email"
                          value={form.email}
                          onChange={e => set("email", e.target.value)}
                          placeholder="your@email.com" required />
                      </div>
                    </div>
                    <div>
                      <label className="input-label">
                        Organisation
                      </label>
                      <input className="input"
                        value={form.organisation}
                        onChange={e => set("organisation", e.target.value)}
                        placeholder="Your institution or company" />
                    </div>
                    <div>
                      <label className="input-label">
                        Subject *
                      </label>
                      <select className="input"
                        value={form.subject}
                        onChange={e => set("subject", e.target.value)}
                        required>
                        <option value="">Select a topic</option>
                        <option value="Pricing and Plans">
                          Pricing and Plans
                        </option>
                        <option value="Payment Verification">
                          Payment Verification
                        </option>
                        <option value="Technical Support">
                          Technical Support
                        </option>
                        <option value="Custom Plan Request">
                          Custom Plan Request (1000+ voters)
                        </option>
                        <option value="Partnership">
                          Partnership or Integration
                        </option>
                        <option value="General Enquiry">
                          General Enquiry
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="input-label">
                        Message *
                      </label>
                      <textarea className="input" rows={5}
                        value={form.message}
                        onChange={e => set("message", e.target.value)}
                        placeholder="Tell us what you need..."
                        style={{ resize: "vertical" }}
                        required />
                    </div>
                    {error && (
                      <div className="alert alert-error"
                           style={{ borderRadius: 8 }}>
                        <span>⚠</span> {error}
                      </div>
                    )}
                    <button type="submit"
                            className="btn btn-navy btn-lg"
                            disabled={loading}>
                      {loading ? "Opening email..." : "Send Message"}
                    </button>
                    <p style={{
                      fontSize: "0.75rem", color: "var(--slate)",
                      textAlign: "center", margin: 0,
                    }}>
                      This opens your email client with the message
                      pre-filled. Alternatively email us directly.
                    </p>
                  </form>
                </div>
              )}
            </div>

            {/* Contact info */}
            <div style={{
              display: "flex", flexDirection: "column", gap: "1.25rem",
            }}>
              {contacts.map(({ icon, label, value, href }) => (
                <div key={label} className="card"
                     style={{ padding: "1.25rem 1.5rem",
                              display: "flex",
                              alignItems: "center", gap: "1rem" }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: "var(--blue-lt)",
                    display: "flex", alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.25rem", flexShrink: 0,
                  }}>
                    {icon}
                  </div>
                  <div>
                    <div style={{
                      fontSize: "0.75rem", fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--slate)", marginBottom: "0.125rem",
                    }}>
                      {label}
                    </div>
                    {href ? (
                      <a href={href} style={{
                        color: "var(--blue)", fontWeight: 600,
                        textDecoration: "none", fontSize: "0.9375rem",
                      }}>
                        {value}
                      </a>
                    ) : (
                      <div style={{ fontWeight: 600,
                                    color: "var(--ink)",
                                    fontSize: "0.9375rem" }}>
                        {value}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Response time notice */}
              <div className="card card-accent-green"
                   style={{ padding: "1.25rem 1.5rem" }}>
                <div style={{ fontWeight: 700, color: "var(--ink)",
                              marginBottom: "0.375rem" }}>
                  Response time
                </div>
                <p style={{ color: "var(--slate)", fontSize: "0.9rem",
                            lineHeight: 1.6, margin: 0 }}>
                  We respond to all enquiries within one business day.
                  Payment verification requests are prioritised.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{
        padding: "clamp(3rem, 8vw, 5rem) 1.5rem",
        background: "#fff",
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 style={{
              fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
              fontWeight: 800, color: "var(--ink)",
              margin: "0 0 0.75rem", letterSpacing: "-0.02em",
            }}>
              Frequently asked questions
            </h2>
          </div>
          <div style={{
            display: "flex", flexDirection: "column",
            gap: 1, background: "var(--border)",
            borderRadius: 12, overflow: "hidden",
          }}>
            {faqs.map(({ q, a }) => (
              <details key={q} style={{ background: "#fff" }}>
                <summary style={{
                  padding: "1.125rem 1.25rem",
                  cursor: "pointer", fontWeight: 600,
                  color: "var(--ink)", fontSize: "0.9375rem",
                  listStyle: "none",
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  {q}
                  <span style={{ color: "var(--slate)",
                                 fontSize: "1.25rem",
                                 lineHeight: 1, flexShrink: 0,
                                 marginLeft: "1rem" }}>
                    +
                  </span>
                </summary>
                <div style={{
                  padding: "0 1.25rem 1.25rem",
                  color: "var(--slate)", fontSize: "0.9rem",
                  lineHeight: 1.7,
                  borderTop: "1px solid var(--border)",
                }}>
                  {a}
                </div>
              </details>
            ))}
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
              { to: "/",           label: "Home"        },
              { to: "/about",      label: "About"       },
              { to: "/pricing",    label: "Pricing"     },
              { to: "/contact",    label: "Contact"     },
              { to: "/org/signup", label: "Sign Up"     },
              { to: "/login",      label: "Voter Login" },
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
