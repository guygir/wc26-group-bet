"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import { PageHeader, PrimaryButton, StatusPill } from "@/components/ui";
import { t } from "@/lib/i18n";
import type { Team } from "@/lib/types";

type ExistingGroupBet = {
  group_code: string;
  ordered_team_ids: string[];
};

export function GroupBetsForm({
  groups,
  bets,
  firstKickoffs,
}: {
  groups: Record<string, Team[]>;
  bets: ExistingGroupBet[];
  firstKickoffs: Record<string, string>;
}) {
  const reduceMotion = useReducedMotion();
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
  const [now] = useState(() => Date.now());
  const motionTransition = { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const };
  const itemProps = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
      };

  function move(group: string, index: number, direction: -1 | 1) {
    setOrders((current) => {
      const next = new Map(current);
      const order = [...(next.get(group) || [])];
      const target = index + direction;
      if (target < 0 || target >= order.length) return current;
      [order[index], order[target]] = [order[target], order[index]];
      next.set(group, order);
      return next;
    });
  }

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

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.groups.title}
        body={t.groups.body}
        action={
          <PrimaryButton onClick={save} disabled={saving} className="w-full sm:w-auto">
            {saving ? t.groups.saving : t.groups.save}
          </PrimaryButton>
        }
      />

      {message ? <p className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white">{message}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Object.entries(groups).map(([group, teams], groupIndex) => {
          const locked = new Date(firstKickoffs[group]).getTime() <= now;
          const teamById = new Map(teams.map((team) => [team.id, team]));
          const order = orders.get(group) || teams.map((team) => team.id);

          return (
            <motion.section
              key={group}
              className="rounded-[1.75rem] border border-white/80 bg-white/85 p-4 shadow-sm shadow-emerald-900/5 backdrop-blur sm:p-5"
              {...itemProps}
              transition={reduceMotion ? undefined : { ...motionTransition, delay: Math.min(groupIndex * 0.03, 0.25) }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black">{group}</h2>
                <StatusPill locked={locked} labels={{ locked: t.groups.locked, open: t.groups.open }} />
              </div>
              <ol className="mt-4 space-y-3">
                {order.map((teamId, index) => {
                  const team = teamById.get(teamId);
                  if (!team) return null;
                  return (
                    <li key={teamId} className="rounded-2xl bg-emerald-50/70 p-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-sm font-black">
                          {index + 1}
                        </span>
                        <span className="flex-1 text-start font-bold">{team.name}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={locked || index === 0}
                          onClick={() => move(group, index, -1)}
                          className="min-h-10 rounded-full bg-white px-3 py-2 text-sm font-black disabled:opacity-30"
                        >
                          {t.groups.moveUp}
                        </button>
                        <button
                          type="button"
                          disabled={locked || index === order.length - 1}
                          onClick={() => move(group, index, 1)}
                          className="min-h-10 rounded-full bg-white px-3 py-2 text-sm font-black disabled:opacity-30"
                        >
                          {t.groups.moveDown}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </motion.section>
          );
        })}
      </div>
    </div>
  );
}
