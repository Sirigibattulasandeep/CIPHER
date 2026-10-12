"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertOctagon, RotateCcw, LayoutDashboard } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("SENTRIX Platform Error:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 animate-fadeIn">
      <div className="max-w-md w-full p-8 rounded-2xl bg-sentrix-card border border-red-500/30 text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
          <AlertOctagon className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono uppercase text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded border border-red-500/30">
            System Triage Exception
          </span>
          <h1 className="text-xl font-extrabold text-sentrix-text">
            Telemetry Feed Interrupted
          </h1>
          <p className="text-xs text-sentrix-muted leading-relaxed">
            {error?.message || "An unexpected issue occurred while assembling intelligence telemetry."}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-sentrix-cyan text-sentrix-bg text-xs font-bold hover:brightness-110 flex items-center justify-center gap-2 shadow-glow-sm cursor-pointer transition-all"
          >
            <RotateCcw className="w-4 h-4" /> Retry Telemetry
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text text-xs font-semibold hover:border-sentrix-cyan flex items-center justify-center gap-2 transition-all"
          >
            <LayoutDashboard className="w-4 h-4" /> Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

