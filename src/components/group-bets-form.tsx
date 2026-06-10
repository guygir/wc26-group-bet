"use client";

import { useEffect, useMemo, useState } from "react";
import { GroupLiveStandingsList } from "@/components/group-live-standings-list";
import { GroupSortableList } from "@/components/group-sortable-list";
import { ScoringRulesPanel } from "@/components/scoring-rules-panel";
import { PageHeader, PrimaryButton, StatusPill, saveButtonClassName } from "@/components/ui";
import { appLocale, t } from "@/lib/i18n";
import { formatCountdown } from "@/lib/format";
import type { GroupStandingRow } from "@/lib/group-standings-fifa";
import type { Team } from "@/lib/types";

type ExistingGroupBet = {
  group_code: string;
  ordered_team_ids: string[];
};

const GROUP_ORDER = [
  "Group A",
  "Group B",
  "Group C",
  "Group D",
  "Group E",
  "Group F",
  "Group G",
  "Group H",
  "Group I",
  "Group J",
  "Group K",
  "Group L",
] as const;

export function GroupBetsForm({
  groups,
  bets,
  firstKickoffs,
  liveOrderByGroup,
  statsByGroup,
  pointsByGroup,
  overrideGroups,
}: {
  groups: Record<string, Team[]>;
  bets: ExistingGroupBet[];
  firstKickoffs: Record<string, string>;
  liveOrderByGroup: Record<string, string[]>;
  statsByGroup: Record<string, Record<string, GroupStandingRow>>;
  pointsByGroup: Record<string, number>;
  overrideGroups: string[];
}) {
  const initial = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const [group, teams] of Object.entries(groups)) {
      map.set(group, teams.map((team) => team.id));
    }
    for (const bet of bets) {
      map.set(bet.group_code, bet.ordered_team_ids);
    }
    return map;
  }, [bets, groups]);

  const [orders, setOrders] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  const earliestKickoff = useMemo(() => {
    const times = Object.values(firstKickoffs).map((iso) => new Date(iso).getTime()).filter(Number.isFinite);
    return times.length ? Math.min(...times) : null;
  }, [firstKickoffs]);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const startId = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(startId);
      window.clearInterval(id);
    };
  }, []);

  const globalLocked = earliestKickoff !== null && now !== null && earliestKickoff <= now;

  async function save() {
    setSaving(true);
    setMessage(null);
    const payload = [...orders.entries()].map(([groupCode, orderedTeamIds]) => ({ groupCode, orderedTeamIds }));
    const response = await fetch("/api/bets/groups", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ bets: payload }),
    });
    const result = (await response.json()) as { error?: string; saved?: number };
    setSaving(false);
    setMessage(response.ok ? `${result.saved || 0} ${t.groups.saved}` : result.error || "Could not save groups");
  }

  const globalCountdown =
    earliestKickoff && now !== null && !globalLocked ? formatCountdown(earliestKickoff - now, appLocale) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.groups.title}
        body={t.groups.bodyMerged}
        action={
          <PrimaryButton onClick={save} disabled={saving} className={saveButtonClassName}>
            {saving ? t.groups.saving : t.groups.save}
          </PrimaryButton>
        }
      />

      <ScoringRulesPanel variant="group" />

      <div className="rounded-2xl border border-emerald-100 bg-white/95 px-4 py-3 text-sm leading-relaxed text-slate-600">
        <p>{t.groups.compareHint}</p>
        <p className="mt-2">{t.groups.colorHint}</p>
        <p className="mt-2">{t.groups.dragHint}</p>
      </div>

      {earliestKickoff ? (
        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-center text-sm font-bold text-emerald-800">
          {globalLocked
            ? t.matches.locked
            : globalCountdown
              ? `${t.groups.locksIn} ${globalCountdown}`
              : t.matches.open}
        </p>
      ) : null}

      {message ? (
        <p className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white" role="status">
          {message}
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        {GROUP_ORDER.map((group) => {
          const teams = groups[group];
          if (!teams?.length) return null;

          const locked = now !== null && new Date(firstKickoffs[group]).getTime() <= now;
          const order = orders.get(group) || teams.map((team) => team.id);
          const liveOrder = liveOrderByGroup[group] || teams.map((team) => team.id);
          const hasOverride = overrideGroups.includes(group);
          const userPoints = pointsByGroup[group];

          return (
            <section
              key={group}
              className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-black text-slate-900">{group}</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill locked={locked} labels={{ locked: t.groups.locked, open: t.groups.open }} />
                  {hasOverride ? (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-900">
                      {t.groups.adminOverride}
                    </span>
                  ) : null}
                  {userPoints !== undefined ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                      {t.groups.yourPoints}: {userPoints}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2" dir="ltr">
                <div className="min-w-0 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3 sm:p-4">
                  <p className="mb-3 text-center text-sm font-black text-emerald-800">{t.groups.liveTable}</p>
                  <GroupLiveStandingsList
                    teams={teams}
                    order={liveOrder}
                    statsByTeamId={statsByGroup[group] || {}}
                  />
                </div>

                <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4">
                  <p className="mb-3 text-center text-sm font-black text-slate-800">{t.groups.yourBet}</p>
                  <GroupSortableList
                    groupCode={group}
                    teams={teams}
                    order={order}
                    actualOrder={liveOrder}
                    locked={locked}
                    onReorder={(nextOrder) => {
                      setOrders((current) => {
                        const next = new Map(current);
                        next.set(group, nextOrder);
                        return next;
                      });
                    }}
                  />
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
