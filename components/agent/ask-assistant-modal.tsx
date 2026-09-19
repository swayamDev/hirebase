"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { CornerDownLeft, Sparkles } from "lucide-react";
import { suggestionsFor } from "@/components/agent/AgentPanel";
import { askHirebase } from "@/components/today/ask-assistant";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** The rotating example questions the empty input "types" at you. */
const DEMO_PROMPTS = [
  "Find me a React engineer with fintech experience",
  "Who gave strong system-design answers recently?",
  "Which roles are going stale?",
  "Summarize this week's activity for Lumapay",
];

/** Landing-hero-style typewriter, driven as a placeholder string. */
function useTypewriter(active: boolean) {
  const [text, setText] = React.useState("");

  React.useEffect(() => {
    if (!active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setText(DEMO_PROMPTS[0]);
      return;
    }
    let prompt = 0;
    let char = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = DEMO_PROMPTS[prompt];
      if (char <= current.length) {
        setText(current.slice(0, char));
        char += 1;
        timer = setTimeout(tick, 38);
      } else {
        // Hold the finished line, then move to the next prompt.
        timer = setTimeout(() => {
          prompt = (prompt + 1) % DEMO_PROMPTS.length;
          char = 0;
          tick();
        }, 1800);
      }
    };
    tick();
    return () => clearTimeout(timer);
  }, [active]);

  return text;
}

/**
 * ⌘I quick-ask: a centered modal with the landing page's typewriter input.
 * Submitting hands the question to the Ask Hirebase dock (which streams the answer)
 * and gets out of the way.
 */
export function AskHirebaseModal() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  // -1 = the free-text input; 0..n-1 = a highlighted suggestion.
  const [highlighted, setHighlighted] = React.useState(-1);
  const typed = useTypewriter(open && value === "");

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "i" && (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        setOpen((current) => !current);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const suggestions = suggestionsFor(pathname, null);

  function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setOpen(false);
    setValue("");
    setHighlighted(-1);
    askHirebase(trimmed);
  }

  // Focus stays in the input; arrows move the active suggestion underneath it.
  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, -1));
    } else if (e.key === "Enter") {
      // Explicit - implicit form submission is unreliable inside the dialog.
      e.preventDefault();
      ask(highlighted >= 0 ? suggestions[highlighted] : value);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-ai/90 hover:bg-ai-soft/60 hover:text-ai mb-1 flex h-[30px] w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors"
      >
        <Sparkles className="size-4 shrink-0" />
        Ask Hirebase
        <kbd className="text-ai/60 ml-auto font-mono text-[10px]">⌘I</kbd>
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setHighlighted(-1);
        }}
      >
        <DialogContent
          className="top-1/3 translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl"
          showCloseButton={false}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Ask Hirebase</DialogTitle>
            <DialogDescription>
              Ask a question across your candidates, roles and debriefs.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(highlighted >= 0 ? suggestions[highlighted] : value);
            }}
            className="flex items-center gap-2.5 border-b px-4"
          >
            <span className="bg-ai-soft text-ai flex size-7 shrink-0 items-center justify-center rounded-full">
              <Sparkles className="size-3.5" />
            </span>
            <input
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setHighlighted(-1);
              }}
              onKeyDown={onInputKeyDown}
              placeholder={typed || "Ask about your candidates and roles"}
              autoFocus
              role="combobox"
              aria-expanded="true"
              aria-controls="ask-assistant-suggestions"
              aria-activedescendant={
                highlighted >= 0 ? `ask-assistant-option-${highlighted}` : undefined
              }
              className="placeholder:text-muted-foreground/70 h-14 w-full bg-transparent text-[15px] outline-none"
            />
            <kbd
              className={cn(
                "text-muted-foreground flex shrink-0 items-center gap-1 font-mono text-[10px] transition-opacity",
                value.trim() ? "opacity-100" : "opacity-0",
              )}
            >
              <CornerDownLeft className="size-3" />
              return
            </kbd>
          </form>

          <div
            id="ask-assistant-suggestions"
            role="listbox"
            aria-label="Suggested questions"
            className="flex flex-col items-start gap-1 px-3 py-3"
          >
            <p className="text-muted-foreground/80 px-1.5 pb-1 font-mono text-[10px] tracking-[0.14em] uppercase">
              Try asking
            </p>
            {suggestions.map((prompt, index) => (
              <button
                key={prompt}
                id={`ask-assistant-option-${index}`}
                type="button"
                role="option"
                aria-selected={highlighted === index}
                onClick={() => ask(prompt)}
                onMouseEnter={() => setHighlighted(index)}
                className={cn(
                  "w-full cursor-pointer rounded-md px-1.5 py-1.5 text-left text-[13px] transition-colors",
                  highlighted === index
                    ? "bg-ai-soft/50 text-ai"
                    : "text-muted-foreground",
                )}
              >
                {prompt}
              </button>
            ))}
          </div>

          <p className="text-muted-foreground/80 border-t px-4 py-2.5 text-[11.5px]">
            Answers come only from your agency&apos;s data - the reply streams
            into the dock.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
