import React from "react";
import { EvidenceItem } from "@/types";
import { formatTimestamp } from "@/lib/utils";
import { ShieldAlert, Info, AlertTriangle, ExternalLink } from "lucide-react";

interface EvidenceListProps {
  evidence: EvidenceItem[];
}

export function EvidenceList({ evidence }: EvidenceListProps) {
  if (!evidence || evidence.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-sentrix-card/50 border border-sentrix-border text-center text-sm text-sentrix-muted">
        No formal evidence items attached to this finding.
      </div>
    );
  }

  const getStrengthBadge = (strength: string) => {
    switch (strength) {
      case "strong":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
            <ShieldAlert className="w-3 h-3" /> Strong Signal
          </span>
        );
      case "supporting":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
            <AlertTriangle className="w-3 h-3" /> Supporting
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-500/10 border border-slate-500/20 px-2 py-0.5 rounded">
            <Info className="w-3 h-3" /> Context
          </span>
        );
    }
  };

  return (
    <div className="space-y-3">
      {evidence.map((item, idx) => (
        <div
          key={item.id || idx}
          className="p-3.5 rounded-lg bg-sentrix-surface border border-sentrix-border hover:border-sentrix-borderLight transition-colors"
        >
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              {getStrengthBadge(item.strength)}
              <span className="text-xs font-mono text-sentrix-cyan bg-sentrix-cyan/10 px-1.5 py-0.5 rounded">
                {item.indicator}
              </span>
            </div>
            <span className="text-[11px] text-sentrix-muted whitespace-nowrap">
              {formatTimestamp(item.observedAt)}
            </span>
          </div>

          <h5 className="text-sm font-semibold text-sentrix-text mb-1">
            {item.summary}
          </h5>
          <p className="text-xs text-sentrix-muted leading-relaxed">
            {item.detail}
          </p>

          {item.sourceUrl && (
            <div className="mt-2 pt-2 border-t border-sentrix-border/60 flex items-center gap-1.5">
              <span className="text-[11px] text-sentrix-subtle">Source:</span>
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-sentrix-cyan hover:underline flex items-center gap-1 max-w-md truncate"
              >
                {item.sourceUrl}
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

