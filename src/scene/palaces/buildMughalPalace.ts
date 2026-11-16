import * as THREE from 'three';
import type { PalaceBuildResult } from '../buildPalace';
import type { SceneMaterialLibrary } from '../materials';

/**
 * Cusped 7-lobe multifoil Mughal arch spandrel panel (ExtrudeGeometry)
 */
function createMughalCuspedArch(
  width: number,
  height: number,
  depth: number,
  mat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
): THREE.Mesh {
  const hw = width / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, 0);
  shape.lineTo(-hw, height);
  shape.lineTo(hw, height);
  shape.lineTo(hw, 0);

  // Carve inner scalloped cusped arch profile from right to left
  const archBaseY = height * 0.34;
  const archTopY = height * 0.86;
  const archW = hw * 0.78;
  shape.lineTo(archW, 0);
  shape.lineTo(archW, archBaseY);

  const lobes = 7;
  for (let i = 0; i < lobes; i++) {
    const t0 = i / lobes;
    const t1 = (i + 1) / lobes;
    const a0 = t0 * Math.PI;
    const a1 = t1 * Math.PI;
    const am = (a0 + a1) * 0.5;
    const x1 = Math.cos(a1) * archW;
    const y1 = archBaseY + Math.sin(a1) * (archTopY - archBaseY);
    const xm = Math.cos(am) * archW * 0.84;
    const ym = archBaseY + Math.sin(am) * (archTopY - archBaseY) * 0.84;
    shape.quadraticCurveTo(xm, ym, x1, y1);
  }

  shape.lineTo(-archW, 0);
  shape.closePath();

  const geo = trackGeo(
    new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 2,
    }),
  );
  geo.translate(0, 0, -depth / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Shah Jahan-era Sarv-andam fluted Mughal baluster column with lotus-pot base
 * and scalloped muqarnas capital
 */
function createMughalBalusterColumn(
  height: number,
  radius: number,
  marbleMat: THREE.Material,
  inlayMat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
): THREE.Group {
  const g = new THREE.Group();

  // Stepped square plinth
  const plinth = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(radius * 2.9, height * 0.09, radius * 2.9)),
    inlayMat,
  );
  plinth.position.y = height * 0.045;
  g.add(plinth);

  // Bulbous lotus-petal ghata-pallava pot base (LatheGeometry)
  const potProfile: THREE.Vector2[] = [
    new THREE.Vector2(radius * 1.15, 0),
    new THREE.Vector2(radius * 1.55, height * 0.07),
    new THREE.Vector2(radius * 1.35, height * 0.14),
    new THREE.Vector2(radius * 0.92, height * 0.18),
  ];
  const pot = new THREE.Mesh(trackGeo(new THREE.LatheGeometry(potProfile, 12)), marbleMat);
  pot.position.y = height * 0.09;
  pot.castShadow = true;
  g.add(pot);

  // Tapered 12-faceted baluster shaft
  const shaftH = height * 0.56;
  const shaft = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(radius * 0.82, radius * 1.05, shaftH, 12)),
    marbleMat,
  );
  shaft.position.y = height * 0.27 + shaftH * 0.5;
  shaft.castShadow = true;
  g.add(shaft);

  // Neck ring + flared muqarnas capital
  const ring = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(radius * 0.9, radius * 0.14, 6, 12)),
    inlayMat,
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = height * 0.83;
  g.add(ring);

  const cap = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(radius * 1.48, radius * 0.84, height * 0.14, 10)),
    marbleMat,
  );
  cap.position.y = height * 0.91;
  g.add(cap);

  const abacus = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(radius * 2.8, height * 0.04, radius * 2.8)),
    marbleMat,
  );
  abacus.position.y = height * 0.98;
  g.add(abacus);

  return g;
}

/**
 * Slender octagonal Mughal Guldasta corner lotus pinnacle
 */
function createGuldastaPinnacle(
  height: number,
  radius: number,
  shaftMat: THREE.Material,
  goldMat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
): THREE.Group {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(radius * 0.72, radius, height * 0.74, 8)),
    shaftMat,
  );
  shaft.position.y = height * 0.37;
  shaft.castShadow = true;
  g.add(shaft);

  const bud = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(radius * 1.35, 10, 8)),
    shaftMat,
  );
  bud.scale.set(1, 1.35, 1);
  bud.position.y = height * 0.8;
  g.add(bud);

  const finial = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(radius * 0.55, height * 0.26, 8)),
    goldMat,
  );
  finial.position.y = height * 0.98;
  g.add(finial);

  return g;
}

/**
 * Bulbous Mughal dome with sculpted 16-petal inverted lotus (padmakosha) collar & golden kalasha finial
 */
function createMughalDome(
  radius: number,
  height: number,
  domeMat: THREE.Material,
  inlayMat: THREE.Material,
  goldMat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
): THREE.Group {
  const g = new THREE.Group();

  const pts: THREE.Vector2[] = [
    new THREE.Vector2(radius * 0.78, 0),
    new THREE.Vector2(radius * 0.96, height * 0.18),
    new THREE.Vector2(radius * 1.03, height * 0.38),
    new THREE.Vector2(radius * 0.88, height * 0.62),
    new THREE.Vector2(radius * 0.52, height * 0.84),
    new THREE.Vector2(radius * 0.14, height * 0.96),
    new THREE.Vector2(0, height),
  ];
  const domeGeo = trackGeo(new THREE.LatheGeometry(pts, 28));
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.castShadow = true;
  g.add(dome);

  // Sculpted 16-petal inverted lotus (padmakosha) cap
  const lotus = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(radius * 0.38, height * 0.17, 16)),
    inlayMat,
  );
  lotus.rotation.x = Math.PI;
  lotus.position.y = height * 0.97;
  g.add(lotus);

  const petalGeo = trackGeo(new THREE.SphereGeometry(radius * 0.08, 6, 5));
  for (let p = 0; p < 12; p++) {
    const a = (p / 12) * Math.PI * 2;
    const pet = new THREE.Mesh(petalGeo, domeMat);
    pet.scale.set(0.8, 1.8, 0.55);
    pet.position.set(Math.cos(a) * radius * 0.25, height * 0.92, Math.sin(a) * radius * 0.25);
    pet.rotation.y = -a;
    pet.rotation.z = 0.55;
    g.add(pet);
  }

  // Multi-urn golden kalasha & crescent spire
  const spire = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.024, 0.06, height * 0.48, 8)),
    goldMat,
  );
  spire.position.y = height * 1.22;
  g.add(spire);

  const orb1 = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(radius * 0.12, 10, 8)), goldMat);
  orb1.position.y = height * 1.1;
  g.add(orb1);

  const orb2 = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(radius * 0.08, 10, 8)), goldMat);
  orb2.position.y = height * 1.24;
  g.add(orb2);

  return g;
}

/**
 * Octagonal Mughal pillared Chhatri kiosk cupola with baluster posts & sloped chhajja
 */
function createChhatri(
  radius: number,
  colHeight: number,
  pillarMat: THREE.Material,
  inlayMat: THREE.Material,
  domeMat: THREE.Material,
  goldMat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
): THREE.Group {
  const g = new THREE.Group();

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const col = createMughalBalusterColumn(colHeight, 0.095, pillarMat, inlayMat, trackGeo);
    col.position.set(Math.cos(a) * radius * 0.72, 0, Math.sin(a) * radius * 0.72);
    g.add(col);
  }

  // Overhanging sloped chhajja stone eave skirt
  const eave = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(radius * 0.84, radius * 1.24, 0.28, 8)),
    pillarMat,
  );
  eave.position.y = colHeight + 0.1;
  eave.castShadow = true;
  g.add(eave);

  const trimRing = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(radius * 0.9, radius * 0.9, 0.14, 8)),
    inlayMat,
  );
  trimRing.position.y = colHeight + 0.25;
  g.add(trimRing);

  const dome = createMughalDome(
    radius * 0.84,
    radius * 1.18,
    domeMat,
    inlayMat,
    goldMat,
    trackGeo,
  );
  dome.position.y = colHeight + 0.28;
  g.add(dome);

  return g;
}

export function buildMughalPalace(mats: SceneMaterialLibrary): PalaceBuildResult {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };

  // =========================================================================
  // 1. CENTRAL MAKRANA MARBLE DIWAN-I-KHAS PALACE (6, 0, -22)
  // =========================================================================
  const mainGrp = new THREE.Group();
  mainGrp.position.set(6, 0, -22);
  group.add(mainGrp);

  const shadow = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(26, 22)), mats.contactShadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  mainGrp.add(shadow);

  // Elevated Agra red sandstone Chabutra plinth with inlaid marble dado panels
  const plinthH = 2.4;
  const plinth = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(16.4, plinthH, 12.6)),
    mats.redSandstone,
  );
  plinth.position.y = plinthH / 2;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  mainGrp.add(plinth);

  const dadoPanelGeo = trackGeo(new THREE.BoxGeometry(2.15, 1.3, 0.14));
  for (const dx of [-5.8, -3.3, 3.3, 5.8]) {
    const dp = new THREE.Mesh(dadoPanelGeo, mats.makranaMarble);
    dp.position.set(dx, plinthH * 0.5, 6.32);
    mainGrp.add(dp);
  }

  const marbleCope = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(16.8, 0.3, 13.0)),
    mats.makranaMarble,
  );
  marbleCope.position.y = plinthH + 0.15;
  mainGrp.add(marbleCope);

  // Ceremonial front sandstone steps + flanked carved marble ramp cheeks
  const stepGeo = trackGeo(new THREE.BoxGeometry(4.6, 0.3, 0.55));
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const step = new THREE.Mesh(stepGeo, mats.redSandstone);
    step.position.set(0, 0.15 + t * (plinthH - 0.15), 8.25 - t * 2.0);
    step.castShadow = true;
    step.receiveShadow = true;
    mainGrp.add(step);
  }
  for (const rx of [-2.48, 2.48]) {
    const cheek = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.32, 0.55, 2.6)),
      mats.makranaMarble,
    );
    cheek.position.set(rx, plinthH * 0.48, 7.2);
    cheek.rotation.x = 0.72;
    mainGrp.add(cheek);
  }

  // Main Diwan-i-Khas Marble Pavilion Arcade + Recessed Glowing Audience Chamber
  const hallY = plinthH + 0.3;
  const hallW = 13.4;
  const hallD = 9.8;
  const hallH = 4.65;

  // Recessed inner sanctuary core with warm illuminated royal archways & red-sandstone dado
  const innerW = hallW - 3.0;
  const innerD = hallD - 3.0;
  const innerCore = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(innerW, hallH - 0.2, innerD)),
    mats.makranaMarble,
  );
  innerCore.position.y = hallY + hallH / 2;
  innerCore.castShadow = true;
  innerCore.receiveShadow = true;
  mainGrp.add(innerCore);

  const innerDado = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(innerW + 0.08, 1.15, innerD + 0.08)),
    mats.redSandstone,
  );
  innerDado.position.y = hallY + 0.58;
  mainGrp.add(innerDado);

  // Warm illuminated interior throne niche & pierced Jaali lattice screens visible through colonnade
  const nicheGlowGeo = trackGeo(new THREE.BoxGeometry(1.75, 2.75, 0.18));
  const jaaliPanelGeo = trackGeo(new THREE.PlaneGeometry(1.75, 2.75));
  for (const jx of [-3.4, 0, 3.4]) {
    const glowPanel = new THREE.Mesh(nicheGlowGeo, mats.palaceWindow);
    glowPanel.position.set(jx, hallY + 2.35, innerD / 2 + 0.04);
    mainGrp.add(glowPanel);

    const jp = new THREE.Mesh(jaaliPanelGeo, mats.jaaliScreen);
    jp.position.set(jx, hallY + 2.35, innerD / 2 + 0.16);
    mainGrp.add(jp);
  }

  // Central Elevated Marble Takht Royal Throne Dais + Persian Carpet & Bolster visible inside front bay
  const takhtDais = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.6, 0.42, 1.8)),
    mats.makranaMarble,
  );
  takhtDais.position.set(0, hallY + 0.21, hallD / 2 - 1.1);
  mainGrp.add(takhtDais);
  const takhtRug = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.2, 0.08, 1.45)),
    mats.persianCarpet,
  );
  takhtRug.position.set(0, hallY + 0.45, hallD / 2 - 1.1);
  mainGrp.add(takhtRug);
  const bolster = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.14, 0.14, 1.1, 10)),
    mats.brushedGold,
  );
  bolster.rotation.z = Math.PI / 2;
  bolster.position.set(0, hallY + 0.62, hallD / 2 - 1.45);
  mainGrp.add(bolster);

  // Front & back colonnade of 5 cusped multifoil Mughal arches + sculpted baluster columns
  const bayW = hallW / 5;
  for (let bi = 0; bi < 5; bi++) {
    const bx = (bi - 2) * bayW;
    for (const fz of [hallD / 2, -hallD / 2]) {
      const arch = createMughalCuspedArch(
        bayW + 0.04,
        hallH,
        0.44,
        mats.makranaMarble,
        trackGeo,
      );
      arch.position.set(bx, hallY, fz);
      mainGrp.add(arch);

      // Pietra-dura red-sandstone spandrel medallion rosettes above each arch
      if (fz > 0) {
        const medGeo = trackGeo(new THREE.CircleGeometry(0.18, 12));
        for (const mx of [-bayW * 0.34, bayW * 0.34]) {
          const med = new THREE.Mesh(medGeo, mats.redSandstone);
          med.position.set(bx + mx, hallY + hallH * 0.78, fz + 0.24);
          mainGrp.add(med);
        }

        // Hanging brass Mughal lantern inside front colonnade arch
        const chain = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.015, 0.015, 0.9, 5)),
          mats.brushedGold,
        );
        chain.position.set(bx, hallY + hallH * 0.72, fz - 0.52);
        mainGrp.add(chain);
        const lamp = new THREE.Mesh(
          trackGeo(new THREE.OctahedronGeometry(0.16, 0)),
          mats.lanternGlow,
        );
        lamp.position.set(bx, hallY + hallH * 0.58, fz - 0.52);
        mainGrp.add(lamp);
      }
    }
  }

  // Baluster columns separating all 5 front/back bays & 3 side bays
  for (let ci = 0; ci <= 5; ci++) {
    const cx = -hallW / 2 + ci * bayW;
    for (const cz of [hallD / 2, -hallD / 2]) {
      const col = createMughalBalusterColumn(
        hallH * 0.55,
        0.22,
        mats.makranaMarble,
        mats.redSandstone,
        trackGeo,
      );
      col.position.set(cx, hallY, cz);
      mainGrp.add(col);
    }
  }

  const sideBayD = hallD / 3;
  for (let si = 0; si < 3; si++) {
    const sz = (si - 1) * sideBayD;
    for (const fx of [-hallW / 2, hallW / 2]) {
      const arch = createMughalCuspedArch(
        sideBayD + 0.04,
        hallH,
        0.44,
        mats.makranaMarble,
        trackGeo,
      );
      arch.rotation.y = Math.PI / 2;
      arch.position.set(fx, hallY, sz);
      mainGrp.add(arch);
    }
  }
  for (let sci = 1; sci < 3; sci++) {
    const scz = -hallD / 2 + sci * sideBayD;
    for (const fx of [-hallW / 2, hallW / 2]) {
      const col = createMughalBalusterColumn(
        hallH * 0.55,
        0.22,
        mats.makranaMarble,
        mats.redSandstone,
        trackGeo,
      );
      col.position.set(fx, hallY, scz);
      mainGrp.add(col);
    }
  }

  // Red sandstone pietra-dura inlay frieze + Slanted Overhanging Chhajja Eaves + Madala Brackets
  const inlayFrieze = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(hallW + 0.42, 0.44, hallD + 0.42)),
    mats.redSandstone,
  );
  inlayFrieze.position.y = hallY + hallH + 0.14;
  mainGrp.add(inlayFrieze);

  const eaveY = hallY + hallH + 0.34;
  const frontBackEaveGeo = trackGeo(new THREE.BoxGeometry(hallW + 1.85, 0.12, 1.05));
  for (const dir of [1, -1]) {
    const fbEave = new THREE.Mesh(frontBackEaveGeo, mats.makranaMarble);
    fbEave.position.set(0, eaveY - 0.16, dir * (hallD / 2 + 0.48));
    fbEave.rotation.x = dir * 0.46;
    fbEave.castShadow = true;
    mainGrp.add(fbEave);
  }
  const sideEaveGeo = trackGeo(new THREE.BoxGeometry(1.05, 0.12, hallD + 1.85));
  for (const dir of [1, -1]) {
    const sEave = new THREE.Mesh(sideEaveGeo, mats.makranaMarble);
    sEave.position.set(dir * (hallW / 2 + 0.48), eaveY - 0.16, 0);
    sEave.rotation.z = -dir * 0.46;
    sEave.castShadow = true;
    mainGrp.add(sEave);
  }

  // Carved red-sandstone Madala corbel brackets beneath the Chhajja eaves
  const bracketGeo = trackGeo(new THREE.BoxGeometry(0.18, 0.42, 0.55));
  for (let bi = -5; bi <= 5; bi++) {
    for (const dir of [1, -1]) {
      const br = new THREE.Mesh(bracketGeo, mats.redSandstone);
      br.position.set(bi * 1.25, hallY + hallH - 0.08, dir * (hallD / 2 + 0.26));
      mainGrp.add(br);
    }
  }

  // Roof Parapet + Crenellated Kangura Lotus Cresting + 4 Corner Guldasta Pinnacles
  const roofY = hallY + hallH + 0.42;
  const parapet = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(hallW + 0.22, 0.56, hallD + 0.22)),
    mats.makranaMarble,
  );
  parapet.position.y = roofY + 0.25;
  mainGrp.add(parapet);

  const roofKangGeo = trackGeo(new THREE.CylinderGeometry(0.04, 0.26, 0.48, 4));
  for (let ki = -7; ki <= 7; ki++) {
    for (const dir of [1, -1]) {
      const rk = new THREE.Mesh(roofKangGeo, mats.redSandstone);
      rk.rotation.y = Math.PI / 4;
      rk.position.set(ki * 0.88, roofY + 0.72, dir * (hallD / 2 + 0.02));
      mainGrp.add(rk);
    }
  }
  for (const [gx, gz] of [
    [-hallW / 2 - 0.05, hallD / 2 + 0.05],
    [hallW / 2 + 0.05, hallD / 2 + 0.05],
    [-hallW / 2 - 0.05, -hallD / 2 - 0.05],
    [hallW / 2 + 0.05, -hallD / 2 - 0.05],
  ]) {
    const gp = createGuldastaPinnacle(2.15, 0.16, mats.makranaMarble, mats.brushedGold, trackGeo);
    gp.position.set(gx, roofY + 0.45, gz);
    mainGrp.add(gp);
  }

  // Central High Drum with 12 Red-Sandstone Blind Arched Niches & Bulbous Marble Dome
  const drum = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(2.68, 2.88, 2.38, 20)),
    mats.makranaMarble,
  );
  drum.position.y = roofY + 1.34;
  drum.castShadow = true;
  mainGrp.add(drum);

  const drumBand = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(2.94, 2.94, 0.28, 20)),
    mats.redSandstone,
  );
  drumBand.position.y = roofY + 0.68;
  mainGrp.add(drumBand);

  const drumTopRing = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(2.8, 2.75, 0.24, 20)),
    mats.redSandstone,
  );
  drumTopRing.position.y = roofY + 2.42;
  mainGrp.add(drumTopRing);

  const drumNicheGeo = trackGeo(new THREE.BoxGeometry(0.62, 1.05, 0.16));
  for (let ni = 0; ni < 12; ni++) {
    const a = (ni / 12) * Math.PI * 2;
    const dn = new THREE.Mesh(drumNicheGeo, mats.redSandstone);
    dn.position.set(Math.cos(a) * 2.75, roofY + 1.48, Math.sin(a) * 2.75);
    dn.rotation.y = -a + Math.PI / 2;
    mainGrp.add(dn);
  }

  const mainDome = createMughalDome(
    3.1,
    4.5,
    mats.makranaMarble,
    mats.redSandstone,
    mats.brushedGold,
    trackGeo,
  );
  mainDome.position.y = roofY + 2.5;
  mainGrp.add(mainDome);

  // 4 Corner Chhatri Cupolas flanking the central dome
  for (const [cx, cz] of [
    [-4.8, 3.2],
    [4.8, 3.2],
    [-4.8, -3.2],
    [4.8, -3.2],
  ]) {
    const ch = createChhatri(
      1.3,
      1.72,
      mats.makranaMarble,
      mats.redSandstone,
      mats.makranaMarble,
      mats.brushedGold,
      trackGeo,
    );
    ch.position.set(cx, roofY + 0.48, cz);
    mainGrp.add(ch);
  }

  // =========================================================================
  // 2. OCTAGONAL MUGHAL MINARET WATCHTOWER (-9.5, 0, -21) & GALLERY
  // =========================================================================
  const minGrp = new THREE.Group();
  minGrp.position.set(-9.5, 0, -21);
  group.add(minGrp);

  const minBase = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(2.35, 2.65, 1.85, 8)),
    mats.redSandstone,
  );
  minBase.position.y = 0.92;
  minBase.castShadow = true;
  minGrp.add(minBase);

  const minShaft1 = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.65, 1.98, 4.65, 12)),
    mats.makranaMarble,
  );
  minShaft1.position.y = 4.15;
  minShaft1.castShadow = true;
  minGrp.add(minShaft1);

  // Vertical inlaid red-sandstone ribs on minaret lower shaft
  const minRibGeo = trackGeo(new THREE.BoxGeometry(0.16, 4.5, 0.16));
  for (let mr = 0; mr < 8; mr++) {
    const a = (mr / 8) * Math.PI * 2;
    const rib = new THREE.Mesh(minRibGeo, mats.redSandstone);
    rib.position.set(Math.cos(a) * 1.82, 4.15, Math.sin(a) * 1.82);
    rib.rotation.y = -a;
    minGrp.add(rib);
  }

  const balc1 = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(2.35, 1.75, 0.45, 12)),
    mats.redSandstone,
  );
  balc1.position.y = 6.6;
  minGrp.add(balc1);

  // Pierced marble railing collar on minaret balcony
  const railRing = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(2.32, 2.32, 0.55, 12, 1, true)),
    mats.jaaliScreen,
  );
  railRing.position.y = 7.05;
  minGrp.add(railRing);

  const minShaft2 = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.36, 1.56, 3.85, 12)),
    mats.makranaMarble,
  );
  minShaft2.position.y = 8.72;
  minShaft2.castShadow = true;
  minGrp.add(minShaft2);

  const balc2 = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.92, 1.42, 0.36, 12)),
    mats.redSandstone,
  );
  balc2.position.y = 10.65;
  minGrp.add(balc2);

  const minChhatri = createChhatri(
    1.58,
    1.98,
    mats.makranaMarble,
    mats.redSandstone,
    mats.makranaMarble,
    mats.brushedGold,
    trackGeo,
  );
  minChhatri.position.y = 10.82;
  minGrp.add(minChhatri);

  // Connecting Sandstone Arcade Wing (-2.5, 0, -21)
  const linkBase = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(8.2, 2.4, 3.2)),
    mats.redSandstone,
  );
  linkBase.position.set(-2.5, 1.2, -21);
  linkBase.castShadow = true;
  group.add(linkBase);
  for (let i = 0; i < 3; i++) {
    const a = createMughalCuspedArch(2.6, 2.8, 2.6, mats.makranaMarble, trackGeo);
    a.position.set(-5.1 + i * 2.6, 2.4, -21);
    group.add(a);
  }

  // =========================================================================
  // 3. RIVERSIDE BARADARI PAVILION OVERLOOKING POND (20.5, 0, -12.5)
  // =========================================================================
  const baraGrp = new THREE.Group();
  baraGrp.position.set(20.5, 0, -12.5);
  baraGrp.rotation.y = -0.35;
  group.add(baraGrp);

  const bPlinth = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(7.3, 1.18, 5.5)),
    mats.redSandstone,
  );
  bPlinth.position.y = 0.59;
  bPlinth.castShadow = true;
  bPlinth.receiveShadow = true;
  baraGrp.add(bPlinth);

  for (let i = 0; i < 3; i++) {
    for (const bz of [-2.2, 2.2]) {
      const arch = createMughalCuspedArch(2.15, 2.85, 0.34, mats.makranaMarble, trackGeo);
      arch.position.set((i - 1) * 2.15, 1.18, bz);
      baraGrp.add(arch);
    }
  }
  for (let bi = 0; bi <= 3; bi++) {
    const bx = -3.225 + bi * 2.15;
    for (const bz of [-2.2, 2.2]) {
      const bCol = createMughalBalusterColumn(
        1.65,
        0.15,
        mats.makranaMarble,
        mats.redSandstone,
        trackGeo,
      );
      bCol.position.set(bx, 1.18, bz);
      baraGrp.add(bCol);
    }
  }
  const bRoof = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(7.6, 0.42, 5.8)),
    mats.redSandstone,
  );
  bRoof.position.y = 4.22;
  baraGrp.add(bRoof);

  const bChhatri = createChhatri(
    1.68,
    1.52,
    mats.makranaMarble,
    mats.redSandstone,
    mats.makranaMarble,
    mats.brushedGold,
    trackGeo,
  );
  bChhatri.position.y = 4.42;
  baraGrp.add(bChhatri);

  // =========================================================================
  // 4. BULAND DARWAZA GATEHOUSE & CRENELLATED SANDSTONE WALLS (z = -9.2)
  // =========================================================================
  const gateGrp = new THREE.Group();
  gateGrp.position.set(4.5, 0, -9.2);
  group.add(gateGrp);

  const pishtaq = createMughalCuspedArch(6.6, 5.9, 1.85, mats.redSandstone, trackGeo);
  gateGrp.add(pishtaq);

  // Inlaid white marble frame + spandrel medallions on Buland Darwaza
  const frameL = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.24, 5.9, 1.92)),
    mats.makranaMarble,
  );
  frameL.position.set(-3.18, 2.95, 0);
  gateGrp.add(frameL);
  const frameR = frameL.clone();
  frameR.position.x = 3.18;
  gateGrp.add(frameR);

  const pishtaqTrim = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(6.9, 0.38, 2.0)),
    mats.makranaMarble,
  );
  pishtaqTrim.position.y = 6.08;
  gateGrp.add(pishtaqTrim);

  for (const mx of [-1.9, 1.9]) {
    const spandrel = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.38, 16)), mats.makranaMarble);
    spandrel.position.set(mx, 4.95, 0.96);
    gateGrp.add(spandrel);
  }

  for (const cx of [-2.25, 0, 2.25]) {
    const gc = createChhatri(
      0.78,
      1.1,
      mats.makranaMarble,
      mats.redSandstone,
      mats.makranaMarble,
      mats.brushedGold,
      trackGeo,
    );
    gc.position.set(cx, 6.26, 0);
    gateGrp.add(gc);
  }

  const buildMughalWall = (wx: number, wz: number, len: number, rotY = 0) => {
    const wg = new THREE.Group();
    wg.position.set(wx, 0, wz);
    wg.rotation.y = rotY;
    group.add(wg);

    const wall = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(len, 2.25, 0.84)),
      mats.redSandstone,
    );
    wall.position.y = 1.12;
    wall.castShadow = true;
    wall.receiveShadow = true;
    wg.add(wall);

    const band = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(len + 0.1, 0.22, 0.92)),
      mats.makranaMarble,
    );
    band.position.y = 2.3;
    wg.add(band);

    // Kangura lotus merlon crenellations
    const count = Math.max(4, Math.floor(len / 0.95));
    const kangGeo = trackGeo(new THREE.CylinderGeometry(0.05, 0.32, 0.56, 4));
    for (let i = 0; i < count; i++) {
      const kx = ((i + 0.5) / count - 0.5) * (len - 0.5);
      const k = new THREE.Mesh(kangGeo, mats.redSandstone);
      k.rotation.y = Math.PI / 4;
      k.position.set(kx, 2.66, 0);
      wg.add(k);
    }
  };

  buildMughalWall(-5.5, -9.2, 14.0, 0);
  buildMughalWall(12.2, -9.2, 9.5, 0);
  buildMughalWall(-12.5, -14.8, 11.4, Math.PI / 2);

  return {
    group,
    dispose: () => {
      for (const g of geometries) g.dispose();
    },
  };
}
