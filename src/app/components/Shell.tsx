"use client";

import * as React from "react";
import Topbar from "@/components/Topbar";
import Sidebar from "@/components/Sidebar";

export default function Shell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="min-h-dvh">
      {/* pass a TOGGLE, not just open */}
      <Topbar onMenu={() => setSidebarOpen((s) => !s)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main style={{ paddingTop: 64 }} className="p-6 max-w-full">
        {children}
      </main>
    </div>
  );
}
