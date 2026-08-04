import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-8">
      <span className="text-6xl mb-4">🗳️</span>
      <h1 className="text-4xl font-bold text-navy mb-2">404</h1>
      <p className="text-gray-500 mb-6">Page not found.</p>
      <Link to="/" className="bg-brand text-white px-6 py-2 rounded-lg hover:bg-blue-700">
        Go Home
      </Link>
    </div>
  );
}