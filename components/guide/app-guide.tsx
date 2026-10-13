"use client";

import React, { useState, useEffect } from "react";
import { playCyberClick, playCyberAlert } from "@/lib/sound";
import {
  Sparkles,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Shield,
  Layers,
  Radio,
  Search,
  AlertTriangle,
  FolderKanban,
  EyeOff,
  Bot,
} from "lucide-react";

interface GuideStep {
  title: string;
  badge: string;
  description: string;
  details: string[];
  icon: typeof Shield;
  targetTip: string;
}

const GUIDE_STEPS: GuideStep[] = [
  {
    title: "Digital Risk Operations Center",
    badge: "Step 1 of 7 • Overview",
    description: "Welcome to SENTRIX by Team CIPHER. Your unified command center provides real-time security posture scoring and perimeter defense telemetry.",
    details: [
      "Enterprise Posture Index calculated from active threat vectors and resolved actions.",
      "Omni-channel KPIs covering Social Impersonation, Mobile APKs, and Phishing Domains.",
      "One-click 'Run Platform Sweep' to synchronize perimeter sensors with zero latency.",
    ],
    icon: Shield,
    targetTip: "Use the top sweep button to trigger full perimeter synchronization.",
  },
  {
    title: "Brand DNA & Scope Switcher",
    badge: "Step 2 of 7 • Multi-Tenant",
    description: "Seamlessly protect multiple organizations or switch between brand profiles in one unified interface.",
    details: [
      "Select 'All Brands' or drill into specific entities (Kampus.VC, Northstar Bank, Cedar & Finch).",
      "Inspect Brand DNA: registered domains, official social handles, and authorized app packages.",
      "Automatic exclusion prevents false alarms against your company's legitimate digital assets.",
    ],
    icon: Layers,
    targetTip: "Switch active brands from the header dropdown to filter all telemetry instantly.",
  },
  {
    title: "Perimeter Threat Radar",
    badge: "Step 3 of 7 • Threat Radar",
    description: "Active perimeter defense scanning namespace mutations, rogue mobile listings, and rogue social profiles.",
    details: [
      "Live 3-Vector Stream: Social Handles, Mobile Store listings, and DNS zones.",
      "Early warning detection before attacks reach your customers or employees.",
      "Real-time signal pulse with telemetry timestamps and confidence ratings.",
    ],
    icon: Radio,
    targetTip: "Access Threat Radar anytime from the sidebar or mobile navigation bar.",
  },
  {
    title: "Live Asset Threat Screening",
    badge: "Step 4 of 7 • Threat Scanner",
    description: "Screen suspicious candidate domains, mobile APKs, or social profiles against your Brand DNA in seconds.",
    details: [
      "Offline & Online domain parsing: detects typosquatting, combosquatting, and homoglyphs.",
      "Mobile APK auditor: flags suspicious permissions (READ_SMS) and publisher mismatches.",
      "Instantly converts screened assets into high-fidelity finding records with one click.",
    ],
    icon: Search,
    targetTip: "Click 'Screen Asset' in the header to audit any suspicious URL or handle.",
  },
  {
    title: "Findings Repository & Dossiers",
    badge: "Step 5 of 7 • Findings",
    description: "Triage threat dossiers with granular evidence breakdown, risk score breakdowns, and workflow statuses.",
    details: [
      "Risk Scores (0–100) benchmarked across four calibrated threat dimensions.",
      "Cryptographic and structural evidence weights (Strong, Moderate, Corroborative).",
      "Fast status management: New, Under Review, Investigating, Confirmed Threat, Resolved.",
    ],
    icon: AlertTriangle,
    targetTip: "Click 'Dossier' on any finding to inspect full forensic evidence and AI analysis.",
  },
  {
    title: "Investigations & Takedowns",
    badge: "Step 6 of 7 • Incident Response",
    description: "Escalate critical findings into formal investigation cases with takedown actions and forensic analyst notes.",
    details: [
      "Author timestamped case notes and evidence attachments.",
      "Track remediation milestones: Registrar Abuse notices, DMCA tickets, Safe Browsing.",
      "Maintain complete audit logs for executive compliance reporting.",
    ],
    icon: FolderKanban,
    targetTip: "Escalate findings directly from their dossier to initiate an investigation case.",
  },
  {
    title: "AI Copilot & Privacy Shield",
    badge: "Step 7 of 7 • Analyst Tools",
    description: "Harness embedded Sentinel AI intelligence and protect proprietary brand telemetry during live presentations.",
    details: [
      "Sentinel AI Copilot (Ctrl+J / Cmd+J) offers 24/7 incident advice and takedown protocols.",
      "Privacy Shield Mode (Alt+P) blurs confidential brand and target URLs for safe screen sharing.",
      "Keyboard shortcut palette (Ctrl+K / Cmd+K) provides lightning-fast platform navigation.",
    ],
    icon: Bot,
    targetTip: "Press Ctrl+J / Cmd+J to chat with Sentinel AI anytime!",
  },
];

interface AppGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQuickAnalysis?: () => void;
}

export function AppGuide({ isOpen, onClose, onOpenQuickAnalysis }: AppGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStep]);

  if (!isOpen) return null;

  const step = GUIDE_STEPS[currentStep];
  const StepIcon = step.icon;

  const handleNext = () => {
    playCyberClick();
    if (currentStep < GUIDE_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      localStorage.setItem("sentrix_guide_completed", "true");
      onClose();
    }
  };

  const handlePrev = () => {
    playCyberClick();
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    playCyberClick();
    localStorage.setItem("sentrix_guide_completed", "true");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#111923] border border-[#2A3543] shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Glow Accent */}
        <div className="h-1 w-full bg-gradient-to-r from-[#D7A93A] via-[#22D3EE] to-[#D7A93A]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A3543] bg-[#0A1017]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#D7A93A]/10 border border-[#D7A93A]/30 text-[#D7A93A]">
              <StepIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-[#D7A93A] tracking-wider block">
                {step.badge}
              </span>
              <h2 className="text-base font-extrabold text-slate-100">{step.title}</h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title="Close Guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-300">
          <p className="text-sm font-medium text-slate-200 leading-relaxed">
            {step.description}
          </p>

          <div className="space-y-2.5 p-4 rounded-xl bg-[#17202B] border border-[#2A3543]">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider block">
              Core Capabilities:
            </span>
            {step.details.map((detail, index) => (
              <div key={index} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#D7A93A] shrink-0 mt-0.5" />
                <span className="leading-snug text-slate-300">{detail}</span>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-lg bg-[#D7A93A]/10 border border-[#D7A93A]/25 text-[#F1C95D] flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{step.targetTip}</span>
          </div>

          {/* Quick jump to Try Threat Scanner */}
          {currentStep === 3 && onOpenQuickAnalysis && (
            <button
              onClick={() => {
                onClose();
                onOpenQuickAnalysis();
              }}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-[#D7A93A] to-[#22D3EE] text-[#0A1017] font-bold text-xs flex items-center justify-center gap-2 hover:brightness-110 transition-all cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" /> Open Live Threat Scanner Now
            </button>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#2A3543] bg-[#0A1017]">
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {GUIDE_STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  playCyberClick();
                  setCurrentStep(idx);
                }}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep
                    ? "w-6 bg-[#D7A93A]"
                    : "w-2 bg-[#2A3543] hover:bg-slate-600"
                }`}
                title={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSkip}
              className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors"
            >
              Skip Tour
            </button>

            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-3 py-1.5 rounded-lg bg-[#17202B] border border-[#2A3543] text-slate-300 hover:text-slate-100 text-xs font-semibold flex items-center gap-1 transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-4 py-1.5 rounded-lg bg-[#D7A93A] text-[#0A1017] font-bold text-xs flex items-center gap-1.5 hover:brightness-110 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <span>{currentStep === GUIDE_STEPS.length - 1 ? "Finish Tour" : "Next"}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

