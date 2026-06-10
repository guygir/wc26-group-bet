import Link from "next/link";
import type { ButtonHTMLAttributes, ElementType, ReactNode } from "react";
import { cn } from "@/lib/ui";

export function Card<T extends ElementType = "div">({
  children,
  className,
  as,
}: {
  children: ReactNode;
  className?: string;
  as?: T;
}) {
  const Component = as || "div";
  return (
    <Component
      className={cn(
        "rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5",
        className
      )}
    >
      {children}
    </Component>
  );
}

export function PageHeader({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 text-start">
        <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
        {body ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">{body}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </Card>
  );
}

export function StatusPill({
  locked,
  labels = { locked: "Locked", open: "Open" },
}: {
  locked: boolean;
  labels?: { locked: string; open: string };
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-full px-3 py-1 text-xs font-bold",
        locked ? "bg-slate-200 text-slate-700" : "bg-emerald-100 text-emerald-800"
      )}
    >
      {locked ? labels.locked : labels.open}
    </span>
  );
}

export const saveButtonClassName =
  "min-h-14 w-full text-lg font-black sm:w-auto sm:min-w-[14rem]";

export function PrimaryButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "min-h-12 rounded-2xl bg-emerald-600 px-5 py-3 text-center font-bold text-white shadow-lg shadow-emerald-700/15 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60",
        "hover:bg-emerald-700",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function CtaLink({
  href,
  children,
  subtle = false,
  className,
}: {
  href: string;
  children: ReactNode;
  subtle?: boolean;
  className?: string;
}) {
  return (
    <Link
      className={cn(
        "inline-flex min-h-12 items-center justify-center rounded-2xl px-5 py-3 text-center font-black active:scale-[0.99]",
        subtle ? "bg-white/10 text-white ring-1 ring-white/20" : "bg-emerald-400 text-slate-950",
        className
      )}
      href={href}
    >
      {children}
    </Link>
  );
}
