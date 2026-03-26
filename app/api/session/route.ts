// app/api/session/route.ts
import { NextRequest, NextResponse } from "next/server";
import type { DiscussionEvent, Participant, Session, Team } from "@/lib/store";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type DbSessionRow = {
  id: string; // uuid
  session_code: string;
  topic: string;
  host_name: string;
  created_at: string; // timestamptz
};

type DbParticipantRow = {
  id: string; // uuid
  session_id: string; // uuid
  name: string;
  team: Team;
  joined_at: string; // timestamptz
};

type DbEventRow = {
  id: string; // uuid
  session_id: string; // uuid
  participant_id: string; // uuid
  participant_name: string;
  team: Exclude<Team, null>;
  kind: "hypothesis" | "review" | "funding";
  content: string;
  related_to: string | null;
  amount: number | null;
  created_at: string; // timestamptz
};

function toMs(ts: string) {
  return new Date(ts).getTime();
}

function toApiParticipant(p: DbParticipantRow): Participant {
  return {
    id: p.id,
    name: p.name,
    team: p.team,
    joinedAt: toMs(p.joined_at),
  };
}

function toApiEvent(e: DbEventRow): DiscussionEvent {
  return {
    id: e.id,
    participantId: e.participant_id,
    participantName: e.participant_name,
    team: e.team,
    kind: e.kind,
    content: e.content,
    relatedTo: e.related_to ?? undefined,
    amount: e.amount ?? undefined,
    timestamp: toMs(e.created_at),
  };
}

async function fetchSessionByCode(sessionCode: string): Promise<Session | null> {
  const code = sessionCode.trim().toUpperCase();

  const { data, error } = await supabaseAdmin.rpc("get_session_bundle", { p_session_code: code });
  if (error || !data) return null;

  // Expected shape from RPC (see SQL): { session: {...}, participants: [...], events: [...] }
  const s = (data as { session: DbSessionRow; participants: DbParticipantRow[]; events: DbEventRow[] }).session;
  const participants = (data as { participants: DbParticipantRow[] }).participants ?? [];
  const events = (data as { events: DbEventRow[] }).events ?? [];

  if (!s?.session_code) return null;
  return {
    id: s.session_code,
    topic: s.topic,
    hostName: s.host_name,
    participants: participants.map(toApiParticipant),
    events: events.map(toApiEvent),
    createdAt: toMs(s.created_at),
  };
}

// GET /api/session?id=SHAS-001
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    const { data, error } = await supabaseAdmin
      .from("sessions")
      .select("session_code, topic, created_at")
      .order("created_at", { ascending: false })
      .limit(25)
      .returns<{ session_code: string; topic: string; created_at: string }[]>();

    if (error) return NextResponse.json({ sessions: [] });
    return NextResponse.json({
      sessions: (data ?? []).map((s) => ({
        id: s.session_code,
        topic: s.topic,
        createdAt: toMs(s.created_at),
      })),
    });
  }
  const session = await fetchSessionByCode(id);
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
    const { name, topic } = body as { name: string; topic: string };
    if (!name?.trim()) return NextResponse.json({ error: "Missing host name" }, { status: 400 });
    if (!topic?.trim()) return NextResponse.json({ error: "Missing session question" }, { status: 400 });

    // Insert new session; session_code is auto-generated in Postgres (SHAS-001, SHAS-002, ...)
    const { data: s, error: insErr } = await supabaseAdmin
      .from("sessions")
      .insert({ topic: topic.trim(), host_name: name.trim() })
      .select("id, session_code, topic, host_name, created_at")
      .single<DbSessionRow>();

    if (insErr || !s) {
      return NextResponse.json({ error: "Could not create session." }, { status: 500 });
    }

    const session = await fetchSessionByCode(s.session_code);
    return NextResponse.json(session);
  }

  // ── ACTION: join ──────────────────────────────
  if (action === "join") {
    const { name, sessionId } = body as { name: string; sessionId: string };
    const code = sessionId.trim().toUpperCase();

    const { data: s, error: sErr } = await supabaseAdmin
      .from("sessions")
      .select("id, session_code, topic, host_name, created_at")
      .eq("session_code", code)
      .maybeSingle<DbSessionRow>();

    if (sErr || !s) {
      return NextResponse.json(
        { error: "Session not found. Ask the host to open it first." },
        { status: 404 }
      );
    }

    // Find existing participant in this session (case-insensitive uniqueness enforced by DB index)
    const { data: existing, error: pFindErr } = await supabaseAdmin
      .from("participants")
      .select("id, session_id, name, team, joined_at")
      .eq("session_id", s.id)
      .ilike("name", name.trim())
      .maybeSingle<DbParticipantRow>();

    if (pFindErr) {
      return NextResponse.json({ error: "Could not join session." }, { status: 500 });
    }

    let participantRow: DbParticipantRow | null = existing ?? null;

    if (!participantRow) {
      const { data: created, error: pErr } = await supabaseAdmin
        .from("participants")
        .insert({ session_id: s.id, name: name.trim(), team: null })
        .select("id, session_id, name, team, joined_at")
        .single<DbParticipantRow>();
      if (pErr || !created) {
        return NextResponse.json({ error: "Could not join session." }, { status: 500 });
      }
      participantRow = created;
    }

    const session = await fetchSessionByCode(code);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    return NextResponse.json({ participant: toApiParticipant(participantRow), session });
  }

  // ── ACTION: assign ────────────────────────────
  if (action === "assign") {
    const { sessionId, participantId, team } = body;
    const code = String(sessionId ?? "").trim().toUpperCase();
    const session = await fetchSessionByCode(code);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    // Resolve session uuid
    const { data: s, error: sErr } = await supabaseAdmin
      .from("sessions")
      .select("id")
      .eq("session_code", code)
      .maybeSingle<{ id: string }>();
    if (sErr || !s) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const { error: updErr } = await supabaseAdmin
      .from("participants")
      .update({ team })
      .eq("id", participantId)
      .eq("session_id", s.id);

    if (updErr) return NextResponse.json({ error: "Could not assign team" }, { status: 500 });
    const fresh = await fetchSessionByCode(code);
    return NextResponse.json(fresh);
  }

  // ── ACTION: kick ──────────────────────────────
  if (action === "kick") {
    const { sessionId, participantId } = body;
    const code = String(sessionId ?? "").trim().toUpperCase();

    const { data: s, error: sErr } = await supabaseAdmin
      .from("sessions")
      .select("id")
      .eq("session_code", code)
      .maybeSingle<{ id: string }>();
    if (sErr || !s) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const { error: delErr } = await supabaseAdmin
      .from("participants")
      .delete()
      .eq("id", participantId)
      .eq("session_id", s.id);

    if (delErr) return NextResponse.json({ error: "Could not remove participant" }, { status: 500 });
    const fresh = await fetchSessionByCode(code);
    return NextResponse.json(fresh);
  }

  // ── ACTION: end_session ───────────────────────
  // Body: { action: "end_session", sessionId }
  // Deletes the session and all related data (via FK cascade).
  if (action === "end_session") {
    const { sessionId } = body as { sessionId: string };
    const code = String(sessionId ?? "").trim().toUpperCase();
    if (!code) return NextResponse.json({ error: "Missing session ID" }, { status: 400 });

    const { error: delErr } = await supabaseAdmin
      .from("sessions")
      .delete()
      .eq("session_code", code);

    if (delErr) return NextResponse.json({ error: "Could not end session" }, { status: 500 });
    return NextResponse.json({ ok: true });
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

    const code = sessionId.trim().toUpperCase();
    const { data: s, error: sErr } = await supabaseAdmin
      .from("sessions")
      .select("id")
      .eq("session_code", code)
      .maybeSingle<{ id: string }>();
    if (sErr || !s) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const { error: insErr } = await supabaseAdmin
      .from("discussion_events")
      .insert({
        session_id: s.id,
        participant_id: participantId,
        participant_name: participantName,
        team,
        kind,
        content,
        related_to: relatedTo ?? null,
        amount: typeof amount === "number" ? amount : null,
      });

    if (insErr) return NextResponse.json({ error: "Could not post event" }, { status: 500 });
    const fresh = await fetchSessionByCode(code);
    return NextResponse.json(fresh);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
