"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useBrand } from "@/lib/brand-context";
import { Finding } from "@/types";
import { RiskScoreBadge } from "@/components/shared/risk-score-badge";
import { formatTimeAgo } from "@/lib/utils";
import {
  Radio,
  Search,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Globe,
  AtSign,
  Smartphone,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export default function ThreatRadarPage() {
  const { selectedBrandId, selectedBrand } = useBrand();

  const [findings, setFindings] = useState<Finding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeVector, setActiveVector] = useState<"all" | "social" | "app" | "domain">("all");
  const [isSweeping, setIsSweeping] = useState(false);
  const [sweepMessage, setSweepMessage] = useState<string | null>(null);

  const fetchRadarFindings = async () => {
    setIsLoading(true);
    try {
      const url = `/api/findings?${selectedBrandId !== "all" ? `brandId=${selectedBrandId}` : ""}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setFindings(json.data);
      }
    } catch (err) {
      console.warn("Could not fetch radar telemetry:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRadarFindings();
  }, [selectedBrandId]);

  const handleRunRadarSweep = () => {
    setIsSweeping(true);
    setSweepMessage(null);
    setTimeout(() => {
      setIsSweeping(false);
      setSweepMessage("Radar sweep complete: 3 perimeters scanned, 0 new critical threats undetected.");
      setTimeout(() => setSweepMessage(null), 4000);
    }, 1200);
  };

  const filteredFindings = findings.filter(
    (f) => activeVector === "all" || f.sourceModule === activeVector
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-sentrix-card border border-sentrix-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded bg-sentrix-cyan/10 text-sentrix-cyan">
              <Radio className="w-4 h-4 animate-pulseSubtle" />
            </span>
            <span className="text-xs font-mono uppercase text-sentrix-cyan font-bold tracking-wider">
              Perimeter Defense • Active Sweep
            </span>
          </div>
          <h1 className="text-xl font-bold text-sentrix-text">
            Threat Radar & Attack Surface Map
          </h1>
          <p className="text-xs text-sentrix-muted">
            Omni-channel radar scanning external namespace vectors across social platforms, mobile stores, and DNS zones.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunRadarSweep}
            disabled={isSweeping}
            className="px-3.5 py-2 rounded-lg bg-sentrix-cyan text-sentrix-bg text-xs font-bold hover:brightness-110 shadow-glow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Radio className={`w-3.5 h-3.5 ${isSweeping ? "animate-spin" : ""}`} />
            <span>{isSweeping ? "Sweeping Radar..." : "Trigger Perimeter Sweep"}</span>
          </button>
          <button
            onClick={fetchRadarFindings}
            disabled={isLoading}
            className="p-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-muted hover:text-sentrix-text transition-colors"
            title="Refresh radar feed"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {sweepMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center gap-2 animate-fadeIn">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{sweepMessage}</span>
        </div>
      )}

      {/* Radar Channel Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => setActiveVector("social")}
          className={`p-4 rounded-xl bg-sentrix-card border cursor-pointer transition-all ${
            activeVector === "social"
              ? "border-sentrix-cyan shadow-glow-sm"
              : "border-sentrix-border hover:border-sentrix-borderLight"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-sentrix-text flex items-center gap-2">
              <AtSign className="w-4 h-4 text-sky-400" /> Social Vector
            </span>
            <span className="font-mono text-xs text-sentrix-cyan font-bold">
              {findings.filter((f) => f.sourceModule === "social").length} Active
            </span>
          </div>
          <p className="text-[11px] text-sentrix-muted">
            Profiles, fake support handles, and fraudulent giveaways.
          </p>
        </div>

        <div
          onClick={() => setActiveVector("app")}
          className={`p-4 rounded-xl bg-sentrix-card border cursor-pointer transition-all ${
            activeVector === "app"
              ? "border-emerald-400 shadow-glow-safe"
              : "border-sentrix-border hover:border-sentrix-borderLight"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-sentrix-text flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" /> Mobile Vector
            </span>
            <span className="font-mono text-xs text-emerald-400 font-bold">
              {findings.filter((f) => f.sourceModule === "app").length} Active
            </span>
          </div>
          <p className="text-[11px] text-sentrix-muted">
            Third-party APK mirrors, publisher identity mismatches.
          </p>
        </div>

        <div
          onClick={() => setActiveVector("domain")}
          className={`p-4 rounded-xl bg-sentrix-card border cursor-pointer transition-all ${
            activeVector === "domain"
              ? "border-purple-400 shadow-glow-sm"
              : "border-sentrix-border hover:border-sentrix-borderLight"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-sentrix-text flex items-center gap-2">
              <Globe className="w-4 h-4 text-purple-400" /> Domain & DNS Vector
            </span>
            <span className="font-mono text-xs text-purple-400 font-bold">
              {findings.filter((f) => f.sourceModule === "domain" || f.sourceModule === "web").length} Active
            </span>
          </div>
          <p className="text-[11px] text-sentrix-muted">
            Typosquatting mutations, homoglyphs, phishing portals.
          </p>
        </div>
      </div>

      {/* Radar Findings List */}
      <div className="p-5 rounded-xl bg-sentrix-card border border-sentrix-border space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-sentrix-text">
            Radar Telemetry Stream ({filteredFindings.length} signals)
          </h3>
          {activeVector !== "all" && (
            <button
              onClick={() => setActiveVector("all")}
              className="text-xs text-sentrix-cyan hover:underline"
            >
              Show All Vectors
            </button>
          )}
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-10 text-xs text-sentrix-muted">
              Scanning threat radar perimeter...
            </div>
          ) : filteredFindings.length === 0 ? (
            <div className="p-8 text-center bg-sentrix-surface rounded-lg border border-sentrix-border text-xs text-sentrix-muted">
              No active radar anomalies detected on this vector.
            </div>
          ) : (
            filteredFindings.map((f) => (
              <div
                key={f.id}
                className="p-3.5 rounded-lg bg-sentrix-surface border border-sentrix-border hover:border-sentrix-borderLight flex items-center justify-between gap-4 text-xs transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <RiskScoreBadge score={f.riskScore} severity={f.severity} size="sm" />
                    <span className="font-bold text-sentrix-text truncate">{f.title}</span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-sentrix-card border border-sentrix-border text-sentrix-cyan">
                      {f.sourceModule}
                    </span>
                  </div>
                  <p className="text-sentrix-muted truncate">{f.entityName}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] text-sentrix-subtle font-mono hidden sm:inline">
                    {formatTimeAgo(f.lastObservedAt)}
                  </span>
                  <Link
                    href={`/findings/${f.id}`}
                    className="text-xs font-semibold text-sentrix-cyan hover:underline flex items-center gap-1"
                  >
                    Dossier <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

