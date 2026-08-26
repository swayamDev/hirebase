"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { Sparkles, X } from "lucide-react";
import Markdown, { type Components } from "react-markdown";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Suggestions follow the screen: list pages get portfolio questions, detail
 * pages get questions about the entity on screen (its name read from the h1).
 */
function suggestionsFor(pathname: string, entity: string | null): string[] {
  const detail = /^\/dashboard\/(companies|jobs|candidates)\/[^/]+/.exec(
    pathname,
  )?.[1];

  if (detail === "companies") {
    const name = entity ?? "this client";
    return [
      `Summarize the pipeline for ${name}`,
      `Who's stalled in screening at ${name}?`,
      `Which of ${name === "this client" ? "this client's" : `${name}'s`} roles still need candidates?`,
    ];
  }
  if (detail === "jobs") {
    const title = entity ?? "this role";
    return [
      `Who are the strongest matches for ${title}?`,
      `Who's been stuck on ${title} for over two weeks?`,
      `Summarize the interview feedback for ${title}`,
    ];
  }
  if (detail === "candidates") {
    const name = entity ?? "this candidate";
    return [
      `Summarize ${name}'s interview feedback`,
      `Which open roles fit ${name} best?`,
      `Where is ${name} in our pipelines right now?`,
    ];
  }
  if (pathname.startsWith("/dashboard/companies")) {
    return [
      "Which client has the most candidates in play?",
      "Which clients have open roles with no candidates yet?",
      "Summarize this month's activity across my clients",
    ];
  }
  if (pathname.startsWith("/dashboard/jobs")) {
    return [
      "Which roles are going stale?",
      "Where are candidates getting stuck right now?",
      "Which open roles have nobody past screening?",
    ];
  }
  if (pathname.startsWith("/dashboard/candidates")) {
    return [
      "Find React candidates with fintech experience",
      "Who joined the pool in the last two weeks?",
      "Who gave strong system-design answers recently?",
    ];
  }
  return [
    "What moved in my pipeline this week?",
    "Who's stalled in screening?",
    "Which candidates are closest to an offer?",
  ];
}

const markdownComponents: Components = {
  a: ({ href, children }) => (
    <Link
      href={href ?? "#"}
      className="text-ai font-medium underline underline-offset-2"
    >
      {children}
    </Link>
  ),
};

/**
 * Mono receipt chip for a tool call - the proof the agent queried real data.
 * Tool name stays visible; the input (the actual GROQ) is collapsed inside.
 */
function ToolReceipt({ name, input }: { name: string; input: unknown }) {
  return (
    <div className="border-ai/20 bg-ai-soft rounded-md border px-2.5 py-1.5 font-mono text-xs">
      <details>
        <summary className="cursor-pointer select-none">{name}</summary>
        <pre className="text-muted-foreground mt-1.5 max-h-48 overflow-auto text-[11px] break-all whitespace-pre-wrap">
          {JSON.stringify(input, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function UpgradeCard() {
  return (
    <div className="px-4">
      <Card className="border-ai/30">
        <CardHeader>
          <span className="bg-ai-soft text-ai w-fit rounded-md px-2 py-0.5 text-xs font-semibold">
            AI · Pro
          </span>
          <CardTitle className="font-display text-lg font-bold tracking-tight">
            The AI Talent Agent is on Pro
          </CardTitle>
          <CardDescription>
            Ask questions across your candidates, jobs and interviews - every
            answer cites the records it came from.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="bg-ai text-ai-foreground hover:bg-ai/90"
            nativeButton={false}
            render={<Link href="/dashboard/billing" />}
          >
            See plans
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function AgentChat({
  ask,
  onAskHandled,
}: {
  ask: string | null;
  onAskHandled: () => void;
}) {
  const [input, setInput] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const { messages, sendMessage, status, addToolOutput } = useChat({
    transport: new DefaultChatTransport({ api: "/api/agent" }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    // Client-side tools - executed here in the browser.
    onToolCall({ toolCall }) {
      if (toolCall.dynamic) return;

      if (toolCall.toolName === "get_current_page") {
        const jobId = /^\/dashboard\/jobs\/([^/]+)/.exec(pathname)?.[1];
        const candidateId = /^\/dashboard\/candidates\/([^/]+)/.exec(
          pathname,
        )?.[1];
        addToolOutput({
          tool: "get_current_page",
          toolCallId: toolCall.toolCallId,
          output: { pathname, jobId: jobId ?? null, candidateId: candidateId ?? null },
        });
        return;
      }

      if (toolCall.toolName === "navigate_to") {
        const { path } = toolCall.input as { path: string };
        if (!path.startsWith("/dashboard")) {
          addToolOutput({
            tool: "navigate_to",
            toolCallId: toolCall.toolCallId,
            output: { error: "Only /dashboard paths are allowed." },
          });
          return;
        }
        router.push(path);
        addToolOutput({
          tool: "navigate_to",
          toolCallId: toolCall.toolCallId,
          output: { ok: true, path },
        });
      }
    },
  });
  const busy = status === "submitted" || status === "streaming";

  // On detail pages the h1 is the entity name - it feeds the suggestions.
  // The h1 can stream in just after navigation, so retry briefly.
  const [entityName, setEntityName] = useState<string | null>(null);
  useEffect(() => {
    if (!/^\/dashboard\/(companies|jobs|candidates)\/[^/]+/.test(pathname)) {
      setEntityName(null);
      return;
    }
    // Poll briefly - the page body can stream in well after the layout hydrates.
    let tries = 0;
    const timer = setInterval(() => {
      const text = document.querySelector("main h1")?.textContent?.trim();
      if (text) {
        setEntityName(text);
        clearInterval(timer);
      } else if (++tries >= 20) {
        clearInterval(timer);
      }
    }, 300);
    return () => clearInterval(timer);
  }, [pathname]);
  const suggestions = suggestionsFor(pathname, entityName);

  // Questions fired from elsewhere in the app (queue rows, peek panel, rail).
  useEffect(() => {
    if (!ask || busy) return;
    sendMessage({ text: ask });
    onAskHandled();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ask, busy]);

  // Keep the newest message in view while the app stays usable behind us.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-start gap-2 pt-2">
            <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Try asking
            </p>
            {suggestions.map((prompt) => (
              <Button
                key={prompt}
                variant="outline"
                size="sm"
                className="text-muted-foreground hover:text-foreground h-auto rounded-md px-2.5 py-1.5 text-left font-normal whitespace-normal"
                disabled={busy}
                onClick={() => sendMessage({ text: prompt })}
              >
                {prompt}
              </Button>
            ))}
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "space-y-2 text-sm",
              message.role === "user" &&
                "bg-muted ml-auto w-fit max-w-[85%] rounded-lg px-3 py-2",
            )}
          >
            {message.parts.map((part, i) => {
              if (part.type === "text") {
                return message.role === "user" ? (
                  <p key={i}>{part.text}</p>
                ) : (
                  <div
                    key={i}
                    className="space-y-2 leading-relaxed [&_ol]:list-decimal [&_ol]:pl-4 [&_ul]:list-disc [&_ul]:pl-4"
                  >
                    <Markdown components={markdownComponents}>
                      {part.text}
                    </Markdown>
                  </div>
                );
              }
              if (part.type === "dynamic-tool") {
                return (
                  <ToolReceipt key={i} name={part.toolName} input={part.input} />
                );
              }
              if (part.type.startsWith("tool-")) {
                const toolPart = part as { type: string; input?: unknown };
                return (
                  <ToolReceipt
                    key={i}
                    name={toolPart.type.slice("tool-".length)}
                    input={toolPart.input}
                  />
                );
              }
              return null;
            })}
          </div>
        ))}
        {busy && <Skeleton className="h-4 w-2/3" />}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 border-t p-4">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your candidates and jobs"
          disabled={busy}
        />
        <Button
          type="submit"
          className="bg-ai text-ai-foreground hover:bg-ai/90"
          disabled={busy || !input.trim()}
        >
          Ask
        </Button>
      </form>
    </div>
  );
}

export function AgentPanel({ allowed }: { allowed: boolean }) {
  const [open, setOpen] = useState(false);
  const [ask, setAsk] = useState<string | null>(null);

  // Anywhere in the app can dispatch `hirebase:ask` to open the dock mid-flow.
  useEffect(() => {
    function onAsk(event: Event) {
      const text = (event as CustomEvent<{ text?: string }>).detail?.text;
      if (!text) return;
      setOpen(true);
      setAsk(text);
    }
    window.addEventListener("hirebase:ask", onAsk);
    return () => window.removeEventListener("hirebase:ask", onAsk);
  }, []);

  return (
    <>
      {/* Floating AI dock - the one violet fixture on every screen */}
      <Button
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="bg-ai text-ai-foreground hover:bg-ai/90 shadow-ai/40 fixed right-6 bottom-6 z-[60] h-12 rounded-full px-5 shadow-lg transition-transform hover:scale-[1.03]"
      >
        <Sparkles className="size-4" />
        Ask Hirebase
      </Button>

      {/*
        Docked, NON-MODAL chat: no backdrop, no focus trap - the app stays
        fully usable behind it. Always mounted (hidden via CSS + inert) so
        the conversation survives closing and route changes alike.
      */}
      <div
        role="dialog"
        aria-label="Ask Hirebase"
        inert={!open}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        className={cn(
          "bg-card fixed right-4 bottom-24 z-[60] flex h-[600px] max-h-[calc(100dvh-8rem)] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border shadow-2xl transition-all duration-300 sm:right-6",
          open
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0",
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
          <div>
            <p className="font-display text-base font-bold tracking-tight">
              Ask Hirebase
            </p>
            <p className="text-muted-foreground text-xs">
              {"Answers come only from your agency's data."}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close chat"
            onClick={() => setOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>
        {allowed ? (
          <AgentChat ask={ask} onAskHandled={() => setAsk(null)} />
        ) : (
          <div className="py-4"><UpgradeCard /></div>
        )}
      </div>
    </>
  );
}
