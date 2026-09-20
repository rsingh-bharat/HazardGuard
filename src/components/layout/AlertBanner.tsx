'use client';

import React, { useState } from 'react';
import { ChevronRight, X } from 'lucide-react';
import Link from 'next/link';

import { useLiveForecast } from '@/lib/state/LiveForecastContext';

export const AlertBanner: React.FC = () => {
  const [isDismissed, setIsDismissed] = useState(false);
  const { forecasts } = useLiveForecast();
  
  const redAlerts = forecasts.filter(f => f.rainfall.alertLevel === 'RED');

  if (isDismissed || redAlerts.length === 0) return null;
  
  const alertLocations = redAlerts.map(r => `${r.geography.districtName} (${r.geography.stateName})`).join(', ');

  return (
    <div
      style={{
        position:             'fixed',
        top:                  0,
        left:                 104,
        right:                0,
        zIndex:               40,
        display:              'flex',
        alignItems:           'center',
        justifyContent:       'space-between',
        padding:              '8px 16px',
        background:           'rgba(255,59,48,0.15)',
        borderBottom:         '1px solid rgba(255,59,48,0.30)',
        backdropFilter:       'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Left: pulse dot + alert text */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
        {/* Pulsing red dot */}
        <span
          aria-hidden
          style={{ position: 'relative', flexShrink: 0, width: 8, height: 8, display: 'inline-flex' }}
        >
          <span
            style={{
              position:     'absolute',
              inset:        0,
              borderRadius: '50%',
              background:   '#FF3B30',
              opacity:      0.7,
              animation:    'radar-pulse 1.4s ease-in-out infinite',
            }}
          />
          <span
            style={{
              position:     'relative',
              display:      'inline-flex',
              borderRadius: '50%',
              width:        8,
              height:       8,
              background:   '#FF3B30',
            }}
          />
        </span>

        {/* Label */}
        <span style={{
          color:         'rgba(255,255,255,0.93)',
          fontSize:      12,
          fontFamily:    'Inter, -apple-system, sans-serif',
          fontWeight:    600,
          letterSpacing: '0.04em',
          whiteSpace:    'nowrap',
          flexShrink:    0,
        }}>
          RED ALERT ACTIVE:
        </span>

        {/* Body text */}
        <span style={{
          color:        'rgba(255,255,255,0.70)',
          fontSize:     12,
          fontFamily:   'Inter, -apple-system, sans-serif',
          overflow:     'hidden',
          textOverflow: 'ellipsis',
          whiteSpace:   'nowrap',
        }}>
          Extremely heavy precipitation detected across{' '}
          <strong style={{ color: 'rgba(255,255,255,0.93)', fontWeight: 600 }}>
            {alertLocations}
          </strong>
        </span>
      </div>

      {/* Right: link + dismiss */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, marginLeft: 12 }}>
        <Link
          href="/forecast"
          style={{
            display:        'flex',
            alignItems:     'center',
            gap:            3,
            fontSize:       11,
            fontWeight:     600,
            color:          'rgba(255,255,255,0.80)',
            textDecoration: 'none',
            letterSpacing:  '0.05em',
            whiteSpace:     'nowrap',
            transition:     'color 0.15s ease',
          }}
          className="hover:text-white"
        >
          OPERATIONAL TELEMETRY
          <ChevronRight width={12} height={12} />
        </Link>

        <button
          onClick={() => setIsDismissed(true)}
          aria-label="Acknowledge and dismiss alert"
          style={{
            background: 'none',
            border:     'none',
            cursor:     'pointer',
            opacity:    0.60,
            display:    'flex',
            alignItems: 'center',
            padding:    2,
            transition: 'opacity 0.15s ease',
          }}
          className="hover:opacity-100"
        >
          <X width={14} height={14} color="#ffffff" />
        </button>
      </div>
    </div>
  );
};
