import React from "react";

export default function Loading() {
  return (
    <div className="space-y-6 animate-fadeIn p-2">
      {/* Top Banner Skeleton */}
      <div className="h-28 rounded-xl bg-sentrix-card/70 border border-sentrix-border skeleton-box" />

      {/* 4 KPI Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 rounded-xl bg-sentrix-card/70 border border-sentrix-border skeleton-box"
          />
        ))}
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-72 rounded-xl bg-sentrix-card/70 border border-sentrix-border skeleton-box" />
        <div className="h-72 rounded-xl bg-sentrix-card/70 border border-sentrix-border skeleton-box" />
      </div>

      {/* Table Skeleton */}
      <div className="h-64 rounded-xl bg-sentrix-card/70 border border-sentrix-border skeleton-box" />
    </div>
  );
}

