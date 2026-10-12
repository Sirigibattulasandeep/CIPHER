"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Finding, FindingStatus } from "@/types";
import { RiskScoreBadge } from "@/components/shared/risk-score-badge";
import { EvidenceList } from "@/components/shared/evidence-list";
import { StatusSelect } from "@/components/shared/status-select";
import { formatTimestamp, formatTimeAgo } from "@/lib/utils";
import {
  ArrowLeft,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  FolderKanban,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Share2,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export default function FindingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const findingId = params.id as string;

  const [finding, setFinding] = useState<Finding | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiData, setAiData] = useState<any>(null);

  // Escalate modal
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);
  const [escalateTitle, setEscalateTitle] = useState("");
  const [escalatePriority, setEscalatePriority] = useState<"p1" | "p2" | "p3">("p1");
  const [escalateNote, setEscalateNote] = useState("");
  const [isSubmittingCase, setIsSubmittingCase] = useState(false);

  const fetchFinding = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/findings/${findingId}`);
      const json = await res.json();
      if (json.success) {
        setFinding(json.data);
        setEscalateTitle(`Incident: ${json.data.title}`);
        if (json.data.aiSummary) {
          setAiData({
            summary: json.data.aiSummary,
            provider: "Stored Threat Intelligence Analysis",
          });
        }
      }
    } catch (err) {
      console.warn("Could not load finding:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (findingId) fetchFinding();
  }, [findingId]);

  const handleStatusChange = async (newStatus: FindingStatus) => {
    if (!finding) return;
    try {
      const res = await fetch(`/api/findings/${findingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setFinding(json.data);
      }
    } catch (err) {
      alert("Failed updating status.");
    }
  };

  const handleGenerateAiSummary = async () => {
    if (!finding) return;
    setIsGeneratingAi(true);
    try {
      const res = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ findingId: finding.id }),
      });
      const json = await res.json();
      if (json.success) {
        setAiData(json.data);
        setFinding((prev) => (prev ? { ...prev, aiSummary: json.data.summary } : null));
      }
    } catch (err) {
      alert("AI summarization failed.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleCreateInvestigation = async () => {
    if (!finding) return;
    setIsSubmittingCase(true);
    try {
      const res = await fetch("/api/investigations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId: finding.brandId,
          brandName: finding.brandName,
          title: escalateTitle,
          summary: finding.description,
          findingIds: [finding.id],
          severity: finding.severity,
          priority: escalatePriority,
          initialNote: escalateNote || `Escalated from finding ${finding.id}`,
        }),
      });
      const json = await res.json();
      if (json.success) {
        router.push(`/investigations/${json.data.id}`);
      }
    } catch (err) {
      alert("Failed creating investigation.");
    } finally {
      setIsSubmittingCase(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-24 text-xs text-sentrix-muted">
        <div className="w-5 h-5 border-2 border-sentrix-cyan border-t-transparent rounded-full animate-spin mr-3" />
        Loading finding dossier...
      </div>
    );
  }

  if (!finding) {
    return (
      <div className="p-12 text-center space-y-3">
        <p className="text-sm text-red-400">Finding not found.</p>
        <Link href="/findings" className="text-xs text-sentrix-cyan underline">
          Return to Findings
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Back link */}
      <div>
        <Link
          href="/findings"
          className="inline-flex items-center gap-1.5 text-xs text-sentrix-muted hover:text-sentrix-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Findings Repository
        </Link>
      </div>

      {/* Main Dossier Header */}
      <div className="p-6 rounded-xl bg-sentrix-card border border-sentrix-border space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <RiskScoreBadge
                score={finding.riskScore}
                severity={finding.severity}
                classification={finding.classification}
                size="lg"
              />
              <span className="text-xs font-mono text-sentrix-cyan bg-sentrix-cyan/10 px-2.5 py-1 rounded font-semibold border border-sentrix-cyan/30">
                {finding.brandName}
              </span>
              <span className="text-xs font-mono text-sentrix-muted uppercase bg-sentrix-surface px-2 py-1 rounded border border-sentrix-border">
                {finding.sourceModule}
              </span>
              <span className="text-xs font-mono text-purple-400 uppercase bg-purple-500/10 px-2 py-1 rounded">
                {finding.category.replace(/_/g, " ")}
              </span>
            </div>

            <h1 className="text-xl md:text-2xl font-extrabold text-sentrix-text">
              {finding.title}
            </h1>

            <div className="flex items-center gap-3 text-xs text-sentrix-muted font-mono flex-wrap">
              <span>Target: <strong className="text-sentrix-text">{finding.entityName}</strong></span>
              <span>•</span>
              <span>Observed {formatTimestamp(finding.lastObservedAt)}</span>
              {finding.entityUrl && (
                <>
                  <span>•</span>
                  <a
                    href={finding.entityUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sentrix-cyan hover:underline flex items-center gap-1"
                  >
                    Target Link <ExternalLink className="w-3 h-3" />
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Right Action Panel */}
          <div className="flex items-center gap-2.5 shrink-0">
            <StatusSelect
              currentStatus={finding.status}
              onChange={handleStatusChange}
            />

            {finding.investigationId ? (
              <Link
                href={`/investigations/${finding.investigationId}`}
                className="px-3.5 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 hover:brightness-110 transition-all"
              >
                <FolderKanban className="w-3.5 h-3.5" /> View Case
              </Link>
            ) : (
              <button
                onClick={() => setIsEscalateModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-sentrix-cyan text-sentrix-bg text-xs font-bold hover:brightness-110 shadow-glow-sm flex items-center gap-1.5 transition-all"
              >
                <FolderKanban className="w-3.5 h-3.5" /> Escalate to Case
              </button>
            )}
          </div>
        </div>

        <p className="text-xs md:text-sm text-sentrix-muted leading-relaxed bg-sentrix-surface/60 p-3.5 rounded-lg border border-sentrix-border">
          {finding.description}
        </p>
      </div>

      {/* Risk Metrics and AI Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Breakdown & Explainability (1 col) */}
        <div className="p-5 rounded-xl bg-sentrix-card border border-sentrix-border space-y-4">
          <h3 className="text-sm font-bold text-sentrix-text">
            Transparent Risk Scoring Breakdown
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-2.5 rounded-lg bg-sentrix-surface border border-sentrix-border">
              <span className="text-sentrix-muted">Composite Risk Score:</span>
              <span className="font-mono font-bold text-sentrix-text">
                {finding.riskScore} / 100
              </span>
            </div>
            <div className="flex justify-between p-2.5 rounded-lg bg-sentrix-surface border border-sentrix-border">
              <span className="text-sentrix-muted">Evidence Confidence:</span>
              <span className="font-mono font-bold text-sentrix-cyan">
                {finding.confidence}%
              </span>
            </div>
            <div className="flex justify-between p-2.5 rounded-lg bg-sentrix-surface border border-sentrix-border">
              <span className="text-sentrix-muted">Corroborated Categories:</span>
              <span className="font-mono font-semibold text-sentrix-text">
                {finding.corroboratedCategories.length} vectors
              </span>
            </div>
          </div>

          {/* Signals increasing risk */}
          {finding.signalsIncreasingRisk && finding.signalsIncreasingRisk.length > 0 && (
            <div>
              <span className="text-[11px] font-bold uppercase text-red-400 tracking-wider block mb-1.5">
                Signals Increasing Risk
              </span>
              <ul className="space-y-1 text-xs">
                {finding.signalsIncreasingRisk.map((sig, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-sentrix-muted">
                    <span className="text-red-400 font-bold">•</span>
                    <span>{sig}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Signals reducing risk */}
          {finding.signalsReducingRisk && finding.signalsReducingRisk.length > 0 && (
            <div>
              <span className="text-[11px] font-bold uppercase text-emerald-400 tracking-wider block mb-1.5">
                Signals Reducing Risk
              </span>
              <ul className="space-y-1 text-xs">
                {finding.signalsReducingRisk.map((sig, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{sig}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* AI Incident Analysis (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-sentrix-card border border-sentrix-border flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sentrix-cyan/10 text-sentrix-cyan">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-sentrix-text">
                    Explainable AI Incident Synthesis
                  </h3>
                  <p className="text-[11px] text-sentrix-muted">
                    {aiData?.provider || "Grounded analysis across evidence graph"}
                  </p>
                </div>
              </div>

              <button
                onClick={handleGenerateAiSummary}
                disabled={isGeneratingAi}
                className="px-3 py-1.5 rounded-lg bg-sentrix-surface border border-sentrix-border hover:border-sentrix-cyan text-xs font-semibold text-sentrix-cyan transition-colors"
              >
                {isGeneratingAi ? "Synthesizing..." : "Run AI Triage"}
              </button>
            </div>

            {aiData ? (
              <div className="p-4 rounded-xl bg-sentrix-surface border border-sentrix-cyan/20 space-y-3 text-xs">
                <div>
                  <span className="font-bold uppercase tracking-wider text-sentrix-cyan text-[10px] block mb-1">
                    Analyst Summary
                  </span>
                  <p className="text-sentrix-text leading-relaxed">
                    {aiData.summary}
                  </p>
                </div>

                {aiData.threatAssessment && (
                  <div>
                    <span className="font-bold uppercase tracking-wider text-amber-400 text-[10px] block mb-1">
                      Threat Assessment
                    </span>
                    <p className="text-sentrix-muted leading-relaxed">
                      {aiData.threatAssessment}
                    </p>
                  </div>
                )}

                {aiData.recommendedSteps && aiData.recommendedSteps.length > 0 && (
                  <div>
                    <span className="font-bold uppercase tracking-wider text-emerald-400 text-[10px] block mb-1">
                      Recommended Remediation Steps
                    </span>
                    <div className="space-y-1">
                      {aiData.recommendedSteps.map((step: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sentrix-text">
                          <span className="font-mono text-sentrix-cyan font-bold">{i + 1}.</span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-sentrix-muted bg-sentrix-surface rounded-xl border border-sentrix-border">
                Click "Run AI Triage" to generate an executive threat summary grounded in the evidence below.
              </div>
            )}
          </div>

          <div className="p-3 rounded-lg bg-sentrix-surface border border-sentrix-border/60 text-xs">
            <span className="font-semibold text-sentrix-text block mb-0.5">
              Recommended Protocol Action:
            </span>
            <span className="text-sentrix-cyan font-medium">
              {finding.recommendedAction}
            </span>
          </div>
        </div>
      </div>

      {/* Forensic Evidence Items */}
      <div className="p-5 rounded-xl bg-sentrix-card border border-sentrix-border space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-sentrix-text">
            Forensic Evidence Graph ({finding.evidence.length} records)
          </h3>
          <span className="text-xs text-sentrix-muted font-mono">
            Deterministic Traceability
          </span>
        </div>
        <EvidenceList evidence={finding.evidence} />
      </div>

      {/* Escalate to Investigation Modal */}
      {isEscalateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-xl bg-sentrix-card border border-sentrix-border shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-sentrix-text">
              Escalate to Incident Investigation Case
            </h3>
            <p className="text-xs text-sentrix-muted">
              Creates a formal incident response case linked to this finding with audit timelines and takedown action tracking.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-sentrix-muted mb-1">Case Title</label>
                <input
                  type="text"
                  value={escalateTitle}
                  onChange={(e) => setEscalateTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text focus:outline-none focus:border-sentrix-cyan"
                />
              </div>

              <div>
                <label className="block text-sentrix-muted mb-1">Priority Level</label>
                <select
                  value={escalatePriority}
                  onChange={(e) => setEscalatePriority(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text focus:outline-none focus:border-sentrix-cyan font-mono"
                >
                  <option value="p1">P1 - Critical / Emergency</option>
                  <option value="p2">P2 - High Priority</option>
                  <option value="p3">P3 - Standard Triage</option>
                </select>
              </div>

              <div>
                <label className="block text-sentrix-muted mb-1">Analyst Handover Note</label>
                <textarea
                  rows={3}
                  value={escalateNote}
                  onChange={(e) => setEscalateNote(e.target.value)}
                  placeholder="Notes for assigned investigator..."
                  className="w-full px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text focus:outline-none focus:border-sentrix-cyan"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setIsEscalateModalOpen(false)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-sentrix-muted hover:text-sentrix-text"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateInvestigation}
                disabled={isSubmittingCase}
                className="px-4 py-2 rounded-lg bg-sentrix-cyan text-sentrix-bg text-xs font-bold hover:brightness-110 flex items-center gap-1.5"
              >
                {isSubmittingCase ? "Creating..." : "Initialize Case"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

