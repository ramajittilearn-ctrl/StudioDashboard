import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface Room3DData {
  roomNumber: string;
  floor: number;
  status: 'OCCUPIED' | 'AVAILABLE' | 'RESERVED' | 'MAINTENANCE';
  tenantName: string;
  phone: string;
  rent: number;
  tier: string;
  waterUnits?: number;
  elecUnits?: number;
  unpaidSatang?: number;
  isOverdue?: boolean;
}

export interface PronteraSceneCallbacks {
  onSelectRoom: (roomNumber: string) => void;
  onHoverRoom: (room: Room3DData | null, screenPos?: { x: number; y: number }) => void;
  onNpcInteract?: (name: string, message: string) => void;
}

export interface PronteraSceneController {
  updateRooms: (rooms: Room3DData[]) => void;
  setNightMode: (isNight: boolean) => void;
  resetCamera: () => void;
  focusFloor: (floor: number | null) => void;
  dispose: () => void;
}

// Helper: Generate procedural Wood Grain Texture
function createWoodTexture(baseHex: string, stripeHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = stripeHex;
  for (let i = 0; i < 60; i++) {
    const y = Math.random() * 256;
    const h = 1 + Math.random() * 3;
    ctx.globalAlpha = 0.12 + Math.random() * 0.15;
    ctx.fillRect(0, y, 256, h);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Helper: Generate Breeze-Block (อิฐช่องลม) Texture with Alpha Holes
function createBreezeBlockTextures(cols = 6, rows = 3): { map: THREE.CanvasTexture; alphaMap: THREE.CanvasTexture } {
  const w = 512;
  const h = 256;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = w;
  colorCanvas.height = h;
  const cCtx = colorCanvas.getContext('2d')!;

  const alphaCanvas = document.createElement('canvas');
  alphaCanvas.width = w;
  alphaCanvas.height = h;
  const aCtx = alphaCanvas.getContext('2d')!;

  // Solid mortar background
  cCtx.fillStyle = '#d8d6d0';
  cCtx.fillRect(0, 0, w, h);

  aCtx.fillStyle = '#ffffff';
  aCtx.fillRect(0, 0, w, h);

  const cellW = w / cols;
  const cellH = h / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cellW;
      const y = r * cellH;

      // Outer block border
      cCtx.strokeStyle = '#b5b2aa';
      cCtx.lineWidth = 4;
      cCtx.strokeRect(x + 2, y + 2, cellW - 4, cellH - 4);

      // Inner recessed frame
      cCtx.fillStyle = '#c4c1b9';
      cCtx.fillRect(x + 8, y + 8, cellW - 16, cellH - 16);

      // Cut out four decorative ventilation holes per breeze block
      const holeW = (cellW - 34) / 2;
      const holeH = (cellH - 30) / 2;
      aCtx.fillStyle = '#000000';

      // Top-left & Top-right holes
      aCtx.fillRect(x + 12, y + 10, holeW, holeH);
      aCtx.fillRect(x + 22 + holeW, y + 10, holeW, holeH);
      // Bottom-left & Bottom-right holes
      aCtx.fillRect(x + 12, y + 18 + holeH, holeW, holeH);
      aCtx.fillRect(x + 22 + holeW, y + 18 + holeH, holeW, holeH);

      // Inner cross shadow on color map
      cCtx.fillStyle = '#9e9b93';
      cCtx.fillRect(x + 10, y + cellH / 2 - 3, cellW - 20, 6);
      cCtx.fillRect(x + cellW / 2 - 3, y + 10, 6, cellH - 20);
    }
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  const alphaMap = new THREE.CanvasTexture(alphaCanvas);
  return { map, alphaMap };
}

// Helper: Generate Floor 1 Vertical Wood/Cream Slat Wall Texture
function createFloor1WallTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ede8df';
  ctx.fillRect(0, 0, 512, 256);

  const stripes = 28;
  const step = 512 / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#8c5830' : '#dfd7c8';
    ctx.fillRect(i * step, 0, step * 0.55, 256);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(i * step + step * 0.55, 0, 2, 256);
  }
  return new THREE.CanvasTexture(canvas);
}

// Helper: Create Room Number & Status Badge Sprite
function createRoomBadgeSprite(room: Room3DData): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;

  // Background Pill
  let bg = 'rgba(15, 23, 42, 0.88)';
  let dotColor = '#fbbf24'; // Occupied gold
  let statusLabel = 'มีผู้เช่า';

  if (room.status === 'AVAILABLE') {
    dotColor = '#22c55e';
    statusLabel = 'ห้องว่าง';
  } else if (room.status === 'RESERVED') {
    dotColor = '#38bdf8';
    statusLabel = 'จองแล้ว';
  } else if (room.status === 'MAINTENANCE') {
    dotColor = '#94a3b8';
    statusLabel = 'ซ่อมบำรุง';
  } else if (room.isOverdue) {
    dotColor = '#f43f5e';
    statusLabel = 'ค้างชำระ';
    bg = 'rgba(136, 19, 55, 0.92)';
  }

  // Draw rounded rect
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(12, 12, 232, 72, 22);
  ctx.fill();

  ctx.lineWidth = 4;
  ctx.strokeStyle = dotColor;
  ctx.stroke();

  // Status circle
  ctx.fillStyle = dotColor;
  ctx.beginPath();
  ctx.arc(46, 48, 12, 0, Math.PI * 2);
  ctx.fill();

  // Room Number Text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px "JetBrains Mono", monospace, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(room.roomNumber, 70, 48);

  // Small status tag on right
  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 20px "Prompt", sans-serif';
  ctx.fillText(statusLabel, 152, 48);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.55, 0.58, 1);
  sprite.renderOrder = 999;
  return sprite;
}

// Helper: Create RO Emote Bubble Sprite
function createEmoteSprite(symbol: string, colorHex: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // White speech bubble
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(64, 56, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Tail
  ctx.beginPath();
  ctx.moveTo(54, 95);
  ctx.lineTo(64, 114);
  ctx.lineTo(74, 95);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = colorHex;
  ctx.font = '900 46px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(symbol, 64, 58);

  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sprite.scale.set(0.9, 0.9, 1);
  return sprite;
}

export function initPronteraDormitoryScene(
  container: HTMLElement,
  initialRooms: Room3DData[],
  callbacks: PronteraSceneCallbacks
): PronteraSceneController {
  // 1. Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  // 2. Scene & Sky
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#8ec5fc');
  scene.fog = new THREE.FogExp2('#a8d8ff', 0.008);

  // 3. Camera (Matching the 3/4 perspective angle of the user's architectural render!)
  const camera = new THREE.PerspectiveCamera(
    40,
    container.clientWidth / container.clientHeight,
    0.5,
    250
  );
  camera.position.set(-14.5, 11.5, 24.5);

  // 4. OrbitControls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0.5, 5.2, 1.0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.maxPolarAngle = Math.PI / 2 - 0.03; // Never go underground
  controls.minDistance = 8;
  controls.maxDistance = 55;
  controls.update();

  // 5. Lights
  const ambientLight = new THREE.AmbientLight('#fff8eb', 0.75);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight('#87ceeb', '#4d7c2b', 0.55);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight('#fff5e0', 1.85);
  sunLight.position.set(-18, 28, 22);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 2;
  sunLight.shadow.camera.far = 80;
  const d = 24;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.bias = -0.0005;
  scene.add(sunLight);

  // Shared Materials
  const woodTex = createWoodTexture('#9b5522', '#6e3811');
  const woodMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    roughness: 0.55,
    metalness: 0.05
  });
  const darkWoodMat = new THREE.MeshStandardMaterial({
    color: '#5a3012',
    roughness: 0.65
  });
  const whiteStuccoMat = new THREE.MeshStandardMaterial({
    color: '#f6f5f0',
    roughness: 0.85
  });
  const blueRoofMat = new THREE.MeshStandardMaterial({
    color: '#0b2d72',
    roughness: 0.35,
    metalness: 0.25
  });
  const whiteTrimMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.4
  });
  const blackFrameMat = new THREE.MeshStandardMaterial({
    color: '#1e2229',
    roughness: 0.4,
    metalness: 0.4
  });
  const breezeTextures = createBreezeBlockTextures(6, 3);
  const breezeBlockMat = new THREE.MeshStandardMaterial({
    map: breezeTextures.map,
    alphaMap: breezeTextures.alphaMap,
    transparent: true,
    alphaTest: 0.3,
    side: THREE.DoubleSide,
    roughness: 0.8
  });
  const floor1WallTex = createFloor1WallTexture();
  const floor1WallMat = new THREE.MeshStandardMaterial({
    map: floor1WallTex,
    roughness: 0.75
  });

  // ============================================================================
  // ENVIRONMENT: PRONTERA PARKLAND & GROUND
  // ============================================================================
  const envGroup = new THREE.Group();
  scene.add(envGroup);

  // Main Prontera Grass Island
  const grassGeo = new THREE.CylinderGeometry(48, 50, 1.2, 64);
  const grassMat = new THREE.MeshStandardMaterial({ color: '#5da63b', roughness: 0.9 });
  const grassMesh = new THREE.Mesh(grassGeo, grassMat);
  grassMesh.position.y = -0.6;
  grassMesh.receiveShadow = true;
  envGroup.add(grassMesh);

  // Concrete Foundation Plinth under Building
  const plinthGeo = new THREE.BoxGeometry(22.0, 0.45, 9.2);
  const plinthMat = new THREE.MeshStandardMaterial({ color: '#c9c5bc', roughness: 0.85 });
  const plinth = new THREE.Mesh(plinthGeo, plinthMat);
  plinth.position.set(0, 0.225, -0.35);
  plinth.receiveShadow = true;
  plinth.castShadow = true;
  envGroup.add(plinth);

  // White Perimeter Wall on Left Side (matching render background)
  const perimeterWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 2.2, 16),
    new THREE.MeshStandardMaterial({ color: '#f0ede6', roughness: 0.8 })
  );
  perimeterWall.position.set(-12.2, 1.1, -1.5);
  perimeterWall.castShadow = true;
  perimeterWall.receiveShadow = true;
  envGroup.add(perimeterWall);

  // ============================================================================
  // ASPHALT PARKING LOT WITH YELLOW ANGLED LINES & 3D CARS
  // ============================================================================
  const parkingCanvas = document.createElement('canvas');
  parkingCanvas.width = 1024;
  parkingCanvas.height = 512;
  const pCtx = parkingCanvas.getContext('2d')!;
  // Dark asphalt base
  pCtx.fillStyle = '#36393f';
  pCtx.fillRect(0, 0, 1024, 512);
  // Subtle noise
  for (let i = 0; i < 4000; i++) {
    pCtx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)';
    pCtx.fillRect(Math.random() * 1024, Math.random() * 512, 3, 3);
  }
  // Yellow angled parking lines (matching the new photo!)
  pCtx.strokeStyle = '#eab308';
  pCtx.lineWidth = 10;
  pCtx.beginPath();
  pCtx.moveTo(60, 60);
  pCtx.lineTo(960, 60);
  pCtx.stroke();

  for (let i = 0; i <= 7; i++) {
    const x = 100 + i * 118;
    pCtx.beginPath();
    pCtx.moveTo(x, 60);
    pCtx.lineTo(x - 65, 380);
    pCtx.stroke();
  }

  const parkingTex = new THREE.CanvasTexture(parkingCanvas);
  const parkingLot = new THREE.Mesh(
    new THREE.BoxGeometry(24, 0.08, 10.5),
    new THREE.MeshStandardMaterial({ map: parkingTex, roughness: 0.85 })
  );
  parkingLot.position.set(0, 0.04, 10.2);
  parkingLot.receiveShadow = true;
  envGroup.add(parkingLot);

  // Helper to build a sleek 3D Sedan Car
  function createSedanCar(bodyColor: string, rotY: number): THREE.Group {
    const car = new THREE.Group();
    const paintMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.25,
      metalness: 0.5
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.1,
      metalness: 0.8
    });
    const wheelMat = new THREE.MeshStandardMaterial({ color: '#171717', roughness: 0.8 });

    // Lower body
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.65, 4.1), paintMat);
    chassis.position.y = 0.5;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    car.add(chassis);

    // Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.55, 2.15), paintMat);
    cabin.position.set(0, 1.05, -0.15);
    cabin.castShadow = true;
    car.add(cabin);

    // Windows
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.45, 2.2), glassMat);
    windshield.position.set(0, 1.03, -0.15);
    car.add(windshield);

    // Taillights & Headlights
    const tailMat = new THREE.MeshBasicMaterial({ color: '#ef4444' });
    const lTail = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.06), tailMat);
    lTail.position.set(-0.6, 0.6, 2.05);
    const rTail = lTail.clone();
    rTail.position.x = 0.6;
    car.add(lTail, rTail);

    // 4 Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    [
      [-0.9, 0.32, 1.25],
      [0.9, 0.32, 1.25],
      [-0.9, 0.32, -1.25],
      [0.9, 0.32, -1.25]
    ].forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(wx, wy, wz);
      wheel.castShadow = true;
      car.add(wheel);
    });

    car.rotation.y = rotY;
    return car;
  }

  // White Sedan on left (matching new photo!)
  const whiteCar = createSedanCar('#f8fafc', 0.22);
  whiteCar.position.set(-7.6, 0.08, 8.3);
  envGroup.add(whiteCar);

  // Silver/Gray Sedan on right (matching new photo!)
  const silverCar = createSedanCar('#64748b', 0.22);
  silverCar.position.set(8.2, 0.08, 8.7);
  envGroup.add(silverCar);

  // ============================================================================
  // FRONT FLOWER GARDEN & TRIMMED HEDGES (Matching Render)
  // ============================================================================
  function createFlowerBedSection(startX: number, endX: number) {
    const length = Math.abs(endX - startX);
    const centerX = (startX + endX) / 2;
    const bedGroup = new THREE.Group();

    // Trimmed low boxwood front & side hedge
    const hedgeMat = new THREE.MeshStandardMaterial({ color: '#2d5a1e', roughness: 0.9 });
    const frontHedge = new THREE.Mesh(new THREE.BoxGeometry(length, 0.42, 0.38), hedgeMat);
    frontHedge.position.set(centerX, 0.21, 4.75);
    frontHedge.castShadow = true;
    frontHedge.receiveShadow = true;
    bedGroup.add(frontHedge);

    // Soil base
    const soil = new THREE.Mesh(
      new THREE.BoxGeometry(length, 0.2, 1.1),
      new THREE.MeshStandardMaterial({ color: '#3e2723', roughness: 0.95 })
    );
    soil.position.set(centerX, 0.1, 4.15);
    bedGroup.add(soil);

    // Colorful flower bushes & topiary cones
    const flowerColors = ['#e11d48', '#f472b6', '#ffffff', '#a855f7', '#fb7185'];
    const bushGeo = new THREE.DodecahedronGeometry(0.32, 1);
    const coneGeo = new THREE.ConeGeometry(0.28, 0.95, 12);
    const coneMat = new THREE.MeshStandardMaterial({ color: '#1e4620', roughness: 0.85 });

    const count = Math.floor(length * 2.2);
    for (let i = 0; i < count; i++) {
      const fx = startX + 0.35 + (i / count) * (length - 0.7);
      const fz = 3.85 + (i % 2) * 0.42;

      // Occasional conical topiary shrub
      if (i % 4 === 1) {
        const cone = new THREE.Mesh(coneGeo, coneMat);
        cone.position.set(fx, 0.55, 3.9);
        cone.castShadow = true;
        bedGroup.add(cone);
      } else {
        const color = flowerColors[i % flowerColors.length];
        const bush = new THREE.Mesh(
          bushGeo,
          new THREE.MeshStandardMaterial({ color, roughness: 0.7 })
        );
        bush.position.set(fx, 0.38, fz);
        bush.scale.set(1.1, 0.85, 1.1);
        bush.castShadow = true;
        bedGroup.add(bush);
      }
    }

    envGroup.add(bedGroup);
  }

  // Left flower bed (in front of rooms 101-102) & Right flower bed (in front of rooms 103-105)
  createFlowerBedSection(-10.5, -3.35);
  createFlowerBedSection(-0.25, 10.5);

  // ============================================================================
  // MAIN 3-STORY BUILDING ARCHITECTURE (True Volumetric 3D)
  // ============================================================================
  const buildingGroup = new THREE.Group();
  scene.add(buildingGroup);

  // 1. Main Building Core Box (Back & Side Structural Walls)
  // Spans X: -10.4 to +10.4 (20.8m), Y: 0.45 to 10.05 (9.6m), Z: -4.5 to +1.8 (6.3m)
  const coreBox = new THREE.Mesh(
    new THREE.BoxGeometry(20.76, 9.6, 6.3),
    whiteStuccoMat
  );
  coreBox.position.set(0, 5.25, -1.35);
  coreBox.castShadow = true;
  coreBox.receiveShadow = true;
  buildingGroup.add(coreBox);

  // Side Wall Windows & Horizontal Timber Bands (Left X=-10.4 and Right X=+10.4)
  [1, 2, 3].forEach(floorIdx => {
    const floorBaseY = 0.45 + (floorIdx - 1) * 3.2;

    // Floor Slab extending to front veranda (Z = -4.5 to +3.65)
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(20.9, 0.24, 8.2),
      whiteStuccoMat
    );
    slab.position.set(0, floorBaseY, -0.45);
    slab.receiveShadow = true;
    buildingGroup.add(slab);

    // Warm Wooden Fascia Band wrapping front & sides at each floor level
    const frontBeam = new THREE.Mesh(new THREE.BoxGeometry(21.0, 0.34, 0.28), woodMat);
    frontBeam.position.set(0, floorBaseY + 0.05, 3.6);
    frontBeam.castShadow = true;
    buildingGroup.add(frontBeam);

    const leftBeam = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, 8.25), woodMat);
    leftBeam.position.set(-10.4, floorBaseY + 0.05, -0.45);
    const rightBeam = leftBeam.clone();
    rightBeam.position.x = 10.4;
    buildingGroup.add(leftBeam, rightBeam);

    // Side Windows on Right Wall (X = +10.4) & Left Wall (X = -10.4) matching render!
    [-1, 1].forEach(sideSign => {
      const winGroup = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.35, 1.25), blackFrameMat);
      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 1.2, 1.1),
        new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.15, metalness: 0.7 })
      );
      // Window bars
      const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.25, 0.05), blackFrameMat);
      const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 1.15), blackFrameMat);
      winGroup.add(frame, glass, vBar, hBar);
      winGroup.position.set(sideSign * 10.38, floorBaseY + 1.75, -0.6);
      buildingGroup.add(winGroup);
    });
  });

  // Top 3rd Floor Ceiling / Attic Wooden Fascia (Y = 10.05 to 10.75)
  const topAtticBox = new THREE.Mesh(new THREE.BoxGeometry(20.9, 0.7, 8.2), woodMat);
  topAtticBox.position.set(0, 10.4, -0.45);
  topAtticBox.castShadow = true;
  buildingGroup.add(topAtticBox);

  // Main Overhanging Roof with White Trim & Royal-Blue Deck (Y = 10.75 to 11.05)
  const mainRoofTrim = new THREE.Mesh(new THREE.BoxGeometry(22.2, 0.18, 9.4), whiteTrimMat);
  mainRoofTrim.position.set(0, 10.84, -0.4);
  mainRoofTrim.castShadow = true;
  buildingGroup.add(mainRoofTrim);

  const mainRoofBlue = new THREE.Mesh(new THREE.BoxGeometry(21.8, 0.22, 9.0), blueRoofMat);
  mainRoofBlue.position.set(0, 11.0, -0.4);
  buildingGroup.add(mainRoofBlue);

  // 2. Sloped Royal-Blue Awning above 3rd Floor Veranda (Signature feature in render!)
  const awningGroup = new THREE.Group();
  const awningRoof = new THREE.Mesh(new THREE.BoxGeometry(21.4, 0.1, 1.65), blueRoofMat);
  const awningTrim = new THREE.Mesh(new THREE.BoxGeometry(21.44, 0.12, 1.68), darkWoodMat);
  awningTrim.position.y = -0.04;
  awningGroup.add(awningRoof, awningTrim);
  awningGroup.position.set(0, 9.95, 3.85);
  awningGroup.rotation.x = 0.18; // Sloped forward
  awningGroup.castShadow = true;
  buildingGroup.add(awningGroup);

  // 3. Rooftop Penthouse / Stairwell Overrun (ห้องดาดฟ้าชั้นบนสุดตรงกลางตามรูป!)
  const penthouseGroup = new THREE.Group();
  // White lower body
  const phBody = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.35, 3.8), whiteStuccoMat);
  phBody.position.set(-1.3, 11.7, -0.8);
  phBody.castShadow = true;
  phBody.receiveShadow = true;
  penthouseGroup.add(phBody);

  // Wood upper band on penthouse
  const phWood = new THREE.Mesh(new THREE.BoxGeometry(5.26, 0.42, 3.86), woodMat);
  phWood.position.set(-1.3, 12.55, -0.8);
  penthouseGroup.add(phWood);

  // Overhanging white flat roof on penthouse
  const phRoof = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.14, 4.8), whiteTrimMat);
  phRoof.position.set(-1.3, 12.82, -0.8);
  phRoof.rotation.z = -0.02;
  phRoof.castShadow = true;
  penthouseGroup.add(phRoof);

  // Small rectangular windows on penthouse front & side
  const phWin1 = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.55, 0.1), blackFrameMat);
  phWin1.position.set(-2.3, 11.8, 1.12);
  const phWin2 = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.45, 0.1), blackFrameMat);
  phWin2.position.set(-0.2, 11.85, 1.12);
  penthouseGroup.add(phWin1, phWin2);

  buildingGroup.add(penthouseGroup);

  // 4. Outer Veranda Wooden Columns & Side Breeze-Block Returns
  const colPositionsX = [-10.3, -6.8, -3.2, -0.4, 3.2, 6.8, 10.3];
  colPositionsX.forEach(cx => {
    // Front column at Z = 3.55
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.22, 9.65, 0.22), woodMat);
    col.position.set(cx, 5.25, 3.55);
    col.castShadow = true;
    buildingGroup.add(col);

    // Rear corner pilasters on outer corners
    if (Math.abs(cx) > 10) {
      const rearCol = col.clone();
      rearCol.position.z = 1.8;
      const backCornerCol = col.clone();
      backCornerCol.position.z = -4.5;
      buildingGroup.add(rearCol, backCornerCol);
    }
  });

  // Side veranda breeze-block railings on Left (X = -10.3) and Right (X = +10.3)
  [1, 2, 3].forEach(floorIdx => {
    const floorBaseY = 0.45 + (floorIdx - 1) * 3.2;
    [-10.3, 10.3].forEach(sideX => {
      const sideRailing = new THREE.Mesh(
        new THREE.PlaneGeometry(1.75, 1.05),
        breezeBlockMat
      );
      sideRailing.rotation.y = Math.PI / 2;
      sideRailing.position.set(sideX, floorBaseY + 0.68, 2.68);
      buildingGroup.add(sideRailing);

      const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 1.75), woodMat);
      topRail.position.set(sideX, floorBaseY + 1.22, 2.68);
      buildingGroup.add(topRail);
    });
  });

  // 5. Center Stairwell Core (X = -3.2 to -0.4, width = 2.8m)
  const centerCoreGroup = new THREE.Group();
  buildingGroup.add(centerCoreGroup);

  // Floors 2 & 3 Vertical Wooden Louvers/Slats (ระแนงไม้แนวตั้งตรงกลาง)
  const numSlats = 13;
  for (let i = 0; i < numSlats; i++) {
    const sx = -3.05 + (i / (numSlats - 1)) * 2.5;
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.09, 6.4, 0.18), woodMat);
    slat.position.set(sx, 6.85, 3.55);
    slat.castShadow = true;
    centerCoreGroup.add(slat);
  }

  // Floor 1 Main Entrance White-Framed Glass Door & Canopy
  const entranceFrame = new THREE.Mesh(
    new THREE.BoxGeometry(2.7, 3.1, 0.15),
    whiteTrimMat
  );
  entranceFrame.position.set(-1.8, 2.0, 3.5);
  centerCoreGroup.add(entranceFrame);

  const entranceGlass = new THREE.Mesh(
    new THREE.BoxGeometry(2.45, 2.85, 0.18),
    new THREE.MeshStandardMaterial({
      color: '#cfe8fc',
      roughness: 0.1,
      metalness: 0.3,
      transparent: true,
      opacity: 0.78
    })
  );
  entranceGlass.position.set(-1.8, 2.0, 3.5);
  centerCoreGroup.add(entranceGlass);

  // White Mullions on Glass Door
  const doorMidV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.85, 0.22), whiteTrimMat);
  doorMidV.position.set(-1.8, 2.0, 3.5);
  const doorTransomH = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.08, 0.22), whiteTrimMat);
  doorTransomH.position.set(-1.8, 2.75, 3.5);
  centerCoreGroup.add(doorMidV, doorTransomH);

  // Projecting Royal-Blue Canopy over 1st Floor Entrance
  const entranceCanopy = new THREE.Group();
  const canopyBlue = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 1.6), blueRoofMat);
  const canopyWood = new THREE.Mesh(new THREE.BoxGeometry(3.26, 0.12, 1.64), woodMat);
  canopyWood.position.y = -0.05;
  entranceCanopy.add(canopyBlue, canopyWood);
  entranceCanopy.position.set(-1.8, 3.72, 4.15);
  entranceCanopy.rotation.x = 0.16;
  entranceCanopy.castShadow = true;
  centerCoreGroup.add(entranceCanopy);

  // Terracotta / Wood Entrance Steps (4 steps leading down to parking lot)
  const stepMat = new THREE.MeshStandardMaterial({ color: '#b5633a', roughness: 0.7 });
  for (let s = 0; s < 4; s++) {
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, 0.12, 0.35 + (3 - s) * 0.32),
      stepMat
    );
    step.position.set(-1.8, 0.06 + s * 0.11, 4.25 - s * 0.16);
    step.receiveShadow = true;
    step.castShadow = true;
    centerCoreGroup.add(step);
  }

  // ============================================================================
  // 15 INTERACTIVE ROOM BAYS (Left-to-Right: X01, X02 | Stairs | X03, X04, X05)
  // ============================================================================
  const roomsContainer = new THREE.Group();
  buildingGroup.add(roomsContainer);

  const interactiveHitMeshes: THREE.Mesh[] = [];
  const roomLights: THREE.PointLight[] = [];
  const roomGlassMaterials: Map<string, THREE.MeshStandardMaterial> = new Map();
  let currentRoomsData: Room3DData[] = [...initialRooms];
  let isNightState = false;

  function getBayCenterX(roomNumber: string): number {
    const idx = parseInt(roomNumber, 10) % 100; // 1..5
    if (idx === 1) return -8.55;
    if (idx === 2) return -5.0;
    if (idx === 3) return 1.4;
    if (idx === 4) return 5.0;
    return 8.55;
  }

  function buildRoomsMeshes(rooms: Room3DData[]) {
    // Clear previous
    while (roomsContainer.children.length > 0) {
      roomsContainer.remove(roomsContainer.children[0]);
    }
    interactiveHitMeshes.length = 0;
    roomLights.length = 0;
    roomGlassMaterials.clear();

    rooms.forEach(room => {
      const bayX = getBayCenterX(room.roomNumber);
      const floorBaseY = 0.45 + (room.floor - 1) * 3.2;
      const isFloor1 = room.floor === 1;

      const roomGroup = new THREE.Group();
      roomGroup.position.set(bayX, floorBaseY, 0);
      roomsContainer.add(roomGroup);

      // 1. Front Veranda Breeze-Block Railing (at Z = 3.55)
      const railingPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(3.38, 1.05),
        breezeBlockMat
      );
      railingPlane.position.set(0, 0.68, 3.55);
      railingPlane.castShadow = true;
      roomGroup.add(railingPlane);

      // Wooden Top & Bottom Handrails for the Breeze-Block Railing
      const topHandrail = new THREE.Mesh(new THREE.BoxGeometry(3.45, 0.11, 0.16), woodMat);
      topHandrail.position.set(0, 1.24, 3.55);
      const midHandrail = new THREE.Mesh(new THREE.BoxGeometry(3.45, 0.07, 0.14), woodMat);
      midHandrail.position.set(0, 0.88, 3.55);
      const botHandrail = new THREE.Mesh(new THREE.BoxGeometry(3.45, 0.1, 0.16), woodMat);
      botHandrail.position.set(0, 0.18, 3.55);
      roomGroup.add(topHandrail, midHandrail, botHandrail);

      // 2. Inner Room Front Wall (at Z = 1.82)
      const innerWall = new THREE.Mesh(
        new THREE.BoxGeometry(3.48, 3.0, 0.12),
        isFloor1 ? floor1WallMat : whiteStuccoMat
      );
      innerWall.position.set(0, 1.55, 1.82);
      innerWall.receiveShadow = true;
      roomGroup.add(innerWall);

      // Partition wall between rooms on the veranda
      const partition = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 3.0, 1.75),
        whiteStuccoMat
      );
      partition.position.set(1.74, 1.55, 2.68);
      roomGroup.add(partition);

      // 3. Wooden Door (at X = +0.95 on Left wing, or -1.05 on Right wing, matching render!)
      const isLeftWing = bayX < -3;
      const doorX = isLeftWing ? 1.05 : -1.05;
      const winX = isLeftWing ? -0.35 : 0.3;

      const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.96, 2.15, 0.16), darkWoodMat);
      doorFrame.position.set(doorX, 1.12, 1.84);
      const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(0.84, 2.05, 0.18), woodMat);
      doorPanel.position.set(doorX, 1.1, 1.85);
      roomGroup.add(doorFrame, doorPanel);

      // 4. Window (Floor 1: Round Japanese Marumado Window; Floor 2 & 3: Square 2-Pane Window)
      let winEmissive = '#ffdfa0';
      let winIntensity = isNightState ? 1.2 : 0.25;
      if (room.status === 'AVAILABLE') {
        winEmissive = '#4ade80';
        winIntensity = isNightState ? 0.9 : 0.35;
      } else if (room.isOverdue) {
        winEmissive = '#fb7185';
        winIntensity = isNightState ? 1.1 : 0.45;
      }

      const glassMat = new THREE.MeshStandardMaterial({
        color: '#1e293b',
        emissive: new THREE.Color(winEmissive),
        emissiveIntensity: winIntensity,
        roughness: 0.15,
        metalness: 0.6
      });
      roomGlassMaterials.set(room.roomNumber, glassMat);

      if (isFloor1) {
        // Round Japanese Marumado Window on Floor 1!
        const torusFrame = new THREE.Mesh(
          new THREE.TorusGeometry(0.46, 0.06, 16, 32),
          darkWoodMat
        );
        torusFrame.position.set(winX, 1.35, 1.89);
        const circleGlass = new THREE.Mesh(
          new THREE.CircleGeometry(0.44, 32),
          glassMat
        );
        circleGlass.position.set(winX, 1.35, 1.88);
        // Vertical security bars inside round window
        for (let b = -1; b <= 1; b++) {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.78, 0.04), blackFrameMat);
          bar.position.set(winX + b * 0.16, 1.35, 1.9);
          roomGroup.add(bar);
        }
        roomGroup.add(torusFrame, circleGlass);
      } else {
        // Rectangular Black-Framed Window with Mullions on Floors 2 & 3!
        const rectFrame = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.32, 0.16), blackFrameMat);
        rectFrame.position.set(winX, 1.72, 1.84);
        const rectGlass = new THREE.Mesh(new THREE.BoxGeometry(1.06, 1.2, 0.18), glassMat);
        rectGlass.position.set(winX, 1.72, 1.85);
        // Center vertical & horizontal bars
        const vMullion = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.22, 0.2), blackFrameMat);
        vMullion.position.set(winX, 1.72, 1.86);
        const hMullion = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.04, 0.2), blackFrameMat);
        hMullion.position.set(winX, 1.72, 1.86);
        roomGroup.add(rectFrame, rectGlass, vMullion, hMullion);
      }

      // 5. Room Number & Status Badge Sprite mounted neatly on upper veranda
      const badge = createRoomBadgeSprite(room);
      badge.position.set(0, 2.65, 3.72);
      roomGroup.add(badge);

      // 6. Invisible Raycast Hit Box for Hover & Click
      const hitGeo = new THREE.BoxGeometry(3.45, 3.05, 2.2);
      const hitMat = new THREE.MeshBasicMaterial({
        color: '#22c55e',
        transparent: true,
        opacity: 0.0,
        depthWrite: false
      });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.position.set(0, 1.55, 2.7);
      hitMesh.userData = { room };
      roomGroup.add(hitMesh);
      interactiveHitMeshes.push(hitMesh);
    });
  }

  buildRoomsMeshes(currentRoomsData);

  // ============================================================================
  // RAGNAROK ONLINE (PRONTERA FIELD) TREES, SIGNPOST & CUTE 3D CHARACTERS
  // ============================================================================
  const roGroup = new THREE.Group();
  scene.add(roGroup);

  // Stylized Lush Prontera 3D Trees around the building
  function createPronteraTree(x: number, z: number, scale = 1, blossomColor = '#3a8c28') {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28 * scale, 0.42 * scale, 2.6 * scale, 10),
      new THREE.MeshStandardMaterial({ color: '#5c3a21', roughness: 0.9 })
    );
    trunk.position.y = 1.3 * scale;
    trunk.castShadow = true;
    tree.add(trunk);

    const leafMat = new THREE.MeshStandardMaterial({ color: blossomColor, roughness: 0.75 });
    const puffs = [
      [0, 3.2, 0, 1.6],
      [-0.9, 2.6, 0.5, 1.2],
      [0.9, 2.7, -0.4, 1.25],
      [0.3, 2.5, 0.9, 1.15],
      [-0.4, 2.8, -0.8, 1.2]
    ];
    puffs.forEach(([px, py, pz, r]) => {
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(r * scale, 2), leafMat);
      puff.position.set(px * scale, py * scale, pz * scale);
      puff.castShadow = true;
      puff.receiveShadow = true;
      tree.add(puff);
    });

    tree.position.set(x, 0, z);
    roGroup.add(tree);
  }

  // Trees framing the dormitory (Left, Right, and Background Park)
  createPronteraTree(-15.5, 2.5, 1.35, '#3b8726');
  createPronteraTree(-16.8, -4.5, 1.5, '#2e6f1e');
  createPronteraTree(15.2, 3.0, 1.3, '#45992e');
  createPronteraTree(16.5, -4.0, 1.45, '#8b46b8'); // Purple Jacaranda tree on right!
  createPronteraTree(-11.0, -9.5, 1.25, '#3b8726');
  createPronteraTree(11.5, -9.5, 1.3, '#f472b6'); // Pink Sakura / Prontera blossom tree!

  // Classic RO Wooden Directional Signpost near Parking Entrance
  const signpost = new THREE.Group();
  const postPole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.2, 8), darkWoodMat);
  postPole.position.y = 1.1;
  postPole.castShadow = true;
  const board1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.38, 0.1), woodMat);
  board1.position.set(0.2, 1.85, 0);
  board1.rotation.z = 0.08;
  const board2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 0.1), woodMat);
  board2.position.set(-0.2, 1.38, 0);
  board2.rotation.z = -0.06;
  signpost.add(postPole, board1, board2);
  signpost.position.set(-12.5, 0, 8.5);
  signpost.rotation.y = 0.4;
  roGroup.add(signpost);

  // Cute 3D Bouncing Porings & Poporings!
  interface AnimatedPoring {
    group: THREE.Group;
    body: THREE.Mesh;
    baseY: number;
    phase: number;
    speed: number;
  }
  const porings: AnimatedPoring[] = [];

  function create3DPoring(
    x: number,
    z: number,
    colorHex: string,
    emoteSymbol: string,
    emoteColor: string,
    phaseOffset: number
  ) {
    const pGroup = new THREE.Group();
    pGroup.position.set(x, 0.08, z);

    // Glossy translucent jelly body
    const bodyGeo = new THREE.SphereGeometry(0.55, 24, 20);
    // Flatten bottom slightly
    const pos = bodyGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const py = pos.getY(i);
      if (py < 0) pos.setY(i, py * 0.65);
      else pos.setY(i, py * 1.12);
    }
    bodyGeo.computeVertexNormals();

    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: colorHex,
      roughness: 0.15,
      metalness: 0.05,
      transmission: 0.35,
      thickness: 0.5,
      clearcoat: 1.0
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.38;
    body.castShadow = true;
    pGroup.add(body);

    // Cute Eyes on front of Poring
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#1e1b18' });
    const lEye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), eyeMat);
    lEye.position.set(-0.18, 0.05, 0.48);
    const rEye = lEye.clone();
    rEye.position.x = 0.18;
    body.add(lEye, rEye);

    // Little tip on top of Poring head
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), bodyMat);
    tip.position.set(0, 0.62, 0);
    body.add(tip);

    // Emote Bubble floating above
    const emote = createEmoteSprite(emoteSymbol, emoteColor);
    emote.position.set(0, 1.55, 0);
    pGroup.add(emote);

    roGroup.add(pGroup);
    porings.push({
      group: pGroup,
      body,
      baseY: 0.08,
      phase: phaseOffset,
      speed: 3.2
    });
  }

  // Pink Poring welcoming near front steps
  create3DPoring(-3.8, 6.2, '#ff7597', '♥', '#e11d48', 0);
  // Green Poporing near right flower garden
  create3DPoring(4.5, 6.8, '#4ade80', '♪', '#16a34a', 2.1);
  // Orange Drops Poring near left garden
  create3DPoring(-11.2, 5.2, '#fb923c', '!', '#ea580c', 4.2);

  // Cute 3D Kafra Receptionist Character standing by the main entrance steps
  const kafraGroup = new THREE.Group();
  kafraGroup.position.set(-0.1, 0.08, 5.4);
  kafraGroup.rotation.y = -0.25;

  // Skirt / Dress cone
  const dress = new THREE.Mesh(
    new THREE.ConeGeometry(0.42, 0.95, 16),
    new THREE.MeshStandardMaterial({ color: '#991b1b', roughness: 0.6 })
  );
  dress.position.y = 0.55;
  dress.castShadow = true;
  // White apron front
  const apron = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.82, 0.25),
    new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 })
  );
  apron.position.set(0, 0.56, 0.18);
  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 20, 20),
    new THREE.MeshStandardMaterial({ color: '#fde68a', roughness: 0.5 })
  );
  head.position.y = 1.22;
  head.castShadow = true;
  // Hair & Maid Headband
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 16, 16),
    new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.8 })
  );
  hair.position.set(0, 1.26, -0.05);
  const headband = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.12, 0.15),
    new THREE.MeshStandardMaterial({ color: '#ffffff' })
  );
  headband.position.set(0, 1.48, 0.08);
  const kafraEmote = createEmoteSprite('!', '#d97706');
  kafraEmote.position.set(0, 2.1, 0);

  kafraGroup.add(dress, apron, head, hair, headband, kafraEmote);
  roGroup.add(kafraGroup);

  // Prontera Street Lanterns (Glow warm at night!)
  const streetLights: THREE.PointLight[] = [];
  [-11.5, 11.5].forEach(lx => {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 3.4, 12),
      blackFrameMat
    );
    pole.position.set(lx, 1.7, 5.5);
    pole.castShadow = true;
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 16, 16),
      new THREE.MeshStandardMaterial({
        color: '#fef08a',
        emissive: '#f59e0b',
        emissiveIntensity: 0.8
      })
    );
    bulb.position.set(lx, 3.5, 5.5);
    roGroup.add(pole, bulb);

    const pLight = new THREE.PointLight('#fbbf24', 0, 14);
    pLight.position.set(lx, 3.5, 5.5);
    scene.add(pLight);
    streetLights.push(pLight);
  });

  // ============================================================================
  // RAYCASTING (HOVER & CLICK ON ANY OF THE 15 ROOMS)
  // ============================================================================
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let hoveredMesh: THREE.Mesh | null = null;
  let pointerDownPos = { x: 0, y: 0 };

  const onPointerMove = (e: MouseEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(interactiveHitMeshes, false);

    if (hits.length > 0) {
      const hit = hits[0].object as THREE.Mesh;
      if (hoveredMesh !== hit) {
        if (hoveredMesh) {
          (hoveredMesh.material as THREE.MeshBasicMaterial).opacity = 0.0;
        }
        hoveredMesh = hit;
        (hoveredMesh.material as THREE.MeshBasicMaterial).opacity = 0.28;
        renderer.domElement.style.cursor = 'pointer';
      }
      const room: Room3DData = hit.userData.room;
      callbacks.onHoverRoom(room, { x: e.clientX - rect.left, y: e.clientY - rect.top });
    } else {
      if (hoveredMesh) {
        (hoveredMesh.material as THREE.MeshBasicMaterial).opacity = 0.0;
        hoveredMesh = null;
        renderer.domElement.style.cursor = 'grab';
        callbacks.onHoverRoom(null);
      }
    }
  };

  const onPointerDown = (e: MouseEvent) => {
    pointerDownPos = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: MouseEvent) => {
    const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
    if (dist > 6) return; // Dragged camera, not a click

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(interactiveHitMeshes, false);
    if (hits.length > 0) {
      const room: Room3DData = hits[0].object.userData.room;
      callbacks.onSelectRoom(room.roomNumber);
    }
  };

  renderer.domElement.addEventListener('mousemove', onPointerMove);
  renderer.domElement.addEventListener('mousedown', onPointerDown);
  renderer.domElement.addEventListener('mouseup', onPointerUp);

  // Resize Handler
  const onResize = () => {
    if (!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  };
  window.addEventListener('resize', onResize);

  // Animation Loop
  let animFrameId = 0;
  const clock = new THREE.Clock();

  function animate() {
    animFrameId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // Animate Porings bouncing
    porings.forEach(p => {
      const s = Math.sin(t * p.speed + p.phase);
      const jump = Math.max(0, s);
      p.body.position.y = 0.38 + jump * 0.55;
      // Squash & stretch
      const stretch = 1 + jump * 0.18 - (s < 0 ? Math.abs(s) * 0.12 : 0);
      const squash = 1 / Math.sqrt(stretch);
      p.body.scale.set(squash, stretch, squash);
    });

    // Gentle Kafra wave
    kafraGroup.position.y = 0.08 + Math.sin(t * 2) * 0.03;

    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  // Controller API
  return {
    updateRooms(newRooms: Room3DData[]) {
      currentRoomsData = [...newRooms];
      buildRoomsMeshes(currentRoomsData);
    },
    setNightMode(isNight: boolean) {
      isNightState = isNight;
      if (isNight) {
        scene.background = new THREE.Color('#0b132b');
        scene.fog = new THREE.FogExp2('#0b132b', 0.01);
        ambientLight.intensity = 0.25;
        hemiLight.intensity = 0.2;
        sunLight.intensity = 0.35;
        sunLight.color.set('#93c5fd');
        streetLights.forEach(l => (l.intensity = 3.5));
      } else {
        scene.background = new THREE.Color('#8ec5fc');
        scene.fog = new THREE.FogExp2('#a8d8ff', 0.008);
        ambientLight.intensity = 0.75;
        hemiLight.intensity = 0.55;
        sunLight.intensity = 1.85;
        sunLight.color.set('#fff5e0');
        streetLights.forEach(l => (l.intensity = 0));
      }
      buildRoomsMeshes(currentRoomsData);
    },
    resetCamera() {
      camera.position.set(-14.5, 11.5, 24.5);
      controls.target.set(0.5, 5.2, 1.0);
      controls.update();
    },
    focusFloor(floor: number | null) {
      if (floor === null) {
        camera.position.set(-14.5, 11.5, 24.5);
        controls.target.set(0.5, 5.2, 1.0);
      } else {
        const y = 0.45 + (floor - 1) * 3.2 + 1.5;
        camera.position.set(0, y + 2.2, 17.5);
        controls.target.set(0, y, 1.8);
      }
      controls.update();
    },
    dispose() {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('mousemove', onPointerMove);
      renderer.domElement.removeEventListener('mousedown', onPointerDown);
      renderer.domElement.removeEventListener('mouseup', onPointerUp);
      controls.dispose();
      renderer.dispose();
    }
  };
}
