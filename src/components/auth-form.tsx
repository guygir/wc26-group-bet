"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/ui";
import { t } from "@/lib/i18n";

type AuthMode = "login" | "signup";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nickname, password }),
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error || "Something went wrong");
      setLoading(false);
      return;
    }

    if (mode === "signup" && avatar) {
      const formData = new FormData();
      formData.set("avatar", avatar);
      await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="motion-rise space-y-4 rounded-[1.75rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-emerald-900/10 backdrop-blur sm:p-6"
    >
      <div>
        <label className="text-sm font-semibold text-slate-700" htmlFor="nickname">
          {t.auth.name}
        </label>
        <input
          id="nickname"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-slate-900 outline-none ring-emerald-500/20 transition focus:ring-4"
          autoComplete="username"
          required
          minLength={2}
          maxLength={30}
          placeholder={t.auth.nicknamePlaceholder}
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-slate-700" htmlFor="password">
          {t.auth.password}
        </label>
        <input
          id="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-slate-900 outline-none ring-emerald-500/20 transition focus:ring-4"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          type="password"
          required
          minLength={6}
          placeholder={t.auth.passwordPlaceholder}
        />
      </div>

      {mode === "signup" ? (
        <div>
          <label className="text-sm font-semibold text-slate-700" htmlFor="avatar">
            {t.auth.avatar} <span className="font-normal text-slate-400">({t.auth.optional})</span>
          </label>
          <input
            id="avatar"
            onChange={(event) => setAvatar(event.target.files?.[0] || null)}
            className="mt-2 min-h-12 w-full rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm text-slate-700"
            type="file"
            accept="image/*"
          />
        </div>
      ) : null}

      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}

      <PrimaryButton disabled={loading} className="w-full" type="submit">
        {loading ? t.auth.working : mode === "login" ? t.auth.loginSubmit : t.auth.signupSubmit}
      </PrimaryButton>
    </form>
  );
}
