import type { ReactNode } from "react";
import { TeamFlag } from "@/components/team-flag";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/ui";
import type { GroupStandingRow } from "@/lib/group-standings-fifa";
import type { Team } from "@/lib/types";

export function groupRowClassName(variant: "neutral" | "correct" | "incorrect", interactive = false) {
  return cn(
    "rounded-2xl p-3",
    variant === "neutral" && "bg-emerald-50/70",
    variant === "correct" && "border-l-4 border-emerald-700 bg-emerald-200",
    variant === "incorrect" && "border-l-4 border-red-800 bg-red-400",
    interactive && "cursor-grab active:cursor-grabbing"
  );
}

function GroupStandingsRowTable({
  betSide = false,
  className,
  children,
}: {
  betSide?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("gs-row-table", betSide && "gs-row-table--bet", className)} dir="ltr">
      {children}
    </div>
  );
}

export function GroupPositionBadge({
  index,
  variant,
}: {
  index: number;
  variant?: "neutral" | "correct" | "incorrect";
}) {
  return (
    <span
      className={cn(
        "gs-rank-badge mx-auto grid h-8 w-8 place-items-center rounded-full text-sm font-black shadow-sm",
        variant === "correct" && "bg-emerald-100 text-emerald-950",
        variant === "incorrect" && "bg-red-200 text-red-950",
        (!variant || variant === "neutral") && "bg-white text-slate-950"
      )}
    >
      {index + 1}
    </span>
  );
}

export function GroupStandingStatsHeader({ betSide = false }: { betSide?: boolean }) {
  return (
    <GroupStandingsRowTable betSide={betSide} className="mb-2 px-1">
      <span className="gs-cell gs-rank" aria-hidden />
      <span className="gs-cell gs-flag" aria-hidden />
      <span className="gs-cell gs-name" aria-hidden />
      <span className="gs-cell gs-stat gs-stat-header">{t.standings.played}</span>
      <span className="gs-cell gs-stat gs-stat-header">{t.standings.pts}</span>
      <span className="gs-cell gs-stat gs-stat-header">{t.standings.gd}</span>
      {betSide ? <span className="gs-cell gs-drag" aria-hidden /> : null}
    </GroupStandingsRowTable>
  );
}

export function GroupTeamRowContent({
  team,
  index,
  stats,
  showStats,
  placement,
  rowVariant = "neutral",
  betSide = false,
  dragHandle,
}: {
  team: Team;
  index: number;
  stats?: GroupStandingRow;
  showStats?: boolean;
  placement?: "correct" | "incorrect";
  rowVariant?: "neutral" | "correct" | "incorrect";
  betSide?: boolean;
  dragHandle?: ReactNode;
}) {
  const variant = placement ?? rowVariant;
  const gd =
    stats && stats.goalDifference > 0 ? `+${stats.goalDifference}` : String(stats?.goalDifference ?? 0);

  return (
    <GroupStandingsRowTable betSide={betSide}>
      <span className="gs-cell gs-rank">
        <GroupPositionBadge index={index} variant={variant} />
      </span>
      <span className="gs-cell gs-flag">
        <TeamFlag name={team.name} size={28} />
      </span>
      <span className="gs-cell gs-name truncate font-bold">{team.name}</span>
      {showStats ? (
        <>
          <span className="gs-cell gs-stat text-slate-700">{stats?.played ?? 0}</span>
          <span className="gs-cell gs-stat text-slate-950">{stats?.points ?? 0}</span>
          <span className="gs-cell gs-stat text-slate-700">{gd}</span>
        </>
      ) : placement ? (
        <>
          <span className="gs-cell gs-stat" aria-hidden />
          <span
            className={cn(
              "gs-cell gs-stat text-sm font-black",
              placement === "correct" ? "text-emerald-950" : "text-red-950"
            )}
            aria-hidden
          >
            {placement === "correct" ? "✓" : "✗"}
          </span>
          <span className="gs-cell gs-stat" aria-hidden />
        </>
      ) : (
        <>
          <span className="gs-cell gs-stat text-slate-400">0</span>
          <span className="gs-cell gs-stat text-slate-400">0</span>
          <span className="gs-cell gs-stat text-slate-400">0</span>
        </>
      )}
      {betSide ? <span className="gs-cell gs-drag text-xs font-bold text-slate-500">{dragHandle}</span> : null}
    </GroupStandingsRowTable>
  );
}
