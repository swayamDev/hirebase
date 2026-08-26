import Link from "next/link";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { requireOrg } from "@/lib/tenant";
import { readClient } from "@/lib/sanity/client";
import { CommandMenu, type CommandEntities } from "@/components/command-menu";
import {
  DashboardNav,
  MobileDashboardNav,
} from "@/components/dashboard-nav";
import { AgentDock } from "@/components/agent/AgentDock";

const COMMAND_ENTITIES_QUERY = `{
  "candidates": *[_type == "candidate" && orgId == $orgId && archived != true] | order(name asc) [0...100] { _id, name, headline },
  "jobs": *[_type == "job" && orgId == $orgId] | order(createdAt desc) [0...100] { _id, title, "companyName": company->name },
  "companies": *[_type == "company" && orgId == $orgId] | order(name asc) [0...100] { _id, name }
}`;

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const { orgId } = await requireOrg();
  const entities = await readClient.fetch<CommandEntities>(
    COMMAND_ENTITIES_QUERY,
    { orgId },
  );

  return (
    <div className="flex flex-1">
      {/* Light rail - a quiet surface step from the content (v4 spec) */}
      <aside className="bg-muted/40 hidden w-[232px] shrink-0 flex-col border-r md:flex">
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <Link
            href="/dashboard"
            className="font-display text-lg font-bold tracking-tight"
          >
            Hirebase<span className="text-ai">.</span>
          </Link>
        </div>
        <div className="px-3 pb-2">
          <OrganizationSwitcher
            hidePersonal
            afterSelectOrganizationUrl="/dashboard"
          />
        </div>
        <CommandMenu entities={entities} />
        <DashboardNav />
        <div className="mt-auto border-t px-4 py-3">
          <UserButton showName />
        </div>
      </aside>

      {/* Work surface */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile: compact bar (rail is md+) */}
        <div className="border-b md:hidden">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <Link
              href="/dashboard"
              className="font-display text-base font-bold tracking-tight"
            >
              Hirebase<span className="text-ai">.</span>
            </Link>
            <div className="flex items-center gap-2">
              <OrganizationSwitcher
                hidePersonal
                afterSelectOrganizationUrl="/dashboard"
              />
              <UserButton />
            </div>
          </div>
          <MobileDashboardNav />
        </div>
        <main className="flex min-w-0 flex-1 flex-col px-5 pb-24 lg:px-8">
          <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col">{children}</div>
        </main>
      </div>

      {/* Floating AI dock - the one violet fixture */}
      <AgentDock />
    </div>
  );
}
