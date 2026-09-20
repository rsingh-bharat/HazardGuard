'use client';
import { useLiveForecast } from '@/lib/state/LiveForecastContext';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  CloudLightning,
  BarChart3,
  Cpu,
  FileText,
  Bell,
  X,
  ShieldAlert,
  LogOut,
  UserPlus,
} from 'lucide-react';

// ─── Route definitions ────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { href: '/',             label: 'Command Center',        icon: Activity       },
  { href: '/forecast',     label: 'Forecast Intelligence', icon: CloudLightning },
  { href: '/verification', label: 'Model Verification',    icon: BarChart3      },
  { href: '/impact',       label: '3D Impact Twin',        icon: Cpu            },
  { href: '/reports',      label: 'Official Reports',      icon: FileText       },
] as const;

// ─── Pip geometry constants ───────────────────────────────────────────────────
const SIDEBAR_PT = 22;   // padding-top of the flex column
const LOGO_H     = 40;   // logo element height
const NAV_MT     = 57;   // margin-top of the nav group below logo
const NAV_GAP    = 43;   // centre-to-centre distance between icon items
const ICON_H     = 23;   // icon wrapper height
const PIP_H      = 29;   // pip height

/** Top offset (px) for the active pip at nav item index `idx` */
function pipTop(idx: number): number {
  return SIDEBAR_PT + LOGO_H + NAV_MT + idx * NAV_GAP + ICON_H / 2 - PIP_H / 2;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [tooltip, setTooltip]               = useState<string | null>(null);
  const [tooltipY, setTooltipY]             = useState(0);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const { forecasts } = useLiveForecast();
  
  const activeAlerts = forecasts.filter(f => 
    f.rainfall.alertLevel === 'RED' || f.rainfall.alertLevel === 'ORANGE'
  );

  // Determine which nav item is active (-1 = none matched)
  const activeIdx = NAV_ITEMS.findIndex((item) =>
    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
  );

  function handleMouseEnter(label: string, idx: number) {
    const el = itemRefs.current[idx];
    if (el) {
      const rect = el.getBoundingClientRect();
      setTooltipY(rect.top + rect.height / 2);
    }
    setTooltip(label);
  }

  function handleMouseLeave() {
    setTooltip(null);
  }

  return (
    <>
      {/* ── Aurora Command Rail Sidebar ──────────────────────────────────── */}
      <aside
        className="glass-sidebar"
        style={{
          position:      'fixed',
          left:          16,
          top:           14,
          bottom:        7,
          width:         72,
          borderRadius:  26,
          zIndex:        50,
          display:       'flex',
          flexDirection: 'column',
          alignItems:    'center',
          paddingTop:    SIDEBAR_PT,
          paddingBottom: 52,
          animation:     'slideL 0.92s cubic-bezier(.16,1,.3,1) 0.05s both',
          overflow:      'visible',
        }}
      >
        {/* Active pip */}
        {activeIdx >= 0 && (
          <span
            aria-hidden
            style={{
              position:        'absolute',
              left:            -2,
              top:             pipTop(activeIdx),
              width:           5,
              height:          PIP_H,
              borderRadius:    3,
              background:      '#ffffff',
              boxShadow:       '0 0 10px rgba(255,255,255,.55)',
              animation:       'growY 0.50s cubic-bezier(.16,1,.3,1) 0.68s both',
              transformOrigin: 'top',
              transition:      'top 0.38s cubic-bezier(.16,1,.3,1)',
            }}
          />
        )}

        {/* Logo */}
        <Link
          href="/"
          aria-label="HazardGuard – home"
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            width:          40,
            height:         LOGO_H,
            flexShrink:     0,
            animation:      'popIn 0.70s cubic-bezier(.16,1,.3,1) 0.26s both',
          }}
        >
          <svg
            width="34" height="34" viewBox="0 0 34 34"
            fill="none" xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M17 2L4 7.5V17C4 24.18 9.56 30.9 17 32.5C24.44 30.9 30 24.18 30 17V7.5L17 2Z"
              fill="rgba(255,255,255,0.12)"
              stroke="rgba(255,255,255,0.60)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M10 19c.8-1.6 1.6-2.4 2.4-2s1.2 2 2 2 1.6-2 2.4-2 1.2 2 2 2 1.6-1.6 2.4-2"
              stroke="#ffffff"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="17" cy="13" r="2.2" fill="#ffffff" opacity="0.90" />
          </svg>
        </Link>

        {/* Nav icons */}
        <nav
          aria-label="Main navigation"
          style={{
            marginTop:     NAV_MT,
            display:       'flex',
            flexDirection: 'column',
            alignItems:    'center',
            gap:           NAV_GAP - ICON_H,
          }}
        >
          {NAV_ITEMS.map((item, i) => {
            const Icon     = item.icon;
            const isActive = i === activeIdx;
            const delay    = 0.36 + i * 0.04;
            return (
              <Link
                key={item.href}
                href={item.href}
                ref={(el) => { itemRefs.current[i] = el; }}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                onMouseEnter={() => handleMouseEnter(item.label, i)}
                onMouseLeave={handleMouseLeave}
                className="hover:opacity-100"
                style={{
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  width:          ICON_H,
                  height:         ICON_H,
                  opacity:        isActive ? 1 : 0.82,
                  transition:     'opacity 0.18s ease',
                  animation:      `riseIn 0.55s cubic-bezier(.16,1,.3,1) ${delay}s both`,
                }}
              >
                <Icon
                  width={ICON_H}
                  height={ICON_H}
                  color="#ffffff"
                  strokeWidth={isActive ? 2.0 : 1.6}
                />
              </Link>
            );
          })}
        </nav>

        {/* Bottom utilities */}
        <div
          style={{
            marginTop:     'auto',
            display:       'flex',
            flexDirection: 'column',
            alignItems:    'center',
            gap:           14,
          }}
        >
          {/* Registration */}
          <Link
            href="/register"
            ref={(el) => { itemRefs.current[NAV_ITEMS.length] = el as any; }}
            aria-label="Registration"
            onMouseEnter={() => handleMouseEnter('Registration', NAV_ITEMS.length)}
            onFocus={() => handleMouseEnter('Registration', NAV_ITEMS.length)}
            onMouseLeave={handleMouseLeave}
            onBlur={handleMouseLeave}
            className="glass-tool"
            style={{
              position:       'relative',
              width:          40,
              height:         40,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              borderRadius:   '50%',
              background:     pathname.startsWith('/register') ? 'rgba(255,255,255,0.12)' : 'transparent',
              opacity:        pathname.startsWith('/register') ? 1 : 0.82,
              transition:     'all 0.2s ease',
            }}
          >
            {pathname.startsWith('/register') && (
              <span
                aria-hidden
                style={{
                  position:        'absolute',
                  left:            -18,
                  width:           5,
                  height:          PIP_H,
                  borderRadius:    3,
                  background:      '#ffffff',
                  boxShadow:       '0 0 10px rgba(255,255,255,.55)',
                  animation:       'growY 0.50s cubic-bezier(.16,1,.3,1) 0.68s both',
                  transformOrigin: 'top',
                }}
              />
            )}
            <UserPlus
              width={19}
              height={19}
              color="#ffffff"
              strokeWidth={pathname.startsWith('/register') ? 2.0 : 1.6}
            />
          </Link>
          {/* Alert bell */}
          <button
            onClick={() => setShowAlertModal(true)}
            aria-label="Active disaster alerts"
            className="glass-tool"
            style={{
              width:          40,
              height:         40,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              cursor:         'pointer',
              border:         'none',
              position:       'relative',
              transition:     'opacity 0.18s ease',
            }}
          >
            <Bell width={18} height={18} color="#ffffff" strokeWidth={1.6} />
            {activeAlerts.length > 0 && (
              <span
                aria-hidden
                style={{
                  position:     'absolute',
                  top:          7,
                  right:        7,
                  width:        7,
                  height:       7,
                  borderRadius: '50%',
                  background:   '#FF3B30',
                  animation:    'radar-pulse 1.4s ease-in-out infinite',
                }}
              />
            )}
          </button>
        </div>
      </aside>

      {/* Tooltip chip */}
      {tooltip && (
        <div
          aria-hidden
          className="glass-chip"
          style={{
            position:      'fixed',
            left:          104,
            top:           tooltipY,
            transform:     'translateY(-50%)',
            zIndex:        60,
            padding:       '5px 12px',
            borderRadius:  10,
            fontSize:      12,
            fontWeight:    500,
            color:         '#ffffff',
            whiteSpace:    'nowrap',
            pointerEvents: 'none',
            animation:     'riseIn 0.22s ease both',
          }}
        >
          {tooltip}
        </div>
      )}

      {/* Alert modal */}
      {showAlertModal && (
        <div
          style={{
            position:             'fixed',
            inset:                0,
            zIndex:               100,
            display:              'flex',
            alignItems:           'center',
            justifyContent:       'center',
            background:           'rgba(0,0,0,0.40)',
            backdropFilter:       'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            padding:              16,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAlertModal(false); }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth:     448,
              width:        '100%',
              borderRadius: 20,
              overflow:     'hidden',
              animation:    'riseIn 0.28s cubic-bezier(.16,1,.3,1) both',
            }}
          >
            {/* Header */}
            <div style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              padding:        '14px 18px',
              borderBottom:   '1px solid rgba(255,255,255,0.15)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldAlert width={18} height={18} color="#FF3B30" />
                <span style={{ color: '#ffffff', fontWeight: 600, fontSize: 13, letterSpacing: '0.04em' }}>
                  PRIORITY DISASTER ALERTS{' '}
                  <span style={{ opacity: 0.55 }}>// {activeAlerts.length} ACTIVE</span>
                </span>
              </div>
              <button
                onClick={() => setShowAlertModal(false)}
                aria-label="Close alerts"
                className="hover:opacity-100"
                style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.65, display: 'flex', transition: 'opacity 0.15s ease' }}
              >
                <X width={18} height={18} color="#ffffff" />
              </button>
            </div>

            {/* Alert rows */}
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '60vh', overflowY: 'auto' }}>
              {activeAlerts.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                  No active priority alerts at this time.
                </div>
              ) : (
                activeAlerts.map(alert => {
                  const isRed = alert.rainfall.alertLevel === 'RED';
                  const ac = isRed ? '#FF3B30' : '#FFB347';
                  const bg = isRed ? 'rgba(255,59,48,0.20)' : 'rgba(255,179,71,0.20)';
                  const bgBadge = isRed ? 'rgba(255,59,48,0.25)' : 'rgba(255,179,71,0.25)';
                  
                  return (
                    <div key={alert.geography.districtId} style={{ padding: '10px 14px', borderRadius: 12, background: bg, borderLeft: "4px solid " + ac }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: ac, fontWeight: 700, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                          {alert.geography.districtName}, {alert.geography.stateName}
                        </span>
                        <span style={{ background: bgBadge, color: ac, fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 6, letterSpacing: '0.06em' }}>
                          {alert.rainfall.alertLevel} ALERT · {alert.rainfall.correctedMm.toFixed(1)} MM
                        </span>
                      </div>
                      <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 11, margin: 0, fontFamily: 'monospace' }}>
                        {alert.rainfall?.correctionMethod || 'High risk precipitation crossing operational threshold.'}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};



