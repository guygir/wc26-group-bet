"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { GroupSortableList } from "@/components/group-sortable-list";
import { Card, PrimaryButton } from "@/components/ui";
import { buildGroupStandingsFifa } from "@/lib/group-standings-fifa";
import { t } from "@/lib/i18n";
import type { Match, Team } from "@/lib/types";

type OfficialRow = {
  group_code: string;
  ordered_team_ids: string[];
};

export function AdminGroupStandings({
  groups,
  matchesByGroup,
  officials,
  onMessage,
}: {
  groups: Record<string, Team[]>;
  matchesByGroup: Record<string, Match[]>;
  officials: OfficialRow[];
  onMessage: (message: string) => void;
}) {
  const router = useRouter();
  const officialMap = useMemo(
    () => new Map(officials.map((row) => [row.group_code, row.ordered_team_ids])),
    [officials]
  );

  const liveOrderFor = useCallback(
    (groupCode: string) => {
      const teams = groups[groupCode] || [];
      const computed = buildGroupStandingsFifa(teams, matchesByGroup[groupCode] || []).map((row) => row.teamId);
      return computed.length === 4 ? computed : teams.map((team) => team.id);
    },
    [groups, matchesByGroup]
  );

  const initial = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const group of Object.keys(groups)) {
      const official = officialMap.get(group);
      map.set(group, official?.length === 4 ? official : liveOrderFor(group));
    }
    return map;
  }, [groups, officialMap, liveOrderFor]);

  const [orders, setOrders] = useState(initial);
  const [savingGroup, setSavingGroup] = useState<string | null>(null);
  const [revertingAll, setRevertingAll] = useState(false);

  function persistedOrder(groupCode: string) {
    const official = officialMap.get(groupCode);
    if (official?.length === 4) return official;
    return liveOrderFor(groupCode);
  }

  function setOrder(groupCode: string, order: string[]) {
    setOrders((current) => {
      const next = new Map(current);
      next.set(groupCode, order);
      return next;
    });
  }

  function isDirty(groupCode: string) {
    const current = orders.get(groupCode) || [];
    return current.join() !== persistedOrder(groupCode).join();
  }

  async function saveGroup(groupCode: string) {
    const orderedTeamIds = orders.get(groupCode);
    if (!orderedTeamIds || orderedTeamIds.length !== 4) {
      onMessage("Each group needs four teams");
      return;
    }

    setSavingGroup(groupCode);
    onMessage(`${t.admin.savingGroup} ${groupCode}...`);

    const response = await fetch(`/api/admin/groups/${encodeURIComponent(groupCode)}/standings`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderedTeamIds }),
    });
    const result = (await response.json()) as { error?: string; scoring?: { scores: number } };
    setSavingGroup(null);
    if (response.ok) {
      router.refresh();
      const scored = result.scoring?.scores ?? 0;
      onMessage(`${groupCode}: ${t.admin.groupStandingsSaved} (${scored} ${t.admin.scoreRowsUpdated})`);
    } else {
      onMessage(result.error || t.admin.groupStandingsFailed);
    }
  }

  async function revertGroupToLive(groupCode: string) {
    const hadOverride = officialMap.has(groupCode);
    const wasDirty = isDirty(groupCode);

    if (!hadOverride && !wasDirty) {
      onMessage(t.admin.nothingToRevert);
      return;
    }

    if (!hadOverride) {
      setOrder(groupCode, liveOrderFor(groupCode));
      onMessage(`${groupCode}: ${t.admin.revertLocal}`);
      return;
    }

    setSavingGroup(groupCode);
    onMessage(`${t.admin.revertingGroup} ${groupCode}...`);

    const response = await fetch(`/api/admin/groups/${encodeURIComponent(groupCode)}/reset`, {
      method: "POST",
    });
    const result = (await response.json()) as { error?: string };
    setSavingGroup(null);

    if (response.ok) {
      setOrder(groupCode, liveOrderFor(groupCode));
      router.refresh();
      onMessage(`${groupCode}: ${t.admin.groupStandingsReset}`);
    } else {
      onMessage(result.error || t.admin.groupStandingsFailed);
    }
  }

  async function revertAllToLive() {
    const withOverride = [...officialMap.keys()];
    const dirtyGroups = Object.keys(groups).filter((group) => isDirty(group));

    if (!withOverride.length && !dirtyGroups.length) {
      onMessage(t.admin.nothingToRevert);
      return;
    }

    setRevertingAll(true);
    onMessage(t.admin.revertingAll);

    for (const groupCode of withOverride) {
      const response = await fetch(`/api/admin/groups/${encodeURIComponent(groupCode)}/reset`, {
        method: "POST",
      });
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        setRevertingAll(false);
        onMessage(result.error || t.admin.groupStandingsFailed);
        return;
      }
      setOrder(groupCode, liveOrderFor(groupCode));
    }

    for (const groupCode of dirtyGroups) {
      if (!withOverride.includes(groupCode)) {
        setOrder(groupCode, liveOrderFor(groupCode));
      }
    }

    setRevertingAll(false);
    router.refresh();
    onMessage(t.admin.revertAllDone);
  }

  const groupEntries = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  const anyOverride = officialMap.size > 0;
  const anyDirty = groupEntries.some(([group]) => isDirty(group));

  return (
    <Card as="section">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-black">{t.admin.groupStandings}</h2>
          <p className="mt-2 text-sm text-slate-600">{t.admin.groupStandingsBody}</p>
        </div>
        {(anyOverride || anyDirty) && (
          <button
            type="button"
            disabled={revertingAll || savingGroup !== null}
            onClick={revertAllToLive}
            className="min-h-12 shrink-0 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-950 disabled:opacity-60"
          >
            {revertingAll ? t.admin.revertingAll : t.admin.revertAllToLive}
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {groupEntries.map(([group, teams]) => {
          const order = orders.get(group) || teams.map((team) => team.id);
          const hasOverride = officialMap.has(group);
          const dirty = isDirty(group);
          const busy = savingGroup === group || revertingAll;

          return (
            <div key={group} className="rounded-2xl border border-emerald-100 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-black">{group}</h3>
                <div className="flex flex-wrap gap-1">
                  {hasOverride ? (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-900">
                      {t.admin.groupOverride}
                    </span>
                  ) : null}
                  {dirty ? (
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                      {t.admin.unsavedOrder}
                    </span>
                  ) : null}
                </div>
              </div>

              <GroupSortableList
                groupCode={group}
                teams={teams}
                order={order}
                actualOrder={liveOrderFor(group)}
                onReorder={(nextOrder) => setOrder(group, nextOrder)}
              />

              <div className="mt-3 grid gap-2">
                <PrimaryButton
                  type="button"
                  disabled={busy}
                  onClick={() => saveGroup(group)}
                  className="min-h-12 w-full text-base font-black"
                >
                  {busy ? t.admin.savingGroup : t.admin.saveOverride}
                </PrimaryButton>
                <button
                  type="button"
                  disabled={busy || (!dirty && !hasOverride)}
                  onClick={() => revertGroupToLive(group)}
                  className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t.admin.revertToLive}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
