import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import * as THREE from "three";

// Ported from a Framer community component ("Infinite scroll" / HeroTunnel)
// into plain React + three.js — a scroll-driven 3D tunnel of image slabs
// on the floor/ceiling/walls, replacing the Framer-editor-only static/canvas
// detection with a straightforward "are we actually in a browser with
// WebGL" guard, since this only ever runs in the real site, never inside
// a Framer canvas. WebGL context creation is wrapped in try/catch so a
// headless prerender environment without GPU support degrades to simply
// not rendering the tunnel, rather than breaking the build.
export default function HeroTunnel({ images = [], className = "" }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const segmentsRef = useRef([]);
  const scrollPosRef = useRef(0);
  const [failed, setFailed] = useState(false);

  // Build-time prerendering runs in a headless, GPU-less Chromium — a real
  // WebGL context there is unreliable and its texture-loading network
  // traffic can stall the prerender script's networkidle0 wait outright
  // (see scripts/prerender.js). The tunnel is a purely interactive/visual
  // flourish with nothing worth capturing in a static snapshot anyway, so
  // it's skipped entirely rather than risk breaking the build.
  const isPrerendering = typeof window !== "undefined" && window.__CVC_PRERENDER__ === true;
  const imageUrls = !isPrerendering && images.length > 0 ? images : null;

  const TUNNEL_WIDTH = 24;
  const TUNNEL_HEIGHT = 16;
  const SEGMENT_DEPTH = 6;
  const NUM_SEGMENTS = 14;
  const FLOOR_COLS = 6;
  const WALL_ROWS = 4;
  const COL_WIDTH = TUNNEL_WIDTH / FLOOR_COLS;
  const ROW_HEIGHT = TUNNEL_HEIGHT / WALL_ROWS;

  useEffect(() => {
    if (!imageUrls || !canvasRef.current || !containerRef.current) return;

    const populateImages = (group, w, h, d, pool) => {
      const textureLoader = new THREE.TextureLoader();
      const cellMargin = 0.4;
      const addImg = (pos, rot, wd, ht) => {
        const url = pool[Math.floor(Math.random() * pool.length)];
        const geom = new THREE.PlaneGeometry(wd - cellMargin, ht - cellMargin);
        const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide });
        textureLoader.load(url, (tex) => {
          tex.minFilter = THREE.LinearFilter;
          mat.map = tex;
          mat.needsUpdate = true;
          gsap.to(mat, { opacity: 0.85, duration: 1 });
        });
        const m = new THREE.Mesh(geom, mat);
        m.position.copy(pos);
        m.rotation.copy(rot);
        m.name = "slab_image";
        group.add(m);
      };

      let lastFloorIdx = -999;
      for (let i = 0; i < FLOOR_COLS; i++) {
        if (i > lastFloorIdx + 1 && Math.random() > 0.8) {
          addImg(
            new THREE.Vector3(-w + i * COL_WIDTH + COL_WIDTH / 2, -h, -d / 2),
            new THREE.Euler(-Math.PI / 2, 0, 0),
            COL_WIDTH,
            d
          );
          lastFloorIdx = i;
        }
      }
      let lastCeilIdx = -999;
      for (let i = 0; i < FLOOR_COLS; i++) {
        if (i > lastCeilIdx + 1 && Math.random() > 0.88) {
          addImg(
            new THREE.Vector3(-w + i * COL_WIDTH + COL_WIDTH / 2, h, -d / 2),
            new THREE.Euler(Math.PI / 2, 0, 0),
            COL_WIDTH,
            d
          );
          lastCeilIdx = i;
        }
      }
      let lastLeftIdx = -999;
      for (let i = 0; i < WALL_ROWS; i++) {
        if (i > lastLeftIdx + 1 && Math.random() > 0.8) {
          addImg(
            new THREE.Vector3(-w, -h + i * ROW_HEIGHT + ROW_HEIGHT / 2, -d / 2),
            new THREE.Euler(0, Math.PI / 2, 0),
            d,
            ROW_HEIGHT
          );
          lastLeftIdx = i;
        }
      }
      let lastRightIdx = -999;
      for (let i = 0; i < WALL_ROWS; i++) {
        if (i > lastRightIdx + 1 && Math.random() > 0.8) {
          addImg(
            new THREE.Vector3(w, -h + i * ROW_HEIGHT + ROW_HEIGHT / 2, -d / 2),
            new THREE.Euler(0, -Math.PI / 2, 0),
            d,
            ROW_HEIGHT
          );
          lastRightIdx = i;
        }
      }
    };

    const clearSlabs = (segment) => {
      const toRemove = [];
      segment.traverse((c) => {
        if (c.name === "slab_image") toRemove.push(c);
      });
      toRemove.forEach((c) => {
        segment.remove(c);
        if (c instanceof THREE.Mesh) {
          c.geometry.dispose();
          if (c.material.map) c.material.map.dispose();
          c.material.dispose();
        }
      });
    };

    const createSegment = (zPos) => {
      const group = new THREE.Group();
      group.position.z = zPos;
      const w = TUNNEL_WIDTH / 2;
      const h = TUNNEL_HEIGHT / 2;
      const d = SEGMENT_DEPTH;
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.35 });
      const lineGeo = new THREE.BufferGeometry();
      const vertices = [];
      for (let i = 0; i <= FLOOR_COLS; i++) {
        const x = -w + i * COL_WIDTH;
        vertices.push(x, -h, 0, x, -h, -d);
        vertices.push(x, h, 0, x, h, -d);
      }
      for (let i = 1; i < WALL_ROWS; i++) {
        const y = -h + i * ROW_HEIGHT;
        vertices.push(-w, y, 0, -w, y, -d);
        vertices.push(w, y, 0, w, y, -d);
      }
      vertices.push(-w, -h, 0, w, -h, 0);
      vertices.push(-w, h, 0, w, h, 0);
      vertices.push(-w, -h, 0, -w, h, 0);
      vertices.push(w, -h, 0, w, h, 0);
      lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
      const lines = new THREE.LineSegments(lineGeo, lineMaterial);
      group.add(lines);
      populateImages(group, w, h, d, imageUrls);
      return group;
    };

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      setFailed(true);
      return;
    }

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x16181a, 0.035);
    sceneRef.current = scene;

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 1000);
    camera.position.set(0, 0, 0);
    cameraRef.current = camera;

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    const segments = [];
    for (let i = 0; i < NUM_SEGMENTS; i++) {
      const z = -i * SEGMENT_DEPTH;
      const segment = createSegment(z);
      scene.add(segment);
      segments.push(segment);
    }
    segmentsRef.current = segments;

    let frameId;
    let isVisible = false;

    const animate = () => {
      if (!isVisible) return;
      frameId = requestAnimationFrame(animate);
      if (!cameraRef.current || !sceneRef.current || !rendererRef.current) return;

      const targetZ = -scrollPosRef.current * 0.05;
      const currentZ = cameraRef.current.position.z;
      cameraRef.current.position.z += (targetZ - currentZ) * 0.1;

      const tunnelLength = NUM_SEGMENTS * SEGMENT_DEPTH;
      const camZ = cameraRef.current.position.z;
      segmentsRef.current.forEach((segment) => {
        if (segment.position.z > camZ + SEGMENT_DEPTH) {
          let minZ = 0;
          segmentsRef.current.forEach((s) => (minZ = Math.min(minZ, s.position.z)));
          segment.position.z = minZ - SEGMENT_DEPTH;
          clearSlabs(segment);
          populateImages(segment, TUNNEL_WIDTH / 2, TUNNEL_HEIGHT / 2, SEGMENT_DEPTH, imageUrls);
        }
        if (segment.position.z < camZ - tunnelLength - SEGMENT_DEPTH) {
          let maxZ = -999999;
          segmentsRef.current.forEach((s) => (maxZ = Math.max(maxZ, s.position.z)));
          segment.position.z = maxZ + SEGMENT_DEPTH;
          clearSlabs(segment);
          populateImages(segment, TUNNEL_WIDTH / 2, TUNNEL_HEIGHT / 2, SEGMENT_DEPTH, imageUrls);
        }
      });

      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) {
          cancelAnimationFrame(frameId);
          animate();
        } else {
          cancelAnimationFrame(frameId);
        }
      },
      { threshold: 0 }
    );
    observer.observe(containerRef.current);

    const onScroll = () => {
      scrollPosRef.current = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth || window.innerWidth;
      const h = containerRef.current.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(frameId);
      renderer.dispose();
    };
  }, [imageUrls]);

  if (!imageUrls || failed) return null;

  return (
    <div ref={containerRef} className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
