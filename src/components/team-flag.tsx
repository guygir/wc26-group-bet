import Image from "next/image";
import { flagUrlForTeam } from "@/lib/team-flags";

export function TeamFlag({ name, size = 28 }: { name: string; size?: number }) {
  const url = flagUrlForTeam(name, 40);

  if (!url) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-100 font-black text-emerald-800"
        style={{ width: size, height: size, fontSize: size * 0.35 }}
      >
        {name.slice(0, 1).toUpperCase()}
      </span>
    );
  }

  const height = Math.round(size * 0.75);

  return (
    <span className="relative inline-block shrink-0 overflow-hidden rounded-sm shadow-sm" style={{ width: size, height }}>
      <Image src={url} alt="" fill className="object-cover" sizes={`${size}px`} />
    </span>
  );
}
