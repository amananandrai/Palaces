import * as THREE from 'three';
import type { PalaceBuildResult } from '../buildPalace';
import type { SceneMaterialLibrary } from '../materials';

/**
 * Safavid pointed 4-centered Persian arch (Iwan / Pishtaq)
 */
function createPersianPointedArch(
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

  const innerW = hw * 0.72;
  const springY = height * 0.44;
  const apexY = height * 0.86;
  shape.lineTo(innerW, 0);
  shape.lineTo(innerW, springY);
  shape.quadraticCurveTo(innerW * 0.72, apexY * 0.9, 0, apexY);
  shape.quadraticCurveTo(-innerW * 0.72, apexY * 0.9, -innerW, springY);
  shape.lineTo(-innerW, 0);
  shape.closePath();

  const geo = trackGeo(
    new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
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
 * Ribbed Safavid Persian turquoise glazed pointed dome
 */
function createPersianDome(
  radius: number,
  height: number,
  domeMat: THREE.Material,
  goldMat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
): THREE.Group {
  const g = new THREE.Group();

  const pts: THREE.Vector2[] = [
    new THREE.Vector2(radius * 0.86, 0),
    new THREE.Vector2(radius * 1.0, height * 0.22),
    new THREE.Vector2(radius * 0.96, height * 0.46),
    new THREE.Vector2(radius * 0.72, height * 0.72),
    new THREE.Vector2(radius * 0.34, height * 0.9),
    new THREE.Vector2(0, height * 1.04),
  ];
  const domeGeo = trackGeo(new THREE.LatheGeometry(pts, 28));
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.castShadow = true;
  g.add(dome);

  // Subtle gold meridian ribs & pointed alem crescent finial
  const ribPts = pts.slice(0, -1).map((p) => new THREE.Vector3(p.x * 1.015, p.y, 0));
  ribPts.push(new THREE.Vector3(0.01, height * 1.02, 0));
  const ribGeo = trackGeo(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ribPts), 12, Math.max(0.016, radius * 0.025), 5, false),
  );
  for (let r = 0; r < 10; r++) {
    const rib = new THREE.Mesh(ribGeo, goldMat);
    rib.rotation.y = (r / 10) * Math.PI * 2;
    g.add(rib);
  }

  const fin = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.03, 0.065, height * 0.38, 8)),
    goldMat,
  );
  fin.position.y = height * 1.18;
  g.add(fin);

  const orb = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(radius * 0.09, 10, 8)), goldMat);
  orb.position.y = height * 1.12;
  g.add(orb);

  return g;
}

/**
 * Chehel Sotoun-style Persian Talar columned wooden veranda portico
 */
function createTalarPortico(
  width: number,
  depth: number,
  height: number,
  mats: SceneMaterialLibrary,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
): THREE.Group {
  const g = new THREE.Group();

  // Coffered overhanging timber ceiling canopy
  const roof = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(width + 0.6, 0.45, depth + 0.6)),
    mats.yakisugiTimber,
  );
  roof.position.y = height + 0.22;
  roof.castShadow = true;
  g.add(roof);

  const frieze = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(width + 0.72, 0.22, depth + 0.72)),
    mats.persianTile,
  );
  frieze.position.y = height + 0.52;
  g.add(frieze);

  // Slender faceted cedar columns with flared muqarnas capitals & stone bases
  const cols = Math.max(2, Math.round(width / 2.2));
  const baseGeo = trackGeo(new THREE.CylinderGeometry(0.2, 0.26, 0.32, 8));
  const shaftGeo = trackGeo(new THREE.CylinderGeometry(0.12, 0.16, height - 0.55, 10));
  const capGeo = trackGeo(new THREE.CylinderGeometry(0.32, 0.14, 0.38, 8));

  for (let i = 0; i < cols; i++) {
    const cx = ((i + 0.5) / cols - 0.5) * (width - 0.6);
    const cz = depth / 2 - 0.25;

    const base = new THREE.Mesh(baseGeo, mats.graniteStone);
    base.position.set(cx, 0.16, cz);
    g.add(base);

    const shaft = new THREE.Mesh(shaftGeo, mats.hinokiDeck);
    shaft.position.set(cx, 0.32 + (height - 0.55) / 2, cz);
    shaft.castShadow = true;
    g.add(shaft);

    const cap = new THREE.Mesh(capGeo, mats.yakisugiTimber);
    cap.position.set(cx, height - 0.14, cz);
    g.add(cap);
  }

  return g;
}

export function buildPersianPalace(mats: SceneMaterialLibrary): PalaceBuildResult {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };

  // =========================================================================
  // 1. CENTRAL SAFAVID IWAN & TURQUOISE DOME PALACE (6, 0, -22)
  // =========================================================================
  const mainGrp = new THREE.Group();
  mainGrp.position.set(6, 0, -22);
  group.add(mainGrp);

  const shadow = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(26, 22)), mats.contactShadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  mainGrp.add(shadow);

  // Raised ochre-stone platform terrace + foreground Howz reflecting pool
  const plinthH = 1.75;
  const plinth = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(16.6, plinthH, 12.8)),
    mats.ochrePlaster,
  );
  plinth.position.y = plinthH / 2;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  mainGrp.add(plinth);

  const stairGeo = trackGeo(new THREE.BoxGeometry(4.8, 0.28, 0.55));
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const step = new THREE.Mesh(stairGeo, mats.graniteStone);
    step.position.set(0, 0.14 + t * (plinthH - 0.14), 8.2 - t * 1.7);
    step.castShadow = true;
    mainGrp.add(step);
  }

  // Turquoise-rimmed Howz reflecting pool right on the front terrace
  const howzRim = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(5.6, 0.28, 3.2)),
    mats.graniteStone,
  );
  howzRim.position.set(0, plinthH + 0.12, 4.7);
  mainGrp.add(howzRim);
  const howzWater = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(5.0, 2.6)),
    mats.turquoiseGlaze,
  );
  howzWater.rotation.x = -Math.PI / 2;
  howzWater.position.set(0, plinthH + 0.27, 4.7);
  mainGrp.add(howzWater);

  // Carved marble lotus fountain spout inside terrace Howz pool
  const howzSpout = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.12, 0.26, 0.42, 10)),
    mats.makranaMarble,
  );
  howzSpout.position.set(0, plinthH + 0.44, 4.7);
  mainGrp.add(howzSpout);
  const howzPlume = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(0.24, 0.55, 8)),
    mats.conservatoryGlass,
  );
  howzPlume.rotation.x = Math.PI;
  howzPlume.position.set(0, plinthH + 0.85, 4.7);
  mainGrp.add(howzPlume);

  // Main Sanctuary Hall behind the Pishtaq
  const hallY = plinthH;
  const hallW = 14.8;
  const hallD = 9.2;
  const hallH = 5.4;
  const hallBody = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(hallW, hallH, hallD)),
    mats.ochrePlaster,
  );
  hallBody.position.set(0, hallY + hallH / 2, -1.2);
  hallBody.castShadow = true;
  hallBody.receiveShadow = true;
  mainGrp.add(hallBody);

  // Haft-rangi mosaic tile frieze wrapping main hall
  const tileFrieze = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(hallW + 0.18, 1.35, hallD + 0.18)),
    mats.persianTile,
  );
  tileFrieze.position.set(0, hallY + hallH - 0.72, -1.2);
  mainGrp.add(tileFrieze);

  // Flanking double-tier pointed taqcheh window niches
  const nicheGeo = trackGeo(new THREE.BoxGeometry(1.45, 2.1, 0.25));
  for (const nx of [-5.4, -3.5, 3.5, 5.4]) {
    const n = new THREE.Mesh(nicheGeo, mats.palaceWindow);
    n.position.set(nx, hallY + 2.4, 3.35);
    mainGrp.add(n);
  }

  // Monumental Central Pishtaq & Deep Pointed Iwan Portal
  const pishtaq = createPersianPointedArch(5.6, 8.2, 2.4, mats.persianTile, trackGeo);
  pishtaq.position.set(0, hallY, 3.2);
  mainGrp.add(pishtaq);

  // Recessed shadowed vault back-wall with stepped Muqarnas honeycomb tiers & arched entrance
  const iwanBack = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(4.0, 6.2, 0.35)),
    mats.ochrePlaster,
  );
  iwanBack.position.set(0, hallY + 3.1, 2.25);
  mainGrp.add(iwanBack);
  for (let mt = 0; mt < 4; mt++) {
    const tierW = 3.55 - mt * 0.62;
    const tierY = hallY + 4.9 + mt * 0.44;
    const muqTier = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(tierW * 0.48, tierW * 0.56, 0.42, 8, 1, false, 0, Math.PI)),
      mt % 2 === 0 ? mats.persianTile : mats.turquoiseGlaze,
    );
    muqTier.position.set(0, tierY, 2.55 + mt * 0.22);
    mainGrp.add(muqTier);
  }
  const iwanDoor = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.85, 3.2, 0.42)),
    mats.yakisugiTimber,
  );
  iwanDoor.position.set(0, hallY + 1.6, 2.3);
  mainGrp.add(iwanDoor);

  // Twin Glazed Minarets flanking the Pishtaq
  const minShaftGeo = trackGeo(new THREE.CylinderGeometry(0.46, 0.62, 9.4, 14));
  const muqarnasGeo = trackGeo(new THREE.CylinderGeometry(0.84, 0.48, 0.65, 12));
  const lanternGeo = trackGeo(new THREE.CylinderGeometry(0.38, 0.42, 1.15, 10));
  for (const mx of [-3.35, 3.35]) {
    const ms = new THREE.Mesh(minShaftGeo, mats.persianTile);
    ms.position.set(mx, hallY + 4.7, 3.2);
    ms.castShadow = true;
    mainGrp.add(ms);

    const muq = new THREE.Mesh(muqarnasGeo, mats.ochrePlaster);
    muq.position.set(mx, hallY + 9.4, 3.2);
    mainGrp.add(muq);

    const lan = new THREE.Mesh(lanternGeo, mats.persianTile);
    lan.position.set(mx, hallY + 10.25, 3.2);
    mainGrp.add(lan);

    const cap = createPersianDome(0.46, 0.85, mats.turquoiseGlaze, mats.brushedGold, trackGeo);
    cap.position.set(mx, hallY + 10.8, 3.2);
    mainGrp.add(cap);
  }

  // Crowning Ribbed Turquoise-Glazed Persian Dome atop Inscribed Cobalt Drum
  const domeY = hallY + hallH;
  const drum = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(3.15, 3.28, 2.5, 20)),
    mats.persianTile,
  );
  drum.position.set(0, domeY + 1.25, -1.2);
  drum.castShadow = true;
  mainGrp.add(drum);

  const heroDome = createPersianDome(3.35, 4.9, mats.turquoiseGlaze, mats.brushedGold, trackGeo);
  heroDome.position.set(0, domeY + 2.45, -1.2);
  mainGrp.add(heroDome);

  // =========================================================================
  // 2. CHEHEL SOTOUN COLUMNED TALAR HALL (-9.5, 0, -21) & GALLERY
  // =========================================================================
  const talarWing = new THREE.Group();
  talarWing.position.set(-9.5, 0, -21);
  group.add(talarWing);

  const tPlinth = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(6.8, 1.0, 5.8)),
    mats.ochrePlaster,
  );
  tPlinth.position.y = 0.5;
  tPlinth.castShadow = true;
  talarWing.add(tPlinth);

  const tBack = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(6.2, 4.4, 3.2)),
    mats.ochrePlaster,
  );
  tBack.position.set(0, 3.2, -1.0);
  tBack.castShadow = true;
  talarWing.add(tBack);

  const tTile = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(6.26, 0.9, 3.26)),
    mats.persianTile,
  );
  tTile.position.set(0, 4.95, -1.0);
  talarWing.add(tTile);

  const talar = createTalarPortico(6.2, 2.8, 4.4, mats, trackGeo);
  talar.position.set(0, 1.0, 1.4);
  talarWing.add(talar);

  // Connecting Tiled Gallery (-2.5, 0, -21)
  const gal = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(8.0, 3.8, 2.8)),
    mats.ochrePlaster,
  );
  gal.position.set(-2.5, 1.9, -21);
  gal.castShadow = true;
  group.add(gal);
  const galTop = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(8.1, 0.85, 2.95)),
    mats.persianTile,
  );
  galTop.position.set(-2.5, 3.85, -21);
  group.add(galTop);

  // =========================================================================
  // 3. HASHT BEHESHT GARDEN TALAR PAVILION OVERLOOKING POND (20.5, 0, -12.5)
  // =========================================================================
  const pavGrp = new THREE.Group();
  pavGrp.position.set(20.5, 0, -12.5);
  pavGrp.rotation.y = -0.35;
  group.add(pavGrp);

  const pBase = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(7.2, 1.1, 5.4)),
    mats.ochrePlaster,
  );
  pBase.position.y = 0.55;
  pBase.castShadow = true;
  pBase.receiveShadow = true;
  pavGrp.add(pBase);

  const pCore = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(4.4, 3.6, 3.2)),
    mats.persianTile,
  );
  pCore.position.set(0, 2.9, -0.6);
  pCore.castShadow = true;
  pavGrp.add(pCore);

  const pTalar = createTalarPortico(6.6, 4.4, 3.8, mats, trackGeo);
  pTalar.position.set(0, 1.1, 0.2);
  pavGrp.add(pTalar);

  const pDome = createPersianDome(1.65, 2.2, mats.turquoiseGlaze, mats.brushedGold, trackGeo);
  pDome.position.set(0, 5.4, -0.2);
  pavGrp.add(pDome);

  // =========================================================================
  // 4. SAFAVID MOSAIC TILE GATEHOUSE & ARCHED NICHE WALLS (z = -9.2)
  // =========================================================================
  const gateGrp = new THREE.Group();
  gateGrp.position.set(4.5, 0, -9.2);
  group.add(gateGrp);

  const gArch = createPersianPointedArch(5.8, 5.2, 1.75, mats.persianTile, trackGeo);
  gateGrp.add(gArch);

  const gCrown = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(6.1, 0.38, 1.9)),
    mats.turquoiseGlaze,
  );
  gCrown.position.y = 5.35;
  gateGrp.add(gCrown);

  // Twin turquoise guldasta corner spirelets atop Safavid Gatehouse
  for (const gx of [-2.6, 2.6]) {
    const post = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.16, 0.2, 1.35, 10)),
      mats.persianTile,
    );
    post.position.set(gx, 6.2, 0);
    gateGrp.add(post);

    const gCap = createPersianDome(0.24, 0.48, mats.turquoiseGlaze, mats.brushedGold, trackGeo);
    gCap.position.set(gx, 6.85, 0);
    gateGrp.add(gCap);
  }

  const buildPersianWall = (wx: number, wz: number, len: number, rotY = 0) => {
    const wg = new THREE.Group();
    wg.position.set(wx, 0, wz);
    wg.rotation.y = rotY;
    group.add(wg);

    const wall = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(len, 2.35, 0.8)),
      mats.ochrePlaster,
    );
    wall.position.y = 1.18;
    wall.castShadow = true;
    wall.receiveShadow = true;
    wg.add(wall);

    const frieze = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(len + 0.06, 0.45, 0.88)),
      mats.persianTile,
    );
    frieze.position.y = 2.45;
    wg.add(frieze);

    // Blind recessed arch panels (taqcheh) along wall
    const archCount = Math.max(3, Math.floor(len / 2.2));
    const nichePanelGeo = trackGeo(new THREE.BoxGeometry(1.35, 1.35, 0.88));
    for (let i = 0; i < archCount; i++) {
      const ax = ((i + 0.5) / archCount - 0.5) * (len - 0.9);
      const np = new THREE.Mesh(nichePanelGeo, mats.persianTile);
      np.position.set(ax, 1.15, 0);
      wg.add(np);
    }
  };

  buildPersianWall(-5.5, -9.2, 14.0, 0);
  buildPersianWall(12.2, -9.2, 9.5, 0);
  buildPersianWall(-12.5, -14.8, 11.4, Math.PI / 2);

  return {
    group,
    dispose: () => {
      for (const g of geometries) g.dispose();
    },
  };
}
