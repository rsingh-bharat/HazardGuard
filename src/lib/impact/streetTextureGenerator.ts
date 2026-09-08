import * as THREE from "three";
import { CityId } from "@/lib/contracts/impact";

/**
 * Procedurally generates a photorealistic Google Maps 3D Aerial Satellite / Street Map texture.
 * Customized for Delhi NCR, Mumbai (Bombay), and Bengaluru.
 * Drapes over the 3D terrain to provide authentic Google Maps aerial views with real river channels,
 * arterial highway ribbons with lane markings, city grid blocks, and highway signage.
 */
export function createStreetBasemapTexture(
  style: "satellite" | "topo" | "dark" = "satellite",
  cityId: CityId = "bengaluru"
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 2048;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  const w = canvas.width;
  const h = canvas.height;

  if (style === "dark") {
    // Tactical Radar Dark Style
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, w, h);
  } else if (style === "topo") {
    // Topographic hypsometric gradient
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#4a5d3f");
    grad.addColorStop(0.5, "#3d4b35");
    grad.addColorStop(1, "#273832");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else {
    // -------------------------------------------------------------
    // PHOTOREALISTIC GOOGLE MAPS 3D AERIAL SATELLITE BASEMAP
    // -------------------------------------------------------------
    // Base urban tarmac and terrain color
    ctx.fillStyle = cityId === "delhi" ? "#21262d" : cityId === "mumbai" ? "#1a2129" : "#1e242b";
    ctx.fillRect(0, 0, w, h);

    // High-frequency photographic ground grain / noise
    for (let i = 0; i < 4000; i++) {
      const rx = Math.random() * w;
      const ry = Math.random() * h;
      const rw = 2 + Math.random() * 8;
      const rh = 2 + Math.random() * 8;
      ctx.fillStyle = Math.random() > 0.5 ? "#262f38" : "#181e25";
      ctx.fillRect(rx, ry, rw, rh);
    }

    // -------------------------------------------------------------
    // CITY-SPECIFIC NATURAL FEATURES & WATER BODIES
    // -------------------------------------------------------------
    if (cityId === "delhi") {
      // 1. Yamuna River Floodplain & Wetlands (North to South-East serpentine curve)
      ctx.strokeStyle = "#0d2b38";
      ctx.lineWidth = 140;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(1500, 50);
      ctx.bezierCurveTo(1350, 600, 1600, 1200, 1400, 2000);
      ctx.stroke();

      // Deep river center channel
      ctx.strokeStyle = "#081d26";
      ctx.lineWidth = 80;
      ctx.beginPath();
      ctx.moveTo(1500, 50);
      ctx.bezierCurveTo(1350, 600, 1600, 1200, 1400, 2000);
      ctx.stroke();

      // Sandy mudflats along Yamuna banks
      ctx.strokeStyle = "rgba(74, 66, 52, 0.4)";
      ctx.lineWidth = 190;
      ctx.beginPath();
      ctx.moveTo(1500, 50);
      ctx.bezierCurveTo(1350, 600, 1600, 1200, 1400, 2000);
      ctx.stroke();

      // Lush Greenery: Central Ridge Forest, Lodhi Gardens, India Gate Lawns, Sunder Nursery
      const parks = [
        { x: 450, y: 700, r: 240 }, // Central Ridge Forest
        { x: 800, y: 1300, r: 200 }, // Lodhi Gardens / Safdarjung
        { x: 600, y: 1100, r: 160 }, // India Gate lawns
        { x: 1200, y: 1500, r: 220 } // Sunder Nursery & Millennium Park
      ];
      parks.forEach((p) => {
        const pGrad = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, p.r);
        pGrad.addColorStop(0, "#193822");
        pGrad.addColorStop(0.7, "#142c1b");
        pGrad.addColorStop(1, "rgba(20, 44, 27, 0)");
        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

    } else if (cityId === "mumbai") {
      // 1. Arabian Sea Coastline & Mahim Bay (West side)
      const seaGrad = ctx.createLinearGradient(0, 0, 700, 0);
      seaGrad.addColorStop(0, "#081f2d");
      seaGrad.addColorStop(0.7, "#0c2838");
      seaGrad.addColorStop(1, "rgba(12, 40, 56, 0)");
      ctx.fillStyle = seaGrad;
      ctx.fillRect(0, 0, 600, h);

      // Mithi River Channel (Meandering from airport through BKC into Mahim Creek)
      ctx.strokeStyle = "#081d26";
      ctx.lineWidth = 75;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(1800, 450);
      ctx.bezierCurveTo(1300, 750, 1000, 1100, 500, 1300);
      ctx.lineTo(200, 1400); // Out into Mahim Creek
      ctx.stroke();

      // Mangrove green swaths along Mithi & Bandra creek
      const mangroves = [
        { x: 950, y: 1050, r: 220 },
        { x: 1250, y: 850, r: 180 },
        { x: 450, y: 1350, r: 160 },
        { x: 1400, y: 1650, r: 260 } // Shivaji Park / Mahim Nature Park
      ];
      mangroves.forEach((m) => {
        const mGrad = ctx.createRadialGradient(m.x, m.y, 10, m.x, m.y, m.r);
        mGrad.addColorStop(0, "#183624");
        mGrad.addColorStop(0.8, "#132b1d");
        mGrad.addColorStop(1, "rgba(19, 43, 29, 0)");
        ctx.fillStyle = mGrad;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      });

    } else {
      // 1. Bengaluru: Bellandur Lake & Catchment (South-East)
      const lakeGrad = ctx.createRadialGradient(1600, 1450, 40, 1600, 1450, 420);
      lakeGrad.addColorStop(0, "#08252d");
      lakeGrad.addColorStop(0.5, "#0d313a");
      lakeGrad.addColorStop(0.85, "#143a3c");
      lakeGrad.addColorStop(1, "rgba(20, 58, 60, 0)");
      ctx.fillStyle = lakeGrad;
      ctx.beginPath();
      ctx.ellipse(1600, 1450, 450, 260, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();

      // Parks & tree cover (Agara park, Koramangala BDA grounds)
      const blrParks = [
        { x: 350, y: 400, r: 180 },
        { x: 900, y: 550, r: 260 },
        { x: 1200, y: 1100, r: 220 } // Agara park
      ];
      blrParks.forEach((p) => {
        const pGrad = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, p.r);
        pGrad.addColorStop(0, "#1d3824");
        pGrad.addColorStop(0.7, "#182e1e");
        pGrad.addColorStop(1, "rgba(24, 46, 30, 0)");
        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // -------------------------------------------------------------
    // REAL URBAN ROOFTOPS & RESIDENTIAL BLOCKS
    // -------------------------------------------------------------
    for (let bx = 100; bx < w - 100; bx += 68) {
      for (let by = 100; by < h - 100; by += 68) {
        if (Math.random() > 0.3) {
          const bw = 32 + Math.random() * 22;
          const bh = 28 + Math.random() * 24;
          const bColors = ["#333d4b", "#2a3441", "#3e4856", "#453833", "#232b36"];
          ctx.fillStyle = bColors[Math.floor(Math.random() * bColors.length)];
          ctx.fillRect(bx, by, bw, bh);

          // Roof perimeter outline
          ctx.strokeStyle = "#1a212b";
          ctx.lineWidth = 1;
          ctx.strokeRect(bx, by, bw, bh);
        }
      }
    }
  }

  // -------------------------------------------------------------
  // REAL ROAD NETWORK & HIGHWAY RIBBONS PAINTING
  // -------------------------------------------------------------
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (cityId === "delhi") {
    // 1. Ring Road (Mahatma Gandhi Marg) along Yamuna
    ctx.strokeStyle = "#242a33";
    ctx.lineWidth = 34;
    ctx.beginPath();
    ctx.moveTo(1350, 100);
    ctx.bezierCurveTo(1250, 700, 1450, 1300, 1300, 1950);
    ctx.stroke();

    // Asphalt surface layer
    ctx.strokeStyle = "#384352";
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.moveTo(1350, 100);
    ctx.bezierCurveTo(1250, 700, 1450, 1300, 1300, 1950);
    ctx.stroke();

    // Dashed white lane dividers
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([14, 16]);
    ctx.beginPath();
    ctx.moveTo(1350, 100);
    ctx.bezierCurveTo(1250, 700, 1450, 1300, 1300, 1950);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Vikas Marg (Connecting East Delhi across Yamuna bridge through ITO)
    ctx.strokeStyle = "#384352";
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.moveTo(400, 950);
    ctx.lineTo(1950, 950);
    ctx.stroke();

    // 3. Barapullah Elevated Expressway Corridor
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.moveTo(350, 1600);
    ctx.lineTo(1350, 1620);
    ctx.stroke();

    // 4. Connaught Place Concentric Rings
    ctx.strokeStyle = "#384352";
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(650, 600, 140, 0, Math.PI * 2); // Outer Circle (Connaught Circus)
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(650, 600, 80, 0, Math.PI * 2); // Inner Circle (Connaught Place)
    ctx.stroke();

  } else if (cityId === "mumbai") {
    // 1. Western Express Highway (WEH)
    ctx.strokeStyle = "#242a33";
    ctx.lineWidth = 36;
    ctx.beginPath();
    ctx.moveTo(1050, 100);
    ctx.bezierCurveTo(1000, 800, 900, 1300, 750, 1950);
    ctx.stroke();

    ctx.strokeStyle = "#384352";
    ctx.lineWidth = 28;
    ctx.beginPath();
    ctx.moveTo(1050, 100);
    ctx.bezierCurveTo(1000, 800, 900, 1300, 750, 1950);
    ctx.stroke();

    // Dashed white dividers
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([14, 16]);
    ctx.beginPath();
    ctx.moveTo(1050, 100);
    ctx.bezierCurveTo(1000, 800, 900, 1300, 750, 1950);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. BKC Financial Avenue Expressway
    ctx.strokeStyle = "#384352";
    ctx.lineWidth = 30;
    ctx.beginPath();
    ctx.moveTo(950, 1050);
    ctx.lineTo(1750, 1100);
    ctx.stroke();

    // 3. Bandra-Worli Sea Link Causeway
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 24;
    ctx.beginPath();
    ctx.moveTo(350, 1400);
    ctx.bezierCurveTo(280, 1600, 320, 1850, 480, 2000);
    ctx.stroke();

  } else {
    // 1. Bengaluru: Outer Ring Road (ORR) Expressway curve
    ctx.strokeStyle = "#242a33";
    ctx.lineWidth = 34;
    ctx.beginPath();
    ctx.moveTo(150, 1650); // Silk board
    ctx.bezierCurveTo(700, 1400, 1200, 1150, 1750, 950); // Bellandur
    ctx.lineTo(2000, 800);
    ctx.stroke();

    ctx.strokeStyle = "#3a4452";
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.moveTo(150, 1650);
    ctx.bezierCurveTo(700, 1400, 1200, 1150, 1750, 950);
    ctx.lineTo(2000, 800);
    ctx.stroke();

    // Dashed Lane Dividers
    ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([14, 16]);
    ctx.beginPath();
    ctx.moveTo(150, 1650);
    ctx.bezierCurveTo(700, 1400, 1200, 1150, 1750, 950);
    ctx.lineTo(2000, 800);
    ctx.stroke();
    ctx.setLineDash([]);

    // Hosur Road
    ctx.strokeStyle = "#3a4452";
    ctx.lineWidth = 24;
    ctx.beginPath();
    ctx.moveTo(150, 100);
    ctx.lineTo(200, 1650);
    ctx.lineTo(250, 2000);
    ctx.stroke();
  }

  // -------------------------------------------------------------
  // GOOGLE MAPS STYLE HIGHWAY SHIELD LABELS & STREET SIGNAGE
  // -------------------------------------------------------------
  ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const labels = cityId === "delhi" ? [
    { text: "RING ROAD (MAHATMA GANDHI MARG)", x: 1320, y: 650, angle: 0.15, color: "#38bdf8" },
    { text: "VIKAS MARG (ITO BRIDGE)", x: 1100, y: 920, angle: 0, color: "#f87171" },
    { text: "PRAGATI MAIDAN TRANSIT TUNNEL", x: 850, y: 1120, angle: 0.1, color: "#facc15" },
    { text: "YAMUNA RIVER FLOODPLAIN", x: 1550, y: 1450, angle: 0.35, color: "#34d399" },
    { text: "BARAPULLAH ELEVATED EXPRESSWAY", x: 750, y: 1640, angle: 0, color: "#94a3b8" }
  ] : cityId === "mumbai" ? [
    { text: "WESTERN EXPRESS HIGHWAY (WEH)", x: 920, y: 650, angle: 0.32, color: "#38bdf8" },
    { text: "BKC FINANCIAL AVENUE", x: 1350, y: 1070, angle: 0.05, color: "#38bdf8" },
    { text: "MITHI RIVER SURCHARGE BASIN", x: 1150, y: 920, angle: -0.22, color: "#34d399" },
    { text: "HINDMATA UNDERPASS CHOKE POINT", x: 780, y: 1720, angle: 0, color: "#f87171" },
    { text: "BANDRA-WORLI SEA LINK", x: 340, y: 1650, angle: 1.15, color: "#e0f2fe" }
  ] : [
    { text: "OUTER RING ROAD (ORR)", x: 1100, y: 1170, angle: -0.32, color: "#38bdf8" },
    { text: "CENTRAL SILK BOARD JUNCTION", x: 230, y: 1730, angle: 0, color: "#f87171" },
    { text: "KORAMANGALA 80FT ROAD", x: 680, y: 640, angle: 0.28, color: "#facc15" },
    { text: "BELLANDUR LAKE WATERSHED", x: 1580, y: 1480, angle: 0.05, color: "#34d399" }
  ];

  labels.forEach((lbl) => {
    ctx.save();
    ctx.translate(lbl.x, lbl.y);
    ctx.rotate(lbl.angle);

    const textWidth = ctx.measureText(lbl.text).width;
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.beginPath();
    ctx.roundRect(-textWidth / 2 - 12, -18, textWidth + 24, 36, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = lbl.color;
    ctx.fillText(lbl.text, 0, 0);
    ctx.restore();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}
