import {
  GroupStandingStatsHeader,
  GroupTeamRowContent,
  groupRowClassName,
} from "@/components/group-team-row";
import type { GroupStandingRow } from "@/lib/group-standings-fifa";
import type { Team } from "@/lib/types";

export function GroupLiveStandingsList({
  teams,
  order,
  statsByTeamId,
}: {
  teams: Team[];
  order: string[];
  statsByTeamId: Record<string, GroupStandingRow>;
}) {
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const orderedTeams = order.map((id) => teamById.get(id)).filter(Boolean) as Team[];

  return (
    <div>
      <GroupStandingStatsHeader />
      <ol className="space-y-2">
        {orderedTeams.map((team, index) => (
          <li key={team.id} className={groupRowClassName("neutral")}>
            <GroupTeamRowContent team={team} index={index} stats={statsByTeamId[team.id]} showStats />
          </li>
        ))}
      </ol>
    </div>
  );
}
