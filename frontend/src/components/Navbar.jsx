import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const NavLink = ({ to, children }) => (
    <Link
      to={to}
      onClick={() => setOpen(false)}
      className="text-sm font-medium transition-colors"
      style={{
        color: isActive(to) ? "var(--blue)" : "var(--slate)",
        fontWeight: isActive(to) ? 600 : 500,
      }}>
      {children}
    </Link>
  );

  return (
    <nav style={{
      background: "#fff",
      borderBottom: "1px solid var(--border)",
      position: "sticky",
      top: 0,
      zIndex: 40,
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", height: 64, gap: "2rem" }}>

          {/* Logo mark */}
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none", flexShrink: 0 }}>
            <div style={{
              width: 36, height: 36,
              background: "var(--navy)",
              borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18,
            }}>
              🗳️
            </div>
            <div>
              <div style={{ fontSize: "0.9375rem", fontWeight: 800, color: "var(--navy)", letterSpacing: "-0.01em", lineHeight: 1 }}>
                VoteSecure
              </div>
              <div style={{ fontSize: "0.6875rem", color: "var(--slate)", lineHeight: 1, marginTop: 2 }}>
                AI Professional College
              </div>
            </div>
          </Link>

          {!user && (
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginLeft: "auto" }}>
              <Link to="/pricing" style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--slate)", textDecoration: "none" }}>Pricing</Link>
              <Link to="/org/login" style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--slate)", textDecoration: "none" }}>Admin</Link>
              <Link to="/login" className="btn btn-navy btn-sm">Voter Login</Link>
            </div>
          )}

          {/* Desktop links */}
          {user && (
            <div className="nav-desktop" style={{ alignItems: "center", gap: "1.75rem", flex: 1 }}>
              {isAdmin ? (
                <>
                  <NavLink to="/admin">Dashboard</NavLink>
                  <NavLink to="/results">Results</NavLink>
                  <NavLink to="/admin/audit">Audit Log</NavLink>
                </>
              ) : (
                <>
                  <NavLink to="/ballot">My Ballot</NavLink>
                  <NavLink to="/results">Results</NavLink>
                  <NavLink to="/verify">Verify Vote</NavLink>
                </>
              )}
            </div>
          )}

          {/* Right side */}
          {user && (
            <div className="nav-desktop" style={{ alignItems: "center", gap: "0.75rem", marginLeft: "auto" }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ink)", lineHeight: 1 }}>
                  {user.full_name}
                </div>
                <div style={{ fontSize: "0.6875rem", color: "var(--slate)", marginTop: 2, textTransform: "capitalize" }}>
                  {user.role?.replace(/_/g, " ")}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="btn btn-ghost btn-sm">
                Sign out
              </button>
            </div>
          )}

          {/* Mobile hamburger */}
          {user && (
            <button
              onClick={() => setOpen(o => !o)}
              className="nav-mobile-toggle btn btn-ghost btn-sm"
              style={{ marginLeft: "auto", padding: "0.5rem" }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {open
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
                }
              </svg>
            </button>
          )}
        </div>

        {/* Mobile menu */}
        {user && open && (
          <div className="nav-mobile-menu animate-in" style={{
            paddingBottom: "1rem",
            borderTop: "1px solid var(--border)",
            gap: "0.25rem",
          }}>
            <div style={{ height: "0.75rem" }} />
            {isAdmin ? (
              <>
                <NavLink to="/admin">Dashboard</NavLink>
                <NavLink to="/results">Results</NavLink>
                <NavLink to="/admin/audit">Audit Log</NavLink>
              </>
            ) : (
              <>
                <NavLink to="/ballot">My Ballot</NavLink>
                <NavLink to="/results">Results</NavLink>
                <NavLink to="/verify">Verify Vote</NavLink>
              </>
            )}
            <div className="divider" style={{ margin: "0.75rem 0" }} />
            <div style={{ fontSize: "0.8rem", color: "var(--slate)" }}>
              {user.full_name} · {user.role?.replace(/_/g, " ")}
            </div>
            <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start", marginTop: "0.25rem" }}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
