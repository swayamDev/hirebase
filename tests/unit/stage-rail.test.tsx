import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { STAGES, STAGE_LABELS } from "@/sanity/schemas/stages";
import { StagePill, StageRail } from "@/components/stage-rail";

describe("StagePill", () => {
  it.each(STAGES)("renders the human-readable label for '%s'", (stage) => {
    render(<StagePill stage={stage} />);
    expect(screen.getByText(STAGE_LABELS[stage])).toBeInTheDocument();
  });

  it("merges a custom className onto the pill", () => {
    render(<StagePill stage="hired" className="custom-marker" />);
    expect(screen.getByText(STAGE_LABELS.hired)).toHaveClass("custom-marker");
  });
});

describe("StageRail", () => {
  it("renders one segment per stage in the pipeline", () => {
    const { container } = render(<StageRail stage="interviewing" />);
    // Segments are unlabeled decorative spans; the rail itself carries the
    // accessible name, so assert on structure rather than text content.
    expect(container.querySelectorAll("span")).toHaveLength(STAGES.length);
  });

  it("exposes the current stage to assistive tech via aria-label", () => {
    render(<StageRail stage="offer" />);
    expect(screen.getByLabelText("Stage: offer")).toBeInTheDocument();
  });

  it("widens exactly the segment matching the current stage", () => {
    const { container } = render(<StageRail stage="applied" />);
    const segments = Array.from(container.querySelectorAll("span"));
    const wideSegments = segments.filter((el) => el.className.includes("w-4"));
    expect(wideSegments).toHaveLength(1);
  });
});
