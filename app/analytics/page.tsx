"use client";

import React, { useState, useEffect } from "react";
import { useBrand } from "@/lib/brand-context";
import {
  BarChart3,
  TrendingUp,
  RefreshCw,
  Shield,
  Layers,
  CheckCircle,
  AlertOctagon,
  Clock,
  Download,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AnalyticsPage() {
  const { selectedBrandId, brands } = useBrand();

  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/analytics?brandId=${selectedBrandId}`);
      const json = await res.json();
      if (json.success) {
        setMetrics(json.data);
      }
    } catch (err) {
      console.warn("Could not fetch analytics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedBrandId]);

  const severityColors = ["#EF4444", "#F97316", "#F59E0B", "#06B6D4"];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-sentrix-card border border-sentrix-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded bg-sentrix-cyan/10 text-sentrix-cyan">
              <BarChart3 className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono uppercase text-sentrix-cyan font-bold tracking-wider">
              Executive Analytics & Telemetry
            </span>
          </div>
          <h1 className="text-xl font-bold text-sentrix-text">
            Threat Intelligence & Resolution Metrics
          </h1>
          <p className="text-xs text-sentrix-muted">
            High-level metrics on digital risk posture, attack vectors, MTTR, and enforcement takedown rates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (!metrics) return;
              const reportData = {
                reportTitle: "SENTRIX Digital Risk Protection Executive Intelligence Report",
                generatedAt: new Date().toISOString(),
                brandScope: selectedBrandId === "all" ? "All Monitored Brands" : brands.find(b => b.id === selectedBrandId)?.name || selectedBrandId,
                metricsSummary: metrics,
              };
              const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `sentrix-intelligence-report-${selectedBrandId}-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            disabled={isLoading || !metrics}
            className="px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-cyan hover:bg-sentrix-hover flex items-center gap-1.5 text-xs font-semibold transition-colors"
            title="Download JSON Intelligence Report"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report (JSON)</span>
          </button>

          <button
            onClick={fetchAnalytics}
            disabled={isLoading}
            className="p-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-muted hover:text-sentrix-text hover:border-sentrix-borderLight transition-colors"
            title="Refresh analytics"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-sentrix-card border border-sentrix-border">
          <span className="text-xs font-semibold text-sentrix-muted">Total Findings Logged</span>
          <div className="text-2xl font-extrabold text-sentrix-text font-mono mt-1">
            {metrics?.totalFindings ?? "..."}
          </div>
          <p className="text-[11px] text-sentrix-muted mt-1">100% auditable record store</p>
        </div>

        <div className="p-4 rounded-xl bg-sentrix-card border border-red-500/20">
          <span className="text-xs font-semibold text-red-400">Critical Threat Index</span>
          <div className="text-2xl font-extrabold text-red-400 font-mono mt-1">
            {metrics ? Math.round((metrics.criticalFindings / (metrics.totalFindings || 1)) * 100) : 0}%
          </div>
          <p className="text-[11px] text-sentrix-muted mt-1">Ratio of critical severity events</p>
        </div>

        <div className="p-4 rounded-xl bg-sentrix-card border border-emerald-500/20">
          <span className="text-xs font-semibold text-emerald-400">Enforcement Success Rate</span>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">
            94.8%
          </div>
          <p className="text-[11px] text-sentrix-muted mt-1">DMCA & platform abuse receipts</p>
        </div>

        <div className="p-4 rounded-xl bg-sentrix-card border border-purple-500/20">
          <span className="text-xs font-semibold text-purple-400">Mean Triage Velocity</span>
          <div className="text-2xl font-extrabold text-purple-300 font-mono mt-1">
            4.2 hrs
          </div>
          <p className="text-[11px] text-sentrix-muted mt-1">Detection-to-escalation average</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module Vector Breakdown */}
        <div className="p-5 rounded-xl bg-sentrix-card border border-sentrix-border space-y-3">
          <h3 className="text-sm font-bold text-sentrix-text">
            Findings by Threat Vector / Module
          </h3>
          <p className="text-xs text-sentrix-muted">
            Distribution across social, app, and domain intelligence engines
          </p>
          <div className="h-60 w-full pt-2">
            {metrics?.moduleData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.moduleData}>
                  <XAxis dataKey="name" stroke="#60728D" fontSize={11} tickLine={false} />
                  <YAxis stroke="#60728D" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0E1626",
                      borderColor: "#1E2D48",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#F3F7FC",
                    }}
                  />
                  <Bar dataKey="value" name="Threat Count" fill="#35D9FF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-sentrix-muted">
                Loading...
              </div>
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="p-5 rounded-xl bg-sentrix-card border border-sentrix-border space-y-3">
          <h3 className="text-sm font-bold text-sentrix-text">
            Threat Distribution by Attack Modality
          </h3>
          <p className="text-xs text-sentrix-muted">
            Specific fraud and impersonation techniques detected
          </p>
          <div className="h-60 w-full pt-2">
            {metrics?.categoryData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.categoryData} layout="vertical">
                  <XAxis type="number" stroke="#60728D" fontSize={11} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#60728D"
                    fontSize={10}
                    tickLine={false}
                    width={110}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0E1626",
                      borderColor: "#1E2D48",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#F3F7FC",
                    }}
                  />
                  <Bar dataKey="value" name="Count" fill="#28D7B0" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-sentrix-muted">
                Loading...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

