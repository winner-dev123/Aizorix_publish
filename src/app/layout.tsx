import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { HTML_LANG } from "@/i18n/config";
import { getServerT } from "@/i18n/server";
import { getDictionary } from "@/i18n/dictionaries";
import { LocaleProvider } from "@/i18n/locale-context";
import { getTheme, resolveTheme } from "@/lib/theme";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aizorix AI — CRM SaaS modular con IA",
  description:
    "Plataforma SaaS modular para clínicas y negocios: CRM, IA recepcionista, agenda inteligente, WhatsApp Business y campañas automáticas.",
  metadataBase: new URL("https://aizorix.ai"),
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { locale } = await getServerT();
  const dictionary = getDictionary(locale);
  const themeChoice = await getTheme();
  const resolvedTheme = resolveTheme(themeChoice);

  return (
    <html
      lang={HTML_LANG[locale]}
      data-theme={resolvedTheme}
      data-theme-choice={themeChoice}
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* No-flash script for "system" theme — resolves the user's OS
            preference before paint so visitors who picked Auto don't see
            a brief flash of the default (light) theme. Runs before
            hydration via beforeInteractive. */}
        <Script id="theme-no-flash" strategy="beforeInteractive">
          {`(function(){try{var c=document.documentElement.getAttribute('data-theme-choice');if(c==='system'){var m=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.setAttribute('data-theme',m);}}catch(e){}})();`}
        </Script>
      </head>
      <body className="relative min-h-full flex flex-col bg-[color:var(--color-background)] text-[color:var(--color-foreground)] selection:bg-[color:var(--color-brand-200)] selection:text-[color:var(--color-ink-900)]">
        <LocaleProvider locale={locale} dictionary={dictionary}>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
