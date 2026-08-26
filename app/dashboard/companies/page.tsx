import Link from "next/link";
import { Building2, ExternalLink } from "lucide-react";
import { requireOrg } from "@/lib/tenant";
import { readClient } from "@/lib/sanity/client";
import { type Stage } from "@/sanity/schemas/stages";
import { FilterSelect } from "@/components/filter-chips";
import { InitialsChip } from "@/components/initials-chip";
import { StageMixBar } from "@/components/stage-mix-bar";
import { PageHeader } from "@/components/shell/panels";
import { Button } from "@/components/ui/button";

type CompanyRow = {
  _id: string;
  name: string;
  website: string | null;
  industry: string | null;
  openJobs: number;
  stageCounts: Partial<Record<Stage, number>>;
};

const COMPANIES_QUERY = `*[_type == "company" && orgId == $orgId] | order(_createdAt desc) {
  _id,
  name,
  website,
  industry,
  "openJobs": count(*[_type == "job" && orgId == $orgId && status == "open" && company._ref == ^._id]),
  "stageCounts": {
    "applied": count(*[_type == "application" && orgId == $orgId && stage == "applied" && job->company._ref == ^._id]),
    "screening": count(*[_type == "application" && orgId == $orgId && stage == "screening" && job->company._ref == ^._id]),
    "interviewing": count(*[_type == "application" && orgId == $orgId && stage == "interviewing" && job->company._ref == ^._id]),
    "offer": count(*[_type == "application" && orgId == $orgId && stage == "offer" && job->company._ref == ^._id]),
    "hired": count(*[_type == "application" && orgId == $orgId && stage == "hired" && job->company._ref == ^._id]),
    "rejected": count(*[_type == "application" && orgId == $orgId && stage == "rejected" && job->company._ref == ^._id])
  }
}`;

function displayUrl(website: string) {
  return website.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orgId } = await requireOrg();
  const { industry } = await searchParams;

  const companies = await readClient.fetch<CompanyRow[]>(COMPANIES_QUERY, {
    orgId,
  });

  const industries = Array.from(
    new Set(
      companies
        .map((company) => company.industry)
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const activeIndustry =
    typeof industry === "string" && industries.includes(industry)
      ? industry
      : null;

  const visibleCompanies = activeIndustry
    ? companies.filter((company) => company.industry === activeIndustry)
    : companies;

  return (
    <div className="flex flex-col pb-4">
      <PageHeader
        eyebrow="Client desk"
        title="Companies"
        description="The client companies your agency recruits for."
        actions={
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/dashboard/companies/new" />}
          >
            Add company
          </Button>
        }
      />

      {/* ── Slim toolbar: industry filter + count mono ── */}
      <div className="mt-2 flex items-center justify-between gap-3 pb-2">
        <FilterSelect
          param="industry"
          options={industries.map((value) => ({ value, label: value }))}
          placeholder="All industries"
        />
        <span className="text-muted-foreground font-mono text-xs tabular-nums whitespace-nowrap">
          {visibleCompanies.length}{" "}
          {visibleCompanies.length === 1 ? "client" : "clients"}
        </span>
      </div>

      {companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 border-t px-6 py-14 text-center">
          <Building2
            className="text-muted-foreground size-4"
            aria-hidden="true"
          />
          <p className="text-muted-foreground text-[13px]">
            No companies yet - add your first client to start opening jobs.
          </p>
          <Button
            className="mt-1"
            size="sm"
            nativeButton={false}
            render={<Link href="/dashboard/companies/new" />}
          >
            Add company
          </Button>
        </div>
      ) : visibleCompanies.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 border-t px-6 py-14 text-center">
          <p className="text-muted-foreground text-[13px]">
            No companies match this industry.
          </p>
        </div>
      ) : (
        <div className="divide-y border-t">
          {visibleCompanies.map((company) => (
            <div
              key={company._id}
              className="hover:bg-muted/40 relative flex cursor-pointer items-center gap-3 py-2.5 text-[13px] transition-colors"
            >
              <InitialsChip name={company.name} size="md" />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/dashboard/companies/${company._id}`}
                  className="text-sm font-medium hover:underline"
                >
                  {company.name}
                  <span className="absolute inset-0" aria-hidden />
                </Link>
                <p className="text-muted-foreground truncate text-xs">
                  {company.industry ?? "-"}
                </p>
              </div>
              <StageMixBar
                counts={company.stageCounts}
                className="hidden w-28 shrink-0 md:flex"
              />
              <span className="text-muted-foreground w-16 shrink-0 text-right font-mono text-xs tabular-nums">
                {company.openJobs} open
              </span>
              <div className="flex w-6 shrink-0 justify-center">
                {company.website ? (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${displayUrl(company.website)}`}
                    title={displayUrl(company.website)}
                    className="text-muted-foreground hover:text-foreground relative z-10 transition-colors"
                  >
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                ) : (
                  <span className="text-muted-foreground text-xs">-</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
