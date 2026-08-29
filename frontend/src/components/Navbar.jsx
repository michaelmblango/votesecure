import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWindowSize } from "../hooks/useWindowSize";

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open, setOpen] = useState(false);
  const width     = useWindowSize();
  const isMobile  = width < 640;

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate("/login");
  };

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const linkStyle = (path) => ({
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 6,
    textDecoration: "none",
    fontSize: "0.875rem",
    fontWeight: isActive(path) ? 600 : 500,
    color: isActive(path) ? "var(--blue)" : "var(--slate)",
    background: isActive(path) ? "var(--blue-lt)" : "transparent",
    whiteSpace: "nowrap",
    transition: "color 0.15s, background 0.15s",
  });

  const mobileLinkStyle = (path) => ({
    display: "block",
    padding: "0.875rem 1.25rem",
    textDecoration: "none",
    fontSize: "0.9375rem",
    fontWeight: isActive(path) ? 600 : 400,
    color: isActive(path) ? "var(--blue)" : "var(--ink)",
    background: isActive(path) ? "var(--blue-lt)" : "transparent",
    borderBottom: "1px solid var(--border)",
  });

  const adminLinks = [
    { to: "/admin",            label: "Dashboard"  },
    { to: "/admin/voters",     label: "Voters"     },
    { to: "/results",          label: "Results"    },
    { to: "/admin/audit",      label: "Audit Log"  },
    { to: "/admin/approvals",  label: "Approvals"  },
  ];

  const voterLinks = [
    { to: "/ballot",  label: "My Ballot"   },
    { to: "/results", label: "Results"     },
    { to: "/verify",  label: "Verify Vote" },
  ];

  const publicLinks = [
    { to: "/pricing",   label: "Pricing"      },
    { to: "/about",     label: "About"        },
    { to: "/contact",   label: "Contact"      },
    { to: "/org/login", label: "Admin Sign In" },
  ];

  const navLinks = user
    ? (isAdmin ? adminLinks : voterLinks)
    : publicLinks;

  return (
    <>
      {/* ── NAVBAR BAR ── */}
      <nav style={{
        background: "#ffffff",
        borderBottom: "1px solid var(--border)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 1px 3px rgba(10,15,30,0.06)",
      }}>
        <div style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 1.25rem",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}>

          {/* Logo — always visible */}
          <Link
            to="/"
            onClick={() => setOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              textDecoration: "none",
              flexShrink: 0,
            }}>
            <div style={{
              width: 34, height: 34,
              background: "var(--navy)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 17,
              flexShrink: 0,
            }}>
              🗳️
            </div>
            <div style={{ lineHeight: 1.1 }}>
              <div style={{
                fontSize: "0.9rem",
                fontWeight: 800,
                color: "var(--navy)",
                letterSpacing: "-0.01em",
              }}>
                VoteSecure
              </div>
              <div style={{
                fontSize: "0.6rem",
                color: "var(--slate)",
                whiteSpace: "nowrap",
              }}>
                AI Professional College
              </div>
            </div>
          </Link>

          {/* ── DESKTOP NAV (width >= 640px) ── */}
          {!isMobile && (
            <>
              {/* Center links */}
              <div className="nav-links-list" style={{
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                flex: 1,
                paddingLeft: "1rem",
              }}>
                {navLinks.map(({ to, label }) => (
                  <Link key={to} to={to} className="nav-link-item" style={linkStyle(to)}>
                    {label}
                  </Link>
                ))}
              </div>

              {/* Right side */}
              {user ? (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  flexShrink: 0,
                }}>
                  <div style={{ textAlign: "right", lineHeight: 1.2 }}>
                    <div style={{
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      color: "var(--ink)",
                    }}>
                      {user.full_name}
                    </div>
                    <div style={{
                      fontSize: "0.6875rem",
                      color: "var(--slate)",
                      textTransform: "capitalize",
                    }}>
                      {user.role?.replace(/_/g, " ")}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="btn btn-ghost btn-sm">
                    Sign out
                  </button>
                </div>
              ) : (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  flexShrink: 0,
                }}>
                  <Link to="/login" className="btn btn-navy btn-sm"
                    style={{ textDecoration: "none" }}>
                    Voter Login
                  </Link>
                </div>
              )}
            </>
          )}

          {/* ── MOBILE HAMBURGER (width < 640px) ── */}
          {isMobile && (
            <button
              onClick={() => setOpen(o => !o)}
              aria-label={open ? "Close menu" : "Open menu"}
              style={{
                background: "transparent",
                border: "1.5px solid var(--border)",
                borderRadius: 8,
                width: 40,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--ink)",
                flexShrink: 0,
              }}>
              {open ? (
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              ) : (
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              )}
            </button>
          )}
        </div>

        {/* ── MOBILE DROPDOWN MENU ── */}
        {isMobile && open && (
          <div style={{
            background: "#ffffff",
            borderTop: "1px solid var(--border)",
            boxShadow: "0 8px 24px rgba(10,15,30,0.12)",
          }}>
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                style={mobileLinkStyle(to)}
                onClick={() => setOpen(false)}>
                {label}
              </Link>
            ))}

            {/* Public — extra links */}
            {!user && (
              <>
                <Link to="/org/signup" style={mobileLinkStyle("/org/signup")}
                  onClick={() => setOpen(false)}>
                  Create Organisation
                </Link>
                <div style={{ padding: "1rem 1.25rem" }}>
                  <Link
                    to="/login"
                    className="btn btn-navy"
                    onClick={() => setOpen(false)}
                    style={{
                      display: "block",
                      textAlign: "center",
                      textDecoration: "none",
                      width: "100%",
                    }}>
                    Voter Login
                  </Link>
                </div>
              </>
            )}

            {/* Logged in — user info + sign out */}
            {user && (
              <div style={{
                padding: "1rem 1.25rem",
                borderTop: "1px solid var(--border)",
              }}>
                <div style={{
                  fontSize: "0.8125rem",
                  color: "var(--slate)",
                  marginBottom: "0.75rem",
                }}>
                  {user.full_name}
                  <span style={{ opacity: 0.6, marginLeft: "0.375rem", textTransform: "capitalize" }}>
                    · {user.role?.replace(/_/g, " ")}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="btn btn-ghost"
                  style={{ width: "100%" }}>
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Backdrop — closes menu when tapping outside */}
      {isMobile && open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99,
            background: "transparent",
          }}
        />
      )}
    </>
  );
}
