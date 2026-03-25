"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "register";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [adminSecret, setAdminSecret] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    setError("");

    const endpoint =
      mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body: Record<string, string> = { username, password };
    if (mode === "register" && adminSecret) {
      body.adminSecret = adminSecret;
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError(data.detail || data.error || "Something went wrong.");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-box">
        <div className="login-title"></div>
        <p className="login-subtitle">
          {mode === "login"
            ? "Sign in to continue."
            : "Create an account to get started."}
        </p>

        <div className="login-tabs">
          <button
            className={`login-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            Sign In
          </button>
          <button
            className={`login-tab ${mode === "register" ? "active" : ""}`}
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            Register
          </button>
        </div>

        <div className="login-fields">
          <input
            type="text"
            className="login-input"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            autoFocus
            autoComplete="username"
          />
          <input
            type="password"
            className="login-input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />

          {mode === "register" && (
            <>
              {showAdmin ? (
                <input
                  type="password"
                  className="login-input"
                  placeholder="Admin secret (optional)"
                  value={adminSecret}
                  onChange={(e) => setAdminSecret(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                />
              ) : (
                <button
                  className="login-admin-toggle"
                  onClick={() => setShowAdmin(true)}
                >
                  I have an admin code
                </button>
              )}
            </>
          )}
        </div>

        <button
          className="login-btn login-btn-full"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading
            ? "..."
            : mode === "login"
            ? "Sign In"
            : "Create Account"}
        </button>

        {error && <div className="login-error">{error}</div>}
      </div>
    </main>
  );
}
