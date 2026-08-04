import { useAuth } from "../context/AuthContext";
export default function AdminDashboard() {
  const { user } = useAuth();
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-navy">
        Welcome, {user?.full_name} 👋
      </h1>
      <p className="text-gray-500 mt-1">Admin Dashboard — coming next</p>
    </div>
  );
}