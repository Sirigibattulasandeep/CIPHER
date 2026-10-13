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
    <div className="flex flex-col h-full bg-sentrix-surface border-r border-sentrix-border">
      {/* Brand Header */}
      <div className="flex items-center justify-between p-4 border-b border-sentrix-border h-16">
        <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sentrix-cyan to-emerald-400 flex items-center justify-center text-sentrix-bg shadow-glow-sm shrink-0">
            <Shield className="w-5 h-5 fill-current stroke-sentrix-bg stroke-2" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-wider text-sentrix-text">
                SENTRIX
              </span>
              <span className="text-[10px] font-mono text-sentrix-cyan tracking-tight">
                CIPHER • HacXLerate
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex p-1.5 rounded-lg text-sentrix-muted hover:text-sentrix-text hover:bg-sentrix-card transition-colors"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
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
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                isActive
                  ? "bg-sentrix-card text-sentrix-cyan border border-sentrix-cyan/40 shadow-sm"
                  : "text-sentrix-muted hover:text-sentrix-text hover:bg-sentrix-card/60"
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                  isActive ? "text-sentrix-cyan" : "text-sentrix-subtle"
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
      </div>

      {/* Live Monitoring Indicator */}
      {!isCollapsed && (
        <div className="p-3 m-3 rounded-lg bg-sentrix-card border border-sentrix-border">
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-[11px] font-semibold text-sentrix-text">
              Realtime Shield
            </span>
          </div>
          <p className="text-[10px] text-sentrix-muted leading-tight">
            Continuous threat telemetry active across perimeter channels.
          </p>
        </div>
      )}

      {/* Footer System Status */}
      <div className="p-3 border-t border-sentrix-border text-[10px] text-sentrix-subtle flex items-center justify-between">
        {!isCollapsed && <span>SENTRIX v1.0 • Enterprise DRP</span>}
        <Radio className="w-3.5 h-3.5 text-sentrix-cyan animate-pulseSubtle" />
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden md:block shrink-0 transition-all duration-200 z-30 ${
          isCollapsed ? "w-16" : "w-64"
        }`}
      >
        <div className="fixed top-0 bottom-0 left-0 w-inherit z-30">
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
          <div className="relative w-64 max-w-[80vw] h-full shadow-2xl z-50">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
