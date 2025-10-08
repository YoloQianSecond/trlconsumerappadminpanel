"use client";

import { usePathname } from "next/navigation";
import Shell from "@/components/Shell";

/**
 * Renders Shell (Topbar + Sidebar) for all routes EXCEPT auth pages.
 * Keeps login page clean.
 */
export default function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Add more public routes here if needed (e.g., /reset-password)
  const isAuthPage = pathname === "/login";

  if (isAuthPage) return <>{children}</>;
  return <Shell>{children}</Shell>;
}
