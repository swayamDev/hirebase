"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, X } from "lucide-react";
import { STAGES, STAGE_LABELS, type Stage } from "@/sanity/schemas/stages";
import { STAGE_BG, StagePill } from "@/components/stage-rail";
import { InitialsChip } from "@/components/initials-chip";
import { askHirebase } from "@/components/today/ask-hirebase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PeekInterview = {
  roundName: string;
  outcome: "pending" | "pass" | "fail";
  date: string;
  feedback: string | null;
};

export type PeekData = {
  candidateId: string;
  name: string;
  stage: Stage;
  daysInStage: number;
  role: string;
  client: string;
  daysInPipeline: number;
  source: string | null;
  blockedTitle: string | null;
  blockedBody: string | null;
  interviews: PeekInterview[];
};

export type QueueItem = {
  id: string;
  kind: "application" | "job" | "ai";
  name: string;
  sub: string;
  stage: Stage | null;
  reason: string;
  actionLabel: string;
  href: string;
  ageLabel: string;
  ageTone: "danger" | "muted";
  ask?: string;
  peek?: PeekData | null;
};

export type QueueGroup = {
  key: string;
  label: string;
  hint: string | null;
  dotClass: string;
  count: number;
  muted: boolean;
  items: QueueItem[];
};

const OUTCOME_PILL: Record<PeekInterview["outcome"], string> = {
  pending: "bg-muted text-muted-foreground",
  pass: "bg-green-500/10 text-green-700",
  fail: "bg-rose-500/10 text-rose-700",
};

/** The five forward stages - the peek's progress rail (rejected shows as a pill only). */
const RAIL_STAGES: readonly Stage[] = STAGES.filter(
  (stage) => stage !== "rejected",
);

function Peek({
  peek,
  aiAllowed,
  onClose,
}: {
  peek: PeekData;
  aiAllowed: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const railIndex = RAIL_STAGES.indexOf(peek.stage);

  return (
    <div
      role="dialog"
      aria-label={peek.name}
      className="bg-card fixed inset-y-0 right-0 z-50 flex w-[min(480px,100vw)] flex-col overflow-y-auto border-l shadow-[-24px_0_48px_-24px_rgba(20,16,32,0.18)]"
    >
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2.5 border-b px-4 py-3">
        <InitialsChip name={peek.name} size="sm" />
        <Link
          href={`/dashboard/candidates/${peek.candidateId}`}
          className="text-sm font-semibold hover:underline"
        >
          {peek.name}
        </Link>
        <StagePill stage={peek.stage} />
        <div className="flex-1" />
        <Link
          href={`/dashboard/candidates/${peek.candidateId}`}
          className="text-muted-foreground hover:text-foreground text-xs transition-colors"
        >
          Open full record
        </Link>
        <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      {/* Why it's in the queue */}
      {peek.blockedTitle ? (
        <div
          className={cn(
            "border-b px-4 py-3.5",
            peek.blockedTitle.startsWith("Blocked")
              ? "bg-rose-500/[0.04]"
              : "bg-muted/40",
          )}
        >
          <p
            className={cn(
              "text-[12.5px] font-semibold",
              peek.blockedTitle.startsWith("Blocked")
                ? "text-rose-700"
                : "text-foreground",
            )}
          >
            {peek.blockedTitle}
          </p>
          {peek.blockedBody ? (
            <p className="text-muted-foreground mt-1 text-[12.5px] leading-relaxed">
              {peek.blockedBody}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Where they are */}
      <div className="border-b px-4 py-4">
        <p className="text-muted-foreground font-mono text-[10px] tracking-[0.14em] uppercase">
          Where they are
        </p>
        {peek.stage === "rejected" ? (
          <p className="text-muted-foreground mt-3 text-[12.5px]">
            No longer in this pipeline.
          </p>
        ) : (
          <div className="mt-3 flex items-end gap-1.5">
            {RAIL_STAGES.map((stage, i) => {
              const state =
                i === railIndex ? "current" : i < railIndex ? "past" : "future";
              return (
                <span
                  key={stage}
                  className={cn(
                    "flex min-w-0 flex-col gap-1.5",
                    state === "current" ? "flex-[1.6]" : "flex-1",
                  )}
                >
                  <span
                    className={cn(
                      "h-1 rounded-full",
                      state === "future" ? "bg-border" : STAGE_BG[stage],
                      state === "past" && "opacity-35",
                    )}
                  />
                  <span
                    className={cn(
                      "truncate text-[11px]",
                      state === "current"
                        ? "text-foreground font-medium"
                        : "text-muted-foreground",
                    )}
                  >
                    {STAGE_LABELS[stage]}
                    {state === "current" ? (
                      <span className="text-muted-foreground font-mono">
                        {" "}
                        · {peek.daysInStage}d
                      </span>
                    ) : null}
                  </span>
                </span>
              );
            })}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
          {[
            { label: "Role", value: peek.role },
            { label: "Client", value: peek.client },
            { label: "In pipeline", value: `${peek.daysInPipeline} days`, mono: true },
            { label: "Source", value: peek.source ?? "-" },
          ].map((fact) => (
            <div key={fact.label}>
              <p className="text-muted-foreground text-[11px]">{fact.label}</p>
              <p
                className={cn(
                  "mt-0.5 text-[12.5px] font-medium",
                  fact.mono && "font-mono font-normal tabular-nums",
                )}
              >
                {fact.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Interview history */}
      <div className="border-b px-4 py-4">
        <p className="text-muted-foreground font-mono text-[10px] tracking-[0.14em] uppercase">
          Interviews
        </p>
        {peek.interviews.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-[12.5px]">
            No interviews logged yet.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {peek.interviews.map((interview, i) => (
              <div key={i}>
                <div className="flex items-center gap-2">
                  <span className="text-[12.5px] font-semibold">
                    {interview.roundName}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md px-1.5 py-px text-[11px] font-medium capitalize",
                      OUTCOME_PILL[interview.outcome],
                    )}
                  >
                    {interview.outcome}
                  </span>
                  <div className="flex-1" />
                  <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
                    {interview.date}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">
                  {interview.feedback ?? "No feedback recorded."}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI: ask about this person in one click */}
      <div className="px-4 py-4">
        <div className="border-ai/25 bg-ai-soft/40 rounded-lg border p-3">
          <p className="text-ai flex items-center gap-1.5 text-xs font-semibold">
            <Sparkles className="size-3" />
            Ask Hirebase
          </p>
          {aiAllowed ? (
            <div className="mt-2 flex flex-col items-start gap-1.5">
              <button
                type="button"
                onClick={() => askHirebase(`Summarize ${peek.name}'s interview feedback`)}
                className="text-ai/90 hover:text-ai cursor-pointer font-mono text-[11px]"
              >
                Summarize {peek.name}&apos;s interview feedback
              </button>
              <button
                type="button"
                onClick={() => askHirebase(`Which open roles fit ${peek.name} best?`)}
                className="text-ai/90 hover:text-ai cursor-pointer font-mono text-[11px]"
              >
                Which open roles fit {peek.name} best?
              </button>
            </div>
          ) : (
            <p className="text-muted-foreground mt-2 text-xs">
              The AI Talent Agent is on Pro -{" "}
              <Link href="/dashboard/billing" className="text-ai underline underline-offset-2">
                see plans
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The Today worklist (design A): grouped, triaged rows - plus the B2 "peek"
 * panel that slides over the app when a row is clicked.
 */
export function TodayQueue({
  groups,
  aiAllowed,
}: {
  groups: QueueGroup[];
  aiAllowed: boolean;
}) {
  const [peek, setPeek] = useState<PeekData | null>(null);

  return (
    <div>
      {groups.map((group) => (
        <div key={group.key}>
          <div className="bg-muted/50 flex h-8 items-center gap-2 border-y px-3">
            <span className={cn("size-1.5 rounded-full", group.dotClass)} />
            <span className="text-[11.5px] font-semibold tracking-[0.02em]">
              {group.label}
            </span>
            <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
              {group.count}
            </span>
            <div className="flex-1" />
            {group.hint ? (
              <span className="text-muted-foreground text-[11.5px]">
                {group.hint}
              </span>
            ) : null}
          </div>

          {group.items.map((item) => {
            const isAi = item.kind === "ai";
            return (
              <div
                key={item.id}
                onClick={() => {
                  if (item.peek) setPeek(item.peek);
                }}
                className={cn(
                  "flex items-center gap-3 border-b px-3 transition-colors",
                  group.muted ? "h-11 opacity-75" : "h-[52px]",
                  item.peek && "hover:bg-muted/40 cursor-pointer",
                  isAi && "bg-ai-soft/30",
                )}
              >
                {isAi ? (
                  <span className="bg-ai-soft text-ai flex size-6 shrink-0 items-center justify-center rounded-full">
                    <Sparkles className="size-3" />
                  </span>
                ) : (
                  <InitialsChip name={item.name} size="sm" />
                )}
                <div className="w-[200px] min-w-0 shrink-0">
                  <p className="truncate text-[13px] font-medium">{item.name}</p>
                  <p className="text-muted-foreground truncate text-[11.5px]">
                    {item.sub}
                  </p>
                </div>
                {item.stage ? (
                  <StagePill stage={item.stage} className="shrink-0" />
                ) : (
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-xs font-medium",
                      isAi ? "bg-ai-soft text-ai" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {isAi ? "Sourcing" : "Role"}
                  </span>
                )}
                <p className="text-muted-foreground/90 hidden min-w-0 flex-1 truncate text-[12.5px] md:block">
                  {item.reason}
                </p>
                <span className="hidden flex-1 md:hidden" />
                {!item.actionLabel ? null : item.ask ? (
                  <Button
                    size="sm"
                    className="bg-ai text-ai-foreground hover:bg-ai/90 h-[26px] shrink-0 px-2.5 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      askHirebase(item.ask!);
                    }}
                  >
                    {item.actionLabel}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant={group.key === "overdue" ? "default" : "outline"}
                    className="h-[26px] shrink-0 px-2.5 text-xs"
                    nativeButton={false}
                    render={
                      <Link
                        href={item.href}
                        onClick={(e) => e.stopPropagation()}
                      />
                    }
                  >
                    {item.actionLabel}
                  </Button>
                )}
                <span
                  className={cn(
                    "w-9 shrink-0 text-right font-mono text-[11.5px] tabular-nums",
                    item.ageTone === "danger"
                      ? "text-rose-700"
                      : "text-muted-foreground",
                  )}
                >
                  {item.ageLabel}
                </span>
              </div>
            );
          })}
        </div>
      ))}

      {peek ? (
        <Peek peek={peek} aiAllowed={aiAllowed} onClose={() => setPeek(null)} />
      ) : null}
    </div>
  );
}
