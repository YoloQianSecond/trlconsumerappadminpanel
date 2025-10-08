"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/dashboard";

  const [email, setEmail] = React.useState("qian@trlco.world");
  const [password, setPassword] = React.useState("admin123");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Login failed");
      }
      router.replace(next);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="center-page">
      <div style={{ width: 380, maxWidth: "100%" }} className="card">
        <div
          style={{
            background: "var(--brand-gradient)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            fontWeight: 800,
            fontSize: 26,
            letterSpacing: 0.5,
            marginBottom: 12,
          }}
        >
          TRLCO Admin
        </div>
        <p className="helper" style={{ marginTop: -4, marginBottom: 18 }}>
          Sign in to manage Explore, Properties, Users, etc.
        </p>

        <form onSubmit={onSubmit}>
          <label className="helper" htmlFor="email">Email</label>
          <input
            id="email" className="input" type="email" autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)} required
            style={{ marginBottom: 12 }}
          />

          <label className="helper" htmlFor="password">Password</label>
          <input
            id="password" className="input" type="password" autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)} required
            style={{ marginBottom: 16 }}
          />

          {error && (
            <div
              style={{
                background: "#2a1215",
                border: "1px solid #5b1a22",
                color: "#ffb3b8",
                borderRadius: 12,
                padding: "10px 12px",
                marginBottom: 12,
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <button className="btn btn-primary" disabled={loading} type="submit" style={{ width: "100%" }}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div style={{ marginTop: 14 }} className="helper">
          Try: <code>qian@trlco.world / admin123</code> or <code>ops@trlco.local / ops123</code>
        </div>
      </div>
    </div>
  );
}
