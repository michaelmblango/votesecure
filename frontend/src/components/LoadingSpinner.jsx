export default function LoadingSpinner({ message = "Loading..." }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      minHeight: "60vh", gap: "1rem",
    }}>
      <div className="spinner" />
      <p style={{ color: "var(--slate)", fontSize: "0.875rem" }}>{message}</p>
    </div>
  );
}
