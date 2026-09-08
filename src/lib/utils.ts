import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRainfall(mm: number): string {
  return `${mm.toFixed(1)} mm`;
}

export function formatPercentage(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export function getAlertBadgeClass(alertLevel: string): string {
  switch (alertLevel) {
    case 'RED':
      return 'bg-signal-red/20 text-signal-red border-signal-red/40';
    case 'ORANGE':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    case 'YELLOW':
      return 'bg-amber-300/20 text-amber-300 border-amber-300/40';
    case 'GREEN':
    default:
      return 'bg-chartreuse/20 text-chartreuse border-chartreuse/40';
  }
}

export function getAlertTextClass(alertLevel: string): string {
  switch (alertLevel) {
    case 'RED':
      return 'text-signal-red';
    case 'ORANGE':
      return 'text-amber-400';
    case 'YELLOW':
      return 'text-amber-300';
    case 'GREEN':
    default:
      return 'text-chartreuse';
  }
}

export function getRegimeDisplayName(regime: string): string {
  switch (regime) {
    case 'ACTIVE_MONSOON':
      return 'Active Monsoon Trough';
    case 'BREAK_MONSOON':
      return 'Break Monsoon Phase';
    case 'MONSOON_DEPRESSION':
      return 'Monsoon Depression';
    case 'OROGRAPHIC':
      return 'Orographic Ghats Forcing';
    case 'COASTAL_CONVECTION':
      return 'Coastal Convective Off-shore';
    case 'WESTERN_DISTURBANCE':
      return 'Western Disturbance Interaction';
    default:
      return regime.replace(/_/g, ' ');
  }
}
