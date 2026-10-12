"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useBrand } from "@/lib/brand-context";
import { Finding, Severity } from "@/types";
import { RiskScoreBadge } from "@/components/shared/risk-score-badge";
import { StatusSelect } from "@/components/shared/status-select";
import { formatTimeAgo } from "@/lib/utils";
import {
  AtSign,
  Search,
  Filter,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Sparkles,
  RefreshCw,
  FolderPlus,
  AlertTriangle,
} from "lucide-react";

export default function SocialMonitoringPage() {
  const { selectedBrandId, brands } = useBrand();

  const [findings, setFindings] = useState<Finding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");

  const fetchSocialFindings = async () => {
    setIsLoading(true);
    try {
      const url = `/api/findings?sourceModule=social${
        selectedBrandId !== "all" ? `&brandId=${selectedBrandId}` : ""
      }`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setFindings(json.data);
      }
    } catch (err) {
      console.warn("Could not fetch social findings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSocialFindings();
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
      f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.indicators.some((ind) => ind.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSeverity =
      selectedSeverity === "all" || f.severity === selectedSeverity;

    // Platform matching from entityName or description
    const matchesPlatform =
      selectedPlatform === "all" ||
      f.title.toLowerCase().includes(selectedPlatform.toLowerCase()) ||
      f.description.toLowerCase().includes(selectedPlatform.toLowerCase());

    return matchesSearch && matchesSeverity && matchesPlatform;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-sentrix-card border border-sentrix-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded bg-sky-500/10 text-sky-400">
              <AtSign className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono uppercase text-sky-400 font-bold tracking-wider">
              Social Intelligence Workspace
            </span>
          </div>
          <h1 className="text-xl font-bold text-sentrix-text">
            Social Impersonation & Scam Detection
          </h1>
          <p className="text-xs text-sentrix-muted">
            Identify rogue profiles, fake customer support desks, giveaway scams, and lookalike handles across social networks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSocialFindings}
            disabled={isLoading}
            className="p-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-muted hover:text-sentrix-text hover:border-sentrix-borderLight transition-colors"
            title="Refresh feed"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sentrix-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search social profiles, handles (@...), scam language, or indicators..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-xs text-sentrix-text placeholder:text-sentrix-muted focus:outline-none focus:border-sentrix-cyan"
          />
        </div>

        {/* Platform filter */}
        <select
          value={selectedPlatform}
          onChange={(e) => setSelectedPlatform(e.target.value)}
          className="px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-xs text-sentrix-text focus:outline-none focus:border-sentrix-cyan"
        >
          <option value="all">All Social Platforms</option>
          <option value="Instagram">Instagram</option>
          <option value="Twitter">Twitter / X</option>
          <option value="TikTok">TikTok</option>
          <option value="LinkedIn">LinkedIn</option>
        </select>

        {/* Severity filter */}
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

      {/* Findings List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center p-16 text-xs text-sentrix-muted">
            <div className="w-5 h-5 border-2 border-sentrix-cyan border-t-transparent rounded-full animate-spin mr-2" />
            Analyzing social feed telemetry...
          </div>
        ) : filteredFindings.length === 0 ? (
          <div className="p-12 text-center bg-sentrix-card rounded-xl border border-sentrix-border space-y-2">
            <p className="text-sm font-semibold text-sentrix-text">
              No matching social findings found.
            </p>
            <p className="text-xs text-sentrix-muted">
              Try adjusting your platform filters, or use the "Screen Asset" button to analyze a new candidate profile.
            </p>
          </div>
        ) : (
          filteredFindings.map((finding) => (
            <div
              key={finding.id}
              className="p-5 rounded-xl bg-sentrix-card border border-sentrix-border hover:border-sentrix-cyan/30 transition-all space-y-4 group"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <RiskScoreBadge
                      score={finding.riskScore}
                      severity={finding.severity}
                      classification={finding.classification}
                      size="md"
                    />
                    <span className="text-xs font-mono text-sentrix-cyan bg-sentrix-cyan/10 px-2 py-0.5 rounded font-semibold">
                      {finding.brandName}
                    </span>
                    <span className="text-[11px] text-sentrix-muted font-mono">
                      Confidence: {finding.confidence}%
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-sentrix-text group-hover:text-sentrix-cyan transition-colors">
                    {finding.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-sentrix-muted">
                    <span className="font-mono text-sentrix-text font-semibold">
                      {finding.entityName}
                    </span>
                    {finding.entityUrl && (
                      <a
                        href={finding.entityUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sentrix-cyan hover:underline flex items-center gap-1 text-[11px]"
                      >
                        Target Profile <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <StatusSelect
                    currentStatus={finding.status}
                    onChange={(st) => handleStatusChange(finding.id, st)}
                  />
                  <Link
                    href={`/findings/${finding.id}`}
                    className="px-3 py-1.5 rounded-lg bg-sentrix-surface border border-sentrix-border hover:border-sentrix-cyan text-xs font-semibold text-sentrix-cyan flex items-center gap-1 transition-colors"
                  >
                    Evidence <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              <p className="text-xs text-sentrix-muted leading-relaxed">
                {finding.description}
              </p>

              {/* Indicators tags */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-sentrix-border/60">
                <span className="text-[10px] uppercase font-bold text-sentrix-subtle tracking-wider mr-1">
                  Indicators:
                </span>
                {finding.indicators.map((ind, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] font-mono px-2 py-0.5 rounded bg-sentrix-surface border border-sentrix-border text-sentrix-text"
                  >
                    {ind}
                  </span>
                ))}
                <span className="ml-auto text-[11px] text-sentrix-subtle font-mono">
                  Observed {formatTimeAgo(finding.lastObservedAt)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

