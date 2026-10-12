"use client";

import React, { useState, useEffect } from "react";
import { useBrand } from "@/lib/brand-context";
import { MonitoringJob } from "@/types";
import { formatTimeAgo, formatTimestamp } from "@/lib/utils";
import {
  Activity,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Radio,
  Layers,
  AtSign,
  Smartphone,
  Globe,
} from "lucide-react";

export default function MonitoringActivityPage() {
  const { selectedBrandId, brands } = useBrand();

  const [jobs, setJobs] = useState<MonitoringJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const url = `/api/monitoring?${
        selectedBrandId !== "all" ? `brandId=${selectedBrandId}` : ""
      }`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setJobs(json.data);
      }
    } catch (err) {
      console.warn("Could not fetch monitoring jobs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [selectedBrandId]);

  const handleRunJob = async (jobId: string) => {
    setRunningJobId(jobId);
    try {
      const res = await fetch("/api/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const json = await res.json();
      if (json.success) {
        setJobs((prev) =>
          prev.map((j) => (j.id === jobId ? json.data : j))
        );
      }
    } catch (err) {
      alert("Failed running monitoring job.");
    } finally {
      setRunningJobId(null);
    }
  };

  const getModuleIcon = (mod: string) => {
    switch (mod) {
      case "social":
        return <AtSign className="w-4 h-4 text-sky-400" />;
      case "app":
        return <Smartphone className="w-4 h-4 text-emerald-400" />;
      case "domain":
      case "web":
        return <Globe className="w-4 h-4 text-purple-400" />;
      default:
        return <Activity className="w-4 h-4 text-sentrix-cyan" />;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-sentrix-card border border-sentrix-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded bg-sentrix-teal/10 text-sentrix-teal">
              <Activity className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono uppercase text-sentrix-teal font-bold tracking-wider">
              Telemetry & Scheduler
            </span>
          </div>
          <h1 className="text-xl font-bold text-sentrix-text">
            Monitoring Engines & Automated Jobs
          </h1>
          <p className="text-xs text-sentrix-muted">
            Configure automated crawler cadences, inspect scan volume telemetry, and trigger manual screening sweeps.
          </p>
        </div>

        <button
          onClick={fetchJobs}
          disabled={isLoading}
          className="p-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-muted hover:text-sentrix-text hover:border-sentrix-borderLight transition-colors"
          title="Refresh jobs"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {isLoading ? (
          <div className="col-span-2 flex items-center justify-center p-20 text-xs text-sentrix-muted">
            <div className="w-5 h-5 border-2 border-sentrix-cyan border-t-transparent rounded-full animate-spin mr-2" />
            Loading job scheduler registry...
          </div>
        ) : jobs.length === 0 ? (
          <div className="col-span-2 p-12 text-center bg-sentrix-card rounded-xl border border-sentrix-border space-y-2">
            <p className="text-sm font-semibold text-sentrix-text">
              No monitoring jobs configured for this scope.
            </p>
          </div>
        ) : (
          jobs.map((job) => {
            const isExecuting = runningJobId === job.id;

            return (
              <div
                key={job.id}
                className="p-5 rounded-xl bg-sentrix-card border border-sentrix-border hover:border-sentrix-borderLight transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-sentrix-surface border border-sentrix-border">
                        {getModuleIcon(job.module)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-sentrix-text">
                          {job.name}
                        </h3>
                        <span className="text-[11px] font-mono text-sentrix-cyan uppercase">
                          Cadence: {job.schedule}
                        </span>
                      </div>
                    </div>

                    <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      <Radio className="w-2.5 h-2.5 animate-pulseSubtle" /> Active
                    </span>
                  </div>

                  {/* Summary / execution log */}
                  {job.lastExecutionSummary && (
                    <div className="mt-3 p-3 rounded-lg bg-sentrix-surface border border-sentrix-border/60 text-xs text-sentrix-muted leading-relaxed font-mono">
                      {job.lastExecutionSummary}
                    </div>
                  )}

                  {/* Scanned metrics */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-sentrix-border/60 text-xs">
                    <div>
                      <span className="text-[10px] text-sentrix-subtle block">Total Scanned</span>
                      <span className="font-mono font-bold text-sentrix-text text-sm">
                        {job.itemsScannedTotal.toLocaleString()} items
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-sentrix-subtle block">Threats Isolated</span>
                      <span className="font-mono font-bold text-red-400 text-sm">
                        {job.threatsIdentifiedTotal}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-sentrix-border text-xs">
                  <span className="text-[10px] text-sentrix-muted">
                    Last Run: {formatTimeAgo(job.lastRunAt)}
                  </span>
                  <button
                    onClick={() => handleRunJob(job.id)}
                    disabled={isExecuting}
                    className="px-3.5 py-1.5 rounded-lg bg-sentrix-cyan text-sentrix-bg text-xs font-bold hover:brightness-110 flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <Play className={`w-3.5 h-3.5 fill-current ${isExecuting ? "animate-spin" : ""}`} />
                    {isExecuting ? "Executing Sweep..." : "Run Sweep Now"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

