"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Finding, Brand, Investigation } from "@/types";
import {
  Search,
  X,
  AlertTriangle,
  Layers,
  FolderKanban,
  ArrowRight,
  AtSign,
  Smartphone,
  Globe,
  Radio,
  Sparkles,
  Bell,
  Settings,
} from "lucide-react";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [findings, setFindings] = useState<Finding[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        fetch("/api/findings").then((r) => r.json()),
        fetch("/api/brands").then((r) => r.json()),
        fetch("/api/investigations").then((r) => r.json()),
      ]).then(([fRes, bRes, iRes]) => {
        if (fRes.success) setFindings(fRes.data);
        if (bRes.success) setBrands(bRes.data);
        if (iRes.success) setInvestigations(iRes.data);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  const filteredBrands = q
    ? brands.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.industry.toLowerCase().includes(q) ||
          b.aliases.some((a) => a.toLowerCase().includes(q))
      )
    : brands.slice(0, 3);

  const filteredFindings = q
    ? findings.filter(
        (f) =>
          f.title.toLowerCase().includes(q) ||
          f.entityName.toLowerCase().includes(q) ||
          f.brandName.toLowerCase().includes(q) ||
          f.indicators.some((ind) => ind.toLowerCase().includes(q))
      )
    : findings.slice(0, 4);

  const filteredInvestigations = q
    ? investigations.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.summary.toLowerCase().includes(q) ||
          i.brandName.toLowerCase().includes(q)
      )
    : investigations.slice(0, 3);

  const navigateTo = (path: string) => {
    onClose();
    router.push(path as Route);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl rounded-xl bg-sentrix-card border border-sentrix-border shadow-2xl overflow-hidden flex flex-col">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b border-sentrix-border h-14 bg-sentrix-surface">
          <Search className="w-5 h-5 text-sentrix-cyan mr-3" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to search brands, findings, investigations, domains, AI analysis..."
            className="w-full bg-transparent text-sm text-sentrix-text placeholder:text-sentrix-muted focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 text-sentrix-muted hover:text-sentrix-text"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-2 text-xs font-mono text-sentrix-subtle hover:text-sentrix-text"
          >
            ESC
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {/* Quick Route Shortcuts */}
          {!q && (
            <div>
              <span className="text-[10px] font-bold uppercase text-sentrix-subtle tracking-wider px-2 block mb-2">
                Quick Workspaces
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => navigateTo("/radar")}
                  className="flex items-center gap-2 p-2 rounded-lg bg-sentrix-surface border border-sentrix-border hover:border-sentrix-cyan/50 text-xs text-sentrix-text text-left"
                >
                  <Radio className="w-3.5 h-3.5 text-sentrix-cyan" /> Threat Radar
                </button>
                <button
                  onClick={() => navigateTo("/social")}
                  className="flex items-center gap-2 p-2 rounded-lg bg-sentrix-surface border border-sentrix-border hover:border-sentrix-cyan/50 text-xs text-sentrix-text text-left"
                >
                  <AtSign className="w-3.5 h-3.5 text-sky-400" /> Social Intel
                </button>
                <button
                  onClick={() => navigateTo("/apps")}
                  className="flex items-center gap-2 p-2 rounded-lg bg-sentrix-surface border border-sentrix-border hover:border-sentrix-cyan/50 text-xs text-sentrix-text text-left"
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" /> App Sentinel
                </button>
                <button
                  onClick={() => navigateTo("/domains")}
                  className="flex items-center gap-2 p-2 rounded-lg bg-sentrix-surface border border-sentrix-border hover:border-sentrix-cyan/50 text-xs text-sentrix-text text-left"
                >
                  <Globe className="w-3.5 h-3.5 text-purple-400" /> Domain Radar
                </button>
                <button
                  onClick={() => navigateTo("/analysis")}
                  className="flex items-center gap-2 p-2 rounded-lg bg-sentrix-surface border border-sentrix-border hover:border-sentrix-cyan/50 text-xs text-sentrix-text text-left"
                >
                  <Sparkles className="w-3.5 h-3.5 text-sentrix-cyan" /> AI Analysis
                </button>
                <button
                  onClick={() => navigateTo("/investigations")}
                  className="flex items-center gap-2 p-2 rounded-lg bg-sentrix-surface border border-sentrix-border hover:border-sentrix-cyan/50 text-xs text-sentrix-text text-left"
                >
                  <FolderKanban className="w-3.5 h-3.5 text-purple-400" /> Cases
                </button>
                <button
                  onClick={() => navigateTo("/notifications")}
                  className="flex items-center gap-2 p-2 rounded-lg bg-sentrix-surface border border-sentrix-border hover:border-sentrix-cyan/50 text-xs text-sentrix-text text-left"
                >
                  <Bell className="w-3.5 h-3.5 text-amber-400" /> Alerts
                </button>
                <button
                  onClick={() => navigateTo("/settings")}
                  className="flex items-center gap-2 p-2 rounded-lg bg-sentrix-surface border border-sentrix-border hover:border-sentrix-cyan/50 text-xs text-sentrix-text text-left"
                >
                  <Settings className="w-3.5 h-3.5 text-sentrix-muted" /> Settings
                </button>
              </div>
            </div>
          )}

          {/* Brands section */}
          {filteredBrands.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase text-sentrix-subtle tracking-wider px-2 block mb-1.5">
                Protected Brands
              </span>
              <div className="space-y-1">
                {filteredBrands.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => navigateTo(`/brands/${b.id}`)}
                    className="w-full flex items-center justify-between p-2 rounded-lg text-xs text-sentrix-text hover:bg-sentrix-surface transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <div>
                        <span className="font-semibold text-sentrix-text">{b.name}</span>
                        <span className="ml-2 text-[10px] text-sentrix-muted font-mono">
                          {b.industry}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-sentrix-subtle" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Findings section */}
          {filteredFindings.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase text-sentrix-subtle tracking-wider px-2 block mb-1.5">
                Threat Findings
              </span>
              <div className="space-y-1">
                {filteredFindings.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => navigateTo(`/findings/${f.id}`)}
                    className="w-full flex items-center justify-between p-2 rounded-lg text-xs text-sentrix-text hover:bg-sentrix-surface transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <AlertTriangle
                        className={`w-4 h-4 shrink-0 ${
                          f.severity === "critical"
                            ? "text-[#F87171]"
                            : f.severity === "high"
                            ? "text-[#FB923C]"
                            : "text-[#FBBF24]"
                        }`}
                      />
                      <div className="truncate">
                        <span className="font-semibold text-sentrix-text">{f.title}</span>
                        <span className="ml-2 text-[10px] text-sentrix-cyan font-mono">
                          {f.brandName} • {f.sourceModule.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-sentrix-muted shrink-0 ml-2">
                      Score: {f.riskScore}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Investigations section */}
          {filteredInvestigations.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase text-sentrix-subtle tracking-wider px-2 block mb-1.5">
                Active Investigations
              </span>
              <div className="space-y-1">
                {filteredInvestigations.map((inv) => (
                  <button
                    key={inv.id}
                    onClick={() => navigateTo(`/investigations/${inv.id}`)}
                    className="w-full flex items-center justify-between p-2 rounded-lg text-xs text-sentrix-text hover:bg-sentrix-surface transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FolderKanban className="w-4 h-4 text-purple-400 shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-sentrix-text">{inv.title}</span>
                        <span className="ml-2 text-[10px] text-sentrix-muted">
                          {inv.brandName}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 shrink-0 ml-2">
                      {inv.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
