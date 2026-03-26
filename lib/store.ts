// lib/store.ts
// In-memory session store — global singleton so it survives Next.js HMR

export type Team = "hypothesis" | "review" | "funding" | null;

export interface Participant {
  id: string;
  name: string;
  team: Team;
  joinedAt: number;
}

export type EventKind = "hypothesis" | "review" | "funding";

export interface DiscussionEvent {
  id: string;
  participantId: string;
  participantName: string;
  team: NonNullable<Team>;
  kind: EventKind;
  content: string;
  relatedTo?: string;   // hypothesis event-id this review/funding refers to
  amount?: number;      // funding amount (₹)
  timestamp: number;
}

export interface Session {
  id: string;
  topic: string;
  hostName: string;
  participants: Participant[];
  events: DiscussionEvent[];
  createdAt: number;
}

// Mock session roster — valid IDs testers can use
export const MOCK_SESSIONS: { id: string; topic: string }[] = [
  { id: "SHAS-001", topic: "Should AI systems have legal personhood?" },
  { id: "SHAS-002", topic: "Is universal basic income viable at scale?" },
  { id: "SHAS-003", topic: "Can democracy survive the attention economy?" },
  { id: "SHAS-004", topic: "Should consciousness determine rights?" },
  { id: "SHAS-005", topic: "Is open-source AI a public good or a threat?" },
];

declare global {
  var __shastrarth_store: Map<string, Session> | undefined;
}

export const store: Map<string, Session> =
  global.__shastrarth_store ??
  (global.__shastrarth_store = new Map());
