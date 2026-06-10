import Image from "next/image";
import { cn } from "@/lib/ui";

const SIZES = {
  md: "size-12",
  lg: "size-16",
  xl: "size-20",
  "2xl": "size-24",
} as const;

type UserAvatarProps = {
  url?: string | null;
  name?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
};

export function UserAvatar({ url, name, size = "lg", className }: UserAvatarProps) {
  const box = SIZES[size];
  const initial = name?.slice(0, 1).toUpperCase() || "?";

  if (!url) {
    return (
      <div
        className={cn(
          "grid shrink-0 place-items-center rounded-full bg-emerald-100 font-black text-emerald-800 ring-2 ring-white",
          box,
          size === "2xl" ? "text-2xl" : size === "xl" ? "text-xl" : "text-base",
          className
        )}
      >
        {initial}
      </div>
    );
  }

  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-full ring-2 ring-white shadow-sm", box, className)}>
      <Image src={url} alt="" fill className="object-cover" sizes="96px" />
    </div>
  );
}
