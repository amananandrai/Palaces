import * as THREE from 'three';
import type { PalaceBuildResult } from '../buildPalace';
import type { SceneMaterialLibrary } from '../materials';

/**
 * Authentic bulbous Russian onion dome (LatheGeometry) with flush meridian ribs,
 * kokoshnik collar ring, and 3-bar Russian Orthodox Cross finial
 */
function createOnionDome(
  radius: number,
  height: number,
  domeMat: THREE.Material,
  ribMat: THREE.Material,
  goldMat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
): THREE.Group {
  const grp = new THREE.Group();

  const profile: THREE.Vector2[] = [
    new THREE.Vector2(radius * 0.62, 0),
    new THREE.Vector2(radius * 0.9, height * 0.14),
    new THREE.Vector2(radius * 1.05, height * 0.34),
    new THREE.Vector2(radius * 0.94, height * 0.56),
    new THREE.Vector2(radius * 0.56, height * 0.76),
    new THREE.Vector2(radius * 0.2, height * 0.91),
    new THREE.Vector2(0.0, height * 1.08),
  ];
  const domeGeo = trackGeo(new THREE.LatheGeometry(profile, 24));
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.castShadow = true;
  grp.add(dome);

  // Flush vertical meridian ribs traced directly along the onion profile curve
  const ribPts = profile.slice(0, -1).map((p) => new THREE.Vector3(p.x * 1.015, p.y, 0));
  ribPts.push(new THREE.Vector3(0.01, height * 1.06, 0));
  const ribCurve = new THREE.CatmullRomCurve3(ribPts);
  const ribGeo = trackGeo(new THREE.TubeGeometry(ribCurve, 14, Math.max(0.018, radius * 0.036), 6, false));
  const ribCount = 8;
  for (let r = 0; r < ribCount; r++) {
    const rib = new THREE.Mesh(ribGeo, ribMat);
    rib.rotation.y = (r / ribCount) * Math.PI * 2;
    grp.add(rib);
  }

  // Molded gilded neck collar at dome base
  const collar = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(radius * 0.63, Math.max(0.03, radius * 0.055), 8, 20)),
    goldMat,
  );
  collar.rotation.x = Math.PI / 2;
  grp.add(collar);

  // Spire shaft + orb + 3-bar Russian Orthodox Cross
  const spireH = height * 0.76;
  const spire = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.022, 0.052, spireH, 8)),
    goldMat,
  );
  spire.position.y = height * 1.06 + spireH * 0.5;
  grp.add(spire);

  const orb = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(Math.max(0.06, radius * 0.11), 10, 8)),
    goldMat,
  );
  orb.position.y = height * 1.16;
  grp.add(orb);

  const crossBaseY = height * 1.06 + spireH * 0.62;
  const topBar = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(radius * 0.28, 0.036, 0.036)),
    goldMat,
  );
  topBar.position.y = crossBaseY + height * 0.16;
  grp.add(topBar);

  const mainBar = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(radius * 0.54, 0.046, 0.046)),
    goldMat,
  );
  mainBar.position.y = crossBaseY + height * 0.03;
  grp.add(mainBar);

  // Characteristic slanted lower footrest crossbar
  const footBar = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(radius * 0.34, 0.036, 0.036)),
    goldMat,
  );
  footBar.position.y = crossBaseY - height * 0.11;
  footBar.rotation.z = 0.36;
  grp.add(footBar);

  return grp;
}

/**
 * Carved semicircular Russian kokoshnik ogee gable arch
 */
function createKokoshnikArch(
  width: number,
  height: number,
  depth: number,
  trimMat: THREE.Material,
  fillMat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
): THREE.Group {
  const g = new THREE.Group();
  const hw = width / 2;

  const shape = new THREE.Shape();
  shape.moveTo(-hw, 0);
  shape.quadraticCurveTo(-hw, height * 0.76, 0, height);
  shape.quadraticCurveTo(hw, height * 0.76, hw, 0);
  shape.closePath();

  const bodyGeo = trackGeo(
    new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.035,
      bevelSegments: 2,
    }),
  );
  bodyGeo.translate(0, 0, -depth / 2);
  const fill = new THREE.Mesh(bodyGeo, fillMat);
  fill.castShadow = true;
  g.add(fill);

  const rimGeo = trackGeo(new THREE.TorusGeometry(hw * 0.9, 0.07, 6, 14, Math.PI));
  const rim = new THREE.Mesh(rimGeo, trimMat);
  rim.position.set(0, 0.04, depth / 2 + 0.03);
  rim.scale.set(1, height / hw, 1);
  g.add(rim);

  return g;
}

/**
 * Ornate carved Russian Terem Nalichnik window surround with side colonnettes,
 * warm mullioned pane, broken kokoshnik crest pediment, and gilded finial
 */
function createNalichnikWindow(
  width: number,
  height: number,
  stoneMat: THREE.Material,
  paneMat: THREE.Material,
  goldMat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
): THREE.Group {
  const g = new THREE.Group();

  const pane = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(width * 0.72, height * 0.8, 0.12)),
    paneMat,
  );
  g.add(pane);

  const colGeo = trackGeo(new THREE.CylinderGeometry(0.06, 0.075, height * 0.88, 8));
  for (const sx of [-width * 0.44, width * 0.44]) {
    const col = new THREE.Mesh(colGeo, stoneMat);
    col.position.set(sx, 0, 0.06);
    g.add(col);
  }

  // Carved sill & lintel
  const sill = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(width * 1.16, 0.14, 0.24)),
    stoneMat,
  );
  sill.position.set(0, -height * 0.45, 0.06);
  g.add(sill);

  const lintel = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(width * 1.22, 0.16, 0.26)),
    stoneMat,
  );
  lintel.position.set(0, height * 0.45, 0.06);
  g.add(lintel);

  // Carved kokoshnik pediment crest + gilded finial bead
  const crest = createKokoshnikArch(
    width * 1.05,
    height * 0.28,
    0.16,
    goldMat,
    stoneMat,
    trackGeo,
  );
  crest.position.set(0, height * 0.51, 0.06);
  g.add(crest);

  const finial = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.07, 8, 6)), goldMat);
  finial.position.set(0, height * 0.83, 0.08);
  g.add(finial);

  return g;
}

/**
 * Recessed white-stone arched portal niche for Kremlin basement arcades & gatehouses
 */
function createStonePortalArch(
  width: number,
  height: number,
  depth: number,
  stoneMat: THREE.Material,
  recessMat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
): THREE.Group {
  const g = new THREE.Group();
  const hw = width / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, 0);
  shape.lineTo(-hw, height);
  shape.lineTo(hw, height);
  shape.lineTo(hw, 0);

  const iw = hw * 0.7;
  const springY = height * 0.52;
  const topY = height * 0.88;
  shape.lineTo(iw, 0);
  shape.lineTo(iw, springY);
  shape.absarc(0, springY, iw, 0, Math.PI, false);
  shape.lineTo(-iw, 0);
  shape.closePath();

  const archGeo = trackGeo(
    new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.025,
      bevelSegments: 2,
    }),
  );
  archGeo.translate(0, 0, -depth / 2);
  const frame = new THREE.Mesh(archGeo, stoneMat);
  frame.castShadow = true;
  g.add(frame);

  const back = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(iw * 1.95, topY * 0.96, depth * 0.35)),
    recessMat,
  );
  back.position.set(0, topY * 0.48, -depth * 0.18);
  g.add(back);

  return g;
}

/**
 * Authentic M-shaped Moscow Kremlin swallowtail (lastochkin khvost) merlon
 */
function createSwallowtailMerlonGeometry(
  width: number,
  height: number,
  depth: number,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
): THREE.BufferGeometry {
  const hw = width / 2;
  const notchW = hw * 0.42;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, 0);
  shape.lineTo(-hw, height);
  shape.lineTo(-notchW * 0.35, height);
  shape.lineTo(0, height * 0.62);
  shape.lineTo(notchW * 0.35, height);
  shape.lineTo(hw, height);
  shape.lineTo(hw, 0);
  shape.closePath();

  const geo = trackGeo(
    new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 1,
    }),
  );
  geo.translate(0, 0, -depth / 2);
  return geo;
}

export function buildRussianPalace(mats: SceneMaterialLibrary): PalaceBuildResult {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };

  // =========================================================================
  // 1. CENTRAL KREMLIN & TEREM PALACE (6, 0, -22)
  // =========================================================================
  const mainGrp = new THREE.Group();
  mainGrp.position.set(6, 0, -22);
  group.add(mainGrp);

  const shadow = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(26, 23)), mats.contactShadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  mainGrp.add(shadow);

  // White limestone rusticated podium (podklet) with vaulted Gulbishche arcade niches
  const podH = 2.6;
  const podium = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(15.2, podH, 12.2)),
    mats.graniteStone,
  );
  podium.position.y = podH / 2;
  podium.castShadow = true;
  podium.receiveShadow = true;
  mainGrp.add(podium);

  for (const ax of [-5.2, -3.1, 3.1, 5.2]) {
    for (const az of [6.12, -6.12]) {
      const portal = createStonePortalArch(
        1.75,
        2.3,
        0.22,
        mats.shikkuiPlaster,
        mats.yakisugiTimber,
        trackGeo,
      );
      portal.position.set(ax, 0, az);
      if (az < 0) portal.rotation.y = Math.PI;
      mainGrp.add(portal);
    }
  }
  for (const az of [-3.6, 0, 3.6]) {
    for (const ax of [-7.62, 7.62]) {
      const portal = createStonePortalArch(
        2.4,
        2.3,
        0.22,
        mats.shikkuiPlaster,
        mats.yakisugiTimber,
        trackGeo,
      );
      portal.position.set(ax, 0, az);
      portal.rotation.y = ax > 0 ? Math.PI / 2 : -Math.PI / 2;
      mainGrp.add(portal);
    }
  }

  // Stone coping + carved balustrade parapet around podium terrace
  const cope = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(15.7, 0.3, 12.7)),
    mats.shikkuiPlaster,
  );
  cope.position.y = podH + 0.15;
  mainGrp.add(cope);

  // Grand Ceremonial Kryl'tso Staircase with bulbous stone balustrades & gilded orb newels
  const stairGeo = trackGeo(new THREE.BoxGeometry(4.4, 0.34, 0.56));
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const step = new THREE.Mesh(stairGeo, mats.graniteStone);
    step.position.set(0, 0.17 + t * (podH - 0.15), 8.0 - t * 1.9);
    step.castShadow = true;
    step.receiveShadow = true;
    mainGrp.add(step);
  }
  const railBalusterGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.15, 0.65, 8));
  for (const sx of [-2.25, 2.25]) {
    const stringer = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.32, 0.36, 2.8)),
      mats.shikkuiPlaster,
    );
    stringer.position.set(sx, podH * 0.52, 7.15);
    stringer.rotation.x = 0.72;
    stringer.castShadow = true;
    mainGrp.add(stringer);

    for (let bi = 0; bi < 4; bi++) {
      const bt = bi / 3;
      const bMesh = new THREE.Mesh(railBalusterGeo, mats.shikkuiPlaster);
      bMesh.position.set(sx, 0.55 + bt * (podH - 0.1), 8.15 - bt * 1.9);
      mainGrp.add(bMesh);
    }

    const newel = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.54, 1.15, 0.54)),
      mats.shikkuiPlaster,
    );
    newel.position.set(sx, 0.58, 8.35);
    newel.castShadow = true;
    mainGrp.add(newel);

    const orb = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.24, 10, 8)), mats.brushedGold);
    orb.position.set(sx, 1.32, 8.35);
    mainGrp.add(orb);
  }

  // Ceremonial Kryl'tso Porch with barrel columns, hanging arches & green-copper tent spire
  const porchGrp = new THREE.Group();
  porchGrp.position.set(0, podH + 0.3, 6.45);
  mainGrp.add(porchGrp);
  const colShaftGeo = trackGeo(new THREE.CylinderGeometry(0.26, 0.3, 2.55, 12));
  const colBulgeGeo = trackGeo(new THREE.SphereGeometry(0.38, 12, 10));
  const colPlinthGeo = trackGeo(new THREE.BoxGeometry(0.74, 0.24, 0.74));
  for (const px of [-1.9, 1.9]) {
    const cPlinth = new THREE.Mesh(colPlinthGeo, mats.graniteStone);
    cPlinth.position.set(px, 0.12, 0.52);
    cPlinth.castShadow = true;
    porchGrp.add(cPlinth);

    const col = new THREE.Mesh(colShaftGeo, mats.shikkuiPlaster);
    col.position.set(px, 1.38, 0.52);
    col.castShadow = true;
    porchGrp.add(col);

    const bulge = new THREE.Mesh(colBulgeGeo, mats.russianBrick);
    bulge.scale.set(1, 0.72, 1);
    bulge.position.set(px, 1.18, 0.52);
    porchGrp.add(bulge);
  }
  const porchCrossArch = createKokoshnikArch(
    3.9,
    1.15,
    0.45,
    mats.brushedGold,
    mats.shikkuiPlaster,
    trackGeo,
  );
  porchCrossArch.position.set(0, 2.55, 0.52);
  porchGrp.add(porchCrossArch);

  const porchTent = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(2.65, 2.45, 4)),
    mats.malachiteCopper,
  );
  porchTent.rotation.y = Math.PI / 4;
  porchTent.position.set(0, 4.1, 0.25);
  porchTent.castShadow = true;
  porchGrp.add(porchTent);

  const porchNeck = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.32, 0.44, 0.56, 8)),
    mats.shikkuiPlaster,
  );
  porchNeck.position.set(0, 4.98, 0.25);
  porchGrp.add(porchNeck);

  const porchCup = createOnionDome(0.45, 0.75, mats.brushedGold, mats.brushedGold, mats.brushedGold, trackGeo);
  porchCup.position.set(0, 5.22, 0.25);
  porchGrp.add(porchCup);

  // Lower Crimson Brick Terem State Hall
  const hallY = podH + 0.3;
  const hallW = 13.6;
  const hallD = 10.6;
  const hallH = 4.6;
  const hallBody = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(hallW, hallH, hallD)),
    mats.russianBrick,
  );
  hallBody.position.y = hallY + hallH / 2;
  hallBody.castShadow = true;
  hallBody.receiveShadow = true;
  mainGrp.add(hallBody);

  // White limestone corner pilasters & polychrome Terem diamond frieze band
  const pilGeo = trackGeo(new THREE.BoxGeometry(0.46, hallH + 0.12, 0.46));
  for (const px of [-hallW / 2, -2.5, 2.5, hallW / 2]) {
    for (const pz of [-hallD / 2, hallD / 2]) {
      const pil = new THREE.Mesh(pilGeo, mats.shikkuiPlaster);
      pil.position.set(px, hallY + hallH / 2, pz);
      mainGrp.add(pil);
    }
  }
  const frieze = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(hallW + 0.55, 0.44, hallD + 0.55)),
    mats.shikkuiPlaster,
  );
  frieze.position.y = hallY + hallH + 0.12;
  mainGrp.add(frieze);

  // Polychrome emerald/gold Terem relief diamonds along front & back frieze
  const diaGeo = trackGeo(new THREE.BoxGeometry(0.32, 0.32, 0.12));
  for (let di = -6; di <= 6; di++) {
    for (const dz of [hallD / 2 + 0.26, -hallD / 2 - 0.26]) {
      const dMesh = new THREE.Mesh(
        diaGeo,
        di % 2 === 0 ? mats.malachiteCopper : mats.brushedGold,
      );
      dMesh.rotation.z = Math.PI / 4;
      dMesh.position.set(di * 1.0, hallY + hallH + 0.12, dz);
      mainGrp.add(dMesh);
    }
  }

  // Ornate Carved Nalichniki Windows across front, rear, and side elevations
  for (const wx of [-4.6, -1.45, 1.45, 4.6]) {
    for (const fz of [hallD / 2 + 0.04, -hallD / 2 - 0.04]) {
      const nw = createNalichnikWindow(
        1.25,
        2.1,
        mats.shikkuiPlaster,
        mats.palaceWindow,
        mats.brushedGold,
        trackGeo,
      );
      nw.position.set(wx, hallY + hallH * 0.48, fz);
      if (fz < 0) nw.rotation.y = Math.PI;
      mainGrp.add(nw);
    }
  }
  for (const wz of [-2.8, 0, 2.8]) {
    for (const fx of [-hallW / 2 - 0.04, hallW / 2 + 0.04]) {
      const nw = createNalichnikWindow(
        1.25,
        2.1,
        mats.shikkuiPlaster,
        mats.palaceWindow,
        mats.brushedGold,
        trackGeo,
      );
      nw.position.set(fx, hallY + hallH * 0.48, wz);
      nw.rotation.y = fx > 0 ? Math.PI / 2 : -Math.PI / 2;
      mainGrp.add(nw);
    }
  }

  // Row of Russian Kokoshnik ogee arches along front, back & side cornice
  for (let ki = -2; ki <= 2; ki++) {
    for (const kz of [hallD / 2 - 0.2, -hallD / 2 + 0.2]) {
      const arch = createKokoshnikArch(
        2.4,
        1.48,
        0.46,
        mats.brushedGold,
        mats.shikkuiPlaster,
        trackGeo,
      );
      arch.position.set(ki * 2.5, hallY + hallH + 0.28, kz);
      if (kz < 0) arch.rotation.y = Math.PI;
      mainGrp.add(arch);
    }
  }
  for (let ksi = -1; ksi <= 1; ksi++) {
    for (const kx of [-hallW / 2 + 0.2, hallW / 2 - 0.2]) {
      const arch = createKokoshnikArch(
        2.6,
        1.42,
        0.46,
        mats.brushedGold,
        mats.shikkuiPlaster,
        trackGeo,
      );
      arch.position.set(kx, hallY + hallH + 0.28, ksi * 3.1);
      arch.rotation.y = kx > 0 ? Math.PI / 2 : -Math.PI / 2;
      mainGrp.add(arch);
    }
  }

  // Upper Terem Belvedere Hall + Carved Windows + Staggered Kokoshnik Tier
  const upperY = hallY + hallH + 0.36;
  const upperW = 9.4;
  const upperD = 7.4;
  const upperH = 3.25;
  const upperHall = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(upperW, upperH, upperD)),
    mats.shikkuiPlaster,
  );
  upperHall.position.y = upperY + upperH / 2;
  upperHall.castShadow = true;
  upperHall.receiveShadow = true;
  mainGrp.add(upperHall);

  const upperBand = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(upperW + 0.22, 0.38, upperD + 0.22)),
    mats.russianBrick,
  );
  upperBand.position.y = upperY + 0.26;
  mainGrp.add(upperBand);

  const upperCornice = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(upperW + 0.36, 0.3, upperD + 0.36)),
    mats.russianBrick,
  );
  upperCornice.position.y = upperY + upperH - 0.12;
  mainGrp.add(upperCornice);

  // Ornate Belvedere windows on upper white-stone floor
  for (const ux of [-2.8, 0, 2.8]) {
    for (const uz of [upperD / 2 + 0.04, -upperD / 2 - 0.04]) {
      const unw = createNalichnikWindow(
        1.05,
        1.75,
        mats.russianBrick,
        mats.palaceWindow,
        mats.brushedGold,
        trackGeo,
      );
      unw.position.set(ux, upperY + upperH * 0.54, uz);
      if (uz < 0) unw.rotation.y = Math.PI;
      mainGrp.add(unw);
    }
  }

  const upperRoof = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(3.1, 6.4, 2.0, 4)),
    mats.malachiteCopper,
  );
  upperRoof.rotation.y = Math.PI / 4;
  upperRoof.position.y = upperY + upperH + 1.0;
  upperRoof.castShadow = true;
  mainGrp.add(upperRoof);

  // Upper Kokoshnik gables rising into the green copper hip roof
  for (const kx of [-2.4, 0, 2.4]) {
    for (const kz of [upperD / 2 - 0.15, -upperD / 2 + 0.15]) {
      const k = createKokoshnikArch(
        2.1,
        1.25,
        0.38,
        mats.brushedGold,
        mats.shikkuiPlaster,
        trackGeo,
      );
      k.position.set(kx, upperY + upperH + 0.02, kz);
      if (kz < 0) k.rotation.y = Math.PI;
      mainGrp.add(k);
    }
  }

  // Central Octagonal Drum with Engaged Colonnettes & Hero Fluted Gilded Onion Dome
  const crownY = upperY + upperH + 1.95;
  const centralDrum = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.5, 1.7, 2.45, 16)),
    mats.shikkuiPlaster,
  );
  centralDrum.position.y = crownY + 1.15;
  centralDrum.castShadow = true;
  mainGrp.add(centralDrum);

  const drumRing = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.68, 1.68, 0.25, 16)),
    mats.russianBrick,
  );
  drumRing.position.y = crownY + 2.25;
  mainGrp.add(drumRing);

  const slitGeo = trackGeo(new THREE.BoxGeometry(0.28, 1.2, 0.14));
  const drumColGeo = trackGeo(new THREE.CylinderGeometry(0.06, 0.075, 1.75, 8));
  for (let si = 0; si < 8; si++) {
    const a = (si / 8) * Math.PI * 2;
    const slit = new THREE.Mesh(slitGeo, mats.palaceWindow);
    slit.position.set(Math.cos(a) * 1.54, crownY + 1.15, Math.sin(a) * 1.54);
    slit.rotation.y = -a + Math.PI / 2;
    mainGrp.add(slit);

    const ca = a + Math.PI / 8;
    const dCol = new THREE.Mesh(drumColGeo, mats.russianBrick);
    dCol.position.set(Math.cos(ca) * 1.6, crownY + 1.15, Math.sin(ca) * 1.6);
    mainGrp.add(dCol);
  }

  const centralDome = createOnionDome(
    1.9,
    3.0,
    mats.brushedGold,
    mats.shikkuiPlaster,
    mats.brushedGold,
    trackGeo,
  );
  centralDome.position.y = crownY + 2.38;
  mainGrp.add(centralDome);

  // 4 Grounded Polychrome St. Basil-style Onion Cupola Turrets (Malachite, Crimson, & Gold)
  // Each turret pedestal extends solidly down through the sloped green hip roof into the upper Belvedere hall
  const turretPlinthGeo = trackGeo(new THREE.BoxGeometry(1.9, 2.4, 1.9));
  const turretPlinthCapGeo = trackGeo(new THREE.BoxGeometry(2.08, 0.26, 2.08));
  const drumGeo = trackGeo(new THREE.CylinderGeometry(0.76, 0.88, 2.55, 12));
  const drumTopRingGeo = trackGeo(new THREE.CylinderGeometry(0.92, 0.92, 0.24, 12));
  const turretSlitGeo = trackGeo(new THREE.BoxGeometry(0.2, 0.86, 0.14));
  const cupCorners: Array<[number, number, THREE.Material, THREE.Material]> = [
    [-3.35, 2.35, mats.malachiteCopper, mats.brushedGold],
    [3.35, 2.35, mats.russianBrick, mats.shikkuiPlaster],
    [-3.35, -2.35, mats.russianBrick, mats.brushedGold],
    [3.35, -2.35, mats.malachiteCopper, mats.shikkuiPlaster],
  ];
  for (const [dx, dz, dMat, rMat] of cupCorners) {
    const plinth = new THREE.Mesh(turretPlinthGeo, mats.russianBrick);
    plinth.position.set(dx, upperY + upperH - 0.15, dz);
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    mainGrp.add(plinth);

    const plinthCap = new THREE.Mesh(turretPlinthCapGeo, mats.shikkuiPlaster);
    plinthCap.position.set(dx, upperY + upperH + 1.08, dz);
    plinthCap.castShadow = true;
    mainGrp.add(plinthCap);

    const drum = new THREE.Mesh(drumGeo, mats.shikkuiPlaster);
    drum.position.set(dx, crownY + 0.24, dz);
    drum.castShadow = true;
    drum.receiveShadow = true;
    mainGrp.add(drum);

    const topRing = new THREE.Mesh(drumTopRingGeo, mats.russianBrick);
    topRing.position.set(dx, crownY + 1.38, dz);
    mainGrp.add(topRing);

    for (let si = 0; si < 4; si++) {
      const sa = (si / 4) * Math.PI * 2;
      const tSlit = new THREE.Mesh(turretSlitGeo, mats.palaceWindow);
      tSlit.position.set(
        dx + Math.cos(sa) * 0.81,
        crownY + 0.65,
        dz + Math.sin(sa) * 0.81,
      );
      tSlit.rotation.y = -sa + Math.PI / 2;
      mainGrp.add(tSlit);
    }

    const cup = createOnionDome(1.06, 1.75, dMat, rMat, mats.brushedGold, trackGeo);
    cup.position.set(dx, crownY + 1.48, dz);
    mainGrp.add(cup);
  }

  // =========================================================================
  // 2. SPASSKAYA KREMLIN CLOCK WATCHTOWER (-9.5, 0, -21) & BOYAR GALLERY
  // =========================================================================
  const towerGrp = new THREE.Group();
  towerGrp.position.set(-9.5, 0, -21);
  group.add(towerGrp);

  const tBase = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(5.2, 2.4, 5.2)),
    mats.graniteStone,
  );
  tBase.position.y = 1.2;
  tBase.castShadow = true;
  tBase.receiveShadow = true;
  towerGrp.add(tBase);

  const tShaft = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(4.75, 5.4, 4.75)),
    mats.russianBrick,
  );
  tShaft.position.y = 5.1;
  tShaft.castShadow = true;
  tShaft.receiveShadow = true;
  towerGrp.add(tShaft);

  // Corner white-stone pilasters & recessed vertical arrow slits
  const tQuoinGeo = trackGeo(new THREE.BoxGeometry(0.42, 5.5, 0.42));
  for (const qx of [-2.3, 2.3]) {
    for (const qz of [-2.3, 2.3]) {
      const q = new THREE.Mesh(tQuoinGeo, mats.shikkuiPlaster);
      q.position.set(qx, 5.1, qz);
      towerGrp.add(q);
    }
  }
  const tSlitGeo = trackGeo(new THREE.BoxGeometry(0.34, 1.55, 0.14));
  for (const [sx, sz, ry] of [
    [0, 2.38, 0],
    [0, -2.38, Math.PI],
    [2.38, 0, Math.PI / 2],
    [-2.38, 0, -Math.PI / 2],
  ] as Array<[number, number, number]>) {
    const sl = new THREE.Mesh(tSlitGeo, mats.palaceWindow);
    sl.position.set(sx, 3.85, sz);
    sl.rotation.y = ry;
    towerGrp.add(sl);
  }

  // Ornate Clock Stage with 4 Illuminated Kremlin Clock Dials (mats.clockFace)
  const clockStage = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(5.1, 2.4, 5.1)),
    mats.russianBrick,
  );
  clockStage.position.y = 8.95;
  clockStage.castShadow = true;
  towerGrp.add(clockStage);

  const tCollar = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(5.45, 0.45, 5.45)),
    mats.shikkuiPlaster,
  );
  tCollar.position.y = 7.72;
  towerGrp.add(tCollar);

  const tUpperCollar = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(5.45, 0.42, 5.45)),
    mats.shikkuiPlaster,
  );
  tUpperCollar.position.y = 10.22;
  towerGrp.add(tUpperCollar);

  const dialBezelGeo = trackGeo(new THREE.TorusGeometry(0.95, 0.1, 8, 24));
  const dialPlaneGeo = trackGeo(new THREE.CircleGeometry(0.92, 24));
  const dialFaces: Array<[number, number, number]> = [
    [0, 2.58, 0],
    [0, -2.58, Math.PI],
    [2.58, 0, Math.PI / 2],
    [-2.58, 0, -Math.PI / 2],
  ];
  for (const [dx, dz, ry] of dialFaces) {
    const bezel = new THREE.Mesh(dialBezelGeo, mats.brushedGold);
    bezel.position.set(dx, 8.95, dz);
    bezel.rotation.y = ry;
    towerGrp.add(bezel);

    const dial = new THREE.Mesh(dialPlaneGeo, mats.clockFace);
    dial.position.set(dx * 1.01, 8.95, dz * 1.01);
    dial.rotation.y = ry;
    towerGrp.add(dial);
  }

  // Kokoshnik crown ring around open 8-column arched belfry gallery with Golden Tsar Bell
  for (let bi = 0; bi < 4; bi++) {
    const a = (bi / 4) * Math.PI * 2;
    const kg = createKokoshnikArch(
      2.6,
      1.1,
      0.38,
      mats.brushedGold,
      mats.shikkuiPlaster,
      trackGeo,
    );
    kg.position.set(Math.sin(a) * 2.25, 10.4, Math.cos(a) * 2.25);
    kg.rotation.y = a;
    towerGrp.add(kg);
  }

  const belfryColGeo = trackGeo(new THREE.CylinderGeometry(0.14, 0.17, 2.2, 10));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const bc = new THREE.Mesh(belfryColGeo, mats.shikkuiPlaster);
    bc.position.set(Math.cos(a) * 1.85, 11.45, Math.sin(a) * 1.85);
    bc.castShadow = true;
    towerGrp.add(bc);
  }

  // Suspended Golden Tsar Bell inside open belfry
  const bell = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.32, 0.64, 0.88, 14)),
    mats.brushedGold,
  );
  bell.position.y = 11.55;
  towerGrp.add(bell);

  const belfryCap = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(2.05, 2.2, 0.34, 8)),
    mats.shikkuiPlaster,
  );
  belfryCap.position.y = 12.68;
  towerGrp.add(belfryCap);

  // Octagonal Shatyor tent spire with gilded hip ribs & Ruby/Gold Star Finial
  const tSpire = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(2.25, 4.6, 8)),
    mats.malachiteCopper,
  );
  tSpire.position.y = 15.12;
  tSpire.castShadow = true;
  towerGrp.add(tSpire);

  const spireRibGeo = trackGeo(new THREE.CylinderGeometry(0.025, 0.04, 4.95, 5));
  const upAxis = new THREE.Vector3(0, 1, 0);
  for (let r = 0; r < 8; r++) {
    const a = (r / 8) * Math.PI * 2 + Math.PI / 8;
    const basePt = new THREE.Vector3(Math.cos(a) * 2.22, 12.82, Math.sin(a) * 2.22);
    const tipPt = new THREE.Vector3(0, 17.42, 0);
    const dir = tipPt.clone().sub(basePt).normalize();
    const sRib = new THREE.Mesh(spireRibGeo, mats.brushedGold);
    sRib.position.copy(basePt).lerp(tipPt, 0.5);
    sRib.quaternion.setFromUnitVectors(upAxis, dir);
    towerGrp.add(sRib);
  }

  const spireLanternNeck = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.4, 0.56, 0.52, 8)),
    mats.shikkuiPlaster,
  );
  spireLanternNeck.position.y = 17.16;
  towerGrp.add(spireLanternNeck);

  const tFinial = createOnionDome(
    0.58,
    0.96,
    mats.brushedGold,
    mats.brushedGold,
    mats.brushedGold,
    trackGeo,
  );
  tFinial.position.y = 17.38;
  towerGrp.add(tFinial);

  // Covered connecting Boyar Gallery (-2.5, 0, -21) with arched windows
  const galGrp = new THREE.Group();
  galGrp.position.set(-2.5, 0, -21);
  group.add(galGrp);
  const galBase = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(8.2, 1.35, 3.15)),
    mats.graniteStone,
  );
  galBase.position.y = 0.68;
  galBase.castShadow = true;
  galGrp.add(galBase);

  const galWall = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(8.2, 2.55, 2.95)),
    mats.russianBrick,
  );
  galWall.position.y = 2.62;
  galWall.castShadow = true;
  galGrp.add(galWall);

  for (const gx of [-2.4, 0, 2.4]) {
    const gw = createNalichnikWindow(
      1.0,
      1.55,
      mats.shikkuiPlaster,
      mats.palaceWindow,
      mats.brushedGold,
      trackGeo,
    );
    gw.position.set(gx, 2.62, 1.5);
    galGrp.add(gw);
  }

  const galRoof = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.1, 2.4, 1.55, 4)),
    mats.malachiteCopper,
  );
  galRoof.rotation.y = Math.PI / 4;
  galRoof.scale.set(2.4, 1, 1);
  galRoof.position.y = 4.68;
  galGrp.add(galRoof);

  // =========================================================================
  // 3. IMPERIAL GARDEN ROTUNDA PAVILION (20.5, 0, -12.5)
  // =========================================================================
  const rotGrp = new THREE.Group();
  rotGrp.position.set(20.5, 0, -12.5);
  group.add(rotGrp);

  const rotBase = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(3.85, 4.25, 0.95, 8)),
    mats.graniteStone,
  );
  rotBase.position.y = 0.48;
  rotBase.castShadow = true;
  rotBase.receiveShadow = true;
  rotGrp.add(rotBase);

  const rotCore = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(2.3, 2.3, 3.2, 8)),
    mats.russianBrick,
  );
  rotCore.position.y = 2.55;
  rotCore.castShadow = true;
  rotGrp.add(rotCore);

  const rotWinGeo = trackGeo(new THREE.BoxGeometry(0.75, 1.5, 0.14));
  const rotColGeo = trackGeo(new THREE.CylinderGeometry(0.14, 0.18, 3.25, 10));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rc = new THREE.Mesh(rotColGeo, mats.shikkuiPlaster);
    rc.position.set(Math.cos(a) * 3.18, 2.55, Math.sin(a) * 3.18);
    rc.castShadow = true;
    rotGrp.add(rc);

    if (i % 2 === 0) {
      const rw = new THREE.Mesh(rotWinGeo, mats.palaceWindow);
      rw.position.set(Math.cos(a + Math.PI / 8) * 2.25, 2.6, Math.sin(a + Math.PI / 8) * 2.25);
      rw.rotation.y = -(a + Math.PI / 8) + Math.PI / 2;
      rotGrp.add(rw);
    }
  }

  const rotCornice = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(3.75, 3.45, 0.45, 8)),
    mats.shikkuiPlaster,
  );
  rotCornice.position.y = 4.35;
  rotGrp.add(rotCornice);

  const rotDome = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(3.25, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5)),
    mats.malachiteCopper,
  );
  rotDome.position.y = 4.55;
  rotDome.castShadow = true;
  rotGrp.add(rotDome);

  const rotCupNeck = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.46, 0.6, 0.46, 8)),
    mats.shikkuiPlaster,
  );
  rotCupNeck.position.y = 7.56;
  rotGrp.add(rotCupNeck);

  const rotCup = createOnionDome(
    0.72,
    1.25,
    mats.brushedGold,
    mats.shikkuiPlaster,
    mats.brushedGold,
    trackGeo,
  );
  rotCup.position.y = 7.76;
  rotGrp.add(rotCup);

  // =========================================================================
  // 4. KREMLIN COURTYARD GATEHOUSE & SWALLOWTAIL WALLS (z = -9.2)
  // =========================================================================
  const gateGrp = new THREE.Group();
  gateGrp.position.set(4.5, 0, -9.2);
  group.add(gateGrp);

  const gatePortal = createStonePortalArch(
    5.4,
    4.6,
    1.7,
    mats.russianBrick,
    mats.yakisugiTimber,
    trackGeo,
  );
  gateGrp.add(gatePortal);

  const gateTrim = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(5.9, 0.42, 1.95)),
    mats.shikkuiPlaster,
  );
  gateTrim.position.y = 4.78;
  gateGrp.add(gateTrim);

  const gateKokoshnik = createKokoshnikArch(
    4.4,
    1.55,
    1.5,
    mats.brushedGold,
    mats.shikkuiPlaster,
    trackGeo,
  );
  gateKokoshnik.position.y = 4.95;
  gateGrp.add(gateKokoshnik);

  const gRoof = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(3.6, 2.2, 4)),
    mats.malachiteCopper,
  );
  gRoof.rotation.y = Math.PI / 4;
  gRoof.position.y = 6.4;
  gRoof.castShadow = true;
  gateGrp.add(gRoof);

  const gDomeNeck = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.44, 0.62, 0.56, 8)),
    mats.shikkuiPlaster,
  );
  gDomeNeck.position.y = 7.22;
  gateGrp.add(gDomeNeck);

  const gDome = createOnionDome(
    0.66,
    1.12,
    mats.brushedGold,
    mats.brushedGold,
    mats.brushedGold,
    trackGeo,
  );
  gDome.position.y = 7.45;
  gateGrp.add(gDome);

  // True M-shaped Swallowtail Kremlin Walls
  const merlonGeo = createSwallowtailMerlonGeometry(0.95, 0.78, 0.56, trackGeo);
  const slitWallGeo = trackGeo(new THREE.BoxGeometry(0.14, 0.65, 0.92));

  const buildKremlinWall = (wx: number, wz: number, len: number, rotY = 0) => {
    const wg = new THREE.Group();
    wg.position.set(wx, 0, wz);
    wg.rotation.y = rotY;
    group.add(wg);

    const base = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(len, 2.35, 0.86)),
      mats.russianBrick,
    );
    base.position.y = 1.17;
    base.castShadow = true;
    base.receiveShadow = true;
    wg.add(base);

    const trim = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(len + 0.12, 0.24, 1.0)),
      mats.shikkuiPlaster,
    );
    trim.position.y = 2.42;
    wg.add(trim);

    const merlonCount = Math.max(3, Math.floor(len / 1.45));
    for (let m = 0; m < merlonCount; m++) {
      const mx = ((m + 0.5) / merlonCount - 0.5) * (len - 0.9);
      const merlon = new THREE.Mesh(merlonGeo, mats.russianBrick);
      merlon.position.set(mx, 2.52, 0);
      merlon.castShadow = true;
      wg.add(merlon);

      const slit = new THREE.Mesh(slitWallGeo, mats.wroughtIron);
      slit.position.set(mx, 1.72, 0);
      wg.add(slit);
    }
  };

  buildKremlinWall(-5.5, -9.2, 14.0, 0);
  buildKremlinWall(12.2, -9.2, 9.5, 0);
  buildKremlinWall(-12.5, -14.8, 11.4, Math.PI / 2);

  return {
    group,
    dispose: () => {
      for (const g of geometries) g.dispose();
    },
  };
}
