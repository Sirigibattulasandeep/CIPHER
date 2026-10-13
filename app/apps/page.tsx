"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useBrand } from "@/lib/brand-context";
import { Finding } from "@/types";
import { RiskScoreBadge } from "@/components/shared/risk-score-badge";
import { StatusSelect } from "@/components/shared/status-select";
import { formatTimeAgo } from "@/lib/utils";
import { resilientFetch } from "@/lib/api-client";
import { playCyberClick } from "@/lib/sound";
import {
  Smartphone,
  Search,
  RefreshCw,
  ExternalLink,
  ArrowRight,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export default function AppMonitoringPage() {
  const { selectedBrandId, brands } = useBrand();

  const [findings, setFindings] = useState<Finding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");

  const fetchAppFindings = async () => {
    setIsLoading(true);
    try {
      const url = `/api/findings?sourceModule=app${
        selectedBrandId !== "all" ? `&brandId=${selectedBrandId}` : ""
      }`;
      const res = await resilientFetch<Finding[]>(url);
      if (res.data) {
        setFindings(res.data.filter((f) => f.sourceModule === "app"));
      }
    } catch (err) {
      console.warn("Could not fetch app findings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppFindings();
  }, [selectedBrandId]);

  const handleStatusChange = async (findingId: string, newStatus: any) => {
    try {
      await fetch(`/api/findings/${findingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setFindings((prev) =>
        prev.map((f) => (f.id === findingId ? { ...f, status: newStatus } : f))
      );
    } catch (err) {
      alert("Failed to update status.");
    }
  };

  const filteredFindings = findings.filter((f) => {
    const matchesSearch =
      f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.entityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity =
      selectedSeverity === "all" || f.severity === selectedSeverity;
    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-sentrix-card border border-sentrix-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded bg-emerald-500/10 text-emerald-400">
              <Smartphone className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono uppercase text-emerald-400 font-bold tracking-wider">
              Mobile App Sentinel
            </span>
          </div>
          <h1 className="text-xl font-bold text-sentrix-text">
            Rogue Application & Publisher Mismatch Sentinel
          </h1>
          <p className="text-xs text-sentrix-muted">
            Inspect unauthorized APK distribution, publisher identity mismatches, intrusive permissions, and counterfeit mobile software.
          </p>
        </div>

        <button
          onClick={fetchAppFindings}
          disabled={isLoading}
          className="p-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-muted hover:text-sentrix-text hover:border-sentrix-borderLight transition-colors"
          title="Refresh feed"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sentrix-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate apps, package IDs, publishers..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-xs text-sentrix-text placeholder:text-sentrix-muted focus:outline-none focus:border-sentrix-cyan"
          />
        </div>

        <select
          value={selectedSeverity}
          onChange={(e) => setSelectedSeverity(e.target.value)}
          className="px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-xs text-sentrix-text focus:outline-none focus:border-sentrix-cyan"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical (85+)</option>
          <option value="high">High (65-84)</option>
          <option value="medium">Medium (35-64)</option>
          <option value="low">Low (0-34)</option>
        </select>
      </div>

      {/* Findings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {isLoading ? (
          <div className="col-span-2 flex items-center justify-center p-16 text-xs text-sentrix-muted">
            <div className="w-5 h-5 border-2 border-sentrix-cyan border-t-transparent rounded-full animate-spin mr-2" />
            Analyzing mobile app repository telemetry...
          </div>
        ) : filteredFindings.length === 0 ? (
          <div className="col-span-2 p-12 text-center bg-sentrix-card rounded-xl border border-sentrix-border space-y-2">
            <p className="text-sm font-semibold text-sentrix-text">
              No suspicious mobile applications detected.
            </p>
            <p className="text-xs text-sentrix-muted">
              All monitored APK mirrors and authorized app store listings align with registered brand assets.
            </p>
          </div>
        ) : (
          filteredFindings.map((finding) => (
            <div
              key={finding.id}
              className="p-5 rounded-xl bg-sentrix-card border border-sentrix-border hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <RiskScoreBadge
                      score={finding.riskScore}
                      severity={finding.severity}
                      classification={finding.classification}
                      size="sm"
                    />
                    <span className="text-[11px] font-mono text-sentrix-cyan bg-sentrix-cyan/10 px-2 py-0.5 rounded">
                      {finding.brandName}
                    </span>
                  </div>
                  <StatusSelect
                    currentStatus={finding.status}
                    onChange={(st) => handleStatusChange(finding.id, st)}
                  />
                </div>

                <h3 className="text-base font-bold text-sentrix-text group-hover:text-emerald-400 transition-colors">
                  {finding.title}
                </h3>
                <p className="text-xs text-sentrix-muted leading-relaxed mt-1">
                  {finding.description}
                </p>

                {/* Candidate details panel */}
                <div className="mt-3 p-3 rounded-lg bg-sentrix-surface border border-sentrix-border/60 text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-sentrix-subtle font-sans">App Title:</span>
                    <span className="text-sentrix-text font-bold truncate max-w-[200px]">
                      {finding.entityName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sentrix-subtle font-sans">Package Identifier:</span>
                    <span className="text-sentrix-cyan truncate max-w-[200px]">
                      {finding.entityIdentifier}
                    </span>
                  </div>
                  {finding.entityUrl && (
                    <div className="flex justify-between pt-1 border-t border-sentrix-border/40 font-sans">
                      <span className="text-sentrix-subtle">Marketplace:</span>
                      <a
                        href={finding.entityUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sentrix-cyan hover:underline flex items-center gap-1 text-[11px]"
                      >
                        Inspect Listing <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-sentrix-border/60 flex items-center justify-between text-xs">
                <span className="text-[11px] text-sentrix-subtle">
                  Observed {formatTimeAgo(finding.lastObservedAt)}
                </span>
                <Link
                  href={`/findings/${finding.id}`}
                  className="font-semibold text-emerald-400 hover:underline flex items-center gap-1"
                >
                  Forensic Comparison Matrix <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

