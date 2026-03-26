"use client";

import { useState } from "react";
import { useSession, Idea, Review, formatTime } from "./SessionContext";

interface Props {
  ideas: Idea[];
  reviews: Review[];
}

export default function FundingView({ ideas, reviews }: Props) {
  const { state, dispatch } = useSession();
  const remaining = state.totalBudget - state.allocatedBudget;
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const pct = Math.round(((state.totalBudget - remaining) / state.totalBudget) * 100);

  const handleAllocate = (ideaId: string) => {
    const raw = amounts[ideaId] ?? "";
    const amount = parseInt(raw, 10);
    if (isNaN(amount) || amount <= 0 || amount > remaining) return;
    dispatch({ type: "ALLOCATE_FUNDS", ideaId, amount });
    dispatch({ type: "SET_STATUS", ideaId, status: "backed" });
    setAmounts((prev) => ({ ...prev, [ideaId]: "" }));
  };

  const handlePass = (ideaId: string) => {
    dispatch({ type: "SET_STATUS", ideaId, status: "passed" });
  };

  if (ideas.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "5rem 1rem", color: "var(--text-muted)" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>💰</div>
        <p>No hypotheses to fund yet.</p>
        <p style={{ fontSize: "0.83rem", marginTop: "0.4rem", color: "var(--text-faint)" }}>
          Waiting for the Hypothesis team…
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Budget overview card */}
      <div
        className="card card-glow-amber fade-up"
        style={{ padding: "1.5rem", borderTop: "1px solid rgba(251,191,36,0.35)" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "1rem",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
              <span style={{ fontSize: "1.1rem" }}>💰</span>
              <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "1.05rem", color: "#fff" }}>
                Research Budget
              </span>
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
              Allocate funds to back ideas you believe in
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontFamily: "Syne, sans-serif",
                fontWeight: 800,
                fontSize: "1.75rem",
                letterSpacing: "-0.03em",
                color: remaining < 2000 ? "var(--red)" : "var(--amber)",
                lineHeight: 1,
              }}
            >
              ₹{remaining.toLocaleString()}
            </div>
            <div style={{ fontSize: "0.73rem", color: "var(--text-faint)", marginTop: "0.2rem" }}>
              remaining of ₹{state.totalBudget.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "0.4rem",
            fontSize: "0.72rem",
            color: "var(--text-faint)",
          }}
        >
          <span>{pct}% allocated</span>
          <span>₹{state.allocatedBudget.toLocaleString()} spent</span>
        </div>
      </div>

      {/* Section heading */}
      <div
        style={{
          fontWeight: 700,
          fontSize: "0.7rem",
          color: "var(--text-faint)",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
        }}
      >
        {ideas.length} Hypothesis{ideas.length !== 1 ? "es" : ""}
      </div>

      {/* Idea cards */}
      {ideas.map((idea) => {
        const ideaReviews = reviews.filter((r) => r.ideaId === idea.id);
        const isPassed = idea.status === "passed";
        const isBacked = idea.status === "backed";
        const amtVal = amounts[idea.id] ?? "";

        const reviewCounts = {
          supportive: ideaReviews.filter((r) => r.stance === "supportive").length,
          critical:   ideaReviews.filter((r) => r.stance === "critical").length,
          neutral:    ideaReviews.filter((r) => r.stance === "neutral").length,
        };

        return (
          <div
            key={idea.id}
            className="card fade-up"
            style={{
              padding: "1.25rem",
              borderLeft: isBacked
                ? "3px solid var(--green)"
                : isPassed
                ? "3px solid var(--red)"
                : "3px solid rgba(251,191,36,0.3)",
              opacity: isPassed ? 0.55 : 1,
              transition: "opacity 0.3s",
            }}
          >
            {/* Idea header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "0.5rem",
                marginBottom: "0.4rem",
              }}
            >
              <p style={{ fontWeight: 500, lineHeight: 1.6, flex: 1, fontSize: "0.9rem" }}>
                {idea.text}
              </p>
              <span className={`badge badge-${idea.status}`} style={{ flexShrink: 0 }}>
                {isBacked ? "✅ Backed" : isPassed ? "✗ Passed" : "Pending"}
              </span>
            </div>

            <div style={{ fontSize: "0.75rem", color: "var(--text-faint)", marginBottom: "0.85rem" }}>
              by <span style={{ color: "var(--text-muted)" }}>{idea.author}</span>
              {" · "}
              {formatTime(idea.timestamp)}
              {idea.funding > 0 && (
                <span style={{ color: "var(--amber)", fontWeight: 700, marginLeft: "0.75rem" }}>
                  ₹{idea.funding.toLocaleString()} allocated
                </span>
              )}
            </div>

            {/* Review stance pills */}
            {ideaReviews.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: "0.4rem",
                  flexWrap: "wrap",
                  marginBottom: "0.85rem",
                }}
              >
                {reviewCounts.supportive > 0 && (
                  <span className="badge badge-supportive">
                    {reviewCounts.supportive} supportive
                  </span>
                )}
                {reviewCounts.critical > 0 && (
                  <span className="badge badge-critical">
                    {reviewCounts.critical} critical
                  </span>
                )}
                {reviewCounts.neutral > 0 && (
                  <span className="badge badge-neutral">
                    {reviewCounts.neutral} neutral
                  </span>
                )}

                {/* Expandable review text */}
                <details style={{ width: "100%", marginTop: "0.25rem" }}>
                  <summary
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--cyan)",
                      cursor: "pointer",
                      userSelect: "none",
                      listStyle: "none",
                    }}
                  >
                    ▶ {ideaReviews.length} review{ideaReviews.length !== 1 ? "s" : ""}
                  </summary>
                  <div
                    style={{
                      marginTop: "0.5rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.4rem",
                      paddingLeft: "0.5rem",
                    }}
                  >
                    {ideaReviews.map((r) => (
                      <div
                        key={r.id}
                        style={{
                          fontSize: "0.82rem",
                          color: "var(--text-muted)",
                          lineHeight: 1.5,
                          borderLeft: "2px solid var(--border-2)",
                          paddingLeft: "0.65rem",
                        }}
                      >
                        <span style={{ fontWeight: 600, color: "var(--text)", marginRight: "0.4rem" }}>
                          {r.author}:
                        </span>
                        {r.text}
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}

            {/* Funding controls */}
            {!isPassed && (
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    overflow: "hidden",
                  }}
                >
                  <span
                    style={{
                      padding: "0.45rem 0.65rem",
                      fontSize: "0.85rem",
                      color: "var(--amber)",
                      borderRight: "1px solid var(--border)",
                      fontWeight: 700,
                    }}
                  >
                    ₹
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={remaining}
                    style={{
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      width: 90,
                      padding: "0.45rem 0.6rem",
                      color: "var(--text)",
                      fontFamily: "inherit",
                      fontSize: "0.88rem",
                    }}
                    placeholder="Amount"
                    value={amtVal}
                    onChange={(e) =>
                      setAmounts((prev) => ({ ...prev, [idea.id]: e.target.value }))
                    }
                    disabled={remaining <= 0 || isBacked}
                  />
                </div>
                <button
                  className="btn btn-amber"
                  onClick={() => handleAllocate(idea.id)}
                  disabled={
                    !amtVal ||
                    parseInt(amtVal) <= 0 ||
                    parseInt(amtVal) > remaining ||
                    isBacked
                  }
                >
                  Back this idea
                </button>
                <button
                  className="btn btn-danger-ghost"
                  onClick={() => handlePass(idea.id)}
                  disabled={isBacked}
                >
                  Pass
                </button>
              </div>
            )}

            {remaining <= 0 && !isPassed && !isBacked && (
              <p style={{ fontSize: "0.78rem", color: "var(--red)", marginTop: "0.5rem" }}>
                Budget exhausted.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
