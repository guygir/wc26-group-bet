export function formatCountdown(ms: number, locale: string) {
  if (ms <= 0) return null;

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (locale.startsWith("he")) {
    if (days > 0) return `${days} ימים ${hours} שעות`;
    if (hours > 0) return `${hours} שעות ${minutes} דקות`;
    return `${minutes} דקות ${seconds} שניות`;
  }

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

export function formatKickoff(iso: string, locale: string) {
  return new Date(iso).toLocaleString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
