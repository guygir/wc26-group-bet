"use client";

import Image from "next/image";
import { useState } from "react";

const LOGOS = [
  "/brand/wc26-emblem-primary.png",
  "/brand/wc26-emblem-orange.png",
] as const;

export function BrandLogoPicker() {
  const [index, setIndex] = useState(0);

  function nextLogo() {
    setIndex((current) => (current + 1) % LOGOS.length);
  }

  return (
    <button
      type="button"
      onClick={nextLogo}
      className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white/90 p-1.5 shadow-sm ring-1 ring-emerald-100"
      aria-label="החלפת סמל"
      title="החלפת סמל"
    >
      <Image src={LOGOS[index]} alt="" width={44} height={44} className="h-full w-full object-contain" priority />
    </button>
  );
}
