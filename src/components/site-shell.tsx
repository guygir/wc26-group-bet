import Link from "next/link";
import Image from "next/image";
import { BrandLogoPicker } from "@/components/brand-logo-picker";
import { LogoutButton } from "@/components/logout-button";
import { ProfileAvatarUploader } from "@/components/profile-avatar-uploader";
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
    <div className="relative min-h-screen overflow-x-hidden bg-slate-50 text-slate-950">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <Image
          src="/brand/battalion-240-banner.png"
          alt=""
          fill
          priority
          className="object-cover opacity-[0.7]"
          sizes="100vw"
        />
        <Image
          src="/brand/battalion-240-emblem-transparent.png"
          alt=""
          width={1024}
          height={1024}
          className="absolute left-3 top-24 w-32 opacity-100 sm:left-8 sm:top-24 sm:w-44 lg:left-10 lg:w-56"
        />
        <Image
          src="/brand/wc26-emblem-orange.png"
          alt=""
          width={240}
          height={240}
          className="absolute right-[-0.75rem] top-20 w-36 opacity-50 sm:right-3 sm:top-24 sm:w-48 lg:right-4 lg:w-60"
        />
      </div>
      <header className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-h-12 items-center gap-3 rounded-2xl">
            <BrandLogoPicker />
            <div className="text-start">
              <Link href="/" className="rounded-xl">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-700">{t.shell.eyebrow}</p>
                <p className="text-lg font-black">{t.shell.title}</p>
                <p className="text-sm font-black text-slate-600">{t.shell.unit}</p>
              </Link>
            </div>
          </div>

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
              <ProfileAvatarUploader url={profile.avatar_url} name={profile.nickname} />
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
      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-12 sm:px-5">{children}</main>
    </div>
  );
}
