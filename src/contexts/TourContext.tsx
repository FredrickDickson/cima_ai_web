import { createContext, useContext, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { TOUR_STEPS, type TourStep } from "../components/onboarding/tourSteps";

interface TourContextValue {
  active: boolean;
  stepIndex: number;
  steps: TourStep[];
  start: () => void;
  next: () => void;
  back: () => void;
  /** Marks the tour dismissed (used by both "finished" and "skipped") and persists it. */
  finish: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const { user, refreshProfile } = useAuth();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  function start() {
    setStepIndex(0);
    setActive(true);
  }

  function next() {
    if (stepIndex + 1 >= TOUR_STEPS.length) {
      finish();
    } else {
      setStepIndex(stepIndex + 1);
    }
  }

  function back() {
    setStepIndex(Math.max(0, stepIndex - 1));
  }

  function finish() {
    setActive(false);
    if (user) {
      (supabase.from("profiles") as any)
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq("id", user.id)
        .then(() => refreshProfile());
    }
  }

  return (
    <TourContext.Provider value={{ active, stepIndex, steps: TOUR_STEPS, start, next, back, finish }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within a TourProvider");
  return ctx;
}
