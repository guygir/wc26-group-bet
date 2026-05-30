import { getOpenFootballUrl } from "@/lib/env";
import type { GroupCode, OpenFootballMatch, OpenFootballPayload } from "@/lib/types";

const GROUP_RE = /^Group [A-L]$/;

export function isGroupCode(value: string | undefined): value is GroupCode {
  return Boolean(value && GROUP_RE.test(value));
}

export function isGroupStageMatch(match: Pick<OpenFootballMatch, "group">) {
  return isGroupCode(match.group);
}

export function sourceKeyForMatch(match: OpenFootballMatch, index: number) {
  const num = match.num ? `m${match.num}` : `i${index + 1}`;
  return `${match.date}-${num}-${match.team1}-${match.team2}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function kickoffIso(date: string, time?: string) {
  if (!time) {
    return `${date}T00:00:00.000Z`;
  }

  const match = time.match(/^(\d{1,2}):(\d{2})(?:\s+UTC([+-]\d{1,2}))?$/);
  if (!match) {
    return `${date}T00:00:00.000Z`;
  }

  const [, hh, mm, offsetText] = match;
  const offset = offsetText ? Number(offsetText) : 0;
  const utcHour = Number(hh) - offset;
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day, utcHour, Number(mm), 0, 0));
  return value.toISOString();
}

export async function fetchOpenFootballFixtures(): Promise<OpenFootballPayload> {
  const response = await fetch(getOpenFootballUrl(), {
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`OpenFootball fetch failed: ${response.status}`);
  }

  const payload = (await response.json()) as OpenFootballPayload;
  if (!payload.matches?.length) {
    throw new Error("OpenFootball payload did not include matches");
  }

  return payload;
}
