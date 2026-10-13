"use client";

import React from "react";
import { useNetwork } from "@/lib/network-context";
import { playCyberClick } from "@/lib/sound";
import { WifiOff, RefreshCw, CheckCircle2, ShieldAlert } from "lucide-react";

export function ServerResilienceBanner() {
  const { isOnline, isServerDown, isChecking, retryConnection } = useNetwork();

  if (!isServerDown && isOnline) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-300 animate-fadeIn">
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
        <span>
          {!isOnline
            ? "Network disconnected. Sentrix is operating in offline resilient mode with local cache."
            : "Sentrix backend server is unavailable. Platform is operating in resilient fallback mode."}
        </span>
      </div>

      <button
        onClick={() => {
          playCyberClick();
          retryConnection();
        }}
        disabled={isChecking}
        className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
      >
        <RefreshCw className={`w-3 h-3 ${isChecking ? "animate-spin" : ""}`} />
        <span>{isChecking ? "Reconnecting..." : "Reconnect"}</span>
      </button>
    </div>
  );
}

export function ConnectionPill() {
  const { isOnline, isServerDown, isChecking, retryConnection } = useNetwork();

  if (isServerDown || !isOnline) {
    return (
      <button
        onClick={() => {
          playCyberClick();
          retryConnection();
        }}
        className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-[11px] font-mono text-amber-400 hover:bg-amber-500/20 transition-all"
        title="Server disconnected. Operating in resilient offline mode. Click to retry."
      >
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span>Offline Cache</span>
        <RefreshCw className={`w-2.5 h-2.5 ${isChecking ? "animate-spin" : ""}`} />
      </button>
    );
  }

  return (
    <div
      className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-400"
      title="Connected to Sentrix Edge"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulseSubtle" />
      <span>Edge Online</span>
    </div>
  );
}

