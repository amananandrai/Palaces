import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildGardenEnvironment, type EnvironmentBuildResult } from '../scene/buildEnvironment';
import { buildSakuraAndKoi, type NatureBuildResult } from '../scene/buildNature';
import { buildPalaceByStyle, type PalaceBuildResult } from '../scene/buildPalace';
import { createMaterialLibrary } from '../scene/materials';
import { getBiomeWaterSpec } from '../scene/terrainMath';
import { createProceduralTextures } from '../scene/textures';
import {
  CAMERA_PRESETS,
  type CameraPresetId,
  type PalaceSceneHandle,
  type PalaceStyle,
  type SceneConfig,
} from '../scene/types';

interface PalaceViewportProps {
  config: SceneConfig;
  initialPreset: CameraPresetId;
  onUserOrbit?: () => void;
}

const _targetPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();

// Pre-allocated Golden Hour / Moonlit Night lighting & atmosphere targets (zero GC)
const _sunPosDay = new THREE.Vector3(-42, 18, -58);
const _sunPosNight = new THREE.Vector3(-24, 34, -64);

const _keyColNight = new THREE.Color(0x9ebeff);
const _hemiSkyNight = new THREE.Color(0x273966);
const _hemiGroundNight = new THREE.Color(0x141926);
const _fillColNight = new THREE.Color(0x5d7bb0);
const _fogColNight = new THREE.Color(0x17223a);

const _iceColDay = new THREE.Color(0xaecce0);
const _iceColNight = new THREE.Color(0x516e8b);

const _scratchDay = new THREE.Color();
const _scratchNight = new THREE.Color();

interface BiomeAtmosphere {
  fogDay: number;
  keyDay: number;
  hemiSkyDay: number;
  hemiGroundDay: number;
  fillDay: number;
  waterDay: number;
  waterAttenDay: number;
  waterNight: number;
  waterAttenNight: number;
}

const BIOME_ATMOSPHERE: Record<PalaceStyle, BiomeAtmosphere> = {
  japanese: {
    fogDay: 0xdd8d61,
    keyDay: 0xffb26b,
    hemiSkyDay: 0x8893c8,
    hemiGroundDay: 0x4b3528,
    fillDay: 0xffe0be,
    waterDay: 0x3b6e6d,
    waterAttenDay: 0x285654,
    waterNight: 0x1b3545,
    waterAttenNight: 0x142836,
  },
  russian: {
    fogDay: 0xb9c9dc,
    keyDay: 0xffdfb8,
    hemiSkyDay: 0x98b2d8,
    hemiGroundDay: 0x5c6878,
    fillDay: 0xe6effc,
    waterDay: 0x8db6d0,
    waterAttenDay: 0x628ba8,
    waterNight: 0x456380,
    waterAttenNight: 0x2f4863,
  },
  victorian: {
    fogDay: 0xc8966e,
    keyDay: 0xffbc78,
    hemiSkyDay: 0x7e8fb8,
    hemiGroundDay: 0x35422e,
    fillDay: 0xfbe2c8,
    waterDay: 0x33635b,
    waterAttenDay: 0x224a44,
    waterNight: 0x19303d,
    waterAttenNight: 0x12222d,
  },
  mughal: {
    fogDay: 0xdc9164,
    keyDay: 0xffb468,
    hemiSkyDay: 0x8e91c4,
    hemiGroundDay: 0x473828,
    fillDay: 0xffe0b8,
    waterDay: 0x2e736f,
    waterAttenDay: 0x1f5754,
    waterNight: 0x183842,
    waterAttenNight: 0x102730,
  },
  persian: {
    fogDay: 0xe3a86b,
    keyDay: 0xffc67d,
    hemiSkyDay: 0x989dc9,
    hemiGroundDay: 0x6b5035,
    fillDay: 0xffe6c0,
    waterDay: 0x1f8ea3,
    waterAttenDay: 0x166475,
    waterNight: 0x17485c,
    waterAttenNight: 0x103142,
  },
};

export const PalaceViewport = forwardRef<PalaceSceneHandle, PalaceViewportProps>(
  function PalaceViewport({ config, initialPreset, onUserOrbit }, ref) {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const configRef = useRef<SceneConfig>(config);
    const onUserOrbitRef = useRef(onUserOrbit);
    const swapPalaceRef = useRef<((style: PalaceStyle) => void) | null>(null);

    const [contextLost, setContextLost] = useState(false);
    const [webglUnavailable, setWebglUnavailable] = useState(false);

    // Imperative transition state shared into the rAF loop without re-renders
    const transitionRef = useRef<{
      active: boolean;
      pos: THREE.Vector3;
      look: THREE.Vector3;
    }>({
      active: false,
      pos: new THREE.Vector3(),
      look: new THREE.Vector3(),
    });

    const captureRef = useRef<(() => string | null) | null>(null);

    useEffect(() => {
      configRef.current = config;
    }, [config]);

    useEffect(() => {
      swapPalaceRef.current?.(config.palaceStyle);
    }, [config.palaceStyle]);

    useEffect(() => {
      onUserOrbitRef.current = onUserOrbit;
    }, [onUserOrbit]);

    useImperativeHandle(ref, () => ({
      applyPreset: (presetId: CameraPresetId) => {
        const spec = getBiomeWaterSpec(configRef.current.palaceStyle);
        if (presetId === 'koi') {
          transitionRef.current.pos.set(...spec.pondCam.position);
          transitionRef.current.look.set(...spec.pondCam.target);
          transitionRef.current.active = true;
          return;
        }
        if (presetId === 'bridge') {
          transitionRef.current.pos.set(...spec.bridgeCam.position);
          transitionRef.current.look.set(...spec.bridgeCam.target);
          transitionRef.current.active = true;
          return;
        }
        const preset = CAMERA_PRESETS.find((p) => p.id === presetId);
        if (!preset) return;
        transitionRef.current.pos.set(...preset.position);
        transitionRef.current.look.set(...preset.target);
        transitionRef.current.active = true;
      },
      captureSnapshot: () => {
        return captureRef.current ? captureRef.current() : null;
      },
    }));

    useEffect(() => {
      const container = mountRef.current;
      if (!container) return;

      // Probe for software WebGL (SwiftShader / llvmpipe / WARP) via GPU renderer string
      const isSoftwareGl = (() => {
        try {
          const probeCanvas = document.createElement('canvas');
          const gl = probeCanvas.getContext('webgl2');
          if (!gl) return true;
          const ext = gl.getExtension('WEBGL_debug_renderer_info');
          const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
          const gpu = String(gl.getParameter(param));
          gl.getExtension('WEBGL_lose_context')?.loseContext();
          return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
        } catch {
          return true;
        }
      })();

      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: !isSoftwareGl,
          powerPreference: 'high-performance',
        });
      } catch {
        setWebglUnavailable(true);
        return;
      }

      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.06;
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
      renderer.setSize(
        container.clientWidth || window.innerWidth,
        container.clientHeight || window.innerHeight,
      );
      renderer.shadowMap.enabled = !isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      const canvas = renderer.domElement;
      canvas.style.display = 'block';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      container.appendChild(canvas);

      const handleContextLost = (e: Event) => {
        e.preventDefault();
        setContextLost(true);
      };
      const handleContextRestored = () => {
        setContextLost(false);
      };
      canvas.addEventListener('webglcontextlost', handleContextLost);
      canvas.addEventListener('webglcontextrestored', handleContextRestored);

      const scene = new THREE.Scene();
      const initialStyle = configRef.current.palaceStyle;
      scene.fog = new THREE.FogExp2(BIOME_ATMOSPHERE[initialStyle].fogDay, 0.0082);

      // Studio PBR Environment reflection map on every device
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
      scene.environment = envTarget.texture;
      pmremGenerator.dispose();

      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.25, 380);

      const startPreset =
        CAMERA_PRESETS.find((p) => p.id === initialPreset) ?? CAMERA_PRESETS[0];
      camera.position.set(...startPreset.position);

      const controls = new OrbitControls(camera, canvas);
      controls.target.set(...startPreset.target);
      controls.enableDamping = !isSoftwareGl;
      controls.dampingFactor = 0.06;
      controls.maxPolarAngle = Math.PI * 0.485;
      controls.minPolarAngle = 0.14;
      controls.minDistance = 5;
      controls.maxDistance = 68;
      controls.panSpeed = 0.75;
      controls.update();

      const handleControlsStart = () => {
        if (transitionRef.current.active) {
          transitionRef.current.active = false;
        }
        onUserOrbitRef.current?.();
      };
      controls.addEventListener('start', handleControlsStart);

      // Golden-hour 3-point atmospheric lighting rig
      const sunDir = new THREE.Vector3(-42, 18, -58);

      const keyLight = new THREE.DirectionalLight(BIOME_ATMOSPHERE[initialStyle].keyDay, 2.25);
      keyLight.position.copy(sunDir);
      keyLight.castShadow = !isSoftwareGl;
      keyLight.shadow.mapSize.set(2048, 2048);
      keyLight.shadow.camera.near = 10;
      keyLight.shadow.camera.far = 155;
      keyLight.shadow.camera.left = -38;
      keyLight.shadow.camera.right = 38;
      keyLight.shadow.camera.top = 34;
      keyLight.shadow.camera.bottom = -26;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.025;
      scene.add(keyLight);

      const hemiLight = new THREE.HemisphereLight(
        BIOME_ATMOSPHERE[initialStyle].hemiSkyDay,
        BIOME_ATMOSPHERE[initialStyle].hemiGroundDay,
        0.92,
      );
      scene.add(hemiLight);

      const fillLight = new THREE.DirectionalLight(BIOME_ATMOSPHERE[initialStyle].fillDay, 0.82);
      fillLight.position.set(28, 24, 34);
      scene.add(fillLight);

      // Procedural textures, materials, biome environment, active palace, and wildlife/trees
      const maxAniso = renderer.capabilities.getMaxAnisotropy();
      const textures = createProceduralTextures(maxAniso);
      const mats = createMaterialLibrary(textures, isSoftwareGl);

      const envRoot = new THREE.Group();
      const palaceRoot = new THREE.Group();
      const natureRoot = new THREE.Group();
      scene.add(envRoot, palaceRoot, natureRoot);

      let activePalaceStyle: PalaceStyle = initialStyle;
      let envBuild: EnvironmentBuildResult = buildGardenEnvironment(activePalaceStyle, mats, sunDir);
      let palaceBuild: PalaceBuildResult = buildPalaceByStyle(activePalaceStyle, mats);
      let natureBuild: NatureBuildResult = buildSakuraAndKoi(activePalaceStyle, mats);

      envRoot.add(envBuild.group);
      palaceRoot.add(palaceBuild.group);
      natureRoot.add(natureBuild.group);

      if (!isSoftwareGl) {
        renderer.compile(scene, camera);
      }

      captureRef.current = () => {
        renderer.render(scene, camera);
        return canvas.toDataURL('image/png');
      };

      const handleResize = () => {
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener('resize', handleResize);

      // Continuous loop with software-WebGL fence-sync pacing
      let disposed = false;
      let frameId = 0;
      let nightMix = configRef.current.timeOfDay === 'night' ? 1 : 0;
      const clock = new THREE.Clock();

      function applyAtmosphere(mix: number, elapsed: number) {
        const bio = BIOME_ATMOSPHERE[activePalaceStyle];
        envBuild.skyUniforms.uNightMix.value = mix;

        keyLight.position.lerpVectors(_sunPosDay, _sunPosNight, mix);
        _scratchDay.setHex(bio.keyDay);
        keyLight.color.copy(_scratchDay).lerp(_keyColNight, mix);
        keyLight.intensity = THREE.MathUtils.lerp(2.25, 1.15, mix);

        _scratchDay.setHex(bio.hemiSkyDay);
        hemiLight.color.copy(_scratchDay).lerp(_hemiSkyNight, mix);
        _scratchDay.setHex(bio.hemiGroundDay);
        hemiLight.groundColor.copy(_scratchDay).lerp(_hemiGroundNight, mix);
        hemiLight.intensity = THREE.MathUtils.lerp(0.92, 0.58, mix);

        _scratchDay.setHex(bio.fillDay);
        fillLight.color.copy(_scratchDay).lerp(_fillColNight, mix);
        fillLight.intensity = THREE.MathUtils.lerp(0.82, 0.42, mix);

        const fog = scene.fog as THREE.FogExp2;
        _scratchDay.setHex(bio.fogDay);
        fog.color.copy(_scratchDay).lerp(_fogColNight, mix);
        fog.density = THREE.MathUtils.lerp(0.0082, 0.0088, mix);

        scene.environmentIntensity = THREE.MathUtils.lerp(1.0, 0.38, mix);
        renderer.toneMappingExposure = THREE.MathUtils.lerp(1.06, 1.0, mix);

        _scratchDay.setHex(bio.waterDay);
        _scratchNight.setHex(bio.waterNight);
        mats.waterSurface.color.copy(_scratchDay).lerp(_scratchNight, mix);

        _scratchDay.setHex(bio.waterAttenDay);
        _scratchNight.setHex(bio.waterAttenNight);
        mats.waterSurface.attenuationColor.copy(_scratchDay).lerp(_scratchNight, mix);

        mats.iceWater.color.copy(_iceColDay).lerp(_iceColNight, mix);

        // Crisp, non-blooming warm lantern & window illumination
        mats.lanternGlow.emissiveIntensity = THREE.MathUtils.lerp(0.65, 1.65, mix);
        mats.shojiWindow.emissiveIntensity = THREE.MathUtils.lerp(0.42, 1.1, mix);
        mats.palaceWindow.emissiveIntensity = THREE.MathUtils.lerp(0.22, 0.9, mix);
        mats.clockFace.emissiveIntensity = THREE.MathUtils.lerp(0.2, 0.95, mix);

        for (let i = 0; i < envBuild.lanternLights.length; i++) {
          const base = THREE.MathUtils.lerp(1.2, 6.2, mix);
          const flicker = mix > 0.05 ? Math.sin(elapsed * 3.1 + i * 1.7) * 0.35 * mix : 0;
          envBuild.lanternLights[i].intensity = base + flicker;
        }
      }

      swapPalaceRef.current = (nextStyle: PalaceStyle) => {
        if (nextStyle === activePalaceStyle) return;

        envRoot.remove(envBuild.group);
        palaceRoot.remove(palaceBuild.group);
        natureRoot.remove(natureBuild.group);

        envBuild.dispose();
        palaceBuild.dispose();
        natureBuild.dispose();

        activePalaceStyle = nextStyle;

        envBuild = buildGardenEnvironment(nextStyle, mats, sunDir);
        palaceBuild = buildPalaceByStyle(nextStyle, mats);
        natureBuild = buildSakuraAndKoi(nextStyle, mats);

        envRoot.add(envBuild.group);
        palaceRoot.add(palaceBuild.group);
        natureRoot.add(natureBuild.group);

        applyAtmosphere(nightMix, clock.getElapsedTime());

        if (!isSoftwareGl) {
          renderer.compile(scene, camera);
        }
      };

      function afterDraw(cb: () => void) {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      }

      function tick() {
        if (disposed) return;

        const delta = Math.min(clock.getDelta(), 0.1);
        const elapsed = clock.getElapsedTime();
        const { petalDensity, windStrength, timeOfDay } = configRef.current;

        const targetNightMix = timeOfDay === 'night' ? 1 : 0;
        nightMix = THREE.MathUtils.damp(nightMix, targetNightMix, 2.6, delta);
        applyAtmosphere(nightMix, elapsed);

        // Smooth damped camera preset glide
        if (transitionRef.current.active) {
          _targetPos.copy(transitionRef.current.pos);
          _targetLook.copy(transitionRef.current.look);

          camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetPos.x, 4.2, delta);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetPos.y, 4.2, delta);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetPos.z, 4.2, delta);

          controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetLook.x, 4.6, delta);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetLook.y, 4.6, delta);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetLook.z, 4.6, delta);

          if (
            camera.position.distanceTo(_targetPos) < 0.06 &&
            controls.target.distanceTo(_targetLook) < 0.06
          ) {
            camera.position.copy(_targetPos);
            controls.target.copy(_targetLook);
            transitionRef.current.active = false;
          }
        }

        controls.update();
        natureBuild.update(elapsed, delta, petalDensity, windStrength);

        renderer.render(scene, camera);

        if (isSoftwareGl) {
          afterDraw(tick);
        } else {
          frameId = requestAnimationFrame(tick);
        }
      }

      if (isSoftwareGl) {
        applyAtmosphere(nightMix, 0);
        natureBuild.update(0, 0.016, configRef.current.petalDensity, configRef.current.windStrength);
        renderer.render(scene, camera);
        afterDraw(tick);
      } else {
        applyAtmosphere(nightMix, 0);
        frameId = requestAnimationFrame(tick);
      }

      return () => {
        disposed = true;
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
        captureRef.current = null;
        swapPalaceRef.current = null;
        window.removeEventListener('resize', handleResize);
        controls.removeEventListener('start', handleControlsStart);
        canvas.removeEventListener('webglcontextlost', handleContextLost);
        canvas.removeEventListener('webglcontextrestored', handleContextRestored);

        controls.dispose();
        natureBuild.dispose();
        palaceBuild.dispose();
        envBuild.dispose();
        mats.dispose();
        textures.dispose();
        envTarget.dispose();
        renderer.dispose();

        if (canvas.parentElement === container) {
          container.removeChild(canvas);
        }
      };
    }, [initialPreset]);

    return (
      <div className="relative h-full w-full overflow-hidden bg-[#161312]">
        <div ref={mountRef} className="h-full w-full" />

        {(webglUnavailable || contextLost) && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#161312] p-6 text-center">
            <img
              src="/src/assets/images/japanese_palace_sakura_koi_1794841411373.jpg"
              alt="Palace courtyard with sakura garden, arched bridge, koi pond, and mountain at sunset"
              referrerPolicy="no-referrer"
              className="mb-5 max-h-[65vh] max-w-3xl rounded-lg border border-white/10 object-cover shadow-2xl"
            />
            <p className="text-sm text-[#f5efe6]">
              {contextLost
                ? '3D rendering context paused. Restoring scene...'
                : 'Interactive WebGL is unavailable in this browser environment.'}
            </p>
          </div>
        )}
      </div>
    );
  },
);
