"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface NetworkContextType {
  isOnline: boolean;
  isServerDown: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
  retryConnection: () => Promise<boolean>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isServerDown, setIsServerDown] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkServerHealth = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return true;
    if (!navigator.onLine) {
      setIsOnline(false);
      setIsServerDown(true);
      return false;
    }

    setIsChecking(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch("/api/health", {
        method: "GET",
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timeoutId);

      const isHealthy = res.ok;
      setIsServerDown(!isHealthy);
      setIsOnline(true);
      setLastChecked(new Date());
      return isHealthy;
    } catch {
      setIsServerDown(true);
      setLastChecked(new Date());
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      checkServerHealth();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsServerDown(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check
    checkServerHealth();

    // Periodic check every 30 seconds
    const interval = setInterval(checkServerHealth, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [checkServerHealth]);

  return (
    <NetworkContext.Provider
      value={{
        isOnline,
        isServerDown,
        isChecking,
        lastChecked,
        retryConnection: checkServerHealth,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return context;
}

