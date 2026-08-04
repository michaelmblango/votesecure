import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const navLink = (to, label) => (
    <Link
      to={to}
      onClick={() => setMenuOpen(false)}
      className={`text-sm font-medium transition-colors px-3 py-1.5 rounded-lg
                  ${isActive(to)
                    ? "bg-white/15 text-white"
                    : "text-blue-200 hover:text-white hover:bg-white/10"}`}>
      {label}
    </Link>
  );

  return (
    <nav className="bg-navy shadow-lg sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-9 h-9 bg-brand rounded-xl flex items-center
                            justify-center shadow-inner">
              <span className="text-xl">🗳️</span>
            </div>
            <div>
              <p className="text-white font-bold text-base leading-none">
                VoteSecure
              </p>
              <p className="text-blue-400 text-xs leading-none mt-0.5">
                AI Professional College
              </p>
            </div>
          </Link>

          {/* Desktop nav */}
          {user && (
            <div className="hidden sm:flex items-center gap-1">
              {isAdmin ? (
                <>
                  {navLink("/admin",   "Dashboard")}
                  {navLink("/results", "Results")}
                  {navLink("/admin/audit", "Audit Log")}
                </>
              ) : (
                <>
                  {navLink("/ballot",  "My Ballot")}
                  {navLink("/results", "Results")}
                  {navLink("/verify",  "Verify Vote")}
                </>
              )}
            </div>
          )}

          {/* Right side */}
          {user && (
            <div className="hidden sm:flex items-center gap-3">
              <div className="text-right">
                <p className="text-white text-sm font-medium leading-none">
                  {user.full_name}
                </p>
                <p className="text-blue-400 text-xs leading-none mt-0.5 capitalize">
                  {user.role?.replace(/_/g, " ")}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-white/10 hover:bg-red-500 text-white text-xs
                           font-medium px-3 py-2 rounded-lg transition-colors
                           border border-white/10">
                Logout
              </button>
            </div>
          )}

          {/* Mobile hamburger */}
          {user && (
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="sm:hidden text-white p-2 rounded-lg hover:bg-white/10">
              <svg className="w-5 h-5" fill="none" stroke="currentColor"
                   viewBox="0 0 24 24">
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round"
                           strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  : <path strokeLinecap="round" strokeLinejoin="round"
                           strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>}
              </svg>
            </button>
          )}
        </div>

        {/* Mobile menu */}
        {user && menuOpen && (
          <div className="sm:hidden pb-4 pt-2 border-t border-white/10 space-y-1">
            {isAdmin ? (
              <>
                {navLink("/admin",       "📊 Dashboard")}
                {navLink("/results",     "📈 Results")}
                {navLink("/admin/audit", "🔍 Audit Log")}
              </>
            ) : (
              <>
                {navLink("/ballot",  "🗳️ My Ballot")}
                {navLink("/results", "📊 Results")}
                {navLink("/verify",  "🔐 Verify Vote")}
              </>
            )}
            <div className="pt-3 border-t border-white/10 mt-2">
              <p className="text-blue-300 text-xs px-3 mb-2">
                {user.full_name} · {user.role?.replace(/_/g, " ")}
              </p>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-red-400
                           hover:text-red-300 text-sm transition-colors">
                Logout →
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}