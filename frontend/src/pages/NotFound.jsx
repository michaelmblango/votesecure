import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function NotFound() {
  const { user, isAdmin } = useAuth();
  const home = user ? (isAdmin ? "/admin" : "/ballot") : "/login";

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center
                    text-center px-4">
      <div className="w-24 h-24 bg-blue-50 rounded-3xl flex items-center
                      justify-center mx-auto mb-6">
        <span className="text-5xl">🗳️</span>
      </div>
      <h1 className="text-6xl font-bold text-navy mb-3">404</h1>
      <p className="text-gray-500 text-lg mb-1">Page not found</p>
      <p className="text-gray-400 text-sm mb-8">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link to={home}
        className="bg-brand text-white px-8 py-3 rounded-xl font-semibold
                   hover:bg-blue-700 transition-colors shadow-lg">
        ← Go Home
      </Link>
    </div>
  );
}