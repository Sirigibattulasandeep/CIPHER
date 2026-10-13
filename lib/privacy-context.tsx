"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { playCyberClick } from "./sound";

interface PrivacyContextType {
  isPrivacyMode: boolean;
  togglePrivacyMode: () => void;
  maskText: (text: string, keepChars?: number) => string;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sentrix_privacy_mode");
    if (saved === "true") {
      setIsPrivacyMode(true);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+P or Option+P toggles privacy shield
      if (e.altKey && (e.key === "p" || e.key === "P" || e.code === "KeyP")) {
        e.preventDefault();
        setIsPrivacyMode((prev) => {
          const next = !prev;
          localStorage.setItem("sentrix_privacy_mode", String(next));
          playCyberClick();
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const togglePrivacyMode = () => {
    setIsPrivacyMode((prev) => {
      const next = !prev;
      localStorage.setItem("sentrix_privacy_mode", String(next));
      playCyberClick();
      return next;
    });
  };

  const maskText = (text: string, keepChars = 2): string => {
    if (!isPrivacyMode || !text) return text;
    if (text.length <= keepChars + 1) return "***";
    const prefix = text.slice(0, keepChars);
    const suffix = text.length > 8 ? text.slice(-2) : "";
    return `${prefix}••••••${suffix}`;
  };

  return (
    <PrivacyContext.Provider
      value={{
        isPrivacyMode,
        togglePrivacyMode,
        maskText,
      }}
    >
      <div className={isPrivacyMode ? "privacy-mode-active" : ""}>
        {children}
      </div>
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const context = useContext(PrivacyContext);
  if (!context) {
    throw new Error("usePrivacy must be used within a PrivacyProvider");
  }
  return context;
}

