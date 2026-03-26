"use client";

import React, { createContext, useContext, useReducer, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type IdeaStatus = "pending" | "backed" | "passed";

export interface Idea {
  id: string;
  text: string;
  author: string;
  timestamp: number;
  funding: number;
  status: IdeaStatus;
}

export interface Review {
  id: string;
  ideaId: string;
  text: string;
  author: string;
  timestamp: number;
  stance: "supportive" | "critical" | "neutral";
}

export interface SessionState {
  question: string;
  ideas: Idea[];
  reviews: Review[];
  totalBudget: number;
  allocatedBudget: number;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: "SET_QUESTION"; question: string }
  | { type: "ADD_IDEA"; idea: Idea }
  | { type: "ADD_REVIEW"; review: Review }
  | { type: "ALLOCATE_FUNDS"; ideaId: string; amount: number }
  | { type: "SET_STATUS"; ideaId: string; status: IdeaStatus }
  | { type: "RESET_SESSION" }
  | { type: "HYDRATE"; state: SessionState };

// ─── Initial state ────────────────────────────────────────────────────────────

const DEFAULT_STATE: SessionState = {
  question: "",
  ideas: [],
  reviews: [],
  totalBudget: 10000,
  allocatedBudget: 0,
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;

    case "SET_QUESTION":
      return { ...state, question: action.question };

    case "ADD_IDEA":
      return { ...state, ideas: [...state.ideas, action.idea] };

    case "ADD_REVIEW":
      return { ...state, reviews: [...state.reviews, action.review] };

    case "ALLOCATE_FUNDS": {
      const delta = action.amount;
      const newAllocated = state.allocatedBudget + delta;
      if (newAllocated > state.totalBudget) return state;
      return {
        ...state,
        allocatedBudget: newAllocated,
        ideas: state.ideas.map((idea) =>
          idea.id === action.ideaId
            ? { ...idea, funding: idea.funding + delta }
            : idea
        ),
      };
    }

    case "SET_STATUS":
      return {
        ...state,
        ideas: state.ideas.map((idea) =>
          idea.id === action.ideaId ? { ...idea, status: action.status } : idea
        ),
      };

    case "RESET_SESSION":
      return DEFAULT_STATE;

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "shastrarth_session";

interface SessionContextValue {
  state: SessionState;
  dispatch: React.Dispatch<Action>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as SessionState;
        dispatch({ type: "HYDRATE", state: saved });
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  return (
    <SessionContext.Provider value={{ state, dispatch }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
