import React from "react";
import { Severity, ClassificationCategory } from "@/types";
import { getSeverityBadgeClass } from "@/lib/utils";
import { ShieldCheck, AlertCircle, AlertTriangle, ShieldAlert, CheckCircle2 } from "lucide-react";

interface RiskScoreBadgeProps {
  score: number;
  severity: Severity;
  classification?: ClassificationCategory;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function RiskScoreBadge({
  score,
  severity,
  classification,
  size = "md",
  showLabel = true,
}: RiskScoreBadgeProps) {
  const badgeClass = getSeverityBadgeClass(severity);

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs font-mono font-medium",
    md: "px-2.5 py-1 text-xs font-mono font-semibold",
    lg: "px-3.5 py-1.5 text-sm font-mono font-bold",
  };

  const getIcon = () => {
    if (classification === "Official / Trusted" || severity === "safe") {
      return <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />;
    }
    if (classification === "High Risk" || severity === "critical" || severity === "high") {
      return <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />;
    }
    if (classification === "Suspicious" || severity === "medium") {
      return <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />;
    }
    if (classification === "Needs Review") {
      return <AlertCircle className="h-3.5 w-3.5 text-sky-400" />;
    }
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
  };

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      <div className={`inline-flex items-center gap-1.5 rounded-md ${badgeClass} ${sizeClasses[size]}`}>
        {getIcon()}
        <span>{score}/100</span>
        {showLabel && (
          <span className="uppercase text-[10px] tracking-wider font-sans opacity-90">
            ({severity})
          </span>
        )}
      </div>
      {classification && (
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
            classification === "Official / Trusted"
              ? "bg-emerald-950/70 text-emerald-300 border border-emerald-500/30"
              : classification === "High Risk"
              ? "bg-rose-950/70 text-rose-300 border border-rose-500/30"
              : classification === "Suspicious"
              ? "bg-amber-950/70 text-amber-300 border border-amber-500/30"
              : classification === "Needs Review"
              ? "bg-sky-950/70 text-sky-300 border border-sky-500/30"
              : "bg-slate-800 text-slate-300 border border-slate-700"
          }`}
        >
          {classification}
        </span>
      )}
    </div>
  );
}

