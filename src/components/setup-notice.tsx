import { t } from "@/lib/i18n";

export function SetupNotice() {
  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
      <h2 className="text-lg font-black">{t.setup.title}</h2>
      <p className="mt-2 text-sm leading-6">{t.setup.body}</p>
    </div>
  );
}
