"use client";

import { ChartNoAxesGantt, LayoutGrid } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useParamNavigate } from "@/components/filter-chips";

/** Icons live here - server pages pass names, not component functions. */
const ICONS = {
  grid: LayoutGrid,
  timeline: ChartNoAxesGantt,
} as const;

/** Segmented icon toggle bound to a URL search param (default value = no param). */
export function ViewToggle({
  param = "view",
  defaultValue,
  options,
}: {
  param?: string;
  defaultValue: string;
  options: { value: string; label: string; icon: keyof typeof ICONS }[];
}) {
  const searchParams = useSearchParams();
  const navigate = useParamNavigate();
  const current = searchParams.get(param) ?? defaultValue;

  return (
    <ToggleGroup
      value={[current]}
      spacing={0}
      variant="outline"
      size="sm"
      aria-label="Switch view"
      onValueChange={(groupValue: string[]) => {
        const next = groupValue.find((value) => value !== current);
        if (!next) return; // re-clicking the active view is a no-op
        navigate(param, next === defaultValue ? null : next);
      }}
    >
      {options.map((option) => {
        const Icon = ICONS[option.icon];
        return (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            aria-label={option.label}
            title={option.label}
          >
            <Icon />
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
