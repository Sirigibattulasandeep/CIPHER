"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useBrand } from "@/lib/brand-context";
import { useAuth } from "@/lib/auth-context";
import { Brand, Industry } from "@/types";
import {
  Layers,
  Plus,
  Search,
  Globe,
  AtSign,
  Smartphone,
  Shield,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  X,
  AlertCircle,
} from "lucide-react";
import confetti from "canvas-confetti";

export default function BrandsPage() {
  const { brands, reloadBrands, setSelectedBrandId } = useBrand();
  const { canEditBrand } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<string>("all");
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // 8-Step Onboarding Wizard State
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardName, setWizardName] = useState("");
  const [wizardIndustry, setWizardIndustry] = useState<Industry>("EdTech");
  const [wizardDescription, setWizardDescription] = useState("");
  const [wizardAliases, setWizardAliases] = useState("");
  const [wizardWebsites, setWizardWebsites] = useState("");
  const [wizardDomains, setWizardDomains] = useState("");
  const [wizardSocials, setWizardSocials] = useState("@brand_official");
  const [wizardSocialPlatform, setWizardSocialPlatform] = useState("Twitter/X");
  const [wizardAppName, setWizardAppName] = useState("");
  const [wizardPublisher, setWizardPublisher] = useState("");
  const [wizardPackageId, setWizardPackageId] = useState("");
  const [moduleSocial, setModuleSocial] = useState(true);
  const [moduleApp, setModuleApp] = useState(true);
  const [moduleDomain, setModuleDomain] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wizardError, setWizardError] = useState<string | null>(null);

  const industries: Industry[] = [
    "Banking & Financial Services",
    "E-commerce & Retail",
    "Healthcare",
    "Education",
    "Technology & SaaS",
    "Travel & Hospitality",
    "FinTech",
    "EdTech",
    "E-commerce",
  ];

  const filteredBrands = brands.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.aliases.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesIndustry =
      selectedIndustry === "all" || b.industry === selectedIndustry;
    return matchesSearch && matchesIndustry;
  });

  const handleFinishWizard = async () => {
    if (!wizardName.trim()) {
      setWizardError("Brand name cannot be blank.");
      return;
    }
    setIsSubmitting(true);
    setWizardError(null);

    try {
      const aliases = wizardAliases
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      const websites = wizardWebsites
        .split(",")
        .map((w) => w.trim())
        .filter(Boolean);
      const domains = wizardDomains
        .split(",")
        .map((d) => d.trim().replace(/^https?:\/\//, ""))
        .filter(Boolean);

      const officialSocialAccounts = wizardSocials
        ? [
            {
              platform: wizardSocialPlatform,
              handle: wizardSocials,
              url: `https://social.example/${wizardSocials.replace("@", "")}`,
              verified: true,
            },
          ]
        : [];

      const officialApps = wizardPackageId
        ? [
            {
              name: wizardAppName || `${wizardName} Mobile`,
              platform: "Android" as const,
              publisherName: wizardPublisher || wizardName,
              packageId: wizardPackageId,
              storeUrl: `https://play.google.com/store/apps/details?id=${wizardPackageId}`,
            },
          ]
        : [];

      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: wizardName,
          industry: wizardIndustry,
          description: wizardDescription,
          aliases,
          officialWebsites: websites,
          officialDomains: domains,
          officialSocialAccounts,
          officialApps,
          keywords: [wizardName.toLowerCase(), wizardIndustry.toLowerCase()],
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to register brand.");
      }

      // Celebrate
      try {
        confetti({ particleCount: 80, spread: 60 });
      } catch (e) {}

      await reloadBrands();
      setIsWizardOpen(false);
      // Reset wizard
      setWizardStep(1);
      setWizardName("");
      setWizardAliases("");
      setWizardWebsites("");
      setWizardDomains("");
      setWizardPackageId("");
    } catch (err: any) {
      setWizardError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-sentrix-card border border-sentrix-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded bg-sentrix-cyan/10 text-sentrix-cyan">
              <Layers className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono uppercase text-sentrix-cyan font-bold tracking-wider">
              Asset Registry
            </span>
          </div>
          <h1 className="text-xl font-bold text-sentrix-text">
            Protected Brand Ecosystem
          </h1>
          <p className="text-xs text-sentrix-muted">
            Manage authorized brand profiles, official digital assets, domains, and social handles across multiple business sectors.
          </p>
        </div>

        {canEditBrand() && (
          <button
            onClick={() => setIsWizardOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-sentrix-cyan text-sentrix-bg text-xs font-bold hover:brightness-110 shadow-glow-sm cursor-pointer transition-all shrink-0"
          >
            <Plus className="w-4 h-4" /> Register New Brand
          </button>
        )}
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sentrix-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search brands by name, alias, or keywords..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-xs text-sentrix-text placeholder:text-sentrix-muted focus:outline-none focus:border-sentrix-cyan"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedIndustry("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              selectedIndustry === "all"
                ? "bg-sentrix-cyan text-sentrix-bg font-bold"
                : "bg-sentrix-surface text-sentrix-muted hover:text-sentrix-text border border-sentrix-border"
            }`}
          >
            All Industries
          </button>
          {industries.map((ind) => (
            <button
              key={ind}
              onClick={() => setSelectedIndustry(ind)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedIndustry === ind
                  ? "bg-sentrix-cyan text-sentrix-bg font-bold"
                  : "bg-sentrix-surface text-sentrix-muted hover:text-sentrix-text border border-sentrix-border"
              }`}
            >
              {ind}
            </button>
          ))}
        </div>
      </div>

      {/* Brand Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBrands.map((brand) => (
          <div
            key={brand.id}
            className="p-5 rounded-xl bg-sentrix-card border border-sentrix-border hover:border-sentrix-cyan/40 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-sentrix-surface border border-sentrix-border flex items-center justify-center text-sentrix-cyan font-bold text-sm shadow-inner">
                    {brand.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-sentrix-text group-hover:text-sentrix-cyan transition-colors">
                      {brand.name}
                    </h3>
                    <span className="text-[11px] font-mono text-sentrix-teal">
                      {brand.industry}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {brand.status}
                </span>
              </div>

              <p className="text-xs text-sentrix-muted line-clamp-2 leading-relaxed mb-4">
                {brand.description}
              </p>

              {/* Official Assets Summary */}
              <div className="space-y-1.5 p-3 rounded-lg bg-sentrix-surface border border-sentrix-border/60 text-xs">
                <div className="flex items-center justify-between text-sentrix-muted">
                  <span className="flex items-center gap-1.5 text-[11px]">
                    <Globe className="w-3.5 h-3.5 text-sentrix-subtle" /> Domains
                  </span>
                  <span className="font-mono text-sentrix-text font-semibold">
                    {brand.officialDomains.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sentrix-muted">
                  <span className="flex items-center gap-1.5 text-[11px]">
                    <AtSign className="w-3.5 h-3.5 text-sentrix-subtle" /> Social Accounts
                  </span>
                  <span className="font-mono text-sentrix-text font-semibold">
                    {brand.officialSocialAccounts.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sentrix-muted">
                  <span className="flex items-center gap-1.5 text-[11px]">
                    <Smartphone className="w-3.5 h-3.5 text-sentrix-subtle" /> Mobile Apps
                  </span>
                  <span className="font-mono text-sentrix-text font-semibold">
                    {brand.officialApps.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-sentrix-border/60 flex items-center justify-between">
              <button
                onClick={() => setSelectedBrandId(brand.id)}
                className="text-xs text-sentrix-muted hover:text-sentrix-cyan font-medium"
              >
                Set as Active Scope
              </button>
              <Link
                href={`/brands/${brand.id}`}
                className="text-xs font-semibold text-sentrix-cyan hover:underline flex items-center gap-1"
              >
                Inspect Assets <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* 8-Step Onboarding Wizard Modal */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl rounded-xl bg-sentrix-card border border-sentrix-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-sentrix-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-sentrix-cyan/10 text-sentrix-cyan">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-sentrix-text">
                    Brand Onboarding Wizard
                  </h3>
                  <p className="text-[11px] text-sentrix-muted">
                    Step {wizardStep} of 8 • Universal DRP Registration
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsWizardOpen(false)}
                className="p-1 rounded-lg text-sentrix-muted hover:text-sentrix-text hover:bg-sentrix-surface"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Progress Bar */}
            <div className="w-full bg-sentrix-surface h-1.5">
              <div
                className="bg-sentrix-cyan h-1.5 transition-all duration-300"
                style={{ width: `${(wizardStep / 8) * 100}%` }}
              />
            </div>

            {/* Step Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {wizardError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{wizardError}</span>
                </div>
              )}

              {/* Step 1: Organization Confirmation */}
              {wizardStep === 1 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-sentrix-text">
                    Step 1: Organization Scope Confirmation
                  </h4>
                  <p className="text-xs text-sentrix-muted">
                    You are onboarding a brand under <strong className="text-sentrix-text">CyberShield Global Enterprises</strong>. All detection models and case assignments will be isolated to this tenant.
                  </p>
                  <div className="p-4 rounded-lg bg-sentrix-surface border border-sentrix-border text-xs space-y-1">
                    <p className="font-semibold text-sentrix-cyan">Tenant Isolation: Enforced</p>
                    <p className="text-sentrix-muted">Multi-tenancy guarantees no data leakage across enterprise accounts.</p>
                  </div>
                </div>
              )}

              {/* Step 2: Brand Identity */}
              {wizardStep === 2 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-sentrix-text">
                    Step 2: Brand Identity & Industry
                  </h4>
                  <p className="text-xs text-sentrix-muted">
                    Define the primary brand trademark, operating industry, and alternate names.
                  </p>
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-sentrix-muted mb-1">Brand Name *</label>
                      <input
                        type="text"
                        value={wizardName}
                        onChange={(e) => setWizardName(e.target.value)}
                        placeholder="e.g. Apex Cloud, HealthMatrix, Velocity Commerce"
                        className="w-full px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text focus:outline-none focus:border-sentrix-cyan"
                      />
                    </div>
                    <div>
                      <label className="block text-sentrix-muted mb-1">Operating Industry</label>
                      <select
                        value={wizardIndustry}
                        onChange={(e) => setWizardIndustry(e.target.value as Industry)}
                        className="w-full px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text focus:outline-none focus:border-sentrix-cyan"
                      >
                        {industries.map((ind) => (
                          <option key={ind} value={ind}>{ind}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sentrix-muted mb-1">Aliases & Alternate Spellings (comma separated)</label>
                      <input
                        type="text"
                        value={wizardAliases}
                        onChange={(e) => setWizardAliases(e.target.value)}
                        placeholder="e.g. Apex, ApexCloud, Apex Inc"
                        className="w-full px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text focus:outline-none focus:border-sentrix-cyan"
                      />
                    </div>
                    <div>
                      <label className="block text-sentrix-muted mb-1">Brand Description</label>
                      <textarea
                        rows={2}
                        value={wizardDescription}
                        onChange={(e) => setWizardDescription(e.target.value)}
                        placeholder="Brief overview of products and services"
                        className="w-full px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text focus:outline-none focus:border-sentrix-cyan"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Official Websites & Domains */}
              {wizardStep === 3 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-sentrix-text">
                    Step 3: Official Websites & Domain Names
                  </h4>
                  <p className="text-xs text-sentrix-muted">
                    Register authorized domains to distinguish legitimate web traffic from typosquatting and phishing candidates.
                  </p>
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-sentrix-muted mb-1">Official Domains (comma separated)</label>
                      <input
                        type="text"
                        value={wizardDomains}
                        onChange={(e) => setWizardDomains(e.target.value)}
                        placeholder="e.g. apexcloud.io, apex.com"
                        className="w-full px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text font-mono focus:outline-none focus:border-sentrix-cyan"
                      />
                    </div>
                    <div>
                      <label className="block text-sentrix-muted mb-1">Official Web Portals</label>
                      <input
                        type="text"
                        value={wizardWebsites}
                        onChange={(e) => setWizardWebsites(e.target.value)}
                        placeholder="https://www.apexcloud.io"
                        className="w-full px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text focus:outline-none focus:border-sentrix-cyan"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Official Social Handles */}
              {wizardStep === 4 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-sentrix-text">
                    Step 4: Register Official Social Handles
                  </h4>
                  <p className="text-xs text-sentrix-muted">
                    Candidate accounts matching these handles will be recognized as authorized assets rather than impostors.
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-sentrix-muted mb-1">Platform</label>
                      <select
                        value={wizardSocialPlatform}
                        onChange={(e) => setWizardSocialPlatform(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text focus:outline-none focus:border-sentrix-cyan"
                      >
                        <option value="Twitter/X">Twitter/X</option>
                        <option value="Instagram">Instagram</option>
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="TikTok">TikTok</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sentrix-muted mb-1">Authorized Handle</label>
                      <input
                        type="text"
                        value={wizardSocials}
                        onChange={(e) => setWizardSocials(e.target.value)}
                        placeholder="@brand_official"
                        className="w-full px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text focus:outline-none focus:border-sentrix-cyan"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Mobile App Registry */}
              {wizardStep === 5 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-sentrix-text">
                    Step 5: Official Mobile Applications
                  </h4>
                  <p className="text-xs text-sentrix-muted">
                    Provide publisher credentials and package names to identify rogue clones in app marketplaces.
                  </p>
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-sentrix-muted mb-1">Application Name</label>
                      <input
                        type="text"
                        value={wizardAppName}
                        onChange={(e) => setWizardAppName(e.target.value)}
                        placeholder="e.g. Apex Cloud Mobile"
                        className="w-full px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text focus:outline-none focus:border-sentrix-cyan"
                      />
                    </div>
                    <div>
                      <label className="block text-sentrix-muted mb-1">Authorized Publisher Name</label>
                      <input
                        type="text"
                        value={wizardPublisher}
                        onChange={(e) => setWizardPublisher(e.target.value)}
                        placeholder="e.g. Apex Technologies Inc"
                        className="w-full px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text focus:outline-none focus:border-sentrix-cyan"
                      />
                    </div>
                    <div>
                      <label className="block text-sentrix-muted mb-1">Official Package ID (Android / iOS)</label>
                      <input
                        type="text"
                        value={wizardPackageId}
                        onChange={(e) => setWizardPackageId(e.target.value)}
                        placeholder="e.g. com.apex.cloud.app"
                        className="w-full px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text font-mono focus:outline-none focus:border-sentrix-cyan"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 6: Choose Monitoring Modules */}
              {wizardStep === 6 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-sentrix-text">
                    Step 6: Select Active Monitoring Engines
                  </h4>
                  <p className="text-xs text-sentrix-muted">
                    Enable universal monitoring vectors for this brand.
                  </p>
                  <div className="space-y-2 text-xs">
                    <label className="flex items-center gap-3 p-3 rounded-lg bg-sentrix-surface border border-sentrix-border cursor-pointer">
                      <input
                        type="checkbox"
                        checked={moduleSocial}
                        onChange={(e) => setModuleSocial(e.target.checked)}
                        className="rounded border-sentrix-border text-sentrix-cyan focus:ring-0"
                      />
                      <div>
                        <p className="font-semibold text-sentrix-text">Social Intelligence Engine</p>
                        <p className="text-sentrix-muted">Impersonation, support spoofing, scam posts</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-lg bg-sentrix-surface border border-sentrix-border cursor-pointer">
                      <input
                        type="checkbox"
                        checked={moduleApp}
                        onChange={(e) => setModuleApp(e.target.checked)}
                        className="rounded border-sentrix-border text-sentrix-cyan focus:ring-0"
                      />
                      <div>
                        <p className="font-semibold text-sentrix-text">Mobile App Sentinel</p>
                        <p className="text-sentrix-muted">Publisher mismatches, malicious APKs, copycats</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-lg bg-sentrix-surface border border-sentrix-border cursor-pointer">
                      <input
                        type="checkbox"
                        checked={moduleDomain}
                        onChange={(e) => setModuleDomain(e.target.checked)}
                        className="rounded border-sentrix-border text-sentrix-cyan focus:ring-0"
                      />
                      <div>
                        <p className="font-semibold text-sentrix-text">Domain Radar & Phishing Defense</p>
                        <p className="text-sentrix-muted">Typosquatting, lookalike domains, credential harvesters</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Step 7: Risk Thresholds & Review */}
              {wizardStep === 7 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-sentrix-text">
                    Step 7: Threshold Configuration & Baseline Review
                  </h4>
                  <p className="text-xs text-sentrix-muted">
                    Standard risk thresholds applied for deterministic scoring:
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-3 rounded-lg bg-sentrix-surface border border-amber-500/30">
                      <span className="font-mono font-bold text-amber-400">Score &ge; 35</span>
                      <p className="text-[10px] text-sentrix-muted mt-1">Medium Severity</p>
                    </div>
                    <div className="p-3 rounded-lg bg-sentrix-surface border border-orange-500/30">
                      <span className="font-mono font-bold text-orange-400">Score &ge; 65</span>
                      <p className="text-[10px] text-sentrix-muted mt-1">High Severity</p>
                    </div>
                    <div className="p-3 rounded-lg bg-sentrix-surface border border-red-500/30">
                      <span className="font-mono font-bold text-red-400">Score &ge; 85</span>
                      <p className="text-[10px] text-sentrix-muted mt-1">Critical Severity</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 8: Final Review & Submit */}
              {wizardStep === 8 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-sentrix-text">
                    Step 8: Final Confirmation
                  </h4>
                  <p className="text-xs text-sentrix-muted">
                    Review and finalize registration of <strong className="text-sentrix-cyan">{wizardName || "Untitled Brand"}</strong>.
                  </p>
                  <div className="p-4 rounded-lg bg-sentrix-surface border border-sentrix-border text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sentrix-muted">Industry:</span>
                      <span className="font-semibold text-sentrix-text">{wizardIndustry}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sentrix-muted">Official Domains:</span>
                      <span className="font-mono text-sentrix-text">{wizardDomains || "None specified"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sentrix-muted">Official Social:</span>
                      <span className="text-sentrix-text">{wizardSocials || "None"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sentrix-muted">Official App Package:</span>
                      <span className="font-mono text-sentrix-text">{wizardPackageId || "None"}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 border-t border-sentrix-border flex items-center justify-between bg-sentrix-surface/50">
              {wizardStep > 1 ? (
                <button
                  onClick={() => setWizardStep(wizardStep - 1)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-sentrix-muted hover:text-sentrix-text"
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              {wizardStep < 8 ? (
                <button
                  onClick={() => {
                    if (wizardStep === 2 && !wizardName.trim()) {
                      setWizardError("Brand name is required.");
                      return;
                    }
                    setWizardError(null);
                    setWizardStep(wizardStep + 1);
                  }}
                  className="px-4 py-2 rounded-lg bg-sentrix-cyan text-sentrix-bg text-xs font-bold hover:brightness-110 flex items-center gap-1.5"
                >
                  Continue <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={handleFinishWizard}
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-sentrix-cyan to-sentrix-teal text-sentrix-bg text-xs font-bold hover:brightness-110 shadow-glow-sm flex items-center gap-2"
                >
                  {isSubmitting ? "Persisting Brand..." : "Complete Onboarding"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

