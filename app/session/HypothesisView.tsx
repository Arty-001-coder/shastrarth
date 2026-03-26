"use client";

import { useState } from "react";
import { useSession, Idea, Review, uid, formatTime } from "./SessionContext";

interface Props {
  ideas: Idea[];
  reviews: Review[];
}

export default function HypothesisView({ ideas, reviews }: Props) {
  const { dispatch } = useSession();
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");

  const handleSubmit = () => {
    if (!text.trim()) return;
    const now = Date.now();
    const idea: Idea = {
      id: uid(),
      text: text.trim(),
      author: author.trim() || "Anonymous",
      timestamp: now,
      funding: 0,
      status: "pending",
    };
    dispatch({ type: "ADD_IDEA", idea });
    setText("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Submit form */}
      <div
        className="card card-glow-violet fade-up"
        style={{ padding: "1.5rem", borderTop: "1px solid rgba(167,139,250,0.35)" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.35rem" }}>
          <span style={{ fontSize: "1.1rem" }}>💡</span>
          <span
            style={{
              fontFamily: "Syne, sans-serif",
              fontWeight: 800,
              fontSize: "1.05rem",
              color: "#fff",
            }}
          >
            Submit a Hypothesis
          </span>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.83rem", marginBottom: "1rem", lineHeight: 1.6 }}>
          Propose a theory or idea in response to the session question.
        </p>
        <textarea
          className="textarea"
          placeholder="State your hypothesis or theory…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
        />
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            marginTop: "0.75rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            className="input"
            style={{ flex: 1, minWidth: 160 }}
            placeholder="Your name (optional)"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
          <button className="btn btn-violet" onClick={handleSubmit} disabled={!text.trim()}>
            Submit →
          </button>
        </div>
      </div>

      {/* Ideas list */}
      <div>
        <div
          style={{
            fontWeight: 700,
            fontSize: "0.7rem",
            color: "var(--text-faint)",
            marginBottom: "0.85rem",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
          }}
        >
          {ideas.length === 0 ? "No hypotheses yet" : `${ideas.length} Hypothesis${ideas.length !== 1 ? "es" : ""}`}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {ideas.map((idea) => {
            const cnt = reviews.filter((r) => r.ideaId === idea.id).length;
            return <IdeaCard key={idea.id} idea={idea} reviewCount={cnt} />;
          })}
        </div>
      </div>
    </div>
  );
}

function IdeaCard({ idea, reviewCount }: { idea: Idea; reviewCount: number }) {
  const accentLeft =
    idea.status === "backed"
      ? "3px solid var(--green)"
      : idea.status === "passed"
      ? "3px solid var(--red)"
      : "3px solid rgba(167,139,250,0.5)";

  return (
    <div
      className="card fade-up"
      style={{
        padding: "1.1rem 1.25rem",
        borderLeft: accentLeft,
        opacity: idea.status === "passed" ? 0.5 : 1,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "0.6rem",
          marginBottom: "0.5rem",
        }}
      >
        <p style={{ fontWeight: 500, lineHeight: 1.6, flex: 1, fontSize: "0.9rem" }}>
          {idea.text}
        </p>
        <span className={`badge badge-${idea.status}`}>
          {idea.status === "backed" ? "✅ Backed" : idea.status === "passed" ? "✗ Passed" : "Pending"}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          gap: "0.85rem",
          fontSize: "0.75rem",
          color: "var(--text-faint)",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <span>by <span style={{ color: "var(--text-muted)" }}>{idea.author}</span></span>
        <span>{formatTime(idea.timestamp)}</span>
        {reviewCount > 0 && (
          <span style={{ color: "var(--cyan)" }}>
            💬 {reviewCount} review{reviewCount !== 1 ? "s" : ""}
          </span>
        )}
        {idea.funding > 0 && (
          <span style={{ color: "var(--green)", fontWeight: 600 }}>
            ₹{idea.funding.toLocaleString()} funded
          </span>
        )}
      </div>
    </div>
  );
}
