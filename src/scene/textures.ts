import * as THREE from 'three';

export interface ProceduralTextureSet {
  stoneAlbedo: THREE.CanvasTexture;
  stoneBump: THREE.CanvasTexture;
  roofAlbedo: THREE.CanvasTexture;
  roofBump: THREE.CanvasTexture;
  plasterAlbedo: THREE.CanvasTexture;
  plasterBump: THREE.CanvasTexture;
  namakoAlbedo: THREE.CanvasTexture;
  namakoBump: THREE.CanvasTexture;
  woodAlbedo: THREE.CanvasTexture;
  woodBump: THREE.CanvasTexture;
  hinokiAlbedo: THREE.CanvasTexture;
  hinokiBump: THREE.CanvasTexture;
  shojiEmissive: THREE.CanvasTexture;
  graniteAlbedo: THREE.CanvasTexture;
  graniteBump: THREE.CanvasTexture;
  steppingStoneAlbedo: THREE.CanvasTexture;
  steppingStoneBump: THREE.CanvasTexture;
  mountainAlbedo: THREE.CanvasTexture;
  mountainBump: THREE.CanvasTexture;
  terrainAlbedo: THREE.CanvasTexture;
  pondBedAlbedo: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  petalAlpha: THREE.CanvasTexture;
  sakuraBarkAlbedo: THREE.CanvasTexture;
  sakuraBarkBump: THREE.CanvasTexture;
  sakuraClusterAlpha: THREE.CanvasTexture;
  sakuraLeafAlpha: THREE.CanvasTexture;
  koiTextures: THREE.CanvasTexture[];
  redBrickAlbedo: THREE.CanvasTexture;
  redBrickBump: THREE.CanvasTexture;
  slateTileAlbedo: THREE.CanvasTexture;
  slateTileBump: THREE.CanvasTexture;
  makranaMarbleAlbedo: THREE.CanvasTexture;
  makranaMarbleBump: THREE.CanvasTexture;
  sandstoneAlbedo: THREE.CanvasTexture;
  sandstoneBump: THREE.CanvasTexture;
  jaaliAlpha: THREE.CanvasTexture;
  persianTileAlbedo: THREE.CanvasTexture;
  persianTileBump: THREE.CanvasTexture;
  clockFaceAlbedo: THREE.CanvasTexture;
  stainedWindowAlbedo: THREE.CanvasTexture;
  snowTerrainAlbedo: THREE.CanvasTexture;
  desertSandAlbedo: THREE.CanvasTexture;
  desertSandBump: THREE.CanvasTexture;
  lushLawnAlbedo: THREE.CanvasTexture;
  birchBarkAlbedo: THREE.CanvasTexture;
  palmFrondAlpha: THREE.CanvasTexture;
  palmBarkAlbedo: THREE.CanvasTexture;
  palmBarkBump: THREE.CanvasTexture;
  greenCanopyAlpha: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function configureTexture(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

// Deterministic pseudo-random helper so textures stay crisp and reproducible
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  const created: THREE.CanvasTexture[] = [];
  const track = (tex: THREE.CanvasTexture) => {
    created.push(tex);
    return tex;
  };

  // 1. Ishigaki polygonal castle stone wall (albedo + bump)
  const [stoneColC, stoneColCtx] = makeCanvas(512, 512);
  const [stoneBmpC, stoneBmpCtx] = makeCanvas(512, 512);
  stoneColCtx.fillStyle = '#332e2a';
  stoneColCtx.fillRect(0, 0, 512, 512);
  stoneBmpCtx.fillStyle = '#181818';
  stoneBmpCtx.fillRect(0, 0, 512, 512);

  const randStone = seeded(1742);
  const rows = 8;
  const rowH = 512 / rows;
  for (let r = 0; r < rows; r++) {
    let x = -(r % 2) * 32;
    while (x < 512) {
      const w = 52 + randStone() * 44;
      const jitterY = (randStone() - 0.5) * 6;
      const shade = Math.floor(96 + randStone() * 46);
      const warm = Math.floor(shade * 0.96);
      const cool = Math.floor(shade * 0.91);
      const moss = randStone() > 0.78 ? 14 : 0;

      stoneColCtx.fillStyle = `rgb(${shade}, ${warm + moss}, ${cool})`;
      stoneBmpCtx.fillStyle = `rgb(${150 + Math.floor(randStone() * 80)}, ${150 + Math.floor(randStone() * 80)}, ${150 + Math.floor(randStone() * 80)})`;

      const drawPoly = (ctx: CanvasRenderingContext2D, inset: number) => {
        ctx.beginPath();
        ctx.moveTo(x + inset, r * rowH + inset + jitterY);
        ctx.lineTo(x + w - inset, r * rowH + inset - jitterY * 0.5);
        ctx.lineTo(x + w - inset * 0.8, (r + 1) * rowH - inset + jitterY * 0.4);
        ctx.lineTo(x + inset * 1.1, (r + 1) * rowH - inset - jitterY);
        ctx.closePath();
        ctx.fill();
      };

      drawPoly(stoneColCtx, 3);
      drawPoly(stoneBmpCtx, 3);

      // Subtle mineral grain
      for (let g = 0; g < 18; g++) {
        const gx = x + 6 + randStone() * (w - 12);
        const gy = r * rowH + 6 + randStone() * (rowH - 12);
        stoneColCtx.fillStyle =
          randStone() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(20,18,16,0.14)';
        stoneColCtx.fillRect(gx, gy, 3, 2);
      }

      x += w;
    }
  }
  const stoneAlbedo = track(configureTexture(stoneColC, true, maxAnisotropy, 3, 2));
  const stoneBump = track(configureTexture(stoneBmpC, false, maxAnisotropy, 3, 2));

  // 2. Kawara ribbed slate roof tiles (albedo + bump)
  const [roofColC, roofColCtx] = makeCanvas(512, 512);
  const [roofBmpC, roofBmpCtx] = makeCanvas(512, 512);
  roofColCtx.fillStyle = '#2d323a';
  roofColCtx.fillRect(0, 0, 512, 512);
  roofBmpCtx.fillStyle = '#505050';
  roofBmpCtx.fillRect(0, 0, 512, 512);

  const cols = 12;
  const colW = 512 / cols;
  const tileRows = 10;
  const tileH = 512 / tileRows;
  for (let tr = 0; tr < tileRows; tr++) {
    const y0 = tr * tileH;
    // Horizontal tile overlap shadow
    const grad = roofColCtx.createLinearGradient(0, y0, 0, y0 + tileH);
    grad.addColorStop(0, '#23272e');
    grad.addColorStop(0.18, '#3c424c');
    grad.addColorStop(0.88, '#464d59');
    grad.addColorStop(1, '#1d2026');
    roofColCtx.fillStyle = grad;
    roofColCtx.fillRect(0, y0, 512, tileH);

    const bGrad = roofBmpCtx.createLinearGradient(0, y0, 0, y0 + tileH);
    bGrad.addColorStop(0, '#444');
    bGrad.addColorStop(0.85, '#c8c8c8');
    bGrad.addColorStop(1, '#222');
    roofBmpCtx.fillStyle = bGrad;
    roofBmpCtx.fillRect(0, y0, 512, tileH);
  }
  // Vertical semicircular kawara rib seams
  for (let c = 0; c < cols; c++) {
    const cx = c * colW;
    const ribGrad = roofColCtx.createLinearGradient(cx, 0, cx + colW * 0.34, 0);
    ribGrad.addColorStop(0, 'rgba(20,23,28,0.65)');
    ribGrad.addColorStop(0.5, 'rgba(130,142,158,0.28)');
    ribGrad.addColorStop(1, 'rgba(20,23,28,0.65)');
    roofColCtx.fillStyle = ribGrad;
    roofColCtx.fillRect(cx, 0, colW * 0.34, 512);

    const ribBmp = roofBmpCtx.createLinearGradient(cx, 0, cx + colW * 0.34, 0);
    ribBmp.addColorStop(0, 'rgba(40,40,40,0.9)');
    ribBmp.addColorStop(0.5, 'rgba(255,255,255,0.95)');
    ribBmp.addColorStop(1, 'rgba(40,40,40,0.9)');
    roofBmpCtx.fillStyle = ribBmp;
    roofBmpCtx.fillRect(cx, 0, colW * 0.34, 512);
  }
  const roofAlbedo = track(configureTexture(roofColC, true, maxAnisotropy, 4, 2));
  const roofBump = track(configureTexture(roofBmpC, false, maxAnisotropy, 4, 2));

  // 3. Shikkui white lime plaster (albedo + subtle trowel bump)
  const [plasterC, plasterCtx] = makeCanvas(256, 256);
  const [plasterBmpC, plasterBmpCtx] = makeCanvas(256, 256);
  plasterCtx.fillStyle = '#f2ece1';
  plasterCtx.fillRect(0, 0, 256, 256);
  plasterBmpCtx.fillStyle = '#808080';
  plasterBmpCtx.fillRect(0, 0, 256, 256);
  const randPlaster = seeded(903);
  for (let i = 0; i < 1800; i++) {
    const px = randPlaster() * 256;
    const py = randPlaster() * 256;
    const light = randPlaster() > 0.5;
    plasterCtx.fillStyle = light ? 'rgba(255,252,245,0.38)' : 'rgba(202,190,172,0.24)';
    plasterCtx.fillRect(px, py, 4, 2.5);
    plasterBmpCtx.fillStyle = light ? 'rgba(180,180,180,0.35)' : 'rgba(95,95,95,0.35)';
    plasterBmpCtx.fillRect(px, py, 4, 2.5);
  }
  const plasterAlbedo = track(configureTexture(plasterC, true, maxAnisotropy, 2, 1));
  const plasterBump = track(configureTexture(plasterBmpC, false, maxAnisotropy, 2, 1));

  // 3b. Namako-kabe Edo castle diamond-tile & raised white plaster wainscoting
  const [namakoC, namakoCtx] = makeCanvas(256, 256);
  const [namakoBmpC, namakoBmpCtx] = makeCanvas(256, 256);
  namakoCtx.fillStyle = '#24272d';
  namakoCtx.fillRect(0, 0, 256, 256);
  namakoBmpCtx.fillStyle = '#404040';
  namakoBmpCtx.fillRect(0, 0, 256, 256);
  const cell = 64;
  for (let gy = -cell; gy <= 256 + cell; gy += cell) {
    for (let gx = -cell; gx <= 256 + cell; gx += cell) {
      // Subtle slate variation inside each diamond tile
      namakoCtx.fillStyle = (gx + gy) % 128 === 0 ? '#2b3038' : '#23272e';
      namakoCtx.beginPath();
      namakoCtx.moveTo(gx, gy - cell * 0.5);
      namakoCtx.lineTo(gx + cell * 0.5, gy);
      namakoCtx.lineTo(gx, gy + cell * 0.5);
      namakoCtx.lineTo(gx - cell * 0.5, gy);
      namakoCtx.closePath();
      namakoCtx.fill();
    }
  }
  // Raised white lime-mortar diagonal lattice ribs (namako joints)
  namakoCtx.strokeStyle = '#efe8db';
  namakoCtx.lineWidth = 9;
  namakoBmpCtx.strokeStyle = '#ececec';
  namakoBmpCtx.lineWidth = 9;
  for (let offset = -256; offset <= 512; offset += cell) {
    for (const ctx of [namakoCtx, namakoBmpCtx]) {
      ctx.beginPath();
      ctx.moveTo(offset, 0);
      ctx.lineTo(offset + 256, 256);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(offset, 256);
      ctx.lineTo(offset + 256, 0);
      ctx.stroke();
    }
  }
  const namakoAlbedo = track(configureTexture(namakoC, true, maxAnisotropy, 5, 1));
  const namakoBump = track(configureTexture(namakoBmpC, false, maxAnisotropy, 5, 1));

  // 4. Aged cedar / yakisugi wood planks (albedo + bump)
  const [woodC, woodCtx] = makeCanvas(256, 256);
  const [woodBmpC, woodBmpCtx] = makeCanvas(256, 256);
  woodCtx.fillStyle = '#4c3426';
  woodCtx.fillRect(0, 0, 256, 256);
  woodBmpCtx.fillStyle = '#888888';
  woodBmpCtx.fillRect(0, 0, 256, 256);
  const randWood = seeded(411);
  for (let p = 0; p < 8; p++) {
    const py = p * 32;
    woodCtx.fillStyle = `rgb(${70 + Math.floor(randWood() * 22)}, ${46 + Math.floor(randWood() * 14)}, ${32 + Math.floor(randWood() * 10)})`;
    woodCtx.fillRect(0, py + 1, 256, 30);
    woodCtx.fillStyle = '#241710';
    woodCtx.fillRect(0, py, 256, 2);
    woodBmpCtx.fillStyle = '#222222';
    woodBmpCtx.fillRect(0, py, 256, 2);

    for (let s = 0; s < 24; s++) {
      const sy = py + 3 + randWood() * 26;
      woodCtx.fillStyle = 'rgba(30, 18, 10, 0.25)';
      woodCtx.fillRect(0, sy, 256, 1);
      woodBmpCtx.fillStyle = 'rgba(180, 180, 180, 0.25)';
      woodBmpCtx.fillRect(0, sy, 256, 1);
    }
  }
  const woodAlbedo = track(configureTexture(woodC, true, maxAnisotropy, 2, 2));
  const woodBump = track(configureTexture(woodBmpC, false, maxAnisotropy, 2, 2));

  // 4b. Warm Hinoki cypress planks for bridge deck & veranda engawa
  const [hinokiC, hinokiCtx] = makeCanvas(256, 256);
  const [hinokiBmpC, hinokiBmpCtx] = makeCanvas(256, 256);
  hinokiCtx.fillStyle = '#b48256';
  hinokiCtx.fillRect(0, 0, 256, 256);
  hinokiBmpCtx.fillStyle = '#909090';
  hinokiBmpCtx.fillRect(0, 0, 256, 256);
  const randHinoki = seeded(612);
  for (let p = 0; p < 6; p++) {
    const py = p * (256 / 6);
    const ph = 256 / 6;
    hinokiCtx.fillStyle = `rgb(${168 + Math.floor(randHinoki() * 26)}, ${120 + Math.floor(randHinoki() * 20)}, ${78 + Math.floor(randHinoki() * 14)})`;
    hinokiCtx.fillRect(0, py + 1, 256, ph - 2);
    hinokiCtx.fillStyle = '#5c3d24';
    hinokiCtx.fillRect(0, py, 256, 2);
    hinokiBmpCtx.fillStyle = '#2a2a2a';
    hinokiBmpCtx.fillRect(0, py, 256, 2);

    // Fine cathedral wood grain rings
    for (let g = 0; g < 16; g++) {
      const gy = py + 3 + randHinoki() * (ph - 6);
      hinokiCtx.strokeStyle = 'rgba(110, 70, 38, 0.22)';
      hinokiCtx.lineWidth = 1;
      hinokiCtx.beginPath();
      hinokiCtx.moveTo(0, gy);
      hinokiCtx.bezierCurveTo(85, gy + (randHinoki() - 0.5) * 6, 170, gy + (randHinoki() - 0.5) * 6, 256, gy);
      hinokiCtx.stroke();

      hinokiBmpCtx.strokeStyle = 'rgba(195, 195, 195, 0.28)';
      hinokiBmpCtx.beginPath();
      hinokiBmpCtx.moveTo(0, gy);
      hinokiBmpCtx.lineTo(256, gy);
      hinokiBmpCtx.stroke();
    }
  }
  const hinokiAlbedo = track(configureTexture(hinokiC, true, maxAnisotropy, 1, 1));
  const hinokiBump = track(configureTexture(hinokiBmpC, false, maxAnisotropy, 1, 1));

  // 5. Shoji warm glowing lattice window
  const [shojiC, shojiCtx] = makeCanvas(256, 256);
  const shojiGrad = shojiCtx.createRadialGradient(128, 128, 16, 128, 128, 160);
  shojiGrad.addColorStop(0, '#ffe3a8');
  shojiGrad.addColorStop(0.6, '#f6b868');
  shojiGrad.addColorStop(1, '#c97836');
  shojiCtx.fillStyle = shojiGrad;
  shojiCtx.fillRect(0, 0, 256, 256);
  shojiCtx.strokeStyle = '#2c1e16';
  shojiCtx.lineWidth = 8;
  for (let i = 0; i <= 4; i++) {
    const pos = (i * 256) / 4;
    shojiCtx.beginPath();
    shojiCtx.moveTo(pos, 0);
    shojiCtx.lineTo(pos, 256);
    shojiCtx.stroke();
    shojiCtx.beginPath();
    shojiCtx.moveTo(0, pos);
    shojiCtx.lineTo(256, pos);
    shojiCtx.stroke();
  }
  const shojiEmissive = track(configureTexture(shojiC, true, maxAnisotropy, 1, 1));

  // 6. Granite stone (albedo + chiseled bump) for lanterns & architectural coping
  const [graniteC, graniteCtx] = makeCanvas(256, 256);
  const [graniteBmpC, graniteBmpCtx] = makeCanvas(256, 256);
  graniteCtx.fillStyle = '#8b8881';
  graniteCtx.fillRect(0, 0, 256, 256);
  graniteBmpCtx.fillStyle = '#808080';
  graniteBmpCtx.fillRect(0, 0, 256, 256);
  const randGranite = seeded(771);
  for (let i = 0; i < 3600; i++) {
    const gx = randGranite() * 256;
    const gy = randGranite() * 256;
    const v = randGranite();
    graniteCtx.fillStyle =
      v > 0.65
        ? 'rgba(232,228,218,0.36)'
        : v > 0.3
          ? 'rgba(72,74,68,0.30)'
          : 'rgba(116,132,96,0.24)';
    graniteCtx.fillRect(gx, gy, 2.5, 2.5);
    graniteBmpCtx.fillStyle = v > 0.5 ? 'rgba(220,220,220,0.4)' : 'rgba(50,50,50,0.4)';
    graniteBmpCtx.fillRect(gx, gy, 2.5, 2.5);
  }
  const graniteAlbedo = track(configureTexture(graniteC, true, maxAnisotropy, 1, 1));
  const graniteBump = track(configureTexture(graniteBmpC, false, maxAnisotropy, 1, 1));

  // 6b. Chiseled weathered flagstone texture for stepping stones & bridge approaches
  const [stepC, stepCtx] = makeCanvas(256, 256);
  const [stepBmpC, stepBmpCtx] = makeCanvas(256, 256);
  stepCtx.fillStyle = '#737069';
  stepCtx.fillRect(0, 0, 256, 256);
  stepBmpCtx.fillStyle = '#929292';
  stepBmpCtx.fillRect(0, 0, 256, 256);
  const randStep = seeded(1108);
  for (let i = 0; i < 2200; i++) {
    const sx = randStep() * 256;
    const sy = randStep() * 256;
    const r = 1.5 + randStep() * 4.5;
    const shade = randStep();
    stepCtx.fillStyle =
      shade > 0.72
        ? 'rgba(195,190,178,0.26)'
        : shade > 0.28
          ? 'rgba(65,62,56,0.28)'
          : 'rgba(92,114,68,0.22)'; // Subtle garden moss flecks
    stepCtx.fillRect(sx, sy, r, r * 0.8);
    stepBmpCtx.fillStyle = shade > 0.5 ? 'rgba(205,205,205,0.32)' : 'rgba(60,60,60,0.35)';
    stepBmpCtx.fillRect(sx, sy, r, r * 0.8);
  }
  // Subtle natural stone hairline fractures
  stepCtx.strokeStyle = 'rgba(42,40,36,0.32)';
  stepBmpCtx.strokeStyle = 'rgba(30,30,30,0.55)';
  for (let c = 0; c < 6; c++) {
    const x0 = randStep() * 256;
    const y0 = randStep() * 256;
    const x1 = x0 + (randStep() - 0.5) * 140;
    const y1 = y0 + (randStep() - 0.5) * 140;
    for (const ctx of [stepCtx, stepBmpCtx]) {
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo((x0 + x1) * 0.5 + 14, (y0 + y1) * 0.5 - 12, x1, y1);
      ctx.stroke();
    }
  }
  const steppingStoneAlbedo = track(configureTexture(stepC, true, maxAnisotropy, 1, 1));
  const steppingStoneBump = track(configureTexture(stepBmpC, false, maxAnisotropy, 1, 1));

  // 6c. Volcanic mountain ridge rock & snow striations (albedo + bump)
  const [mtnC, mtnCtx] = makeCanvas(512, 512);
  const [mtnBmpC, mtnBmpCtx] = makeCanvas(512, 512);
  mtnCtx.fillStyle = '#c8c4c6'; // Neutral multiplier so vertex colors dictate snow vs forest
  mtnCtx.fillRect(0, 0, 512, 512);
  mtnBmpCtx.fillStyle = '#808080';
  mtnBmpCtx.fillRect(0, 0, 512, 512);
  const randMtn = seeded(3411);
  // Vertical eroded basalt couloirs & ridges
  for (let r = 0; r < 140; r++) {
    const rx = randMtn() * 512;
    const rw = 3 + randMtn() * 14;
    const dark = randMtn() > 0.45;
    mtnCtx.fillStyle = dark ? 'rgba(95,90,104,0.22)' : 'rgba(255,252,250,0.24)';
    mtnCtx.fillRect(rx, 0, rw, 512);
    mtnBmpCtx.fillStyle = dark ? 'rgba(55,55,55,0.34)' : 'rgba(215,215,215,0.34)';
    mtnBmpCtx.fillRect(rx, 0, rw, 512);
  }
  // Fine craggy rock stipple
  for (let i = 0; i < 4500; i++) {
    const mx = randMtn() * 512;
    const my = randMtn() * 512;
    const d = randMtn() > 0.5;
    mtnCtx.fillStyle = d ? 'rgba(65,60,74,0.16)' : 'rgba(255,255,255,0.16)';
    mtnCtx.fillRect(mx, my, 3, 5);
    mtnBmpCtx.fillStyle = d ? 'rgba(40,40,40,0.3)' : 'rgba(220,220,220,0.3)';
    mtnBmpCtx.fillRect(mx, my, 3, 5);
  }
  const mountainAlbedo = track(configureTexture(mtnC, true, maxAnisotropy, 3, 2));
  const mountainBump = track(configureTexture(mtnBmpC, false, maxAnisotropy, 3, 2));

  // 7. Garden moss & grass ground texture
  const [terrainC, terrainCtx] = makeCanvas(512, 512);
  terrainCtx.fillStyle = '#485b37';
  terrainCtx.fillRect(0, 0, 512, 512);
  const randGrass = seeded(303);
  for (let i = 0; i < 7000; i++) {
    const gx = randGrass() * 512;
    const gy = randGrass() * 512;
    const tone = randGrass();
    terrainCtx.fillStyle =
      tone > 0.65
        ? 'rgba(104, 126, 66, 0.32)'
        : tone > 0.3
          ? 'rgba(54, 72, 40, 0.35)'
          : 'rgba(128, 108, 76, 0.2)';
    terrainCtx.fillRect(gx, gy, 4 + randGrass() * 5, 4 + randGrass() * 5);
  }
  const terrainAlbedo = track(configureTexture(terrainC, true, maxAnisotropy, 14, 14));

  // 8. Clear koi pond riverbed pebbles
  const [bedC, bedCtx] = makeCanvas(512, 512);
  bedCtx.fillStyle = '#2d3b37';
  bedCtx.fillRect(0, 0, 512, 512);
  const randBed = seeded(818);
  for (let i = 0; i < 650; i++) {
    const bx = randBed() * 512;
    const by = randBed() * 512;
    const br = 4 + randBed() * 10;
    const shade = Math.floor(45 + randBed() * 68);
    bedCtx.fillStyle = `rgb(${shade}, ${shade + 8}, ${shade + 4})`;
    bedCtx.beginPath();
    bedCtx.ellipse(bx, by, br, br * (0.65 + randBed() * 0.3), randBed() * Math.PI, 0, Math.PI * 2);
    bedCtx.fill();
  }
  const pondBedAlbedo = track(configureTexture(bedC, true, maxAnisotropy, 4, 4));

  // 9. Soft radial contact shadow
  const [shadowC, shadowCtx] = makeCanvas(256, 256);
  const sGrad = shadowCtx.createRadialGradient(128, 128, 10, 128, 128, 128);
  sGrad.addColorStop(0, 'rgba(14, 10, 8, 0.85)');
  sGrad.addColorStop(0.55, 'rgba(14, 10, 8, 0.32)');
  sGrad.addColorStop(1, 'rgba(14, 10, 8, 0)');
  shadowCtx.fillStyle = sGrad;
  shadowCtx.fillRect(0, 0, 256, 256);
  const contactShadow = track(configureTexture(shadowC, false, 1, 1, 1));

  // 10. Notched cherry blossom petal alpha mask
  const [petalC, petalCtx] = makeCanvas(128, 128);
  petalCtx.clearRect(0, 0, 128, 128);
  const pGrad = petalCtx.createLinearGradient(64, 118, 64, 12);
  pGrad.addColorStop(0, '#f39ab6');
  pGrad.addColorStop(0.55, '#ffd4e2');
  pGrad.addColorStop(1, '#fff6f9');
  petalCtx.fillStyle = pGrad;
  petalCtx.beginPath();
  petalCtx.moveTo(64, 114);
  petalCtx.bezierCurveTo(22, 92, 16, 40, 44, 18);
  petalCtx.lineTo(64, 34);
  petalCtx.lineTo(84, 18);
  petalCtx.bezierCurveTo(112, 40, 106, 92, 64, 114);
  petalCtx.closePath();
  petalCtx.fill();
  const petalAlpha = track(configureTexture(petalC, true, 1, 1, 1));
  petalAlpha.wrapS = THREE.ClampToEdgeWrapping;
  petalAlpha.wrapT = THREE.ClampToEdgeWrapping;

  // 10b. Cherry tree bark (mahogany-brown with horizontal lenticel bands)
  const [barkC, barkCtx] = makeCanvas(256, 256);
  const [barkBmpC, barkBmpCtx] = makeCanvas(256, 256);
  barkCtx.fillStyle = '#3d2a24';
  barkCtx.fillRect(0, 0, 256, 256);
  barkBmpCtx.fillStyle = '#707070';
  barkBmpCtx.fillRect(0, 0, 256, 256);
  const randBark = seeded(519);
  for (let i = 0; i < 420; i++) {
    const bx = randBark() * 256;
    const by = randBark() * 256;
    const bw = 12 + randBark() * 34;
    const bh = 1.5 + randBark() * 2.5;
    barkCtx.fillStyle =
      randBark() > 0.35 ? 'rgba(98, 72, 60, 0.55)' : 'rgba(28, 17, 14, 0.55)';
    barkCtx.fillRect(bx, by, bw, bh);
    barkBmpCtx.fillStyle = randBark() > 0.35 ? 'rgba(210,210,210,0.6)' : 'rgba(40,40,40,0.6)';
    barkBmpCtx.fillRect(bx, by, bw, bh);
  }
  const sakuraBarkAlbedo = track(configureTexture(barkC, true, maxAnisotropy, 1, 3));
  const sakuraBarkBump = track(configureTexture(barkBmpC, false, maxAnisotropy, 1, 3));

  // 10c. Multi-flower 5-petaled sakura blossom cluster (alpha-cutout foliage card)
  const [clusterC, clusterCtx] = makeCanvas(256, 256);
  clusterCtx.clearRect(0, 0, 256, 256);
  const drawFivePetalFlower = (cx: number, cy: number, radius: number, rotOffset: number) => {
    for (let p = 0; p < 5; p++) {
      const ang = rotOffset + (p / 5) * Math.PI * 2;
      clusterCtx.save();
      clusterCtx.translate(cx, cy);
      clusterCtx.rotate(ang);

      const pG = clusterCtx.createLinearGradient(0, 0, 0, -radius);
      pG.addColorStop(0, '#e3779c');
      pG.addColorStop(0.32, '#ffbfd6');
      pG.addColorStop(0.82, '#ffe8f0');
      pG.addColorStop(1, '#fff9fb');
      clusterCtx.fillStyle = pG;

      clusterCtx.beginPath();
      clusterCtx.moveTo(0, -radius * 0.08);
      clusterCtx.bezierCurveTo(
        -radius * 0.52,
        -radius * 0.35,
        -radius * 0.44,
        -radius * 0.92,
        -radius * 0.12,
        -radius,
      );
      clusterCtx.lineTo(0, -radius * 0.84); // Classic cherry blossom petal notch
      clusterCtx.lineTo(radius * 0.12, -radius);
      clusterCtx.bezierCurveTo(
        radius * 0.44,
        -radius * 0.92,
        radius * 0.52,
        -radius * 0.35,
        0,
        -radius * 0.08,
      );
      clusterCtx.closePath();
      clusterCtx.fill();
      clusterCtx.restore();
    }

    // Rosy center & delicate stamens
    const cG = clusterCtx.createRadialGradient(cx, cy, 1, cx, cy, radius * 0.24);
    cG.addColorStop(0, '#a82952');
    cG.addColorStop(1, 'rgba(227, 119, 156, 0)');
    clusterCtx.fillStyle = cG;
    clusterCtx.beginPath();
    clusterCtx.arc(cx, cy, radius * 0.24, 0, Math.PI * 2);
    clusterCtx.fill();

    for (let s = 0; s < 9; s++) {
      const sa = (s / 9) * Math.PI * 2 + rotOffset;
      const sx = cx + Math.cos(sa) * radius * 0.24;
      const sy = cy + Math.sin(sa) * radius * 0.24;
      clusterCtx.strokeStyle = 'rgba(255, 218, 130, 0.85)';
      clusterCtx.lineWidth = 1.4;
      clusterCtx.beginPath();
      clusterCtx.moveTo(cx, cy);
      clusterCtx.lineTo(sx, sy);
      clusterCtx.stroke();
      clusterCtx.fillStyle = '#ffe28a';
      clusterCtx.beginPath();
      clusterCtx.arc(sx, sy, 2.0, 0, Math.PI * 2);
      clusterCtx.fill();
    }
  };

  drawFivePetalFlower(88, 92, 56, 0.15);
  drawFivePetalFlower(168, 86, 52, 0.85);
  drawFivePetalFlower(132, 168, 54, 0.48);
  drawFivePetalFlower(68, 162, 42, 1.25);
  drawFivePetalFlower(186, 158, 40, 0.3);

  const sakuraClusterAlpha = track(configureTexture(clusterC, true, maxAnisotropy, 1, 1));
  sakuraClusterAlpha.wrapS = THREE.ClampToEdgeWrapping;
  sakuraClusterAlpha.wrapT = THREE.ClampToEdgeWrapping;

  // 10d. Serrated ovate sakura leaf (Prunus serrulata leaf with veins & bronze-green gradient)
  const [leafC, leafCtx] = makeCanvas(256, 256);
  leafCtx.clearRect(0, 0, 256, 256);

  // Leaf petiole (stem)
  leafCtx.strokeStyle = '#6f5c3e';
  leafCtx.lineWidth = 6;
  leafCtx.lineCap = 'round';
  leafCtx.beginPath();
  leafCtx.moveTo(128, 246);
  leafCtx.lineTo(128, 212);
  leafCtx.stroke();

  // Serrated leaf silhouette
  const lGrad = leafCtx.createLinearGradient(128, 220, 128, 16);
  lGrad.addColorStop(0, '#507d3d');
  lGrad.addColorStop(0.6, '#6e9c47');
  lGrad.addColorStop(0.88, '#95b254');
  lGrad.addColorStop(1, '#a97a4a'); // Subtle young spring bronze tip

  leafCtx.fillStyle = lGrad;
  leafCtx.beginPath();
  leafCtx.moveTo(128, 218);
  const teeth = 14;
  // Right serrated margin bottom -> tip
  for (let i = 1; i <= teeth; i++) {
    const t = i / teeth;
    const y = THREE.MathUtils.lerp(218, 18, t);
    const widthEnv = Math.sin(Math.pow(t, 0.72) * Math.PI) * (1 - t * 0.25);
    const baseW = widthEnv * 76;
    const toothOut = i < teeth ? 6.5 : 0;
    const yMid = THREE.MathUtils.lerp(218, 18, (i - 0.5) / teeth);
    leafCtx.lineTo(128 + baseW + toothOut, yMid);
    leafCtx.lineTo(128 + baseW * 0.92, y);
  }
  // Pointed acuminate apex -> left serrated margin tip -> bottom
  for (let i = teeth; i >= 1; i--) {
    const t = i / teeth;
    const y = THREE.MathUtils.lerp(218, 18, t);
    const widthEnv = Math.sin(Math.pow(t, 0.72) * Math.PI) * (1 - t * 0.25);
    const baseW = widthEnv * 76;
    const toothOut = i < teeth ? 6.5 : 0;
    const yMid = THREE.MathUtils.lerp(218, 18, (i - 0.5) / teeth);
    leafCtx.lineTo(128 - baseW * 0.92, y);
    leafCtx.lineTo(128 - baseW - toothOut, yMid);
  }
  leafCtx.closePath();
  leafCtx.fill();

  // Central midrib & curved lateral leaf veins
  leafCtx.strokeStyle = 'rgba(218, 232, 165, 0.65)';
  leafCtx.lineWidth = 3.2;
  leafCtx.beginPath();
  leafCtx.moveTo(128, 218);
  leafCtx.lineTo(128, 24);
  leafCtx.stroke();

  leafCtx.lineWidth = 1.6;
  leafCtx.strokeStyle = 'rgba(205, 224, 150, 0.45)';
  for (let v = 1; v <= 7; v++) {
    const t = v / 8.5;
    const vy = THREE.MathUtils.lerp(205, 36, t);
    const span = Math.sin(Math.pow(t, 0.72) * Math.PI) * 62;
    leafCtx.beginPath();
    leafCtx.moveTo(128, vy);
    leafCtx.quadraticCurveTo(128 + span * 0.5, vy - 10, 128 + span, vy - 22);
    leafCtx.stroke();
    leafCtx.beginPath();
    leafCtx.moveTo(128, vy - 4);
    leafCtx.quadraticCurveTo(128 - span * 0.5, vy - 14, 128 - span, vy - 26);
    leafCtx.stroke();
  }

  const sakuraLeafAlpha = track(configureTexture(leafC, true, maxAnisotropy, 1, 1));
  sakuraLeafAlpha.wrapS = THREE.ClampToEdgeWrapping;
  sakuraLeafAlpha.wrapT = THREE.ClampToEdgeWrapping;

  // 11. Koi fish color pattern textures (Kohaku, Yamabuki Ogon, Showa Calico)
  const koiTextures: THREE.CanvasTexture[] = [];
  const makeKoiPattern = (
    base: string,
    spots: Array<{ x: number; y: number; rx: number; ry: number; color: string }>,
  ) => {
    const [kc, kctx] = makeCanvas(256, 128);
    kctx.fillStyle = base;
    kctx.fillRect(0, 0, 256, 128);
    for (const sp of spots) {
      kctx.fillStyle = sp.color;
      kctx.beginPath();
      kctx.ellipse(sp.x, sp.y, sp.rx, sp.ry, 0.18, 0, Math.PI * 2);
      kctx.fill();
    }
    // Subtle dorsal scale sheen
    kctx.fillStyle = 'rgba(255,255,255,0.14)';
    for (let x = 24; x < 220; x += 14) {
      for (let y = 26; y < 102; y += 14) {
        kctx.beginPath();
        kctx.arc(x, y, 5, -Math.PI * 0.4, Math.PI * 0.4);
        kctx.strokeStyle = 'rgba(0,0,0,0.08)';
        kctx.lineWidth = 1;
        kctx.stroke();
      }
    }
    const tex = track(configureTexture(kc, true, maxAnisotropy, 1, 1));
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    koiTextures.push(tex);
  };

  // Kohaku (white body with vivid crimson patches)
  makeKoiPattern('#f8f3eb', [
    { x: 64, y: 64, rx: 42, ry: 26, color: '#d8321c' },
    { x: 158, y: 54, rx: 38, ry: 22, color: '#d8321c' },
    { x: 208, y: 72, rx: 22, ry: 15, color: '#e24328' },
  ]);
  // Yamabuki Ogon (luminous golden koi)
  makeKoiPattern('#f2b42d', [
    { x: 120, y: 64, rx: 75, ry: 30, color: '#ffd15c' },
    { x: 52, y: 64, rx: 28, ry: 20, color: '#e59217' },
  ]);
  // Showa Sanke (ivory with crimson & sumi ink markings)
  makeKoiPattern('#f4efe6', [
    { x: 74, y: 58, rx: 34, ry: 24, color: '#d9381e' },
    { x: 146, y: 74, rx: 30, ry: 22, color: '#1f1e22' },
    { x: 192, y: 52, rx: 24, ry: 18, color: '#d9381e' },
    { x: 106, y: 80, rx: 18, ry: 14, color: '#242329' },
  ]);

  // 12. Flemish-bond brick masonry (Russian crimson & Victorian red brick)
  const [brickC, brickCtx] = makeCanvas(256, 256);
  const [brickBmpC, brickBmpCtx] = makeCanvas(256, 256);
  brickCtx.fillStyle = '#c8bfb2'; // Mortar base
  brickCtx.fillRect(0, 0, 256, 256);
  brickBmpCtx.fillStyle = '#383838';
  brickBmpCtx.fillRect(0, 0, 256, 256);
  const randBrick = seeded(1917);
  const brickRows = 12;
  const bh = 256 / brickRows;
  for (let r = 0; r < brickRows; r++) {
    let bx = -(r % 2) * 24;
    let idx = 0;
    while (bx < 256) {
      const bw = idx % 2 === 0 ? 46 : 24;
      const lum = Math.floor(175 + randBrick() * 48);
      brickCtx.fillStyle = `rgb(${lum}, ${Math.floor(lum * 0.86)}, ${Math.floor(lum * 0.8)})`;
      brickCtx.fillRect(bx + 2, r * bh + 2, bw - 3, bh - 3);
      brickBmpCtx.fillStyle = `rgb(${155 + Math.floor(randBrick() * 65)}, ${155 + Math.floor(randBrick() * 65)}, ${155 + Math.floor(randBrick() * 65)})`;
      brickBmpCtx.fillRect(bx + 2, r * bh + 2, bw - 3, bh - 3);
      bx += bw;
      idx++;
    }
  }
  const redBrickAlbedo = track(configureTexture(brickC, true, maxAnisotropy, 3, 2));
  const redBrickBump = track(configureTexture(brickBmpC, false, maxAnisotropy, 3, 2));

  // 13. Victorian scalloped/diamond Welsh slate mansard shingles
  const [slateC, slateCtx] = makeCanvas(256, 256);
  const [slateBmpC, slateBmpCtx] = makeCanvas(256, 256);
  slateCtx.fillStyle = '#29303b';
  slateCtx.fillRect(0, 0, 256, 256);
  slateBmpCtx.fillStyle = '#555555';
  slateBmpCtx.fillRect(0, 0, 256, 256);
  const randSlate = seeded(1887);
  const sRows = 8;
  const sCols = 8;
  const sh = 256 / sRows;
  const sw = 256 / sCols;
  for (let r = 0; r < sRows; r++) {
    const off = (r % 2) * (sw * 0.5);
    for (let c = -1; c <= sCols; c++) {
      const x = c * sw + off;
      const y = r * sh;
      const tone = Math.floor(46 + randSlate() * 24);
      slateCtx.fillStyle = `rgb(${tone}, ${tone + 7}, ${tone + 18})`;
      slateCtx.strokeStyle = '#1b2028';
      slateCtx.lineWidth = 2;
      slateCtx.beginPath();
      slateCtx.moveTo(x, y);
      slateCtx.lineTo(x + sw, y);
      slateCtx.lineTo(x + sw, y + sh * 0.65);
      slateCtx.lineTo(x + sw * 0.5, y + sh);
      slateCtx.lineTo(x, y + sh * 0.65);
      slateCtx.closePath();
      slateCtx.fill();
      slateCtx.stroke();

      slateBmpCtx.fillStyle = `rgb(${150 + Math.floor(randSlate() * 55)}, ${150 + Math.floor(randSlate() * 55)}, ${150 + Math.floor(randSlate() * 55)})`;
      slateBmpCtx.strokeStyle = '#252525';
      slateBmpCtx.lineWidth = 2;
      slateBmpCtx.beginPath();
      slateBmpCtx.moveTo(x, y);
      slateBmpCtx.lineTo(x + sw, y);
      slateBmpCtx.lineTo(x + sw, y + sh * 0.65);
      slateBmpCtx.lineTo(x + sw * 0.5, y + sh);
      slateBmpCtx.lineTo(x, y + sh * 0.65);
      slateBmpCtx.closePath();
      slateBmpCtx.fill();
      slateBmpCtx.stroke();
    }
  }
  const slateTileAlbedo = track(configureTexture(slateC, true, maxAnisotropy, 4, 2));
  const slateTileBump = track(configureTexture(slateBmpC, false, maxAnisotropy, 4, 2));

  // 14. Mughal Makrana white marble with delicate veining & carved borders
  const [marbleC, marbleCtx] = makeCanvas(256, 256);
  const [marbleBmpC, marbleBmpCtx] = makeCanvas(256, 256);
  marbleCtx.fillStyle = '#f5f0e8';
  marbleCtx.fillRect(0, 0, 256, 256);
  marbleBmpCtx.fillStyle = '#909090';
  marbleBmpCtx.fillRect(0, 0, 256, 256);
  const randMarble = seeded(1632);
  for (let v = 0; v < 22; v++) {
    marbleCtx.strokeStyle =
      v % 3 === 0 ? 'rgba(182, 164, 134, 0.22)' : 'rgba(150, 152, 158, 0.18)';
    marbleCtx.lineWidth = 1 + randMarble() * 2;
    marbleCtx.beginPath();
    let mx = randMarble() * 256;
    let my = 0;
    marbleCtx.moveTo(mx, my);
    for (let s = 1; s <= 6; s++) {
      mx += (randMarble() - 0.5) * 44;
      my = (s / 6) * 256;
      marbleCtx.lineTo(mx, my);
    }
    marbleCtx.stroke();
  }
  // Recessed ashlar slab seams
  marbleCtx.strokeStyle = 'rgba(165, 154, 138, 0.35)';
  marbleCtx.lineWidth = 2;
  marbleBmpCtx.strokeStyle = '#404040';
  marbleBmpCtx.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    const p = i * 64;
    for (const ctx of [marbleCtx, marbleBmpCtx]) {
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(256, p);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, 256);
      ctx.stroke();
    }
  }
  const makranaMarbleAlbedo = track(configureTexture(marbleC, true, maxAnisotropy, 2, 2));
  const makranaMarbleBump = track(configureTexture(marbleBmpC, false, maxAnisotropy, 2, 2));

  // 15. Agra / Fatehpur Sikri red sandstone ashlar blocks
  const [sandC, sandCtx] = makeCanvas(256, 256);
  const [sandBmpC, sandBmpCtx] = makeCanvas(256, 256);
  sandCtx.fillStyle = '#5c2a1e';
  sandCtx.fillRect(0, 0, 256, 256);
  sandBmpCtx.fillStyle = '#303030';
  sandBmpCtx.fillRect(0, 0, 256, 256);
  const randSand = seeded(1571);
  for (let r = 0; r < 6; r++) {
    const y = r * (256 / 6);
    const h = 256 / 6;
    const off = (r % 2) * 32;
    for (let c = -1; c < 4; c++) {
      const x = c * 64 + off;
      const red = Math.floor(146 + randSand() * 34);
      const grn = Math.floor(66 + randSand() * 20);
      const blu = Math.floor(48 + randSand() * 14);
      sandCtx.fillStyle = `rgb(${red}, ${grn}, ${blu})`;
      sandCtx.fillRect(x + 2, y + 2, 60, h - 4);
      sandBmpCtx.fillStyle = `rgb(${150 + Math.floor(randSand() * 70)}, ${150 + Math.floor(randSand() * 70)}, ${150 + Math.floor(randSand() * 70)})`;
      sandBmpCtx.fillRect(x + 2, y + 2, 60, h - 4);
    }
  }
  for (let i = 0; i < 1600; i++) {
    sandCtx.fillStyle =
      randSand() > 0.5 ? 'rgba(235, 175, 138, 0.12)' : 'rgba(40, 14, 10, 0.16)';
    sandCtx.fillRect(randSand() * 256, randSand() * 256, 3, 2);
  }
  const sandstoneAlbedo = track(configureTexture(sandC, true, maxAnisotropy, 3, 2));
  const sandstoneBump = track(configureTexture(sandBmpC, false, maxAnisotropy, 3, 2));

  // 16. Mughal pierced Jaali geometric lattice screen
  const [jaaliC, jaaliCtx] = makeCanvas(256, 256);
  jaaliCtx.clearRect(0, 0, 256, 256);
  jaaliCtx.strokeStyle = '#ede4d5';
  jaaliCtx.lineWidth = 10;
  const jStep = 64;
  for (let y = 0; y <= 256; y += jStep) {
    for (let x = 0; x <= 256; x += jStep) {
      jaaliCtx.beginPath();
      jaaliCtx.moveTo(x, y - jStep * 0.45);
      jaaliCtx.lineTo(x + jStep * 0.45, y);
      jaaliCtx.lineTo(x, y + jStep * 0.45);
      jaaliCtx.lineTo(x - jStep * 0.45, y);
      jaaliCtx.closePath();
      jaaliCtx.stroke();

      jaaliCtx.beginPath();
      jaaliCtx.arc(x, y, jStep * 0.22, 0, Math.PI * 2);
      jaaliCtx.stroke();
    }
  }
  jaaliCtx.strokeRect(4, 4, 248, 248);
  const jaaliAlpha = track(configureTexture(jaaliC, true, maxAnisotropy, 2, 2));

  // 17. Safavid Persian haft-rangi geometric mosaic tilework (cobalt, turquoise, saffron, ivory)
  const [persiaC, persiaCtx] = makeCanvas(256, 256);
  const [persiaBmpC, persiaBmpCtx] = makeCanvas(256, 256);
  persiaCtx.fillStyle = '#14386e'; // Deep cobalt lapis field
  persiaCtx.fillRect(0, 0, 256, 256);
  persiaBmpCtx.fillStyle = '#888888';
  persiaBmpCtx.fillRect(0, 0, 256, 256);

  const pCell = 64;
  for (let py = 0; py < 256; py += pCell) {
    for (let px = 0; px < 256; px += pCell) {
      const cx = px + pCell / 2;
      const cy = py + pCell / 2;

      // Turquoise 8-point star (two overlapping rotated squares)
      persiaCtx.fillStyle = '#1ea1a6';
      persiaCtx.fillRect(cx - 18, cy - 18, 36, 36);
      persiaCtx.save();
      persiaCtx.translate(cx, cy);
      persiaCtx.rotate(Math.PI / 4);
      persiaCtx.fillRect(-18, -18, 36, 36);
      persiaCtx.restore();

      // Ivory arabesque ring & saffron gold center rosette
      persiaCtx.strokeStyle = '#f5ebd6';
      persiaCtx.lineWidth = 3;
      persiaCtx.beginPath();
      persiaCtx.arc(cx, cy, 13, 0, Math.PI * 2);
      persiaCtx.stroke();

      persiaCtx.fillStyle = '#e7b144';
      persiaCtx.beginPath();
      persiaCtx.arc(cx, cy, 7, 0, Math.PI * 2);
      persiaCtx.fill();

      // Grout lines for ceramic tile relief
      persiaCtx.strokeStyle = '#0d2244';
      persiaCtx.lineWidth = 2;
      persiaCtx.strokeRect(px, py, pCell, pCell);
      persiaBmpCtx.strokeStyle = '#252525';
      persiaBmpCtx.lineWidth = 2.5;
      persiaBmpCtx.strokeRect(px, py, pCell, pCell);
    }
  }
  const persianTileAlbedo = track(configureTexture(persiaC, true, maxAnisotropy, 3, 2));
  const persianTileBump = track(configureTexture(persiaBmpC, false, maxAnisotropy, 3, 2));

  // 18. Victorian clock face dial
  const [clockC, clockCtx] = makeCanvas(256, 256);
  clockCtx.fillStyle = '#f4ebd6';
  clockCtx.fillRect(0, 0, 256, 256);
  clockCtx.strokeStyle = '#24211d';
  clockCtx.lineWidth = 8;
  clockCtx.beginPath();
  clockCtx.arc(128, 128, 114, 0, Math.PI * 2);
  clockCtx.stroke();
  clockCtx.lineWidth = 3;
  clockCtx.beginPath();
  clockCtx.arc(128, 128, 92, 0, Math.PI * 2);
  clockCtx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    clockCtx.strokeStyle = '#1f1b17';
    clockCtx.lineWidth = i % 3 === 0 ? 6 : 3.5;
    clockCtx.beginPath();
    clockCtx.moveTo(128 + Math.cos(a) * 94, 128 + Math.sin(a) * 94);
    clockCtx.lineTo(128 + Math.cos(a) * 110, 128 + Math.sin(a) * 110);
    clockCtx.stroke();
  }
  // Clock hands (~10:10 classic pose)
  clockCtx.strokeStyle = '#181512';
  clockCtx.lineWidth = 6;
  clockCtx.lineCap = 'round';
  clockCtx.beginPath();
  clockCtx.moveTo(128, 128);
  clockCtx.lineTo(88, 92);
  clockCtx.stroke();
  clockCtx.lineWidth = 4;
  clockCtx.beginPath();
  clockCtx.moveTo(128, 128);
  clockCtx.lineTo(186, 86);
  clockCtx.stroke();
  clockCtx.fillStyle = '#c89b3c';
  clockCtx.beginPath();
  clockCtx.arc(128, 128, 8, 0, Math.PI * 2);
  clockCtx.fill();
  const clockFaceAlbedo = track(configureTexture(clockC, true, maxAnisotropy, 1, 1));
  clockFaceAlbedo.wrapS = THREE.ClampToEdgeWrapping;
  clockFaceAlbedo.wrapT = THREE.ClampToEdgeWrapping;

  // 19. Warm mullioned arched palace window texture
  const [winC, winCtx] = makeCanvas(256, 256);
  const wGrad = winCtx.createLinearGradient(0, 0, 0, 256);
  wGrad.addColorStop(0, '#44586c');
  wGrad.addColorStop(0.5, '#9d8968');
  wGrad.addColorStop(1, '#d9ab64');
  winCtx.fillStyle = wGrad;
  winCtx.fillRect(0, 0, 256, 256);
  winCtx.strokeStyle = '#241e1a';
  winCtx.lineWidth = 10;
  for (let i = 0; i <= 4; i++) {
    const p = (i * 256) / 4;
    winCtx.beginPath();
    winCtx.moveTo(p, 0);
    winCtx.lineTo(p, 256);
    winCtx.stroke();
    winCtx.beginPath();
    winCtx.moveTo(0, p);
    winCtx.lineTo(256, p);
    winCtx.stroke();
  }
  const stainedWindowAlbedo = track(configureTexture(winC, true, maxAnisotropy, 1, 1));

  // 20. Winter snowdrift ground texture (for Russian winter tundra)
  const [snowC, snowCtx] = makeCanvas(512, 512);
  snowCtx.fillStyle = '#edf3f9';
  snowCtx.fillRect(0, 0, 512, 512);
  const randSnow = seeded(1212);
  for (let i = 0; i < 4500; i++) {
    const sx = randSnow() * 512;
    const sy = randSnow() * 512;
    snowCtx.fillStyle =
      randSnow() > 0.45 ? 'rgba(255,255,255,0.45)' : 'rgba(182, 204, 228, 0.25)';
    snowCtx.fillRect(sx, sy, 6 + randSnow() * 14, 3 + randSnow() * 5);
  }
  const snowTerrainAlbedo = track(configureTexture(snowC, true, maxAnisotropy, 12, 12));

  // 21. Wind-rippled golden desert sand dunes (albedo + bump for Persian oasis)
  const [sandDuneC, sandDuneCtx] = makeCanvas(512, 512);
  const [sandDuneBmpC, sandDuneBmpCtx] = makeCanvas(512, 512);
  sandDuneCtx.fillStyle = '#dcb578';
  sandDuneCtx.fillRect(0, 0, 512, 512);
  sandDuneBmpCtx.fillStyle = '#808080';
  sandDuneBmpCtx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 8) {
    const wave = Math.sin((y / 512) * Math.PI * 12) * 16;
    const shade = Math.floor(204 + Math.sin((y / 512) * Math.PI * 16) * 20);
    sandDuneCtx.strokeStyle = `rgba(${shade}, ${Math.floor(shade * 0.8)}, ${Math.floor(shade * 0.52)}, 0.48)`;
    sandDuneCtx.lineWidth = 4;
    sandDuneCtx.beginPath();
    sandDuneCtx.moveTo(0, y);
    sandDuneCtx.bezierCurveTo(170, y + wave, 340, y - wave, 512, y);
    sandDuneCtx.stroke();

    const bmpTone = Math.floor(128 + Math.sin((y / 512) * Math.PI * 16) * 70);
    sandDuneBmpCtx.strokeStyle = `rgb(${bmpTone}, ${bmpTone}, ${bmpTone})`;
    sandDuneBmpCtx.lineWidth = 4;
    sandDuneBmpCtx.beginPath();
    sandDuneBmpCtx.moveTo(0, y);
    sandDuneBmpCtx.bezierCurveTo(170, y + wave, 340, y - wave, 512, y);
    sandDuneBmpCtx.stroke();
  }
  const desertSandAlbedo = track(configureTexture(sandDuneC, true, maxAnisotropy, 14, 14));
  const desertSandBump = track(configureTexture(sandDuneBmpC, false, maxAnisotropy, 14, 14));

  // 22. Manicured emerald-green lawn texture (for Victorian Tudor & Mughal Charbagh)
  const [lawnC, lawnCtx] = makeCanvas(512, 512);
  lawnCtx.fillStyle = '#477034';
  lawnCtx.fillRect(0, 0, 512, 512);
  const randLawn = seeded(1851);
  for (let i = 0; i < 6500; i++) {
    const lx = randLawn() * 512;
    const ly = randLawn() * 512;
    const v = randLawn();
    lawnCtx.fillStyle =
      v > 0.6 ? 'rgba(98, 146, 62, 0.35)' : v > 0.25 ? 'rgba(52, 92, 38, 0.35)' : 'rgba(130, 168, 78, 0.22)';
    lawnCtx.fillRect(lx, ly, 3 + randLawn() * 4, 4 + randLawn() * 5);
  }
  const lushLawnAlbedo = track(configureTexture(lawnC, true, maxAnisotropy, 16, 16));

  // 23. Silver birch bark texture (chalky white with dark horizontal lenticel bands)
  const [birchC, birchCtx] = makeCanvas(256, 256);
  birchCtx.fillStyle = '#ecebe6';
  birchCtx.fillRect(0, 0, 256, 256);
  const randBirch = seeded(709);
  for (let i = 0; i < 190; i++) {
    const bx = randBirch() * 256;
    const by = randBirch() * 256;
    const bw = 18 + randBirch() * 56;
    const bh = 2 + randBirch() * 5;
    birchCtx.fillStyle = randBirch() > 0.25 ? 'rgba(34, 34, 38, 0.78)' : 'rgba(130, 126, 118, 0.55)';
    birchCtx.fillRect(bx, by, bw, bh);
  }
  const birchBarkAlbedo = track(configureTexture(birchC, true, maxAnisotropy, 1, 3));

  // 24. High-detail feathery date-palm frond alpha card (512x512 crisp pinnate leaflets)
  const [palmC, palmCtx] = makeCanvas(512, 512);
  palmCtx.clearRect(0, 0, 512, 512);
  const randPalm = seeded(2049);
  // Central tapered woody rachis stem
  const rachisGrad = palmCtx.createLinearGradient(0, 505, 0, 14);
  rachisGrad.addColorStop(0, '#8d7f46');
  rachisGrad.addColorStop(0.35, '#6e873c');
  rachisGrad.addColorStop(1, '#7ea447');
  palmCtx.strokeStyle = rachisGrad;
  palmCtx.lineWidth = 10;
  palmCtx.lineCap = 'round';
  palmCtx.beginPath();
  palmCtx.moveTo(256, 504);
  palmCtx.lineTo(256, 18);
  palmCtx.stroke();

  const leafletCount = 34;
  for (let i = 0; i < leafletCount; i++) {
    const t = i / (leafletCount - 1);
    const y = THREE.MathUtils.lerp(474, 28, t);
    const envelope = Math.sin(Math.pow(Math.max(0.02, t), 0.58) * Math.PI);
    const span = 28 + envelope * 212;
    const sweepUp = THREE.MathUtils.lerp(18, 68, t);
    const bladeW = THREE.MathUtils.lerp(7.5, 4.2, t);
    for (const side of [-1, 1]) {
      const jit = (randPalm() - 0.5) * 8;
      const tipX = 256 + side * (span + jit);
      const tipY = y - sweepUp + (randPalm() - 0.5) * 6;
      const ctrlX = 256 + side * (span * 0.58);
      const ctrlY = y - sweepUp * 0.72 - 10;

      const gShade = Math.floor(114 + randPalm() * 44);
      const rShade = Math.floor(gShade * (0.58 + (1 - envelope) * 0.14));
      const bShade = Math.floor(gShade * 0.34);
      palmCtx.fillStyle = `rgb(${rShade}, ${gShade}, ${bShade})`;
      palmCtx.beginPath();
      palmCtx.moveTo(256, y - bladeW * 0.5);
      palmCtx.quadraticCurveTo(ctrlX, ctrlY - bladeW * 0.45, tipX, tipY);
      palmCtx.quadraticCurveTo(ctrlX, ctrlY + bladeW * 0.55, 256, y + bladeW * 0.55);
      palmCtx.closePath();
      palmCtx.fill();

      // Subtle lighter mid-vein highlight along each leaflet
      palmCtx.strokeStyle = `rgba(182, 212, 118, 0.36)`;
      palmCtx.lineWidth = 1.2;
      palmCtx.beginPath();
      palmCtx.moveTo(256, y);
      palmCtx.quadraticCurveTo(ctrlX, ctrlY, tipX * 0.96 + 256 * 0.04, tipY + 1);
      palmCtx.stroke();
    }
  }
  const palmFrondAlpha = track(configureTexture(palmC, true, maxAnisotropy, 1, 1));
  palmFrondAlpha.wrapS = THREE.ClampToEdgeWrapping;
  palmFrondAlpha.wrapT = THREE.ClampToEdgeWrapping;

  // 24b. Diamond leaf-scar bark texture for Phoenix dactylifera date palms
  const [palmBarkC, palmBarkCtx] = makeCanvas(256, 256);
  const [palmBarkBmpC, palmBarkBmpCtx] = makeCanvas(256, 256);
  palmBarkCtx.fillStyle = '#4e3927';
  palmBarkCtx.fillRect(0, 0, 256, 256);
  palmBarkBmpCtx.fillStyle = '#383838';
  palmBarkBmpCtx.fillRect(0, 0, 256, 256);
  const randPB = seeded(1602);
  const pbRows = 10;
  const pbCols = 8;
  const pbh = 256 / pbRows;
  const pbw = 256 / pbCols;
  for (let r = -1; r <= pbRows; r++) {
    const off = (r % 2) * (pbw * 0.5);
    for (let c = -1; c <= pbCols; c++) {
      const cx = c * pbw + off;
      const cy = r * pbh;
      const tone = Math.floor(88 + randPB() * 36);
      palmBarkCtx.fillStyle = `rgb(${tone + 18}, ${tone - 4}, ${Math.floor(tone * 0.62)})`;
      palmBarkCtx.strokeStyle = '#2c1e14';
      palmBarkCtx.lineWidth = 2.2;
      palmBarkCtx.beginPath();
      palmBarkCtx.moveTo(cx, cy - pbh * 0.58);
      palmBarkCtx.lineTo(cx + pbw * 0.52, cy);
      palmBarkCtx.lineTo(cx, cy + pbh * 0.42);
      palmBarkCtx.lineTo(cx - pbw * 0.52, cy);
      palmBarkCtx.closePath();
      palmBarkCtx.fill();
      palmBarkCtx.stroke();

      const bTone = Math.floor(155 + randPB() * 65);
      palmBarkBmpCtx.fillStyle = `rgb(${bTone}, ${bTone}, ${bTone})`;
      palmBarkBmpCtx.strokeStyle = '#202020';
      palmBarkBmpCtx.lineWidth = 2.5;
      palmBarkBmpCtx.beginPath();
      palmBarkBmpCtx.moveTo(cx, cy - pbh * 0.58);
      palmBarkBmpCtx.lineTo(cx + pbw * 0.52, cy);
      palmBarkBmpCtx.lineTo(cx, cy + pbh * 0.42);
      palmBarkBmpCtx.lineTo(cx - pbw * 0.52, cy);
      palmBarkBmpCtx.closePath();
      palmBarkBmpCtx.fill();
      palmBarkBmpCtx.stroke();
    }
  }
  const palmBarkAlbedo = track(configureTexture(palmBarkC, true, maxAnisotropy, 1, 5));
  const palmBarkBump = track(configureTexture(palmBarkBmpC, false, maxAnisotropy, 1, 5));

  // 25. Dense green broad-leaf cluster alpha card (English Oak / Mughal Banyan)
  const [canopyC, canopyCtx] = makeCanvas(256, 256);
  canopyCtx.clearRect(0, 0, 256, 256);
  const randCan = seeded(1492);
  for (let i = 0; i < 28; i++) {
    const cx = 42 + randCan() * 172;
    const cy = 42 + randCan() * 172;
    const rx = 20 + randCan() * 20;
    const ry = 13 + randCan() * 12;
    const ang = randCan() * Math.PI;
    const gShade = Math.floor(96 + randCan() * 62);
    canopyCtx.fillStyle = `rgb(${Math.floor(gShade * 0.56)}, ${gShade}, ${Math.floor(gShade * 0.42)})`;
    canopyCtx.beginPath();
    canopyCtx.ellipse(cx, cy, rx, ry, ang, 0, Math.PI * 2);
    canopyCtx.fill();
  }
  const greenCanopyAlpha = track(configureTexture(canopyC, true, maxAnisotropy, 1, 1));
  greenCanopyAlpha.wrapS = THREE.ClampToEdgeWrapping;
  greenCanopyAlpha.wrapT = THREE.ClampToEdgeWrapping;

  return {
    stoneAlbedo,
    stoneBump,
    roofAlbedo,
    roofBump,
    plasterAlbedo,
    plasterBump,
    namakoAlbedo,
    namakoBump,
    woodAlbedo,
    woodBump,
    hinokiAlbedo,
    hinokiBump,
    shojiEmissive,
    graniteAlbedo,
    graniteBump,
    steppingStoneAlbedo,
    steppingStoneBump,
    mountainAlbedo,
    mountainBump,
    terrainAlbedo,
    pondBedAlbedo,
    contactShadow,
    petalAlpha,
    sakuraBarkAlbedo,
    sakuraBarkBump,
    sakuraClusterAlpha,
    sakuraLeafAlpha,
    koiTextures,
    redBrickAlbedo,
    redBrickBump,
    slateTileAlbedo,
    slateTileBump,
    makranaMarbleAlbedo,
    makranaMarbleBump,
    sandstoneAlbedo,
    sandstoneBump,
    jaaliAlpha,
    persianTileAlbedo,
    persianTileBump,
    clockFaceAlbedo,
    stainedWindowAlbedo,
    snowTerrainAlbedo,
    desertSandAlbedo,
    desertSandBump,
    lushLawnAlbedo,
    birchBarkAlbedo,
    palmFrondAlpha,
    palmBarkAlbedo,
    palmBarkBump,
    greenCanopyAlpha,
    dispose: () => {
      for (const tex of created) {
        tex.dispose();
      }
    },
  };
}
