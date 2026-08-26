"use client";

import { useDraggable } from "@dnd-kit/core";
import { type Stage } from "@/sanity/schemas/stages";
import { InitialsChip } from "@/components/initials-chip";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export type BoardApplication = {
  _id: string;
  stage: Stage;
  stageUpdatedAt: string;
  candidateId: string | null;
  candidateName: string | null;
  candidateHeadline: string | null;
};

function daysInStage(stageUpdatedAt: string): number {
  const elapsed = Date.now() - new Date(stageUpdatedAt).getTime();
  return Math.max(0, Math.floor(elapsed / 86_400_000));
}

/** Presentational card - also rendered inside the DragOverlay. */
export function KanbanCardContent({
  application,
  dragging = false,
  pending = false,
}: {
  application: BoardApplication;
  dragging?: boolean;
  /** The card's stage move is still committing on the server. */
  pending?: boolean;
}) {
  const days = daysInStage(application.stageUpdatedAt);
  const stale =
    days > 14 &&
    application.stage !== "hired" &&
    application.stage !== "rejected";

  return (
    <div
      className={cn(
        "bg-card rounded-md border p-3",
        dragging && "ring-ring/20 shadow-md ring-1",
      )}
    >
      <div className="flex items-center gap-2">
        <InitialsChip
          name={application.candidateName ?? "Unknown candidate"}
          size="sm"
        />
        <p className="min-w-0 truncate text-[13px] leading-tight font-medium">
          {application.candidateName ?? "Unknown candidate"}
        </p>
      </div>
      {application.candidateHeadline ? (
        <p className="text-muted-foreground mt-1.5 truncate text-xs">
          {application.candidateHeadline}
        </p>
      ) : null}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        {pending ? (
          <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
            <Spinner className="size-3" />
            Moving…
          </span>
        ) : (
          <span
            className="text-muted-foreground text-[11px] tabular-nums"
            suppressHydrationWarning
          >
            {days === 0 ? "Moved today" : `${days}d in stage`}
          </span>
        )}
        {stale ? (
          <span
            className="text-stage-offer bg-stage-offer/10 rounded px-1.5 py-0.5 text-[11px] font-medium tabular-nums"
            suppressHydrationWarning
          >
            stale {days}d
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function KanbanCard({
  application,
  pending = false,
  readOnly,
  onOpen,
}: {
  application: BoardApplication;
  /** The card's stage move is still committing on the server. */
  pending?: boolean;
  readOnly: boolean;
  /** Open the candidate record - suppressed by the board right after a drag. */
  onOpen?: (application: BoardApplication) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: application._id,
    disabled: readOnly,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onOpen?.(application)}
      className={cn(
        "cursor-pointer",
        !readOnly && "touch-none",
        isDragging && "opacity-40",
      )}
    >
      <KanbanCardContent application={application} pending={pending} />
    </div>
  );
}
