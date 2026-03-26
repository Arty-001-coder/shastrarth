"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "./SessionContext";
import HypothesisView from "./HypothesisView";
import ReviewView from "./ReviewView";
import FundingView from "./FundingView";

type Role = "hypothesis" | "review" | "funding";

const ROLE_META: Record<Role, { emoji: string; label: string; accent: string; glow: string; btnClass: string }> = {
  hypothesis: { emoji: "🔬", label: "Hypothesis",  accent: "var(--violet)", glow: "rgba(167,139,250,0.18)", btnClass: "btn-violet" },
  review:     { emoji: "🔍", label: "Review",      accent: "var(--cyan)",   glow: "rgba(34,211,238,0.15)",  btnClass: "btn-cyan" },
  funding:    { emoji: "💰", label: "Funding",     accent: "var(--amber)",  glow: "rgba(251,191,36,0.15)",  btnClass: "btn-amber" },
};

export default function SessionPage() {
  const router = useRouter();
  const params = useSearchParams();
  const role = (params.get("role") ?? "hypothesis") as Role;
  const { state } = useSession();
  const meta = ROLE_META[role] ?? ROLE_META.hypothesis;

  if (!state.question) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        <div style={{ fontSize: "3rem" }}>🌑</div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
          No active session. Please set a question first.
        </p>
        <button className="btn btn-primary" onClick={() => router.push("/")}>
          ← Go to Home
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* ── TOP BAR ── */}
      <header
        style={{
          background: "rgba(6,7,15,0.85)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border)",
          padding: "0.8rem 1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.85rem",
          flexWrap: "wrap",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          className="btn btn-ghost"
          onClick={() => router.push("/")}
          style={{ padding: "0.35rem 0.7rem", fontSize: "0.78rem" }}
        >
          ← Home
        </button>

        {/* Question pill */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            background: "rgba(167,139,250,0.08)",
            border: "1px solid rgba(167,139,250,0.2)",
            borderRadius: 8,
            padding: "0.4rem 0.9rem",
            fontSize: "0.83rem",
            fontWeight: 500,
            color: "rgba(167,139,250,0.9)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={state.question}
        >
          📌 {state.question}
        </div>

        {/* Active role chip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${meta.glow.replace("0.18", "0.4").replace("0.15", "0.4")}`,
            borderRadius: 8,
            padding: "0.35rem 0.85rem",
            fontSize: "0.8rem",
            fontWeight: 700,
            color: meta.accent,
            flexShrink: 0,
          }}
        >
          {meta.emoji} {meta.label} Team
        </div>
      </header>

      {/* ── TAB NAV ── */}
      <nav
        style={{
          display: "flex",
          background: "rgba(6,7,15,0.6)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {(Object.entries(ROLE_META) as [Role, typeof meta][]).map(([key, m]) => (
          <button
            key={key}
            onClick={() => router.push(`/session?role=${key}`)}
            style={{
              flex: 1,
              padding: "0.75rem 0.5rem",
              fontSize: "0.82rem",
              fontWeight: role === key ? 700 : 500,
              color: role === key ? m.accent : "var(--text-muted)",
              background: role === key ? `${m.glow}` : "transparent",
              border: "none",
              borderBottom: role === key ? `2px solid ${m.accent}` : "2px solid transparent",
              cursor: "pointer",
              transition: "all 0.18s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              fontFamily: "inherit",
            }}
          >
            <span>{m.emoji}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </nav>

      {/* ── CONTENT ── */}
      <main
        style={{
          flex: 1,
          maxWidth: 780,
          width: "100%",
          margin: "0 auto",
          padding: "2rem 1.25rem 5rem",
        }}
      >
        {role === "hypothesis" && <HypothesisView ideas={state.ideas} reviews={state.reviews} />}
        {role === "review"     && <ReviewView     ideas={state.ideas} reviews={state.reviews} />}
        {role === "funding"    && <FundingView     ideas={state.ideas} reviews={state.reviews} />}
      </main>

      {/* ── FOOTER STATS ── */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          background: "rgba(6,7,15,0.85)",
          backdropFilter: "blur(10px)",
          padding: "0.65rem 1.5rem",
          display: "flex",
          gap: "1.5rem",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {[
          { icon: "🔬", val: `${state.ideas.length} hypotheses`, color: "var(--violet)" },
          { icon: "🔍", val: `${state.reviews.length} reviews`,  color: "var(--cyan)" },
          {
            icon: "💰",
            val: `₹${(state.totalBudget - state.allocatedBudget).toLocaleString()} remaining`,
            color: state.allocatedBudget > state.totalBudget * 0.8 ? "var(--red)" : "var(--amber)",
          },
        ].map((s) => (
          <span
            key={s.val}
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: s.color,
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            {s.icon} {s.val}
          </span>
        ))}
      </footer>
    </div>
  );
}
