"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MOCK_SESSIONS } from "@/lib/store";
import { ArrowLeft, Users, ChevronDown, Loader2, FlaskConical, ScanSearch, Coins } from "lucide-react";

type Step = "form" | "waiting";

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

const TEAM_INFO: Record<string, { label: string; icon: React.ReactNode; description: string; accent: string }> = {
  hypothesis: { label: "Hypothesis Team", icon: <FlaskConical size={46} strokeWidth={1.6} color="#7c3aed" />, description: "Propose bold theories in response to the session question.", accent: "#7c3aed" },
  review:     { label: "Review Team",     icon: <ScanSearch size={46} strokeWidth={1.6} color="#0891b2" />, description: "Critically analyse the hypotheses — supportive or critical.", accent: "#0891b2" },
  funding:    { label: "Funding Team",    icon: <Coins size={46} strokeWidth={1.6} color="#f97316" />, description: "Hold a budget and allocate funds to ideas you believe in.", accent: "#f97316" },
};

const STORAGE_KEY = "shastrarth_participant_v1";

function teamToRoute(team: string | null) {
  if (!team) return null;
  if (team === "hypothesis") return "research";
  if (team === "review") return "review";
  if (team === "funding") return "funding";
  return null;
}

export default function JoinPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [myTeam, setMyTeam] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string>("");
  const [sessionTopic, setSessionTopic] = useState("");
  const [showIds, setShowIds] = useState(false);
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    if (step !== "waiting") return;
    if (!myTeam || !participantId) return;
    const route = teamToRoute(myTeam);
    if (!route) return;
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    router.push(`/participants/${route}?sessionId=${encodeURIComponent(sessionId.trim().toUpperCase())}`);
  }, [step, myTeam, participantId, router, sessionId]);

  const handleJoin = async () => {
    if (!name.trim())      { setError("Please enter your name."); return; }
    if (!sessionId.trim()) { setError("Please enter a session ID."); return; }
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", name: name.trim(), sessionId: sessionId.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Could not join session."); return; }
      setSessionTopic(data.session.topic);
      setMyTeam(data.participant.team);
      setStep("waiting");

      const pid = data.participant.id as string;
      const sid = (data.session.id as string).trim().toUpperCase();

      setParticipantId(pid);
      // Store identity locally so the participants page can post to /api/session.
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ sessionId: sid, participantId: pid, participantName: name.trim() })
        );
      } catch {
        /* ignore */
      }

      const interval = setInterval(async () => {
        try {
          const r = await fetch(`/api/session?id=${sid}`);
          if (r.ok) {
            const s = await r.json();
            const me = s.participants.find((p: { id: string; team: string | null }) => p.id === pid);
            if (me) setMyTeam(me.team);
          }
        } catch { /* ignore */ }
      }, 2000);
      setTimeout(() => clearInterval(interval), 60 * 60 * 1000);
    } catch { setError("Could not connect to the server."); }
    finally { setLoading(false); }
  };

  /* ── WAITING ROOM ── */
  if (step === "waiting") {
    const t = myTeam ? TEAM_INFO[myTeam] : null;
    const route = teamToRoute(myTeam);
    return (
      <div style={PAGE_STYLE}>
        <div style={{ background: "#fff", border: "3px solid #000", borderRadius: 16, padding: "2.5rem 2rem", width: "100%", maxWidth: 420, textAlign: "center" }}>
          {t ? (
            <>
              <div style={{ marginBottom: "0.75rem" }}>{t.icon}</div>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: "0.4rem", letterSpacing: "-0.02em" }}>{t.label}</h1>
              <p style={{ color: "#555", fontSize: "0.88rem", lineHeight: 1.5, marginBottom: "1.25rem" }}>{t.description}</p>
              <div style={{ borderTop: "2px solid #eee", paddingTop: "1rem", fontSize: "0.8rem", color: "#888" }}>
                <strong style={{ color: "#000" }}>{sessionId.toUpperCase()}</strong> · {sessionTopic}
              </div>
              {route && (
                <button
                  onClick={() => router.push(`/participants/${route}?sessionId=${encodeURIComponent(sessionId.trim().toUpperCase())}`)}
                  style={{ width: "100%", marginTop: "1.25rem", background: "#000", color: "#fff", border: "none", borderRadius: 9, padding: "0.8rem", fontWeight: 900, fontSize: "0.95rem", cursor: "pointer", fontFamily: "inherit" }}
                >
                  Go to your {route[0].toUpperCase() + route.slice(1)} board →
                </button>
              )}
            </>
          ) : (
            <>
              <Users size={38} strokeWidth={1.5} style={{ marginBottom: 16 }} />
              <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: "0.5rem", letterSpacing: "-0.02em" }}>You&apos;re in the queue</h1>
              <p style={{ color: "#555", fontSize: "0.88rem", lineHeight: 1.5 }}>
                The host can see you in the waiting room.<br />Sit tight while they assign your team.
              </p>
              <p style={{ marginTop: "1.5rem", fontSize: "0.75rem", color: "#aaa" }}>Auto-refreshing every 2 s</p>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ── JOIN FORM ── */
  return (
    <div style={PAGE_STYLE}>
      <button
        onClick={() => router.push("/")}
        style={{ position: "absolute", top: 24, left: 24, display: "flex", alignItems: "center", gap: 6, background: "none", border: "2px solid #000", borderRadius: 8, padding: "0.35rem 0.85rem", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
      >
        <ArrowLeft size={14} strokeWidth={2.5} /> Back
      </button>

      <div style={{ background: "#fff", border: "3px solid #000", borderRadius: 16, padding: "2.5rem 2rem", width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <Users size={36} strokeWidth={1.5} style={{ marginBottom: 16 }} />
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "0.35rem" }}>Join a Session</h1>
        <p style={{ fontSize: "0.85rem", color: "#555", marginBottom: "2rem", lineHeight: 1.5 }}>
          Enter your name and the session ID given by the host.
        </p>

        <div style={{ width: "100%", marginBottom: "1rem", textAlign: "left" }}>
          <label style={LABEL}>Your Name</label>
          <input style={INPUT} placeholder="e.g. Arjun"
            value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleJoin()} />
        </div>

        <div style={{ width: "100%", marginBottom: "0.5rem", textAlign: "left" }}>
          <label style={LABEL}>Session ID</label>
          <input style={{ ...INPUT, textTransform: "uppercase", letterSpacing: "0.06em" }}
            placeholder="e.g. SHAS-003"
            value={sessionId} onChange={e => setSessionId(e.target.value.toUpperCase())} onKeyDown={e => e.key === "Enter" && handleJoin()} />
        </div>

        {/* toggle mock IDs */}
        <button
          onClick={() => setShowIds(v => !v)}
          style={{ alignSelf: "flex-start", background: "none", border: "none", fontSize: "0.78rem", color: "#888", cursor: "pointer", fontFamily: "inherit", padding: "0.25rem 0", display: "flex", alignItems: "center", gap: 4, marginBottom: "1rem" }}
        >
          <ChevronDown size={13} style={{ transform: showIds ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
          {showIds ? "Hide" : "Show"} available session IDs
        </button>

        {showIds && (
          <div style={{ width: "100%", border: "2px solid #000", borderRadius: 10, padding: "0.85rem", marginBottom: "1rem", textAlign: "left" }}>
            <p style={{ fontSize: "0.78rem", color: "#666", marginBottom: "0.6rem" }}>
              Host must open the session first. Click a row to fill.
            </p>
            {MOCK_SESSIONS.map(m => (
              <div key={m.id}
                onClick={() => setSessionId(m.id)}
                style={{ display: "flex", gap: 10, alignItems: "center", padding: "0.4rem 0", borderBottom: "1px solid #eee", cursor: "pointer" }}>
                <span style={{ fontWeight: 800, fontFamily: "monospace", fontSize: "0.8rem", background: "#000", color: "#f97316", padding: "0.1rem 0.45rem", borderRadius: 5 }}>{m.id}</span>
                <span style={{ fontSize: "0.82rem", color: "#333" }}>{m.topic}</span>
              </div>
            ))}
          </div>
        )}

        {error && <p style={{ color: "#dc2626", fontSize: "0.82rem", marginBottom: "0.75rem", textAlign: "left", width: "100%" }}>{error}</p>}

        <button
          onClick={handleJoin} disabled={loading}
          style={{ width: "100%", background: "#000", color: "#fff", border: "none", borderRadius: 9, padding: "0.8rem", fontWeight: 800, fontSize: "1rem", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit", opacity: loading ? 0.6 : 1 }}
        >
          {loading ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Joining…</> : "Join Session →"}
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
