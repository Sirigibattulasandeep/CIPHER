"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { playCyberClick } from "@/lib/sound";
import {
  LayoutDashboard,
  Radio,
  Search,
  AlertTriangle,
  Bot,
  Menu,
  Sparkles,
} from "lucide-react";

interface MobileBottomNavProps {
  onOpenMobileMenu: () => void;
  onOpenQuickAnalysis: () => void;
  onToggleAiCopilot?: () => void;
}

export function MobileBottomNav({
  onOpenMobileMenu,
  onOpenQuickAnalysis,
  onToggleAiCopilot,
}: MobileBottomNavProps) {
  const pathname = usePathname();

  const isOverview = pathname === "/";
  const isRadar = pathname.startsWith("/radar");
  const isFindings = pathname.startsWith("/findings");

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0A1017]/95 backdrop-blur-xl border-t border-[#2A3543] px-2 py-1.5 flex items-center justify-around pb-[calc(0.4rem+env(safe-area-inset-bottom,0px))]"
    >
      {/* Overview */}
      <Link
        href="/"
        onClick={() => playCyberClick()}
        className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] font-semibold transition-all ${
          isOverview ? "text-[#D7A93A]" : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <LayoutDashboard className={`w-4 h-4 mb-0.5 ${isOverview ? "stroke-[2.5]" : ""}`} />
        <span>Overview</span>
      </Link>

      {/* Threat Radar */}
      <Link
        href="/radar"
        onClick={() => playCyberClick()}
        className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] font-semibold transition-all ${
          isRadar ? "text-[#D7A93A]" : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <Radio className={`w-4 h-4 mb-0.5 ${isRadar ? "stroke-[2.5]" : ""}`} />
        <span>Radar</span>
      </Link>

      {/* Center Action: Quick Threat Screen */}
      <button
        onClick={() => {
          playCyberClick();
          onOpenQuickAnalysis();
        }}
        className="flex flex-col items-center justify-center -mt-4 p-2.5 rounded-full bg-gradient-to-r from-[#D7A93A] to-[#22D3EE] text-[#0A1017] shadow-[0_0_16px_rgba(215,169,58,0.4)] active:scale-95 transition-all"
        title="Screen Threat Asset"
      >
        <Sparkles className="w-5 h-5 fill-current" />
      </button>

      {/* Findings */}
      <Link
        href="/findings"
        onClick={() => playCyberClick()}
        className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] font-semibold transition-all ${
          isFindings ? "text-[#D7A93A]" : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <AlertTriangle className={`w-4 h-4 mb-0.5 ${isFindings ? "stroke-[2.5]" : ""}`} />
        <span>Findings</span>
      </Link>

      {/* Menu / Drawer */}
      <button
        onClick={() => {
          playCyberClick();
          onOpenMobileMenu();
        }}
        className="flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] font-semibold text-slate-400 hover:text-slate-200 transition-all"
      >
        <Menu className="w-4 h-4 mb-0.5" />
        <span>Menu</span>
      </button>
    </nav>
  );
}

