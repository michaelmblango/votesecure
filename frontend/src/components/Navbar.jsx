import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate("/login");
  };

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const linkStyle = (path) => ({
    display: "block",
    padding: "0.5rem 0.75rem",
    borderRadius: 8,
    textDecoration: "none",
    fontSize: "0.875rem",
    fontWeight: isActive(path) ? 600 : 500,
    color: isActive(path) ? "var(--blue)" : "var(--slate)",
    background: isActive(path) ? "var(--blue-lt)" : "transparent",
    transition: "all 0.15s",
    whiteSpace: "nowrap",
  });

  const mobileLinkStyle = (path) => ({
    display: "block",
    padding: "0.875rem 1rem",
    textDecoration: "none",
    fontSize: "0.9375rem",
    fontWeight: isActive(path) ? 600 : 400,
    color: isActive(path) ? "var(--blue)" : "var(--ink)",
    borderBottom: "1px solid var(--border)",
    background: isActive(path) ? "var(--blue-lt)" : "transparent",
  });

  const adminLinks = [
    { to: "/admin",           label: "Dashboard"  },
    { to: "/results",         label: "Results"    },
    { to: "/admin/audit",     label: "Audit Log"  },
    { to: "/admin/approvals", label: "Approvals"  },
  ];

  const voterLinks = [
    { to: "/ballot",  label: "My Ballot"   },
    { to: "/results", label: "Results"     },
    { to: "/verify",  label: "Verify Vote" },
  ];

  const publicLinks = [
    { to: "/pricing",    label: "Pricing"      },
    { to: "/org/login",  label: "Admin Sign In" },
    { to: "/login",      label: "Voter Sign In" },
  ];

  const navLinks = user
    ? (isAdmin ? adminLinks : voterLinks)
    : publicLinks;

  return (
    <>
      <nav style={{
        background: "#fff",
        borderBottom: "1px solid var(--border)",
        position: "sticky",
        top: 0,
        zIndex: 40,
        boxShadow: "0 1px 3px rgba(10,15,30,0.06)",
      }}>
        <div style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 1.25rem",
          display: "flex",
          alignItems: "center",
          height: 60,
          gap: "1.5rem",
        }}>

          {/* Logo */}
          <Link
            to="/"
            onClick={() => setOpen(false)}
            style={{ display: "flex", alignItems: "center", gap: "0.625rem", textDecoration: "none", flexShrink: 0 }}>
            <div style={{
              width: 34, height: 34, background: "var(--navy)", borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 17, flexShrink: 0,
            }}>🗳️</div>
            <div style={{ lineHeight: 1 }}>
              <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--navy)", letterSpacing: "-0.01em" }}>
                VoteSecure
              </div>
              <div style={{ fontSize: "0.625rem", color: "var(--slate)", marginTop: 1, whiteSpace: "nowrap" }}>
                AI Professional College
              </div>
            </div>
          </Link>

          {/* Desktop nav links — hidden below 640px via CSS class */}
          <div className="nav-desktop" style={{ display: "flex", alignItems: "center", gap: "0.25rem", flex: 1 }}>
            {navLinks.map(({ to, label }) => (
              <Link key={to} to={to} style={linkStyle(to)}>{label}</Link>
            ))}
          </div>

          {/* Desktop right side — user info or CTA */}
          {user ? (
            <div className="nav-desktop" style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
              <div style={{ textAlign: "right", lineHeight: 1 }}>
                <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--ink)" }}>{user.full_name}</div>
                <div style={{ fontSize: "0.625rem", color: "var(--slate)", marginTop: 2, textTransform: "capitalize" }}>
                  {user.role?.replace(/_/g, " ")}
                </div>
              </div>
              <button onClick={handleLogout} className="btn btn-ghost btn-sm">Sign out</button>
            </div>
          ) : (
            <div className="nav-desktop" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "auto", flexShrink: 0 }}>
              <Link to="/org/login" style={linkStyle("/org/login")}>Admin</Link>
              <Link to="/login" className="btn btn-navy btn-sm">Voter Login</Link>
            </div>
          )}

          {/* Mobile hamburger — shown below 640px via CSS class */}
          <button
            className="nav-mobile-toggle"
            onClick={() => setOpen(o => !o)}
            aria-label="Toggle menu"
            style={{
              marginLeft: "auto",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 8,
              width: 40, height: 40,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0,
              color: "var(--ink)",
            }}>
            {open
              ? <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              : <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
            }
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {open && (
          <div className="nav-mobile-menu animate-in" style={{
            borderTop: "1px solid var(--border)",
            background: "#fff",
          }}>
            {navLinks.map(({ to, label }) => (
              <Link key={to} to={to} style={mobileLinkStyle(to)} onClick={() => setOpen(false)}>
                {label}
              </Link>
            ))}
            {user ? (
              <div style={{ padding: "1rem", borderTop: "1px solid var(--border)" }}>
                <div style={{ fontSize: "0.8125rem", color: "var(--slate)", marginBottom: "0.75rem" }}>
                  {user.full_name} · {user.role?.replace(/_/g, " ")}
                </div>
                <button onClick={handleLogout} className="btn btn-ghost" style={{ width: "100%" }}>
                  Sign out
                </button>
              </div>
            ) : (
              <div style={{ padding: "1rem", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <Link to="/login" className="btn btn-navy" onClick={() => setOpen(false)} style={{ textAlign: "center", textDecoration: "none" }}>
                  Voter Login
                </Link>
                <Link to="/org/signup" className="btn btn-ghost" onClick={() => setOpen(false)} style={{ textAlign: "center", textDecoration: "none" }}>
                  Create Organisation
                </Link>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Mobile menu backdrop — closes menu when tapping outside */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 39, background: "transparent" }}
        />
      )}
    </>
  );
}
