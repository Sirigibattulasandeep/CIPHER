"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useBrand } from "@/lib/brand-context";
import { Finding } from "@/types";
import { RiskScoreBadge } from "@/components/shared/risk-score-badge";
import { StatusSelect } from "@/components/shared/status-select";
import { formatTimeAgo } from "@/lib/utils";
import {
  Globe,
  Search,
  RefreshCw,
  ExternalLink,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Sparkles,
} from "lucide-react";

export default function DomainsMonitoringPage() {
  const { selectedBrandId, brands } = useBrand();

  const [findings, setFindings] = useState<Finding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");

  // Typosquat generator widget state
  const [activeBrandDomain, setActiveBrandDomain] = useState<string>("eduverse.org");
  const [typosquats, setTyposquats] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchDomainFindings = async () => {
    setIsLoading(true);
    try {
      const url = `/api/findings?sourceModule=domain${
        selectedBrandId !== "all" ? `&brandId=${selectedBrandId}` : ""
      }`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setFindings(json.data);
      }
    } catch (err) {
      console.warn("Could not fetch domain findings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDomainFindings();
  }, [selectedBrandId]);

  useEffect(() => {
    // Generate initial typosquats for selected brand domain
    const targetBrand = brands.find((b) => b.id === selectedBrandId) || brands[0];
    if (targetBrand && targetBrand.officialDomains[0]) {
      setActiveBrandDomain(targetBrand.officialDomains[0]);
      generateTypos(targetBrand.officialDomains[0]);
    }
  }, [selectedBrandId, brands]);

  const generateTypos = async (domain: string) => {
    setIsGenerating(true);
    try {
      const targetBrand = brands.find((b) => b.id === selectedBrandId) || brands[0];
      const res = await fetch("/api/analyze/domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId: targetBrand?.id || "brand-edtech-01",
          urlOrDomain: domain,
          generateTyposquats: true,
        }),
      });
      const data = await res.json();
      if (data.success && data.typosquats) {
        setTyposquats(data.typosquats);
      }
    } catch (err) {
      console.warn("Failed generating typosquats:", err);
    } finally {
      setIsGenerating(false);
    }
  };

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
            <span className="p-1 rounded bg-purple-500/10 text-purple-400">
              <Globe className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono uppercase text-purple-400 font-bold tracking-wider">
              Domain Radar & Phishing Defense
            </span>
          </div>
          <h1 className="text-xl font-bold text-sentrix-text">
            Lookalike Domains & Phishing Infrastructure
          </h1>
          <p className="text-xs text-sentrix-muted">
            Continuous DNS monitoring, homoglyphs, typosquatting mutations, and safe server-side URL inspection with SSRF protections.
          </p>
        </div>

        <button
          onClick={fetchDomainFindings}
          disabled={isLoading}
          className="p-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-muted hover:text-sentrix-text hover:border-sentrix-borderLight transition-colors"
          title="Refresh feed"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Realtime Typosquatting Sentinel Generator */}
      <div className="p-5 rounded-xl bg-sentrix-card border border-sentrix-border space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-sentrix-text flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sentrix-cyan" />
              Automated Typosquatting Permutation Radar
            </h3>
            <p className="text-xs text-sentrix-muted">
              Simulated permutations of primary brand domain '{activeBrandDomain}'
            </p>
          </div>
          <button
            onClick={() => generateTypos(activeBrandDomain)}
            disabled={isGenerating}
            className="px-3 py-1.5 rounded-lg bg-sentrix-surface border border-sentrix-border text-xs text-sentrix-cyan font-semibold hover:border-sentrix-cyan transition-colors"
          >
            {isGenerating ? "Analyzing DNS..." : "Regenerate Permutations"}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {typosquats.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-sentrix-surface border border-sentrix-border text-xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-sentrix-text truncate">
                  {item.domain}
                </span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    item.status === "active_resolving"
                      ? "bg-red-500/10 text-red-400 border border-red-500/30"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                  }`}
                >
                  {item.status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-sentrix-muted pt-1">
                <span className="capitalize">{item.variationType}</span>
                <span className="font-mono text-sentrix-cyan">Risk: {item.riskScore}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sentrix-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate domains, phishing URLs, indicators..."
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

      {/* Findings List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center p-16 text-xs text-sentrix-muted">
            <div className="w-5 h-5 border-2 border-sentrix-cyan border-t-transparent rounded-full animate-spin mr-2" />
            Scanning domain intelligence database...
          </div>
        ) : filteredFindings.length === 0 ? (
          <div className="p-12 text-center bg-sentrix-card rounded-xl border border-sentrix-border space-y-2">
            <p className="text-sm font-semibold text-sentrix-text">
              No matching domain or phishing findings found.
            </p>
            <p className="text-xs text-sentrix-muted">
              Use "Screen Asset" in the top bar to inspect any suspicious external URL safely.
            </p>
          </div>
        ) : (
          filteredFindings.map((finding) => (
            <div
              key={finding.id}
              className="p-5 rounded-xl bg-sentrix-card border border-sentrix-border hover:border-purple-500/40 transition-all space-y-4 group"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <RiskScoreBadge
                      score={finding.riskScore}
                      severity={finding.severity}
                      size="md"
                    />
                    <span className="text-xs font-mono text-sentrix-cyan bg-sentrix-cyan/10 px-2 py-0.5 rounded font-semibold">
                      {finding.brandName}
                    </span>
                    <span className="text-[11px] font-mono text-purple-400 uppercase bg-purple-500/10 px-2 py-0.5 rounded">
                      {finding.category.replace(/_/g, " ")}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-sentrix-text group-hover:text-purple-400 transition-colors">
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
                        Target URL <ExternalLink className="w-3 h-3" />
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

              {/* Indicators & Observed Tag */}
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

