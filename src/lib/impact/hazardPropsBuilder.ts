import * as THREE from "three";
import { RoadEvaluation, CityId } from "@/lib/contracts/impact";

/**
 * Builds physical 3D road blockage indicators:
 * Submerged stranded vehicles with flashing hazard blinkers, traffic detour cones,
 * and police closure barricades at severe bottleneck locations.
 */
export function buildRoadBlockageProps(
  roads: RoadEvaluation[],
  geoToWorld: (lon: number, lat: number) => { x: number; z: number },
  getWorldElevationAt: (x: number, z: number) => number
): THREE.Group {
  const blockageGroup = new THREE.Group();
  blockageGroup.name = "road_blockages_group";

  // Reusable materials
  const barricadeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const barricadeRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 });
  const coneOrangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.2 });

  roads.forEach((road) => {
    const coords = road.geometry?.coordinates || [];
    if (coords.length < 2) return;

    // Only create blockage visual when water depth is significant (>= 0.25m or CRITICAL/HIGH status)
    if (road.water_depth_m < 0.25 && road.severity !== "CRITICAL") return;

    // Pick 1 to 2 blockage choke points along the road
    const midIdx = Math.floor(coords.length / 2);
    const [midLon, midLat] = coords[midIdx];
    const { x: bx, z: bz } = geoToWorld(midLon, midLat);
    const groundY = getWorldElevationAt(bx, bz);

    const chokeGroup = new THREE.Group();
    chokeGroup.position.set(bx, groundY, bz);
    chokeGroup.userData = { type: "blockage", roadId: road.road_id, depth: road.water_depth_m };

    // 1. SUBMERGED VEHICLE WITH FLASHING HAZARD BLINKERS
    const vehType = Math.random() > 0.4 ? "bus" : "car";
    const vw = vehType === "bus" ? 1.6 : 1.1;
    const vl = vehType === "bus" ? 4.4 : 2.4;
    const vh = vehType === "bus" ? 1.5 : 0.9;

    const carBodyGeom = new THREE.BoxGeometry(vw, vh, vl);
    const carMat = new THREE.MeshStandardMaterial({
      color: vehType === "bus" ? 0xd97706 : 0xef4444,
      metalness: 0.4,
      roughness: 0.3
    });
    const carMesh = new THREE.Mesh(carBodyGeom, carMat);

    // Position vehicle partially submerged in floodwater
    const submergeDepth = Math.min(vh * 0.7, road.water_depth_m * 0.8);
    carMesh.position.set(0, vh / 2 - submergeDepth + 0.1, 0);
    carMesh.rotation.y = (Math.random() - 0.5) * 0.4;
    chokeGroup.add(carMesh);

    // Hazard Blinkers (Amber point lights on roof/corners)
    const blinkerLeft = new THREE.PointLight(0xf59e0b, 1.4, 8);
    blinkerLeft.position.set(-vw / 2 - 0.1, vh - submergeDepth + 0.2, vl / 2);
    blinkerLeft.userData = { isHazardLight: true };
    chokeGroup.add(blinkerLeft);

    const blinkerRight = new THREE.PointLight(0xf59e0b, 1.4, 8);
    blinkerRight.position.set(vw / 2 + 0.1, vh - submergeDepth + 0.2, vl / 2);
    blinkerRight.userData = { isHazardLight: true };
    chokeGroup.add(blinkerRight);

    // Small glowing blinker spheres
    const blinkerSphereGeom = new THREE.SphereGeometry(0.12, 8, 8);
    const blinkerSphereMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const bSphereL = new THREE.Mesh(blinkerSphereGeom, blinkerSphereMat);
    bSphereL.position.copy(blinkerLeft.position);
    chokeGroup.add(bSphereL);

    const bSphereR = new THREE.Mesh(blinkerSphereGeom, blinkerSphereMat);
    bSphereR.position.copy(blinkerRight.position);
    chokeGroup.add(bSphereR);

    // 2. POLICE / EMERGENCY CLOSURE BARRICADES (if depth >= 0.4m or CRITICAL)
    if (road.water_depth_m >= 0.4 || road.severity === "CRITICAL") {
      const barGroup = new THREE.Group();
      barGroup.position.set(1.6, 0.4, 1.8);

      // Horizontal striped board
      const barGeom = new THREE.BoxGeometry(2.6, 0.45, 0.08);
      const barMesh = new THREE.Mesh(barGeom, barricadeRedMat);
      barMesh.position.y = 0.5;
      barGroup.add(barMesh);

      // White stripe inserts
      const stripeGeom = new THREE.BoxGeometry(0.35, 0.47, 0.09);
      for (let s = -1.0; s <= 1.0; s += 0.6) {
        const stripe = new THREE.Mesh(stripeGeom, barricadeWhiteMat);
        stripe.position.set(s, 0.5, 0);
        barGroup.add(stripe);
      }

      // Barricade legs
      const legGeom = new THREE.CylinderGeometry(0.05, 0.05, 1.0, 8);
      const legL = new THREE.Mesh(legGeom, barricadeWhiteMat);
      legL.position.set(-1.1, 0.3, 0);
      barGroup.add(legL);

      const legR = new THREE.Mesh(legGeom, barricadeWhiteMat);
      legR.position.set(1.1, 0.3, 0);
      barGroup.add(legR);

      // Flashing Red Warning Beacon atop barricade
      const redBeaconLight = new THREE.PointLight(0xef4444, 1.8, 10);
      redBeaconLight.position.set(0, 1.1, 0);
      redBeaconLight.userData = { isRedWarning: true };
      barGroup.add(redBeaconLight);

      chokeGroup.add(barGroup);
    }

    // 3. REFLECTORIZED DETOUR TRAFFIC CONES
    for (let c = 0; c < 3; c++) {
      const coneGeom = new THREE.ConeGeometry(0.22, 0.65, 12);
      const cone = new THREE.Mesh(coneGeom, coneOrangeMat);
      cone.position.set(-1.8 + c * 0.7, 0.32, -1.5 + (Math.random() - 0.5) * 0.4);
      chokeGroup.add(cone);
    }

    blockageGroup.add(chokeGroup);
  });

  return blockageGroup;
}

/**
 * Builds 3D Drainage & River Surcharge Overflows:
 * Surcharging outfalls erupting with boiling water surge meshes, expanding foam turbulence rings,
 * and dynamic sewer backflow indicators when hydraulic utilization > 100%.
 */
export function buildDrainageOverflowSurges(
  overflowZones: any[],
  outfalls: { id: string; name: string; coords: [number, number]; capacity: number }[],
  geoToWorld: (lon: number, lat: number) => { x: number; z: number },
  getWorldElevationAt: (x: number, z: number) => number
): THREE.Group {
  const surgeGroup = new THREE.Group();
  surgeGroup.name = "drainage_overflows_group";

  outfalls.forEach((outfall) => {
    const isOverflowing = overflowZones.some((z) => z.zone_id === outfall.id);
    if (!isOverflowing) return;

    const [lon, lat] = outfall.coords;
    const { x, z } = geoToWorld(lon, lat);
    const groundY = getWorldElevationAt(x, z);

    const overflowNode = new THREE.Group();
    overflowNode.position.set(x, groundY + 0.2, z);
    overflowNode.userData = { type: "overflow_surge", outfallId: outfall.id };

    // Surcharge plume dome (erupting water bubble)
    const plumeGeom = new THREE.SphereGeometry(1.8, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    plumeGeom.scale(1.4, 0.8, 1.4);
    const plumeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      roughness: 0.1,
      metalness: 0.15
    });
    const plume = new THREE.Mesh(plumeGeom, plumeMat);
    overflowNode.add(plume);

    // Expanding foam turbulence ring
    const foamRingGeom = new THREE.RingGeometry(1.8, 3.2, 24);
    foamRingGeom.rotateX(-Math.PI / 2);
    const foamMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75
    });
    const foamRing = new THREE.Mesh(foamRingGeom, foamMat);
    foamRing.position.y = 0.05;
    overflowNode.add(foamRing);

    // Warning flashing outfall beacon
    const overflowBeacon = new THREE.PointLight(0xdc2626, 2.0, 15);
    overflowBeacon.position.set(0, 1.8, 0);
    overflowNode.add(overflowBeacon);

    surgeGroup.add(overflowNode);
  });

  return surgeGroup;
}
