import React, { useState } from "react";
import { FindingStatus } from "@/types";
import { getStatusBadgeClass } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";

interface StatusSelectProps {
  currentStatus: FindingStatus;
  onChange: (newStatus: FindingStatus) => Promise<void> | void;
  disabled?: boolean;
}

const STATUS_OPTIONS: { value: FindingStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "under_review", label: "Under Review" },
  { value: "investigating", label: "Investigating" },
  { value: "confirmed_threat", label: "Confirmed Threat" },
  { value: "false_positive", label: "False Positive" },
  { value: "resolved", label: "Resolved" },
];

export function StatusSelect({ currentStatus, onChange, disabled }: StatusSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSelect = async (status: FindingStatus) => {
    if (status === currentStatus || disabled) return;
    setIsOpen(false);
    setIsUpdating(true);
    try {
      await onChange(status);
    } finally {
      setIsUpdating(false);
    }
  };

  const currentLabel =
    STATUS_OPTIONS.find((s) => s.value === currentStatus)?.label || currentStatus;

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        disabled={disabled || isUpdating}
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${getStatusBadgeClass(
          currentStatus
        )} ${disabled ? "opacity-60 cursor-not-allowed" : "hover:brightness-110"}`}
      >
        <span className="capitalize">{isUpdating ? "Updating..." : currentLabel}</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-70" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-1.5 w-48 rounded-lg bg-sentrix-card border border-sentrix-border shadow-2xl z-50 py-1 overflow-hidden">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                  opt.value === currentStatus
                    ? "bg-sentrix-surface text-sentrix-cyan font-semibold"
                    : "text-sentrix-text hover:bg-sentrix-surface/80"
                }`}
              >
                <span>{opt.label}</span>
                {opt.value === currentStatus && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

