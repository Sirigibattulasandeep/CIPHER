import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimestamp(isoString?: string | null): string {
  if (!isoString) return "Just now";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatTimeAgo(isoString?: string | null): string {
  if (!isoString) return "just now";
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    return `${diffDays}d ago`;
  } catch {
    return "recently";
  }
}

export function getSeverityBadgeClass(severity: string): string {
  switch (severity?.toLowerCase()) {
    case "critical":
      return "bg-[#F87171]/10 text-[#F87171] border border-[#F87171]/30";
    case "high":
      return "bg-[#FB923C]/10 text-[#FB923C] border border-[#FB923C]/30";
    case "medium":
      return "bg-[#FBBF24]/10 text-[#FBBF24] border border-[#FBBF24]/30";
    case "low":
      return "bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/30";
    case "safe":
    case "protected":
      return "bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/30";
    default:
      return "bg-[#64748B]/10 text-[#94A3B8] border border-[#64748B]/30";
  }
}

export function getStatusBadgeClass(status: string): string {
  switch (status?.toLowerCase()) {
    case "new":
      return "bg-purple-500/10 text-purple-400 border border-purple-500/30";
    case "under_review":
    case "under review":
      return "bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/30";
    case "investigating":
      return "bg-[#FBBF24]/10 text-[#FBBF24] border border-[#FBBF24]/30";
    case "confirmed_threat":
    case "confirmed threat":
      return "bg-[#F87171]/10 text-[#F87171] border border-[#F87171]/30";
    case "false_positive":
    case "false positive":
      return "bg-[#64748B]/10 text-[#94A3B8] border border-[#64748B]/30";
    case "resolved":
      return "bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/30";
    default:
      return "bg-[#121C2D] text-[#94A3B8] border border-[#243249]";
  }
}
