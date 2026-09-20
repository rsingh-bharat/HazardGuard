"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bot, Send, X, Sparkles } from "lucide-react";
import { useShareableState } from "@/lib/state/useShareableState";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface MeghDootProps {
  mode?: "floating" | "full";
}

export const MeghDoot: React.FC<MeghDootProps> = ({ mode = "floating" }) => {
  const { selectedDistrictId, activeForecastId } = useShareableState();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        "Namaste. I am MeghDoot, your NDMA/SDMA disaster intelligence copilot. Ask me about authoritative rainfall forecasts, multi-domain hazard status, or 3D digital twin simulation impacts.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen || mode === "full") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, mode]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const quickChips = [
    "Which districts need urgent evacuation?",
    "Explain prevailing weather regime risk",
    "Compare raw NWP vs AI forecast for Pune",
    "HIGH scenario flood mitigation advice",
  ];

  const handleSend = async (userText?: string) => {
    const textToSend = userText || query;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: ChatMsg = {
      role: "user",
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuery("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: textToSend.trim(),
          forecastId: activeForecastId,
          districtId: selectedDistrictId,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      let data;
      if (res.ok) {
        data = await res.json();
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.reply || "API Error");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || "No response generated.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            err instanceof Error ? `⚠️ ${err.message}` : "⚠️ MeghDoot service is currently unavailable.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Chat panel body (shared between floating/full modes) ───
  const chatBody = (
    <div className="flex flex-col h-full select-none" style={{ color: "#ffffff" }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ background: "rgba(0,0,0,.18)", borderBottom: "1px solid rgba(255,255,255,.12)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center"
            style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "rgba(121,104,255,.28)",
              border: "1px solid rgba(121,104,255,.55)",
              boxShadow: "0 0 14px rgba(121,104,255,.40)",
            }}
          >
            <Bot size={16} style={{ color: "#a89fff" }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                style={{
                  fontFamily: "'Inter Tight', Inter, sans-serif",
                  fontWeight: 600, fontSize: 13,
                  color: "#ffffff", letterSpacing: "0.02em",
                }}
              >
                MeghDoot AI
              </span>
              <span
                style={{
                  fontSize: 8, fontWeight: 700, padding: "1px 7px",
                  background: "rgba(200,255,61,.16)",
                  border: "1px solid rgba(200,255,61,.38)",
                  borderRadius: 999, color: "#C8FF3D", letterSpacing: "0.06em",
                }}
              >
                LIVE
              </span>
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.48)", marginTop: 1 }}>
              Context:{" "}
              <span style={{ color: "#a89fff", fontWeight: 600 }}>
                {selectedDistrictId ? selectedDistrictId : "National Telemetry"}
              </span>
            </div>
          </div>
        </div>

        {mode === "floating" && (
          <button
            onClick={() => setIsOpen(false)}
            style={{ color: "rgba(255,255,255,.50)", cursor: "pointer", padding: 4 }}
            className="hover:text-white transition rounded-full"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── Message thread ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: 0 }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              style={{
                maxWidth: "88%",
                padding: "10px 14px",
                borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                fontSize: 12,
                lineHeight: 1.55,
                ...(msg.role === "user"
                  ? {
                      background: "rgba(121,104,255,.30)",
                      border: "1px solid rgba(121,104,255,.45)",
                      color: "#ffffff",
                    }
                  : {
                      background: "rgba(255,255,255,.10)",
                      border: "1px solid rgba(255,255,255,.15)",
                      color: "rgba(255,255,255,.90)",
                    }),
              }}
            >
              <div className="whitespace-pre-line">{msg.content}</div>
            </div>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,.35)", marginTop: 3, paddingInline: 4 }}>
              {msg.timestamp}
            </span>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-start">
            <div
              className="flex items-center gap-2 px-3 py-2.5"
              style={{
                background: "rgba(255,255,255,.08)",
                border: "1px solid rgba(255,255,255,.12)",
                borderRadius: "18px 18px 18px 4px",
              }}
            >
              <Sparkles size={12} style={{ color: "#a89fff" }} className="animate-signal-blink" />
              <span style={{ fontSize: 11, color: "#a89fff" }}>Synthesising telemetry…</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Quick chips ──────────────────────────────────────── */}
      <div
        className="px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,.08)" }}
      >
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip)}
            className="shrink-0 transition hover:brightness-110"
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              background: "rgba(255,255,255,.08)",
              border: "1px solid rgba(255,255,255,.15)",
              color: "rgba(255,255,255,.70)",
              fontSize: 10,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* ── Input bar ────────────────────────────────────────── */}
      <div
        className="p-3 flex items-center gap-2 shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,.10)", background: "rgba(0,0,0,.10)" }}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask about rainfall, hazards, evacuation…"
          style={{
            flex: 1,
            background: "rgba(255,255,255,.08)",
            border: "1px solid rgba(255,255,255,.18)",
            borderRadius: 12,
            padding: "8px 12px",
            fontSize: 12,
            color: "#ffffff",
            outline: "none",
          }}
          onFocus={(e) => {
            e.currentTarget.style.border = "1px solid rgba(121,104,255,.60)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.border = "1px solid rgba(255,255,255,.18)";
          }}
        />
        <button
          onClick={() => handleSend()}
          disabled={isLoading || !query.trim()}
          className="transition hover:brightness-110 disabled:opacity-40"
          style={{
            width: 36, height: 36,
            borderRadius: "50%",
            background: query.trim() ? "#7968FF" : "rgba(255,255,255,.12)",
            border: "none",
            color: "#ffffff",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );

  // ─── Full-panel mode (e.g. embedded in a page) ──────────────
  if (mode === "full") {
    return (
      <div
        className="w-full h-full overflow-hidden"
        style={{
          background: "linear-gradient(180deg,rgba(255,255,255,.16) 0%,rgba(255,255,255,.12) 100%)",
          backdropFilter: "blur(26px) saturate(118%)",
          WebkitBackdropFilter: "blur(26px) saturate(118%)",
          border: "1px solid rgba(255,255,255,.18)",
          borderRadius: 20,
        }}
      >
        {chatBody}
      </div>
    );
  }

  // ─── Floating mode ───────────────────────────────────────────
  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed z-50 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          bottom: 24, right: 24,
          width: 52, height: 52,
          borderRadius: "50%",
          background: isOpen ? "rgba(121,104,255,.40)" : "rgba(121,104,255,.22)",
          backdropFilter: "blur(16px) saturate(115%)",
          WebkitBackdropFilter: "blur(16px) saturate(115%)",
          border: `1px solid rgba(121,104,255,${isOpen ? ".70" : ".50"})`,
          color: "#ffffff",
          boxShadow: "0 0 24px rgba(121,104,255,.40)",
        }}
        title="Open MeghDoot AI Copilot"
      >
        {isOpen ? <X size={20} /> : <Bot size={22} />}
        {!isOpen && (
          <span
            className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full animate-radar-pulse"
            style={{ background: "#C8FF3D" }}
          />
        )}
      </button>

      {/* Floating drawer */}
      {isOpen && (
        <div
          className="fixed z-50"
          style={{
            bottom: 86,
            right: 20,
            width: "min(420px, calc(100vw - 40px))",
            height: "min(560px, calc(100vh - 120px))",
            background:
              "linear-gradient(180deg,rgba(14,24,38,.96) 0%,rgba(10,18,30,.98) 100%)",
            backdropFilter: "blur(28px) saturate(140%)",
            WebkitBackdropFilter: "blur(28px) saturate(140%)",
            border: "1px solid rgba(121,104,255,.30)",
            borderRadius: 24,
            overflow: "hidden",
            boxShadow: "0 24px 60px rgba(0,0,0,.50), 0 0 0 1px rgba(121,104,255,.15)",
          }}
        >
          {chatBody}
        </div>
      )}
    </>
  );
};
