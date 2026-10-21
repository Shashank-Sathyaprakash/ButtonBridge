import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  Box,
  Rotate3d,
  RefreshCw,
  Crosshair,
  Globe,
  HardDrive,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCcw
} from 'lucide-react';

const DANISH_BLENDS_MX2S_UID = 'e8f3235951934a01aba4e0ee3de72e71';

const DEFAULT_BUTTON_HOTSPOTS_3D = [
  { id: 'middle_click', shortNum: '1', label: 'Middle Click (Main Wheel)', pos: [-0.45, 0.42, 0.12] },
  { id: 'mode_shift', shortNum: '2', label: 'Top Mode Shift Button', pos: [-0.05, 0.48, 0.10] },
  { id: 'thumb_left', shortNum: '3', label: 'Thumb Wheel Left', pos: [-0.15, 0.18, 0.52] },
  { id: 'thumb_right', shortNum: '4', label: 'Thumb Wheel Right', pos: [0.12, 0.18, 0.52] },
  { id: 'forward', shortNum: '5', label: 'Side Forward (Mouse5)', pos: [-0.22, 0.28, 0.46] },
  { id: 'back', shortNum: '6', label: 'Side Back (Mouse4)', pos: [0.08, 0.25, 0.48] },
  { id: 'gesture', shortNum: '7', label: 'Thumb Rest Gesture Button', pos: [0.15, -0.18, 0.72] }
];

export default function MouseSVG(props) {
  const currentSelected =
    props.selectedButton ??
    props.activeButton ??
    props.selectedInput ??
    props.selected ??
    'middle_click';

  const handleSelect = (buttonId) => {
    if (typeof props.onSelectButton === 'function') props.onSelectButton(buttonId);
    else if (typeof props.onSelect === 'function') props.onSelect(buttonId);
    else if (typeof props.setSelectedButton === 'function') props.setSelectedButton(buttonId);
    else if (typeof props.onChange === 'function') props.onChange(buttonId);
  };

  const [renderSource, setRenderSource] = useState('local');
  const [autoRotate, setAutoRotate] = useState(true);
  const [calibratingPin, setCalibratingPin] = useState(false);
  const [loadStatus, setLoadStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [projectedPins, setProjectedPins] = useState([]);

  const [hotspots, setHotspots] = useState(() => {
    try {
      const saved = localStorage.getItem('mx2s_3d_hotspots_v1');
      return saved ? JSON.parse(saved) : DEFAULT_BUTTON_HOTSPOTS_3D;
    } catch {
      return DEFAULT_BUTTON_HOTSPOTS_3D;
    }
  });

  const mountRef = useRef(null);
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);
  const modelRootRef = useRef(null);
  const hotspotsRef = useRef(hotspots);
  const calibratingRef = useRef(calibratingPin);
  const selectedRef = useRef(currentSelected);
  // Camera "fly to the selected button" request: { dir: unit Vector3, dist }.
  // Consumed frame-by-frame in the render loop; cleared when the user grabs the model.
  const focusRef = useRef(null);
  const prevSelectedRef = useRef(currentSelected);

  useEffect(() => { hotspotsRef.current = hotspots; }, [hotspots]);
  useEffect(() => { calibratingRef.current = calibratingPin; }, [calibratingPin]);
  useEffect(() => { selectedRef.current = currentSelected; }, [currentSelected]);

  const resetPins = () => {
    setHotspots(DEFAULT_BUTTON_HOTSPOTS_3D);
    try { localStorage.removeItem('mx2s_3d_hotspots_v1'); } catch { /* storage unavailable */ }
    setCalibratingPin(false);
  };

  useEffect(() => {
    if (renderSource !== 'local' || !mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 420;

    setLoadStatus('loading');
    setErrorMessage('');

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(-2.2, 1.8, 2.6);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.6;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.2;
    controls.minDistance = 1.4;
    controls.maxDistance = 6.0;
    controlsRef.current = controls;

    // Any manual orbit/zoom/pan cancels an in-flight camera move.
    focusRef.current = null;
    const cancelFocus = () => { focusRef.current = null; };
    controls.addEventListener('start', cancelFocus);
    const focusOffset = new THREE.Vector3();
    const focusStepQ = new THREE.Quaternion();
    const focusPartialQ = new THREE.Quaternion();
    const identityQ = new THREE.Quaternion();

    scene.add(new THREE.AmbientLight(0xffffff, 1.8));
    const hemiLight = new THREE.HemisphereLight(0xe2e8f0, 0x1e293b, 2.2);
    hemiLight.position.set(0, 5, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(4, 6, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x34d399, 1.6);
    rimLight.position.set(-5, 3, -4);
    scene.add(rimLight);

    const markerGeo = new THREE.RingGeometry(0.06, 0.095, 32);
    const markerMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    const activeMarker = new THREE.Mesh(markerGeo, markerMat);
    scene.add(activeMarker);

    let neonMaterial = null;
    let metalMaterial = null;
    const pivotGroup = new THREE.Group();
    scene.add(pivotGroup);
    modelRootRef.current = pivotGroup;

    const loader = new GLTFLoader();
    loader.load(
      '/model/scene.gltf',
      (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
          if (child.isMesh && child.material) {
            const mat = child.material;
            if (mat.name === 'DARK_GREY_MATTE') {
              mat.color.setRGB(0.11, 0.12, 0.14);
              mat.roughness = 0.45;
            } else if (mat.name === 'NEON_Green_Light') {
              mat.emissive = new THREE.Color(0x22c55e);
              mat.emissiveIntensity = 1.8;
              neonMaterial = mat;
            } else if (mat.name === 'Metal') {
              metalMaterial = mat;
            }
          }
        });

        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const normScale = 2.2 / maxDim;

        model.position.sub(center);
        pivotGroup.scale.setScalar(normScale);
        pivotGroup.add(model);
        setLoadStatus('ready');
      },
      undefined,
      (err) => {
        console.error('Error loading /model/scene.gltf:', err);
        setLoadStatus('error');
        setErrorMessage('Could not load /model/scene.gltf. Check your public/model folder structure.');
      }
    );

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handleCanvasClick = (event) => {
      if (!calibratingRef.current || !modelRootRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(modelRootRef.current.children, true);
      if (intersects.length > 0) {
        const hitPoint = intersects[0].point;
        const updated = hotspotsRef.current.map((h) =>
          h.id === selectedRef.current
            ? {
                ...h,
                pos: [
                  Number(hitPoint.x.toFixed(3)),
                  Number(hitPoint.y.toFixed(3)),
                  Number(hitPoint.z.toFixed(3))
                ]
              }
            : h
        );
        setHotspots(updated);
        try {
          localStorage.setItem('mx2s_3d_hotspots_v1', JSON.stringify(updated));
        } catch { /* storage unavailable — pin still applies for this session */ }
        setCalibratingPin(false);
      }
    };

    renderer.domElement.addEventListener('pointerdown', handleCanvasClick);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 640;
      const h = container.clientHeight || 420;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    let animId;
    const clock = new THREE.Clock();
    const tempVec = new THREE.Vector3();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Glide the camera around the model (about its centre) until it faces the
      // selected button. Rotating the *direction* keeps the camera outside the
      // mouse the whole way instead of cutting through it.
      const focus = focusRef.current;
      if (focus) {
        focusOffset.copy(camera.position).sub(controls.target);
        const curLen = focusOffset.length() || 1;
        focusOffset.divideScalar(curLen);
        if (focusOffset.angleTo(focus.dir) < 0.01 && Math.abs(curLen - focus.dist) < 0.02) {
          focusRef.current = null;
        } else {
          focusStepQ.setFromUnitVectors(focusOffset, focus.dir);
          focusPartialQ.slerpQuaternions(identityQ, focusStepQ, 0.14);
          focusOffset.applyQuaternion(focusPartialQ);
          const len = curLen + (focus.dist - curLen) * 0.14;
          camera.position.copy(controls.target).addScaledVector(focusOffset, len);
        }
      }

      controls.update();

      if (neonMaterial) {
        neonMaterial.emissiveIntensity = 1.4 + Math.sin(elapsed * 4) * 0.6;
      }

      if (metalMaterial) {
        const isWheelSelected =
          selectedRef.current === 'middle_click' ||
          selectedRef.current === 'thumb_left' ||
          selectedRef.current === 'thumb_right';
        metalMaterial.emissive = new THREE.Color(isWheelSelected ? 0x10b981 : 0x000000);
        metalMaterial.emissiveIntensity = isWheelSelected ? 0.35 + Math.sin(elapsed * 6) * 0.2 : 0;
      }

      const activeSpot = hotspotsRef.current.find((h) => h.id === selectedRef.current);
      if (activeSpot) {
        activeMarker.position.set(activeSpot.pos[0], activeSpot.pos[1], activeSpot.pos[2]);
        activeMarker.lookAt(camera.position);
        activeMarker.scale.setScalar(1 + Math.sin(elapsed * 5) * 0.18);
      }

      renderer.render(scene, camera);

      const cw = container.clientWidth || width;
      const ch = container.clientHeight || height;
      const nextPins = hotspotsRef.current.map((h) => {
        tempVec.set(h.pos[0], h.pos[1], h.pos[2]);
        tempVec.project(camera);
        return {
          ...h,
          x: (tempVec.x * 0.5 + 0.5) * cw,
          y: (-(tempVec.y * 0.5) + 0.5) * ch,
          visible: tempVec.z < 1
        };
      });
      setProjectedPins(nextPins);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handleCanvasClick);
      controls.removeEventListener('start', cancelFocus);
      focusRef.current = null;
      controls.dispose();
      renderer.dispose();
    };
  }, [renderSource]);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate && !calibratingPin;
    }
  }, [autoRotate, calibratingPin]);

  // When the selection changes (pin, quick-select button, action row, live
  // hardware press, or auto-tour), hold the view still and turn the camera so
  // the chosen button faces you. Local mode only: in Cloud Embed mode the
  // viewer is a separate page, and changing autoRotate would reload its iframe.
  useEffect(() => {
    if (prevSelectedRef.current === currentSelected) return;
    prevSelectedRef.current = currentSelected;
    if (renderSource !== 'local') return;

    setAutoRotate(false);

    const controls = controlsRef.current;
    const camera = cameraRef.current;
    const spot = hotspotsRef.current.find((h) => h.id === currentSelected);
    if (!controls || !camera || !spot) return;

    const dir = new THREE.Vector3(spot.pos[0], spot.pos[1], spot.pos[2]).sub(controls.target);
    if (dir.lengthSq() < 0.01) dir.set(0, 0.6, 1);
    dir.normalize();
    dir.y = THREE.MathUtils.clamp(dir.y, -0.15, 0.8); // avoid looking straight down/up the pole
    if (Math.hypot(dir.x, dir.z) < 0.05) dir.z = 0.4;
    dir.normalize();

    const dist = THREE.MathUtils.clamp(camera.position.distanceTo(controls.target), 2.4, 3.4);
    focusRef.current = { dir, dist };
  }, [currentSelected, renderSource]);

  return (
    <div className="w-full col-span-full max-w-none relative rounded-2xl bg-slate-900/90 border border-slate-800 p-4 shadow-xl text-slate-100">
      {/* Header & Source Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              Logitech MX Master 2S 3D Model
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
                glTF 2.0
              </span>
            </h3>
            <p className="text-xs text-slate-400">Drag to orbit 3D mouse • Click numbered pins to map buttons</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
        {renderSource === 'local' && (
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              aria-label="Auto-rotate"
              aria-pressed={autoRotate}
              title="Auto-rotate the model"
              onClick={() => setAutoRotate((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                autoRotate ? 'bg-slate-800 text-emerald-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Rotate3d className="w-3.5 h-3.5" />
              Rotate
            </button>
            <button
              type="button"
              aria-label="Place pin for selected input"
              aria-pressed={calibratingPin}
              title="Then click the spot on the model where the selected button is"
              onClick={() => setCalibratingPin((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                calibratingPin ? 'bg-amber-400 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              Place pin
            </button>
            <button
              type="button"
              aria-label="Reset pins"
              title="Restore the default pin positions"
              onClick={resetPins}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        )}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setRenderSource('local')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              renderSource === 'local'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            Local glTF
          </button>
          <button
            type="button"
            onClick={() => setRenderSource('sketchfab')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              renderSource === 'sketchfab'
                ? 'bg-cyan-500 text-slate-950 font-semibold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Cloud Embed
          </button>
        </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="relative w-full h-[400px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
        {renderSource === 'local' ? (
          <>
            <div
              ref={mountRef}
              className={`w-full h-full relative ${
                calibratingPin ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
              }`}
            />

            {loadStatus === 'loading' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm text-xs text-slate-300 gap-2 pointer-events-none">
                <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
                <span>Loading local 3D mouse model...</span>
              </div>
            )}

            {loadStatus === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center">
                <p className="text-sm font-semibold text-amber-400 mb-2">{errorMessage}</p>
                <button
                  type="button"
                  onClick={() => setRenderSource('sketchfab')}
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold"
                >
                  Switch to Cloud Embed
                </button>
              </div>
            )}

            {calibratingPin && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none px-3 py-1.5 rounded-full bg-amber-400 text-slate-950 text-xs font-semibold shadow-lg">
                Click the model where &ldquo;{hotspots.find((h) => h.id === currentSelected)?.label}&rdquo; is
              </div>
            )}

            {loadStatus === 'ready' && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {projectedPins.map((pin) => {
                  if (!pin.visible) return null;
                  const isSelected = currentSelected === pin.id;
                  return (
                    <button
                      key={pin.id}
                      type="button"
                      onClick={() => handleSelect(pin.id)}
                      style={{
                        transform: `translate3d(${pin.x}px, ${pin.y}px, 0) translate(-50%, -50%)`
                      }}
                      className={`pointer-events-auto absolute left-0 top-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 ring-4 ring-emerald-500/30 font-bold z-20 shadow-lg'
                          : 'bg-slate-900/90 text-slate-200 border border-slate-700 hover:border-emerald-400 z-10'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isSelected ? 'bg-slate-950 text-emerald-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {pin.shortNum}
                      </span>
                      <span className="whitespace-nowrap">{pin.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <iframe
            title="Logitech MX Master 2S Cloud Embed"
            src={`https://sketchfab.com/models/${DANISH_BLENDS_MX2S_UID}/embed?autostart=1&autospin=${
              autoRotate ? '0.2' : '0'
            }&ui_theme=dark&dnt=1`}
            className="w-full h-full border-0"
            allow="autoplay; fullscreen; xr-spatial-tracking"
            allowFullScreen
          />
        )}
      </div>

      {renderSource === 'sketchfab' && (
        <p className="mt-2 text-[11px] text-amber-300/90">
          Pins and button highlighting only work in Local glTF mode &mdash; the embedded Sketchfab
          viewer is a separate page this app can&apos;t draw on. Selecting an input still shows its
          action below.
        </p>
      )}

      {/* Quick-Select Button Bar */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
        {hotspots.map((spot) => {
          const isSelected = currentSelected === spot.id;
          return (
            <button
              key={spot.id}
              type="button"
              onClick={() => handleSelect(spot.id)}
              aria-pressed={isSelected}
              title={`Select ${spot.label}`}
              className={`px-2.5 py-2 rounded-lg text-left text-xs border transition ${
                isSelected
                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-semibold'
                  : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <div className="text-[10px] font-mono text-emerald-400">#{spot.shortNum}</div>
              <div className="truncate">{spot.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}