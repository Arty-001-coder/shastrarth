// app/api/session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { store, MOCK_SESSIONS, Participant, DiscussionEvent } from "@/lib/store";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// GET /api/session?id=SHAS-001
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ mockSessions: MOCK_SESSIONS });
  }
  const session = store.get(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  return NextResponse.json(session);
}

// POST /api/session
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  // ── ACTION: host ──────────────────────────────
  if (action === "host") {
    const { name, sessionId } = body as { name: string; sessionId: string };
    const mock = MOCK_SESSIONS.find((m) => m.id === sessionId);
    if (!mock) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
    }
    if (!store.has(sessionId)) {
      store.set(sessionId, {
        id: sessionId,
        topic: mock.topic,
        hostName: name,
        participants: [],
        events: [],
        createdAt: Date.now(),
      });
    }
    return NextResponse.json(store.get(sessionId));
  }

  // ── ACTION: join ──────────────────────────────
  if (action === "join") {
    const { name, sessionId } = body as { name: string; sessionId: string };
    const session = store.get(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: "Session not found. Ask the host to open it first." },
        { status: 404 }
      );
    }
    const existing = session.participants.find(
      (p) => p.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) {
      return NextResponse.json({ participant: existing, session });
    }
    const participant: Participant = {
      id: uid(),
      name,
      team: null,
      joinedAt: Date.now(),
    };
    session.participants.push(participant);
    return NextResponse.json({ participant, session });
  }

  // ── ACTION: assign ────────────────────────────
  if (action === "assign") {
    const { sessionId, participantId, team } = body;
    const session = store.get(sessionId);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    const p = session.participants.find((p) => p.id === participantId);
    if (!p) return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    p.team = team;
    return NextResponse.json(session);
  }

  // ── ACTION: kick ──────────────────────────────
  if (action === "kick") {
    const { sessionId, participantId } = body;
    const session = store.get(sessionId);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    session.participants = session.participants.filter((p) => p.id !== participantId);
    return NextResponse.json(session);
  }

  // ── ACTION: post_event ────────────────────────
  // Body: { action: "post_event", sessionId, participantId, participantName,
  //         team, kind, content, relatedTo?, amount? }
  if (action === "post_event") {
    const {
      sessionId, participantId, participantName,
      team, kind, content, relatedTo, amount,
    } = body as {
      sessionId: string;
      participantId: string;
      participantName: string;
      team: "hypothesis" | "review" | "funding";
      kind: "hypothesis" | "review" | "funding";
      content: string;
      relatedTo?: string;
      amount?: number;
    };
    const session = store.get(sessionId);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const event: DiscussionEvent = {
      id: uid(),
      participantId,
      participantName,
      team,
      kind,
      content,
      relatedTo,
      amount,
      timestamp: Date.now(),
    };
    session.events.push(event);
    return NextResponse.json(session);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
