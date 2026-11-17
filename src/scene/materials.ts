import * as THREE from 'three';
import type { ProceduralTextureSet } from './textures';

export interface SceneMaterialLibrary {
  ishigakiStone: THREE.MeshStandardMaterial;
  shikkuiPlaster: THREE.MeshStandardMaterial;
  namakoWall: THREE.MeshStandardMaterial;
  yakisugiTimber: THREE.MeshStandardMaterial;
  hinokiDeck: THREE.MeshStandardMaterial;
  kawaraRoof: THREE.MeshStandardMaterial;
  shojiWindow: THREE.MeshStandardMaterial;
  brushedGold: THREE.MeshPhysicalMaterial;
  vermilionLacquer: THREE.MeshPhysicalMaterial;
  graniteStone: THREE.MeshStandardMaterial;
  steppingStone: THREE.MeshStandardMaterial;
  mountainTerrain: THREE.MeshStandardMaterial;
  lanternGlow: THREE.MeshStandardMaterial;
  waterSurface: THREE.MeshPhysicalMaterial;
  waterUniforms: { uTime: { value: number } };
  terrainGround: THREE.MeshStandardMaterial;
  pondBed: THREE.MeshStandardMaterial;
  contactShadowMat: THREE.MeshBasicMaterial;
  sakuraBark: THREE.MeshStandardMaterial;
  sakuraBlossom: THREE.MeshStandardMaterial;
  sakuraLeaf: THREE.MeshStandardMaterial;
  sakuraPetal: THREE.MeshStandardMaterial;
  foliageUniforms: { uTime: { value: number }; uWind: { value: number } };
  koiMaterials: THREE.MeshPhysicalMaterial[];
  lilyPad: THREE.MeshStandardMaterial;
  russianBrick: THREE.MeshStandardMaterial;
  victorianBrick: THREE.MeshStandardMaterial;
  victorianSlate: THREE.MeshStandardMaterial;
  malachiteCopper: THREE.MeshStandardMaterial;
  wroughtIron: THREE.MeshStandardMaterial;
  conservatoryGlass: THREE.MeshPhysicalMaterial;
  makranaMarble: THREE.MeshPhysicalMaterial;
  redSandstone: THREE.MeshStandardMaterial;
  jaaliScreen: THREE.MeshStandardMaterial;
  persianTile: THREE.MeshPhysicalMaterial;
  turquoiseGlaze: THREE.MeshPhysicalMaterial;
  ochrePlaster: THREE.MeshStandardMaterial;
  clockFace: THREE.MeshStandardMaterial;
  palaceWindow: THREE.MeshStandardMaterial;
  snowGround: THREE.MeshStandardMaterial;
  iceWater: THREE.MeshPhysicalMaterial;
  desertSand: THREE.MeshStandardMaterial;
  lushGrass: THREE.MeshStandardMaterial;
  birchBark: THREE.MeshStandardMaterial;
  pineNeedle: THREE.MeshStandardMaterial;
  pineBough: THREE.MeshStandardMaterial;
  greenCanopy: THREE.MeshStandardMaterial;
  greenLeaf: THREE.MeshStandardMaterial;
  treeSnow: THREE.MeshStandardMaterial;
  palmFrond: THREE.MeshStandardMaterial;
  palmBark: THREE.MeshStandardMaterial;
  hedgeFoliage: THREE.MeshStandardMaterial;
  lotusPetal: THREE.MeshStandardMaterial;
  camelCoat: THREE.MeshStandardMaterial;
  saddleCloth: THREE.MeshStandardMaterial;
  swanWhite: THREE.MeshPhysicalMaterial;
  swanBlack: THREE.MeshPhysicalMaterial;
  swanBeakOrange: THREE.MeshPhysicalMaterial;
  bambooGreen: THREE.MeshPhysicalMaterial;
  reedCattail: THREE.MeshStandardMaterial;
  cattailHead: THREE.MeshStandardMaterial;
  persianCarpet: THREE.MeshStandardMaterial;
  camelDarkFur: THREE.MeshStandardMaterial;
  dispose: () => void;
}

export function createMaterialLibrary(
  textures: ProceduralTextureSet,
  isSoftwareGl: boolean,
): SceneMaterialLibrary {
  const materials: THREE.Material[] = [];
  const track = <T extends THREE.Material>(mat: T): T => {
    materials.push(mat);
    return mat;
  };

  // Roughness & metalness deliberately staggered >= 0.25 across adjacent architectural layers
  const ishigakiStone = track(
    new THREE.MeshStandardMaterial({
      map: textures.stoneAlbedo,
      bumpMap: textures.stoneBump,
      bumpScale: 0.14,
      roughness: 0.92,
      metalness: 0.02,
    }),
  );

  const shikkuiPlaster = track(
    new THREE.MeshStandardMaterial({
      map: textures.plasterAlbedo,
      bumpMap: textures.plasterBump,
      bumpScale: 0.025,
      color: 0xfaf4ea,
      roughness: 0.9,
      metalness: 0.0,
    }),
  );

  const namakoWall = track(
    new THREE.MeshStandardMaterial({
      map: textures.namakoAlbedo,
      bumpMap: textures.namakoBump,
      bumpScale: 0.07,
      roughness: 0.65,
      metalness: 0.08,
    }),
  );

  const yakisugiTimber = track(
    new THREE.MeshStandardMaterial({
      map: textures.woodAlbedo,
      bumpMap: textures.woodBump,
      bumpScale: 0.06,
      color: 0x5c463b,
      roughness: 0.62,
      metalness: 0.04,
    }),
  );

  const hinokiDeck = track(
    new THREE.MeshStandardMaterial({
      map: textures.hinokiAlbedo,
      bumpMap: textures.hinokiBump,
      bumpScale: 0.045,
      color: 0xd4aa82,
      roughness: 0.56,
      metalness: 0.02,
    }),
  );

  const kawaraRoof = track(
    new THREE.MeshStandardMaterial({
      map: textures.roofAlbedo,
      bumpMap: textures.roofBump,
      bumpScale: 0.1,
      color: 0x525a66,
      roughness: 0.42,
      metalness: 0.16,
    }),
  );

  const shojiWindow = track(
    new THREE.MeshStandardMaterial({
      map: textures.shojiEmissive,
      emissiveMap: textures.shojiEmissive,
      emissive: new THREE.Color(0xffb45c),
      emissiveIntensity: 0.95,
      roughness: 0.7,
      metalness: 0.0,
    }),
  );

  const brushedGold = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xe3be52,
      metalness: 0.94,
      roughness: 0.18,
      anisotropy: 0.8,
      clearcoat: 0.35,
    }),
  );

  const vermilionLacquer = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xb63729,
      bumpMap: textures.woodBump,
      bumpScale: 0.015,
      roughness: 0.24,
      metalness: 0.06,
      clearcoat: 0.85,
      clearcoatRoughness: 0.18,
    }),
  );

  const graniteStone = track(
    new THREE.MeshStandardMaterial({
      map: textures.graniteAlbedo,
      bumpMap: textures.graniteBump,
      bumpScale: 0.065,
      roughness: 0.88,
      metalness: 0.02,
    }),
  );

  const steppingStone = track(
    new THREE.MeshStandardMaterial({
      map: textures.steppingStoneAlbedo,
      bumpMap: textures.steppingStoneBump,
      bumpScale: 0.08,
      roughness: 0.84,
      metalness: 0.02,
    }),
  );

  const mountainTerrain = track(
    new THREE.MeshStandardMaterial({
      map: textures.mountainAlbedo,
      bumpMap: textures.mountainBump,
      bumpScale: 0.35,
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.0,
    }),
  );

  const lanternGlow = track(
    new THREE.MeshStandardMaterial({
      color: 0xffe4a8,
      emissive: new THREE.Color(0xffa444),
      emissiveIntensity: 2.2,
      roughness: 0.4,
    }),
  );

  const waterUniforms = { uTime: { value: 0 } };
  const waterSurface = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x3b6e6d,
      roughness: 0.08,
      metalness: 0.05,
      transmission: isSoftwareGl ? 0 : 0.72,
      transparent: true,
      opacity: isSoftwareGl ? 0.56 : 0.88,
      ior: 1.333,
      thickness: 0.9,
      attenuationColor: new THREE.Color(0x285654),
      attenuationDistance: 2.8,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      depthWrite: false,
    }),
  );

  // Inject gentle animated wave displacement & normal ripples into PBR water
  waterSurface.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = waterUniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float waveA = sin(position.x * 1.4 + uTime * 1.6) * cos(position.z * 1.2 + uTime * 1.2);
        float waveB = sin((position.x + position.z) * 2.6 - uTime * 2.1);
        transformed.y += (waveA * 0.018 + waveB * 0.008);`,
      );
  };

  const terrainGround = track(
    new THREE.MeshStandardMaterial({
      map: textures.terrainAlbedo,
      vertexColors: true,
      roughness: 0.94,
      metalness: 0.0,
    }),
  );

  const pondBed = track(
    new THREE.MeshStandardMaterial({
      map: textures.pondBedAlbedo,
      roughness: 0.95,
      metalness: 0.0,
    }),
  );

  const contactShadowMat = track(
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
    }),
  );

  const foliageUniforms = {
    uTime: { value: 0 },
    uWind: { value: 0.9 },
  };

  const applyFoliageSway = (mat: THREE.MeshStandardMaterial, amplitude: number) => {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = foliageUniforms.uTime;
      shader.uniforms.uWind = foliageUniforms.uWind;
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform float uTime;
          uniform float uWind;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          #ifdef USE_INSTANCING
            float phase = float(gl_InstanceID) * 0.73;
            float sway = sin(uTime * 1.85 + phase) * ${amplitude.toFixed(4)} * uWind;
            transformed.x += sway;
            transformed.y += cos(uTime * 1.4 + phase) * ${(amplitude * 0.4).toFixed(4)} * uWind;
          #endif`,
        );
    };
  };

  const sakuraBark = track(
    new THREE.MeshStandardMaterial({
      map: textures.sakuraBarkAlbedo,
      bumpMap: textures.sakuraBarkBump,
      bumpScale: 0.08,
      color: 0x6b4b43,
      roughness: 0.88,
      metalness: 0.0,
    }),
  );

  const sakuraBlossom = track(
    new THREE.MeshStandardMaterial({
      map: textures.sakuraClusterAlpha,
      alphaTest: 0.32,
      side: THREE.DoubleSide,
      color: 0xffffff, // Tinted per-instance via InstancedMesh.setColorAt
      roughness: 0.62,
      metalness: 0.0,
    }),
  );
  applyFoliageSway(sakuraBlossom, 0.028);

  const sakuraLeaf = track(
    new THREE.MeshStandardMaterial({
      map: textures.sakuraLeafAlpha,
      alphaTest: 0.34,
      side: THREE.DoubleSide,
      color: 0xffffff, // Tinted per-instance via InstancedMesh.setColorAt
      roughness: 0.44,
      metalness: 0.02,
    }),
  );
  applyFoliageSway(sakuraLeaf, 0.036);

  const sakuraPetal = track(
    new THREE.MeshStandardMaterial({
      map: textures.petalAlpha,
      alphaTest: 0.35,
      side: THREE.DoubleSide,
      roughness: 0.55,
      metalness: 0.0,
    }),
  );

  const koiMaterials = textures.koiTextures.map((tex) =>
    track(
      new THREE.MeshPhysicalMaterial({
        map: tex,
        roughness: 0.25,
        metalness: 0.05,
        clearcoat: 0.8,
        clearcoatRoughness: 0.15,
      }),
    ),
  );

  const lilyPad = track(
    new THREE.MeshStandardMaterial({
      color: 0x3f6b3a,
      roughness: 0.58,
      metalness: 0.02,
      side: THREE.DoubleSide,
    }),
  );

  // Russian Imperial & Victorian masonry / roofing / iron / glass
  const russianBrick = track(
    new THREE.MeshStandardMaterial({
      map: textures.redBrickAlbedo,
      bumpMap: textures.redBrickBump,
      bumpScale: 0.08,
      color: 0xa6342a,
      roughness: 0.82,
      metalness: 0.02,
    }),
  );

  const victorianBrick = track(
    new THREE.MeshStandardMaterial({
      map: textures.redBrickAlbedo,
      bumpMap: textures.redBrickBump,
      bumpScale: 0.09,
      color: 0xb45b44,
      roughness: 0.84,
      metalness: 0.02,
    }),
  );

  const victorianSlate = track(
    new THREE.MeshStandardMaterial({
      map: textures.slateTileAlbedo,
      bumpMap: textures.slateTileBump,
      bumpScale: 0.09,
      color: 0x5c6778,
      roughness: 0.44,
      metalness: 0.14,
    }),
  );

  const malachiteCopper = track(
    new THREE.MeshStandardMaterial({
      color: 0x3b8a74,
      roughness: 0.42,
      metalness: 0.28,
    }),
  );

  const wroughtIron = track(
    new THREE.MeshStandardMaterial({
      color: 0x22262b,
      roughness: 0.36,
      metalness: 0.78,
    }),
  );

  const conservatoryGlass = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xcbe8f6,
      roughness: 0.08,
      metalness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );

  // Mughal Makrana marble, Agra red sandstone, and pierced Jaali screens
  const makranaMarble = track(
    new THREE.MeshPhysicalMaterial({
      map: textures.makranaMarbleAlbedo,
      bumpMap: textures.makranaMarbleBump,
      bumpScale: 0.03,
      color: 0xfbf7f0,
      roughness: 0.28,
      metalness: 0.02,
      clearcoat: 0.32,
      clearcoatRoughness: 0.25,
    }),
  );

  const redSandstone = track(
    new THREE.MeshStandardMaterial({
      map: textures.sandstoneAlbedo,
      bumpMap: textures.sandstoneBump,
      bumpScale: 0.1,
      roughness: 0.86,
      metalness: 0.02,
    }),
  );

  const jaaliScreen = track(
    new THREE.MeshStandardMaterial({
      map: textures.jaaliAlpha,
      alphaTest: 0.35,
      side: THREE.DoubleSide,
      roughness: 0.65,
      metalness: 0.02,
    }),
  );

  // Safavid Persian haft-rangi tilework, turquoise glaze, and ochre brick
  const persianTile = track(
    new THREE.MeshPhysicalMaterial({
      map: textures.persianTileAlbedo,
      bumpMap: textures.persianTileBump,
      bumpScale: 0.05,
      roughness: 0.22,
      metalness: 0.06,
      clearcoat: 0.86,
      clearcoatRoughness: 0.14,
    }),
  );

  const turquoiseGlaze = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x1d8ea3,
      roughness: 0.2,
      metalness: 0.08,
      clearcoat: 0.9,
      clearcoatRoughness: 0.12,
    }),
  );

  const ochrePlaster = track(
    new THREE.MeshStandardMaterial({
      map: textures.plasterAlbedo,
      bumpMap: textures.plasterBump,
      bumpScale: 0.035,
      color: 0xdec296,
      roughness: 0.85,
      metalness: 0.0,
    }),
  );

  const clockFace = track(
    new THREE.MeshStandardMaterial({
      map: textures.clockFaceAlbedo,
      emissive: new THREE.Color(0xffe7b8),
      emissiveMap: textures.clockFaceAlbedo,
      emissiveIntensity: 0.35,
      roughness: 0.5,
    }),
  );

  const palaceWindow = track(
    new THREE.MeshStandardMaterial({
      map: textures.stainedWindowAlbedo,
      emissive: new THREE.Color(0xffc77a),
      emissiveMap: textures.stainedWindowAlbedo,
      emissiveIntensity: 0.32,
      roughness: 0.3,
      metalness: 0.12,
    }),
  );

  // Biome environments & foliage materials
  const snowGround = track(
    new THREE.MeshStandardMaterial({
      map: textures.snowTerrainAlbedo,
      vertexColors: true,
      roughness: 0.82,
      metalness: 0.02,
    }),
  );

  const iceWater = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x8cc6db,
      roughness: 0.18,
      metalness: 0.06,
      clearcoat: 0.9,
      clearcoatRoughness: 0.12,
      transparent: true,
      opacity: 0.78,
    }),
  );

  const desertSand = track(
    new THREE.MeshStandardMaterial({
      map: textures.desertSandAlbedo,
      bumpMap: textures.desertSandBump,
      bumpScale: 0.16,
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.0,
    }),
  );

  const lushGrass = track(
    new THREE.MeshStandardMaterial({
      map: textures.lushLawnAlbedo,
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.0,
    }),
  );

  const birchBark = track(
    new THREE.MeshStandardMaterial({
      map: textures.birchBarkAlbedo,
      roughness: 0.82,
      metalness: 0.0,
    }),
  );

  const pineNeedle = track(
    new THREE.MeshStandardMaterial({
      color: 0x2c4e36,
      roughness: 0.78,
      metalness: 0.0,
    }),
  );

  const pineBough = track(
    new THREE.MeshStandardMaterial({
      map: textures.pineBoughAlpha,
      alphaTest: 0.28,
      side: THREE.DoubleSide,
      color: 0xffffff,
      roughness: 0.66,
      metalness: 0.0,
    }),
  );
  applyFoliageSway(pineBough, 0.018);

  const greenCanopy = track(
    new THREE.MeshStandardMaterial({
      map: textures.greenCanopyAlpha,
      alphaTest: 0.3,
      side: THREE.DoubleSide,
      color: 0xffffff,
      roughness: 0.56,
      metalness: 0.0,
    }),
  );
  applyFoliageSway(greenCanopy, 0.026);

  const greenLeaf = track(
    new THREE.MeshStandardMaterial({
      map: textures.sakuraLeafAlpha,
      alphaTest: 0.34,
      side: THREE.DoubleSide,
      color: 0xffffff,
      roughness: 0.5,
      metalness: 0.0,
    }),
  );
  applyFoliageSway(greenLeaf, 0.028);

  const treeSnow = track(
    new THREE.MeshStandardMaterial({
      map: textures.snowTerrainAlbedo,
      color: 0xf4f8fc,
      roughness: 0.78,
      metalness: 0.04,
    }),
  );

  const palmFrond = track(
    new THREE.MeshStandardMaterial({
      map: textures.palmFrondAlpha,
      alphaTest: 0.3,
      side: THREE.DoubleSide,
      color: 0xffffff,
      roughness: 0.48,
      metalness: 0.02,
    }),
  );
  applyFoliageSway(palmFrond, 0.042);

  const palmBark = track(
    new THREE.MeshStandardMaterial({
      map: textures.palmBarkAlbedo,
      bumpMap: textures.palmBarkBump,
      bumpScale: 0.14,
      roughness: 0.9,
      metalness: 0.0,
    }),
  );

  const hedgeFoliage = track(
    new THREE.MeshStandardMaterial({
      color: 0x2f5a2d,
      roughness: 0.84,
      metalness: 0.0,
    }),
  );

  const lotusPetal = track(
    new THREE.MeshStandardMaterial({
      color: 0xf48fb1,
      roughness: 0.45,
      metalness: 0.0,
      side: THREE.DoubleSide,
    }),
  );

  const camelCoat = track(
    new THREE.MeshStandardMaterial({
      color: 0xc9965b,
      roughness: 0.86,
      metalness: 0.0,
    }),
  );

  const saddleCloth = track(
    new THREE.MeshStandardMaterial({
      map: textures.persianTileAlbedo,
      roughness: 0.72,
      metalness: 0.05,
    }),
  );

  const swanWhite = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xfbf8f2,
      roughness: 0.42,
      metalness: 0.02,
      clearcoat: 0.25,
      clearcoatRoughness: 0.35,
    }),
  );

  const swanBlack = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x20242c,
      roughness: 0.44,
      metalness: 0.04,
      clearcoat: 0.25,
      clearcoatRoughness: 0.35,
    }),
  );

  const swanBeakOrange = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xe67222,
      roughness: 0.32,
      metalness: 0.02,
      clearcoat: 0.45,
      clearcoatRoughness: 0.22,
    }),
  );

  const bambooGreen = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x6f9246,
      roughness: 0.44,
      metalness: 0.02,
      clearcoat: 0.35,
      clearcoatRoughness: 0.28,
    }),
  );

  const reedCattail = track(
    new THREE.MeshStandardMaterial({
      color: 0x677e40,
      roughness: 0.72,
      metalness: 0.0,
      side: THREE.DoubleSide,
    }),
  );

  const cattailHead = track(
    new THREE.MeshStandardMaterial({
      color: 0x4b2e1e,
      roughness: 0.92,
      metalness: 0.0,
    }),
  );

  const persianCarpet = track(
    new THREE.MeshStandardMaterial({
      map: textures.persianTileAlbedo,
      color: 0xd96b54,
      roughness: 0.88,
      metalness: 0.02,
    }),
  );

  const camelDarkFur = track(
    new THREE.MeshStandardMaterial({
      color: 0x8a5b32,
      roughness: 0.92,
      metalness: 0.0,
    }),
  );

  return {
    ishigakiStone,
    shikkuiPlaster,
    namakoWall,
    yakisugiTimber,
    hinokiDeck,
    kawaraRoof,
    shojiWindow,
    brushedGold,
    vermilionLacquer,
    graniteStone,
    steppingStone,
    mountainTerrain,
    lanternGlow,
    waterSurface,
    waterUniforms,
    terrainGround,
    pondBed,
    contactShadowMat,
    sakuraBark,
    sakuraBlossom,
    sakuraLeaf,
    sakuraPetal,
    foliageUniforms,
    koiMaterials,
    lilyPad,
    russianBrick,
    victorianBrick,
    victorianSlate,
    malachiteCopper,
    wroughtIron,
    conservatoryGlass,
    makranaMarble,
    redSandstone,
    jaaliScreen,
    persianTile,
    turquoiseGlaze,
    ochrePlaster,
    clockFace,
    palaceWindow,
    snowGround,
    iceWater,
    desertSand,
    lushGrass,
    birchBark,
    pineNeedle,
    pineBough,
    greenCanopy,
    greenLeaf,
    treeSnow,
    palmFrond,
    palmBark,
    hedgeFoliage,
    lotusPetal,
    camelCoat,
    saddleCloth,
    swanWhite,
    swanBlack,
    swanBeakOrange,
    bambooGreen,
    reedCattail,
    cattailHead,
    persianCarpet,
    camelDarkFur,
    dispose: () => {
      for (const m of materials) {
        m.dispose();
      }
    },
  };
}
