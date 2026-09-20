"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Columns3,
  CreditCard,
  LayoutDashboard,
  Rows3,
  Users,
  UsersRound,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export type NeedsAWordClient = {
  id: string;
  name: string;
  days: number;
};

const NAV = [
  { href: "/dashboard", label: "Today", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: Columns3 },
  { href: "/dashboard/companies", label: "Ledger", icon: Rows3 },
  { href: "/dashboard/jobs", label: "Roles", icon: Briefcase },
  { href: "/dashboard/candidates", label: "Talent pool", icon: Users },
] as const;

const FOOTER_NAV = [
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/org", label: "Team", icon: UsersRound },
] as const;

/**
 * The app rail: shadcn's responsive Sidebar (sheet on mobile, ⌘B collapse)
 * with the ledger design layered on - counts per section, and the "Needs a
 * word" clients whose last movement is going quiet.
 */
export function AppSidebar({
  counts,
  needsAWord,
  orgSwitcher,
  search,
  ask,
  userButton,
  userName,
}: {
  counts: { pipeline: number; ledger: number; roles: number; talent: number };
  needsAWord: NeedsAWordClient[];
  orgSwitcher: ReactNode;
  search: ReactNode;
  ask?: ReactNode;
  userButton: ReactNode;
  userName: string | null;
}) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const badge = (label: string): number | null => {
    if (label === "Pipeline") return counts.pipeline;
    if (label === "Ledger") return counts.ledger;
    if (label === "Roles") return counts.roles;
    if (label === "Talent pool") return counts.talent;
    return null;
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-2 px-4 pt-4 pb-1 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1">
          <Link
            href="/dashboard"
            className="font-display text-lg font-bold tracking-tight"
          >
            <span className="group-data-[collapsible=icon]:hidden">
              Hirebase<span className="text-ai">.</span>
            </span>
            <span className="hidden group-data-[collapsible=icon]:inline">
              H<span className="text-ai">.</span>
            </span>
          </Link>
          <SidebarTrigger className="text-muted-foreground hidden md:flex" />
        </div>
        <div className="-mx-1 group-data-[collapsible=icon]:hidden">
          {orgSwitcher}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="py-0 group-data-[collapsible=icon]:hidden">
          <SidebarGroupContent>
            <div>
              {search}
              {ask}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="pt-0">
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(
                      item.href,
                      "exact" in item && item.exact,
                    )}
                    render={<Link href={item.href} />}
                    tooltip={item.label}
                    className="h-[30px] text-[13px]"
                  >
                    <item.icon className="size-4 shrink-0 opacity-75" />
                    <span className="flex-1">{item.label}</span>
                  </SidebarMenuButton>
                  {badge(item.label) !== null ? (
                    <SidebarMenuBadge className="text-muted-foreground font-mono text-[10.5px] font-normal tabular-nums">
                      {badge(item.label)}
                    </SidebarMenuBadge>
                  ) : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {needsAWord.length > 0 ? (
          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel className="text-muted-foreground/80 font-mono text-[10px] tracking-[0.14em] uppercase">
              Needs a word
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {needsAWord.map((client) => (
                  <SidebarMenuItem key={client.id}>
                    <SidebarMenuButton
                      render={
                        <Link href={`/dashboard/companies/${client.id}`} />
                      }
                      className="h-[27px] text-[12.5px]"
                    >
                      <span
                        className={cn(
                          "size-[5px] shrink-0 rounded-full",
                          client.days > 10 ? "bg-rose-600" : "bg-stage-offer",
                        )}
                      />
                      <span className="flex-1 truncate">{client.name}</span>
                    </SidebarMenuButton>
                    <SidebarMenuBadge
                      className={cn(
                        "font-mono text-[10.5px] font-normal tabular-nums",
                        client.days > 10 ? "text-rose-700" : "text-stage-offer",
                      )}
                    >
                      {client.days}d
                    </SidebarMenuBadge>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>

      <SidebarFooter className="gap-0 px-2 pb-2">
        <SidebarMenu>
          {FOOTER_NAV.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                isActive={isActive(item.href)}
                render={<Link href={item.href} />}
                tooltip={item.label}
                className="h-[30px] text-[13px]"
              >
                <item.icon className="size-4 shrink-0 opacity-75" />
                <span className="flex-1">{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        <div className="mt-1.5 flex items-center gap-2.5 border-t px-2 pt-2.5 pb-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          {userButton}
          {userName ? (
            <span className="min-w-0 truncate text-[12.5px] group-data-[collapsible=icon]:hidden">
              {userName}
            </span>
          ) : null}
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
