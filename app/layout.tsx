import type { Metadata } from "next";
import "./globals.css";
import { SiteConfigProvider } from "@/components/site-config-provider";

export const metadata: Metadata = {
  title: "Conversation Space",
  description: "A configurable conversation experience.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><SiteConfigProvider>{children}</SiteConfigProvider></body></html>;
}
