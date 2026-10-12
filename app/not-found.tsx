import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, LayoutDashboard, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 animate-fadeIn">
      <div className="max-w-md w-full p-8 rounded-2xl bg-sentrix-card border border-sentrix-border text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono uppercase text-sentrix-cyan bg-sentrix-cyan/10 px-2.5 py-0.5 rounded border border-sentrix-cyan/30">
            Error 404 • Resource Not Found
          </span>
          <h1 className="text-2xl font-extrabold text-sentrix-text">
            Destination Unreachable
          </h1>
          <p className="text-xs text-sentrix-muted leading-relaxed">
            The requested intelligence dossier or navigation path does not exist or has been archived by the security gateway.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-sentrix-cyan text-sentrix-bg text-xs font-bold hover:brightness-110 flex items-center justify-center gap-2 shadow-glow-sm transition-all"
          >
            <LayoutDashboard className="w-4 h-4" /> Return to Dashboard
          </Link>
          <Link
            href="/findings"
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text text-xs font-semibold hover:border-sentrix-cyan flex items-center justify-center gap-2 transition-all"
          >
            Browse Findings
          </Link>
        </div>
      </div>
    </div>
  );
}

