"use client";

import React, { useState, useEffect } from "react";
import { playCyberClick } from "@/lib/sound";
import {
  Download,
  Share2,
  PlusSquare,
  CheckCircle2,
  X,
  Smartphone,
  Laptop,
  Apple,
} from "lucide-react";

export function PwaController() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [osName, setOsName] = useState<string>("desktop");
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detect OS
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) setOsName("Android");
    else if (/iPad|iPhone|iPod/.test(ua)) setOsName("iOS");
    else if (/mac/i.test(ua)) setOsName("macOS");
    else if (/win/i.test(ua)) setOsName("Windows");
    else if (/linux/i.test(ua)) setOsName("Linux");

    // Detect standalone display mode
    const standaloneMatch =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    setIsStandalone(standaloneMatch);

    // Register Service Worker for offline and PWA caching
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("Sentrix ServiceWorker registered:", reg.scope);
          })
          .catch((err) => {
            console.warn("ServiceWorker registration failed:", err);
          });
      });
    }

    // Listen for install prompt on Chromium (Windows, Android, Linux, ChromeOS, macOS Chrome)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    playCyberClick();

    if (osName === "iOS") {
      setShowIosGuide(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Browser doesn't support programmatic prompt or already installed
      alert(
        `To install SENTRIX on ${osName}:\n• In Chrome/Edge: Click the install icon in your address bar.\n• In Safari (macOS): Click File > Add to Dock.`
      );
    }
  };

  if (isStandalone) return null; // Already running in installed app window

  return (
    <>
      {/* iOS Install Guide Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-[#111923] border border-[#2A3543] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2A3543] pb-3">
              <div className="flex items-center gap-2 text-slate-100 font-bold text-sm">
                <Smartphone className="w-4 h-4 text-[#D7A93A]" /> Install on iOS
              </div>
              <button
                onClick={() => setShowIosGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              To install <strong>SENTRIX</strong> on your iPhone or iPad for native fullscreen experience:
            </p>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#17202B] border border-[#2A3543]">
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                  <Share2 className="w-4 h-4" />
                </div>
                <span>1. Tap the <strong>Share</strong> button in Safari toolbar.</span>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#17202B] border border-[#2A3543]">
                <div className="p-2 rounded-lg bg-[#D7A93A]/10 text-[#D7A93A]">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <span>2. Scroll down and tap <strong>Add to Home Screen</strong>.</span>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2 rounded-xl bg-[#D7A93A] text-[#0A1017] font-bold text-xs"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function PwaInstallButton({ className = "" }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [osName, setOsName] = useState<string>("Device");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ua = navigator.userAgent;
    if (/android/i.test(ua)) setOsName("Android");
    else if (/iPad|iPhone|iPod/.test(ua)) setOsName("iOS");
    else if (/mac/i.test(ua)) setOsName("macOS");
    else if (/win/i.test(ua)) setOsName("Windows");
    else if (/linux/i.test(ua)) setOsName("Linux");

    const standaloneMatch =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    setIsStandalone(standaloneMatch);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  if (isStandalone) return null;

  const triggerInstall = async () => {
    playCyberClick();
    if (osName === "iOS") {
      alert("To install on iOS: Tap the Share button in Safari, then select 'Add to Home Screen'.");
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else {
      alert(`Install Sentrix on ${osName} by clicking the app install icon in your browser address bar.`);
    }
  };

  return (
    <button
      onClick={triggerInstall}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#17202B] border border-[#2A3543] text-slate-300 hover:text-[#D7A93A] hover:border-[#D7A93A]/40 text-xs transition-all cursor-pointer ${className}`}
      title={`Install Sentrix Web App on ${osName}`}
    >
      <Download className="w-3.5 h-3.5 text-[#D7A93A]" />
      <span className="hidden xl:inline">Install App</span>
    </button>
  );
}

