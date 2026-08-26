import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { readClient } from "@/lib/sanity/client";
import { PageHeader, Section } from "@/components/shell/panels";
import { StagePill, StageRail } from "@/components/stage-rail";
import { StageMixBar } from "@/components/stage-mix-bar";
import { InitialsChip } from "@/components/initials-chip";
import { Button } from "@/components/ui/button";
import { type Stage } from "@/sanity/schemas/stages";

type RecentApplication = {
  _id: string;
  stage: Stage;
  stageUpdatedAt: string | null;
  appliedAt: string | null;
  candidateId: string | null;
  candidateName: string | null;
  jobId: string | null;
  jobTitle: string | null;
};

type StaleApplication = {
  _id: string;
  stage: Stage;
  stageUpdatedAt: string | null;
  appliedAt: string | null;
  candidateId: string | null;
  candidateName: string | null;
  jobId: string | null;
  jobTitle: string | null;
};

/** The stages an in-flight application can sit in - the desk's live pipeline. */
const IN_FLIGHT_STAGES = [
  "applied",
  "screening",
  "interviewing",
  "offer",
] as const satisfies readonly Stage[];

type StageCounts = Record<(typeof IN_FLIGHT_STAGES)[number], number>;

/** "3d ago"-style relative time from an ISO string. */
function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/** Whole days since an ISO string - how long an application has sat still. */
function daysStale(iso: string | null): number {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

export default async function OverviewPage() {
  const { orgId, has } = await requireOrg();

  const now = new Date().toISOString();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const staleBefore = new Date(
    Date.now() - 14 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [
    openJobs,
    activeCandidates,
    applicationsInProgress,
    recentInterviews,
    companyCount,
    stageCounts,
    recentApplications,
    staleApplications,
  ] = await Promise.all([
    readClient.fetch<number>(
      `count(*[_type == "job" && orgId == $orgId && status == "open"])`,
      { orgId },
    ),
    readClient.fetch<number>(
      `count(*[_type == "candidate" && orgId == $orgId && archived != true])`,
      { orgId },
    ),
    readClient.fetch<number>(
      `count(*[_type == "application" && orgId == $orgId && !(stage in ["hired", "rejected"])])`,
      { orgId },
    ),
    readClient.fetch<number>(
      `count(*[_type == "interview" && orgId == $orgId && scheduledAt >= $since && scheduledAt <= $now])`,
      { orgId, since, now },
    ),
    readClient.fetch<number>(
      `count(*[_type == "company" && orgId == $orgId])`,
      { orgId },
    ),
    readClient.fetch<StageCounts>(
      `{
        "applied": count(*[_type == "application" && orgId == $orgId && stage == "applied"]),
        "screening": count(*[_type == "application" && orgId == $orgId && stage == "screening"]),
        "interviewing": count(*[_type == "application" && orgId == $orgId && stage == "interviewing"]),
        "offer": count(*[_type == "application" && orgId == $orgId && stage == "offer"])
      }`,
      { orgId },
    ),
    readClient.fetch<RecentApplication[]>(
      `*[_type == "application" && orgId == $orgId]
        | order(coalesce(stageUpdatedAt, appliedAt) desc)[0...8]{
          _id,
          stage,
          stageUpdatedAt,
          appliedAt,
          "candidateId": candidate->_id,
          "candidateName": candidate->name,
          "jobId": job->_id,
          "jobTitle": job->title
        }`,
      { orgId },
    ),
    readClient.fetch<StaleApplication[]>(
      `*[_type == "application" && orgId == $orgId
          && !(stage in ["hired", "rejected"])
          && coalesce(stageUpdatedAt, appliedAt) < $staleBefore]
        | order(coalesce(stageUpdatedAt, appliedAt) asc)[0...8]{
          _id,
          stage,
          stageUpdatedAt,
          appliedAt,
          "candidateId": candidate->_id,
          "candidateName": candidate->name,
          "jobId": job->_id,
          "jobTitle": job->title
        }`,
      { orgId, staleBefore },
    ),
  ]);

  const isBrandNew = companyCount === 0 && recentApplications.length === 0;
  const showUpgrade = !has({ feature: "ai_agent" });

  const stats = [
    { label: "Open jobs", value: openJobs },
    { label: "Active candidates", value: activeCandidates },
    { label: "Applications in progress", value: applicationsInProgress },
    { label: "Interviews · last 7 days", value: recentInterviews },
  ];

  return (
    <div className="flex flex-col pb-4">
      <PageHeader
        eyebrow="Your desk"
        title="Overview"
        description="Every client, role and candidate - at a glance."
      />

      {/* ── Stat strip: one inline row, hairline-divided ── */}
      <div className="mt-4 flex divide-x overflow-x-auto border-y">
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-0 flex-1 px-4 py-3 first:pl-0">
            <p className="text-muted-foreground truncate text-xs font-medium">
              {stat.label}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Pipeline health: flat beneath the strip ── */}
      <Section
        title="Pipeline health"
        count={applicationsInProgress}
        className="mt-8"
      >
        <StageMixBar counts={stageCounts} className="h-2.5" />
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          {IN_FLIGHT_STAGES.map((stage) => (
            <li key={stage} className="flex items-center gap-1.5">
              <StagePill stage={stage} />
              <span className="text-muted-foreground font-mono text-xs tabular-nums">
                {stageCounts[stage]}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      {/* ── Recent activity | Needs attention: one vertical divider ── */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-0">
        <Section title="Recent activity" className="lg:pr-6">
          {isBrandNew ? (
            <div className="flex flex-col items-center gap-2.5 border-t px-6 py-8 text-center">
              <p className="text-muted-foreground text-[13px]">
                No companies yet &mdash; add your first client.
              </p>
              <Button
                size="sm"
                nativeButton={false}
                render={<Link href="/dashboard/companies" />}
              >
                Add company
              </Button>
            </div>
          ) : recentApplications.length === 0 ? (
            <div className="flex flex-col items-center gap-2.5 border-t px-6 py-8 text-center">
              <p className="text-muted-foreground text-[13px]">
                No applications yet &mdash; add candidates to a job to see
                activity here.
              </p>
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                render={<Link href="/dashboard/jobs" />}
              >
                View jobs
              </Button>
            </div>
          ) : (
            <div className="divide-y border-t">
              {recentApplications.map((app) => {
                const name = app.candidateName ?? "Unknown candidate";
                return (
                  <div
                    key={app._id}
                    className="hover:bg-muted/40 relative flex cursor-pointer items-center gap-3 py-2.5 text-[13px] transition-colors"
                  >
                    <InitialsChip name={name} />
                    <div className="min-w-0 flex-1">
                      {app.candidateId ? (
                        <Link
                          href={`/dashboard/candidates/${app.candidateId}`}
                          className="block truncate font-medium hover:underline after:absolute after:inset-0"
                        >
                          {name}
                        </Link>
                      ) : (
                        <p className="truncate font-medium">{name}</p>
                      )}
                      <p className="text-muted-foreground truncate">
                        {app.jobTitle ?? "Untitled job"}
                      </p>
                    </div>
                    <StageRail stage={app.stage} className="shrink-0" />
                    <span className="text-muted-foreground w-14 shrink-0 text-right font-mono text-xs tabular-nums">
                      {timeAgo(app.stageUpdatedAt ?? app.appliedAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section
          title="Needs attention"
          count={staleApplications.length}
          className="lg:border-l lg:pl-6"
        >
          {staleApplications.length === 0 ? (
            <p className="text-muted-foreground border-t px-6 py-8 text-center text-[13px]">
              Nothing is stale &mdash; the pipeline is moving.
            </p>
          ) : (
            <div className="divide-y border-t">
              {staleApplications.map((app) => {
                const name = app.candidateName ?? "Unknown candidate";
                const days = daysStale(app.stageUpdatedAt ?? app.appliedAt);
                return (
                  <div
                    key={app._id}
                    className="hover:bg-muted/40 relative flex cursor-pointer items-center gap-3 py-2.5 text-[13px] transition-colors"
                  >
                    <InitialsChip name={name} />
                    <div className="min-w-0 flex-1">
                      {app.candidateId ? (
                        <Link
                          href={`/dashboard/candidates/${app.candidateId}`}
                          className="block truncate font-medium hover:underline after:absolute after:inset-0"
                        >
                          {name}
                        </Link>
                      ) : (
                        <p className="truncate font-medium">{name}</p>
                      )}
                      <p className="text-muted-foreground truncate">
                        {app.jobTitle ?? "Untitled job"}
                      </p>
                    </div>
                    <span className="text-stage-offer shrink-0 font-mono text-xs tabular-nums">
                      {days}d stale
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>

      {/* ── AI: the one allowed box - quiet violet-border card ── */}
      {showUpgrade ? (
        <div className="border-ai/30 mt-10 flex flex-col items-start gap-3 rounded-lg border p-5">
          <span className="bg-ai-soft text-ai inline-block rounded-md px-2 py-0.5 text-xs font-semibold">
            AI · Pro
          </span>
          <p className="text-sm">
            <span className="font-semibold">Meet the AI Talent Agent</span>
            <span className="text-muted-foreground">
              {" "}
              &mdash; ask questions across every CV and debrief your agency
              has ever logged.
            </span>
          </p>
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/dashboard/billing" />}
          >
            View plans
          </Button>
        </div>
      ) : (
        <div className="border-ai/30 mt-10 rounded-lg border p-5">
          <h2 className="text-[13px] font-semibold">Ask Hirebase</h2>
          <p className="mt-2 text-sm">
            Your agent is live &mdash; ask it anything from the dock.
          </p>
          <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
            <li>&ldquo;Who moved to offer this week?&rdquo;</li>
            <li>&ldquo;Which candidates mention React in their CV?&rdquo;</li>
          </ul>
        </div>
      )}
    </div>
  );
}
