"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { defaultSiteConfig, SITE_CONFIG_STORAGE_KEY, type SiteConfig } from "@/lib/site-config";

type SiteConfigContextValue = {
  config: SiteConfig;
  updateConfig: (next: SiteConfig) => void;
  resetConfig: () => void;
  ready: boolean;
};

const SiteConfigContext = createContext<SiteConfigContextValue | null>(null);

export function SiteConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState(defaultSiteConfig);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SITE_CONFIG_STORAGE_KEY);
      if (stored) setConfig({ ...defaultSiteConfig, ...JSON.parse(stored) });
    } catch {
      // Invalid local preview data falls back to safe defaults.
    } finally {
      setReady(true);
    }
  }, []);

  const value = useMemo<SiteConfigContextValue>(() => ({
    config,
    ready,
    updateConfig(next) {
      setConfig(next);
      window.localStorage.setItem(SITE_CONFIG_STORAGE_KEY, JSON.stringify(next));
    },
    resetConfig() {
      setConfig(defaultSiteConfig);
      window.localStorage.removeItem(SITE_CONFIG_STORAGE_KEY);
    },
  }), [config, ready]);

  return <SiteConfigContext.Provider value={value}>{children}</SiteConfigContext.Provider>;
}

export function useSiteConfig() {
  const value = useContext(SiteConfigContext);
  if (!value) throw new Error("useSiteConfig must be used inside SiteConfigProvider");
  return value;
}
