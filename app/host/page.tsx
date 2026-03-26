"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Session, Team, DiscussionEvent } from "@/lib/store";
import { DiscussionFeed as SharedDiscussionFeed } from "@/components/DiscussionFeed";
import { ArrowLeft, Radio, Users, Loader2, RefreshCw, MessageSquare, FlaskConical, ScanSearch, Coins } from "lucide-react";
import { useRouter } from "next/navigation";

/* ── Types ── */
type Step = "setup" | "dashboard";

const TEAMS: { key: Team; label: string; accent: string }[] = [
  { key: "hypothesis", label: "Hypothesis", accent: "#7c3aed" },
  { key: "review",     label: "Review",     accent: "#0891b2" },
  { key: "funding",    label: "Funding",    accent: "#f97316" },
];

type TeamKey = Exclude<Team, null>;

const TEAM_META: Record<string, { accent: string; icon: React.ReactNode; label: string }> = {
  hypothesis: { accent: "#7c3aed", label: "Hypothesis", icon: <FlaskConical size={13} strokeWidth={2} /> },
  review:     { accent: "#0891b2", label: "Review",     icon: <ScanSearch size={13} strokeWidth={2} /> },
  funding:    { accent: "#f97316", label: "Funding",    icon: <Coins size={13} strokeWidth={2} /> },
};

/* ── Shared layout styles ── */
const PAGE_STYLE: React.CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "#fff",
  backgroundImage: [
    "radial-gradient(circle, #f97316 1.5px, transparent 1.5px)",
    "radial-gradient(circle, #000 1px, transparent 1px)",
  ].join(", "),
  backgroundSize: "140px 140px, 28px 28px",
  backgroundPosition: "14px 14px, 0 0",
  fontFamily: "system-ui, -apple-system, sans-serif",
  color: "#000",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  padding: "2.5rem 1.5rem",
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

/* ── Demo events seeded on session open ── */
function buildDemoEvents(sessionId: string, topic: string): DiscussionEvent[] {
  const now = Date.now();
  const h1Id = "demo-h1";
  const h2Id = "demo-h2";
  return [
    {
      id: h1Id,
      participantId: "demo-p1",
      participantName: "Arjun",
      team: "hypothesis",
      kind: "hypothesis",
      content: `On the topic "${topic}" — I propose that the existing legal frameworks are insufficient without a formal redefinition of agency.`,
      timestamp: now - 5 * 60 * 1000,
    },
    {
      id: "demo-r1",
      participantId: "demo-p2",
      participantName: "Meera",
      team: "review",
      kind: "review",
      content: "Strong point. Corporate personhood precedents support this — the gap is in accountability mechanisms, not definitions per se.",
      relatedTo: h1Id,
      timestamp: now - 4 * 60 * 1000,
    },
    {
      id: "demo-f1",
      participantId: "demo-p3",
      participantName: "Rohan",
      team: "funding",
      kind: "funding",
      content: "Allocating budget to this hypothesis based on its analytical depth.",
      relatedTo: h1Id,
      amount: 600,
      timestamp: now - 3 * 60 * 1000,
    },
    {
      id: h2Id,
      participantId: "demo-p4",
      participantName: "Priya",
      team: "hypothesis",
      kind: "hypothesis",
      content: "Counter-point: the question isn't legal frameworks but public consensus. Without societal agreement, any legal status is unstable.",
      timestamp: now - 2 * 60 * 1000,
    },
    {
      id: "demo-r2",
      participantId: "demo-p5",
      participantName: "Vikram",
      team: "review",
      kind: "review",
      content: "Partially agree — but public consensus has historically followed legal legitimacy, not preceded it. Historical analogy: corporate law in the 1800s.",
      relatedTo: h2Id,
      timestamp: now - 90 * 1000,
    },
    {
      id: "demo-f2",
      participantId: "demo-p3",
      participantName: "Rohan",
      team: "funding",
      kind: "funding",
      content: "Holding funds — waiting for the review team to develop this thread further.",
      relatedTo: h2Id,
      amount: 150,
      timestamp: now - 60 * 1000,
    },
  ];
}

// Discussion feed is shared in `components/DiscussionFeed.tsx` so Host + Participants stay consistent.

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
export default function HostPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("setup");
  const [name, setName] = useState("");
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [ending, setEnding] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [collapsedTeams, setCollapsedTeams] = useState<Record<TeamKey, boolean>>({
    hypothesis: false,
    review: false,
    funding: false,
  });

  const toggleTeamMembers = (team: TeamKey) => {
    setCollapsedTeams((prev) => ({ ...prev, [team]: !prev[team] }));
  };

  const poll = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/session?id=${id}`);
      if (res.ok) setSession(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (step === "dashboard" && session) {
      intervalRef.current = setInterval(() => poll(session.id), 2000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [step, session, poll]);

  const handleStart = async () => {
    if (!name.trim()) { setError("Enter your name to continue."); return; }
    if (!question.trim()) { setError("Enter a session question to continue."); return; }
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "host", name: name.trim(), topic: question.trim() }),
      });
      const data: Session = await res.json();
      if (!res.ok) { setError((data as unknown as { error: string }).error ?? "Something went wrong."); return; }

      // Seed demo events so host sees the live feed immediately
      const demoEvents = buildDemoEvents(data.id, data.topic);
      for (const ev of demoEvents) {
        await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "post_event",
            sessionId: data.id,
            participantId: ev.participantId,
            participantName: ev.participantName,
            team: ev.team,
            kind: ev.kind,
            content: ev.content,
            relatedTo: ev.relatedTo,
            amount: ev.amount,
          }),
        });
      }

      // Fetch fresh session with events
      const fresh = await fetch(`/api/session?id=${data.id}`);
      if (fresh.ok) setSession(await fresh.json());
      else setSession(data);
      setStep("dashboard");
    } catch { setError("Could not connect."); }
    finally { setLoading(false); }
  };

  const assignTeam = async (pid: string, team: Team) => {
    if (!session) return;
    const res = await fetch("/api/session", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "assign", sessionId: session.id, participantId: pid, team }),
    });
    if (res.ok) setSession(await res.json());
  };

  const kick = async (pid: string) => {
    if (!session) return;
    const res = await fetch("/api/session", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "kick", sessionId: session.id, participantId: pid }),
    });
    if (res.ok) setSession(await res.json());
  };

  const endSession = async () => {
    if (!session) return;
    const ok = window.confirm(
      `End session ${session.id}?\n\nThis will permanently delete the session, participants, and discussion from the database.`
    );
    if (!ok) return;
    setEnding(true);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end_session", sessionId: session.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError((data && typeof data.error === "string" ? data.error : null) ?? "Could not end session.");
        return;
      }
      router.push("/");
    } catch {
      setError("Could not connect.");
    } finally {
      setEnding(false);
    }
  };

  /* ── SETUP SCREEN ── */
  if (step === "setup") {
    return (
      <div style={PAGE_STYLE}>
        <button
          onClick={() => router.push("/")}
          style={{ position: "absolute", top: 24, left: 24, display: "flex", alignItems: "center", gap: 6, background: "none", border: "2px solid #000", borderRadius: 8, padding: "0.35rem 0.85rem", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
        >
          <ArrowLeft size={14} strokeWidth={2.5} /> Back
        </button>

        <div style={{ background: "#fff", border: "3px solid #000", borderRadius: 16, padding: "2.5rem 2rem", width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <Radio size={36} strokeWidth={1.5} color="#f97316" style={{ marginBottom: 16 }} />
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "0.35rem" }}>Host a Session</h1>
          <p style={{ fontSize: "0.85rem", color: "#555", marginBottom: "2rem", lineHeight: 1.5 }}>
            Enter your name and a question. We&apos;ll generate a session ID for you to share.
          </p>

          <div style={{ width: "100%", marginBottom: "1rem", textAlign: "left" }}>
            <label style={LABEL}>Your Name</label>
            <input style={INPUT} placeholder="e.g. Dr. Sharma" value={name}
              onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleStart()} />
          </div>

          <div style={{ width: "100%", marginBottom: "1.5rem", textAlign: "left" }}>
            <label style={LABEL}>Session Question</label>
            <textarea
              style={{ ...INPUT, minHeight: 96, resize: "vertical" }}
              placeholder="e.g. Should AI systems have legal personhood?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <p style={{ marginTop: 8, fontSize: "0.76rem", color: "#888", lineHeight: 1.4 }}>
              This question becomes the session topic.
            </p>
          </div>

          {error && <p style={{ color: "#dc2626", fontSize: "0.82rem", marginBottom: "0.75rem", textAlign: "left", width: "100%" }}>{error}</p>}

          <button onClick={handleStart} disabled={loading}
            style={{ width: "100%", background: "#000", color: "#fff", border: "none", borderRadius: 9, padding: "0.8rem", fontWeight: 800, fontSize: "1rem", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit", opacity: loading ? 0.6 : 1 }}>
            {loading ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Opening…</> : "Open Session →"}
          </button>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ── DASHBOARD ── */
  if (!session) return null;
  const unassigned = session.participants.filter(p => !p.team);

  return (
    <div style={{ ...PAGE_STYLE, justifyContent: "flex-start", alignItems: "stretch", padding: "2rem" }} className="host-dash">
      {/* top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <button onClick={() => router.push("/")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "2px solid #000", borderRadius: 8, padding: "0.35rem 0.85rem", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          <ArrowLeft size={14} strokeWidth={2.5} /> Home
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, border: "2px solid #000", borderRadius: 99, padding: "0.3rem 1rem", background: "#fff" }}>
          <Radio size={13} color="#f97316" />
          <span style={{ fontSize: "0.78rem", color: "#555" }}>Session</span>
          <span style={{ fontWeight: 800, letterSpacing: "0.06em", color: "#f97316" }}>{session.id}</span>
        </div>
        <span style={{ fontSize: "0.8rem", color: "#555" }}>{session.hostName} · Host</span>
        <button
          onClick={endSession}
          disabled={ending}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "#fff",
            border: "2px solid #dc2626",
            borderRadius: 8,
            padding: "0.35rem 0.85rem",
            fontSize: "0.82rem",
            fontWeight: 800,
            cursor: ending ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            color: "#dc2626",
          }}
        >
          {ending ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Ending…</> : "End Session"}
        </button>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, border: "2px solid #000", borderRadius: 8, padding: "0.3rem 0.8rem", background: "#000", color: "#fff", fontSize: "0.8rem", fontWeight: 700 }}>
          {session.participants.length} joined
        </div>
      </div>

      {/* topic */}
      <div style={{ border: "3px solid #000", borderRadius: 12, padding: "0.9rem 1.2rem", background: "#fff", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888" }}>Topic</span>
        <span style={{ fontWeight: 700, fontSize: "0.98rem" }}>{session.topic}</span>
      </div>

      {/* waiting room */}
      <div style={{ border: "3px solid #000", borderRadius: 12, padding: "1.1rem 1.2rem", background: "#fff", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem" }}>
          <Users size={16} />
          <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>Waiting Room</span>
          {unassigned.length > 0 && (
            <span style={{ background: "#f97316", color: "#fff", borderRadius: 99, fontSize: "0.7rem", fontWeight: 800, padding: "0.1rem 0.5rem" }}>
              {unassigned.length}
            </span>
          )}
        </div>
        {unassigned.length === 0 ? (
          <p style={{ color: "#888", fontSize: "0.85rem" }}>
            {session.participants.length === 0 ? "Waiting for participants to join…" : "Everyone has been assigned to a team."}
          </p>
        ) : unassigned.map(p => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.6rem 0", borderBottom: "1px solid #eee", flexWrap: "wrap" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid #000", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.8rem", flexShrink: 0 }}>
              {p.name[0].toUpperCase()}
            </div>
            <span style={{ flex: 1, fontWeight: 600, fontSize: "0.9rem" }}>{p.name}</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {TEAMS.map(t => (
                <button key={String(t.key)} onClick={() => assignTeam(p.id, t.key)}
                  style={{ background: "#000", color: "#fff", border: "2px solid #000", borderRadius: 7, padding: "0.25rem 0.65rem", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  {t.label}
                </button>
              ))}
              <button onClick={() => kick(p.id)}
                style={{ background: "none", color: "#dc2626", border: "2px solid #dc2626", borderRadius: 7, padding: "0.25rem 0.65rem", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* team columns */}
      <div className="teams-grid">
        {TEAMS.map(t => {
          const members = session.participants.filter(p => p.team === t.key);
          const teamKey = t.key as TeamKey;
          const isCollapsed = collapsedTeams[teamKey];
          return (
            <div key={String(t.key)} style={{ border: "3px solid #000", borderTop: `4px solid ${t.accent}`, borderRadius: 12, padding: "1rem", background: "#fff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "0.75rem" }}>
                <div style={{ flex: 1, fontWeight: 700, fontSize: "0.88rem" }}>
                  {t.label} <span style={{ fontWeight: 400, color: "#888" }}>({members.length})</span>
                </div>
                <button
                  type="button"
                  className="team-toggle"
                  aria-expanded={!isCollapsed}
                  onClick={() => toggleTeamMembers(teamKey)}
                  disabled={members.length === 0}
                  style={{ opacity: members.length === 0 ? 0.5 : 1 }}
                >
                  {isCollapsed ? "Show" : "Hide"}
                </button>
              </div>

              <div style={{ display: isCollapsed ? "none" : "block" }}>
                {members.length === 0
                  ? <p style={{ color: "#bbb", fontSize: "0.82rem" }}>Empty</p>
                  : members.map(p => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "0.35rem 0", borderBottom: "1px solid #f0f0f0" }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid #000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.68rem", fontWeight: 800, flexShrink: 0 }}>
                        {p.name[0].toUpperCase()}
                      </div>
                      <span style={{ flex: 1, fontSize: "0.84rem", fontWeight: 500 }}>{p.name}</span>
                      {TEAMS.filter(o => o.key !== t.key).map(o => (
                        <button key={String(o.key)} onClick={() => assignTeam(p.id, o.key)}
                          style={{ background: "none", border: "1.5px solid #000", borderRadius: 5, padding: "0.15rem 0.4rem", fontSize: "0.68rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                          → {o.label.slice(0, 3)}
                        </button>
                      ))}
                      <button onClick={() => assignTeam(p.id, null)}
                        style={{ background: "none", border: "1.5px solid #ccc", borderRadius: 5, padding: "0.15rem 0.4rem", fontSize: "0.68rem", color: "#888", cursor: "pointer", fontFamily: "inherit" }}>
                        ✕
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── DISCUSSION FEED ── */}
      <div style={{ border: "3px solid #000", borderRadius: 14, background: "#fff", marginTop: "1.25rem", overflow: "hidden" }}>
        {/* feed header */}
        <div style={{ borderBottom: "2px solid #000", padding: "0.85rem 1.2rem", display: "flex", alignItems: "center", gap: 10 }}>
          <MessageSquare size={17} strokeWidth={2} />
          <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>Discussion Feed</span>
          <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "#aaa", display: "flex", alignItems: "center", gap: 4 }}>
            <RefreshCw size={11} /> live
          </span>
          {/* legend */}
          <div className="feed-legend">
            {Object.entries(TEAM_META).map(([key, m]) => (
              <span key={key} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.68rem", fontWeight: 700, color: m.accent }}>
                {m.icon} {m.label}
              </span>
            ))}
          </div>
        </div>

        {/* feed body */}
        <div style={{ padding: "1.25rem 1.2rem", maxHeight: "520px", overflowY: "auto" }}>
          <SharedDiscussionFeed events={session.events ?? []} />
        </div>
      </div>

      <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "#aaa", display: "flex", alignItems: "center", gap: 5 }}>
        <RefreshCw size={11} /> Auto-refreshing every 2 s
      </p>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .teams-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .feed-legend {
          display: flex;
          gap: 10px;
          margin-left: 12px;
        }

        .team-toggle {
          display: none;
          background: none;
          border: 1.5px solid #000;
          border-radius: 7px;
          padding: 0.25rem 0.5rem;
          font-size: 0.7rem;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
        }

        @media (max-width: 768px) {
          .host-dash { padding: 1rem !important; }
          .teams-grid { grid-template-columns: 1fr; }
          .feed-legend { display: none; }
          .team-toggle { display: inline-flex; align-items: center; gap: 6px; }
        }

        @media (max-width: 480px) {
          .host-dash { padding: 0.75rem !important; }
        }
      `}</style>
    </div>
  );
}
