"use client";

import { useState } from "react";
import { useSession, Idea, Review, uid, formatTime } from "./SessionContext";

interface Props {
  ideas: Idea[];
  reviews: Review[];
}

const STANCES = [
  { key: "supportive" as const, label: "Supportive", accent: "var(--green)",  border: "rgba(52,211,153,0.35)",  bg: "rgba(52,211,153,0.1)"   },
  { key: "critical"   as const, label: "Critical",   accent: "var(--red)",    border: "rgba(248,113,113,0.35)", bg: "rgba(248,113,113,0.1)"  },
  { key: "neutral"    as const, label: "Neutral",     accent: "var(--text-muted)", border: "var(--border-2)", bg: "var(--bg-glass-2)" },
] as const;

export default function ReviewView({ ideas, reviews }: Props) {
  const { dispatch } = useSession();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [reviewer, setReviewer] = useState("");
  const [stance, setStance] = useState<"supportive" | "critical" | "neutral">("neutral");

  const handleSubmitReview = (ideaId: string) => {
    if (!reviewText.trim()) return;
    const now = Date.now();
    const review: Review = {
      id: uid(),
      ideaId,
      text: reviewText.trim(),
      author: reviewer.trim() || "Anonymous",
      timestamp: now,
      stance,
    };
    dispatch({ type: "ADD_REVIEW", review });
    setReviewText("");
    setExpandedId(null);
  };

  if (ideas.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "5rem 1rem",
          color: "var(--text-muted)",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔍</div>
        <p>No hypotheses to review yet.</p>
        <p style={{ fontSize: "0.83rem", marginTop: "0.4rem", color: "var(--text-faint)" }}>
          Waiting for the Hypothesis team…
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div
        style={{
          fontWeight: 700,
          fontSize: "0.7rem",
          color: "var(--text-faint)",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
        }}
      >
        {ideas.length} Hypothesis{ideas.length !== 1 ? "es" : ""} to Review
      </div>

      {ideas.map((idea) => {
        const ideaReviews = reviews.filter((r) => r.ideaId === idea.id);
        const isOpen = expandedId === idea.id;

        return (
          <div
            key={idea.id}
            className="card fade-up"
            style={{
              padding: "1.25rem",
              borderTop: "1px solid rgba(34,211,238,0.25)",
              boxShadow: "0 0 0 1px rgba(34,211,238,0.08), 0 8px 24px rgba(34,211,238,0.04)",
            }}
          >
            {/* Idea header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "0.5rem",
              }}
            >
              <p style={{ fontWeight: 500, lineHeight: 1.6, flex: 1, fontSize: "0.9rem" }}>
                {idea.text}
              </p>
              <span className={`badge badge-${idea.status}`} style={{ flexShrink: 0 }}>
                {idea.status === "backed" ? "✅ Backed" : idea.status === "passed" ? "✗ Passed" : "Pending"}
              </span>
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--text-faint)",
                marginTop: "0.35rem",
                marginBottom: ideaReviews.length > 0 ? "1rem" : "0",
              }}
            >
              by{" "}
              <span style={{ color: "var(--text-muted)" }}>{idea.author}</span>
              {" · "}
              {formatTime(idea.timestamp)}
              {idea.funding > 0 && (
                <span style={{ color: "var(--green)", fontWeight: 600, marginLeft: "0.75rem" }}>
                  ₹{idea.funding.toLocaleString()} funded
                </span>
              )}
            </div>

            {/* Existing reviews */}
            {ideaReviews.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.55rem",
                  marginBottom: "1rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    color: "var(--text-faint)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginTop: "0.5rem",
                  }}
                >
                  Reviews ({ideaReviews.length})
                </div>
                {ideaReviews.map((r) => {
                  const s = STANCES.find((st) => st.key === r.stance)!;
                  return (
                    <div
                      key={r.id}
                      style={{
                        padding: "0.7rem 1rem",
                        background: s.bg,
                        borderRadius: 9,
                        borderLeft: `3px solid ${s.accent}`,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "0.3rem",
                          alignItems: "baseline",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            color: s.accent,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                          }}
                        >
                          {s.label}
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-faint)" }}>
                          {r.author} · {formatTime(r.timestamp)}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.87rem", lineHeight: 1.6, color: "var(--text)" }}>
                        {r.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ height: 1, background: "var(--border)", margin: "0.75rem 0" }} />

            {/* Add review toggle */}
            {!isOpen ? (
              <button
                className="btn btn-cyan"
                style={{ fontSize: "0.82rem" }}
                onClick={() => {
                  setExpandedId(idea.id);
                  setReviewText("");
                  setStance("neutral");
                }}
              >
                + Add Review
              </button>
            ) : (
              <div
                className="fade-up"
                style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}
              >
                {/* Stance selector */}
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {STANCES.map((s) => (
                    <button
                      key={s.key}
                      className={`stance-btn stance-${s.key} ${stance === s.key ? "active" : ""}`}
                      onClick={() => setStance(s.key)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <textarea
                  className="textarea"
                  placeholder="Write your review…"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  style={{ minHeight: 80 }}
                />
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <input
                    className="input"
                    style={{ flex: 1, minWidth: 140 }}
                    placeholder="Your name (optional)"
                    value={reviewer}
                    onChange={(e) => setReviewer(e.target.value)}
                  />
                  <button
                    className="btn btn-cyan"
                    onClick={() => handleSubmitReview(idea.id)}
                    disabled={!reviewText.trim()}
                  >
                    Submit
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => setExpandedId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
