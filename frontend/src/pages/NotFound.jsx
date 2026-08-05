import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function NotFound() {
  const { user, isAdmin } = useAuth();
  const home = user ? (isAdmin ? "/admin" : "/ballot") : "/login";

  return (
    <div style={{ minHeight:"70vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"2rem", textAlign:"center" }}>
      <div style={{ width:80, height:80, background:"var(--blue-lt)", borderRadius:20, display:"flex", alignItems:"center", justifyContent:"center", fontSize:36, marginBottom:"1.5rem" }}>🗳️</div>
      <div style={{ fontSize:"5rem", fontWeight:800, color:"var(--ink)", lineHeight:1, marginBottom:"0.5rem" }}>404</div>
      <div style={{ fontSize:"1.125rem", color:"var(--slate)", marginBottom:"0.375rem" }}>Page not found</div>
      <div style={{ fontSize:"0.875rem", color:"var(--slate)", marginBottom:"2rem" }}>The page you are looking for does not exist.</div>
      <Link to={home} className="btn btn-navy">← Go Home</Link>
    </div>
  );
}
