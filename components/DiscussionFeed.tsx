"use client";

import React from "react";
import { Clock, Coins, FlaskConical, MessageSquare, ScanSearch } from "lucide-react";
import type { DiscussionEvent } from "@/lib/store";

const TEAM_META: Record<string, { accent: string; icon: React.ReactNode; label: string }> = {
  hypothesis: {
    accent: "#7c3aed",
    icon: <FlaskConical size={12} strokeWidth={2.5} />,
    label: "Hypothesis",
  },
  review: {
    accent: "#0891b2",
    icon: <ScanSearch size={12} strokeWidth={2.5} />,
    label: "Review",
  },
  funding: {
    accent: "#f97316",
    icon: <Coins size={12} strokeWidth={2.5} />,
    label: "Funding",
  },
};

function relTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export function DiscussionFeed({ events }: { events: DiscussionEvent[] }) {
  const hypotheses = events.filter((e) => e.kind === "hypothesis");
  const getReplies = (hId: string) => {
    // Reviews/funding directly attached to this hypothesis…
    const direct = events.filter((e) => e.relatedTo === hId);
    // …plus funding attached to any review under this hypothesis.
    const reviewIds = new Set(direct.filter((e) => e.kind === "review").map((e) => e.id));
    const nested = events.filter((e) => e.relatedTo && reviewIds.has(e.relatedTo));

    const seen = new Set<string>();
    const merged = [...direct, ...nested].filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
    merged.sort((a, b) => a.timestamp - b.timestamp);
    return merged;
  };

  if (hypotheses.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "#aaa" }}>
        <MessageSquare size={32} strokeWidth={1} style={{ marginBottom: 10, opacity: 0.4 }} />
        <p style={{ fontSize: "0.88rem" }}>No discussion yet. Once teams post, the conversation will appear here.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {hypotheses.map((h) => {
        const replies = getReplies(h.id);
        const meta = TEAM_META[h.team];
        const totalFunded = replies
          .filter((r) => r.kind === "funding" && typeof r.amount === "number")
          .reduce((s, r) => s + (r.amount ?? 0), 0);

        return (
          <div key={h.id}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "#000",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "0.85rem",
                  flexShrink: 0,
                  border: `3px solid ${meta?.accent ?? "#000"}`,
                }}
              >
                {h.participantName?.[0]?.toUpperCase() ?? "?"}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{h.participantName}</span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      background: meta?.accent ?? "#111",
                      color: "#fff",
                      borderRadius: 99,
                      padding: "0.15rem 0.55rem",
                      fontSize: "0.68rem",
                      fontWeight: 700,
                    }}
                  >
                    {meta?.icon} {meta?.label ?? h.team}
                  </span>
                  {totalFunded > 0 && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        background: "#fef3c7",
                        color: "#92400e",
                        border: "1px solid #f97316",
                        borderRadius: 99,
                        padding: "0.15rem 0.55rem",
                        fontSize: "0.68rem",
                        fontWeight: 700,
                      }}
                    >
                      <Coins size={11} /> ₹{totalFunded} funded
                    </span>
                  )}
                  <span
                    style={{
                      marginLeft: "auto",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      color: "#aaa",
                      fontSize: "0.72rem",
                    }}
                  >
                    <Clock size={11} /> {relTime(h.timestamp)}
                  </span>
                </div>

                <div
                  style={{
                    background: "#f8f8f8",
                    border: "2px solid #000",
                    borderLeft: `4px solid ${meta?.accent ?? "#000"}`,
                    borderRadius: "0 10px 10px 10px",
                    padding: "0.75rem 1rem",
                    fontSize: "0.88rem",
                    lineHeight: 1.55,
                  }}
                >
                  {h.content}
                </div>

                {replies.length > 0 && (
                  <div
                    style={{
                      marginTop: "0.75rem",
                      paddingLeft: "1rem",
                      borderLeft: "2px dashed #e0e0e0",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.65rem",
                    }}
                  >
                    {replies.map((reply) => {
                      const rm = TEAM_META[reply.team];
                      const relatedEvent = reply.relatedTo ? events.find((e) => e.id === reply.relatedTo) : null;
                      const fundingTargetsReview = reply.kind === "funding" && relatedEvent?.kind === "review";
                      const fundingTargetPill =
                        reply.kind === "funding" && relatedEvent
                          ? {
                              label: relatedEvent.kind === "review" ? "Funding a review point" : "Funding a hypothesis point",
                              accent: relatedEvent.kind === "review" ? TEAM_META.review.accent : TEAM_META.hypothesis.accent,
                              icon: relatedEvent.kind === "review" ? TEAM_META.review.icon : TEAM_META.hypothesis.icon,
                            }
                          : null;

                      return (
                        <div key={reply.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              background: rm?.accent ?? "#000",
                              color: "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 800,
                              fontSize: "0.72rem",
                              flexShrink: 0,
                            }}
                          >
                            {reply.participantName?.[0]?.toUpperCase() ?? "?"}
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 700, fontSize: "0.82rem" }}>{reply.participantName}</span>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 3,
                                  background: rm?.accent ?? "#000",
                                  color: reply.team === "funding" ? "#000" : "#fff",
                                  borderRadius: 99,
                                  padding: "0.1rem 0.45rem",
                                  fontSize: "0.62rem",
                                  fontWeight: 700,
                                }}
                              >
                                {rm?.icon} {rm?.label ?? reply.team}
                              </span>

                              {reply.kind === "funding" && typeof reply.amount === "number" && (
                                <span style={{ color: "#f97316", fontWeight: 800, fontSize: "0.8rem" }}>· ₹{reply.amount}</span>
                              )}

                              {fundingTargetPill && (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    borderRadius: 99,
                                    padding: "0.12rem 0.5rem",
                                    fontSize: "0.62rem",
                                    fontWeight: 800,
                                    background: "#fff",
                                    border: `1.5px solid ${fundingTargetPill.accent}`,
                                    color: fundingTargetPill.accent,
                                  }}
                                >
                                  {fundingTargetPill.icon} {fundingTargetPill.label}
                                </span>
                              )}

                              <span
                                style={{
                                  marginLeft: "auto",
                                  color: "#bbb",
                                  fontSize: "0.68rem",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 3,
                                }}
                              >
                                <Clock size={10} /> {relTime(reply.timestamp)}
                              </span>
                            </div>

                            <div
                              style={{
                                background: reply.kind === "funding"
                                  ? (fundingTargetsReview ? "rgba(8,145,178,0.08)" : "#fff8f0")
                                  : "#fff",
                                border: `1.5px solid ${reply.kind === "funding" && fundingTargetsReview ? TEAM_META.review.accent : (rm?.accent ?? "#000")}`,
                                borderRadius: "0 8px 8px 8px",
                                padding: "0.55rem 0.75rem",
                                fontSize: "0.84rem",
                                lineHeight: 1.5,
                              }}
                            >
                              {reply.content}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

