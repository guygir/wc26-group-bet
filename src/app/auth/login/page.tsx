import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { t } from "@/lib/i18n";

export default function LoginPage() {
  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_top_left,#bbf7d0,transparent_34%),linear-gradient(135deg,#f8fafc,#ecfdf5)] text-slate-950">
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-4 py-10 sm:px-6 sm:py-12">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-700">WC26 pool</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{t.auth.loginTitle}</h1>
        <p className="mt-3 text-slate-600">{t.auth.loginBody}</p>
        <div className="mt-8">
          <AuthForm mode="login" />
        </div>
        <p className="mt-6 text-center text-sm text-slate-600">
          {t.auth.newHere}{" "}
          <Link className="font-bold text-emerald-700" href="/auth/signup">
            {t.auth.signupSubmit}
          </Link>
        </p>
      </main>
    </div>
  );
}
