"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBrand } from "@/lib/brand-context";
import { useAuth } from "@/lib/auth-context";
import { Brand, Finding } from "@/types";
import { RiskScoreBadge } from "@/components/shared/risk-score-badge";
import {
  Layers,
  Globe,
  AtSign,
  Smartphone,
  Shield,
  ArrowLeft,
  Trash2,
  ExternalLink,
  Save,
  CheckCircle,
} from "lucide-react";

export default function BrandDetailPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.id as string;
  const { setSelectedBrandId, reloadBrands } = useBrand();
  const { canEditBrand } = useAuth();

  const [brand, setBrand] = useState<Brand | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "assets" | "findings">("overview");

  // Editable fields
  const [description, setDescription] = useState("");
  const [domainsInput, setDomainsInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function fetchBrandData() {
      setIsLoading(true);
      try {
        const [brandRes, findingsRes] = await Promise.all([
          fetch(`/api/brands/${brandId}`),
          fetch(`/api/findings?brandId=${brandId}`),
        ]);
        const brandJson = await brandRes.json();
        const findingsJson = await findingsRes.json();

        if (brandJson.success) {
          setBrand(brandJson.data);
          setDescription(brandJson.data.description);
          setDomainsInput(brandJson.data.officialDomains.join(", "));
        }
        if (findingsJson.success) {
          setFindings(findingsJson.data);
        }
      } catch (err) {
        console.warn(err);
      } finally {
        setIsLoading(false);
      }
    }
    if (brandId) fetchBrandData();
  }, [brandId]);

  const handleSaveChanges = async () => {
    if (!brand) return;
    setIsSaving(true);
    try {
      const updatedDomains = domainsInput
        .split(",")
        .map((d) => d.trim().replace(/^https?:\/\//, ""))
        .filter(Boolean);

      const res = await fetch(`/api/brands/${brandId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          officialDomains: updatedDomains,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setBrand(json.data);
        setSaveSuccess(true);
        await reloadBrands();
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      alert("Error saving updates.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBrand = async () => {
    if (!confirm(`Are you sure you want to delete brand "${brand?.name}"?`)) return;
    try {
      const res = await fetch(`/api/brands/${brandId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        await reloadBrands();
        router.push("/brands");
      }
    } catch (err) {
      alert("Failed to delete brand.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20 text-xs text-sentrix-muted">
        <div className="w-5 h-5 border-2 border-sentrix-cyan border-t-transparent rounded-full animate-spin mr-3" />
        Loading brand profile...
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="p-10 text-center space-y-3">
        <p className="text-sm text-red-400">Brand profile not found.</p>
        <Link href="/brands" className="text-xs text-sentrix-cyan underline">
          Return to Brands
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Back button */}
      <div>
        <Link
          href="/brands"
          className="inline-flex items-center gap-1.5 text-xs text-sentrix-muted hover:text-sentrix-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Brand Registry
        </Link>
      </div>

      {/* Header Banner */}
      <div className="p-6 rounded-xl bg-sentrix-card border border-sentrix-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-sentrix-surface border border-sentrix-cyan/40 flex items-center justify-center text-sentrix-cyan font-extrabold text-xl shadow-glow-sm">
            {brand.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-sentrix-text">{brand.name}</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sentrix-teal/10 text-sentrix-teal border border-sentrix-teal/30">
                {brand.industry}
              </span>
            </div>
            <p className="text-xs text-sentrix-muted mt-0.5">
              Aliases: {brand.aliases.join(", ") || "None"} • {findings.length} findings logged
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedBrandId(brand.id)}
            className="px-3.5 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-xs text-sentrix-cyan hover:border-sentrix-cyan font-semibold transition-all"
          >
            Filter Workspace to this Brand
          </button>
          {canEditBrand() && (
            <button
              onClick={handleDeleteBrand}
              className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 transition-colors"
              title="Delete Brand"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-sentrix-border">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "overview"
              ? "border-sentrix-cyan text-sentrix-cyan"
              : "border-transparent text-sentrix-muted hover:text-sentrix-text"
          }`}
        >
          Brand Overview & Settings
        </button>
        <button
          onClick={() => setActiveTab("assets")}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "assets"
              ? "border-sentrix-cyan text-sentrix-cyan"
              : "border-transparent text-sentrix-muted hover:text-sentrix-text"
          }`}
        >
          Official Assets ({brand.officialDomains.length + brand.officialSocialAccounts.length + brand.officialApps.length})
        </button>
        <button
          onClick={() => setActiveTab("findings")}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "findings"
              ? "border-sentrix-cyan text-sentrix-cyan"
              : "border-transparent text-sentrix-muted hover:text-sentrix-text"
          }`}
        >
          Detected Threats ({findings.length})
        </button>
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl bg-sentrix-card border border-sentrix-border space-y-4">
            <h3 className="text-sm font-bold text-sentrix-text">
              Brand Profile Details
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-sentrix-muted mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!canEditBrand()}
                  className="w-full px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text focus:outline-none focus:border-sentrix-cyan disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-sentrix-muted mb-1">Official Domains (comma separated)</label>
                <input
                  type="text"
                  value={domainsInput}
                  onChange={(e) => setDomainsInput(e.target.value)}
                  disabled={!canEditBrand()}
                  className="w-full px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text font-mono focus:outline-none focus:border-sentrix-cyan disabled:opacity-60"
                />
              </div>

              {canEditBrand() && (
                <button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-sentrix-cyan text-sentrix-bg text-xs font-bold hover:brightness-110 flex items-center gap-1.5 transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? "Saving..." : saveSuccess ? "Saved!" : "Update Brand"}
                </button>
              )}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-sentrix-card border border-sentrix-border space-y-4">
            <h3 className="text-sm font-bold text-sentrix-text">
              Configured Risk Thresholds
            </h3>
            <p className="text-xs text-sentrix-muted">
              Thresholds determining automated threat escalation:
            </p>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between p-2.5 rounded-lg bg-sentrix-surface border border-red-500/20">
                <span className="text-red-400 font-bold">Critical Severity Threshold:</span>
                <span className="text-sentrix-text">&ge; {brand.riskThresholds.critical}</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-sentrix-surface border border-orange-500/20">
                <span className="text-orange-400 font-bold">High Severity Threshold:</span>
                <span className="text-sentrix-text">&ge; {brand.riskThresholds.high}</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-sentrix-surface border border-amber-500/20">
                <span className="text-amber-400 font-bold">Medium Severity Threshold:</span>
                <span className="text-sentrix-text">&ge; {brand.riskThresholds.medium}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Assets */}
      {activeTab === "assets" && (
        <div className="space-y-6">
          {/* Domains */}
          <div className="p-5 rounded-xl bg-sentrix-card border border-sentrix-border space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-sentrix-cyan" />
              <h3 className="text-sm font-bold text-sentrix-text">Official Registered Domains</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {brand.officialDomains.map((dom) => (
                <div key={dom} className="p-3 rounded-lg bg-sentrix-surface border border-sentrix-border text-xs flex items-center justify-between">
                  <span className="font-mono text-sentrix-text font-semibold">{dom}</span>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Verified
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Social */}
          <div className="p-5 rounded-xl bg-sentrix-card border border-sentrix-border space-y-3">
            <div className="flex items-center gap-2">
              <AtSign className="w-4 h-4 text-sentrix-teal" />
              <h3 className="text-sm font-bold text-sentrix-text">Official Social Handles</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {brand.officialSocialAccounts.map((acc, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-sentrix-surface border border-sentrix-border text-xs flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sentrix-text">{acc.handle}</p>
                    <p className="text-[10px] text-sentrix-muted">{acc.platform}</p>
                  </div>
                  {acc.verified && (
                    <span className="text-[10px] text-sentrix-cyan flex items-center gap-1 font-semibold">
                      <CheckCircle className="w-3 h-3" /> Official
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Apps */}
          <div className="p-5 rounded-xl bg-sentrix-card border border-sentrix-border space-y-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-sentrix-text">Official Mobile Applications</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {brand.officialApps.map((app, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-sentrix-surface border border-sentrix-border text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sentrix-text">{app.name}</span>
                    <span className="text-[10px] font-mono text-sentrix-cyan">{app.platform}</span>
                  </div>
                  <p className="text-sentrix-muted">Publisher: {app.publisherName}</p>
                  <p className="font-mono text-[11px] text-sentrix-subtle truncate">Package: {app.packageId}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Findings */}
      {activeTab === "findings" && (
        <div className="space-y-3">
          {findings.length === 0 ? (
            <div className="p-8 text-center text-xs text-sentrix-muted bg-sentrix-card rounded-xl border border-sentrix-border">
              No threats currently recorded for this brand.
            </div>
          ) : (
            findings.map((f) => (
              <div
                key={f.id}
                className="p-4 rounded-xl bg-sentrix-card border border-sentrix-border hover:border-sentrix-borderLight flex items-center justify-between gap-4 text-xs transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <RiskScoreBadge score={f.riskScore} severity={f.severity} size="sm" />
                    <span className="font-semibold text-sentrix-text">{f.title}</span>
                  </div>
                  <p className="text-sentrix-muted">{f.description}</p>
                </div>
                <Link
                  href={`/findings/${f.id}`}
                  className="text-xs font-semibold text-sentrix-cyan hover:underline shrink-0"
                >
                  Inspect Case
                </Link>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

