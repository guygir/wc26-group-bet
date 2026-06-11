"use client";

import { useEffect, useState } from "react";
import { UserAvatar } from "@/components/user-avatar";
import { t } from "@/lib/i18n";

type ExactHitter = {
  userId: string;
  points: number;
  nickname: string;
  avatarUrl: string | null;
};

export function MatchPointsLeaders({ matchId }: { matchId: string }) {
  const [exactHitters, setExactHitters] = useState<ExactHitter[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadExactHitters() {
      const response = await fetch(`/api/matches/${matchId}/points-leaders`);
      const payload = (await response.json()) as { exactHitters?: ExactHitter[] };
      if (!cancelled) {
        setExactHitters(payload.exactHitters || []);
      }
    }

    loadExactHitters().catch(() => {
      if (!cancelled) {
        setExactHitters([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [matchId]);

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
      <span className="font-black text-emerald-900">{t.matches.exactHitters}</span>
      {exactHitters === null ? (
        <span className="text-slate-500">{t.auth.working}</span>
      ) : exactHitters.length ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {exactHitters.map((hitter) => (
            <span
              key={hitter.userId}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 py-1 pl-2 pr-1 text-xs font-black text-emerald-950 ring-1 ring-emerald-100"
            >
              <span className="max-w-24 truncate">{hitter.nickname}</span>
              <UserAvatar url={hitter.avatarUrl} name={hitter.nickname} size="md" className="ring-2 ring-emerald-200" />
            </span>
          ))}
        </div>
      ) : (
        <span className="font-bold text-slate-400">—</span>
      )}
    </div>
  );
}
