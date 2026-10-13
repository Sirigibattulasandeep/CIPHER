"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { NotificationPanel } from "./notification-panel";
import { CommandPalette } from "./command-palette";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { QuickAnalysisModal } from "@/components/shared/quick-analysis-modal";
import { AiCopilot } from "@/components/ai/ai-copilot";
import { AppGuide } from "@/components/guide/app-guide";
import { PwaController } from "@/components/pwa/pwa-controller";
import { ServerResilienceBanner } from "@/components/shared/server-resilience-banner";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isQuickAnalysisOpen, setIsQuickAnalysisOpen] = useState(false);
  const [isAppGuideOpen, setIsAppGuideOpen] = useState(false);

  useEffect(() => {
    // Check if user has seen the guide on first visit
    const hasSeenGuide = localStorage.getItem("sentrix_guide_completed");
    if (!hasSeenGuide && !isLoginPage) {
      // Small timeout to allow initial render
      const timer = setTimeout(() => {
        setIsAppGuideOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoginPage]);

  if (isLoginPage) {
    return <main className="min-h-screen bg-sentrix-bg">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-sentrix-bg text-sentrix-text flex flex-col md:flex-row relative">
      {/* PWA Lifecycle & OS Listener */}
      <PwaController />

      {/* Desktop Persistent Sidebar */}
      <Sidebar
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-0">
        {/* Offline / Server Resilience Notice */}
        <ServerResilienceBanner />

        <Header
          onOpenMobileMenu={() => setIsMobileOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenQuickAnalysis={() => setIsQuickAnalysisOpen(true)}
          onOpenAppGuide={() => setIsAppGuideOpen(true)}
          unreadCount={2}
        />

        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (iOS / Android) */}
      <MobileBottomNav
        onOpenMobileMenu={() => setIsMobileOpen(true)}
        onOpenQuickAnalysis={() => setIsQuickAnalysisOpen(true)}
      />

      {/* AI Assistant Copilot (Universal across all screens) */}
      <AiCopilot
        onOpenQuickAnalysis={() => setIsQuickAnalysisOpen(true)}
        onOpenAppGuide={() => setIsAppGuideOpen(true)}
      />

      {/* Interactive Onboarding Tour & App Guide */}
      <AppGuide
        isOpen={isAppGuideOpen}
        onClose={() => setIsAppGuideOpen(false)}
        onOpenQuickAnalysis={() => setIsQuickAnalysisOpen(true)}
      />

      {/* Slide-over Notification Panel */}
      <NotificationPanel
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      {/* Quick Analysis Live Threat Testing Modal */}
      <QuickAnalysisModal
        isOpen={isQuickAnalysisOpen}
        onClose={() => setIsQuickAnalysisOpen(false)}
      />
    </div>
  );
}
