"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { UserAvatar } from "@/components/user-avatar";
import { t } from "@/lib/i18n";

type Row = {
  player: {
    user_id: string;
    nickname: string;
    avatar_url: string | null;
  };
  score: { match: number; group: number };
};

export function LeaderboardTabs({ rows }: { rows: Row[] }) {
  const [tab, setTab] = useState<"match" | "group">("match");

  const sorted = [...rows].sort((a, b) => {
    const key = tab === "match" ? "match" : "group";
    const diff = b.score[key] - a.score[key];
    if (diff) return diff;
    return a.player.nickname.localeCompare(b.player.nickname);
  });

  return (
    <>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("match")}
          className={`min-h-11 flex-1 rounded-full px-4 py-2 text-sm font-black ${
            tab === "match" ? "bg-emerald-600 text-white" : "bg-white/80 text-slate-700"
          }`}
        >
          {t.leaderboard.tabMatches}
        </button>
        <button
          type="button"
          onClick={() => setTab("group")}
          className={`min-h-11 flex-1 rounded-full px-4 py-2 text-sm font-black ${
            tab === "group" ? "bg-emerald-600 text-white" : "bg-white/80 text-slate-700"
          }`}
        >
          {t.leaderboard.tabGroups}
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {sorted.map((row, index) => (
          <Card
            as="article"
            key={row.player.user_id}
            className="motion-rise grid grid-cols-[auto_1fr] items-center gap-4 sm:grid-cols-[auto_auto_1fr_auto]"
          >
            <div className="grid size-12 place-items-center rounded-full bg-emerald-100 text-lg font-black text-emerald-900">
              {index + 1}
            </div>
            <UserAvatar url={row.player.avatar_url} name={row.player.nickname} size="2xl" />
            <h2 className="min-w-0 truncate text-lg font-black sm:text-xl">{row.player.nickname}</h2>
            <p className="col-span-2 rounded-2xl bg-emerald-50 px-4 py-3 text-center text-3xl font-black text-emerald-900 sm:col-span-1 sm:bg-transparent sm:p-0 sm:text-end sm:text-slate-950">
              {tab === "match" ? row.score.match : row.score.group}
            </p>
          </Card>
        ))}
        {!sorted.length ? <Card>{t.leaderboard.empty}</Card> : null}
      </div>
    </>
  );
}
