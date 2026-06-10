"use client";

import { useEffect, useState } from "react";
import { appLocale } from "@/lib/i18n";
import { formatCountdown } from "@/lib/format";
import { t } from "@/lib/i18n";

export function LockCountdown({ kickoffAt, locked }: { kickoffAt: string; locked: boolean }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (locked) {
    return <p className="text-sm font-bold text-slate-500">{t.matches.locked}</p>;
  }

  const remaining = new Date(kickoffAt).getTime() - now;
  const text = formatCountdown(remaining, appLocale);

  return (
    <p className="text-sm font-bold text-emerald-700">
      {text ? `${t.matches.locksIn} ${text}` : t.matches.open}
    </p>
  );
}
