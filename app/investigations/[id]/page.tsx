"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Investigation, Finding, FindingStatus, ResponseActionType } from "@/types";
import { RiskScoreBadge } from "@/components/shared/risk-score-badge";
import { StatusSelect } from "@/components/shared/status-select";
import { formatTimestamp, formatTimeAgo, getStatusBadgeClass } from "@/lib/utils";
import {
  ArrowLeft,
  FolderKanban,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Send,
  Plus,
  FileText,
  AlertTriangle,
  User,
  Shield,
  Layers,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

export default function InvestigationDetailPage() {
  const params = useParams();
  const invId = params.id as string;
  const { user, canTriggerResponseAction } = useAuth();

  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [linkedFindings, setLinkedFindings] = useState<Finding[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Note state
  const [newNoteText, setNewNoteText] = useState("");
  const [isPostingNote, setIsPostingNote] = useState(false);

  // New Response Action Modal
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<ResponseActionType>("dmca_takedown");
  const [actionTitle, setActionTitle] = useState("Expedited DMCA Hosting Takedown");
  const [actionTarget, setActionTarget] = useState("");
  const [actionNotes, setActionNotes] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const fetchInvestigation = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/investigations/${invId}`);
      const json = await res.json();
      if (json.success) {
        setInvestigation(json.data);
        setLinkedFindings(json.data.linkedFindings || []);
        if (json.data.linkedFindings?.[0]?.entityName) {
          setActionTarget(json.data.linkedFindings[0].entityName);
        }
      }
    } catch (err) {
      console.warn("Could not load investigation:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (invId) fetchInvestigation();
  }, [invId]);

  const handleStatusChange = async (newStatus: FindingStatus) => {
    if (!investigation) return;
    try {
      const res = await fetch(`/api/investigations/${invId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setInvestigation(json.data);
      }
    } catch (err) {
      alert("Failed updating status.");
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || isPostingNote) return;
    setIsPostingNote(true);
    try {
      const res = await fetch(`/api/investigations/${invId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: user.name,
          authorRole: user.role.toUpperCase(),
          text: newNoteText.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setInvestigation(json.data);
        setNewNoteText("");
      }
    } catch (err) {
      alert("Failed to add note.");
    } finally {
      setIsPostingNote(false);
    }
  };

  const handleAddAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionTitle || !actionTarget || isSubmittingAction) return;
    setIsSubmittingAction(true);
    try {
      const res = await fetch(`/api/investigations/${invId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: actionType,
          title: actionTitle,
          target: actionTarget,
          notes: actionNotes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setInvestigation(json.data);
        setIsActionModalOpen(false);
        setActionNotes("");
      }
    } catch (err) {
      alert("Failed to submit response action.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleUpdateActionStatus = async (actionId: string, newStatus: any) => {
    try {
      const res = await fetch(`/api/investigations/${invId}/actions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId, status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setInvestigation(json.data);
      }
    } catch (err) {
      alert("Failed to update response action status.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-24 text-xs text-sentrix-muted">
        <div className="w-5 h-5 border-2 border-sentrix-cyan border-t-transparent rounded-full animate-spin mr-3" />
        Loading incident dossier...
      </div>
    );
  }

  if (!investigation) {
    return (
      <div className="p-12 text-center space-y-3">
        <p className="text-sm text-red-400">Investigation not found.</p>
        <Link href="/investigations" className="text-xs text-sentrix-cyan underline">
          Return to Investigations
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top back link */}
      <div>
        <Link
          href="/investigations"
          className="inline-flex items-center gap-1.5 text-xs text-sentrix-muted hover:text-sentrix-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Incident Response Cases
        </Link>
      </div>

      {/* Case Header */}
      <div className="p-6 rounded-xl bg-sentrix-card border border-sentrix-border space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2.5 py-1 rounded font-bold">
                {investigation.priority.toUpperCase()} PRIORITY
              </span>
              <span className="font-mono text-xs text-sentrix-cyan bg-sentrix-cyan/10 px-2.5 py-1 rounded font-semibold border border-sentrix-cyan/30">
                {investigation.brandName}
              </span>
              <span className="text-xs text-sentrix-muted font-mono">
                Case ID: {investigation.id}
              </span>
            </div>

            <h1 className="text-xl md:text-2xl font-extrabold text-sentrix-text">
              {investigation.title}
            </h1>

            <div className="flex items-center gap-4 text-xs text-sentrix-muted">
              <span>Opened {formatTimestamp(investigation.createdAt)}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-sentrix-text">
                <User className="w-3.5 h-3.5 text-sentrix-cyan" />
                Assigned: {investigation.assignedTo?.name || "Unassigned"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <StatusSelect
              currentStatus={investigation.status}
              onChange={handleStatusChange}
            />

            {canTriggerResponseAction() && (
              <button
                onClick={() => setIsActionModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-sentrix-cyan text-sentrix-bg text-xs font-bold hover:brightness-110 shadow-glow-sm flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Dispatch Enforcement
              </button>
            )}
          </div>
        </div>

        <p className="text-xs md:text-sm text-sentrix-muted leading-relaxed bg-sentrix-surface/60 p-3.5 rounded-lg border border-sentrix-border">
          {investigation.summary}
        </p>
      </div>

      {/* Main Grid: Linked Findings & Enforcement Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Linked Findings & Audit Timeline (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Linked Findings */}
          <div className="p-5 rounded-xl bg-sentrix-card border border-sentrix-border space-y-3">
            <h3 className="text-sm font-bold text-sentrix-text flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-sentrix-cyan" />
              Corroborated Threat Findings ({linkedFindings.length})
            </h3>

            <div className="space-y-3">
              {linkedFindings.map((finding) => (
                <div
                  key={finding.id}
                  className="p-3.5 rounded-lg bg-sentrix-surface border border-sentrix-border hover:border-sentrix-cyan/40 transition-colors flex items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <RiskScoreBadge score={finding.riskScore} severity={finding.severity} size="sm" />
                      <span className="font-semibold text-sentrix-text truncate">{finding.title}</span>
                    </div>
                    <p className="text-sentrix-muted truncate">{finding.entityName}</p>
                  </div>
                  <Link
                    href={`/findings/${finding.id}`}
                    className="text-xs font-semibold text-sentrix-cyan hover:underline shrink-0 flex items-center gap-1"
                  >
                    Dossier <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Response Actions & Enforcement Tracker */}
          <div className="p-5 rounded-xl bg-sentrix-card border border-sentrix-border space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-sentrix-text flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sentrix-teal" />
                Remediation & Takedown Order Tracker ({investigation.responseActions.length})
              </h3>
              <button
                onClick={() => setIsActionModalOpen(true)}
                className="text-xs font-semibold text-sentrix-cyan hover:underline flex items-center gap-1"
              >
                + New Order
              </button>
            </div>

            {investigation.responseActions.length === 0 ? (
              <div className="p-6 text-center text-xs text-sentrix-muted bg-sentrix-surface rounded-lg border border-sentrix-border">
                No response enforcement actions logged yet.
              </div>
            ) : (
              <div className="space-y-3">
                {investigation.responseActions.map((act) => (
                  <div
                    key={act.id}
                    className="p-4 rounded-lg bg-sentrix-surface border border-sentrix-border space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sentrix-text">{act.title}</span>
                          {act.referenceNumber && (
                            <span className="font-mono text-[10px] text-sentrix-muted bg-sentrix-card px-1.5 py-0.5 rounded border border-sentrix-border">
                              Ref: {act.referenceNumber}
                            </span>
                          )}
                        </div>
                        <p className="text-sentrix-cyan font-mono text-[11px] mt-0.5">
                          Target: {act.target}
                        </p>
                      </div>

                      <select
                        value={act.status}
                        onChange={(e) => handleUpdateActionStatus(act.id, e.target.value)}
                        className={`px-2.5 py-1 rounded text-xs font-mono font-semibold focus:outline-none cursor-pointer ${
                          act.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : act.status === "failed"
                            ? "bg-red-500/10 text-red-400 border border-red-500/30"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>

                    {act.notes && (
                      <p className="text-sentrix-muted leading-relaxed text-[11px]">
                        {act.notes}
                      </p>
                    )}

                    <div className="text-[10px] text-sentrix-subtle flex justify-between pt-1 border-t border-sentrix-border/40">
                      <span>Initiated {formatTimestamp(act.initiatedAt)}</span>
                      {act.completedAt && (
                        <span className="text-emerald-400">
                          Resolved {formatTimestamp(act.completedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit Timeline */}
          <div className="p-5 rounded-xl bg-sentrix-card border border-sentrix-border space-y-3">
            <h3 className="text-sm font-bold text-sentrix-text flex items-center gap-2">
              <Clock className="w-4 h-4 text-sentrix-muted" />
              Incident Audit Timeline
            </h3>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-sentrix-border">
              {investigation.timeline.map((evt) => (
                <div key={evt.id} className="relative text-xs space-y-0.5">
                  <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-sentrix-cyan border-2 border-sentrix-card" />
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sentrix-text">{evt.actor}</span>
                    <span className="text-[10px] text-sentrix-muted font-mono">
                      {formatTimeAgo(evt.timestamp)}
                    </span>
                  </div>
                  <p className="text-sentrix-muted leading-relaxed">
                    {evt.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Forensic Analyst Log (1 col) */}
        <div className="p-5 rounded-xl bg-sentrix-card border border-sentrix-border flex flex-col h-full space-y-4">
          <div>
            <h3 className="text-sm font-bold text-sentrix-text flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-400" />
              Forensic Analyst Log & Memos
            </h3>
            <p className="text-xs text-sentrix-muted">
              Add immutable case notes and investigative updates.
            </p>
          </div>

          {/* New note form */}
          <form onSubmit={handleAddNote} className="space-y-2">
            <textarea
              rows={3}
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Record forensic observation, subpoena updates, or notes..."
              className="w-full px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-xs text-sentrix-text placeholder:text-sentrix-muted focus:outline-none focus:border-sentrix-cyan resize-none"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isPostingNote || !newNoteText.trim()}
                className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold hover:brightness-110 flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Send className="w-3 h-3" /> Post Memo
              </button>
            </div>
          </form>

          {/* Notes stream */}
          <div className="flex-1 overflow-y-auto space-y-3 pt-2">
            {investigation.notes.map((note) => (
              <div
                key={note.id}
                className="p-3 rounded-lg bg-sentrix-surface border border-sentrix-border/60 text-xs space-y-1"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-sentrix-text">{note.author}</span>
                  <span className="text-sentrix-subtle font-mono">
                    {formatTimeAgo(note.createdAt)}
                  </span>
                </div>
                <p className="text-sentrix-muted leading-relaxed">
                  {note.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dispatch Response Action Modal */}
      {isActionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-xl bg-sentrix-card border border-sentrix-border shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-sentrix-text">
              Dispatch Legal & Platform Enforcement Action
            </h3>
            <p className="text-xs text-sentrix-muted">
              Record a formal DMCA takedown notice, platform fraud report, or registrar abuse escalation.
            </p>

            <form onSubmit={handleAddAction} className="space-y-3 text-xs">
              <div>
                <label className="block text-sentrix-muted mb-1">Enforcement Action Type</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as ResponseActionType)}
                  className="w-full px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text focus:outline-none focus:border-sentrix-cyan"
                >
                  <option value="dmca_takedown">DMCA Takedown Notice</option>
                  <option value="platform_abuse_report">Social Platform Abuse Report</option>
                  <option value="registrar_abuse_notice">Domain Registrar Abuse Suspension</option>
                  <option value="app_store_flag">App Store Policy Violation Flag</option>
                  <option value="ad_network_cease">Ad Network Cease & Desist</option>
                  <option value="internal_security_alert">Internal Security Broadcast</option>
                </select>
              </div>

              <div>
                <label className="block text-sentrix-muted mb-1">Order Title</label>
                <input
                  type="text"
                  value={actionTitle}
                  onChange={(e) => setActionTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text focus:outline-none focus:border-sentrix-cyan"
                />
              </div>

              <div>
                <label className="block text-sentrix-muted mb-1">Target Entity / Host / URL</label>
                <input
                  type="text"
                  value={actionTarget}
                  onChange={(e) => setActionTarget(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text focus:outline-none focus:border-sentrix-cyan font-mono"
                />
              </div>

              <div>
                <label className="block text-sentrix-muted mb-1">Filing Notes & Reference</label>
                <textarea
                  rows={2}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Ticket or filing confirmation details..."
                  className="w-full px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text focus:outline-none focus:border-sentrix-cyan"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsActionModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-sentrix-muted hover:text-sentrix-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction}
                  className="px-4 py-2 rounded-lg bg-sentrix-cyan text-sentrix-bg text-xs font-bold hover:brightness-110"
                >
                  {isSubmittingAction ? "Filing..." : "Dispatch Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

