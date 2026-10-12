"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useBrand } from "@/lib/brand-context";
import { Role } from "@/types";
import {
  Settings,
  Building2,
  UserCheck,
  ShieldAlert,
  Bell,
  RotateCcw,
  CheckCircle2,
  Lock,
  Layers,
} from "lucide-react";

export default function SettingsPage() {
  const { user, organization, setRole } = useAuth();
  const { brands } = useBrand();

  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // Notification toggles
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);

  const availableRoles: { role: Role; label: string; desc: string }[] = [
    { role: "owner", label: "Organization Owner", desc: "Full administrative and enforcement authority" },
    { role: "admin", label: "Administrator", desc: "Manage brands, user access, and monitoring frequencies" },
    { role: "analyst", label: "Security Analyst", desc: "Triage findings and author forensic case assessments" },
    { role: "investigator", label: "Fraud Investigator", desc: "Execute takedown orders and platform notices" },
    { role: "viewer", label: "Read-only Viewer", desc: "Audit trail and executive reporting access" },
  ];

  const handleResetDatabase = async () => {
    if (!confirm("Are you sure you want to reset the database to the initial multi-industry seed state? All newly created records will be reverted.")) {
      return;
    }
    setIsResetting(true);
    setResetMessage(null);
    try {
      const res = await fetch("/api/db/reset", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setResetMessage("Database reset successfully! Multi-industry seed state restored.");
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err) {
      alert("Failed resetting database.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-3 p-5 rounded-xl bg-sentrix-card border border-sentrix-border">
        <div className="p-2 rounded-lg bg-sentrix-cyan/10 text-sentrix-cyan">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-sentrix-text">
            Platform Settings & Governance
          </h1>
          <p className="text-xs text-sentrix-muted">
            Configure tenant parameters, inspect RBAC security postures, and manage test environments.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Organization Tenant Card */}
          <div className="p-5 rounded-xl bg-sentrix-card border border-sentrix-border space-y-3">
            <h3 className="text-sm font-bold text-sentrix-text flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sentrix-cyan" />
              Organization & Tenant Isolation
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-sentrix-surface border border-sentrix-border">
                <span className="text-sentrix-muted block mb-0.5">Tenant Name</span>
                <span className="font-bold text-sentrix-text">{organization.name}</span>
              </div>
              <div className="p-3 rounded-lg bg-sentrix-surface border border-sentrix-border">
                <span className="text-sentrix-muted block mb-0.5">Subscription Plan</span>
                <span className="font-bold text-sentrix-teal">{organization.plan}</span>
              </div>
              <div className="p-3 rounded-lg bg-sentrix-surface border border-sentrix-border">
                <span className="text-sentrix-muted block mb-0.5">Tenant Identifier</span>
                <span className="font-mono text-sentrix-cyan">{organization.id}</span>
              </div>
              <div className="p-3 rounded-lg bg-sentrix-surface border border-sentrix-border">
                <span className="text-sentrix-muted block mb-0.5">Active Protected Brands</span>
                <span className="font-mono text-sentrix-text font-bold">{brands.length} registered</span>
              </div>
            </div>
          </div>

          {/* Role-Based Access Control Switcher */}
          <div className="p-5 rounded-xl bg-sentrix-card border border-sentrix-border space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-sentrix-text flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-purple-400" />
                Role-Based Access Control (RBAC) Switcher
              </h3>
              <span className="text-[10px] font-mono text-sentrix-cyan bg-sentrix-cyan/10 px-2 py-0.5 rounded">
                Active: {user.role.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-sentrix-muted">
              Select an identity role to test authorization boundaries across brand creation, triage, and takedown orders.
            </p>

            <div className="space-y-2 pt-2">
              {availableRoles.map((r) => (
                <div
                  key={r.role}
                  onClick={() => setRole(r.role)}
                  className={`p-3 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                    user.role === r.role
                      ? "bg-sentrix-surface border-sentrix-cyan/60 shadow-glow-sm"
                      : "bg-sentrix-surface/50 border-sentrix-border hover:border-sentrix-borderLight"
                  }`}
                >
                  <div>
                    <span className="font-bold text-sentrix-text">{r.label}</span>
                    <p className="text-sentrix-muted text-[11px]">{r.desc}</p>
                  </div>
                  {user.role === r.role && (
                    <CheckCircle2 className="w-4 h-4 text-sentrix-cyan" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Alert Notification Preferences */}
          <div className="p-5 rounded-xl bg-sentrix-card border border-sentrix-border space-y-3">
            <h3 className="text-sm font-bold text-sentrix-text flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              Threat Telemetry & Alert Channels
            </h3>
            <div className="space-y-2 text-xs">
              <label className="flex items-center justify-between p-3 rounded-lg bg-sentrix-surface border border-sentrix-border cursor-pointer">
                <span>Instant High & Critical Threat Dispatch</span>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="rounded border-sentrix-border text-sentrix-cyan"
                />
              </label>
              <label className="flex items-center justify-between p-3 rounded-lg bg-sentrix-surface border border-sentrix-border cursor-pointer">
                <span>Filter Out False Positives & Low Priority Logs</span>
                <input
                  type="checkbox"
                  checked={criticalOnly}
                  onChange={(e) => setCriticalOnly(e.target.checked)}
                  className="rounded border-sentrix-border text-sentrix-cyan"
                />
              </label>
              <label className="flex items-center justify-between p-3 rounded-lg bg-sentrix-surface border border-sentrix-border cursor-pointer">
                <span>Weekly Executive PDF Digest Generation</span>
                <input
                  type="checkbox"
                  checked={weeklyDigest}
                  onChange={(e) => setWeeklyDigest(e.target.checked)}
                  className="rounded border-sentrix-border text-sentrix-cyan"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Demo Mode & Seed Reset */}
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-sentrix-card border border-sentrix-border space-y-4">
            <h3 className="text-sm font-bold text-sentrix-text flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-sentrix-cyan" />
              Multi-Industry Demo Controls
            </h3>
            <p className="text-xs text-sentrix-muted leading-relaxed">
              Reset all database state to the official multi-industry baseline (EdTech, FinTech, E-commerce).
            </p>

            {resetMessage && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400">
                {resetMessage}
              </div>
            )}

            <button
              onClick={handleResetDatabase}
              disabled={isResetting}
              className="w-full py-2.5 rounded-lg bg-sentrix-surface border border-sentrix-cyan/40 text-sentrix-cyan text-xs font-bold hover:bg-sentrix-cyan hover:text-sentrix-bg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin" : ""}`} />
              {isResetting ? "Resetting Seed State..." : "Reset Database to Seed State"}
            </button>
          </div>

          <div className="p-5 rounded-xl bg-sentrix-card border border-sentrix-border space-y-3 text-xs">
            <h4 className="font-bold text-sentrix-text">Challenge 03 Information</h4>
            <div className="space-y-1.5 text-sentrix-muted">
              <p>Team: <strong className="text-sentrix-text">CIPHER</strong></p>
              <p>Event: <strong className="text-sentrix-text">HacXLerate 2026</strong></p>
              <p>Product: <strong className="text-sentrix-cyan">SENTRIX Digital Risk Protection</strong></p>
              <p>Tagline: <em className="text-sentrix-text">Detect Threats. Defend Trust.</em></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

