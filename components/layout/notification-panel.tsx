"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppNotification } from "@/types";
import { formatTimeAgo, getSeverityBadgeClass } from "@/lib/utils";
import { X, Bell, CheckCheck, ShieldAlert, ArrowRight } from "lucide-react";

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationsUpdated?: () => void;
}

export function NotificationPanel({
  isOpen,
  onClose,
  onNotificationsUpdated,
}: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/notifications");
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data);
      }
    } catch (err) {
      console.warn("Could not load notifications:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      fetchNotifications();
      if (onNotificationsUpdated) onNotificationsUpdated();
    } catch (err) {
      console.warn(err);
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
      if (onNotificationsUpdated) onNotificationsUpdated();
    } catch (err) {
      console.warn(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-sentrix-card border-l border-sentrix-border shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-sentrix-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-sentrix-cyan" />
              <h3 className="text-sm font-bold text-sentrix-text">
                Threat Activity & Notifications
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-sentrix-cyan hover:underline flex items-center gap-1 font-medium"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-sentrix-muted hover:text-sentrix-text hover:bg-sentrix-surface"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center p-8 text-xs text-sentrix-muted">
                <div className="w-5 h-5 border-2 border-sentrix-cyan border-t-transparent rounded-full animate-spin mr-2" />
                Loading alerts...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-sentrix-muted">
                No active notifications.
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-lg border transition-all ${
                    item.read
                      ? "bg-sentrix-surface/50 border-sentrix-border/60 opacity-80"
                      : "bg-sentrix-surface border-sentrix-cyan/40 shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span
                      className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${getSeverityBadgeClass(
                        item.severity
                      )}`}
                    >
                      {item.severity}
                    </span>
                    <span className="text-[10px] text-sentrix-muted">
                      {formatTimeAgo(item.createdAt)}
                    </span>
                  </div>

                  <h5 className="text-xs font-bold text-sentrix-text mb-1">
                    {item.title}
                  </h5>
                  <p className="text-xs text-sentrix-muted leading-relaxed mb-2">
                    {item.message}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-sentrix-border/40">
                    {!item.read && (
                      <button
                        onClick={() => handleMarkRead(item.id)}
                        className="text-[11px] text-sentrix-subtle hover:text-sentrix-cyan"
                      >
                        Mark as read
                      </button>
                    )}
                    {item.link && (
                      <Link
                        href={item.link}
                        onClick={onClose}
                        className="ml-auto text-[11px] font-semibold text-sentrix-cyan hover:underline flex items-center gap-1"
                      >
                        Inspect Event <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

