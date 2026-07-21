import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { cn } from "@acme/ui";
import { ThemeProvider } from "@acme/ui/theme";
import { Toaster } from "@acme/ui/toast";

import { env } from "~/env";
import { TRPCReactProvider } from "~/trpc/react";

import "~/app/styles.css";

import { SiteFooter, SiteNav } from "./_components/site-nav";

export const metadata: Metadata = {
  metadataBase: new URL(
    env.VERCEL_ENV === "production"
      ? "https://turbo.t3.gg"
      : "http://localhost:3000",
  ),
  title: {
    default: "Curio — Curate the things you love, with credit",
    template: "%s",
  },
  description:
    "A social platform for building public collections around your taste — art, music, films, writing — with every item linked back to its source.",
  openGraph: {
    title: "Curio — Curate the things you love, with credit",
    description:
      "A social platform for building public collections around your taste — art, music, films, writing — with every item linked back to its source.",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "bg-background text-foreground min-h-screen font-sans antialiased",
          geistSans.variable,
          geistMono.variable,
        )}
      >
        <ThemeProvider>
          <TRPCReactProvider>
            <div className="mx-auto px-6">
              <SiteNav />
              {props.children}
              <SiteFooter />
            </div>
          </TRPCReactProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
