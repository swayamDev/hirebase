import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { HeroDemo } from "@/components/landing/hero-demo";
import { Reveal } from "@/components/landing/reveal";
import { PipelineFlow } from "@/components/landing/pipeline-flow";
import { cn } from "@/lib/utils";

const QUERIES = [
  "who's stalled in screening?",
  "React candidates with fintech experience",
  "who gave strong system-design answers?",
  "move Priya to offer",
  "which clients have no active candidates?",
  "log that Henrik passed his tech screen",
  "who mentioned competing offers?",
  "source candidates for the Lumapay role",
];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    blurb: "Run one live search",
    features: [
      "1 open job",
      "Up to 25 candidates",
      "Pipeline board with drift flags",
      "Interview debriefs",
    ],
  },
  {
    name: "Pro",
    price: "$39",
    blurb: "The full desk, with the AI",
    features: [
      "Unlimited jobs & candidates",
      "AI Talent Agent",
      "One-button candidate sourcing",
      "Semantic search over CVs & debriefs",
      "5 recruiter seats",
    ],
    highlight: true,
  },
  {
    name: "Scale",
    price: "$99",
    blurb: "For bigger agencies",
    features: ["Everything in Pro", "20 recruiter seats", "Priority support"],
  },
] as const;

const FAQS = [
  {
    q: "Where do the AI's answers come from?",
    a: "Only from your workspace - the CVs, debriefs and pipeline your team has logged. Every answer links to its source records.",
  },
  {
    q: "Can the AI reject candidates?",
    a: "No. It retrieves, summarises and carries out explicit instructions like moving a stage. Hiring judgements stay with people.",
  },
  {
    q: "How do seats work?",
    a: "Plans are per agency workspace. Pro includes 5 recruiter seats, Scale 20 - invites beyond the cap are blocked automatically.",
  },
  {
    q: "Do I need to reformat our CVs?",
    a: "No. Paste them as they are - the semantic search works on real, messy text, and gets sharper as debriefs accumulate.",
  },
  {
    q: "What happens on the Free plan?",
    a: "A full working desk with one open job and up to 25 candidates. Upgrade when you want the AI and unlimited volume.",
  },
] as const;

/* ── Visuals speak; captions are five words or fewer ── */

function AskVisual() {
  return (
    <div className="bg-card rounded-2xl border p-5 shadow-xs">
      <div className="flex flex-col gap-3">
        <p className="bg-muted ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md px-4 py-2 text-sm">
          Who fits this brief?
        </p>
        <div className="flex items-start gap-2.5">
          <span className="bg-ai mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white">
            V
          </span>
          <div className="text-sm leading-relaxed">
            <p>
              <span className="text-ai font-semibold underline underline-offset-2">
                Oluwaseun Adeyemi
              </span>{" "}
              - <em>&quot;strongest final round this year&quot;</em>
            </p>
            <p className="mt-1.5">
              <span className="text-ai font-semibold underline underline-offset-2">
                Priya Raghavan
              </span>{" "}
              - reached offer for a similar role
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SourcingVisual() {
  const rows = [
    { pct: 94, name: "Priya Raghavan", note: "Senior React · fintech" },
    { pct: 88, name: "Nadia Hussain", note: "Senior React engineer" },
    { pct: 81, name: "Henrik Dahl", note: "Frontend · web perf" },
  ];
  return (
    <div className="bg-card rounded-2xl border p-5 shadow-xs">
      <div className="flex flex-col gap-2">
        {rows.map((row, i) => (
          <div
            key={row.name}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3",
              i === 0 ? "border-ai/35 bg-ai-soft/50" : "bg-card",
            )}
          >
            <span className="text-ai font-display w-11 text-base font-bold tabular-nums">
              {row.pct}%
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{row.name}</p>
              <p className="text-muted-foreground truncate text-xs">
                {row.note}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold",
                i === 0 ? "bg-ai text-white" : "text-muted-foreground border",
              )}
            >
              Add
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Page ── */

export default async function LandingPage() {
  const { userId } = await auth();
  const cta = userId ? "/dashboard" : "/sign-up";

  return (
    <main className="flex-1">
      {/* ══ DARK WORLD ══ */}
      <div className="grain relative overflow-hidden bg-[#131120] text-white">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-[-20rem] size-[70rem] -translate-x-1/2 rounded-full border border-white/[0.04]" />
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-[-14rem] size-[52rem] -translate-x-1/2 rounded-full border border-white/[0.05]" />
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-[-8rem] size-[36rem] -translate-x-1/2 rounded-full border border-white/[0.06]" />
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-[-26rem] h-[44rem] w-[80rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(124,92,214,0.18),transparent)]" />

        {/* nav */}
        <header className="relative z-10">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
            <span className="font-display text-xl font-bold tracking-tight">
              Hirebase<span className="text-[#9F8BEF]">.</span>
            </span>
            <div className="flex items-center gap-2">
              {userId ? (
                <Button
                  className="bg-white text-[#131120] hover:bg-white/90"
                  nativeButton={false}
                  render={<Link href="/dashboard" />}
                >
                  Open dashboard
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    className="text-white/80 hover:bg-white/10 hover:text-white"
                    nativeButton={false}
                    render={<Link href="/sign-in" />}
                  >
                    Sign in
                  </Button>
                  <Button
                    className="bg-white text-[#131120] hover:bg-white/90"
                    nativeButton={false}
                    render={<Link href="/sign-up" />}
                  >
                    Start free
                  </Button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* hero - two lines, one button, the product itself */}
        <section className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-14 px-6 pt-14 pb-20 sm:pt-20 xl:grid-cols-2 xl:gap-10">
          <div>
            <h1 className="fade-up font-display text-[12vw] leading-[1.04] font-semibold tracking-[-0.03em] text-balance sm:text-6xl xl:text-[64px]">
              The CRM every recruiter deserves.
            </h1>
            <p className="fade-up fade-up-2 font-display mt-4 text-2xl font-medium tracking-[-0.02em] text-balance sm:text-3xl">
              <span className="text-[#9F8BEF]">Driven by AI that never forgets a candidate.</span>
            </p>
            <div className="fade-up fade-up-3 mt-9 flex flex-wrap items-center gap-4">
              <Button
                size="lg"
                className="bg-white text-[#131120] hover:bg-white/90"
                nativeButton={false}
                render={<Link href={cta} />}
              >
                Start free
              </Button>
              <span className="text-sm text-white/60">No card needed</span>
            </div>
          </div>

          <div className="fade-up fade-up-3 relative mx-auto w-full max-w-2xl xl:mx-0">
            <HeroDemo />
          </div>
        </section>

        {/* query marquee */}
        <div className="relative z-10 border-t border-white/10 py-4">
          <div className="flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
            <div className="animate-marquee flex shrink-0 items-center gap-8 pr-8">
              {[...QUERIES, ...QUERIES].map((query, i) => (
                <span
                  key={i}
                  className="flex items-center gap-8 font-mono text-xs whitespace-nowrap text-white/40"
                >
                  “{query}”
                  <span className="bg-white/20 size-1 rounded-full" />
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* stage seam */}
      <div className="via-stage-interviewing h-0.5 bg-gradient-to-r from-[#64748b] via-30% to-[#e11d48]" />

      {/* ══ LIGHT WORLD ══ */}
      {/* features - visual + substance, alternating */}
      <section id="product" className="bg-background">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-20 px-6 py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <Reveal>
              <h2 className="font-display text-3xl font-semibold tracking-[-0.02em]">
                A pipeline that flags drift
              </h2>
              <p className="text-muted-foreground mt-3 max-w-md leading-relaxed">
                Every application moves across one board. Sit still too long
                and it&apos;s flagged - before your client asks why the search
                went quiet.
              </p>
              <ul className="text-muted-foreground mt-5 space-y-2 text-sm">
                <li className="flex gap-2.5"><span className="bg-foreground/40 mt-2 size-1 shrink-0 rounded-full" />Six stages, applied to hired - drag between them</li>
                <li className="flex gap-2.5"><span className="bg-foreground/40 mt-2 size-1 shrink-0 rounded-full" />Automatic stale flags after 14 quiet days</li>
                <li className="flex gap-2.5"><span className="bg-foreground/40 mt-2 size-1 shrink-0 rounded-full" />Every client, role and candidate cross-linked</li>
              </ul>
            </Reveal>
            <Reveal delay={140}><PipelineFlow /></Reveal>
          </div>

          <div className="grid items-center gap-10 lg:grid-cols-2">
            <Reveal delay={140} className="lg:order-first"><AskVisual /></Reveal>
            <Reveal>
              <span className="bg-ai-soft text-ai inline-block rounded-md px-2 py-0.5 text-xs font-semibold">AI · Pro</span>
              <h2 className="font-display mt-4 text-3xl font-semibold tracking-[-0.02em]">
                Ask your database like a colleague
              </h2>
              <p className="text-muted-foreground mt-3 max-w-md leading-relaxed">
                Hirebase reads your pipeline and the texture of your interview
                notes together. Every answer is a person, linked, with the
                evidence beside them.
              </p>
              <ul className="text-muted-foreground mt-5 space-y-2 text-sm">
                <li className="flex gap-2.5"><span className="bg-ai mt-2 size-1 shrink-0 rounded-full" />Plain-English questions over CVs and debriefs</li>
                <li className="flex gap-2.5"><span className="bg-ai mt-2 size-1 shrink-0 rounded-full" />Acts on instruction: move stages, log interviews</li>
                <li className="flex gap-2.5"><span className="bg-ai mt-2 size-1 shrink-0 rounded-full" />Never scores or rejects - humans decide</li>
              </ul>
            </Reveal>
          </div>

          <div className="grid items-center gap-10 lg:grid-cols-2">
            <Reveal>
              <span className="bg-ai-soft text-ai inline-block rounded-md px-2 py-0.5 text-xs font-semibold">AI · Pro</span>
              <h2 className="font-display mt-4 text-3xl font-semibold tracking-[-0.02em]">
                One button. Your shortlist.
              </h2>
              <p className="text-muted-foreground mt-3 max-w-md leading-relaxed">
                Open a role and press Help source candidates - every CV in
                your pool is scored against the brief, with one-click add to
                pipeline.
              </p>
              <ul className="text-muted-foreground mt-5 space-y-2 text-sm">
                <li className="flex gap-2.5"><span className="bg-ai mt-2 size-1 shrink-0 rounded-full" />Semantic match, not keyword bingo</li>
                <li className="flex gap-2.5"><span className="bg-ai mt-2 size-1 shrink-0 rounded-full" />Relative strength across your own pool</li>
                <li className="flex gap-2.5"><span className="bg-ai mt-2 size-1 shrink-0 rounded-full" />A place to start - never a ranking of people</li>
              </ul>
            </Reveal>
            <Reveal delay={140}><SourcingVisual /></Reveal>
          </div>
        </div>
      </section>

      {/* how it works - an honest sequence */}
      <section id="how" className="border-t">
        <div className="mx-auto w-full max-w-7xl px-6 py-20">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold tracking-[-0.02em]">
              Three steps to a faster desk
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {[
              { n: "01", t: "Load your pool", b: "Clients, roles, candidates. Paste CVs as they are - debriefs become searchable memory." },
              { n: "02", t: "Ask in plain English", b: "Structure and meaning read together. The answer is a person, linked." },
              { n: "03", t: "Place faster", b: "One click to pipeline. Drift gets flagged before searches go cold." },
            ].map((step, i) => (
              <Reveal key={step.n} delay={i * 120}>
                <p className="text-muted-foreground/50 font-mono text-sm">{step.n}</p>
                <h3 className="mt-2 text-lg font-semibold tracking-tight">{step.t}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{step.b}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* built for every desk */}
      <section className="border-t">
        <div className="mx-auto w-full max-w-7xl px-6 py-20">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold tracking-[-0.02em]">
              Built for every desk
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { t: "Permanent", b: "Long pipelines, many clients. Nothing slips between stages." },
              { t: "Contract", b: "Availability and notice periods, answerable in one question." },
              { t: "Executive search", b: "Years of confidential debriefs become your edge on the next mandate." },
              { t: "Embedded & in-house", b: "One workspace per team, seats enforced automatically." },
            ].map((useCase, i) => (
              <Reveal key={useCase.t} delay={i * 100}>
                <span className="from-stage-applied to-stage-hired block h-0.5 w-8 rounded-full bg-gradient-to-r" />
                <h3 className="mt-3 text-base font-semibold tracking-tight">{useCase.t}</h3>
                <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{useCase.b}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* trust */}
      <section className="border-t">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-20 lg:grid-cols-3">
          {[
            { t: "Your data stays yours", b: "Every workspace is isolated by design - the AI can only ever see your agency's records, enforced at the query layer." },
            { t: "Answers cite their sources", b: "Every claim links back to the CV or debrief it came from. No black boxes, no invented candidates." },
            { t: "People decide, not models", b: "The agent retrieves, summarises and acts on your instruction. It never scores, ranks out, or rejects anyone." },
          ].map((item, i) => (
            <Reveal key={item.t} delay={i * 100}>
              <h3 className="text-base font-semibold tracking-tight">{item.t}</h3>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{item.b}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* pricing */}
      <section className="border-t">
        <div className="mx-auto w-full max-w-7xl px-6 py-24">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold tracking-[-0.02em]">Pricing that scales with your desk</h2>
            <p className="text-muted-foreground mt-2 max-w-md text-sm">Per agency workspace. Seats enforced automatically.</p>
          </Reveal>
          <div className="grid items-start gap-5 md:grid-cols-3">
            {PLANS.map((plan, i) => {
              const highlight = "highlight" in plan && plan.highlight;
              return (
                <Reveal key={plan.name} delay={i * 120}>
                  <div
                    className={cn(
                      "bg-card relative rounded-2xl border p-7",
                      highlight
                        ? "border-ai/40 shadow-[0_0_50px_-12px_rgba(124,92,214,0.45)] md:-mt-4"
                        : "shadow-xs",
                    )}
                  >
                    <div className="flex items-baseline justify-between">
                      <h3 className="font-display text-lg font-bold">
                        {plan.name}
                      </h3>
                      <p className="font-display text-4xl font-extrabold tabular-nums">
                        {plan.price}
                        <span className="text-muted-foreground text-sm font-medium">
                          /mo
                        </span>
                      </p>
                    <p className="text-muted-foreground mt-1 text-sm">{plan.blurb}</p>
                    </div>
                    <ul className="mt-5 space-y-2 text-sm">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex gap-2.5">
                          <span
                            className={cn(
                              "mt-2 size-1 shrink-0 rounded-full",
                              highlight ? "bg-ai" : "bg-foreground/40",
                            )}
                          />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="mt-6 w-full"
                      variant={highlight ? "default" : "outline"}
                      nativeButton={false}
                      render={<Link href={cta} />}
                    >
                      Start free
                    </Button>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t">
        <div className="mx-auto w-full max-w-3xl px-6 py-20">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold tracking-[-0.02em]">Questions, answered</h2>
          </Reveal>
          <div className="mt-8 divide-y">
            {FAQS.map((faq) => (
              <details key={faq.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium">
                  {faq.q}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ══ DARK CLOSE ══ */}
      <section className="grain relative overflow-hidden bg-[#131120] text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-40%] h-[30rem] w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(124,92,214,0.22),transparent)]"
        />
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-7 px-6 py-20">
          <Reveal>
            <h2 className="font-display max-w-xl text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              Remember everyone. Place faster
              <span className="text-[#9F8BEF]">.</span>
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <Button
              size="lg"
              className="bg-white text-[#131120] hover:bg-white/90"
              nativeButton={false}
              render={<Link href={cta} />}
            >
              Start free
            </Button>
          </Reveal>
        </div>
        <footer className="relative z-10 border-t border-white/10">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-sm text-white/60">
            <span className="font-display font-bold text-white">
              Hirebase<span className="text-[#9F8BEF]">.</span>
            </span>
            <span className="font-mono text-xs">
              Next.js · Clerk · Sanity Context
            </span>
          </div>
        </footer>
      </section>
    </main>
  );
}
