'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CloudLightning, BarChart3, ShieldAlert, FileText, Cpu, Bell, Activity, X, UserPlus } from 'lucide-react';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [showAlertModal, setShowAlertModal] = useState(false);

  const navLinks = [
    { href: '/', label: 'COMMAND CENTER', icon: Activity },
    { href: '/forecast', label: 'FORECAST INTELLIGENCE', icon: CloudLightning },
    { href: '/verification', label: 'MODEL VERIFICATION', icon: BarChart3 },
    { href: '/impact', label: '3D IMPACT TWIN', icon: Cpu },
    { href: '/reports', label: 'OFFICIAL REPORTS', icon: FileText },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-14 bg-graphite-950/95 backdrop-blur-md border-b border-graphite-700 z-50 flex items-center justify-between px-5 select-none">
        {/* Brand Logo & Telemetry */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-none bg-graphite-900 border border-signal-red flex items-center justify-center text-signal-red shadow-[0_0_12px_rgba(255,59,48,0.3)] group-hover:bg-signal-red group-hover:text-graphite-950 transition-all duration-150">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-2xl tracking-wider text-paper leading-none">
                HAZARDGUARD
              </span>
              <span className="text-[8px] font-mono text-smoke tracking-widest uppercase -mt-0.5">
                PRECIPITATION &amp; IMPACT COMMAND DECK
              </span>
            </div>
          </Link>

          {/* Navigation Items (Mission Rail Style) */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono font-semibold tracking-wider transition-all duration-150 ${
                    isActive
                      ? 'bg-graphite-800 text-chartreuse border-b-2 border-chartreuse shadow-[inset_0_-1px_0_rgba(200,255,61,0.5)]'
                      : 'text-paper-dim hover:text-paper hover:bg-graphite-900'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-chartreuse' : 'text-smoke'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Utility Bar */}
        <div className="flex items-center gap-3">
          {/* Live Telemetry Pill */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-graphite-900 border border-chartreuse/40 text-[10px] font-mono text-chartreuse font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-chartreuse animate-radar-pulse" />
            <span className="tracking-wider">LIVE · IMD/NWP 72H</span>
          </div>

          {/* Alert Notification Button */}
          <button
            onClick={() => setShowAlertModal(true)}
            className="relative p-2 bg-graphite-900 hover:bg-graphite-800 border border-graphite-700 text-paper-dim hover:text-signal-red transition-all duration-150"
            title="Active Disaster Alerts"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-signal-red animate-ping" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-signal-red" />
          </button>

          {/* Register Official Button */}
          <Link
            href="/register"
            className={`px-3 py-1.5 flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-wider transition-all duration-150 border ${
              pathname === '/register'
                ? 'bg-chartreuse text-graphite-950 border-chartreuse'
                : 'bg-graphite-900 hover:bg-graphite-800 border-graphite-700 text-paper-dim hover:text-chartreuse hover:border-chartreuse/60'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>REGISTER</span>
          </Link>
        </div>
      </header>

      {/* Tactical Alert Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-graphite-950/80 backdrop-blur-sm p-4">
          <div className="bg-graphite-900 border-2 border-signal-red max-w-md w-full shadow-[0_0_30px_rgba(255,59,48,0.25)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-4 py-3 bg-signal-red text-graphite-950 font-display font-bold text-base tracking-wider">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                <span>PRIORITY DISASTER ALERTS // 4 ACTIVE</span>
              </div>
              <button
                onClick={() => setShowAlertModal(false)}
                className="text-graphite-950 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-2.5 text-xs font-mono bg-graphite-950">
              <div className="p-3 bg-graphite-900 border-l-4 border-signal-red text-paper space-y-1">
                <div className="font-bold text-signal-red flex items-center justify-between">
                  <span>PURI, ODISHA</span>
                  <span className="bg-signal-red/20 text-signal-red px-1.5 py-0.5 text-[10px]">RED ALERT · 245.8 MM</span>
                </div>
                <div className="text-[11px] text-paper-dim">
                  Deep Depression landfall imminent. Mahanadi Delta coastal surge threat.
                </div>
              </div>

              <div className="p-3 bg-graphite-900 border-l-4 border-signal-red text-paper space-y-1">
                <div className="font-bold text-signal-red flex items-center justify-between">
                  <span>WAYANAD, KERALA</span>
                  <span className="bg-signal-red/20 text-signal-red px-1.5 py-0.5 text-[10px]">RED ALERT · 228.6 MM</span>
                </div>
                <div className="text-[11px] text-paper-dim">
                  Western Ghats crest orographic deluge. Kabini catchment flash runoff.
                </div>
              </div>

              <div className="p-3 bg-graphite-900 border-l-4 border-signal-red text-paper space-y-1">
                <div className="font-bold text-signal-red flex items-center justify-between">
                  <span>VALSAD, GUJARAT</span>
                  <span className="bg-signal-red/20 text-signal-red px-1.5 py-0.5 text-[10px]">RED ALERT · 234.0 MM</span>
                </div>
                <div className="text-[11px] text-paper-dim">
                  Offshore coastal convergence zone. Daman Ganga river watch active.
                </div>
              </div>

              <div className="p-3 bg-graphite-900 border-l-4 border-amber text-paper space-y-1">
                <div className="font-bold text-amber flex items-center justify-between">
                  <span>PUNE, MAHARASHTRA</span>
                  <span className="bg-amber/20 text-amber px-1.5 py-0.5 text-[10px]">ORANGE ALERT · 143.0 MM</span>
                </div>
                <div className="text-[11px] text-paper-dim">
                  Catchment spillover into Mutha/Mula channels. Inundation modeling active.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
