import { useState } from "react";

export default function PasswordInput({
  value,
  onChange,
  placeholder = "Enter password",
  label = "Password",
  name = "password",
  required = false,
  showStrength = false,
}) {
  const [visible, setVisible] = useState(false);

  const getStrength = (pwd) => {
    if (!pwd || pwd.length < 4) return { level: 0, label: "", color: "" };
    let score = 0;
    if (pwd.length >= 8)                    score++;
    if (pwd.length >= 12)                   score++;
    if (/[A-Z]/.test(pwd))                  score++;
    if (/[0-9]/.test(pwd))                  score++;
    if (/[^A-Za-z0-9]/.test(pwd))          score++;
    if (score <= 1) return { level: 1, label: "Weak",   color: "#DC2626" };
    if (score <= 2) return { level: 2, label: "Fair",   color: "#D97706" };
    if (score <= 3) return { level: 3, label: "Good",   color: "#2563EB" };
    return              { level: 4, label: "Strong", color: "#059669" };
  };

  const strength = showStrength ? getStrength(value) : null;

  return (
    <div>
      <label className="input-label">{label}{required && " *"}</label>
      <div style={{ position: "relative" }}>
        <input
          className="input"
          type={visible ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          style={{ paddingRight: "2.75rem" }}
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          style={{
            position: "absolute",
            right: 0,
            top: "50%",
            transform: "translateY(-50%)",
            width: "2.75rem",
            height: "2.75rem",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--slate)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label={visible ? "Hide password" : "Show password"}>
          {visible ? (
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21"/>
            </svg>
          ) : (
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
          )}
        </button>
      </div>
      {showStrength && value && strength && (
        <div style={{ marginTop: "0.375rem" }}>
          <div style={{ display: "flex", gap: "0.25rem", marginBottom: "0.25rem" }}>
            {[1, 2, 3, 4].map(level => (
              <div key={level} style={{
                flex: 1, height: 3, borderRadius: 999,
                background: level <= strength.level ? strength.color : "var(--border)",
                transition: "background 0.2s",
              }} />
            ))}
          </div>
          <span style={{ fontSize: "0.75rem", color: strength.color, fontWeight: 600 }}>
            {strength.label}
          </span>
        </div>
      )}
    </div>
  );
}
