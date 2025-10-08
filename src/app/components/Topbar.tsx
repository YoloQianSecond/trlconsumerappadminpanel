"use client";

import Image from "next/image";
import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Simple Topbar:
 * - Left: menu button (mobile) + logo
 * - Right: profile dropdown with Logout
 */
export default function Topbar({ onMenu }: { onMenu: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
  }

  // Close dropdown on route change
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header
      className="card"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 14px",
        borderRadius: 0,
        zIndex: 40,
      }}
    >
      {/* Left: menu (mobile) + logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          className="btn"
          onClick={onMenu}
          aria-label="Open menu"
          style={{ display: "inline-flex" }}
        >
          {/* Hamburger icon */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Image
            src="/TopBar/trllogo.svg"
            alt="TRLCO"
            width={28}
            height={28}
            style={{ borderRadius: 6 }}
            priority
          />
          <div
            style={{
              background: "var(--brand-gradient)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              fontWeight: 800,
              letterSpacing: 0.4,
            }}
          >
            Admin
          </div>
        </div>
      </div>

      {/* Right: profile dropdown */}
      <div style={{ position: "relative" }}>
        <button
          className="btn"
          onClick={() => setOpen((s) => !s)}
          aria-haspopup="menu"
          aria-expanded={open}
          title="Account"
        >
          {/* Faux avatar with initials */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "var(--brand-gradient)",
              display: "grid",
              placeItems: "center",
              color: "white",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            AD
          </div>
        </button>

        {open && (
          <div
            role="menu"
            className="card"
            style={{
              position: "absolute",
              right: 0,
              top: 44,
              width: 220,
              padding: 10,
            }}
          >
            <div style={{ padding: "6px 8px", fontSize: 14, opacity: 0.8 }}>
              Signed in as <strong>Admin</strong>
            </div>

            <button
              className="btn"
              onClick={logout}
              style={{ width: "100%", justifyContent: "flex-start", gap: 8 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M15 12H3m6-6L3 12l6 6" stroke="currentColor" strokeWidth="2" />
                <path d="M21 3v18" stroke="currentColor" strokeWidth="2" opacity=".4" />
              </svg>
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
