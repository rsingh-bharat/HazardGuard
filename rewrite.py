import re

with open('app/forecast/_ForecastPageClient.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace mockForecasts import with LiveForecastContext
content = re.sub(
    r'import mockForecasts from "@/data/mock/forecast.json";',
    'import { useLiveForecast } from "@/lib/state/LiveForecastContext";\nimport { OfficialBoundaryLayer } from "@/components/map/OfficialBoundaryLayer";\nimport { Layers } from "lucide-react";',
    content
)

# Replace the fetching logic and mock fallback with live forecast hook
old_logic = r'''  const \[forecasts, setForecasts\] = useState<ForecastSnapshot\[\]>\(
    mockForecasts as ForecastSnapshot\[\]
  \);.*?fetchForecasts\(\);\n  \}, \[activeLeadHours, selectedState\]\);'''

new_logic = '''  const { forecasts } = useLiveForecast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState<string>(selectedStateId || "ALL");
  const [showList, setShowList] = useState(true);
  const [showLayerPanel, setShowLayerPanel] = useState(false);'''

content = re.sub(old_logic, new_logic, content, flags=re.DOTALL)

# Sort the filteredForecasts
sort_logic = '''
  const sortedForecasts = [...filteredForecasts].sort(
    (a, b) => b.rainfall.correctedMm - a.rainfall.correctedMm
  );
  
  const selectedDistrict ='''

content = content.replace('  const selectedDistrict =', sort_logic)

# Replace the Map content
old_map = r'''        <Map
          activeLayers=\{activeLayers\}
          selectedDistrictId=\{selectedDistrictId\}
          onDistrictClick=\{\(id\) => updateState\(\{ selectedDistrictId: id \}\)\}
        >
          <RainfallLayer
            forecasts=\{forecasts\}
            visible=\{activeLayers.includes\("rainfall"\)\}
            showAnimation=\{showAnimation && activeLayers.includes\("rainfall"\)\}
            onDistrictClick=\{\(id\) => updateState\(\{ selectedDistrictId: id \}\)\}
          />
          <ProbabilityLayer
            forecasts=\{forecasts\}
            visible=\{activeLayers.includes\("heavyRainProbability"\)\}
          />
          <RegimeLayer
            forecasts=\{forecasts\}
            visible=\{activeLayers.includes\("weatherRegime"\)\}
          />
          <LayerControl activeLayers=\{activeLayers\} onToggleLayer=\{toggleLayer\} />
        </Map>'''

new_map = '''        <Map
          activeLayers={activeLayers}
          selectedDistrictId={selectedDistrictId}
        >
          <OfficialBoundaryLayer />
          <RainfallLayer
            forecasts={forecasts}
            visible={activeLayers.includes("rainfall")}
            showAnimation={showAnimation && activeLayers.includes("rainfall")}
            onDistrictClick={(id) => updateState({ selectedDistrictId: id })}
          />
          <ProbabilityLayer
            forecasts={forecasts}
            visible={activeLayers.includes("heavyRainProbability")}
          />
          <RegimeLayer
            forecasts={forecasts}
            visible={activeLayers.includes("weatherRegime")}
          />
        </Map>

        {showLayerPanel && (
          <LayerControl
            activeLayers={activeLayers}
            onToggleLayer={toggleLayer}
            bottomOffset={130}
            leftOffset={16}
          />
        )}

        <button
          className="absolute z-30 flex items-center gap-2 transition hover:brightness-110"
          style={{
            bottom: 76,
            left: 16,
            ...glassSoft,
            borderRadius: 14,
            padding: "9px 14px",
            color: showLayerPanel ? "#C8FF3D" : "rgba(255,255,255,.80)",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            border: showLayerPanel ? "1px solid rgba(200,255,61,.40)" : "1px solid rgba(255,255,255,.14)",
            background: showLayerPanel ? "rgba(200,255,61,.10)" : "rgba(255,255,255,.09)",
          }}
          onClick={() => setShowLayerPanel(!showLayerPanel)}
        >
          <Layers size={13} style={{ color: showLayerPanel ? "#C8FF3D" : "rgba(255,255,255,.70)" }} />
          LAYERS
          {showLayerPanel && <X size={11} />}
        </button>'''

content = re.sub(old_map, new_map, content, flags=re.DOTALL)

# Fix right side panel top and sorted array iteration
content = content.replace('top: 52', 'top: 72')
content = content.replace('filteredForecasts.map((d) => {', 'sortedForecasts.map((d) => {')
content = content.replace('showList ? 372 : 16', '80')

with open('app/forecast/_ForecastPageClient.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
