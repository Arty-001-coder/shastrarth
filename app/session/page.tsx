"use client";

import { Suspense } from "react";
import SessionPage from "./SessionPage";

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem", color: "var(--ink-muted)" }}>Loading…</div>}>
      <SessionPage />
    </Suspense>
  );
}
