"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useBrand } from "@/lib/brand-context";
import { playCyberClick, playCyberAlert } from "@/lib/sound";
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  RotateCcw,
  Minimize2,
  Maximize2,
  ChevronRight,
  Shield,
  Lightbulb,
  ExternalLink,
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  quickActions?: string[];
}

interface AiCopilotProps {
  onOpenQuickAnalysis?: () => void;
  onOpenAppGuide?: () => void;
}

export function AiCopilot({ onOpenQuickAnalysis, onOpenAppGuide }: AiCopilotProps) {
  const pathname = usePathname();
  const { selectedBrand } = useBrand();

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-msg",
      sender: "bot",
      text: `### Welcome to Sentrix Sentinel AI
I'm your embedded cyber threat analyst assistant. I can help assess threat telemetry, guide you through takedowns, explain risk scores, or navigate the platform.

**Quick Prompts:**
- *Explain risk score calculation*
- *How to execute a domain takedown*
- *Guide me through the platform*`,
      timestamp: "Just now",
      quickActions: ["Explain Risk Score", "Takedown Protocol", "Launch App Tour", "Screen Asset"],
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Global Keyboard shortcut: Ctrl+J or Cmd+J to toggle AI Copilot
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "j" || e.key === "J")) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        playCyberClick();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = textToSend || input.trim();
    if (!prompt || isLoading) return;

    playCyberClick();
    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setIsLoading(true);

    // Check for direct interactive client actions
    if (prompt.toLowerCase().includes("tour") || prompt.toLowerCase().includes("guide")) {
      if (onOpenAppGuide) {
        setTimeout(() => {
          onOpenAppGuide();
        }, 300);
      }
    } else if (prompt.toLowerCase().includes("screen asset") || prompt.toLowerCase().includes("analyze")) {
      if (onOpenQuickAnalysis) {
        setTimeout(() => {
          onOpenQuickAnalysis();
        }, 300);
      }
    }

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          context: {
            route: pathname,
            brandName: selectedBrand?.name || "All Brands",
          },
        }),
      });

      const data = await res.json();
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: data.reply || "Analysis complete.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        quickActions: data.quickActions,
      };

      setMessages((prev) => [...prev, botMsg]);
      playCyberAlert();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: "bot",
          text: "Operating in resilient offline mode. For instant risk calculations and takedown playbooks, use the suggestion buttons below.",
          timestamp: "Just now",
          quickActions: ["Explain Risk Score", "Takedown Protocol", "Launch App Tour"],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (actionText: string) => {
    if (actionText === "Launch App Tour" && onOpenAppGuide) {
      onOpenAppGuide();
      return;
    }
    if (actionText === "Screen Asset" && onOpenQuickAnalysis) {
      onOpenQuickAnalysis();
      return;
    }
    handleSendMessage(actionText);
  };

  const handleClearHistory = () => {
    playCyberClick();
    setMessages([
      {
        id: "msg-reset",
        sender: "bot",
        text: "Session cleared. What would you like to investigate next?",
        timestamp: "Just now",
        quickActions: ["Explain Risk Score", "Takedown Protocol", "Launch App Tour", "Screen Asset"],
      },
    ]);
  };

  return (
    <>
      {/* Floating Trigger Button (Bottom-Right) */}
      {!isOpen && (
        <button
          onClick={() => {
            playCyberClick();
            setIsOpen(true);
          }}
          className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 group flex items-center gap-2.5 px-3.5 py-2.5 rounded-full bg-gradient-to-r from-[#D7A93A] via-[#E4BE5B] to-[#D7A93A] text-[#0A1017] font-bold text-xs shadow-[0_0_24px_rgba(215,169,58,0.35)] hover:shadow-[0_0_32px_rgba(215,169,58,0.55)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Open Sentrix AI Assistant (Ctrl+J / Cmd+J)"
        >
          <div className="relative flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-[#D7A93A] opacity-60" />
            <Sparkles className="w-4 h-4 fill-current relative" />
          </div>
          <span className="hidden sm:inline tracking-wide font-extrabold">SENTRIX AI</span>
          <kbd className="hidden lg:inline-block px-1.5 py-0.2 rounded bg-[#0A1017]/20 text-[10px] font-mono">
            Ctrl+J
          </kbd>
        </button>
      )}

      {/* Floating / Docked Chat Panel */}
      {isOpen && (
        <div
          className={`fixed z-50 flex flex-col bg-[#111923] border border-[#2A3543] shadow-[0_12px_48px_rgba(0,0,0,0.7)] transition-all duration-200 overflow-hidden ${
            isExpanded
              ? "inset-4 md:inset-10 rounded-2xl"
              : "bottom-0 right-0 w-full sm:w-[420px] sm:bottom-6 sm:right-6 sm:rounded-2xl h-[560px] max-h-[90vh]"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#0A1017] border-b border-[#2A3543]">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#D7A93A] text-[#0A1017] shadow-[0_0_12px_rgba(215,169,58,0.3)]">
                <Sparkles className="w-4 h-4 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-100">Sentrix Sentinel AI</span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono">
                    Online
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Context: {selectedBrand ? selectedBrand.name : "Unified Defense"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              <button
                onClick={handleClearHistory}
                className="p-1.5 rounded-lg hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
                title="Clear Chat History"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="hidden sm:inline-flex p-1.5 rounded-lg hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
                title={isExpanded ? "Restore" : "Expand"}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => {
                  playCyberClick();
                  setIsOpen(false);
                }}
                className="p-1.5 rounded-lg hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
                title="Close (Ctrl+J)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.sender === "bot" && (
                  <div className="w-6 h-6 rounded-md bg-[#D7A93A]/10 border border-[#D7A93A]/30 text-[#D7A93A] flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className={`space-y-2 max-w-[85%] ${m.sender === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`p-3 rounded-xl leading-relaxed whitespace-pre-wrap break-words ${
                      m.sender === "user"
                        ? "bg-[#D7A93A] text-[#0A1017] font-medium rounded-tr-none shadow-md"
                        : "bg-[#17202B] border border-[#2A3543] text-slate-200 rounded-tl-none shadow-sm"
                    }`}
                  >
                    {m.text}
                  </div>

                  {/* Quick Action Pills */}
                  {m.quickActions && m.quickActions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {m.quickActions.map((qa) => (
                        <button
                          key={qa}
                          onClick={() => handleQuickAction(qa)}
                          className="px-2 py-1 rounded-md bg-[#1C2634] border border-[#2A3543] hover:border-[#D7A93A]/50 text-slate-300 hover:text-[#D7A93A] text-[10px] font-semibold transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                        >
                          <ChevronRight className="w-2.5 h-2.5 text-[#D7A93A]" />
                          {qa}
                        </button>
                      ))}
                    </div>
                  )}

                  <span className="text-[9px] font-mono text-slate-500 block px-1">
                    {m.timestamp}
                  </span>
                </div>

                {m.sender === "user" && (
                  <div className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs pl-8">
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D7A93A] animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D7A93A] animate-bounce [animation-delay:0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D7A93A] animate-bounce [animation-delay:0.3s]" />
                </div>
                <span>Sentinel AI analyzing threat telemetry...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Carousel */}
          <div className="px-3 py-1.5 bg-[#0D141E] border-t border-[#2A3543]/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[10px]">
            <span className="text-slate-500 uppercase font-mono tracking-wider shrink-0 mr-1">Suggestions:</span>
            <button
              onClick={() => handleQuickAction("Explain Risk Score")}
              className="px-2 py-0.5 rounded bg-[#17202B] hover:bg-[#D7A93A]/10 text-slate-300 hover:text-[#D7A93A] whitespace-nowrap transition-colors border border-[#2A3543]"
            >
              📊 Risk Score
            </button>
            <button
              onClick={() => handleQuickAction("Takedown Protocol")}
              className="px-2 py-0.5 rounded bg-[#17202B] hover:bg-[#D7A93A]/10 text-slate-300 hover:text-[#D7A93A] whitespace-nowrap transition-colors border border-[#2A3543]"
            >
              🚨 Takedowns
            </button>
            <button
              onClick={() => handleQuickAction("Launch App Tour")}
              className="px-2 py-0.5 rounded bg-[#17202B] hover:bg-[#D7A93A]/10 text-slate-300 hover:text-[#D7A93A] whitespace-nowrap transition-colors border border-[#2A3543]"
            >
              🧭 App Tour
            </button>
            <button
              onClick={() => handleQuickAction("Screen Asset")}
              className="px-2 py-0.5 rounded bg-[#17202B] hover:bg-[#D7A93A]/10 text-slate-300 hover:text-[#D7A93A] whitespace-nowrap transition-colors border border-[#2A3543]"
            >
              ⚡ Live Screen
            </button>
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-[#0A1017] border-t border-[#2A3543] flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask Sentinel AI or type a prompt..."
              disabled={isLoading}
              className="flex-1 px-3 py-2 rounded-xl bg-[#17202B] border border-[#2A3543] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#D7A93A] transition-all"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || isLoading}
              className="p-2.5 rounded-xl bg-[#D7A93A] text-[#0A1017] font-bold hover:brightness-110 disabled:opacity-40 transition-all cursor-pointer active:scale-95"
              title="Send Prompt"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

