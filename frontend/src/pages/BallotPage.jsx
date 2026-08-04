import { useAuth } from "../context/AuthContext";
export default function BallotPage() {
  const { user } = useAuth();
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-navy">
        Hello, {user?.full_name} 🗳️
      </h1>
      <p className="text-gray-500 mt-1">Ballot — coming next</p>
    </div>
  );
}