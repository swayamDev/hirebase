"use client";

import { cn } from "@/lib/utils";

/** Fire a question into the Ask Hirebase dock from anywhere in the app. */
export function askHirebase(text: string) {
  window.dispatchEvent(new CustomEvent("hirebase:ask", { detail: { text } }));
}

/** A prompt chip that opens the dock and asks the question for you. */
export function AskChip({
  prompt,
  className,
}: {
  prompt: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => askHirebase(prompt)}
      className={cn(
        "bg-ai-soft text-ai/90 hover:text-ai cursor-pointer rounded-md px-2 py-1 text-left font-mono text-[11px] transition-colors",
        className,
      )}
    >
      {prompt}
    </button>
  );
}
