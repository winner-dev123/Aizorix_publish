import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="relative min-h-full flex flex-col bg-white text-[color:var(--color-ink-900)] selection:bg-[color:var(--color-brand-200)] selection:text-[color:var(--color-ink-900)]">
        {children}
      </body>
    </html>
  );
}
