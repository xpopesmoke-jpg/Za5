import type { Metadata, Viewport } from "next";
import "@fontsource-variable/baloo-2";
import "@fontsource-variable/nunito";
import "../globals.css";
import { LANGS } from "@/i18n/config";
import { I18nProvider } from "@/i18n/client";
import { DICT } from "@/i18n/dictionary";
import { langOf } from "@/i18n/server";

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const lang = langOf((await params).lang);
  return {
    title: "Za5",
    description: DICT[lang].common.appDescription,
    appleWebApp: { capable: true, title: "Za5", statusBarStyle: "default" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef3ff" },
    { media: "(prefers-color-scheme: dark)", color: "#1d1830" },
  ],
};

/** Every screen exists once per language; the proxy picks which one a person gets. */
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const lang = langOf((await params).lang);
  return (
    <html lang={lang} className="h-full antialiased">
      <body className="min-h-full">
        <I18nProvider lang={lang}>{children}</I18nProvider>
      </body>
    </html>
  );
}
