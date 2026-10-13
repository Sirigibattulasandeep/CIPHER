import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useBrand } from "@/lib/brand-context";
import { usePrivacy } from "@/lib/privacy-context";
import { playCyberClick } from "@/lib/sound";
import { ConnectionPill } from "@/components/shared/server-resilience-banner";
import { PwaInstallButton } from "@/components/pwa/pwa-controller";
import { Role } from "@/types";
import {
  Menu,
  Search,
  Bell,
  Sparkles,
  ChevronDown,
  Building2,
  ShieldCheck,
  UserCheck,
  RotateCcw,
  Eye,
  EyeOff,
  Compass,
} from "lucide-react";

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onOpenCommandPalette: () => void;
  onOpenNotifications: () => void;
  onOpenQuickAnalysis: () => void;
  onOpenAppGuide?: () => void;
  unreadCount?: number;
}

export function Header({
  onOpenMobileMenu,
  onOpenCommandPalette,
  onOpenNotifications,
  onOpenQuickAnalysis,
  onOpenAppGuide,
  unreadCount = 0,
}: HeaderProps) {
  const { user, organization, setRole } = useAuth();
  const { brands, selectedBrandId, setSelectedBrandId } = useBrand();
  const { isPrivacyMode, togglePrivacyMode } = usePrivacy();

  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const availableRoles: { role: Role; label: string; desc: string }[] = [
    { role: "owner", label: "Org Owner", desc: "Full permissions & admin access" },
    { role: "admin", label: "Administrator", desc: "Manage brands & integrations" },
    { role: "analyst", label: "Security Analyst", desc: "Triage & investigate findings" },
    { role: "investigator", label: "Fraud Investigator", desc: "Case notes & takedown actions" },
    { role: "viewer", label: "Read-only Viewer", desc: "Audit and reporting access" },
  ];

  const handleResetDemoDb = async () => {
    if (!confirm("Reset database to initial multi-industry seed state? All mock edits will be restored.")) {
      return;
    }
    setIsResetting(true);
    try {
      const res = await fetch("/api/db/reset", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        window.location.reload();
      }
    } catch (err) {
      alert("Failed to reset database.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-sentrix-bg/90 backdrop-blur-md border-b border-sentrix-border px-4 md:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile Toggle & Brand Selector */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-lg text-sentrix-muted hover:text-sentrix-text hover:bg-sentrix-surface"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Brand Selector */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sentrix-surface border border-sentrix-border text-xs text-sentrix-muted">
            <Building2 className="w-3.5 h-3.5 text-sentrix-cyan" />
            <span className="font-semibold text-sentrix-text truncate max-w-[120px]">
              {organization.name}
            </span>
          </div>

          <div className="relative">
            <select
              value={selectedBrandId}
              onChange={(e) => setSelectedBrandId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-sentrix-surface border border-sentrix-border text-xs font-semibold text-sentrix-text hover:border-sentrix-borderLight focus:outline-none focus:border-sentrix-cyan cursor-pointer pr-8 appearance-none"
            >
              <option value="all">🌐 All Brands (Unified View)</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  🛡️ {b.name} ({b.industry})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-sentrix-muted" />
          </div>
        </div>
      </div>

      {/* Middle: Command Palette Search Bar */}
      <div className="hidden lg:flex flex-1 max-w-md mx-4">
        <button
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-sentrix-surface border border-sentrix-border text-xs text-sentrix-muted hover:border-sentrix-cyan/50 hover:text-sentrix-text transition-all group"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-sentrix-subtle group-hover:text-sentrix-cyan" />
            <span>Search findings, brands, domains, indicators...</span>
          </div>
          <kbd className="hidden xl:inline-block px-1.5 py-0.5 rounded bg-sentrix-card border border-sentrix-border text-[10px] font-mono text-sentrix-muted">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Edge Server Health / Offline Status Pill */}
        <ConnectionPill />

        {/* PWA Cross-Platform Install Button */}
        <PwaInstallButton />

        {/* Interactive App Guide Launcher */}
        {onOpenAppGuide && (
          <button
            onClick={() => {
              playCyberClick();
              onOpenAppGuide();
            }}
            title="Launch Interactive App Tour & Guide"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sentrix-surface border border-sentrix-border text-xs text-sentrix-muted hover:text-sentrix-cyan hover:border-sentrix-borderLight transition-all"
          >
            <Compass className="w-3.5 h-3.5 text-sentrix-cyan" />
            <span className="hidden xl:inline">App Guide</span>
          </button>
        )}

        {/* Privacy Shield Mode (Alt+P) */}
        <button
          onClick={() => {
            playCyberClick();
            togglePrivacyMode();
          }}
          title={isPrivacyMode ? "Privacy Shield Active (Alt+P) - Click to unmask" : "Activate Privacy Shield (Alt+P) - Blur sensitive assets for demo"}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
            isPrivacyMode
              ? "bg-[#D7A93A]/15 border-[#D7A93A] text-[#F1C95D] shadow-[0_0_12px_rgba(215,169,58,0.25)]"
              : "bg-sentrix-surface border-sentrix-border text-sentrix-muted hover:text-sentrix-text hover:border-sentrix-borderLight"
          }`}
        >
          {isPrivacyMode ? (
            <EyeOff className="w-3.5 h-3.5 text-[#D7A93A]" />
          ) : (
            <Eye className="w-3.5 h-3.5" />
          )}
          <span className="hidden lg:inline">{isPrivacyMode ? "Shield ON" : "Privacy"}</span>
        </button>

        {/* Reset Demo DB button */}
        <button
          onClick={handleResetDemoDb}
          disabled={isResetting}
          title="Reset database to multi-industry seed state"
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sentrix-surface border border-sentrix-border text-xs text-sentrix-muted hover:text-sentrix-cyan hover:border-sentrix-borderLight transition-all"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin" : ""}`} />
          <span className="hidden xl:inline">Seed Reset</span>
        </button>

        {/* Quick Threat Analysis Action */}
        <button
          onClick={() => {
            playCyberClick();
            onOpenQuickAnalysis();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-sentrix-cyan to-sentrix-teal text-sentrix-bg text-xs font-bold shadow-glow-sm hover:brightness-110 cursor-pointer transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 fill-current" />
          <span className="hidden sm:inline">Screen Asset</span>
        </button>

        {/* Notifications Button */}
        <button
          onClick={() => {
            playCyberClick();
            onOpenNotifications();
          }}
          className="relative p-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-muted hover:text-sentrix-text hover:border-sentrix-borderLight transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User Profile & Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg bg-sentrix-surface border border-sentrix-border hover:border-sentrix-borderLight transition-colors"
          >
            <img
              src={user.avatar}
              alt={user.name}
              className="w-6 h-6 rounded-full object-cover border border-sentrix-cyan/40"
            />
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-sentrix-text leading-tight truncate max-w-[100px]">
                {user.name}
              </span>
              <span className="text-[10px] font-mono text-sentrix-cyan uppercase leading-tight">
                {user.role}
              </span>
            </div>
            <ChevronDown className="w-3 h-3 text-sentrix-muted" />
          </button>

          {/* Role switcher dropdown modal */}
          {isRoleMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsRoleMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 rounded-xl bg-sentrix-card border border-sentrix-border shadow-2xl z-50 p-2 space-y-1">
                <div className="p-2 border-b border-sentrix-border/60">
                  <p className="text-xs font-bold text-sentrix-text">{user.name}</p>
                  <p className="text-[11px] text-sentrix-muted">{user.email}</p>
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-sentrix-teal font-medium">
                    <ShieldCheck className="w-3 h-3" /> {organization.plan}
                  </div>
                </div>

                <div className="pt-1">
                  <span className="text-[10px] font-bold uppercase text-sentrix-subtle px-2 tracking-wider">
                    Role Switcher (RBAC Demo)
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {availableRoles.map((r) => (
                      <button
                        key={r.role}
                        onClick={() => {
                          setRole(r.role);
                          setIsRoleMenuOpen(false);
                        }}
                        className={`w-full flex items-start gap-2 p-2 rounded-lg text-left text-xs transition-colors ${
                          user.role === r.role
                            ? "bg-sentrix-surface text-sentrix-cyan border border-sentrix-cyan/30"
                            : "text-sentrix-muted hover:text-sentrix-text hover:bg-sentrix-surface/50"
                        }`}
                      >
                        <UserCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-semibold">{r.label}</p>
                          <p className="text-[10px] text-sentrix-subtle">{r.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

