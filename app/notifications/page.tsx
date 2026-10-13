"use client";

import React, { useState, useEffect } from "react";
import type { Route } from "next";
import Link from "next/link";
import { AppNotification } from "@/types";
import { getSeverityBadgeClass, formatTimeAgo, formatTimestamp } from "@/lib/utils";
import {
  Bell,
  CheckCheck,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  FolderKanban,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterRead, setFilterRead] = useState<string>("all");

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/notifications");
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data);
      }
    } catch (err) {
      console.warn("Failed fetching notifications:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      fetchNotifications();
    } catch (err) {
      alert("Failed updating notifications.");
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.warn(err);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    const matchesSeverity = filterSeverity === "all" || n.severity === filterSeverity;
    const matchesRead =
      filterRead === "all"
        ? true
        : filterRead === "unread"
        ? !n.read
        : n.read;
    return matchesSeverity && matchesRead;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-sentrix-card border border-sentrix-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded bg-amber-500/10 text-amber-400">
              <Bell className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono uppercase text-amber-400 font-bold tracking-wider">
              Alerts & Incident Dispatch
            </span>
          </div>
          <h1 className="text-xl font-bold text-sentrix-text">
            Threat Telemetry & Notification Center
          </h1>
          <p className="text-xs text-sentrix-muted">
            Audit log of critical threat detections, automated sweep completions, and enforcement order dispatches.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAllRead}
            className="px-3.5 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border hover:border-sentrix-cyan text-xs font-semibold text-sentrix-cyan flex items-center gap-1.5 transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark All as Read</span>
          </button>
          <button
            onClick={fetchNotifications}
            disabled={isLoading}
            className="p-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-muted hover:text-sentrix-text transition-colors"
            title="Refresh alerts"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3 text-xs">
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text focus:outline-none focus:border-sentrix-cyan"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical Only</option>
          <option value="high">High Only</option>
          <option value="low">Low Only</option>
        </select>

        <select
          value={filterRead}
          onChange={(e) => setFilterRead(e.target.value)}
          className="px-3 py-2 rounded-lg bg-sentrix-surface border border-sentrix-border text-sentrix-text focus:outline-none focus:border-sentrix-cyan"
        >
          <option value="all">All Read States</option>
          <option value="unread">Unread Alerts Only</option>
          <option value="read">Archived / Read Alerts</option>
        </select>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-xs text-sentrix-muted">
            Loading notification events...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center bg-sentrix-card rounded-xl border border-sentrix-border space-y-2">
            <p className="text-sm font-semibold text-sentrix-text">
              No notifications matching current filters.
            </p>
            <p className="text-xs text-sentrix-muted">
              All systems operating normally across registered digital perimeter channels.
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                n.read
                  ? "bg-sentrix-card/60 border-sentrix-border/60 opacity-85"
                  : "bg-sentrix-card border-sentrix-cyan/40 shadow-glow-sm"
              }`}
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${getSeverityBadgeClass(
                      n.severity
                    )}`}
                  >
                    {n.severity}
                  </span>
                  <span className="font-bold text-sentrix-text text-sm">{n.title}</span>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-sentrix-cyan animate-pulseSubtle" />
                  )}
                </div>
                <p className="text-xs text-sentrix-muted leading-relaxed max-w-3xl">
                  {n.message}
                </p>
                <div className="text-[11px] text-sentrix-subtle font-mono pt-1">
                  Dispatched {formatTimestamp(n.createdAt)} ({formatTimeAgo(n.createdAt)})
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!n.read && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="px-2.5 py-1.5 rounded-lg text-xs text-sentrix-subtle hover:text-sentrix-cyan"
                  >
                    Mark Read
                  </button>
                )}
                {n.link && (
                  <Link
                    href={n.link as Route}
                    className="px-3.5 py-1.5 rounded-lg bg-sentrix-surface border border-sentrix-border hover:border-sentrix-cyan text-xs font-semibold text-sentrix-cyan flex items-center gap-1 transition-colors"
                  >
                    <span>View Dossier</span> <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
