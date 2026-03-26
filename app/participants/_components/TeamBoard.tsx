"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { DiscussionEvent, Session, Team } from "@/lib/store";
import { DiscussionFeed } from "@/components/DiscussionFeed";
import { ArrowLeft, Coins, FlaskConical, Loader2, MessageSquare, ScanSearch, Users } from "lucide-react";

type TeamKey = Exclude<Team, null>;

const TEAM_META: Record<TeamKey, { title: string; accent: string; icon: React.ReactNode }> = {
  hypothesis: { title: "Research", accent: "#7c3aed", icon: <FlaskConical size={16} strokeWidth={2.5} /> },
  review: { title: "Review", accent: "#0891b2", icon: <ScanSearch size={16} strokeWidth={2.5} /> },
  funding: { title: "Funding", accent: "#f97316", icon: <Coins size={16} strokeWidth={2.5} /> },
};

const PAGE_STYLE: React.CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "#fff",
  backgroundImage: ["radial-gradient(circle, #f97316 1.5px, transparent 1.5px)", "radial-gradient(circle, #000 1px, transparent 1px)"].join(", "),
  backgroundSize: "140px 140px, 28px 28px",
  backgroundPosition: "14px 14px, 0 0",
  fontFamily: "system-ui, -apple-system, sans-serif",
  color: "#000",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-start",
  padding: "2rem 1.25rem",
};

const INPUT: React.CSSProperties = {
  width: "100%",
  border: "2px solid #000",
  borderRadius: 8,
  padding: "0.65rem 0.85rem",
  fontSize: "0.92rem",
  fontFamily: "inherit",
  background: "#fff",
  color: "#000",
  outline: "none",
  boxSizing: "border-box",
};

const LABEL: React.CSSProperties = {
  display: "block",
  fontSize: "0.72rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#555",
  marginBottom: "0.4rem",
};

const STORAGE_KEY = "shastrarth_participant_v1";
const TOTAL_BUDGET = 10000;

function safeText(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

export default function TeamBoard({ teamKey }: { teamKey: TeamKey }) {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = (params.get("sessionId") ?? "").trim().toUpperCase();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [participantId, setParticipantId] = useState<string>("");
  const [participantName, setParticipantName] = useState<string>("");

  // Hypothesis form state
  const [hypothesisText, setHypothesisText] = useState("");

  // Review form state
  const [selectedHypothesisId, setSelectedHypothesisId] = useState<string>("");
  const [reviewText, setReviewText] = useState("");

  // Funding form state
  const [fundingTargetId, setFundingTargetId] = useState<string>("");
  const [fundingText, setFundingText] = useState("");
  const [fundingAmountRaw, setFundingAmountRaw] = useState<string>("");

  const didLoadParticipantRef = useRef(false);

  const teamMembers = useMemo(() => {
    if (!session) return [];
    return session.participants.filter((p) => p.team === teamKey);
  }, [session, teamKey]);

  const hypotheses = useMemo(() => {
    if (!session) return [];
    return session.events.filter((e) => e.kind === "hypothesis");
  }, [session]);

  const fundablePoints = useMemo(() => {
    if (!session) return [];
    const points = session.events.filter((e) => e.kind === "hypothesis" || e.kind === "review");
    return points.sort((a, b) => a.timestamp - b.timestamp);
  }, [session]);

  const myParticipant = useMemo(() => {
    if (!session || !participantId) return null;
    return session.participants.find((p) => p.id === participantId) ?? null;
  }, [session, participantId]);

  const canPost = !!myParticipant && myParticipant.team === teamKey;

  const spentFunding = useMemo(() => {
    if (!session) return 0;
    return session.events
      .filter((e) => e.kind === "funding")
      .reduce((sum, e) => sum + (typeof e.amount === "number" ? e.amount : 0), 0);
  }, [session]);

  const remainingBudget = Math.max(0, TOTAL_BUDGET - spentFunding);

  const poll = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/session?id=${encodeURIComponent(sessionId)}`);
      if (!res.ok) {
        setError("Session not found. Ask the host to open it first.");
        setSession(null);
        return;
      }
      const data = (await res.json()) as Session;
      setSession(data);
      setError("");
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Load participant identity from localStorage once
  useEffect(() => {
    if (!sessionId) return;
    if (didLoadParticipantRef.current) return;
    didLoadParticipantRef.current = true;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { sessionId: string; participantId: string; participantName?: string };
      if (parsed.sessionId === sessionId) {
        setParticipantId(parsed.participantId);
        if (typeof parsed.participantName === "string") setParticipantName(parsed.participantName);
      }
    } catch {
      // ignore
    }
  }, [sessionId]);

  // Keep polling session state
  useEffect(() => {
    if (!sessionId) return;
    poll();
    const interval = setInterval(() => poll(), 2000);
    return () => clearInterval(interval);
  }, [poll, sessionId]);

  // Auto-select a hypothesis for review/funding
  useEffect(() => {
    if (!hypotheses.length) return;
    if (!selectedHypothesisId) setSelectedHypothesisId(hypotheses[0].id);
  }, [hypotheses, selectedHypothesisId]);

  useEffect(() => {
    if (!fundablePoints.length) return;
    if (!fundingTargetId) setFundingTargetId(fundablePoints[0].id);
  }, [fundablePoints, fundingTargetId]);

  const selectedFundingTarget = useMemo(() => {
    if (!fundingTargetId) return null;
    return fundablePoints.find((p) => p.id === fundingTargetId) ?? null;
  }, [fundablePoints, fundingTargetId]);

  useEffect(() => {
    if (myParticipant?.name && !participantName) setParticipantName(myParticipant.name);
  }, [myParticipant, participantName]);

  type PostEventPayload = Pick<DiscussionEvent, "team" | "kind" | "content"> & Pick<DiscussionEvent, "relatedTo" | "amount">;

  const postEvent = async (payload: PostEventPayload) => {
    if (!sessionId || !participantId || !canPost) return;
    const content = safeText(payload.content);
    if (!content) return;

    setError("");
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "post_event",
          sessionId,
          participantId,
          participantName: participantName.trim() || myParticipant?.name || "Anonymous",
          team: payload.team,
          kind: payload.kind,
          content,
          relatedTo: payload.relatedTo,
          amount: payload.amount,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError((data && typeof data.error === "string" ? data.error : null) ?? "Could not post.");
      }
    } catch {
      setError("Could not connect to the server.");
    }
  };

  const meta = TEAM_META[teamKey];

  const handleSubmitHypothesis = async () => {
    await postEvent({
      team: "hypothesis",
      kind: "hypothesis",
      content: hypothesisText,
    });
    setHypothesisText("");
  };

  const handleSubmitReview = async () => {
    if (!selectedHypothesisId) return;
    await postEvent({
      team: "review",
      kind: "review",
      content: reviewText,
      relatedTo: selectedHypothesisId,
    });
    setReviewText("");
    setSelectedHypothesisId((prev) => prev);
  };

  const handleSubmitFunding = async () => {
    if (!fundingTargetId) return;
    const amount = parseInt(fundingAmountRaw, 10);
    if (Number.isNaN(amount) || amount <= 0) return;
    if (amount > remainingBudget) {
      setError(`Amount exceeds remaining budget (${remainingBudget}).`);
      return;
    }
    await postEvent({
      team: "funding",
      kind: "funding",
      content: fundingText || `Funding allocation`,
      relatedTo: fundingTargetId,
      amount,
    });
    setFundingText("");
    setFundingAmountRaw("");
  };

  return (
    <div style={PAGE_STYLE}>
      <div style={{ width: "100%", maxWidth: 900, display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <button
            onClick={() => router.push("/")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "2px solid #000",
              borderRadius: 8,
              padding: "0.35rem 0.85rem",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <ArrowLeft size={14} strokeWidth={2.5} /> Home
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 4, background: "#fff", border: "2px solid #000", borderRadius: 10, padding: "0.35rem 0.75rem" }}>
            <MessageSquare size={16} strokeWidth={2.5} />
            <span style={{ fontWeight: 900, color: meta.accent }}>{meta.title} Board</span>
            <span style={{ fontWeight: 800, color: "#111" }}>{sessionId || "—"}</span>
          </div>

          <div style={{ marginLeft: "auto", color: "#666", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 8 }}>
            {loading ? (
              <>
                <Loader2 size={14} className="spin" /> Syncing…
              </>
            ) : (
              <>
                <Users size={14} /> {teamMembers.length} in team
              </>
            )}
          </div>
        </div>

        {!sessionId ? (
          <div style={{ background: "#fff", border: "3px solid #000", borderRadius: 16, padding: "2rem", textAlign: "center" }}>
            <p style={{ fontWeight: 900, marginBottom: 8 }}>Missing `sessionId`</p>
            <p style={{ color: "#666" }}>Go back to join a session.</p>
            <button className="btn btn-primary" onClick={() => router.push("/join")} style={{ marginTop: 16 }}>
              ← Back to Join
            </button>
          </div>
        ) : (
          <>
            {error && (
              <p style={{ color: "#dc2626", fontSize: "0.9rem", fontWeight: 700, margin: 0 }}>{error}</p>
            )}

            {/* Topic (single topic per session) */}
            <div style={{ background: "#fff", border: "3px solid #000", borderRadius: 12, padding: "0.9rem 1.1rem", display: "flex", alignItems: "center", gap: "0.9rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888" }}>
                Topic
              </span>
              <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>{session?.topic ?? "—"}</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.25rem" }}>
              {/* Team members + posting */}
              <div style={{ background: "#fff", border: "3px solid #000", borderRadius: 14, padding: "1.1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "0.9rem" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#000", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {meta.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 900, fontSize: "1rem" }}>{meta.title} Members</div>
                    <div style={{ color: "#666", fontSize: "0.82rem" }}>
                      {teamMembers.length ? "Your team roster for this session." : "No one assigned to this team yet."}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    maxHeight: 56, // show ~1 participant row at a time
                    overflowY: "auto",
                    paddingRight: 6,
                  }}
                >
                  {teamMembers.length === 0 ? (
                    <div style={{ color: "#bbb", fontSize: "0.88rem" }}>Empty</div>
                  ) : (
                    teamMembers.map((p) => (
                      <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.35rem 0", borderBottom: "1px solid #f0f0f0" }}>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", border: "2px solid #000", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "0.8rem", flexShrink: 0 }}>
                          {p.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div style={{ flex: 1, fontWeight: 700, fontSize: "0.9rem" }}>
                          {p.name}
                        </div>
                        {myParticipant?.id === p.id && (
                          <span style={{ fontSize: "0.7rem", fontWeight: 900, color: meta.accent, border: `1.5px solid ${meta.accent}`, padding: "0.15rem 0.5rem", borderRadius: 99 }}>
                            You
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div style={{ marginTop: "1rem", borderTop: "2px solid #eee", paddingTop: "1rem" }}>
                  {/* Post card */}
                  <div style={{ fontWeight: 900, fontSize: "0.92rem", marginBottom: "0.85rem" }}>
                    Post to the conversation
                  </div>

                  {!canPost ? (
                    <p style={{ color: "#666", fontSize: "0.88rem", lineHeight: 1.5 }}>
                      You are not assigned to the <strong>{meta.title}</strong> team yet. Ask the host to assign you.
                    </p>
                  ) : (
                    <>
                      {teamKey === "hypothesis" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                          <label style={LABEL}>Your hypothesis</label>
                          <textarea
                            value={hypothesisText}
                            onChange={(e) => setHypothesisText(e.target.value)}
                            rows={3}
                            style={{ ...INPUT, resize: "vertical", minHeight: 90 }}
                            placeholder='e.g. "I believe the key constraint is accountability rather than definitions..."'
                          />
                          <button
                            onClick={handleSubmitHypothesis}
                            disabled={!hypothesisText.trim()}
                            style={{
                              width: "100%",
                              background: "#000",
                              color: "#fff",
                              border: "none",
                              borderRadius: 9,
                              padding: "0.8rem",
                              fontWeight: 900,
                              fontSize: "1rem",
                              cursor: hypothesisText.trim() ? "pointer" : "not-allowed",
                              opacity: hypothesisText.trim() ? 1 : 0.6,
                            }}
                          >
                            Submit Hypothesis →
                          </button>
                        </div>
                      )}

                      {teamKey === "review" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                              <label style={LABEL}>Choose a hypothesis point to critique</label>
                              <span style={{ fontSize: "0.75rem", color: "#888", fontWeight: 700 }}>
                                {hypotheses.length} point{hypotheses.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <div
                              style={{
                                border: "2px solid #000",
                                borderRadius: 10,
                                padding: "0.6rem",
                                maxHeight: 140,
                                overflowY: "auto",
                                background: "#fff",
                              }}
                            >
                              {hypotheses.length === 0 ? (
                                <div style={{ color: "#888", fontSize: "0.86rem", padding: "0.4rem 0.2rem" }}>
                                  No hypotheses yet.
                                </div>
                              ) : (
                                hypotheses.map((h) => {
                                  const active = h.id === selectedHypothesisId;
                                  return (
                                    <button
                                      key={h.id}
                                      type="button"
                                      onClick={() => setSelectedHypothesisId(h.id)}
                                      style={{
                                        width: "100%",
                                        textAlign: "left",
                                        background: active ? "#000" : "#fff",
                                        color: active ? "#fff" : "#000",
                                        border: active ? "2px solid #000" : "1px solid #eee",
                                        borderRadius: 10,
                                        padding: "0.6rem 0.75rem",
                                        cursor: "pointer",
                                        fontFamily: "inherit",
                                        marginBottom: 8,
                                      }}
                                    >
                                      <div style={{ fontSize: "0.75rem", fontWeight: 900, opacity: active ? 1 : 0.7 }}>
                                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                          <FlaskConical size={14} strokeWidth={2.5} /> {h.participantName}
                                        </span>
                                      </div>
                                      <div style={{ fontSize: "0.86rem", fontWeight: 700, lineHeight: 1.35 }}>
                                        {h.content}
                                      </div>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          <div>
                            <label style={LABEL}>Your critique</label>
                            <textarea
                              value={reviewText}
                              onChange={(e) => setReviewText(e.target.value)}
                              rows={3}
                              style={{ ...INPUT, resize: "vertical", minHeight: 90 }}
                              placeholder="Write a critique of the selected hypothesis point…"
                            />
                          </div>

                          <button
                            onClick={handleSubmitReview}
                            disabled={!reviewText.trim() || !selectedHypothesisId}
                            style={{
                              width: "100%",
                              background: "#000",
                              color: "#fff",
                              border: "none",
                              borderRadius: 9,
                              padding: "0.8rem",
                              fontWeight: 900,
                              fontSize: "1rem",
                              cursor: reviewText.trim() && selectedHypothesisId ? "pointer" : "not-allowed",
                              opacity: reviewText.trim() && selectedHypothesisId ? 1 : 0.6,
                            }}
                          >
                            Submit Review →
                          </button>
                        </div>
                      )}

                      {teamKey === "funding" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 2 }}>
                            <span style={{ fontWeight: 900, color: "#f97316" }}>Remaining:</span>
                            <span style={{ fontWeight: 900 }}>₹{remainingBudget.toLocaleString()}</span>
                          </div>

                          <div>
                            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                              <label style={LABEL}>Choose a point to fund (Hypothesis or Review)</label>
                              <span style={{ fontSize: "0.75rem", color: "#888", fontWeight: 700 }}>
                                {fundablePoints.length} point{fundablePoints.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <div
                              style={{
                                border: "2px solid #000",
                                borderRadius: 10,
                                padding: "0.6rem",
                                maxHeight: 160,
                                overflowY: "auto",
                                background: "#fff",
                              }}
                            >
                              {fundablePoints.length === 0 ? (
                                <div style={{ color: "#888", fontSize: "0.86rem", padding: "0.4rem 0.2rem" }}>
                                  No points to fund yet (wait for Hypothesis/Review posts).
                                </div>
                              ) : (
                                fundablePoints.map((p) => {
                                  const active = p.id === fundingTargetId;
                                  const icon = p.kind === "hypothesis" ? <FlaskConical size={14} strokeWidth={2.5} /> : <ScanSearch size={14} strokeWidth={2.5} />;
                                  const accent = p.kind === "hypothesis" ? "#7c3aed" : "#0891b2";
                                  return (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onClick={() => setFundingTargetId(p.id)}
                                      style={{
                                        width: "100%",
                                        textAlign: "left",
                                        background: active ? "#000" : "#fff",
                                        color: active ? "#fff" : "#000",
                                        border: active ? `2px solid ${accent}` : "1px solid #eee",
                                        borderRadius: 10,
                                        padding: "0.6rem 0.75rem",
                                        cursor: "pointer",
                                        fontFamily: "inherit",
                                        marginBottom: 8,
                                      }}
                                    >
                                      <div style={{ fontSize: "0.75rem", fontWeight: 900, opacity: active ? 1 : 0.7 }}>
                                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                          {icon} {p.participantName} · {p.kind === "hypothesis" ? "Hypothesis" : "Review"}
                                        </span>
                                      </div>
                                      <div style={{ fontSize: "0.86rem", fontWeight: 700, lineHeight: 1.35 }}>
                                        {p.content}
                                      </div>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          <div>
                            <label style={LABEL}>Amount (₹)</label>
                            <input
                              type="number"
                              min={1}
                              max={remainingBudget}
                              value={fundingAmountRaw}
                              onChange={(e) => setFundingAmountRaw(e.target.value)}
                              style={INPUT}
                              placeholder="e.g. 500"
                              disabled={!fundablePoints.length || remainingBudget <= 0}
                            />
                          </div>

                          <div>
                            <label style={LABEL}>Funding note</label>
                            <textarea
                              value={fundingText}
                              onChange={(e) => setFundingText(e.target.value)}
                              rows={3}
                              style={{ ...INPUT, resize: "vertical", minHeight: 90 }}
                              placeholder="Why are you funding this point?"
                              disabled={!fundablePoints.length || remainingBudget <= 0}
                            />
                          </div>

                          {selectedFundingTarget && (
                            <div style={{ fontSize: "0.82rem", color: "#666", lineHeight: 1.45 }}>
                              Funding: <strong>{selectedFundingTarget.kind === "hypothesis" ? "Hypothesis" : "Review"}</strong> by{" "}
                              <strong>{selectedFundingTarget.participantName}</strong>
                            </div>
                          )}

                          <button
                            onClick={handleSubmitFunding}
                            disabled={!fundingTargetId || remainingBudget <= 0}
                            style={{
                              width: "100%",
                              background: "#000",
                              color: "#fff",
                              border: "none",
                              borderRadius: 9,
                              padding: "0.8rem",
                              fontWeight: 900,
                              fontSize: "1rem",
                              cursor: fundingTargetId && remainingBudget > 0 ? "pointer" : "not-allowed",
                              opacity: fundingTargetId && remainingBudget > 0 ? 1 : 0.6,
                            }}
                          >
                            Allocate Funds →
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Discussion Feed */}
              <div style={{ background: "#fff", border: "3px solid #000", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ borderBottom: "2px solid #000", padding: "0.85rem 1.2rem", display: "flex", alignItems: "center", gap: 10 }}>
                  <MessageSquare size={17} strokeWidth={2} />
                  <span style={{ fontWeight: 900, fontSize: "0.95rem" }}>Conversation</span>
                  <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "#aaa", display: "flex", alignItems: "center", gap: 6 }}>
                    {teamMembers.length} team members
                  </span>
                </div>
                <div style={{ padding: "1.25rem 1.2rem", maxHeight: 520, overflowY: "auto" }}>
                  <DiscussionFeed events={session?.events ?? []} />
                </div>
              </div>
            </div>

            <p style={{ marginTop: "-0.35rem", fontSize: "0.75rem", color: "#aaa", display: "flex", alignItems: "center", gap: 5 }}>
              <MessageSquare size={11} /> Auto-refreshing every 2 s
            </p>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}

