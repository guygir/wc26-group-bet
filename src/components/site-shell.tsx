import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { UserAvatar } from "@/components/user-avatar";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/ui";

type SiteShellProps = {
  children: React.ReactNode;
  profile?: {
    nickname?: string | null;
    avatar_url?: string | null;
  } | null;
};

export function SiteShell({ children, profile }: SiteShellProps) {
  const navItems = [
    { href: "/matches", label: t.shell.matches },
    { href: "/groups", label: t.shell.groups },
    { href: "/leaderboard", label: t.shell.leaderboard },
    { href: "/admin", label: t.shell.admin },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,#bbf7d0,transparent_34%),linear-gradient(135deg,#f8fafc,#ecfdf5)] text-slate-950">
      <header className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex min-h-12 items-center gap-3 rounded-2xl">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-xl font-black text-white">
              26
            </div>
            <div className="text-start">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-700">{t.shell.eyebrow}</p>
              <p className="text-lg font-black">{t.shell.title}</p>
            </div>
          </Link>

          {!profile ? (
            <Link
              className="inline-flex min-h-11 items-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white lg:hidden"
              href="/auth/login"
            >
              {t.shell.signIn}
            </Link>
          ) : null}
        </div>

        <nav
          aria-label="Main navigation"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 text-sm font-bold sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-white/80 px-4 py-2 shadow-sm hover:bg-white"
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

          {profile ? (
            <div className="flex min-w-0 items-center gap-4 rounded-3xl bg-white/60 p-2 shadow-sm lg:bg-transparent lg:p-0 lg:shadow-none">
              <UserAvatar url={profile.avatar_url} name={profile.nickname} size="2xl" />
              <span className="truncate text-lg font-black sm:text-xl">{profile.nickname}</span>
              <LogoutButton />
            </div>
        ) : (
          <Link
            className={cn("hidden min-h-11 items-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white lg:inline-flex")}
            href="/auth/login"
          >
            {t.shell.signIn}
          </Link>
        )}
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-5">{children}</main>
    </div>
  );
}
