"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useBrand } from "@/lib/brand-context";
import { Investigation, FindingStatus } from "@/types";
import { RiskScoreBadge } from "@/components/shared/risk-score-badge";
import { getStatusBadgeClass, formatTimeAgo } from "@/lib/utils";
import { resilientFetch } from "@/lib/api-client";
import { playCyberClick } from "@/lib/sound";
import {
  FolderKanban,
  Search,
  RefreshCw,
  Plus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  FileText,
} from "lucide-react";

export default function InvestigationsPage() {
  const { selectedBrandId, brands } = useBrand();

  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchInvestigations = async () => {
    setIsLoading(true);
    try {
      const url = `/api/investigations?${
        selectedBrandId !== "all" ? `brandId=${selectedBrandId}` : ""
      }`;
      const res = await resilientFetch<Investigation[]>(url);
      if (res.data) {
        setInvestigations(res.data);
      }
    } catch (err) {
      console.warn("Could not load investigations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestigations();
  }, [selectedBrandId]);

  const filteredInvestigations = investigations.filter((inv) => {
    const matchesSearch =
      inv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.brandName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-sentrix-card border border-sentrix-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded bg-purple-500/10 text-purple-400">
              <FolderKanban className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono uppercase text-purple-400 font-bold tracking-wider">
              Incident Response Centre
            </span>
          </div>
          <h1 className="text-xl font-bold text-sentrix-text">
            Active Threat Investigation Cases
          </h1>
          <p className="text-xs text-sentrix-muted">
            Manage forensic case files, track remediation action orders, author analyst memos, and log legal enforcement takedowns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchInvestigations}
            disabled={isLoading}
            className="p-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-muted hover:text-sentrix-text hover:border-sentrix-borderLight transition-colors"
            title="Refresh cases"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
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
            placeholder="Search investigation cases, brands, summary keywords..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-xs text-sentrix-text placeholder:text-sentrix-muted focus:outline-none focus:border-sentrix-cyan"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
          {["all", "investigating", "under_review", "confirmed_threat", "resolved"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap capitalize transition-colors ${
                statusFilter === st
                  ? "bg-purple-600 text-white font-bold"
                  : "bg-sentrix-surface text-sentrix-muted hover:text-sentrix-text border border-sentrix-border"
              }`}
            >
              {st.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Cases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-3 flex items-center justify-center p-20 text-xs text-sentrix-muted">
            <div className="w-5 h-5 border-2 border-sentrix-cyan border-t-transparent rounded-full animate-spin mr-2" />
            Loading investigation cases...
          </div>
        ) : filteredInvestigations.length === 0 ? (
          <div className="col-span-3 p-12 text-center bg-sentrix-card rounded-xl border border-sentrix-border space-y-2">
            <p className="text-sm font-semibold text-sentrix-text">
              No matching investigation cases found.
            </p>
            <p className="text-xs text-sentrix-muted">
              Select any finding from the Findings repository to escalate it into an active case.
            </p>
          </div>
        ) : (
          filteredInvestigations.map((inv) => (
            <div
              key={inv.id}
              className="p-5 rounded-xl bg-sentrix-card border border-sentrix-border hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-mono text-[10px] text-purple-400 uppercase bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded font-bold">
                    {inv.priority.toUpperCase()} Priority
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${getStatusBadgeClass(inv.status)}`}>
                    {inv.status.replace(/_/g, " ")}
                  </span>
                </div>

                <h3 className="text-base font-bold text-sentrix-text group-hover:text-purple-300 transition-colors">
                  {inv.title}
                </h3>
                <p className="text-xs text-sentrix-cyan font-mono mt-0.5">
                  {inv.brandName}
                </p>
                <p className="text-xs text-sentrix-muted line-clamp-2 leading-relaxed mt-2">
                  {inv.summary}
                </p>

                {/* Case Metrics Bar */}
                <div className="mt-3 grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-sentrix-surface border border-sentrix-border/60 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-sentrix-subtle block">Findings</span>
                    <span className="font-mono font-bold text-sentrix-text">
                      {inv.findingIds.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-sentrix-subtle block">Notes</span>
                    <span className="font-mono font-bold text-sentrix-text">
                      {inv.notes.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-sentrix-subtle block">Actions</span>
                    <span className="font-mono font-bold text-sentrix-teal">
                      {inv.responseActions.length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-sentrix-border/60 flex items-center justify-between text-xs">
                <span className="text-[11px] text-sentrix-subtle">
                  Updated {formatTimeAgo(inv.updatedAt)}
                </span>
                <Link
                  href={`/investigations/${inv.id}`}
                  className="font-semibold text-purple-400 hover:underline flex items-center gap-1"
                >
                  Open Case File <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

