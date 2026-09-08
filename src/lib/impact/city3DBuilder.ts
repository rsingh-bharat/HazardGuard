import * as THREE from "three";
import { CityId, CityProfile } from "@/lib/contracts/impact";
import { CITY_PROFILES } from "./cityProfiles";

/**
 * Creates procedural texture for high-rise glass building facades with illuminated window patterns.
 */
function createSkyscraperTexture(baseColorHex = "#1e293b", windowColorHex = "#38bdf8"): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Facade base background
  ctx.fillStyle = baseColorHex;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Vertical structural mullions
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 3;
  const cols = 8;
  const colW = canvas.width / cols;
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * colW, 0);
    ctx.lineTo(c * colW, canvas.height);
    ctx.stroke();
  }

  // Horizontal floor spandrels & illuminated windows
  const floors = 32;
  const floorH = canvas.height / floors;
  for (let f = 0; f < floors; f++) {
    const y = f * floorH;

    // Floor floor slab beam
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, y, canvas.width, 3);

    for (let c = 0; c < cols; c++) {
      const x = c * colW + 4;
      const w = colW - 8;
      const h = floorH - 6;

      // Random window lighting (some bright, some ambient, some dark)
      const r = Math.random();
      if (r > 0.45) {
        ctx.fillStyle = windowColorHex;
        ctx.globalAlpha = 0.6 + Math.random() * 0.4;
      } else if (r > 0.25) {
        ctx.fillStyle = "#fef08a"; // Warm interior light
        ctx.globalAlpha = 0.5;
      } else {
        ctx.fillStyle = "#0c121e"; // Dark unlit office
        ctx.globalAlpha = 0.8;
      }
      ctx.fillRect(x, y + 3, w, h);
      ctx.globalAlpha = 1.0;
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Builds realistic 3D architectural city structures, high-rises, and iconic landmarks for the active city.
 */
export function buildCity3DStructures(
  cityId: CityId,
  getWorldElevationAt: (x: number, z: number) => number,
  verticalScale = 1.6
): THREE.Group {
  const cityGroup = new THREE.Group();
  cityGroup.name = `city_3d_${cityId}`;

  const profile = CITY_PROFILES[cityId];
  if (!profile) return cityGroup;

  // Cache facade textures
  const glassBlueTex = createSkyscraperTexture("#0f172a", "#38bdf8");
  const glassCyanTex = createSkyscraperTexture("#0a192f", "#06b6d4");
  const glassAmberTex = createSkyscraperTexture("#1c1917", "#fbbf24");
  const concreteTex = createSkyscraperTexture("#334155", "#94a3b8");

  // Reusable materials
  const glassBlueMat = new THREE.MeshStandardMaterial({
    map: glassBlueTex,
    metalness: 0.65,
    roughness: 0.25,
    envMapIntensity: 1.2
  });

  const glassCyanMat = new THREE.MeshStandardMaterial({
    map: glassCyanTex,
    metalness: 0.7,
    roughness: 0.2,
    envMapIntensity: 1.5
  });

  const concreteMat = new THREE.MeshStandardMaterial({
    map: concreteTex,
    metalness: 0.2,
    roughness: 0.8
  });

  const metalDarkMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.85,
    roughness: 0.3
  });

  // -------------------------------------------------------------
  // 1. BUILD ICONIC CITY LANDMARKS
  // -------------------------------------------------------------
  profile.landmarks.forEach((lm) => {
    const [lx, lz] = lm.worldPos;
    const baseElevation = getWorldElevationAt(lx, lz);
    const landmarkGroup = new THREE.Group();
    landmarkGroup.position.set(lx, baseElevation, lz);
    landmarkGroup.userData = { type: "landmark", data: lm };

    if (lm.id === "india_gate") {
      // Delhi India Gate Monument Arch
      const archW = 8;
      const archH = 12;
      const archD = 5;

      // Base plinth
      const plinthGeom = new THREE.BoxGeometry(archW + 2, 1.2, archD + 2);
      const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
      const plinth = new THREE.Mesh(plinthGeom, stoneMat);
      plinth.position.y = 0.6;
      landmarkGroup.add(plinth);

      // Left column pier
      const pierGeom = new THREE.BoxGeometry(2.4, archH - 3, archD);
      const leftPier = new THREE.Mesh(pierGeom, stoneMat);
      leftPier.position.set(-2.5, archH / 2 - 0.5, 0);
      landmarkGroup.add(leftPier);

      // Right column pier
      const rightPier = new THREE.Mesh(pierGeom, stoneMat);
      rightPier.position.set(2.5, archH / 2 - 0.5, 0);
      landmarkGroup.add(rightPier);

      // Top lintel / entablature
      const topGeom = new THREE.BoxGeometry(archW, 3.5, archD);
      const topMesh = new THREE.Mesh(topGeom, stoneMat);
      topMesh.position.y = archH - 0.5;
      landmarkGroup.add(topMesh);

      // Stepped dome crown
      const domeGeom = new THREE.CylinderGeometry(1.8, 2.8, 1.5, 16);
      const dome = new THREE.Mesh(domeGeom, stoneMat);
      dome.position.y = archH + 2.0;
      landmarkGroup.add(dome);

    } else if (lm.id === "sealink_cable_tower") {
      // Mumbai Bandra-Worli Sea Link Concrete Pylon & Stay Cables
      const pylonH = 34;
      // Diamond inverted-V legs
      const legGeom = new THREE.CylinderGeometry(0.6, 0.9, pylonH, 8);
      const pylonMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4, metalness: 0.3 });

      const leg1 = new THREE.Mesh(legGeom, pylonMat);
      leg1.position.set(-1.8, pylonH / 2, 0);
      leg1.rotation.z = -0.08;
      landmarkGroup.add(leg1);

      const leg2 = new THREE.Mesh(legGeom, pylonMat);
      leg2.position.set(1.8, pylonH / 2, 0);
      leg2.rotation.z = 0.08;
      landmarkGroup.add(leg2);

      // Upper apex spire
      const spireGeom = new THREE.ConeGeometry(0.8, 6, 8);
      const spire = new THREE.Mesh(spireGeom, pylonMat);
      spire.position.y = pylonH + 3;
      landmarkGroup.add(spire);

      // Stay cables
      const cableMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.7 });
      for (let c = 0; c < 10; c++) {
        const topY = pylonH - c * 1.8;
        const spanX = 4 + c * 2.2;
        const ptsL = [new THREE.Vector3(0, topY, 0), new THREE.Vector3(-spanX, 3.5, 0)];
        const geomL = new THREE.BufferGeometry().setFromPoints(ptsL);
        landmarkGroup.add(new THREE.Line(geomL, cableMat));

        const ptsR = [new THREE.Vector3(0, topY, 0), new THREE.Vector3(spanX, 3.5, 0)];
        const geomR = new THREE.BufferGeometry().setFromPoints(ptsR);
        landmarkGroup.add(new THREE.Line(geomR, cableMat));
      }

    } else if (lm.id === "bharat_mandapam") {
      // Delhi Bharat Mandapam Elliptical Convention Center
      const domeGeom = new THREE.SphereGeometry(7, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      domeGeom.scale(1.2, 0.7, 1.0);
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        metalness: 0.8,
        roughness: 0.15,
        transparent: true,
        opacity: 0.88
      });
      const dome = new THREE.Mesh(domeGeom, glassMat);
      dome.position.y = 2.5;
      landmarkGroup.add(dome);

      // Concrete podium ring
      const podiumGeom = new THREE.CylinderGeometry(8.5, 9.2, 2.5, 32);
      const podium = new THREE.Mesh(podiumGeom, concreteMat);
      podium.position.y = 1.25;
      landmarkGroup.add(podium);

    } else if (lm.type === "skyscraper") {
      // Generic / Iconic High-Rise Skyscraper (BKC, Imperial, UB City, Vikas Minar)
      const h = lm.height;
      const w = lm.width || 8;
      const d = lm.depth || 8;

      // Base Podium
      const podH = Math.min(4, h * 0.15);
      const podGeom = new THREE.BoxGeometry(w * 1.25, podH, d * 1.25);
      const podMesh = new THREE.Mesh(podGeom, concreteMat);
      podMesh.position.y = podH / 2;
      landmarkGroup.add(podMesh);

      // Main Glass Shaft
      const towerH = h - podH;
      const towerGeom = new THREE.BoxGeometry(w, towerH, d);
      const towerMesh = new THREE.Mesh(towerGeom, glassBlueMat);
      towerMesh.position.y = podH + towerH / 2;
      landmarkGroup.add(towerMesh);

      // Stepped crown / mechanical penthouse
      const crownH = Math.max(2, h * 0.08);
      const crownGeom = new THREE.BoxGeometry(w * 0.7, crownH, d * 0.7);
      const crownMesh = new THREE.Mesh(crownGeom, metalDarkMat);
      crownMesh.position.y = h + crownH / 2;
      landmarkGroup.add(crownMesh);

      // Rooftop Spire / Antenna
      const spireGeom = new THREE.CylinderGeometry(0.1, 0.25, 6, 8);
      const spireMesh = new THREE.Mesh(spireGeom, metalDarkMat);
      spireMesh.position.y = h + crownH + 3;
      landmarkGroup.add(spireMesh);

      // Beacon warning light at peak
      const light = new THREE.PointLight(0xef4444, 1.2, 18);
      light.position.y = h + crownH + 6;
      landmarkGroup.add(light);

    } else {
      // Standard Complex / Interchange
      const w = lm.width || 12;
      const d = lm.depth || 10;
      const h = lm.height || 10;

      const compGeom = new THREE.BoxGeometry(w, h, d);
      const compMat = new THREE.MeshStandardMaterial({
        color: lm.color || 0x3b82f6,
        metalness: 0.5,
        roughness: 0.35
      });
      const compMesh = new THREE.Mesh(compGeom, compMat);
      compMesh.position.y = h / 2;
      landmarkGroup.add(compMesh);
    }

    cityGroup.add(landmarkGroup);
  });

  // -------------------------------------------------------------
  // 2. DENSE REALISTIC DOWNTOWN & COMMERCIAL HIGH-RISE CLUSTERS
  // -------------------------------------------------------------
  // Generate authentic urban skyline building grid across key city districts
  // Districts are spread across the wider 220×160 world scene (≈50 km² footprint)
  const districtCenters = cityId === "delhi" ? [
    { cx: 18,  cz: 14,  count: 22, radius: 28, minH: 14, maxH: 30, style: "glass",    minSpacing: 6 }, // ITO Commercial Hub
    { cx: -50, cz: -12, count: 18, radius: 22, minH: 10, maxH: 22, style: "mixed",    minSpacing: 6 }, // Connaught Place Radial
    { cx: -8,  cz: 38,  count: 20, radius: 22, minH: 8,  maxH: 18, style: "concrete", minSpacing: 5 }, // Mathura Rd / Pragati Maidan
    { cx: 42,  cz: -28, count: 16, radius: 20, minH: 12, maxH: 24, style: "glass",    minSpacing: 6 }, // Yamuna Bank Metro/HQ
    { cx: -36, cz: 28,  count: 14, radius: 18, minH: 8,  maxH: 16, style: "concrete", minSpacing: 5 }, // Old Delhi / Lajpat Nagar
    { cx: 65,  cz: 10,  count: 12, radius: 18, minH: 10, maxH: 20, style: "mixed",    minSpacing: 6 }, // Noida / East Delhi ORR
  ] : cityId === "mumbai" ? [
    { cx: 18,   cz: 4,  count: 28, radius: 26, minH: 20, maxH: 45, style: "glass",    minSpacing: 7 }, // BKC Financial District
    { cx: -38,  cz: 42, count: 22, radius: 24, minH: 22, maxH: 52, style: "glass",    minSpacing: 7 }, // Lower Parel / Prabhadevi
    { cx: -16,  cz: 32, count: 20, radius: 20, minH: 14, maxH: 28, style: "concrete", minSpacing: 6 }, // Dadar / Hindmata
    { cx: 26,   cz:-32, count: 18, radius: 20, minH: 16, maxH: 32, style: "mixed",    minSpacing: 6 }, // Santacruz / Kurla
    { cx: -60,  cz: 10, count: 16, radius: 22, minH: 24, maxH: 58, style: "glass",    minSpacing: 8 }, // South Mumbai CBD / Nariman Point
    { cx: 55,   cz: 22, count: 14, radius: 18, minH: 12, maxH: 26, style: "mixed",    minSpacing: 6 }, // Andheri / Vile Parle
  ] : [
    { cx: 38,  cz: -12, count: 26, radius: 28, minH: 16, maxH: 36, style: "glass",    minSpacing: 7 }, // Bellandur ORR IT Corridor
    { cx: -24, cz: 16,  count: 22, radius: 22, minH: 12, maxH: 24, style: "mixed",    minSpacing: 6 }, // Koramangala 80ft Tech
    { cx: 16,  cz: 44,  count: 18, radius: 22, minH: 14, maxH: 28, style: "concrete", minSpacing: 6 }, // Silk Board Interchange
    { cx: -52, cz: -34, count: 20, radius: 24, minH: 18, maxH: 40, style: "glass",    minSpacing: 7 }, // UB City / CBD
    { cx: 62,  cz: 30,  count: 16, radius: 20, minH: 14, maxH: 30, style: "glass",    minSpacing: 6 }, // Sarjapur Road IT zone
    { cx: -10, cz: -46, count: 14, radius: 18, minH: 10, maxH: 22, style: "mixed",    minSpacing: 5 }, // Jayanagar / Banashankari
  ];

  let bldgIndex = 0;
  // Track placed building positions to enforce minimum spacing
  const placedPositions: { x: number; z: number }[] = [];

  districtCenters.forEach((district) => {
    let placed = 0;
    let attempts = 0;
    const maxAttempts = district.count * 12;

    while (placed < district.count && attempts < maxAttempts) {
      attempts++;
      bldgIndex++;

      // Spread buildings using sunflower/Fibonacci disk distribution for even spacing
      const angle = bldgIndex * 2.399963; // golden angle in radians
      const distFrac = Math.sqrt((placed + 1) / district.count);
      const dist = (district.radius * 0.3 + district.radius * 0.7 * distFrac) + (Math.random() - 0.5) * 4.0;
      const bx = district.cx + Math.cos(angle) * dist;
      const bz = district.cz + Math.sin(angle) * dist;

      // Enforce minimum building spacing
      const tooClose = placedPositions.some(p => {
        const dx = p.x - bx;
        const dz = p.z - bz;
        return Math.sqrt(dx * dx + dz * dz) < district.minSpacing;
      });
      if (tooClose) continue;

      placedPositions.push({ x: bx, z: bz });
      placed++;

      const baseElevation = getWorldElevationAt(bx, bz);

      const bw = 4.5 + Math.random() * 5.0;
      const bd = 4.5 + Math.random() * 5.0;
      const bh = district.minH + Math.random() * (district.maxH - district.minH);

      const bGroup = new THREE.Group();
      bGroup.position.set(bx, baseElevation, bz);

      // Select material style
      const mat = district.style === "glass"
        ? (Math.random() > 0.4 ? glassBlueMat : glassCyanMat)
        : (Math.random() > 0.5 ? concreteMat : glassBlueMat);

      // Multi-tier architecture: Base + Tower + Rooftop mechanical
      const mainGeom = new THREE.BoxGeometry(bw, bh, bd);
      const mainMesh = new THREE.Mesh(mainGeom, mat);
      mainMesh.position.y = bh / 2;
      bGroup.add(mainMesh);

      // Rooftop details (Helipad or HVAC chiller unit)
      if (bh > 22 && Math.random() > 0.4) {
        const hvacGeom = new THREE.BoxGeometry(bw * 0.5, 1.2, bd * 0.5);
        const hvacMesh = new THREE.Mesh(hvacGeom, metalDarkMat);
        hvacMesh.position.y = bh + 0.6;
        bGroup.add(hvacMesh);

        if (Math.random() > 0.5) {
          // Helipad target
          const heliGeom = new THREE.RingGeometry(0.8, 1.4, 16);
          heliGeom.rotateX(-Math.PI / 2);
          const heliMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide });
          const heli = new THREE.Mesh(heliGeom, heliMat);
          heli.position.y = bh + 1.25;
          bGroup.add(heli);
        }
      }

      cityGroup.add(bGroup);
    }
  });

  // -------------------------------------------------------------
  // 3. ELEVATED EXPRESSWAYS & FLYOVER DECKS
  // -------------------------------------------------------------
  // Elevated freeway corridors running above the city — scaled for 220×160 scene
  const flyoverPathPoints = cityId === "delhi" ? [
    new THREE.Vector3(-55, 8.0, 36),
    new THREE.Vector3(-22, 8.0, 28),
    new THREE.Vector3(10, 8.0, 20),
    new THREE.Vector3(40, 8.0, 14),
    new THREE.Vector3(65, 8.0, 10)
  ] : cityId === "mumbai" ? [
    new THREE.Vector3(-45, 8.5, 52),
    new THREE.Vector3(-16, 8.5, 40),
    new THREE.Vector3(12, 8.5, 24),
    new THREE.Vector3(36, 8.5, 8),
    new THREE.Vector3(56, 8.5, -12)
  ] : [
    new THREE.Vector3(-36, 8.0, 48),
    new THREE.Vector3(4, 8.0, 44),
    new THREE.Vector3(28, 8.0, 32),
    new THREE.Vector3(48, 8.0, 12),
    new THREE.Vector3(65, 8.0, -8)
  ];

  const flyoverCurve = new THREE.CatmullRomCurve3(flyoverPathPoints);
  const flyoverDeckGeom = new THREE.TubeGeometry(flyoverCurve, 32, 0.85, 8, false);
  const flyoverMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.4,
    metalness: 0.4
  });
  const flyoverMesh = new THREE.Mesh(flyoverDeckGeom, flyoverMat);
  cityGroup.add(flyoverMesh);

  // Concrete support piers every 6 units along flyover
  const pierGeom = new THREE.CylinderGeometry(0.45, 0.55, 6, 12);
  const pierMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });

  for (let t = 0.05; t <= 0.95; t += 0.12) {
    const pt = flyoverCurve.getPoint(t);
    const groundY = getWorldElevationAt(pt.x, pt.z);
    const pierH = Math.max(1, pt.y - groundY);

    const pier = new THREE.Mesh(pierGeom, pierMat);
    pier.scale.set(1, pierH / 6, 1);
    pier.position.set(pt.x, groundY + pierH / 2, pt.z);
    cityGroup.add(pier);
  }

  return cityGroup;
}
