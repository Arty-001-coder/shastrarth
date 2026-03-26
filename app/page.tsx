"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Radio, Users } from "lucide-react";

function useClock() {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function Home() {
  const router = useRouter();
  const now = useClock();

  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });

  return (
    <div style={styles.page}>
      {/* ── Title block ── */}
      <div style={styles.header}>
        <h1 style={styles.title}>Shastrarth</h1>
        <p style={styles.subtitle}>Peer Discussion Platform</p>
        {now && (
          <div style={styles.clock}>
            <span style={styles.date}>{dateStr}</span>
            <span style={styles.time}>{timeStr}</span>
          </div>
        )}
      </div>

      {/* ── Two big option boxes ── */}
      <div className="landing-grid">
        {/* Host — black box */}
        <button style={styles.boxBlack} onClick={() => router.push("/host")}>
          <Radio size={40} strokeWidth={1.5} color="#fff" style={{ marginBottom: 16 }} />
          <span style={styles.boxTitle}>Host a Session</span>
          <span style={styles.boxSub}>Open a session, invite participants, and assign teams.</span>
        </button>

        {/* Join — white box */}
        <button style={styles.boxWhite} onClick={() => router.push("/join")}>
          <Users size={40} strokeWidth={1.5} color="#000" style={{ marginBottom: 16 }} />
          <span style={{ ...styles.boxTitle, color: "#000" }}>Join a Session</span>
          <span style={{ ...styles.boxSub, color: "#444" }}>Enter a session ID and get placed into a team by the host.</span>
        </button>
      </div>
      <style>{`
        .landing-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(260px, 340px));
          gap: 1.5rem;
        }
        @media (max-width: 640px) {
          .landing-grid {
            grid-template-columns: 1fr;
            width: 100%;
            max-width: 380px;
          }
        }
      `}</style>
    </div>
  );
}

/* ── Styles ── */
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#fff",
    /* dotted grid: black dots every 28px, orange accent dots every 140px */
    backgroundImage: [
      "radial-gradient(circle, #f97316 1.5px, transparent 1.5px)",
      "radial-gradient(circle, #000 1px, transparent 1px)",
    ].join(", "),
    backgroundSize: "140px 140px, 28px 28px",
    backgroundPosition: "14px 14px, 0 0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "3rem 1.5rem",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },

  header: {
    textAlign: "center",
    marginBottom: "3.5rem",
  },
  title: {
    fontSize: "clamp(2.5rem, 6vw, 4rem)",
    fontWeight: 800,
    letterSpacing: "-0.03em",
    color: "#000",
    margin: 0,
    lineHeight: 1.1,
  },
  subtitle: {
    fontSize: "0.95rem",
    color: "#555",
    marginTop: "0.4rem",
    marginBottom: "1.2rem",
  },
  clock: {
    display: "inline-flex",
    gap: "1.25rem",
    alignItems: "center",
    background: "#000",
    color: "#fff",
    padding: "0.45rem 1.1rem",
    borderRadius: "99px",
    fontSize: "0.82rem",
    fontVariantNumeric: "tabular-nums",
  },
  date: { color: "#aaa" },
  time: { color: "#f97316", fontWeight: 700, letterSpacing: "0.04em" },

  grid: {},

  /* Black box */
  boxBlack: {
    background: "#000",
    color: "#fff",
    border: "none",
    borderRadius: "14px",
    padding: "2.5rem 2rem",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    transition: "transform 0.15s, box-shadow 0.15s",
    boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
  } as React.CSSProperties,

  /* White / outlined box */
  boxWhite: {
    background: "#fff",
    color: "#000",
    border: "2px solid #000",
    borderRadius: "14px",
    padding: "2.5rem 2rem",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    transition: "transform 0.15s, box-shadow 0.15s",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  } as React.CSSProperties,

  boxTitle: {
    fontSize: "1.3rem",
    fontWeight: 700,
    marginBottom: "0.6rem",
    display: "block",
  },
  boxSub: {
    fontSize: "0.85rem",
    color: "#aaa",
    lineHeight: 1.5,
    display: "block",
  },
};
