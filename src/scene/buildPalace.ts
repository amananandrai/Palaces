import * as THREE from 'three';
import type { SceneMaterialLibrary } from './materials';
import { buildMughalPalace } from './palaces/buildMughalPalace';
import { buildPersianPalace } from './palaces/buildPersianPalace';
import { buildRussianPalace } from './palaces/buildRussianPalace';
import { buildVictorianPalace } from './palaces/buildVictorianPalace';
import type { PalaceStyle } from './types';

export interface PalaceBuildResult {
  group: THREE.Group;
  dispose: () => void;
}

/**
 * Generates an upturned Japanese kawara roof skirt with flared corner eaves
 * as a clean indexed BufferGeometry with UVs so ribbed tile textures align along the slope.
 */
function createCurvedRoofGeometry(
  topHalfW: number,
  topHalfD: number,
  bottomHalfW: number,
  bottomHalfD: number,
  height: number,
  flareLift: number,
  segments = 14,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // 4 sides: +Z (front), +X (right), -Z (back), -X (left)
  const sides = [
    { ax: -1, az: 1, bx: 1, bz: 1 },
    { ax: 1, az: 1, bx: 1, bz: -1 },
    { ax: 1, az: -1, bx: -1, bz: -1 },
    { ax: -1, az: -1, bx: -1, bz: 1 },
  ];

  const rows = 6;
  let vertOffset = 0;

  for (const side of sides) {
    for (let r = 0; r <= rows; r++) {
      const v = r / rows; // 0 = top ridge, 1 = outer eave
      // Concave swoop profile characteristic of Edo castle roofs
      const droop = Math.pow(v, 1.55);
      const hw = THREE.MathUtils.lerp(topHalfW, bottomHalfW, v);
      const hd = THREE.MathUtils.lerp(topHalfD, bottomHalfD, v);

      for (let c = 0; c <= segments; c++) {
        const u = c / segments;
        const px = THREE.MathUtils.lerp(side.ax * hw, side.bx * hw, u);
        const pz = THREE.MathUtils.lerp(side.az * hd, side.bz * hd, u);

        // Corner eave upturn (sori)
        const edgeDist = Math.abs(u - 0.5) * 2; // 0 at mid-edge, 1 at corner
        const cornerFlare = Math.pow(edgeDist, 2.4) * Math.pow(v, 1.8) * flareLift;
        const py = height * (1 - droop) + cornerFlare;

        positions.push(px, py, pz);
        uvs.push(u * 2.5, v);
      }
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < segments; c++) {
        const a = vertOffset + r * (segments + 1) + c;
        const b = a + 1;
        const d = a + (segments + 1);
        const e = d + 1;
        indices.push(a, d, b);
        indices.push(b, d, e);
      }
    }
    vertOffset += (rows + 1) * (segments + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates a golden shachihoko (mythical dolphin-tiger roof ornament) via beveled ExtrudeGeometry
 */
function createShachihokoGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.22, 0);
  shape.lineTo(0.24, 0);
  shape.quadraticCurveTo(0.32, 0.35, 0.14, 0.65);
  shape.quadraticCurveTo(0.26, 0.92, 0.04, 1.18);
  shape.quadraticCurveTo(-0.18, 0.95, -0.06, 0.62);
  shape.quadraticCurveTo(-0.26, 0.38, -0.22, 0);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 2,
  });
  geo.center();
  return geo;
}

/**
 * Creates a decorative arched karahafu or triangular chidori-hafu gable
 */
function createGableDormer(
  width: number,
  height: number,
  depth: number,
  mats: SceneMaterialLibrary,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
): THREE.Group {
  const g = new THREE.Group();

  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, height);
  shape.closePath();

  const wallGeo = trackGeo(
    new THREE.ExtrudeGeometry(shape, {
      depth: depth,
      bevelEnabled: false,
    }),
  );
  wallGeo.translate(0, 0, -depth / 2);
  const wall = new THREE.Mesh(wallGeo, mats.shikkuiPlaster);
  wall.castShadow = true;
  wall.receiveShadow = true;
  g.add(wall);

  // Roof bargeboards overhanging the gable
  const slopeLen = Math.hypot(width / 2 + 0.35, height + 0.18);
  const angle = Math.atan2(height, width / 2);
  const boardGeo = trackGeo(new THREE.BoxGeometry(slopeLen, 0.18, depth + 0.55));

  const leftBoard = new THREE.Mesh(boardGeo, mats.kawaraRoof);
  leftBoard.position.set(-width / 4 - 0.06, height / 2 + 0.08, 0);
  leftBoard.rotation.z = angle;
  leftBoard.castShadow = true;
  g.add(leftBoard);

  const rightBoard = new THREE.Mesh(boardGeo, mats.kawaraRoof);
  rightBoard.position.set(width / 4 + 0.06, height / 2 + 0.08, 0);
  rightBoard.rotation.z = -angle;
  rightBoard.castShadow = true;
  g.add(rightBoard);

  // Dark timber tie-beam at gable base + brushed gold kamon crest medallion
  const tieGeo = trackGeo(new THREE.BoxGeometry(width + 0.25, 0.14, depth + 0.25));
  const tie = new THREE.Mesh(tieGeo, mats.yakisugiTimber);
  tie.position.set(0, 0.07, 0);
  g.add(tie);

  const kamonGeo = trackGeo(new THREE.CylinderGeometry(width * 0.1, width * 0.1, 0.08, 16));
  kamonGeo.rotateX(Math.PI / 2);
  const kamon = new THREE.Mesh(kamonGeo, mats.brushedGold);
  kamon.position.set(0, height * 0.42, depth / 2 + 0.04);
  g.add(kamon);

  return g;
}

export function buildPalaceComplex(mats: SceneMaterialLibrary): PalaceBuildResult {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };

  // =========================================================================
  // 1. MAIN EDO CASTLE KEEP (TENSHUKAKU) AT (6, 0, -22)
  // =========================================================================
  const keepGroup = new THREE.Group();
  keepGroup.position.set(6, 0, -22);
  group.add(keepGroup);

  // Soft ground contact shadow under castle keep
  const keepShadowGeo = trackGeo(new THREE.PlaneGeometry(24, 24));
  const keepShadow = new THREE.Mesh(keepShadowGeo, mats.contactShadowMat);
  keepShadow.rotation.x = -Math.PI / 2;
  keepShadow.position.y = 0.03;
  keepGroup.add(keepShadow);

  // Battered Ishigaki stone foundation (tapered polygonal base)
  const baseH = 5.4;
  const ishigakiGeo = trackGeo(
    new THREE.CylinderGeometry(8.1, 10.2, baseH, 4, 1),
  );
  ishigakiGeo.rotateY(Math.PI / 4);
  const ishigakiMesh = new THREE.Mesh(ishigakiGeo, mats.ishigakiStone);
  ishigakiMesh.position.y = baseH / 2;
  ishigakiMesh.scale.set(1.18, 1, 0.98);
  ishigakiMesh.castShadow = true;
  ishigakiMesh.receiveShadow = true;
  keepGroup.add(ishigakiMesh);

  // Stone coping rim & timber sill beam atop Ishigaki
  const rimGeo = trackGeo(new THREE.BoxGeometry(13.8, 0.35, 11.6));
  const rim = new THREE.Mesh(rimGeo, mats.graniteStone);
  rim.position.y = baseH + 0.17;
  rim.castShadow = true;
  rim.receiveShadow = true;
  keepGroup.add(rim);

  // Grand stone approach staircase on the front (+Z) side of the stone base
  const stairSteps = 12;
  const stepGeo = trackGeo(new THREE.BoxGeometry(3.8, 0.45, 0.65));
  for (let i = 0; i < stairSteps; i++) {
    const t = i / (stairSteps - 1);
    const step = new THREE.Mesh(stepGeo, mats.ishigakiStone);
    step.position.set(0, 0.22 + t * (baseH - 0.35), 8.3 - t * 2.5);
    step.castShadow = true;
    step.receiveShadow = true;
    keepGroup.add(step);
  }
  // Staircase stone flanking cheeks
  const cheekGeo = trackGeo(new THREE.BoxGeometry(0.45, 1.2, 3.6));
  for (const sx of [-2.1, 2.1]) {
    const cheek = new THREE.Mesh(cheekGeo, mats.graniteStone);
    cheek.position.set(sx, 2.5, 7.1);
    cheek.rotation.x = Math.atan2(baseH, 2.8);
    cheek.castShadow = true;
    keepGroup.add(cheek);
  }

  // 5 Ascending Castle Keep Tiers
  const tiers = [
    { w: 12.2, d: 10.2, h: 3.1, eaveOut: 2.3, roofH: 1.85, flare: 0.55, gables: true },
    { w: 10.0, d: 8.4, h: 2.7, eaveOut: 2.0, roofH: 1.65, flare: 0.52, gables: true },
    { w: 8.1, d: 6.8, h: 2.4, eaveOut: 1.75, roofH: 1.5, flare: 0.48, gables: false },
    { w: 6.3, d: 5.4, h: 2.1, eaveOut: 1.55, roofH: 1.35, flare: 0.46, gables: true },
    { w: 4.6, d: 4.0, h: 2.15, eaveOut: 1.6, roofH: 2.1, flare: 0.58, gables: false },
  ];

  let curY = baseH + 0.34;
  const shachihokoGeo = trackGeo(createShachihokoGeometry());
  const rafterGeo = trackGeo(new THREE.BoxGeometry(0.11, 0.12, 0.95));

  // Bowed Karahafu entrance porch at the top of the grand stone staircase
  const porchGrp = new THREE.Group();
  porchGrp.position.set(0, curY, tiers[0].d / 2 + 0.65);
  keepGroup.add(porchGrp);

  const porchPlinthGeo = trackGeo(new THREE.BoxGeometry(0.38, 0.2, 0.38));
  const porchColGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.13, 2.35, 10));
  for (const px of [-1.45, 1.45]) {
    const pp = new THREE.Mesh(porchPlinthGeo, mats.graniteStone);
    pp.position.set(px, 0.1, 0.55);
    porchGrp.add(pp);

    const pc = new THREE.Mesh(porchColGeo, mats.hinokiDeck);
    pc.position.set(px, 1.35, 0.55);
    pc.castShadow = true;
    porchGrp.add(pc);
  }
  const porchBeam = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(3.5, 0.22, 0.28)),
    mats.yakisugiTimber,
  );
  porchBeam.position.set(0, 2.52, 0.55);
  porchGrp.add(porchBeam);

  const porchRoof = new THREE.Mesh(
    trackGeo(createCurvedRoofGeometry(1.1, 0.18, 2.05, 0.95, 0.85, 0.32, 8)),
    mats.kawaraRoof,
  );
  porchRoof.position.set(0, 2.58, 0.15);
  porchRoof.castShadow = true;
  porchGrp.add(porchRoof);

  const porchCrest = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 16)),
    mats.brushedGold,
  );
  porchCrest.rotation.x = Math.PI / 2;
  porchCrest.position.set(0, 2.86, 0.85);
  porchGrp.add(porchCrest);

  tiers.forEach((tier, idx) => {
    const tierGrp = new THREE.Group();
    tierGrp.position.y = curY;
    keepGroup.add(tierGrp);

    // 1) White shikkui plaster wall core
    const wallGeo = trackGeo(new THREE.BoxGeometry(tier.w, tier.h, tier.d));
    const wall = new THREE.Mesh(wallGeo, mats.shikkuiPlaster);
    wall.position.y = tier.h / 2;
    wall.castShadow = true;
    wall.receiveShadow = true;
    tierGrp.add(wall);

    // Lower Namako-kabe diamond-tile wainscoting on Tier 1
    if (idx === 0) {
      const namakoGeo = trackGeo(new THREE.BoxGeometry(tier.w + 0.08, 1.28, tier.d + 0.08));
      const namako = new THREE.Mesh(namakoGeo, mats.namakoWall);
      namako.position.y = 0.64;
      namako.castShadow = true;
      namako.receiveShadow = true;
      tierGrp.add(namako);
    }

    // 2) Dark yakisugi timber corner posts & horizontal belt beams
    const postGeo = trackGeo(new THREE.BoxGeometry(0.24, tier.h + 0.04, 0.24));
    for (const px of [-tier.w / 2, tier.w / 2]) {
      for (const pz of [-tier.d / 2, tier.d / 2]) {
        const post = new THREE.Mesh(postGeo, mats.yakisugiTimber);
        post.position.set(px, tier.h / 2, pz);
        tierGrp.add(post);
      }
    }
    const beltXGeo = trackGeo(new THREE.BoxGeometry(tier.w + 0.16, 0.16, tier.d + 0.16));
    for (const by of [0.12, idx === 0 ? 1.3 : tier.h * 0.52]) {
      const belt = new THREE.Mesh(beltXGeo, mats.yakisugiTimber);
      belt.position.y = by;
      tierGrp.add(belt);
    }

    // 3) Glowing shoji lattice windows on front, back, left, right facades
    const winCountX = Math.max(2, Math.floor(tier.w / 2.2));
    const winGeo = trackGeo(new THREE.BoxGeometry(0.92, tier.h * 0.44, 0.08));
    for (let wi = 0; wi < winCountX; wi++) {
      const wx = ((wi + 0.5) / winCountX - 0.5) * (tier.w * 0.72);
      for (const fz of [tier.d / 2 + 0.02, -tier.d / 2 - 0.02]) {
        const win = new THREE.Mesh(winGeo, mats.shojiWindow);
        win.position.set(wx, tier.h * 0.58, fz);
        tierGrp.add(win);
      }
    }
    const winCountZ = Math.max(2, Math.floor(tier.d / 2.2));
    const sideWinGeo = trackGeo(new THREE.BoxGeometry(0.08, tier.h * 0.44, 0.88));
    for (let wi = 0; wi < winCountZ; wi++) {
      const wz = ((wi + 0.5) / winCountZ - 0.5) * (tier.d * 0.7);
      for (const fx of [tier.w / 2 + 0.02, -tier.w / 2 - 0.02]) {
        const win = new THREE.Mesh(sideWinGeo, mats.shojiWindow);
        win.position.set(fx, tier.h * 0.58, wz);
        tierGrp.add(win);
      }
    }

    // Upper observation balcony & vermilion/timber railing on top tier (idx === 4)
    if (idx === tiers.length - 1) {
      const balGeo = trackGeo(new THREE.BoxGeometry(tier.w + 1.2, 0.18, tier.d + 1.2));
      const bal = new THREE.Mesh(balGeo, mats.yakisugiTimber);
      bal.position.y = 0.08;
      bal.castShadow = true;
      tierGrp.add(bal);

      const railH = 0.58;
      const railFrontGeo = trackGeo(new THREE.BoxGeometry(tier.w + 1.2, 0.09, 0.09));
      const railSideGeo = trackGeo(new THREE.BoxGeometry(0.09, 0.09, tier.d + 1.2));
      for (const rz of [(tier.d + 1.1) / 2, -(tier.d + 1.1) / 2]) {
        const r = new THREE.Mesh(railFrontGeo, mats.vermilionLacquer);
        r.position.set(0, railH, rz);
        tierGrp.add(r);
      }
      for (const rx of [(tier.w + 1.1) / 2, -(tier.w + 1.1) / 2]) {
        const r = new THREE.Mesh(railSideGeo, mats.vermilionLacquer);
        r.position.set(rx, railH, 0);
        tierGrp.add(r);
      }
    }

    // 4) Sweeping upturned kawara roof skirt
    const nextTier = tiers[idx + 1];
    const topW = nextTier ? nextTier.w / 2 + 0.15 : 1.35;
    const topD = nextTier ? nextTier.d / 2 + 0.15 : 0.28;
    const roofGeo = trackGeo(
      createCurvedRoofGeometry(
        topW,
        topD,
        tier.w / 2 + tier.eaveOut,
        tier.d / 2 + tier.eaveOut,
        tier.roofH,
        tier.flare,
      ),
    );
    const roof = new THREE.Mesh(roofGeo, mats.kawaraRoof);
    roof.position.y = tier.h - 0.18;
    roof.castShadow = true;
    roof.receiveShadow = true;
    tierGrp.add(roof);

    // Exposed timber eave soffit rim & projecting taruki rafters beneath the roof overhang
    const soffitGeo = trackGeo(
      new THREE.BoxGeometry(tier.w + tier.eaveOut * 1.45, 0.16, tier.d + tier.eaveOut * 1.45),
    );
    const soffit = new THREE.Mesh(soffitGeo, mats.yakisugiTimber);
    soffit.position.y = tier.h - 0.12;
    tierGrp.add(soffit);

    const rafterCountX = Math.max(5, Math.floor(tier.w / 1.15));
    for (let ri = 0; ri < rafterCountX; ri++) {
      const rx = ((ri + 0.5) / rafterCountX - 0.5) * (tier.w + tier.eaveOut * 0.9);
      for (const rz of [tier.d / 2 + tier.eaveOut * 0.55, -(tier.d / 2 + tier.eaveOut * 0.55)]) {
        const raf = new THREE.Mesh(rafterGeo, mats.yakisugiTimber);
        raf.position.set(rx, tier.h - 0.22, rz);
        raf.rotation.x = rz > 0 ? 0.22 : -0.22;
        tierGrp.add(raf);
      }
    }
    const rafterCountZ = Math.max(4, Math.floor(tier.d / 1.15));
    for (let ri = 0; ri < rafterCountZ; ri++) {
      const rz = ((ri + 0.5) / rafterCountZ - 0.5) * (tier.d + tier.eaveOut * 0.9);
      for (const rx of [tier.w / 2 + tier.eaveOut * 0.55, -(tier.w / 2 + tier.eaveOut * 0.55)]) {
        const raf = new THREE.Mesh(rafterGeo, mats.yakisugiTimber);
        raf.position.set(rx, tier.h - 0.22, rz);
        raf.rotation.y = Math.PI / 2;
        raf.rotation.z = rx > 0 ? -0.22 : 0.22;
        tierGrp.add(raf);
      }
    }

    // 5) Decorative triangular chidori-hafu gables on select tiers
    if (tier.gables) {
      const gable = createGableDormer(
        tier.w * 0.42,
        tier.roofH * 0.95,
        1.1,
        mats,
        trackGeo,
      );
      gable.position.set(0, tier.h + 0.12, tier.d / 2 + 0.55);
      tierGrp.add(gable);
    }

    // 6) Top ridge beam & brushed gold Shachihoko finials on the crowning tier
    if (idx === tiers.length - 1) {
      const ridgeY = tier.h - 0.18 + tier.roofH;
      const ridgeGeo = trackGeo(new THREE.BoxGeometry(topW * 2.15, 0.32, 0.42));
      const ridge = new THREE.Mesh(ridgeGeo, mats.kawaraRoof);
      ridge.position.y = ridgeY + 0.08;
      ridge.castShadow = true;
      tierGrp.add(ridge);

      for (const sx of [-topW + 0.15, topW - 0.15]) {
        const shachi = new THREE.Mesh(shachihokoGeo, mats.brushedGold);
        shachi.position.set(sx, ridgeY + 0.72, 0);
        shachi.scale.set(0.95, 0.95, 0.95);
        if (sx > 0) shachi.rotation.y = Math.PI;
        shachi.castShadow = true;
        tierGrp.add(shachi);
      }
    }

    curY += tier.h + (idx < tiers.length - 1 ? 0.85 : 0);
  });

  // =========================================================================
  // 2. FLANKING COURTYARD YAGURA PAVILION & COVERED CORRIDOR (-10, 0, -21)
  // =========================================================================
  const buildPavilion = (
    px: number,
    pz: number,
    w: number,
    d: number,
    stories: number,
    rotY = 0,
  ) => {
    const pav = new THREE.Group();
    pav.position.set(px, 0, pz);
    pav.rotation.y = rotY;
    group.add(pav);

    // Contact shadow
    const pShGeo = trackGeo(new THREE.PlaneGeometry(w + 5, d + 5));
    const pSh = new THREE.Mesh(pShGeo, mats.contactShadowMat);
    pSh.rotation.x = -Math.PI / 2;
    pSh.position.y = 0.03;
    pav.add(pSh);

    // Stone plinth
    const plinthH = 1.1;
    const plinthGeo = trackGeo(new THREE.BoxGeometry(w + 1.1, plinthH, d + 1.1));
    const plinth = new THREE.Mesh(plinthGeo, mats.ishigakiStone);
    plinth.position.y = plinthH / 2;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    pav.add(plinth);

    // Hinoki wooden engawa veranda deck + corner veranda posts
    const deckGeo = trackGeo(new THREE.BoxGeometry(w + 1.8, 0.2, d + 1.8));
    const deck = new THREE.Mesh(deckGeo, mats.hinokiDeck);
    deck.position.y = plinthH + 0.1;
    deck.receiveShadow = true;
    pav.add(deck);

    const engawaPostGeo = trackGeo(new THREE.BoxGeometry(0.14, 2.35, 0.14));
    for (const ex of [-w / 2 - 0.72, w / 2 + 0.72]) {
      for (const ez of [-d / 2 - 0.72, d / 2 + 0.72]) {
        const ep = new THREE.Mesh(engawaPostGeo, mats.yakisugiTimber);
        ep.position.set(ex, plinthH + 1.32, ez);
        ep.castShadow = true;
        pav.add(ep);
      }
    }

    let y = plinthH + 0.2;
    for (let s = 0; s < stories; s++) {
      const sw = w * (1 - s * 0.2);
      const sd = d * (1 - s * 0.2);
      const sh = s === 0 ? 2.5 : 2.1;

      const bodyGeo = trackGeo(new THREE.BoxGeometry(sw, sh, sd));
      const body = new THREE.Mesh(bodyGeo, mats.shikkuiPlaster);
      body.position.y = y + sh / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      pav.add(body);

      // Timber corner pillars
      const colGeo = trackGeo(new THREE.BoxGeometry(0.2, sh, 0.2));
      for (const cx of [-sw / 2, sw / 2]) {
        for (const cz of [-sd / 2, sd / 2]) {
          const col = new THREE.Mesh(colGeo, mats.yakisugiTimber);
          col.position.set(cx, y + sh / 2, cz);
          pav.add(col);
        }
      }

      // Shoji panels
      const shojiGeo = trackGeo(new THREE.BoxGeometry(sw * 0.56, sh * 0.54, sd + 0.06));
      const shoji = new THREE.Mesh(shojiGeo, mats.shojiWindow);
      shoji.position.y = y + sh * 0.52;
      pav.add(shoji);

      const isTop = s === stories - 1;
      const rTopW = isTop ? 0.9 : sw * 0.42;
      const rTopD = isTop ? 0.25 : sd * 0.42;
      const rGeo = trackGeo(
        createCurvedRoofGeometry(
          rTopW,
          rTopD,
          sw / 2 + 1.35,
          sd / 2 + 1.35,
          isTop ? 1.6 : 1.15,
          0.42,
        ),
      );
      const rMesh = new THREE.Mesh(rGeo, mats.kawaraRoof);
      rMesh.position.y = y + sh - 0.14;
      rMesh.castShadow = true;
      rMesh.receiveShadow = true;
      pav.add(rMesh);

      if (isTop) {
        const ridgeGeo = trackGeo(new THREE.BoxGeometry(rTopW * 2.1, 0.22, 0.28));
        const ridge = new THREE.Mesh(ridgeGeo, mats.kawaraRoof);
        ridge.position.y = y + sh - 0.14 + 1.6;
        pav.add(ridge);
      }

      y += sh + 0.55;
    }
  };

  // Left 2-story Yagura watchtower pavilion
  buildPavilion(-9.5, -21, 6.2, 5.4, 2, 0.04);

  // Covered connecting gallery corridor between Yagura and Keep
  const corrGrp = new THREE.Group();
  corrGrp.position.set(-2.5, 0, -21);
  group.add(corrGrp);
  const corrBaseGeo = trackGeo(new THREE.BoxGeometry(8.5, 1.3, 3.2));
  const corrBase = new THREE.Mesh(corrBaseGeo, mats.ishigakiStone);
  corrBase.position.y = 0.65;
  corrBase.castShadow = true;
  corrBase.receiveShadow = true;
  corrGrp.add(corrBase);
  const corrWallGeo = trackGeo(new THREE.BoxGeometry(8.2, 2.2, 2.6));
  const corrWall = new THREE.Mesh(corrWallGeo, mats.shikkuiPlaster);
  corrWall.position.y = 2.4;
  corrWall.castShadow = true;
  corrGrp.add(corrWall);
  const corrRoofGeo = trackGeo(createCurvedRoofGeometry(4.0, 0.2, 4.6, 2.2, 1.25, 0.28));
  const corrRoof = new THREE.Mesh(corrRoofGeo, mats.kawaraRoof);
  corrRoof.position.y = 3.35;
  corrRoof.castShadow = true;
  corrGrp.add(corrRoof);

  // Right serene Tea / Garden Veranda Pavilion overlooking the Koi Pond
  buildPavilion(20.5, -12.5, 6.8, 5.2, 1, -0.35);

  // =========================================================================
  // 3. COURTYARD OTEMON GATEHOUSE & PERIMETER WALL (HEI)
  // =========================================================================
  const gateGrp = new THREE.Group();
  gateGrp.position.set(4.5, 0, -9.2);
  group.add(gateGrp);

  // Twin gate timber piers + central opening
  const pierGeo = trackGeo(new THREE.BoxGeometry(1.5, 3.0, 1.6));
  for (const gx of [-2.2, 2.2]) {
    const pier = new THREE.Mesh(pierGeo, mats.yakisugiTimber);
    pier.position.set(gx, 1.5, 0);
    pier.castShadow = true;
    pier.receiveShadow = true;
    gateGrp.add(pier);
  }
  const lintelGeo = trackGeo(new THREE.BoxGeometry(6.8, 0.6, 1.9));
  const lintel = new THREE.Mesh(lintelGeo, mats.yakisugiTimber);
  lintel.position.set(0, 3.1, 0);
  lintel.castShadow = true;
  gateGrp.add(lintel);

  const gateUpperGeo = trackGeo(new THREE.BoxGeometry(6.4, 1.4, 2.1));
  const gateUpper = new THREE.Mesh(gateUpperGeo, mats.shikkuiPlaster);
  gateUpper.position.set(0, 4.0, 0);
  gateUpper.castShadow = true;
  gateGrp.add(gateUpper);

  const gateShojiGeo = trackGeo(new THREE.BoxGeometry(3.8, 0.85, 2.16));
  const gateShoji = new THREE.Mesh(gateShojiGeo, mats.shojiWindow);
  gateShoji.position.set(0, 4.0, 0);
  gateGrp.add(gateShoji);

  const gateRoofGeo = trackGeo(createCurvedRoofGeometry(2.6, 0.25, 4.5, 2.2, 1.45, 0.38));
  const gateRoof = new THREE.Mesh(gateRoofGeo, mats.kawaraRoof);
  gateRoof.position.set(0, 4.55, 0);
  gateRoof.castShadow = true;
  gateGrp.add(gateRoof);

  // Heavy timber double gate doors swung ajar with brushed-gold boss studs
  const doorGeo = trackGeo(new THREE.BoxGeometry(1.32, 2.7, 0.18));
  const studGeo = trackGeo(new THREE.SphereGeometry(0.055, 8, 6));
  for (const side of [-1, 1]) {
    const doorPivot = new THREE.Group();
    doorPivot.position.set(side * 1.42, 0, 0);
    doorPivot.rotation.y = side * -0.58; // Angled open invitingly toward courtyard
    gateGrp.add(doorPivot);

    const doorPanel = new THREE.Mesh(doorGeo, mats.hinokiDeck);
    doorPanel.position.set(-side * 0.68, 1.38, 0);
    doorPanel.castShadow = true;
    doorPivot.add(doorPanel);

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const stud = new THREE.Mesh(studGeo, mats.brushedGold);
        stud.position.set(-side * (0.28 + col * 0.38), 0.55 + row * 0.85, 0.1);
        doorPivot.add(stud);
      }
    }
  }

  // Flanking courtyard walls (Hei) with stone base, namako wainscoting, plaster & tiled coping
  const buildWallSegment = (wx: number, wz: number, len: number, rotY = 0) => {
    const wg = new THREE.Group();
    wg.position.set(wx, 0, wz);
    wg.rotation.y = rotY;
    group.add(wg);

    const stoneBase = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(len, 0.78, 0.95)),
      mats.ishigakiStone,
    );
    stoneBase.position.y = 0.39;
    stoneBase.castShadow = true;
    stoneBase.receiveShadow = true;
    wg.add(stoneBase);

    const namakoBand = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(len, 0.68, 0.72)),
      mats.namakoWall,
    );
    namakoBand.position.y = 1.1;
    namakoBand.castShadow = true;
    namakoBand.receiveShadow = true;
    wg.add(namakoBand);

    const plasterWall = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(len, 1.0, 0.65)),
      mats.shikkuiPlaster,
    );
    plasterWall.position.y = 1.9;
    plasterWall.castShadow = true;
    plasterWall.receiveShadow = true;
    wg.add(plasterWall);

    const coping = new THREE.Mesh(
      trackGeo(createCurvedRoofGeometry(len / 2 - 0.1, 0.08, len / 2 + 0.25, 0.65, 0.55, 0.08, 6)),
      mats.kawaraRoof,
    );
    coping.position.y = 2.32;
    coping.castShadow = true;
    wg.add(coping);
  };

  buildWallSegment(-5.5, -9.2, 14.0, 0);
  buildWallSegment(12.2, -9.2, 9.5, 0);
  buildWallSegment(-12.5, -14.8, 11.4, Math.PI / 2);

  return {
    group,
    dispose: () => {
      for (const g of geometries) {
        g.dispose();
      }
    },
  };
}

export function buildPalaceByStyle(
  style: PalaceStyle,
  mats: SceneMaterialLibrary,
): PalaceBuildResult {
  switch (style) {
    case 'russian':
      return buildRussianPalace(mats);
    case 'victorian':
      return buildVictorianPalace(mats);
    case 'mughal':
      return buildMughalPalace(mats);
    case 'persian':
      return buildPersianPalace(mats);
    case 'japanese':
    default:
      return buildPalaceComplex(mats);
  }
}
