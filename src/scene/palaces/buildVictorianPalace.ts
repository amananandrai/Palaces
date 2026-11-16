import * as THREE from 'three';
import type { PalaceBuildResult } from '../buildPalace';
import type { SceneMaterialLibrary } from '../materials';

/**
 * Victorian Gothic pointed arch pediment for grand portico & portals
 */
function createGothicArch(
  width: number,
  height: number,
  depth: number,
  mat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
): THREE.Mesh {
  const hw = width / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, 0);
  shape.lineTo(-hw, height * 0.45);
  shape.quadraticCurveTo(-hw * 0.65, height * 0.88, 0, height);
  shape.quadraticCurveTo(hw * 0.65, height * 0.88, hw, height * 0.45);
  shape.lineTo(hw, 0);
  shape.lineTo(hw * 0.72, 0);
  shape.lineTo(hw * 0.72, height * 0.42);
  shape.quadraticCurveTo(hw * 0.45, height * 0.72, 0, height * 0.82);
  shape.quadraticCurveTo(-hw * 0.45, height * 0.72, -hw * 0.72, height * 0.42);
  shape.lineTo(-hw * 0.72, 0);
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
  return mesh;
}

export function buildVictorianPalace(mats: SceneMaterialLibrary): PalaceBuildResult {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };

  // =========================================================================
  // 1. MAIN KENSINGTON HIGH-VICTORIAN MANOR PALACE (6, 0, -22)
  // =========================================================================
  const mainGrp = new THREE.Group();
  mainGrp.position.set(6, 0, -22);
  group.add(mainGrp);

  const shadow = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(25, 22)), mats.contactShadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  mainGrp.add(shadow);

  // Dressed Bath-stone ashlar plinth & grand front terrace steps
  const plinthH = 1.6;
  const plinth = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(15.6, plinthH, 11.4)),
    mats.graniteStone,
  );
  plinth.position.y = plinthH / 2;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  mainGrp.add(plinth);

  const stairGeo = trackGeo(new THREE.BoxGeometry(4.4, 0.28, 0.55));
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const step = new THREE.Mesh(stairGeo, mats.graniteStone);
    step.position.set(0, 0.14 + t * (plinthH - 0.14), 7.4 - t * 1.65);
    step.castShadow = true;
    step.receiveShadow = true;
    mainGrp.add(step);
  }

  // Main 3-story Flemish-bond red-brick facade
  const bodyY = plinthH;
  const bodyW = 14.4;
  const bodyD = 10.0;
  const bodyH = 6.8;
  const mainBody = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(bodyW, bodyH, bodyD)),
    mats.victorianBrick,
  );
  mainBody.position.y = bodyY + bodyH / 2;
  mainBody.castShadow = true;
  mainBody.receiveShadow = true;
  mainGrp.add(mainBody);

  // Pale Bath-stone corner quoins & horizontal stringcourses
  const quoinGeo = trackGeo(new THREE.BoxGeometry(0.45, 0.42, 0.45));
  for (const qx of [-bodyW / 2, bodyW / 2]) {
    for (const qz of [-bodyD / 2, bodyD / 2]) {
      for (let qi = 0; qi < 8; qi++) {
        const q = new THREE.Mesh(quoinGeo, mats.shikkuiPlaster);
        q.position.set(qx, bodyY + 0.45 + qi * 0.85, qz);
        mainGrp.add(q);
      }
    }
  }
  const stringGeo = trackGeo(new THREE.BoxGeometry(bodyW + 0.35, 0.24, bodyD + 0.35));
  for (const sy of [bodyY + 0.12, bodyY + 3.4, bodyY + bodyH]) {
    const sc = new THREE.Mesh(stringGeo, mats.shikkuiPlaster);
    sc.position.y = sy;
    mainGrp.add(sc);
  }

  // Projecting Octagonal Bay Windows on Left & Right Front Flanks
  const bayGeo = trackGeo(new THREE.CylinderGeometry(1.7, 1.7, bodyH - 0.3, 6));
  const bayCapGeo = trackGeo(new THREE.ConeGeometry(2.05, 1.6, 6));
  for (const bx of [-5.2, 5.2]) {
    const bay = new THREE.Mesh(bayGeo, mats.victorianBrick);
    bay.position.set(bx, bodyY + (bodyH - 0.3) / 2, bodyD / 2 + 0.55);
    bay.castShadow = true;
    mainGrp.add(bay);

    const bayCap = new THREE.Mesh(bayCapGeo, mats.victorianSlate);
    bayCap.position.set(bx, bodyY + bodyH + 0.55, bodyD / 2 + 0.55);
    bayCap.castShadow = true;
    mainGrp.add(bayCap);
  }

  // Grand Gothic Stone Portico Entrance at center front
  const portGrp = new THREE.Group();
  portGrp.position.set(0, bodyY, bodyD / 2 + 1.0);
  mainGrp.add(portGrp);
  const portArch = createGothicArch(3.4, 3.6, 1.4, mats.shikkuiPlaster, trackGeo);
  portArch.position.set(0, 0, 0);
  portGrp.add(portArch);
  const portRoof = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(2.6, 2.2, 4)),
    mats.victorianSlate,
  );
  portRoof.rotation.y = Math.PI / 4;
  portRoof.position.set(0, 4.6, 0);
  portRoof.castShadow = true;
  portGrp.add(portRoof);

  // Mullioned Sash & Lancet Windows (two tiers across facade)
  const winFrameGeo = trackGeo(new THREE.BoxGeometry(1.12, 1.85, 0.14));
  const winPaneGeo = trackGeo(new THREE.BoxGeometry(0.84, 1.56, 0.18));
  for (const wx of [-5.2, -2.5, 2.5, 5.2]) {
    for (const floorY of [bodyY + 1.75, bodyY + 5.05]) {
      const zFace = Math.abs(wx) > 4 ? bodyD / 2 + 2.02 : bodyD / 2 + 0.05;
      const fr = new THREE.Mesh(winFrameGeo, mats.shikkuiPlaster);
      fr.position.set(wx, floorY, zFace);
      mainGrp.add(fr);

      const pane = new THREE.Mesh(winPaneGeo, mats.palaceWindow);
      pane.position.set(wx, floorY, zFace);
      mainGrp.add(pane);
    }
  }
  // Upper window above entrance portico
  const centerWin = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.5, 1.9, 0.18)),
    mats.palaceWindow,
  );
  centerWin.position.set(0, bodyY + 5.1, bodyD / 2 + 0.06);
  mainGrp.add(centerWin);

  // Steep Second-Empire Victorian Slate Mansard Roof
  const roofY = bodyY + bodyH + 0.12;
  const mansard = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(5.1, 8.1, 3.0, 4)),
    mats.victorianSlate,
  );
  mansard.rotation.y = Math.PI / 4;
  mansard.scale.set(1.32, 1, 0.94);
  mansard.position.y = roofY + 1.5;
  mansard.castShadow = true;
  mainGrp.add(mansard);

  // Dormer Gables along Mansard Slope
  const dormerGeo = trackGeo(new THREE.BoxGeometry(1.25, 1.45, 1.45));
  const dormerRoofGeo = trackGeo(new THREE.ConeGeometry(1.05, 0.95, 4));
  for (const dx of [-3.6, 0, 3.6]) {
    const dm = new THREE.Mesh(dormerGeo, mats.shikkuiPlaster);
    dm.position.set(dx, roofY + 1.35, bodyD / 2 - 0.75);
    mainGrp.add(dm);

    const dmPane = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.75, 1.0, 0.16)),
      mats.palaceWindow,
    );
    dmPane.position.set(dx, roofY + 1.35, bodyD / 2);
    mainGrp.add(dmPane);

    const dr = new THREE.Mesh(dormerRoofGeo, mats.victorianSlate);
    dr.rotation.y = Math.PI / 4;
    dr.position.set(dx, roofY + 2.5, bodyD / 2 - 0.75);
    mainGrp.add(dr);
  }

  // Wrought-iron ridge cresting & 4 tall Tudor brick chimney stacks
  const crestBar = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(9.6, 0.42, 0.14)),
    mats.wroughtIron,
  );
  crestBar.position.y = roofY + 3.2;
  mainGrp.add(crestBar);

  const chimGeo = trackGeo(new THREE.BoxGeometry(0.85, 2.8, 0.85));
  const potGeo = trackGeo(new THREE.CylinderGeometry(0.14, 0.18, 0.55, 8));
  for (const [cx, cz] of [
    [-4.8, -2.5],
    [4.8, -2.5],
    [-4.8, 2.5],
    [4.8, 2.5],
  ]) {
    const ch = new THREE.Mesh(chimGeo, mats.victorianBrick);
    ch.position.set(cx, roofY + 2.6, cz);
    ch.castShadow = true;
    mainGrp.add(ch);

    for (const px of [-0.2, 0.2]) {
      const pot = new THREE.Mesh(potGeo, mats.russianBrick);
      pot.position.set(cx + px, roofY + 4.2, cz);
      mainGrp.add(pot);
    }
  }

  // =========================================================================
  // 2. VICTORIAN GOTHIC CLOCK TOWER (-9.5, 0, -21) & GALLERY LINK
  // =========================================================================
  const clockGrp = new THREE.Group();
  clockGrp.position.set(-9.5, 0, -21);
  group.add(clockGrp);

  const cShaft = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(4.4, 9.2, 4.4)),
    mats.victorianBrick,
  );
  cShaft.position.y = 4.6;
  cShaft.castShadow = true;
  cShaft.receiveShadow = true;
  clockGrp.add(cShaft);

  const cBelfry = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(4.9, 2.8, 4.9)),
    mats.shikkuiPlaster,
  );
  cBelfry.position.y = 10.6;
  cBelfry.castShadow = true;
  clockGrp.add(cBelfry);

  // 4 Illuminated Roman Clock Dials + Gilded Bezels
  const dialGeo = trackGeo(new THREE.CircleGeometry(1.1, 24));
  const bezelGeo = trackGeo(new THREE.TorusGeometry(1.12, 0.09, 8, 24));
  const faces: Array<{ pos: [number, number, number]; rotY: number }> = [
    { pos: [0, 10.6, 2.48], rotY: 0 },
    { pos: [0, 10.6, -2.48], rotY: Math.PI },
    { pos: [2.48, 10.6, 0], rotY: Math.PI / 2 },
    { pos: [-2.48, 10.6, 0], rotY: -Math.PI / 2 },
  ];
  for (const f of faces) {
    const dial = new THREE.Mesh(dialGeo, mats.clockFace);
    dial.position.set(...f.pos);
    dial.rotation.y = f.rotY;
    clockGrp.add(dial);

    const bezel = new THREE.Mesh(bezelGeo, mats.brushedGold);
    bezel.position.set(...f.pos);
    bezel.rotation.y = f.rotY;
    clockGrp.add(bezel);
  }

  // Steep Gothic Slate Spire + 4 Corner Stone Pinnacles
  const cSpire = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(2.6, 4.8, 4)),
    mats.victorianSlate,
  );
  cSpire.rotation.y = Math.PI / 4;
  cSpire.position.y = 14.4;
  cSpire.castShadow = true;
  clockGrp.add(cSpire);

  const pinGeo = trackGeo(new THREE.ConeGeometry(0.32, 1.5, 4));
  for (const px of [-2.1, 2.1]) {
    for (const pz of [-2.1, 2.1]) {
      const pin = new THREE.Mesh(pinGeo, mats.shikkuiPlaster);
      pin.rotation.y = Math.PI / 4;
      pin.position.set(px, 12.75, pz);
      clockGrp.add(pin);
    }
  }

  // Connecting Victorian wing gallery (-2.5, 0, -21)
  const linkWall = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(8.2, 4.0, 3.0)),
    mats.victorianBrick,
  );
  linkWall.position.set(-2.5, 2.0, -21);
  linkWall.castShadow = true;
  group.add(linkWall);
  const linkRoof = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.15, 2.4, 1.5, 4)),
    mats.victorianSlate,
  );
  linkRoof.rotation.y = Math.PI / 4;
  linkRoof.scale.set(2.4, 1, 1);
  linkRoof.position.set(-2.5, 4.75, -21);
  group.add(linkRoof);

  // =========================================================================
  // 3. KEW-STYLE CRYSTAL GLASS CONSERVATORY / PALM HOUSE (20.5, 0, -12.5)
  // =========================================================================
  const consGrp = new THREE.Group();
  consGrp.position.set(20.5, 0, -12.5);
  consGrp.rotation.y = -0.35;
  group.add(consGrp);

  const dwarfWall = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(7.2, 1.05, 5.2)),
    mats.graniteStone,
  );
  dwarfWall.position.y = 0.52;
  dwarfWall.castShadow = true;
  dwarfWall.receiveShadow = true;
  consGrp.add(dwarfWall);

  // Glass walls & barrel-vaulted roof
  const glassWalls = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(6.8, 2.4, 4.8)),
    mats.conservatoryGlass,
  );
  glassWalls.position.y = 2.25;
  consGrp.add(glassWalls);

  const vaultGeo = trackGeo(
    new THREE.CylinderGeometry(2.4, 2.4, 6.8, 16, 1, false, 0, Math.PI),
  );
  vaultGeo.rotateZ(Math.PI / 2);
  const glassVault = new THREE.Mesh(vaultGeo, mats.conservatoryGlass);
  glassVault.position.y = 3.45;
  consGrp.add(glassVault);

  // Wrought-iron structural ribs framing the conservatory
  const ribRingGeo = trackGeo(new THREE.TorusGeometry(2.44, 0.07, 6, 18, Math.PI));
  for (let ri = -3; ri <= 3; ri++) {
    const rib = new THREE.Mesh(ribRingGeo, mats.wroughtIron);
    rib.rotation.y = Math.PI / 2;
    rib.position.set(ri * 1.1, 3.45, 0);
    consGrp.add(rib);

    const vertCol = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.1, 2.45, 0.1)),
      mats.wroughtIron,
    );
    for (const vz of [-2.42, 2.42]) {
      const vc = vertCol.clone();
      vc.position.set(ri * 1.1, 2.25, vz);
      consGrp.add(vc);
    }
  }

  // =========================================================================
  // 4. VICTORIAN WROUGHT-IRON ESTATE GATES & BRICK BOUNDARY WALLS (z = -9.2)
  // =========================================================================
  const gateGrp = new THREE.Group();
  gateGrp.position.set(4.5, 0, -9.2);
  group.add(gateGrp);

  const gPierGeo = trackGeo(new THREE.BoxGeometry(1.15, 3.6, 1.15));
  const finialGeo = trackGeo(new THREE.SphereGeometry(0.38, 12, 10));
  for (const gx of [-2.1, 2.1]) {
    const p = new THREE.Mesh(gPierGeo, mats.graniteStone);
    p.position.set(gx, 1.8, 0);
    p.castShadow = true;
    gateGrp.add(p);

    const fin = new THREE.Mesh(finialGeo, mats.shikkuiPlaster);
    fin.position.set(gx, 3.92, 0);
    gateGrp.add(fin);
  }
  const ironOverArch = createGothicArch(4.2, 1.4, 0.14, mats.wroughtIron, trackGeo);
  ironOverArch.position.set(0, 3.4, 0);
  gateGrp.add(ironOverArch);

  const buildEstateFence = (wx: number, wz: number, len: number, rotY = 0) => {
    const fg = new THREE.Group();
    fg.position.set(wx, 0, wz);
    fg.rotation.y = rotY;
    group.add(fg);

    const lowWall = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(len, 1.05, 0.65)),
      mats.victorianBrick,
    );
    lowWall.position.y = 0.52;
    lowWall.castShadow = true;
    fg.add(lowWall);

    const railBar = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(len, 0.08, 0.1)),
      mats.wroughtIron,
    );
    railBar.position.y = 2.15;
    fg.add(railBar);

    const picketCount = Math.max(6, Math.floor(len / 0.45));
    const picketGeo = trackGeo(new THREE.CylinderGeometry(0.035, 0.035, 1.25, 6));
    for (let i = 0; i < picketCount; i++) {
      const px = ((i + 0.5) / picketCount - 0.5) * (len - 0.4);
      const pk = new THREE.Mesh(picketGeo, mats.wroughtIron);
      pk.position.set(px, 1.65, 0);
      fg.add(pk);
    }
  };

  buildEstateFence(-5.5, -9.2, 14.0, 0);
  buildEstateFence(12.2, -9.2, 9.5, 0);
  buildEstateFence(-12.5, -14.8, 11.4, Math.PI / 2);

  return {
    group,
    dispose: () => {
      for (const g of geometries) g.dispose();
    },
  };
}
