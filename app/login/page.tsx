"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Role } from "@/types";
import { Shield, Lock, UserCheck, ArrowRight, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { user, organization, setRole } = useAuth();
  const [selectedRole, setSelectedRole] = useState<Role>(user.role);
  const [email, setEmail] = useState(user.email);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const demoRoles: { role: Role; label: string; email: string; desc: string; badge: string }[] = [
    {
      role: "admin",
      label: "Demo Administrator",
      email: "admin@sentrix.security",
      desc: "Full brand management, scan orchestration, scenario configuration & DB reset authority",
      badge: "Full Admin",
    },
    {
      role: "analyst",
      label: "Demo Security Analyst",
      email: "analyst@sentrix.security",
      desc: "Threat triage, forensic analysis, evidence linking, and case investigation updates",
      badge: "Analyst",
    },
    {
      role: "viewer",
      label: "Demo Viewer",
      email: "viewer@sentrix.security",
      desc: "Read-only access: Executive telemetry review, compliance audits & report viewing",
      badge: "Read-Only",
    },
    {
      role: "owner",
      label: "Alex Vance (Org Owner)",
      email: "alex.vance@cybershield.io",
      desc: "Executive oversight, policy management, and takedown enforcement authority",
      badge: "Owner",
    },
  ];

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningIn(true);
    setRole(selectedRole);
    setTimeout(() => {
      router.push("/");
    }, 200);
  };

  const handleInstantDemoLogin = (r: Role, em: string) => {
    setSelectedRole(r);
    setEmail(em);
    setIsSigningIn(true);
    setRole(r);
    setTimeout(() => {
      router.push("/");
    }, 200);
  };

  const handleQuickSelect = (r: Role, em: string) => {
    setSelectedRole(r);
    setEmail(em);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-lg p-8 rounded-2xl bg-sentrix-card border border-sentrix-border shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-sentrix-cyan to-emerald-400 flex items-center justify-center text-sentrix-bg shadow-glow-sm">
            <Shield className="w-7 h-7 fill-current stroke-sentrix-bg stroke-2" />
          </div>
          <h1 className="text-2xl font-extrabold text-sentrix-text tracking-tight">
            SENTRIX Access Gateway
          </h1>
          <p className="text-xs text-sentrix-muted">
            Enterprise Single Sign-On • {organization.name}
          </p>
        </div>

        {/* Test Accounts & One-Click Demo Logins */}
        <div className="p-4 rounded-xl bg-sentrix-surface/80 border border-sentrix-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sentrix-cyan uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" />
              Test Accounts & 1-Click Demo Login
            </span>
            <span className="text-[10px] text-sentrix-muted font-mono">Password: SentrixDemo2026!</span>
          </div>
          <p className="text-[11px] text-sentrix-muted">
            Select any test account profile below for immediate role-authenticated access to SENTRIX:
          </p>

          <div className="grid grid-cols-1 gap-2 pt-1">
            {demoRoles.map((dr) => (
              <div
                key={dr.role}
                className={`p-2.5 rounded-lg border text-left text-xs transition-all flex items-center justify-between gap-3 ${
                  selectedRole === dr.role
                    ? "bg-sentrix-hover/60 border-sentrix-cyan/60 text-sentrix-text"
                    : "bg-sentrix-card/70 border-sentrix-border/60 text-sentrix-muted hover:border-sentrix-border hover:bg-sentrix-hover/40"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sentrix-text text-xs">{dr.label}</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-sentrix-surface border border-sentrix-border text-sentrix-cyan">
                      {dr.badge}
                    </span>
                  </div>
                  <p className="text-[10px] text-sentrix-muted truncate font-mono mt-0.5">{dr.email}</p>
                  <p className="text-[10px] text-sentrix-subtle truncate">{dr.desc}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleInstantDemoLogin(dr.role, dr.email)}
                  className="px-3 py-1.5 rounded-md bg-sentrix-cyan/15 hover:bg-sentrix-cyan text-sentrix-cyan hover:text-sentrix-bg border border-sentrix-cyan/40 hover:border-sentrix-cyan text-[11px] font-bold tracking-tight transition-all shrink-0 flex items-center gap-1"
                >
                  <span>1-Click</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Standard Credentials Form */}
        <form onSubmit={handleSignIn} className="space-y-4 text-xs pt-1">
          <div>
            <label className="block text-sentrix-muted mb-1 font-medium">Work Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text focus:outline-none focus:border-sentrix-cyan font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-sentrix-muted mb-1 font-medium">Password / SSO Token</label>
            <input
              type="password"
              defaultValue="SentrixDemo2026!"
              className="w-full px-3.5 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text focus:outline-none focus:border-sentrix-cyan font-mono"
              required
            />
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={isSigningIn}
              className="w-full py-2.5 rounded-lg bg-sentrix-cyan text-sentrix-bg font-bold text-xs hover:brightness-110 flex items-center justify-center gap-2 shadow-glow-sm transition-all"
            >
              <span>{isSigningIn ? "Authenticating Session..." : "Sign In with SSO"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

