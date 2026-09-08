'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { LayerId } from '../layers/layerRegistry';
import { ScenarioType } from '../contracts/impact';

export interface SharedState {
  selectedDistrictId: string | null;
  selectedStateId: string | null;
  activeForecastId: string;
  activeLeadHours: 0 | 6 | 12 | 24 | 48 | 72;
  activeLayers: LayerId[];
  activeScenario: ScenarioType;
  showAnimation: boolean;
}

export function useShareableState() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const state: SharedState = useMemo(() => {
    const districtId = searchParams.get('districtId');
    const stateId = searchParams.get('stateId');
    const forecastId = searchParams.get('forecastId') || 'forecast_20260901_00z';
    const leadHoursRaw = searchParams.get('leadHours');
    const leadHours = (leadHoursRaw ? parseInt(leadHoursRaw, 10) : 24) as 0 | 6 | 12 | 24 | 48 | 72;
    const layersRaw = searchParams.get('layers');
    const activeLayers: LayerId[] = layersRaw
      ? (layersRaw.split(',') as LayerId[])
      : (['rainfall'] as LayerId[]);
    const scenario = (searchParams.get('scenario') as ScenarioType) || 'P50';
    const showAnimation = searchParams.get('anim') === '1';

    return {
      selectedDistrictId: districtId,
      selectedStateId: stateId,
      activeForecastId: forecastId,
      activeLeadHours: [0, 6, 12, 24, 48, 72].includes(leadHours) ? leadHours : 24,
      activeLayers,
      activeScenario: scenario,
      showAnimation,
    };
  }, [searchParams]);

  const updateState = useCallback(
    (updates: Partial<SharedState>) => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));

      if (updates.selectedDistrictId !== undefined) {
        if (updates.selectedDistrictId) current.set('districtId', updates.selectedDistrictId);
        else current.delete('districtId');
      }

      if (updates.selectedStateId !== undefined) {
        if (updates.selectedStateId) current.set('stateId', updates.selectedStateId);
        else current.delete('stateId');
      }

      if (updates.activeForecastId !== undefined) {
        current.set('forecastId', updates.activeForecastId);
      }

      if (updates.activeLeadHours !== undefined) {
        current.set('leadHours', updates.activeLeadHours.toString());
      }

      if (updates.activeLayers !== undefined) {
        if (updates.activeLayers.length > 0) current.set('layers', updates.activeLayers.join(','));
        else current.delete('layers');
      }

      if (updates.activeScenario !== undefined) {
        current.set('scenario', updates.activeScenario);
      }

      if (updates.showAnimation !== undefined) {
        if (updates.showAnimation) current.set('anim', '1');
        else current.delete('anim');
      }

      const search = current.toString();
      const query = search ? `?${search}` : '';
      router.replace(`${pathname}${query}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  const toggleLayer = useCallback(
    (layerId: LayerId) => {
      const currentLayers = state.activeLayers;
      const nextLayers = currentLayers.includes(layerId)
        ? currentLayers.filter((l) => l !== layerId)
        : [...currentLayers, layerId];
      updateState({ activeLayers: nextLayers });
    },
    [state.activeLayers, updateState]
  );

  return {
    ...state,
    updateState,
    toggleLayer,
  };
}
