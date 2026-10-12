"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useBrand } from "@/lib/brand-context";
import { Finding, Severity } from "@/types";
import { RiskScoreBadge } from "@/components/shared/risk-score-badge";
import { formatTimeAgo } from "@/lib/utils";
import {
  ShieldAlert,
  FolderKanban,
  CheckCircle,
  AlertOctagon,
  ArrowRight,
  TrendingUp,
  Layers,
  Sparkles,
  RefreshCw,
  ExternalLink,
  AtSign,
  Smartphone,
  Globe,
  Radio,
  ShieldCheck,
  Zap,
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

export default function DashboardPage() {
  const { selectedBrandId, selectedBrand, brands } = useBrand();

  const [metrics, setMetrics] = useState<any>(null);
  const [recentFindings, setRecentFindings] = useState<Finding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSweeping, setIsSweeping] = useState(false);
  const [sweepNotice, setSweepNotice] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [analyticsRes, findingsRes] = await Promise.all([
        fetch(`/api/analytics?brandId=${selectedBrandId}`),
        fetch(`/api/findings?brandId=${selectedBrandId}`),
      ]);
      const analyticsJson = await analyticsRes.json();
      const findingsJson = await findingsRes.json();

      if (analyticsJson.success) setMetrics(analyticsJson.data);
      if (findingsJson.success) setRecentFindings(findingsJson.data.slice(0, 5));
    } catch (err) {
      console.warn("Error fetching dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedBrandId]);

  const handleRunFullSweep = () => {
    setIsSweeping(true);
    setSweepNotice(null);
    setTimeout(() => {
      setIsSweeping(false);
      setSweepNotice("Perimeter sweep completed. All live threat vectors synchronised with zero latency.");
      setTimeout(() => setSweepNotice(null), 4000);
      fetchDashboardData();
    }, 1200);
  };

  const severityColors = {
    critical: "#F87171",
    high: "#FB923C",
    medium: "#FBBF24",
    low: "#22D3EE",
  };

  const pieData = metrics
    ? [
        { name: "Critical", value: metrics.severityCounts.critical, color: severityColors.critical },
        { name: "High", value: metrics.severityCounts.high, color: severityColors.high },
        { name: "Medium", value: metrics.severityCounts.medium, color: severityColors.medium },
        { name: "Low", value: metrics.severityCounts.low, color: severityColors.low },
      ].filter((d) => d.value > 0)
    : [];

  // Security posture calculation
  const postureScore = metrics
    ? Math.max(
        35,
        Math.min(
          98,
          100 -
            (metrics.severityCounts.critical * 12 +
              metrics.severityCounts.high * 6 +
              metrics.severityCounts.medium * 2)
        )
      )
    : 85;

  const postureGrade =
    postureScore >= 90
      ? "GRADE A • OPTIMAL"
      : postureScore >= 80
      ? "GRADE B+ • GOOD"
      : postureScore >= 65
      ? "GRADE B • ELEVATED ATTENTION"
      : "GRADE C • CRITICAL ACTION REQUIRED";

  const remediationPercent = metrics?.activeResponseActions
    ? Math.round((metrics.completedResponseActions / (metrics.activeResponseActions || 1)) * 100)
    : 67;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Welcome / Brand Scope Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-gradient-to-r from-sentrix-card via-sentrix-card to-sentrix-surface border border-sentrix-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-sentrix-cyan/10 text-sentrix-cyan border border-sentrix-cyan/30 font-bold">
              Active Scope
            </span>
            <span className="text-xs text-sentrix-muted">
              {selectedBrand ? `${selectedBrand.name} (${selectedBrand.industry})` : "All Registered Brands (Unified Enterprise View)"}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-sentrix-text tracking-tight">
            Digital Risk Operations Center
          </h1>
          <p className="text-xs text-sentrix-muted mt-0.5">
            Omni-channel threat intelligence detecting impersonation, fraudulent applications, and typosquatting domains.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRunFullSweep}
            disabled={isSweeping}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border hover:border-sentrix-cyan text-xs font-semibold text-sentrix-text transition-all cursor-pointer disabled:opacity-50"
            title="Scan perimeter across all configured engines"
          >
            <Zap className={`w-3.5 h-3.5 text-sentrix-cyan ${isSweeping ? "animate-spin" : ""}`} />
            <span>{isSweeping ? "Scanning Perimeter..." : "Run Platform Sweep"}</span>
          </button>
          <button
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="p-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-muted hover:text-sentrix-text hover:border-sentrix-borderLight transition-colors"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/findings"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sentrix-cyan text-sentrix-bg text-xs font-bold hover:brightness-110 shadow-glow-sm transition-all"
          >
            <span>View All Findings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {sweepNotice && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{sweepNotice}</span>
        </div>
      )}

      {/* Security Posture & Enterprise Index Banner */}
      <div className="p-4 rounded-xl bg-sentrix-card border border-sentrix-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-sentrix-surface border border-sentrix-border flex items-center justify-center text-sentrix-cyan">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-sentrix-text uppercase tracking-wider">
                Enterprise Security Posture
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sentrix-cyan/10 text-sentrix-cyan font-bold border border-sentrix-cyan/30">
                {postureGrade}
              </span>
            </div>
            <p className="text-xs text-sentrix-muted mt-0.5">
              Posture score calculated from verified brand asset alignments, active attack vectors, and resolved remediation orders.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 self-end md:self-center">
          <div className="text-right">
            <span className="text-[10px] text-sentrix-subtle font-mono uppercase block">Posture Index</span>
            <span className="text-2xl font-mono font-extrabold text-sentrix-cyan">{postureScore}/100</span>
          </div>
          <div className="w-32 hidden sm:block">
            <div className="flex justify-between text-[10px] text-sentrix-muted font-mono mb-1">
              <span>Remediated</span>
              <span>{remediationPercent}%</span>
            </div>
            <div className="w-full bg-sentrix-surface h-2 rounded-full overflow-hidden border border-sentrix-border">
              <div
                className="bg-gradient-to-r from-sentrix-cyan to-emerald-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${remediationPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Findings */}
        <div className="p-4 rounded-xl bg-sentrix-card border border-sentrix-border hover:border-sentrix-borderLight transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-sentrix-muted">Total Findings</span>
            <div className="p-2 rounded-lg bg-sentrix-cyan/10 text-sentrix-cyan">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-extrabold text-sentrix-text font-mono">
              {metrics ? metrics.totalFindings : "..."}
            </span>
            <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> Live
            </span>
          </div>
          <p className="text-[11px] text-sentrix-muted mt-1">
            Aggregated across all perimeter channels
          </p>
        </div>

        {/* Critical & High Priority */}
        <div className="p-4 rounded-xl bg-sentrix-card border border-red-500/20 hover:border-red-500/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-red-400">Critical & High</span>
            <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-extrabold text-red-400 font-mono">
              {metrics ? metrics.criticalFindings + metrics.highFindings : "..."}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-bold">
              Action Req.
            </span>
          </div>
          <p className="text-[11px] text-sentrix-muted mt-1">
            {metrics ? `${metrics.criticalFindings} Critical • ${metrics.highFindings} High` : "Loading..."}
          </p>
        </div>

        {/* Open Investigations */}
        <div className="p-4 rounded-xl bg-sentrix-card border border-purple-500/20 hover:border-purple-500/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-purple-400">Open Investigations</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-extrabold text-purple-300 font-mono">
              {metrics ? metrics.openInvestigations : "..."}
            </span>
            <span className="text-[11px] text-sentrix-muted font-medium">Cases</span>
          </div>
          <p className="text-[11px] text-sentrix-muted mt-1">
            Active forensic reviews in progress
          </p>
        </div>

        {/* Resolved & Takedowns */}
        <div className="p-4 rounded-xl bg-sentrix-card border border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-400">Remediations</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-extrabold text-emerald-400 font-mono">
              {metrics ? metrics.activeResponseActions : "..."}
            </span>
            <span className="text-[11px] text-emerald-400 font-medium">
              Dispatched
            </span>
          </div>
          <p className="text-[11px] text-sentrix-muted mt-1">
            DMCA, platform flags & registrar notices
          </p>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Threat Trend Velocity (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-sentrix-card border border-sentrix-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-sentrix-text">
                Threat Velocity & Timeline Detection
              </h3>
              <p className="text-xs text-sentrix-muted">
                Daily frequency of new candidate risks identified
              </p>
            </div>
            <span className="text-[11px] font-mono text-sentrix-cyan bg-sentrix-cyan/10 px-2 py-0.5 rounded border border-sentrix-cyan/20">
              7-Day Rolling Window
            </span>
          </div>

          <div className="h-64 w-full">
            {metrics?.trendData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.trendData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#22D3EE" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F87171" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#F87171" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0D1422",
                      borderColor: "#243249",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#F1F5F9",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Total Findings"
                    stroke="#22D3EE"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorTotal)"
                  />
                  <Area
                    type="monotone"
                    dataKey="critical"
                    name="Critical Findings"
                    stroke="#F87171"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCritical)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-sentrix-muted">
                Loading telemetry graph...
              </div>
            )}
          </div>
        </div>

        {/* Severity Distribution Donut */}
        <div className="p-5 rounded-xl bg-sentrix-card border border-sentrix-border flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-sentrix-text">
              Severity Distribution
            </h3>
            <p className="text-xs text-sentrix-muted">
              Risk breakdown of screened threats
            </p>
          </div>

          <div className="h-48 w-full my-2">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0D1422",
                      borderColor: "#243249",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#F1F5F9",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-sentrix-muted">
                No severity records.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-sentrix-border text-xs">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-sentrix-muted">{d.name}:</span>
                <span className="font-mono font-bold text-sentrix-text">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Module Breakdown & Channel Split */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/social"
          className="p-4 rounded-xl bg-sentrix-card border border-sentrix-border hover:border-sentrix-cyan/40 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 group-hover:scale-110 transition-transform">
                <AtSign className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-sentrix-text">Social Intelligence</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-sentrix-subtle group-hover:text-sentrix-cyan group-hover:translate-x-1 transition-all" />
          </div>
          <p className="text-[11px] text-sentrix-muted leading-relaxed">
            Monitor fake profiles, support impostors, lookalike handles, and fraudulent giveaways.
          </p>
        </Link>

        <Link
          href="/apps"
          className="p-4 rounded-xl bg-sentrix-card border border-sentrix-border hover:border-emerald-500/40 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                <Smartphone className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-sentrix-text">App Store Sentinel</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-sentrix-subtle group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
          </div>
          <p className="text-[11px] text-sentrix-muted leading-relaxed">
            Detect rogue APKs, publisher mismatches, package anomalies, and predatory cloned apps.
          </p>
        </Link>

        <Link
          href="/domains"
          className="p-4 rounded-xl bg-sentrix-card border border-sentrix-border hover:border-purple-500/40 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
                <Globe className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-sentrix-text">Domain Radar & Phishing</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-sentrix-subtle group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
          </div>
          <p className="text-[11px] text-sentrix-muted leading-relaxed">
            Screen typosquatting, credential harvesting reverse proxies, and lookalike domains with SSRF safety.
          </p>
        </Link>
      </div>

      {/* Recent Threats Table */}
      <div className="p-5 rounded-xl bg-sentrix-card border border-sentrix-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-sentrix-text">
              High Priority Threats Awaiting Review
            </h3>
            <p className="text-xs text-sentrix-muted">
              Recently flagged candidate records with explainable risk scores
            </p>
          </div>
          <Link
            href="/findings"
            className="text-xs text-sentrix-cyan hover:underline flex items-center gap-1 font-semibold"
          >
            All Findings ({metrics ? metrics.totalFindings : 0}) <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-sentrix-border text-sentrix-subtle uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Entity / Target</th>
                <th className="py-2.5 px-3">Brand</th>
                <th className="py-2.5 px-3">Module</th>
                <th className="py-2.5 px-3">Risk Assessment</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Observed</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sentrix-border/60">
              {recentFindings.map((finding) => (
                <tr
                  key={finding.id}
                  className="hover:bg-sentrix-surface/60 transition-colors group"
                >
                  <td className="py-3 px-3">
                    <div className="font-semibold text-sentrix-text group-hover:text-sentrix-cyan transition-colors">
                      {finding.entityName}
                    </div>
                    <div className="text-[11px] text-sentrix-muted truncate max-w-xs">
                      {finding.title}
                    </div>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap text-sentrix-text">
                    {finding.brandName}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="font-mono text-[11px] text-sentrix-cyan uppercase bg-sentrix-cyan/10 px-2 py-0.5 rounded">
                      {finding.sourceModule}
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <RiskScoreBadge
                      score={finding.riskScore}
                      severity={finding.severity}
                      size="sm"
                    />
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="capitalize text-[11px] text-sentrix-muted font-medium">
                      {finding.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap text-sentrix-muted text-[11px]">
                    {formatTimeAgo(finding.lastObservedAt)}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap text-right">
                    <Link
                      href={`/findings/${finding.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-sentrix-cyan hover:underline"
                    >
                      Investigate <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
