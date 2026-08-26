"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Explains the pipeline in one loop: a candidate card moves Screening →
 * Interviewing → Offer; meanwhile a second card goes quiet and gets the
 * amber stale flag. The board that watches your desk for you.
 */

const COLS = [
  { label: "Screening", rail: "bg-stage-screening" },
  { label: "Interviewing", rail: "bg-stage-interviewing" },
  { label: "Offer", rail: "bg-stage-offer" },
] as const;

const PHASE_MS = 2200;

export function PipelineFlow() {
  const [phase, setPhase] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setReduced(true);
      setPhase(1);
      return;
    }
    const t = setInterval(() => setPhase((p) => (p + 1) % 4), PHASE_MS);
    return () => clearInterval(t);
  }, []);

  // moving card position per phase: 0,1 → col 0..2 ; 3 resets
  const movingCol = phase === 3 ? 0 : phase;
  const staleVisible = phase >= 2 || reduced;

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-xs">
      <div className="grid grid-cols-3 gap-3">
        {COLS.map((col, colIndex) => (
          <div key={col.label} className="min-w-0">
            <span className={cn("block h-1 w-full rounded-full", col.rail)} />
            <p className="text-muted-foreground mt-2 mb-2 truncate text-[10px] font-semibold tracking-wider uppercase">
              {col.label}
            </p>
            <div className="flex min-h-[104px] flex-col gap-2">
              {/* the moving candidate */}
              {movingCol === colIndex ? (
                <div
                  className={cn(
                    "rounded-lg border bg-card p-2.5 shadow-sm transition-all duration-500",
                    colIndex === 2 && "border-stage-offer/50",
                  )}
                >
                  <p className="truncate text-xs font-semibold">
                    Priya Raghavan
                  </p>
                  <p className="text-muted-foreground truncate text-[10px]">
                    Senior React · fintech
                  </p>
                  {colIndex === 2 ? (
                    <span className="text-stage-offer text-[9px] font-bold">
                      offer out
                    </span>
                  ) : null}
                </div>
              ) : null}
              {/* the drifting candidate */}
              {colIndex === 0 ? (
                <div className="rounded-lg border bg-card p-2.5 shadow-sm">
                  <p className="truncate text-xs font-semibold">Marcus Bell</p>
                  <p className="text-muted-foreground truncate text-[10px]">
                    Contract React
                  </p>
                  <span
                    className={cn(
                      "text-stage-offer inline-block text-[9px] font-bold transition-opacity duration-500",
                      staleVisible ? "animate-pulse opacity-100" : "opacity-0",
                    )}
                  >
                    stale 14d - nudge?
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
