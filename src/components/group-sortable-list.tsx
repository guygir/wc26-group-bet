"use client";

import { GroupTeamRowContent, groupRowClassName } from "@/components/group-team-row";
import type { Team } from "@/lib/types";

function moveItem(order: string[], from: number, to: number) {
  const next = [...order];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function TeamOrderButtons({
  index,
  count,
  locked,
  onMove,
}: {
  index: number;
  count: number;
  locked: boolean;
  onMove: (nextIndex: number) => void;
}) {
  return (
    <span className="flex items-center justify-center gap-1">
      <button
        type="button"
        disabled={locked || index === 0}
        onClick={() => onMove(index - 1)}
        className="grid size-7 place-items-center rounded-full bg-white text-sm font-black text-slate-700 ring-1 ring-slate-200 disabled:cursor-not-allowed disabled:opacity-35"
        aria-label="Move up"
      >
        ↑
      </button>
      <button
        type="button"
        disabled={locked || index === count - 1}
        onClick={() => onMove(index + 1)}
        className="grid size-7 place-items-center rounded-full bg-white text-sm font-black text-slate-700 ring-1 ring-slate-200 disabled:cursor-not-allowed disabled:opacity-35"
        aria-label="Move down"
      >
        ↓
      </button>
    </span>
  );
}

function TeamOrderRow({
  team,
  index,
  locked,
  placement,
  count,
  onMove,
}: {
  team: Team;
  index: number;
  locked: boolean;
  placement: "correct" | "incorrect";
  count: number;
  onMove: (nextIndex: number) => void;
}) {
  const visiblePlacement = locked ? placement : undefined;
  const rowVariant = locked ? placement : "bet-open";

  return (
    <li className={groupRowClassName(rowVariant)}>
      <GroupTeamRowContent
        team={team}
        index={index}
        placement={visiblePlacement}
        rowVariant={rowVariant}
        betSide
        dragHandle={<TeamOrderButtons index={index} count={count} locked={locked} onMove={onMove} />}
      />
    </li>
  );
}

export function GroupSortableList({
  teams,
  order,
  actualOrder,
  locked,
  onReorder,
}: {
  groupCode: string;
  teams: Team[];
  order: string[];
  actualOrder: string[];
  locked?: boolean;
  onReorder: (nextOrder: string[]) => void;
}) {
  const isLocked = locked ?? false;
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const orderedTeams = order.map((id) => teamById.get(id)).filter(Boolean) as Team[];

  function placementAt(index: number, teamId: string): "correct" | "incorrect" {
    const actualId = actualOrder[index];
    if (!actualId) return "incorrect";
    return actualId === teamId ? "correct" : "incorrect";
  }

  function moveTeam(fromIndex: number, toIndex: number) {
    if (isLocked || toIndex < 0 || toIndex >= order.length) return;
    onReorder(moveItem(order, fromIndex, toIndex));
  }

  return (
    <ol className="space-y-2">
      {orderedTeams.map((team, index) => (
        <TeamOrderRow
          key={team.id}
          team={team}
          index={index}
          locked={isLocked}
          placement={placementAt(index, team.id)}
          count={orderedTeams.length}
          onMove={(nextIndex) => moveTeam(index, nextIndex)}
        />
      ))}
    </ol>
  );
}
