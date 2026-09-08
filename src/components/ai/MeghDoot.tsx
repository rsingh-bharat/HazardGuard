'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles, Terminal, Radio } from 'lucide-react';
import { useShareableState } from '@/lib/state/useShareableState';

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface MeghDootProps {
  mode?: 'floating' | 'full';
}

export const MeghDoot: React.FC<MeghDootProps> = ({ mode = 'floating' }) => {
  const { selectedDistrictId, activeForecastId } = useShareableState();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: 'assistant',
      content:
        'Namaste. I am **MeghDoot**, your NDMA/SDMA disaster intelligence copilot. Ask me about authoritative rainfall forecasts, multi-domain hazard status, or 3D digital twin simulation impacts.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen || mode === 'full') {
      scrollToBottom();
    }
  }, [messages, isOpen, mode]);

  const quickChips = [
    'Which districts need urgent evacuation?',
    'Explain prevailing weather regime risk',
    'Compare raw NWP vs AI forecast for Pune',
    'What does the HIGH scenario mean for district flood mitigation?',
  ];

  const handleSend = async (userText?: string) => {
    const textToSend = userText || query;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: ChatMsg = {
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuery('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        throw new Error(errData.error || errData.reply || 'API Error');
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply || 'No response generated.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            err instanceof Error ? `⚠️ ${err.message}` : '⚠️ MeghDoot service is currently unavailable.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const chatBody = (
    <div className="flex flex-col h-full bg-graphite-900 text-paper border border-violet/60 shadow-[0_0_30px_rgba(121,104,255,0.2)] select-none font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-graphite-950 border-b border-graphite-700">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-violet-deep border border-violet flex items-center justify-center text-violet shadow-[0_0_8px_rgba(121,104,255,0.5)]">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-sm tracking-wider text-paper">MEGHDOOT AI COPILOT</span>
              <span className="text-[8px] font-mono font-bold px-1.5 py-0.2 bg-chartreuse/20 text-chartreuse border border-chartreuse/40">
                ACTIVE
              </span>
            </div>
            <div className="text-[9px] text-smoke">
              CONTEXT:{' '}
              <b className="text-violet">
                {selectedDistrictId ? `DISTRICT // ${selectedDistrictId}` : 'NATIONAL TELEMETRY'}
              </b>
            </div>
          </div>
        </div>
        {mode === 'floating' && (
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-smoke hover:text-paper hover:bg-graphite-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Message List */}
      <div className="flex-1 p-3.5 space-y-3 overflow-y-auto max-h-[360px] text-xs">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] px-3.5 py-2.5 leading-relaxed shadow-sm font-sans ${
                msg.role === 'user'
                  ? 'bg-graphite-800 border border-chartreuse/40 text-paper font-mono text-[11px]'
                  : 'bg-graphite-950 border border-violet/40 text-paper-dim'
              }`}
            >
              <div className="whitespace-pre-line">{msg.content}</div>
            </div>
            <span className="text-[9px] text-smoke mt-1 px-1 font-mono">{msg.timestamp}</span>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 p-2.5 bg-graphite-950 border border-violet/40 w-fit">
            <Radio className="w-3.5 h-3.5 text-violet animate-signal-blink" />
            <span className="text-[10px] text-violet font-mono tracking-wider">
              SYNTHESIZING METEOROLOGICAL TELEMETRY...
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Chips */}
      <div className="px-3 py-1.5 border-t border-graphite-800 bg-graphite-950 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip)}
            className="shrink-0 px-2.5 py-1 bg-graphite-900 hover:bg-graphite-800 text-paper-dim hover:text-chartreuse text-[10px] font-mono border border-graphite-700 transition"
          >
            <Sparkles className="w-2.5 h-2.5 inline mr-1 text-violet" />
            {chip}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-graphite-700 bg-graphite-950 flex items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Query MeghDoot on rainfall risk, regime & mitigation..."
          className="flex-1 bg-graphite-900 border border-graphite-700 px-3 py-2 text-xs text-paper placeholder-smoke focus:outline-none focus:border-violet font-mono"
        />
        <button
          onClick={() => handleSend()}
          disabled={isLoading || !query.trim()}
          className="p-2 bg-violet hover:bg-violet/90 text-graphite-950 disabled:opacity-50 transition shadow-sm font-bold"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  if (mode === 'full') {
    return <div className="w-full h-full max-w-4xl mx-auto">{chatBody}</div>;
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 w-20 h-20 bg-graphite-900 border-2 border-violet text-violet flex items-center justify-center shadow-[0_0_28px_rgba(121,104,255,0.5)] hover:scale-105 active:scale-95 transition-all duration-150 group"
        title="Open MeghDoot AI Copilot"
      >
        <Bot className="w-10 h-10 group-hover:text-paper transition" />
        <span className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-chartreuse border border-graphite-950 animate-radar-pulse" />
      </button>

      {/* Slide-up Floating Modal */}
      {isOpen && (
        <div className="fixed bottom-28 right-6 z-50 w-[390px] h-[520px] animate-in fade-in slide-in-from-bottom-5 duration-150">
          {chatBody}
        </div>
      )}
    </>
  );
};
