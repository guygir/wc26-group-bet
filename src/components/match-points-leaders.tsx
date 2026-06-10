"use client";

import { useState } from "react";
import { UserAvatar } from "@/components/user-avatar";
import { t } from "@/lib/i18n";
import type { ScoreReason } from "@/lib/types";

type Leader = {
  userId: string;
  points: number;
  nickname: string;
  avatarUrl: string | null;
  reasons: ScoreReason[];
};

export function MatchPointsLeaders({ matchId }: { matchId: string }) {
  const [open, setOpen] = useState(false);
  const [leaders, setLeaders] = useState<Leader[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && leaders === null) {
      setLoading(true);
      const response = await fetch(`/api/matches/${matchId}/points-leaders`);
      const payload = (await response.json()) as { leaders?: Leader[] };
      setLeaders(payload.leaders || []);
      setLoading(false);
    }
  }

  return (
    <div className="text-center">
      <button
        type="button"
        onClick={toggle}
        className="text-sm font-bold text-emerald-800 underline-offset-2 hover:underline"
      >
        {open ? t.matches.hideLeaders : t.matches.showLeaders}
      </button>
      {open ? (
        <div className="mt-3">
          {loading ? (
            <p className="text-sm text-slate-500">{t.auth.working}</p>
          ) : !leaders?.length ? (
            <p className="text-sm text-slate-500">{t.matches.noLeaders}</p>
          ) : (
            <ul className="space-y-2">
              {leaders.map((leader, index) => (
                <li
                  key={leader.userId}
                  className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200"
                >
                  <span className="w-5 font-black text-emerald-800">{index + 1}</span>
                  <UserAvatar url={leader.avatarUrl} name={leader.nickname} size="md" />
                  <span className="font-bold text-slate-900">{leader.nickname}</span>
                  <span className="font-black text-emerald-800">
                    {leader.points} {t.matches.pointsShort}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
