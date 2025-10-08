"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

type Props = { open: boolean; onClose: () => void };

export default function Sidebar({ open, onClose }: Props) {
  const pathname = usePathname();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const nav = [
    { href: "/dashboard", label: "Dashboard", icon: IconHome },
    { href: "/users", label: "Users", icon: IconUsers },
    { href: "/explore", label: "Explore", icon: IconCompass },
    { href: "/property", label: "Properties", icon: IconBuilding },
    { href: "/category", label: "Categories", icon: IconBag },
    { href: "/partner", label: "Partners", icon: IconHandshake },
    { href: "/announcement", label: "Announcements", icon: IconMegaphone },
    { href: "/shop", label: "Shop", icon: IconBag },
  ];

  return (
    <>
      {/* overlay always available; visibility tied to "open" */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,.45)",
          zIndex: 35,
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity .2s ease",
        }}
      />

      {/* off-canvas panel; transform driven only by "open" */}
      <aside
        className="card"
        style={{
          position: "fixed",
          top: 64,
          left: 0,
          bottom: 0,
          width: 260,
          borderRadius: 0,
          overflowY: "auto",
          zIndex: 36,
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform .2s ease",
        }}
      >

        <nav style={{ display: "grid", gap: 6, padding: "0 12px 12px 12px" }}>
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname?.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  gap: 10,
                  background: active ? "rgba(255,255,255,.05)" : "transparent",
                  borderColor: active ? "rgba(255,255,255,.12)" : "transparent",
                }}
              >
                <Icon />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

/* icons */
function baseIcon(path: string) {
  return function Icon() {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d={path} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };
}
const IconHome = baseIcon("M3 10.5 12 3l9 7.5V21H3V10.5Z");
const IconMegaphone = baseIcon("M3 11v2a4 4 0 0 0 4 4h1V7H7a4 4 0 0 0-4 4Zm15-6v14l4-3V8l-4-3Z");
const IconCompass = baseIcon("M12 3v0a9 9 0 1 0 0 18a9 9 0 0 0 0-18Zm4 4-3 7-7 3 3-7 7-3Z");
const IconHandshake = baseIcon("M3 12l4 4 4-4 4 4 6-6M7 8l4 4");
const IconBuilding = baseIcon("M4 21V5a2 2 0 0 1 2-2h8v18M10 7h2M10 11h2M10 15h2M6 21h12");
const IconBag = baseIcon("M6 7h12l-1 12H7L6 7Zm3 0V5a3 3 0 0 1 6 0v2");
const IconUsers = baseIcon("M16 13a4 4 0 1 0-8 0M3 21a7 7 0 0 1 18 0");
