"use client";

import React, { useState } from "react";
import { useBrand } from "@/lib/brand-context";
import { RiskScoreBadge } from "./risk-score-badge";
import { EvidenceList } from "./evidence-list";
import { X, Search, ShieldAlert, Sparkles, CheckCircle2, Globe, Smartphone, AtSign } from "lucide-react";

interface QuickAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalysisSaved?: () => void;
}

export function QuickAnalysisModal({
  isOpen,
  onClose,
  onAnalysisSaved,
}: QuickAnalysisModalProps) {
  const { brands, selectedBrandId } = useBrand();

  const [activeTab, setActiveTab] = useState<"social" | "app" | "domain">("social");
  const [targetBrandId, setTargetBrandId] = useState<string>(
    selectedBrandId !== "all" ? selectedBrandId : brands[0]?.id || "brand-edtech-01"
  );

  // Social form
  const [socialHandle, setSocialHandle] = useState("@eduverse_admissions_direct");
  const [socialPlatform, setSocialPlatform] = useState("Instagram");
  const [socialDisplayName, setSocialDisplayName] = useState("EduVerse Fast Admissions");
  const [socialBio, setSocialBio] = useState("Direct admission seat guarantee. DM to pay $50 processing fee.");
  const [socialLink, setSocialLink] = useState("https://eduverse-fastpay.xyz/apply");

  // App form
  const [appName, setAppName] = useState("EduVerse Pro Exam Pass");
  const [appPublisher, setAppPublisher] = useState("FastStudy Global Media");
  const [appPackageId, setAppPackageId] = useState("com.faststudy.eduverse");
  const [appMarketplace, setAppMarketplace] = useState("APKPure");

  // Domain form
  const [domainUrl, setDomainUrl] = useState("https://eduverse-scholarships-verify.site/login");

  // State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setIsSaved(false);
    setErrorMessage(null);

    try {
      let endpoint = "";
      let payload = {};

      if (activeTab === "social") {
        endpoint = "/api/analyze/social";
        payload = {
          brandId: targetBrandId,
          candidate: {
            handle: socialHandle,
            platform: socialPlatform,
            displayName: socialDisplayName,
            bio: socialBio,
            links: socialLink ? [socialLink] : [],
            posts: [{ text: socialBio }],
          },
        };
      } else if (activeTab === "app") {
        endpoint = "/api/analyze/app";
        payload = {
          brandId: targetBrandId,
          candidate: {
            name: appName,
            publisherName: appPublisher,
            packageId: appPackageId,
            marketplace: appMarketplace,
            permissions: ["READ_SMS", "SYSTEM_ALERT_WINDOW"],
          },
        };
      } else {
        endpoint = "/api/analyze/domain";
        payload = {
          brandId: targetBrandId,
          urlOrDomain: domainUrl,
          generateTyposquats: true,
        };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Analysis failed.");
      }

      setAnalysisResult(data.analysis);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveAsFinding = async () => {
    if (!analysisResult) return;
    setIsAnalyzing(true);
    try {
      const selectedBrand = brands.find((b) => b.id === targetBrandId);
      const entityName =
        activeTab === "social"
          ? socialHandle
          : activeTab === "app"
          ? appName
          : domainUrl;

      const res = await fetch("/api/findings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId: targetBrandId,
          brandName: selectedBrand?.name,
          category: analysisResult.category || "potential_impersonation",
          sourceModule: activeTab,
          entityType:
            activeTab === "social"
              ? "social_profile"
              : activeTab === "app"
              ? "mobile_app"
              : "domain",
          entityName,
          entityIdentifier: `entity-${Date.now()}`,
          title: `Screened ${activeTab.toUpperCase()} Finding: ${entityName}`,
          description: analysisResult.rationale,
          indicators: analysisResult.indicators,
          evidence: analysisResult.evidence,
          riskScore: analysisResult.riskScore,
          severity: analysisResult.severity,
          confidence: analysisResult.confidence,
          corroboratedCategories: analysisResult.corroboratedCategories,
          signalsIncreasingRisk: analysisResult.signalsIncreasingRisk,
          signalsReducingRisk: analysisResult.signalsReducingRisk,
          status: "new",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsSaved(true);
        if (onAnalysisSaved) onAnalysisSaved();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to persist finding.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-3xl rounded-xl bg-sentrix-card border border-sentrix-border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-sentrix-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sentrix-cyan/10 text-sentrix-cyan border border-sentrix-cyan/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-sentrix-text">
                Live Threat Detection Engine
              </h3>
              <p className="text-xs text-sentrix-muted">
                Run deterministic scoring & explainable risk analysis on any candidate asset.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-sentrix-muted hover:text-sentrix-text hover:bg-sentrix-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Brand Selector */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-sentrix-muted uppercase tracking-wider shrink-0">
              Protected Brand:
            </label>
            <select
              value={targetBrandId}
              onChange={(e) => setTargetBrandId(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-xs text-sentrix-text focus:outline-none focus:border-sentrix-cyan"
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.industry})
                </option>
              ))}
            </select>
          </div>

          {/* Module Tabs */}
          <div className="flex rounded-lg bg-sentrix-surface p-1 border border-sentrix-border">
            <button
              onClick={() => {
                setActiveTab("social");
                setAnalysisResult(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-all ${
                activeTab === "social"
                  ? "bg-sentrix-card text-sentrix-cyan shadow-sm border border-sentrix-cyan/30"
                  : "text-sentrix-muted hover:text-sentrix-text"
              }`}
            >
              <AtSign className="w-3.5 h-3.5" /> Social Media Profile
            </button>
            <button
              onClick={() => {
                setActiveTab("app");
                setAnalysisResult(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-all ${
                activeTab === "app"
                  ? "bg-sentrix-card text-sentrix-cyan shadow-sm border border-sentrix-cyan/30"
                  : "text-sentrix-muted hover:text-sentrix-text"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" /> Mobile Application
            </button>
            <button
              onClick={() => {
                setActiveTab("domain");
                setAnalysisResult(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-all ${
                activeTab === "domain"
                  ? "bg-sentrix-card text-sentrix-cyan shadow-sm border border-sentrix-cyan/30"
                  : "text-sentrix-muted hover:text-sentrix-text"
              }`}
            >
              <Globe className="w-3.5 h-3.5" /> Website & Domain
            </button>
          </div>

          {/* Tab Specific Inputs */}
          {activeTab === "social" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-sentrix-muted mb-1">Handle / Username</label>
                <input
                  type="text"
                  value={socialHandle}
                  onChange={(e) => setSocialHandle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text focus:outline-none focus:border-sentrix-cyan"
                  placeholder="@brand_support"
                />
              </div>
              <div>
                <label className="block text-sentrix-muted mb-1">Platform</label>
                <select
                  value={socialPlatform}
                  onChange={(e) => setSocialPlatform(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text focus:outline-none focus:border-sentrix-cyan"
                >
                  <option value="Twitter/X">Twitter/X</option>
                  <option value="Instagram">Instagram</option>
                  <option value="TikTok">TikTok</option>
                  <option value="LinkedIn">LinkedIn</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sentrix-muted mb-1">Display Name</label>
                <input
                  type="text"
                  value={socialDisplayName}
                  onChange={(e) => setSocialDisplayName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text focus:outline-none focus:border-sentrix-cyan"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sentrix-muted mb-1">Biography / Post Text</label>
                <textarea
                  rows={2}
                  value={socialBio}
                  onChange={(e) => setSocialBio(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text focus:outline-none focus:border-sentrix-cyan"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sentrix-muted mb-1">Link in Bio / Post</label>
                <input
                  type="text"
                  value={socialLink}
                  onChange={(e) => setSocialLink(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text focus:outline-none focus:border-sentrix-cyan"
                  placeholder="https://..."
                />
              </div>
            </div>
          )}

          {activeTab === "app" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-sentrix-muted mb-1">Application Name</label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text focus:outline-none focus:border-sentrix-cyan"
                />
              </div>
              <div>
                <label className="block text-sentrix-muted mb-1">Publisher Name</label>
                <input
                  type="text"
                  value={appPublisher}
                  onChange={(e) => setAppPublisher(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text focus:outline-none focus:border-sentrix-cyan"
                />
              </div>
              <div>
                <label className="block text-sentrix-muted mb-1">Package / Bundle Identifier</label>
                <input
                  type="text"
                  value={appPackageId}
                  onChange={(e) => setAppPackageId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text focus:outline-none focus:border-sentrix-cyan font-mono"
                />
              </div>
              <div>
                <label className="block text-sentrix-muted mb-1">Marketplace</label>
                <select
                  value={appMarketplace}
                  onChange={(e) => setAppMarketplace(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text focus:outline-none focus:border-sentrix-cyan"
                >
                  <option value="Google Play">Google Play Store</option>
                  <option value="Apple App Store">Apple App Store</option>
                  <option value="APKPure">APKPure</option>
                  <option value="APKMirror">APKMirror</option>
                  <option value="Third-Party Mirror">Third-Party Direct Download</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === "domain" && (
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-sentrix-muted mb-1">Candidate Domain or Full URL</label>
                <input
                  type="text"
                  value={domainUrl}
                  onChange={(e) => setDomainUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text focus:outline-none focus:border-sentrix-cyan font-mono"
                  placeholder="https://brand-verification-login.com"
                />
              </div>
              <p className="text-[11px] text-sentrix-subtle">
                Safely checks edit distance, typosquatting, credential harvesting keywords, and SSRF restrictions.
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
              {errorMessage}
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            <button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              className="w-full py-2.5 rounded-lg bg-sentrix-cyan text-sentrix-bg font-bold text-xs uppercase tracking-wider hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-sentrix-bg border-t-transparent rounded-full animate-spin" />
                  Running Explainable Detection...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" /> Run Live Assessment
                </>
              )}
            </button>
          </div>

          {/* Results Display */}
          {analysisResult && (
            <div className="mt-4 p-4 rounded-xl bg-sentrix-surface border border-sentrix-cyan/40 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-sentrix-border">
                <div>
                  <h4 className="text-sm font-bold text-sentrix-text">
                    Assessment Findings & Explainability
                  </h4>
                  <p className="text-xs text-sentrix-muted">
                    Confidence: <span className="font-semibold text-sentrix-cyan">{analysisResult.confidence}%</span>
                  </p>
                </div>
                <RiskScoreBadge
                  score={analysisResult.riskScore}
                  severity={analysisResult.severity}
                  classification={analysisResult.classification}
                  size="lg"
                />
              </div>

              <div>
                <span className="text-xs font-semibold text-sentrix-subtle uppercase tracking-wider block mb-1">
                  Engine Rationale
                </span>
                <p className="text-xs text-sentrix-text bg-sentrix-card/80 p-3 rounded-lg border border-sentrix-border leading-relaxed">
                  {analysisResult.rationale}
                </p>
              </div>

              {/* Evidence breakdown */}
              {analysisResult.evidence && analysisResult.evidence.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-sentrix-subtle uppercase tracking-wider block mb-2">
                    Corroborated Evidence ({analysisResult.evidence.length})
                  </span>
                  <EvidenceList evidence={analysisResult.evidence} />
                </div>
              )}

              {/* Save finding CTA */}
              <div className="pt-3 border-t border-sentrix-border flex items-center justify-between">
                <span className="text-xs text-sentrix-muted">
                  {isSaved ? "Saved to active findings." : "Add to organization threat database?"}
                </span>
                <button
                  onClick={handleSaveAsFinding}
                  disabled={isSaved || isAnalyzing}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                    isSaved
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-sentrix-teal text-sentrix-bg hover:brightness-110"
                  }`}
                >
                  {isSaved ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Finding Logged
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4" /> Save as Finding
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

