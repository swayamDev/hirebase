"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Fire a question into the Ask Hirebase dock from anywhere in the app. */
export function askHirebase(text: string) {
  window.dispatchEvent(new CustomEvent("hirebase:ask", { detail: { text } }));
}

/** Violet outline action that opens the dock and asks on your behalf. */
export function AskButton({
  prompt,
  children,
  className,
}: {
  prompt: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      className={cn("border-ai/35 text-ai hover:text-ai", className)}
      onClick={() => askHirebase(prompt)}
    >
      <Sparkles className="size-3.5" />
      {children}
    </Button>
  );
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
