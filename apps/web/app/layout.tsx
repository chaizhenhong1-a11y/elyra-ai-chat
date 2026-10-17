import type { Metadata } from "next";
import "./globals.css";
import {I18nProvider} from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Conversation",
  description: "A private conversation space",
  other: {
    google: "notranslate",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" translate="no" suppressHydrationWarning>
      <head>
        <meta name="google" content="notranslate" />
        <link rel="preload" href="/api/character-model" as="fetch" crossOrigin="anonymous" />
      </head>
      <body suppressHydrationWarning><I18nProvider>{children}</I18nProvider></body>
    </html>
  );
}
