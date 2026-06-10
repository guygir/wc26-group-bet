"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GroupStandingStatsHeader,
  GroupTeamRowContent,
  groupRowClassName,
} from "@/components/group-team-row";
import { cn } from "@/lib/ui";
import type { Team } from "@/lib/types";

function dndContextId(groupCode: string) {
  return `group-${groupCode.replace(/\s+/g, "-").toLowerCase()}`;
}

function SortableTeamRow({
  team,
  index,
  locked,
  placement,
}: {
  team: Team;
  index: number;
  locked: boolean;
  placement: "correct" | "incorrect";
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: team.id,
    disabled: locked,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={groupRowClassName(placement, !locked)}
      {...attributes}
      {...listeners}
    >
      <GroupTeamRowContent
        team={team}
        index={index}
        placement={placement}
        rowVariant={placement}
        betSide
        dragHandle={
          <span className="text-center text-xs font-bold text-slate-500" aria-hidden={locked}>
            {!locked ? "⋮⋮" : ""}
          </span>
        }
      />
    </li>
  );
}

export function GroupSortableList({
  groupCode,
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const teamById = new Map(teams.map((team) => [team.id, team]));
  const orderedTeams = order.map((id) => teamById.get(id)).filter(Boolean) as Team[];

  function placementAt(index: number, teamId: string): "correct" | "incorrect" {
    const actualId = actualOrder[index];
    if (!actualId) return "incorrect";
    return actualId === teamId ? "correct" : "incorrect";
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = order.indexOf(String(active.id));
    const newIndex = order.indexOf(String(over.id));
    onReorder(arrayMove(order, oldIndex, newIndex));
  }

  return (
    <DndContext
      id={dndContextId(groupCode)}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <GroupStandingStatsHeader betSide />
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <ol className="space-y-2">
          {orderedTeams.map((team, index) => (
            <SortableTeamRow
              key={team.id}
              team={team}
              index={index}
              locked={isLocked}
              placement={placementAt(index, team.id)}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
