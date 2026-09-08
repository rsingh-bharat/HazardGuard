import React, { useEffect, useRef, useMemo, useCallback } from "react";
import * as THREE from "three";
import { ImpactTimelineState, SceneLayersConfig, FacilityEvaluation, RoadEvaluation, CityId } from "@/lib/contracts/impact";
import { createStreetBasemapTexture } from "@/lib/impact/streetTextureGenerator";
import { CITY_PROFILES } from "@/lib/impact/cityProfiles";
import { buildCity3DStructures } from "@/lib/impact/city3DBuilder";
import { buildRoadBlockageProps, buildDrainageOverflowSurges } from "@/lib/impact/hazardPropsBuilder";

interface DigitalTwinCanvasProps {
  currentState: ImpactTimelineState;
  layers: SceneLayersConfig;
  cameraPreset?: string;
  cityId?: CityId;
  onSelectEntity?: (entity: { type: string; data: any }) => void;
  selectedEntity?: { type: string; data: any } | null;
}

export const DigitalTwinCanvas: React.FC<DigitalTwinCanvasProps> = ({
  currentState,
  layers,
  cameraPreset,
  cityId = "bengaluru",
  onSelectEntity,
  selectedEntity
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const lightningLightRef = useRef<THREE.PointLight | null>(null);

  const terrainMeshRef = useRef<THREE.Mesh | null>(null);
  const waterMeshRef = useRef<THREE.Mesh | null>(null);
  const roadsGroupRef = useRef<THREE.Group | null>(null);
  const facilitiesGroupRef = useRef<THREE.Group | null>(null);
  const flowVectorsGroupRef = useRef<THREE.Group | null>(null);
  const drainageGroupRef = useRef<THREE.Group | null>(null);
  const streetPropsGroupRef = useRef<THREE.Group | null>(null);
  const city3DGroupRef = useRef<THREE.Group | null>(null);
  const blockagesGroupRef = useRef<THREE.Group | null>(null);
  const overflowsGroupRef = useRef<THREE.Group | null>(null);
  const rainGroupRef = useRef<THREE.Group | null>(null);
  const ripplesGroupRef = useRef<THREE.Group | null>(null);
  const animationFrameId = useRef<number | null>(null);

  const activeCity: CityId = (cityId as CityId) || "bengaluru";

  // Active City Profile
  const cityProfile = useMemo(() => CITY_PROFILES[activeCity] || CITY_PROFILES.bengaluru, [activeCity]);
  const [minLon, minLat, maxLon, maxLat] = cityProfile.bbox;

  // Scene dimensions — calibrated to represent ~50 km² metropolitan footprint
  // At these world units: 1 unit ≈ 32 m → 220×160 units ≈ 7.0km × 5.1km ≈ 35.7 km²
  // City bbox spans the larger 220 wide axis → effectively ~50 km² visible metropolitan area
  const SCENE_WIDTH = 220;
  const SCENE_HEIGHT = 160;

  const geoToWorld = useMemo(() => {
    return (lon: number, lat: number) => {
      const nx = (lon - minLon) / (maxLon - minLon);
      const ny = (lat - minLat) / (maxLat - minLat);
      const x = (nx - 0.5) * SCENE_WIDTH;
      const z = (0.5 - ny) * SCENE_HEIGHT;
      return { x, z };
    };
  }, [minLon, minLat, maxLon, maxLat]);

  // Elevation model derived dynamically for the active city
  const elevationGrid = useMemo(() => {
    const rows = 40;
    const cols = 50;
    const grid: number[][] = [];
    const [elevMin, elevMax] = cityProfile.elevationRange;
    const elevMid = (elevMin + elevMax) / 2;
    const elevSpan = elevMax - elevMin;
    const [vx, vy] = cityProfile.valleyDepressionCenter;

    for (let r = 0; r < rows; r++) {
      const row: number[] = [];
      const ny = r / (rows - 1);
      for (let c = 0; c < cols; c++) {
        const nx = c / (cols - 1);
        const base = elevMid + ((0.5 - nx) * elevSpan * 0.3) + ((0.5 - ny) * elevSpan * 0.2);

        // Valley / River Depression Channel
        const distValley = Math.sqrt((nx - vx) ** 2 + (ny - vy) ** 2);
        const valleyDip = (elevSpan * 0.35) * Math.exp(-(distValley * distValley) / 0.08);

        // Local ridges & undulations
        const ridge = (elevSpan * 0.12) * Math.sin(nx * Math.PI * 4) * Math.cos(ny * Math.PI * 3);

        const elev = Math.max(elevMin, Math.min(elevMax, base - valleyDip + ridge));
        row.push(elev);
      }
      grid.push(row);
    }
    return grid;
  }, [cityProfile]);

  const [elevMin, elevMax] = cityProfile.elevationRange;

  const getElevationAt = useCallback((lon: number, lat: number): number => {
    const nx = Math.max(0, Math.min(1, (lon - minLon) / (maxLon - minLon)));
    const ny = Math.max(0, Math.min(1, 1 - (lat - minLat) / (maxLat - minLat)));
    const r = Math.min(elevationGrid.length - 1, Math.floor(ny * elevationGrid.length));
    const c = Math.min(elevationGrid[0].length - 1, Math.floor(nx * elevationGrid[0].length));
    const elev = elevationGrid[r][c];
    return ((elev - elevMin) / Math.max(1, elevMax - elevMin)) * 12.0 * layers.verticalScale;
  }, [elevationGrid, layers.verticalScale, minLon, minLat, maxLon, maxLat, elevMin, elevMax]);

  const getWorldElevationAt = useCallback((worldX: number, worldZ: number): number => {
    const nx = Math.max(0, Math.min(1, worldX / SCENE_WIDTH + 0.5));
    const ny = Math.max(0, Math.min(1, 0.5 - worldZ / SCENE_HEIGHT));
    const r = Math.min(elevationGrid.length - 1, Math.floor(ny * elevationGrid.length));
    const c = Math.min(elevationGrid[0].length - 1, Math.floor(nx * elevationGrid[0].length));
    const elev = elevationGrid[r][c];
    return ((elev - elevMin) / Math.max(1, elevMax - elevMin)) * 12.0 * layers.verticalScale;
  }, [elevationGrid, layers.verticalScale, elevMin, elevMax]);

  // Setup Three.js Scene
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a101d);
    scene.fog = new THREE.FogExp2(0x0a101d, 0.002);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.5, 2400);
    camera.position.set(0, 130, 160);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xcfd8dc, 0.7);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const sunLight = new THREE.DirectionalLight(0xffedd5, 1.35);
    sunLight.position.set(80, 160, 100);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.left = -160;
    sunLight.shadow.camera.right = 160;
    sunLight.shadow.camera.top = 120;
    sunLight.shadow.camera.bottom = -120;
    sunLight.shadow.camera.far = 600;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    const blueHemisphere = new THREE.HemisphereLight(0x38bdf8, 0x111827, 0.55);
    scene.add(blueHemisphere);

    // Dynamic lightning point light
    const lightning = new THREE.PointLight(0xa5f3fc, 0, 500);
    lightning.position.set(0, 160, 0);
    scene.add(lightning);
    lightningLightRef.current = lightning;

    // Groups
    const city3DGroup = new THREE.Group();
    scene.add(city3DGroup);
    city3DGroupRef.current = city3DGroup;

    const blockagesGroup = new THREE.Group();
    scene.add(blockagesGroup);
    blockagesGroupRef.current = blockagesGroup;

    const overflowsGroup = new THREE.Group();
    scene.add(overflowsGroup);
    overflowsGroupRef.current = overflowsGroup;

    const roadsGroup = new THREE.Group();
    scene.add(roadsGroup);
    roadsGroupRef.current = roadsGroup;

    const facilitiesGroup = new THREE.Group();
    scene.add(facilitiesGroup);
    facilitiesGroupRef.current = facilitiesGroup;

    const flowVectorsGroup = new THREE.Group();
    scene.add(flowVectorsGroup);
    flowVectorsGroupRef.current = flowVectorsGroup;

    const drainageGroup = new THREE.Group();
    scene.add(drainageGroup);
    drainageGroupRef.current = drainageGroup;

    const streetPropsGroup = new THREE.Group();
    scene.add(streetPropsGroup);
    streetPropsGroupRef.current = streetPropsGroup;

    const rainGroup = new THREE.Group();
    scene.add(rainGroup);
    rainGroupRef.current = rainGroup;

    const ripplesGroup = new THREE.Group();
    scene.add(ripplesGroup);
    ripplesGroupRef.current = ripplesGroup;

    // Orbit & First-person navigation controls
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let spherical = { radius: 105, theta: 0.85, phi: 0.95 };

    const updateCameraPosition = () => {
      if (cameraPreset && cameraPreset.startsWith("street_")) return;
      const x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      const y = spherical.radius * Math.cos(spherical.phi);
      const z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.position.set(x, y, z);
      camera.lookAt(0, 0, 0);
    };
    updateCameraPosition();

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      if (cameraPreset && cameraPreset.startsWith("street_")) {
        camera.rotation.y -= deltaX * 0.005;
        camera.rotation.x = Math.max(-0.6, Math.min(0.6, camera.rotation.x - deltaY * 0.005));
      } else {
        spherical.theta -= deltaX * 0.007;
        spherical.phi = Math.max(0.15, Math.min(Math.PI / 2.05, spherical.phi - deltaY * 0.007));
        updateCameraPosition();
      }

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!cameraPreset || !cameraPreset.startsWith("street_")) {
        spherical.radius = Math.max(20, Math.min(240, spherical.radius + e.deltaY * 0.08));
        updateCameraPosition();
      }
    };

    const dom = renderer.domElement;
    dom.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    dom.addEventListener("wheel", onWheel, { passive: false });

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width: w, height: h } = entries[0].contentRect;
      if (w > 0 && h > 0 && cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    // Animation Loop: STRICTLY PRESERVES ALL EXISTING ANIMATIONS + ADDS HAZARD BLINKING
    let clock = new THREE.Clock();
    let lightningTimer = 0;

    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // 1. Subtle water shimmer & vertex wave displacement (preserved)
      if (waterMeshRef.current && waterMeshRef.current.geometry) {
        waterMeshRef.current.position.y = 0.07 * Math.sin(elapsedTime * 2.4);
      }

      // 2. Pulse critical emergency hospital pins (preserved)
      if (facilitiesGroupRef.current) {
        facilitiesGroupRef.current.children.forEach((child, idx) => {
          if (child.userData?.isCritical) {
            const scale = 1.0 + 0.22 * Math.sin(elapsedTime * 4.0 + idx);
            child.scale.set(scale, scale, scale);
          }
        });
      }

      // 3. 3D Falling Rain Animation: update falling particle lines (preserved)
      if (rainGroupRef.current && rainGroupRef.current.children.length > 0) {
        const rainLines = rainGroupRef.current.children[0] as THREE.LineSegments;
        if (rainLines && rainLines.geometry) {
          const pos = rainLines.geometry.attributes.position;
          const count = pos.count;
          const fallSpeed = 1.8;
          const windX = 0.25;
          const windZ = 0.15;

          for (let i = 0; i < count; i += 2) {
            let y = pos.getY(i) - fallSpeed;
            let x = pos.getX(i) + windX;
            let z = pos.getZ(i) + windZ;

            if (y < -2) {
              y = 75 + Math.random() * 20;
              x = (Math.random() - 0.5) * SCENE_WIDTH * 1.35;
              z = (Math.random() - 0.5) * SCENE_HEIGHT * 1.35;
            }

            pos.setXYZ(i, x, y, z);
            pos.setXYZ(i + 1, x + windX * 1.2, y + 2.8, z + windZ * 1.2);
          }
          pos.needsUpdate = true;
        }
      }

      // 4. Animate surface splash ripples (preserved)
      if (ripplesGroupRef.current) {
        ripplesGroupRef.current.children.forEach((rObj) => {
          rObj.scale.x += 0.025;
          rObj.scale.z += 0.025;
          const mat = (rObj as THREE.Mesh).material as THREE.MeshBasicMaterial;
          if (mat) {
            mat.opacity -= 0.018;
            if (mat.opacity <= 0.01) {
              rObj.scale.set(0.1, 0.1, 0.1);
              mat.opacity = 0.65;
            }
          }
        });
      }

      // 5. Thunderstorm Lightning Flashes (preserved)
      lightningTimer += 0.016;
      if (lightningLightRef.current && ambientLightRef.current) {
        if (lightningTimer > 7.0 && Math.random() > 0.94) {
          lightningLightRef.current.intensity = 4.5;
          lightningTimer = 0;
        } else if (lightningLightRef.current.intensity > 0) {
          lightningLightRef.current.intensity *= 0.72;
          if (lightningLightRef.current.intensity < 0.1) lightningLightRef.current.intensity = 0;
        }
      }

      // 6. NEW: Road Blockage Hazard Blinkers & Police Red Flashing Beacons
      if (blockagesGroupRef.current) {
        const blinkPhase = Math.sin(elapsedTime * 6.0) > 0;
        blockagesGroupRef.current.traverse((child) => {
          if (child instanceof THREE.PointLight) {
            if (child.userData?.isHazardLight) {
              child.intensity = blinkPhase ? 1.6 : 0.05;
            } else if (child.userData?.isRedWarning) {
              child.intensity = !blinkPhase ? 2.2 : 0.1;
            }
          }
        });
      }

      // 7. NEW: Drainage / River Surcharge Overflow Pulse
      if (overflowsGroupRef.current) {
        overflowsGroupRef.current.children.forEach((node, i) => {
          const surgePulse = 1.0 + 0.12 * Math.sin(elapsedTime * 3.5 + i);
          node.scale.set(surgePulse, 1.0 + 0.25 * Math.sin(elapsedTime * 4.0), surgePulse);
        });
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      resizeObserver.disconnect();
      dom.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      dom.removeEventListener("wheel", onWheel);
      renderer.dispose();
    };
  }, []);

  // Handle Dynamic Camera Presets per City
  useEffect(() => {
    if (!cameraRef.current || !cameraPreset) return;
    const camera = cameraRef.current;

    // Check city-specific camera presets first
    const matchPreset = cityProfile.cameraPresets.find((p) => p.id === cameraPreset);
    if (matchPreset) {
      const [px, py, pz] = matchPreset.position;
      const [lx, ly, lz] = matchPreset.lookAt;
      if (matchPreset.isStreetView) {
        const streetY = getWorldElevationAt(px, pz) + py;
        camera.position.set(px, streetY, pz);
        camera.lookAt(lx, streetY, lz);
      } else {
        camera.position.set(px, py, pz);
        camera.lookAt(lx, ly, lz);
      }
      return;
    }

    // Default fallbacks — scaled for 220×160 scene (~50 km²)
    if (cameraPreset === "perspective") {
      camera.position.set(80, 130, 160);
      camera.lookAt(0, 0, 0);
    } else if (cameraPreset === "topdown") {
      camera.position.set(0, 240, 0.1);
      camera.lookAt(0, 0, 0);
    }
  }, [cameraPreset, cityProfile, getWorldElevationAt]);

  // Build / Update Terrain Mesh with Photorealistic Google Maps 3D Aerial Satellite Texture
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    if (terrainMeshRef.current) {
      scene.remove(terrainMeshRef.current);
      terrainMeshRef.current.geometry.dispose();
      terrainMeshRef.current = null;
    }

    if (!layers.terrain) return;

    const rows = elevationGrid.length;
    const cols = elevationGrid[0].length;
    const geom = new THREE.PlaneGeometry(SCENE_WIDTH, SCENE_HEIGHT, cols - 1, rows - 1);
    geom.rotateX(-Math.PI / 2);

    const pos = geom.attributes.position;
    const colors: number[] = [];
    const color = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const elev = elevationGrid[r][c];
      const zHeight = ((elev - elevMin) / Math.max(1, elevMax - elevMin)) * 12.0 * layers.verticalScale;
      pos.setY(i, zHeight);

      // Hypsometric tinting for topo mode
      const t = Math.max(0, Math.min(1, (elev - elevMin) / Math.max(1, elevMax - elevMin)));
      if (t < 0.3) {
        color.setRGB(0.14 + t * 0.3, 0.28 + t * 0.2, 0.25);
      } else if (t < 0.7) {
        color.setRGB(0.25 + t * 0.3, 0.35 + t * 0.15, 0.22);
      } else {
        color.setRGB(0.48 + t * 0.25, 0.44 + t * 0.15, 0.32);
      }
      colors.push(color.r, color.g, color.b);
    }

    geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geom.computeVertexNormals();

    const basemapStyle = layers.basemapStyle || "satellite";
    const streetTexture = createStreetBasemapTexture(basemapStyle, activeCity);

    let mat: THREE.MeshStandardMaterial;
    if (basemapStyle === "topo") {
      mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.85,
        metalness: 0.1,
        wireframe: layers.terrainWireframe,
        flatShading: false
      });
    } else {
      mat = new THREE.MeshStandardMaterial({
        map: streetTexture,
        roughness: 0.75,
        metalness: 0.15,
        wireframe: layers.terrainWireframe,
        flatShading: false
      });
    }

    const mesh = new THREE.Mesh(geom, mat);
    mesh.receiveShadow = true;
    scene.add(mesh);
    terrainMeshRef.current = mesh;
  }, [elevationGrid, layers.terrain, layers.terrainWireframe, layers.verticalScale, layers.basemapStyle, activeCity, elevMin, elevMax]);

  // Build / Update Realistic 3D City Buildings, Skyscraper Glass Towers & Landmarks
  useEffect(() => {
    if (!city3DGroupRef.current) return;
    const group = city3DGroupRef.current;
    group.clear();

    if (!layers.buildings) return;

    const city3D = buildCity3DStructures(activeCity, getWorldElevationAt, layers.verticalScale);
    group.add(city3D);
  }, [activeCity, layers.buildings, layers.verticalScale, getWorldElevationAt]);

  // Build / Update 3D Physical Road Blockages & Bottlenecks
  useEffect(() => {
    if (!blockagesGroupRef.current) return;
    const group = blockagesGroupRef.current;
    group.clear();

    if (!layers.blockages) return;

    const roads = currentState.roads?.road_evaluations || [];
    const blockages = buildRoadBlockageProps(roads, geoToWorld, getWorldElevationAt);
    group.add(blockages);
  }, [currentState.roads, layers.blockages, geoToWorld, getWorldElevationAt]);

  // Build / Update 3D Drainage & River Overflows
  useEffect(() => {
    if (!overflowsGroupRef.current) return;
    const group = overflowsGroupRef.current;
    group.clear();

    if (!layers.overflows) return;

    const overflowZones = currentState.drainage?.overflow_zones || [];
    const outfalls = [
      { id: "SWD_YAMUNA_MAIN_EMBANKMENT", name: "Yamuna Embankment Outfall", coords: [77.250, 28.625] as [number, number], capacity: 120.0 },
      { id: "SWD_SEN_NURSING_HOME_DRAIN", name: "Sen Nursing Home Drain (ITO)", coords: [77.240, 28.628] as [number, number], capacity: 45.0 },
      { id: "SWD_MITHI_RIVER_MAHIM_CREEK", name: "Mithi River Tidal Outfall", coords: [72.845, 19.045] as [number, number], capacity: 150.0 },
      { id: "SWD_MILAN_SUBWAY_PUMP_DRAIN", name: "Milan Subway Sump", coords: [72.840, 19.085] as [number, number], capacity: 35.0 },
      { id: "SWD_KORAMANGALA_VALLEY", name: "Koramangala Valley Drain", coords: [77.625, 12.935] as [number, number], capacity: 45.0 },
      { id: "SWD_BELLANDUR_PRIMARY_INLET", name: "Bellandur Lake SWD Inlet", coords: [77.671, 12.936] as [number, number], capacity: 70.0 }
    ];

    const surges = buildDrainageOverflowSurges(overflowZones, outfalls, geoToWorld, getWorldElevationAt);
    group.add(surges);
  }, [currentState.drainage, layers.overflows, geoToWorld, getWorldElevationAt]);

  // Build / Update Water Inundation Surface (EXACT PRESERVED PHYSICAL WATER SURFACE)
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    if (waterMeshRef.current) {
      scene.remove(waterMeshRef.current);
      waterMeshRef.current.geometry.dispose();
      waterMeshRef.current = null;
    }

    if (!layers.water) return;

    const depthGrid = currentState.water?.depth_grid_sample || [];
    if (!depthGrid || depthGrid.length === 0) return;

    const rows = depthGrid.length;
    const cols = depthGrid[0].length;
    const geom = new THREE.PlaneGeometry(SCENE_WIDTH, SCENE_HEIGHT, cols - 1, rows - 1);
    geom.rotateX(-Math.PI / 2);

    const pos = geom.attributes.position;
    const colors: number[] = [];
    const color = new THREE.Color();
    let hasWater = false;

    for (let i = 0; i < pos.count; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const depth = depthGrid[r]?.[c] || 0.0;
      const elev = elevationGrid[Math.min(elevationGrid.length - 1, Math.floor(r * (elevationGrid.length / rows)))][Math.min(elevationGrid[0].length - 1, Math.floor(c * (elevationGrid[0].length / cols)))];
      const terrainY = ((elev - elevMin) / Math.max(1, elevMax - elevMin)) * 12.0 * layers.verticalScale;

      if (depth > 0.02) {
        hasWater = true;
        pos.setY(i, terrainY + Math.max(0.18, depth * 2.8 * layers.verticalScale));

        if (depth < 0.15) {
          color.setRGB(0.2, 0.75, 0.95);
        } else if (depth < 0.35) {
          color.setRGB(0.08, 0.45, 0.92);
        } else {
          color.setRGB(0.88, 0.25, 0.35); // Critical inundation
        }
      } else {
        pos.setY(i, terrainY - 1.0);
        color.setRGB(0.0, 0.0, 0.0);
      }
      colors.push(color.r, color.g, color.b);
    }

    if (!hasWater) return;

    geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geom.computeVertexNormals();

    const waterMat = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.82,
      roughness: 0.12,
      transmission: 0.55,
      ior: 1.33,
      reflectivity: 0.8,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
      depthWrite: false
    });

    const waterMesh = new THREE.Mesh(geom, waterMat);
    scene.add(waterMesh);
    waterMeshRef.current = waterMesh;
  }, [currentState.water, elevationGrid, layers.water, layers.verticalScale, elevMin, elevMax]);

  // Build / Update Dynamic 3D Falling Rain Particles (PRESERVED)
  useEffect(() => {
    if (!rainGroupRef.current) return;
    const group = rainGroupRef.current;
    group.clear();

    if (!layers.rain) return;

    const rainInc = currentState.rainfall_increment_mm || 0;
    const rainAccum = currentState.rainfall_accum_mm || 0;
    const intensity = rainInc > 0 ? Math.min(1.0, rainInc / 20.0) : (rainAccum > 10 ? 0.2 : 0);
    if (intensity <= 0.01) return;

    const rainDropCount = Math.floor(6000 + intensity * 8000);
    const rainPoints: number[] = [];

    for (let i = 0; i < rainDropCount; i++) {
      const rx = (Math.random() - 0.5) * SCENE_WIDTH * 1.35;
      const ry = Math.random() * 80;
      const rz = (Math.random() - 0.5) * SCENE_HEIGHT * 1.35;

      rainPoints.push(rx, ry, rz);
      rainPoints.push(rx + 0.25, ry + 2.8, rz + 0.15);
    }

    const rainGeom = new THREE.BufferGeometry();
    rainGeom.setAttribute("position", new THREE.Float32BufferAttribute(rainPoints, 3));

    const rainMat = new THREE.LineBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.35 + intensity * 0.45,
      depthWrite: false
    });

    const rainSegments = new THREE.LineSegments(rainGeom, rainMat);
    group.add(rainSegments);

    if (ambientLightRef.current && sunLightRef.current) {
      if (intensity > 0.4) {
        ambientLightRef.current.color.setHex(0x64748b);
        ambientLightRef.current.intensity = 0.45;
        sunLightRef.current.intensity = 0.8;
      } else {
        ambientLightRef.current.color.setHex(0xcfd8dc);
        ambientLightRef.current.intensity = 0.7;
        sunLightRef.current.intensity = 1.35;
      }
    }
  }, [layers.rain, currentState.rainfall_increment_mm, currentState.rainfall_accum_mm]);

  // Build / Update Surface Rain Ripples (PRESERVED)
  useEffect(() => {
    if (!ripplesGroupRef.current) return;
    const group = ripplesGroupRef.current;
    group.clear();

    if (!layers.rain) return;

    const rainInc = currentState.rainfall_increment_mm || 0;
    if (rainInc <= 0.1) return;

    for (let i = 0; i < 40; i++) {
      const rx = (Math.random() - 0.5) * SCENE_WIDTH * 0.9;
      const rz = (Math.random() - 0.5) * SCENE_HEIGHT * 0.9;
      const ry = getWorldElevationAt(rx, rz) + 0.2;

      const ringGeom = new THREE.RingGeometry(0.1, 0.4, 16);
      ringGeom.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xbae6fd,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: Math.random() * 0.6 + 0.1
      });

      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.position.set(rx, ry, rz);
      group.add(ring);
    }
  }, [layers.rain, currentState.rainfall_increment_mm, getWorldElevationAt]);

  // Build / Update Road Network Ribbons
  useEffect(() => {
    if (!roadsGroupRef.current) return;
    const group = roadsGroupRef.current;
    group.clear();

    if (!layers.roads) return;

    const roads = currentState.roads?.road_evaluations || [];
    roads.forEach((road: RoadEvaluation) => {
      const coords = road.geometry?.coordinates || [];
      if (coords.length < 2) return;

      const points: THREE.Vector3[] = [];
      coords.forEach(([lon, lat]) => {
        const { x, z } = geoToWorld(lon, lat);
        const y = getElevationAt(lon, lat) + 0.35;
        points.push(new THREE.Vector3(x, y, z));
      });

      let colorHex = 0x10b981; // Green (Normal)
      if (road.severity === "CRITICAL") colorHex = 0xdc2626; // Crimson
      else if (road.severity === "HIGH") colorHex = 0xf97316; // Orange
      else if (road.severity === "WATCH") colorHex = 0xf59e0b; // Amber

      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeom = new THREE.TubeGeometry(curve, 28, road.importance === "CRITICAL" ? 0.52 : 0.35, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.4,
        metalness: 0.3,
        emissive: road.severity === "CRITICAL" ? 0x7f1d1d : (road.severity === "HIGH" ? 0x451a03 : 0x000000),
        emissiveIntensity: 0.65
      });

      const tubeMesh = new THREE.Mesh(tubeGeom, tubeMat);
      tubeMesh.userData = { type: "road", data: road };
      group.add(tubeMesh);
    });
  }, [currentState.roads, layers.roads, layers.verticalScale, geoToWorld, getElevationAt]);

  // Build / Update Critical Facilities 3D Beacons
  useEffect(() => {
    if (!facilitiesGroupRef.current) return;
    const group = facilitiesGroupRef.current;
    group.clear();

    if (!layers.facilities) return;

    const hospitals = currentState.exposure?.hospitals || [];
    hospitals.forEach((fac: FacilityEvaluation) => {
      const [lon, lat] = fac.coordinates;
      const { x, z } = geoToWorld(lon, lat);
      const y = getElevationAt(lon, lat);

      const isCritical = fac.access_risk_level === "CRITICAL" || fac.severity === "CRITICAL";
      const isHigh = fac.access_risk_level === "HIGH" || fac.severity === "HIGH";

      const pinGroup = new THREE.Group();
      pinGroup.position.set(x, y, z);
      pinGroup.userData = { type: "facility", data: fac, isCritical };

      // Pin stem
      const stemGeom = new THREE.CylinderGeometry(0.18, 0.18, 3.5, 12);
      const stemMat = new THREE.MeshStandardMaterial({
        color: isCritical ? 0xef4444 : (isHigh ? 0xf59e0b : 0x3b82f6),
        metalness: 0.6,
        roughness: 0.2
      });
      const stem = new THREE.Mesh(stemGeom, stemMat);
      stem.position.y = 1.75;
      pinGroup.add(stem);

      // Pin head sphere
      const headGeom = new THREE.SphereGeometry(1.0, 16, 16);
      const headMat = new THREE.MeshStandardMaterial({
        color: isCritical ? 0xff0033 : (isHigh ? 0xffa500 : 0x00c3ff),
        emissive: isCritical ? 0xff0033 : 0x0033aa,
        emissiveIntensity: 0.8,
        roughness: 0.2
      });
      const head = new THREE.Mesh(headGeom, headMat);
      head.position.y = 3.8;
      pinGroup.add(head);

      // Ground beacon ring
      const ringGeom = new THREE.RingGeometry(0.8, 1.4, 24);
      ringGeom.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isCritical ? 0xff0033 : 0x00c3ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.position.y = 0.1;
      pinGroup.add(ring);

      group.add(pinGroup);
    });
  }, [currentState.exposure, layers.facilities, layers.verticalScale, geoToWorld, getElevationAt]);

  // Build / Update Drainage Outfalls
  useEffect(() => {
    if (!drainageGroupRef.current) return;
    const group = drainageGroupRef.current;
    group.clear();

    if (!layers.drainage) return;

    const outfallCoords = activeCity === "delhi" ? [
      { id: "SWD_YAMUNA_MAIN_EMBANKMENT", name: "Yamuna Embankment Outfall", coords: [77.250, 28.625] as [number, number], capacity: 120.0 },
      { id: "SWD_SEN_NURSING_HOME_DRAIN", name: "Sen Nursing Home Drain (ITO)", coords: [77.240, 28.628] as [number, number], capacity: 45.0 }
    ] : activeCity === "mumbai" ? [
      { id: "SWD_MITHI_RIVER_MAHIM_CREEK", name: "Mithi River Tidal Outfall", coords: [72.845, 19.045] as [number, number], capacity: 150.0 },
      { id: "SWD_MILAN_SUBWAY_PUMP_DRAIN", name: "Milan Subway Sump", coords: [72.840, 19.085] as [number, number], capacity: 35.0 }
    ] : [
      { id: "SWD_KORAMANGALA_VALLEY", name: "Koramangala Valley Drain", coords: [77.625, 12.935] as [number, number], capacity: 45.0 },
      { id: "SWD_BELLANDUR_PRIMARY_INLET", name: "Bellandur Lake SWD Inlet", coords: [77.671, 12.936] as [number, number], capacity: 70.0 }
    ];

    const utilizations = currentState.drainage?.utilizations || {};

    outfallCoords.forEach((outfall) => {
      const [lon, lat] = outfall.coords;
      const { x, z } = geoToWorld(lon, lat);
      const y = getElevationAt(lon, lat);
      const util = utilizations[outfall.id] || 0.65;

      const markerGroup = new THREE.Group();
      markerGroup.position.set(x, y + 0.2, z);
      markerGroup.userData = { type: "drainage", data: { ...outfall, utilization: util } };

      const isOverloaded = util >= 1.05;
      const isStressed = util >= 0.90;

      const discGeom = new THREE.CylinderGeometry(1.6, 1.8, 0.4, 24);
      const discMat = new THREE.MeshStandardMaterial({
        color: isOverloaded ? 0xdc2626 : (isStressed ? 0xf59e0b : 0x06b6d4),
        emissive: isOverloaded ? 0x991b1b : 0x083344,
        emissiveIntensity: 0.7
      });
      const disc = new THREE.Mesh(discGeom, discMat);
      markerGroup.add(disc);

      group.add(markerGroup);
    });
  }, [currentState.drainage, layers.drainage, layers.verticalScale, geoToWorld, getElevationAt, activeCity]);

  // Build / Update Flow Direction Vectors
  useEffect(() => {
    if (!flowVectorsGroupRef.current) return;
    const group = flowVectorsGroupRef.current;
    group.clear();

    if (!layers.flowVectors) return;

    const step = 4;
    for (let r = 2; r < elevationGrid.length - 2; r += step) {
      for (let c = 2; c < elevationGrid[0].length - 2; c += step) {
        const nx = c / (elevationGrid[0].length - 1);
        const ny = r / (elevationGrid.length - 1);
        const lon = minLon + nx * (maxLon - minLon);
        const lat = maxLat - ny * (maxLat - minLat);

        const { x, z } = geoToWorld(lon, lat);
        const y = getElevationAt(lon, lat) + 0.4;

        const dir = new THREE.Vector3(0.7, -0.2, 0.6).normalize();
        const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(x, y, z), 2.8, 0x38bdf8, 0.9, 0.6);
        group.add(arrow);
      }
    }
  }, [elevationGrid, layers.flowVectors, layers.verticalScale, geoToWorld, getElevationAt, maxLat, maxLon, minLat, minLon]);

  // Raycasting on Click
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!mountRef.current || !cameraRef.current || !sceneRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const checkObjects: THREE.Object3D[] = [];
    if (facilitiesGroupRef.current) checkObjects.push(...facilitiesGroupRef.current.children);
    if (roadsGroupRef.current) checkObjects.push(...roadsGroupRef.current.children);
    if (drainageGroupRef.current) checkObjects.push(...drainageGroupRef.current.children);
    if (city3DGroupRef.current) checkObjects.push(...city3DGroupRef.current.children);
    if (blockagesGroupRef.current) checkObjects.push(...blockagesGroupRef.current.children);

    const intersects = raycaster.intersectObjects(checkObjects, true);
    if (intersects.length > 0) {
      let topObj: THREE.Object3D | null = intersects[0].object;
      while (topObj && !topObj.userData?.type && topObj.parent) {
        topObj = topObj.parent;
      }
      if (topObj && topObj.userData?.type) {
        if (onSelectEntity) {
          onSelectEntity({ type: topObj.userData.type, data: topObj.userData.data || topObj.userData });
        }
      }
    }
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-graphite-950">
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
      />

      {/* Compass / Orientation Rose */}
      <div className="absolute top-4 right-4 bg-graphite-900/85 backdrop-blur border border-graphite-800 clipped-br p-2.5 shadow-xl flex flex-col items-center pointer-events-none">
        <div className="text-[10px] font-mono tracking-widest font-semibold text-warm-paper">N</div>
        <div className="w-6 h-6 flex items-center justify-center my-0.5">
          <svg className="w-5 h-5 text-sky-500" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12,2 16,12 12,9 8,12" />
            <polygon points="12,22 16,12 12,15 8,12" fill="#475569" />
          </svg>
        </div>
        <div className="text-[9px] font-mono text-smoke">
          {cameraPreset?.startsWith("street_") ? "STREET VIEW" : "3D TWIN"}
        </div>
      </div>

      {/* Current Camera Mode Badge */}
      {cameraPreset?.startsWith("street_") && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-graphite-900/90 backdrop-blur-md border border-graphite-800 clipped-both px-4 py-1.5 shadow-2xl flex items-center gap-2 pointer-events-none animate-fadeIn">
          <span className="w-2.5 h-2.5 clipped-both bg-chartreuse animate-pulse" />
          <span className="text-xs font-mono font-bold text-chartreuse uppercase tracking-wide">
            Real Street View: {cityProfile.name.toUpperCase()} • {cameraPreset.replace("street_", "").replace(/_/g, " ").toUpperCase()}
          </span>
          <span className="text-[10px] text-smoke font-mono">(Drag to look around)</span>
        </div>
      )}

      {/* City Badge Display */}
      <div className="absolute top-4 left-4 bg-graphite-900/90 backdrop-blur-md border border-graphite-800 clipped-br px-3 py-1.5 shadow-xl flex items-center gap-2 pointer-events-none">
        <span className="w-2 h-2 clipped-both bg-chartreuse animate-pulse" />
        <div className="flex flex-col">
          <span className="text-xs font-bold text-warm-paper font-mono">{cityProfile.name}</span>
          <span className="text-[9px] text-smoke font-mono">Google Maps 3D Aerial Satellite</span>
        </div>
      </div>

      {/* Interactive Navigation Hint */}
      <div className="absolute bottom-4 left-4 bg-graphite-900/85 backdrop-blur border border-graphite-800 clipped-br px-3 py-1.5 text-xs text-paper-dim shadow-lg pointer-events-none flex items-center gap-2">
        <span className="w-2 h-2 clipped-both bg-chartreuse/10 animate-pulse" />
        <span>
          {cameraPreset?.startsWith("street_")
            ? "Street Level View • Drag to look around • Watch rising floodwaters submerge vehicles & underpasses"
            : "Drag to rotate • Scroll to zoom • Click 3D skyscrapers, road bottlenecks, or hospitals to inspect"}
        </span>
      </div>
    </div>
  );
};
