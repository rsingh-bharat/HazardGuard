// Adapted from 3DImpactTwin/src/data/cityProfiles.ts for Ronak (rsg-hazardguard)
// Import paths updated to use Ronak path aliases
import { CityProfile, CityId, ImpactSimulationResult, SeverityLevel } from "@/lib/contracts/impact";
import { defaultSimulation } from "./defaultSimulation";

export const CITY_PROFILES: Record<CityId, CityProfile> = {
  delhi: {
    id: "delhi",
    name: "Delhi NCR",
    tagline: "Yamuna Floodplain • Ring Road & ITO Low-Lying Arterial Basin (205m – 225m)",
    state: "DL",
    districtId: "DL_CENTRAL_YAMUNA",
    bbox: [77.20, 28.58, 77.28, 28.67],
    elevationRange: [205, 225],
    valleyDepressionCenter: [0.65, 0.45],
    cameraPresets: [
      { id: "perspective", label: "3D Orbit", description: "Bird's eye perspective of Delhi NCR basin", position: [90, 130, 150], lookAt: [0, 0, 0] },
      { id: "topdown", label: "Top-Down", description: "Orthographic aerial satellite view", position: [0, 240, 0.1], lookAt: [0, 0, 0] },
      { id: "street_ito", label: "Street: ITO Vikas Marg", description: "Eye-level view of flooded ITO junction & Vikas Marg underpass", isStreetView: true, position: [12, 2.2, 18], lookAt: [36, 2.5, -8] },
      { id: "street_pragati_tunnel", label: "Street: Pragati Maidan Tunnel", description: "Tunnel entryway submerged by overflowing drainage channels", isStreetView: true, position: [-8, 2.2, 36], lookAt: [16, 1.8, 24] },
      { id: "street_yamuna", label: "Street: Yamuna Floodplain Ring Road", description: "Embankment overtopping threatening Ring Road arterial", isStreetView: true, position: [48, 2.4, -24], lookAt: [30, 2.0, -44] }
    ],
    landmarks: [
      { id: "india_gate", name: "India Gate Monument", type: "monument", worldPos: [-22, 14], height: 14, width: 9, depth: 6, color: 0xd97706, details: "42m triumphal arch on Rajpath Kartavya Path axis" },
      { id: "bharat_mandapam", name: "Bharat Mandapam (Pragati Maidan)", type: "complex", worldPos: [-2, 16], height: 11, width: 16, depth: 14, color: 0x0284c7, details: "International convention center with elliptical glass facade & underground tunnel" },
      { id: "ito_vikas_minar", name: "Vikas Minar (DDA Headquarters Tower)", type: "skyscraper", worldPos: [8, 8], height: 28, width: 7, depth: 7, color: 0x38bdf8, details: "Historic 23-story government skyscraper at flooded ITO cross-section" },
      { id: "signature_bridge_pylon", name: "Yamuna Signature Bridge Pylon", type: "bridge", worldPos: [28, -24], height: 34, width: 4, depth: 4, color: 0xe0f2fe, details: "154m inclined steel pylon with stay cables spanning Yamuna River" },
      { id: "connaught_place_plaza", name: "Connaught Place Central Plaza", type: "complex", worldPos: [-26, -6], height: 6, width: 14, depth: 14, color: 0xf1f5f9, details: "Iconic colonial Georgian-style colonnade commercial hub" },
      { id: "supreme_court", name: "Supreme Court of India Complex", type: "complex", worldPos: [-12, 10], height: 10, width: 12, depth: 10, color: 0xd97706, details: "High-security judiciary zone adjacent to flooded Tilak Bridge" }
    ]
  },
  mumbai: {
    id: "mumbai",
    name: "Mumbai (Bombay)",
    tagline: "Mithi River Basin • BKC Financial Hub & Western Express Corridor (2m – 45m)",
    state: "MH",
    districtId: "MH_MUMBAI_SUBURBAN",
    bbox: [72.82, 19.01, 72.89, 19.10],
    elevationRange: [2, 45],
    valleyDepressionCenter: [0.55, 0.50],
    cameraPresets: [
      { id: "perspective", label: "3D Orbit", description: "Panoramic overview of South/Central Mumbai & BKC", position: [95, 130, 155], lookAt: [0, 0, 0] },
      { id: "topdown", label: "Top-Down", description: "Vertical orthographic view of island city & peninsula", position: [0, 240, 0.1], lookAt: [0, 0, 0] },
      { id: "street_bkc", label: "Street: BKC Financial Avenue", description: "Ground-level view of gleaming glass skyscrapers in Bandra-Kurla Complex", isStreetView: true, position: [8, 2.0, 10], lookAt: [36, 2.2, -16] },
      { id: "street_mithi", label: "Street: Mithi River Floodgate", description: "High-tide backflow at Mithi River culverts near airport runway", isStreetView: true, position: [32, 2.2, -12], lookAt: [48, 1.8, -36] },
      { id: "street_hindmata", label: "Street: Hindmata Waterlogged Underpass", description: "Notorious low-lying water bowl beneath flyover with stranded buses", isStreetView: true, position: [-20, 2.0, 40], lookAt: [-4, 1.8, 52] }
    ],
    landmarks: [
      { id: "bkc_diamond_bourse", name: "BKC Bharat Diamond Bourse & Towers", type: "skyscraper", worldPos: [6, 4], height: 32, width: 12, depth: 10, color: 0x38bdf8, details: "Interconnected mega-skyscrapers forming premier financial hub" },
      { id: "icici_tower_bkc", name: "ICICI & One BKC Glass Towers", type: "skyscraper", worldPos: [14, -2], height: 38, width: 8, depth: 8, color: 0x0284c7, details: "Curtain-wall reflective glass headquarters tower in flood-prone Kurla basin" },
      { id: "sealink_cable_tower", name: "Bandra-Worli Sea Link Pylon", type: "bridge", worldPos: [-32, 18], height: 36, width: 5, depth: 5, color: 0xf8fafc, details: "Iconic 126m twin concrete diamond pylons spanning Mahim Bay" },
      { id: "imperial_twin_towers", name: "The Imperial Twin Towers", type: "skyscraper", worldPos: [-20, 26], height: 48, width: 7, depth: 7, color: 0x60a5fa, details: "60-story supertall luxury residential skyscrapers overlooking coast" },
      { id: "antilia_tower", name: "Altamount Stepped High-Rise Tower", type: "skyscraper", worldPos: [-24, 20], height: 42, width: 8, depth: 9, color: 0x0ea5e9, details: "Ultra-distinctive cantilevered multi-tier architectural tower" },
      { id: "cst_heritage_block", name: "Chhatrapati Shivaji Terminus Heritage Complex", type: "complex", worldPos: [-18, 36], height: 14, width: 14, depth: 12, color: 0xd97706, details: "Victorian Gothic UNESCO heritage railway terminal" }
    ]
  },
  bengaluru: {
    id: "bengaluru",
    name: "Bengaluru Urban",
    tagline: "Koramangala & Bellandur Watershed Basin (865m – 925m)",
    state: "KA",
    districtId: "KA_BLR_URBAN",
    bbox: [77.580, 12.890, 77.695, 12.980],
    elevationRange: [865, 925],
    valleyDepressionCenter: [0.72, 0.65],
    cameraPresets: [
      { id: "perspective", label: "3D Orbit", description: "Bird's eye orbit view of Koramangala & Bellandur basin", position: [85, 125, 150], lookAt: [0, 0, 0] },
      { id: "topdown", label: "Top-Down", description: "High-altitude orthographic satellite basemap", position: [0, 240, 0.1], lookAt: [0, 0, 0] },
      { id: "street_silkboard", label: "Street: Silk Board Interchange", description: "Asphalt eye-level view of Outer Ring Road & Hosur flyover junction", isStreetView: true, position: [20, 2.0, 48], lookAt: [30, 2.2, 10] },
      { id: "street_koramangala", label: "Street: Koramangala 80ft Road", description: "Commercial tech avenue vulnerable to secondary valley runoff", isStreetView: true, position: [-24, 2.0, 24], lookAt: [-4, 2.1, 16] },
      { id: "street_bellandur", label: "Street: Bellandur Lake Outfall", description: "Primary stormwater drain inlet and lake weir discharge zone", isStreetView: true, position: [52, 2.2, -16], lookAt: [64, 1.8, -36] }
    ],
    landmarks: [
      { id: "ub_city_tower", name: "UB City Skyscraper Complex", type: "skyscraper", worldPos: [-28, -20], height: 35, width: 10, depth: 10, color: 0x38bdf8, details: "128m multi-tower luxury commercial pinnacle" },
      { id: "ecospace_business_park", name: "Rmz Ecospace & Bellandur Tech Park", type: "complex", worldPos: [18, -4], height: 22, width: 16, depth: 12, color: 0x0284c7, details: "Sprawling Outer Ring Road IT corridor directly bordering flood catchment" },
      { id: "embassy_tech_village", name: "Embassy TechVillage Glass Campus", type: "complex", worldPos: [24, 6], height: 24, width: 14, depth: 10, color: 0x38bdf8, details: "Multi-block tech enterprise park adjacent to Devarabeesanahalli lake overflow" },
      { id: "silk_board_flyover_tower", name: "Silk Board Metro & Flyover Complex", type: "interchange", worldPos: [10, 22], height: 15, width: 12, depth: 12, color: 0x64748b, details: "Multi-tier elevated road and metro transit interchange over flood-prone junction" },
      { id: "manipal_hospital_complex", name: "Manipal Hospital HAL Complex", type: "complex", worldPos: [-4, -18], height: 18, width: 12, depth: 10, color: 0xef4444, details: "600-bed apex tertiary trauma hospital on Old Airport Road corridor" }
    ]
  }
};

export function getCitySimulation(cityId: CityId, scenario = "P90"): ImpactSimulationResult {
  if (cityId === "bengaluru") {
    return defaultSimulation;
  }

  const base = defaultSimulation;

  const delhiRoads = [
    { road_id: "DEL_RING_ROAD_YAMUNA", name: "Ring Road (Yamuna Embankment Section)", road_type: "PRIMARY_ARTERIAL", importance: "CRITICAL", geometry: { type: "LineString", coordinates: [[77.230, 28.645],[77.245, 28.630],[77.250, 28.610],[77.255, 28.590]] as [number,number][] }, water_depth_m: 0.58, mean_depth_m: 0.42, inundated_fraction: 0.85, capacity_reduction_factor: 0.95, effective_capacity_ratio: 0.05, speed_reduction_pct: 95, status: "TOTAL_CLOSURE_RIVER_OVERTOPPING", severity: "CRITICAL" as const },
    { road_id: "DEL_ITO_VIKAS_MARG", name: "ITO Intersection & Vikas Marg Underpass", road_type: "MAJOR_ARTERIAL", importance: "CRITICAL", geometry: { type: "LineString", coordinates: [[77.235, 28.628],[77.248, 28.629],[77.265, 28.630]] as [number,number][] }, water_depth_m: 0.65, mean_depth_m: 0.48, inundated_fraction: 0.90, capacity_reduction_factor: 1.0, effective_capacity_ratio: 0.0, speed_reduction_pct: 100, status: "TOTAL_CLOSURE_SUBMERGED", severity: "CRITICAL" as const },
    { road_id: "DEL_PRAGATI_MAIDAN_TUNNEL", name: "Pragati Maidan Integrated Transit Tunnel", road_type: "EXPRESSWAY_TUNNEL", importance: "HIGH", geometry: { type: "LineString", coordinates: [[77.232, 28.618],[77.244, 28.619],[77.252, 28.620]] as [number,number][] }, water_depth_m: 0.52, mean_depth_m: 0.38, inundated_fraction: 0.80, capacity_reduction_factor: 0.95, effective_capacity_ratio: 0.05, speed_reduction_pct: 95, status: "INUNDATED_TUNNEL_SHUTDOWN", severity: "CRITICAL" as const },
    { road_id: "DEL_BARAPULLAH_ELEVATED", name: "Barapullah Elevated Phase II Corridor", road_type: "ELEVATED_FREEWAY", importance: "CRITICAL", geometry: { type: "LineString", coordinates: [[77.215, 28.585],[77.235, 28.588],[77.255, 28.592]] as [number,number][] }, water_depth_m: 0.08, mean_depth_m: 0.04, inundated_fraction: 0.15, capacity_reduction_factor: 0.20, effective_capacity_ratio: 0.80, speed_reduction_pct: 20, status: "ELEVATED_PASSABLE_DELAYS", severity: "WATCH" as const },
    { road_id: "DEL_MATHURA_ROAD_BHOGAL", name: "Mathura Road (Bhogal - Ashram Stretch)", road_type: "PRIMARY_ARTERIAL", importance: "HIGH", geometry: { type: "LineString", coordinates: [[77.240, 28.605],[77.245, 28.585],[77.250, 28.570]] as [number,number][] }, water_depth_m: 0.38, mean_depth_m: 0.26, inundated_fraction: 0.65, capacity_reduction_factor: 0.70, effective_capacity_ratio: 0.30, speed_reduction_pct: 70, status: "SEVERE_WATER_LOGGING", severity: "HIGH" as const }
  ];

  const mumbaiRoads = [
    { road_id: "MUM_WESTERN_EXPRESS", name: "Western Express Highway (Kalanagar - Santacruz)", road_type: "PRIMARY_FREEWAY", importance: "CRITICAL", geometry: { type: "LineString", coordinates: [[72.845, 19.045],[72.848, 19.065],[72.852, 19.085]] as [number,number][] }, water_depth_m: 0.48, mean_depth_m: 0.32, inundated_fraction: 0.75, capacity_reduction_factor: 0.90, effective_capacity_ratio: 0.10, speed_reduction_pct: 90, status: "TOTAL_GRIDLOCK_WATER_LOGGED", severity: "CRITICAL" as const },
    { road_id: "MUM_BKC_CONNECTOR", name: "BKC - Chunabhatti Elevated Connector & Avenue", road_type: "MAJOR_ARTERIAL", importance: "CRITICAL", geometry: { type: "LineString", coordinates: [[72.855, 19.060],[72.868, 19.062],[72.880, 19.055]] as [number,number][] }, water_depth_m: 0.54, mean_depth_m: 0.39, inundated_fraction: 0.85, capacity_reduction_factor: 0.95, effective_capacity_ratio: 0.05, speed_reduction_pct: 95, status: "MITHI_OVERFLOW_BLOCKAGE", severity: "CRITICAL" as const },
    { road_id: "MUM_HINDMATA_DADAR", name: "Dr. Babasaheb Ambedkar Road (Hindmata Underpass)", road_type: "PRIMARY_ARTERIAL", importance: "HIGH", geometry: { type: "LineString", coordinates: [[72.840, 19.010],[72.842, 19.022],[72.845, 19.035]] as [number,number][] }, water_depth_m: 0.72, mean_depth_m: 0.55, inundated_fraction: 0.95, capacity_reduction_factor: 1.0, effective_capacity_ratio: 0.0, speed_reduction_pct: 100, status: "COMPLETE_CLOSURE_SUBWAY_FULL", severity: "CRITICAL" as const },
    { road_id: "MUM_SV_ROAD_BANDRA", name: "Swami Vivekanand (SV) Road (Bandra - Khar)", road_type: "SECONDARY_ARTERIAL", importance: "HIGH", geometry: { type: "LineString", coordinates: [[72.835, 19.055],[72.838, 19.070],[72.840, 19.085]] as [number,number][] }, water_depth_m: 0.32, mean_depth_m: 0.22, inundated_fraction: 0.60, capacity_reduction_factor: 0.60, effective_capacity_ratio: 0.40, speed_reduction_pct: 60, status: "SEVERE_SLOWDOWN_WATER_ON_TRACK", severity: "HIGH" as const },
    { road_id: "MUM_SEALINK_CORRIDOR", name: "Bandra-Worli Sea Link Causeway Approach", road_type: "EXPRESSWAY_BRIDGE", importance: "CRITICAL", geometry: { type: "LineString", coordinates: [[72.818, 19.030],[72.825, 19.045],[72.835, 19.052]] as [number,number][] }, water_depth_m: 0.05, mean_depth_m: 0.02, inundated_fraction: 0.10, capacity_reduction_factor: 0.15, effective_capacity_ratio: 0.85, speed_reduction_pct: 15, status: "OPEN_GALE_WINDS_WARNING", severity: "WATCH" as const }
  ];

  const delhiHospitals = [
    { facility_id: "DEL_AIIMS_TRAUMA", name: "AIIMS New Delhi Apex Trauma Center", type: "TERTIARY_TRAUMA_CENTER", coordinates: [77.215, 28.570] as [number, number], direct_depth_m: 0.04, access_route_depth_m: 0.38, access_risk_level: "HIGH" as const, severity: "HIGH" as const, status: "RING_ROAD_FEEDER_COMPROMISED" },
    { facility_id: "DEL_LNJP_HOSPITAL", name: "Lok Nayak Jai Prakash (LNJP) Civil Hospital", type: "GOVERNMENT_APEX_HOSPITAL", coordinates: [77.240, 28.638] as [number, number], direct_depth_m: 0.42, access_route_depth_m: 0.65, access_risk_level: "CRITICAL" as const, severity: "CRITICAL" as const, status: "ITO_APPROACH_IMPASSABLE" },
    { facility_id: "DEL_SAFDARJUNG", name: "VMMC & Safdarjung Hospital", type: "CENTRAL_REFERRAL_CENTER", coordinates: [77.208, 28.572] as [number, number], direct_depth_m: 0.02, access_route_depth_m: 0.18, access_risk_level: "WATCH" as const, severity: "WATCH" as const, status: "OPERATIONAL_MODERATE_DELAYS" }
  ];

  const mumbaiHospitals = [
    { facility_id: "MUM_KEM_PAREL", name: "KEM Hospital & Seth GS Medical College", type: "APEX_MUNICIPAL_TERTIARY", coordinates: [72.842, 19.005] as [number, number], direct_depth_m: 0.35, access_route_depth_m: 0.70, access_risk_level: "CRITICAL" as const, severity: "CRITICAL" as const, status: "HINDMATA_FEEDER_CUT_OFF" },
    { facility_id: "MUM_LILAVATI_BANDRA", name: "Lilavati Hospital & Research Centre", type: "PRIVATE_TERTIARY_HOSPITAL", coordinates: [72.828, 19.050] as [number, number], direct_depth_m: 0.06, access_route_depth_m: 0.45, access_risk_level: "HIGH" as const, severity: "HIGH" as const, status: "WEH_RECLAMATION_WATER_LOGGED" },
    { facility_id: "MUM_SION_HOSPITAL", name: "Lokmanya Tilak Municipal General Hospital (Sion)", type: "TERTIARY_TRAUMA_CENTER", coordinates: [72.862, 19.038] as [number, number], direct_depth_m: 0.48, access_route_depth_m: 0.58, access_risk_level: "CRITICAL" as const, severity: "CRITICAL" as const, status: "GROUND_FLOOR_SUMP_INUNDATION" }
  ];

  const delhiDrainage = { utilizations: { SWD_YAMUNA_MAIN_EMBANKMENT: 1.18, SWD_NAJAFGARH_TRUNK_INLET: 1.05, SWD_BARAPULLAH_NALLAH: 0.94, SWD_SEN_NURSING_HOME_DRAIN: 1.25 }, surcharges: {}, overflow_zones: [{ zone_id: "SWD_YAMUNA_MAIN_EMBANKMENT", name: "Yamuna River Central Embankment Outfall", utilization_ratio: 1.18, severity: "CRITICAL", risk_label: "RIVER_OVERFLOW_SURCHARGE_BREACH" }, { zone_id: "SWD_SEN_NURSING_HOME_DRAIN", name: "Sen Nursing Home Drain (ITO Pumping Station)", utilization_ratio: 1.25, severity: "CRITICAL", risk_label: "PUMP_OVERWHELMED_BACKFLOW" }], max_utilization: 1.25, stressed_zones_count: 2 };
  const mumbaiDrainage = { utilizations: { SWD_MITHI_RIVER_MAHIM_CREEK: 1.32, SWD_HINDMATA_STORM_HOLDING: 1.15, SWD_MILAN_SUBWAY_PUMP_DRAIN: 1.22, SWD_IRLA_NALLAH_OUTFALL: 0.95 }, surcharges: {}, overflow_zones: [{ zone_id: "SWD_MITHI_RIVER_MAHIM_CREEK", name: "Mithi River Tidal Outfall (Mahim Creek)", utilization_ratio: 1.32, severity: "CRITICAL", risk_label: "HIGH_TIDE_BACKFLOW_BREACH" }, { zone_id: "SWD_MILAN_SUBWAY_PUMP_DRAIN", name: "Milan Subway Sump & Storm Outfall", utilization_ratio: 1.22, severity: "CRITICAL", risk_label: "UNDERPASS_BASIN_OVERFLOW" }], max_utilization: 1.32, stressed_zones_count: 2 };

  const activeRoads = cityId === "delhi" ? delhiRoads : mumbaiRoads;
  const activeHospitals = cityId === "delhi" ? delhiHospitals : mumbaiHospitals;
  const activeDrainage = cityId === "delhi" ? delhiDrainage : mumbaiDrainage;

  const newTimeline = base.timeline.map((step, idx) => {
    const scale = idx / (base.timeline.length - 1);
    return {
      ...step,
      drainage: { ...activeDrainage, utilizations: Object.fromEntries(Object.entries(activeDrainage.utilizations).map(([k, v]) => [k, Number((v * (0.2 + 0.8 * scale)).toFixed(2))])) },
      roads: {
        road_evaluations: activeRoads.map(r => { const sev: SeverityLevel = scale < 0.3 ? "NORMAL" : scale < 0.6 ? (r.severity === "CRITICAL" ? "HIGH" : r.severity) : r.severity; return { ...r, water_depth_m: Number((r.water_depth_m * scale).toFixed(2)), severity: sev }; }),
        bottlenecks: activeRoads.filter(r => r.capacity_reduction_factor >= 0.7).map(r => ({ road_id: r.road_id, name: r.name, choke_severity: r.severity, water_depth_m: Number((r.water_depth_m * scale).toFixed(2)), capacity_loss_pct: r.speed_reduction_pct })),
        affected_roads_count: scale > 0.3 ? activeRoads.length : 1
      },
      exposure: { ...step.exposure, hospitals: activeHospitals.map(h => ({ ...h, direct_depth_m: Number(((h.direct_depth_m || 0.1) * scale).toFixed(2)), access_route_depth_m: Number(((h.access_route_depth_m || 0.3) * scale).toFixed(2)), severity: scale > 0.5 ? h.severity : ("WATCH" as const) })) },
      warnings: cityId === "delhi" ? [{ id: `del_warn_1_${idx}`, type: "RIVER_OVERFLOW", severity: "CRITICAL" as const, title: "Yamuna River Approaching Danger Mark (205.53m)", message: "Embankment overtopping warning issued for Ring Road and Monastery Market sector.", timestamp: step.timestamp }, { id: `del_warn_2_${idx}`, type: "TUNNEL_CLOSURE", severity: "CRITICAL" as const, title: "Pragati Maidan Integrated Tunnel Inundated", message: "Water accumulation exceeding 0.50m. Traffic police ordered complete vehicular suspension.", timestamp: step.timestamp }] : [{ id: `mum_warn_1_${idx}`, type: "RIVER_BREACH", severity: "CRITICAL" as const, title: "Mithi River High-Tide Surge Backflow", message: "4.8m high tide coinciding with heavy cloudburst causing BKC and Kurla inundation.", timestamp: step.timestamp }, { id: `mum_warn_2_${idx}`, type: "SUBWAY_INUNDATION", severity: "CRITICAL" as const, title: "Hindmata & Milan Subway Underpasses Submerged", message: "Storm pump capacity overwhelmed. Complete arterial diversion through elevated flyovers.", timestamp: step.timestamp }]
    };
  });

  return { ...base, simulation_id: `sim_${cityId.toUpperCase()}_${scenario}_2026`, forecast_id: `FC-2026-${cityId.toUpperCase()}-0902`, provenance: { ...base.provenance, forecast_id: `FC-2026-${cityId.toUpperCase()}-0902`, simulation_id: `sim_${cityId.toUpperCase()}_${scenario}_2026`, terrain_version: `v1.4-${cityId.toUpperCase()}-HYDRO-DEM` }, timeline: newTimeline };
}
