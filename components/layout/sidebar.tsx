"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import {
  Shield,
  LayoutDashboard,
  Layers,
  AtSign,
  Smartphone,
  Globe,
  AlertTriangle,
  FolderKanban,
  BarChart3,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
  Radio,
  Sparkles,
  Bell,
} from "lucide-react";

interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export function Sidebar({ isMobileOpen, setIsMobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems: { label: string; href: Route; icon: typeof LayoutDashboard; badge?: string }[] = [
    { label: "Overview", href: "/", icon: LayoutDashboard },
    { label: "Threat Radar", href: "/radar", icon: Radio },
    { label: "Brands", href: "/brands", icon: Layers },
    { label: "Social Monitoring", href: "/social", icon: AtSign },
    { label: "App Monitoring", href: "/apps", icon: Smartphone },
    { label: "Website & Domains", href: "/domains", icon: Globe },
    { label: "Findings", href: "/findings", icon: AlertTriangle, badge: "Live" },
    { label: "Investigations", href: "/investigations", icon: FolderKanban },
    { label: "AI Analysis", href: "/analysis", icon: Sparkles },
    { label: "Analytics", href: "/analytics", icon: BarChart3 },
    { label: "Monitoring Activity", href: "/monitoring", icon: Activity },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  const content = (
    <div className="flex h-full flex-col border-r border-indigo-400/15 bg-[#0a1020]">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-indigo-400/15 px-3">
        <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-300 to-indigo-400 text-[#08101d] shadow-[0_0_16px_rgba(103,232,249,0.2)]">
            <Shield className="h-5 w-5 fill-current stroke-[#08101d] stroke-2" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-wider text-slate-100">
                SENTRIX
              </span>
              <span className="font-mono text-[10px] tracking-tight text-cyan-300">
                CIPHER • HacXLerate
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={isCollapsed}
          className="hidden rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-indigo-400/10 hover:text-cyan-200 md:flex"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav List */}
      <nav aria-label="Primary navigation" className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileOpen(false)}
              className={`group flex items-center gap-3 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                isActive
                  ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-200 shadow-[inset_3px_0_0_#67e8f9]"
                  : "border-transparent text-slate-400 hover:border-indigo-300/15 hover:bg-indigo-400/10 hover:text-slate-100"
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                  isActive ? "text-cyan-300" : "text-slate-500"
                }`}
              />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
              {!isCollapsed && item.badge && (
                <span className="ml-auto text-[10px] font-mono uppercase bg-red-500/10 text-red-400 border border-red-500/30 px-1.5 py-0.2 rounded font-semibold animate-pulseSubtle">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Live Monitoring Indicator */}
      {!isCollapsed && (
        <div className="m-2 rounded-lg border border-indigo-300/15 bg-indigo-400/[0.07] p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-[11px] font-semibold text-slate-200">
              Realtime Shield
            </span>
          </div>
          <p className="text-[10px] leading-tight text-slate-400">
            Continuous threat telemetry active across perimeter channels.
          </p>
        </div>
      )}

      {/* Footer System Status */}
      <div className="flex items-center justify-between border-t border-indigo-400/15 p-3 text-[10px] text-slate-500">
        {!isCollapsed && <span>SENTRIX v1.0 • Enterprise DRP</span>}
        <Radio className="h-3.5 w-3.5 animate-pulseSubtle text-cyan-300" />
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden shrink-0 transition-[width] duration-200 md:block ${
          isCollapsed ? "w-[4.5rem]" : "w-[13.75rem]"
        }`}
      >
        <div
          className="fixed bottom-0 left-0 top-0 z-30"
          style={{ width: isCollapsed ? "4.5rem" : "13.75rem" }}
        >
          {content}
        </div>
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative z-50 h-full w-[13.75rem] max-w-[80vw] shadow-2xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
