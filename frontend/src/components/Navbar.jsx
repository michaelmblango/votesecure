import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <nav className="bg-navy text-white shadow-lg">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🗳️</span>
          <div>
            <span className="font-bold text-lg leading-none">VoteSecure</span>
            <p className="text-blue-300 text-xs leading-none">AI Professional College</p>
          </div>
        </Link>

        {/* Nav Links */}
        {user && (
          <div className="flex items-center gap-6">
            {isAdmin ? (
              <>
                <Link to="/admin"
                  className="text-blue-200 hover:text-white text-sm transition-colors">
                  Dashboard
                </Link>
                <Link to="/results"
                  className="text-blue-200 hover:text-white text-sm transition-colors">
                  Results
                </Link>
              </>
            ) : (
              <>
                <Link to="/ballot"
                  className="text-blue-200 hover:text-white text-sm transition-colors">
                  Vote
                </Link>
                <Link to="/results"
                  className="text-blue-200 hover:text-white text-sm transition-colors">
                  Results
                </Link>
              </>
            )}

            {/* User info + logout */}
            <div className="flex items-center gap-3 border-l border-blue-700 pl-4">
              <div className="text-right">
                <p className="text-sm font-medium leading-none">{user.full_name}</p>
                <p className="text-xs text-blue-300 capitalize leading-none mt-0.5">
                  {user.role?.replace("_", " ")}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-blue-700 hover:bg-red-600 text-white text-xs
                           px-3 py-1.5 rounded transition-colors">
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}