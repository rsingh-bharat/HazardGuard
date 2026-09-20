'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ForecastSnapshot } from '../contracts/forecast';
import { useShareableState } from './useShareableState';

interface LiveForecastContextType {
  forecasts: ForecastSnapshot[];
  isLoading: boolean;
  error: string | null;
}

const LiveForecastContext = createContext<LiveForecastContextType>({
  forecasts: [],
  isLoading: true,
  error: null,
});

export const useLiveForecast = () => useContext(LiveForecastContext);

export const LiveForecastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeLeadHours } = useShareableState();
  const [forecasts, setForecasts] = useState<ForecastSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadForecast() {
      setIsLoading(true);
      setError(null);
      try {
        const lh = activeLeadHours === 0 ? 24 : activeLeadHours;
        const res = await fetch(`/api/forecast?leadHours=${lh}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setForecasts(json.data);
          } else {
            setForecasts([]);
          }
        } else {
          setError('Failed to fetch live forecast data');
          setForecasts([]);
        }
      } catch (err: any) {
        setError(err.message || 'Unknown error');
        setForecasts([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadForecast();
  }, [activeLeadHours]);

  return (
    <LiveForecastContext.Provider value={{ forecasts, isLoading, error }}>
      {children}
    </LiveForecastContext.Provider>
  );
};
