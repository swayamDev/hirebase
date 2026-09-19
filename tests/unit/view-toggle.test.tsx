import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockReplace = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/dashboard/jobs",
  useSearchParams: () => mockSearchParams,
}));

const { ViewToggle } = await import("@/components/view-toggle");

beforeEach(() => {
  mockReplace.mockClear();
  Array.from(mockSearchParams.keys()).forEach((k) => mockSearchParams.delete(k));
});

describe("ViewToggle", () => {
  const options = [
    { value: "grid", label: "Grid view", icon: "grid" as const },
    { value: "timeline", label: "Timeline view", icon: "timeline" as const },
  ];

  it("writes the non-default option to the URL when clicked", async () => {
    const user = userEvent.setup();
    render(<ViewToggle defaultValue="grid" options={options} />);

    await user.click(screen.getByRole("button", { name: "Timeline view" }));

    expect(mockReplace).toHaveBeenCalledWith(
      "/dashboard/jobs?view=timeline",
      { scroll: false },
    );
  });

  it("clears the URL param (rather than writing it) when switching back to the default", async () => {
    mockSearchParams.set("view", "timeline");
    const user = userEvent.setup();
    render(<ViewToggle defaultValue="grid" options={options} />);

    await user.click(screen.getByRole("button", { name: "Grid view" }));

    expect(mockReplace).toHaveBeenCalledWith("/dashboard/jobs", { scroll: false });
  });

  it("does nothing when clicking the already-active option", async () => {
    const user = userEvent.setup();
    render(<ViewToggle defaultValue="grid" options={options} />);

    await user.click(screen.getByRole("button", { name: "Grid view" }));

    expect(mockReplace).not.toHaveBeenCalled();
  });
});
