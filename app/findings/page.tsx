"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useBrand } from "@/lib/brand-context";
import { Finding, SourceModule, Severity, FindingStatus } from "@/types";
import { RiskScoreBadge } from "@/components/shared/risk-score-badge";
import { StatusSelect } from "@/components/shared/status-select";
import { formatTimeAgo } from "@/lib/utils";
import { resilientFetch } from "@/lib/api-client";
import { playCyberClick } from "@/lib/sound";
import {
  AlertTriangle,
  Search,
  RefreshCw,
  Download,
  ExternalLink,
  ArrowRight,
  Filter,
  AtSign,
  Smartphone,
  Globe,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

export default function FindingsPage() {
  const { selectedBrandId, brands } = useBrand();

  const [findings, setFindings] = useState<Finding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Pagination for scalability
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchFindings = async () => {
    setIsLoading(true);
    try {
      const url = `/api/findings?${
        selectedBrandId !== "all" ? `brandId=${selectedBrandId}` : ""
      }`;
      const res = await resilientFetch<Finding[]>(url);
      if (res.data) {
        setFindings(res.data);
      }
    } catch (err) {
      console.warn("Could not fetch findings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFindings();
    setCurrentPage(1);
  }, [selectedBrandId]);

  const handleStatusChange = async (findingId: string, newStatus: FindingStatus) => {
    try {
      await fetch(`/api/findings/${findingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setFindings((prev) =>
        prev.map((f) => (f.id === findingId ? { ...f, status: newStatus } : f))
      );
      playCyberClick();
    } catch (err) {
      // Local optimistic update even if network error
      setFindings((prev) =>
        prev.map((f) => (f.id === findingId ? { ...f, status: newStatus } : f))
      );
    }
  };

  const handleExportJson = () => {
    playCyberClick();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(findings, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sentrix_findings_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredFindings = findings.filter((f) => {
    const matchesSearch =
      f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.entityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.indicators.some((ind) => ind.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesModule =
      selectedModule === "all" || f.sourceModule === selectedModule;
    const matchesSeverity =
      selectedSeverity === "all" || f.severity === selectedSeverity;
    const matchesStatus =
      selectedStatus === "all" || f.status === selectedStatus;

    return matchesSearch && matchesModule && matchesSeverity && matchesStatus;
  });

  const totalPages = Math.ceil(filteredFindings.length / pageSize) || 1;
  const paginatedFindings = filteredFindings.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const getModuleIcon = (mod: SourceModule) => {
    switch (mod) {
      case "social":
        return <AtSign className="w-3.5 h-3.5 text-sky-400" />;
      case "app":
        return <Smartphone className="w-3.5 h-3.5 text-emerald-400" />;
      case "domain":
      case "web":
        return <Globe className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <AlertTriangle className="w-3.5 h-3.5 text-sentrix-cyan" />;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-sentrix-card border border-sentrix-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded bg-sentrix-cyan/10 text-sentrix-cyan">
              <AlertTriangle className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono uppercase text-sentrix-cyan font-bold tracking-wider">
              Unified Threat Findings Engine
            </span>
          </div>
          <h1 className="text-xl font-bold text-sentrix-text">
            Threat & Impersonation Findings Repository
          </h1>
          <p className="text-xs text-sentrix-muted">
            Aggregated threat intelligence ledger harmonizing social impersonations, rogue applications, and phishing domains.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-xs text-sentrix-muted hover:text-sentrix-text hover:border-sentrix-borderLight transition-all"
            title="Export JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export JSON</span>
          </button>
          <button
            onClick={() => {
              playCyberClick();
              fetchFindings();
            }}
            disabled={isLoading}
            className="p-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-muted hover:text-sentrix-text transition-colors"
            title="Refresh repository"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 rounded-xl bg-sentrix-card border border-sentrix-border">
        {/* Search */}
        <div className="lg:col-span-2 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-sentrix-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Filter by indicator, target, entity..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-sentrix-surface border border-sentrix-border text-xs text-sentrix-text placeholder-sentrix-muted focus:outline-none focus:border-sentrix-cyan transition-colors"
          />
        </div>

        {/* Vector Module Filter */}
        <select
          value={selectedModule}
          onChange={(e) => {
            setSelectedModule(e.target.value);
            setCurrentPage(1);
            playCyberClick();
          }}
          className="px-3 py-1.5 rounded-lg bg-sentrix-surface border border-sentrix-border text-xs text-sentrix-text focus:outline-none focus:border-sentrix-cyan"
        >
          <option value="all">All Threat Vectors</option>
          <option value="social">Social Networks</option>
          <option value="app">Mobile App Stores</option>
          <option value="domain">Website & Domains</option>
        </select>

        {/* Severity Filter */}
        <select
          value={selectedSeverity}
          onChange={(e) => {
            setSelectedSeverity(e.target.value);
            setCurrentPage(1);
            playCyberClick();
          }}
          className="px-3 py-1.5 rounded-lg bg-sentrix-surface border border-sentrix-border text-xs text-sentrix-text focus:outline-none focus:border-sentrix-cyan"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical Severity</option>
          <option value="high">High Severity</option>
          <option value="medium">Medium Severity</option>
          <option value="low">Low Severity</option>
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => {
            setSelectedStatus(e.target.value);
            setCurrentPage(1);
            playCyberClick();
          }}
          className="px-3 py-1.5 rounded-lg bg-sentrix-surface border border-sentrix-border text-xs text-sentrix-text focus:outline-none focus:border-sentrix-cyan"
        >
          <option value="all">All Workflow Statuses</option>
          <option value="new">New Finding</option>
          <option value="under_review">Under Review</option>
          <option value="investigating">Investigating</option>
          <option value="confirmed_threat">Confirmed Threat</option>
          <option value="false_positive">False Positive</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Findings Table */}
      <div className="p-5 rounded-xl bg-sentrix-card border border-sentrix-border overflow-hidden">
        <div className="flex items-center justify-between mb-3 text-xs text-sentrix-muted">
          <span>
            Showing <strong>{paginatedFindings.length}</strong> of <strong>{filteredFindings.length}</strong> threat dossiers
          </span>
          {filteredFindings.length > 0 && (
            <span className="font-mono text-[11px]">
              Page {currentPage} of {totalPages}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-sentrix-border text-sentrix-subtle uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Severity & Risk</th>
                <th className="py-3 px-3">Title & Target Entity</th>
                <th className="py-3 px-3">Brand</th>
                <th className="py-3 px-3">Vector</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">First Seen</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sentrix-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-sentrix-muted">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-sentrix-cyan border-t-transparent rounded-full animate-spin" />
                      Loading findings repository...
                    </div>
                  </td>
                </tr>
              ) : paginatedFindings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-sentrix-muted">
                    No threat findings match current filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedFindings.map((finding) => (
                  <tr
                    key={finding.id}
                    className="hover:bg-sentrix-surface/60 transition-colors group"
                  >
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <RiskScoreBadge
                        score={finding.riskScore}
                        severity={finding.severity}
                        classification={finding.classification}
                        size="sm"
                      />
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-sentrix-text group-hover:text-sentrix-cyan transition-colors max-w-sm truncate privacy-sensitive">
                        {finding.title}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-sentrix-muted font-mono truncate max-w-sm privacy-sensitive">
                        <span>{finding.entityName}</span>
                        {finding.entityUrl && (
                          <a
                            href={finding.entityUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sentrix-cyan hover:underline inline-flex items-center"
                          >
                            <ExternalLink className="w-2.5 h-2.5 ml-1" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap font-medium text-sentrix-text privacy-sensitive">
                      {finding.brandName}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase text-sentrix-muted bg-sentrix-surface px-2 py-0.5 rounded border border-sentrix-border">
                        {getModuleIcon(finding.sourceModule)}
                        {finding.sourceModule}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <StatusSelect
                        currentStatus={finding.status}
                        onChange={(st) => handleStatusChange(finding.id, st)}
                      />
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap text-sentrix-muted text-[11px] font-mono">
                      {formatTimeAgo(finding.firstDetectedAt)}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap text-right">
                      <Link
                        href={`/findings/${finding.id}`}
                        onClick={() => playCyberClick()}
                        className="inline-flex items-center gap-1 font-semibold text-sentrix-cyan hover:underline"
                      >
                        Inspect <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 mt-3 border-t border-sentrix-border text-xs">
            <span className="text-sentrix-muted">
              Showing page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  playCyberClick();
                  setCurrentPage((p) => Math.max(1, p - 1));
                }}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-muted hover:text-sentrix-text disabled:opacity-40 transition-all flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <button
                onClick={() => {
                  playCyberClick();
                  setCurrentPage((p) => Math.min(totalPages, p + 1));
                }}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-muted hover:text-sentrix-text disabled:opacity-40 transition-all flex items-center gap-1"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
