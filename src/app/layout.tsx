import type { Metadata } from "next";
import { appLocale, localeMeta } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "WC26 Group Bet",
  description: "Friendly World Cup 2026 group-stage betting pool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = localeMeta[appLocale];

  return (
    <html lang={locale.lang} dir={locale.dir} className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
