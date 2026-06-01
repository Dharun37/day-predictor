import React, { useRef, useEffect, useState } from 'react';
import {
  Vector2,
  Scene,
  OrthographicCamera,
  WebGLRenderer,
  Color,
  Vector3,
  ShaderMaterial,
  PlaneGeometry,
  Mesh
} from 'three';
import './LightPillar.css';

const LightPillar = ({
  topColor = '#5227FF',
  bottomColor = '#FF9FFC',
  intensity = 1.0,
  rotationSpeed = 0.3,
  interactive = false,
  className = '',
  glowAmount = 0.002,
  pillarWidth = 3.0,
  pillarHeight = 0.4,
  noiseIntensity = 0.5,
  mixBlendMode = 'screen',
  pillarRotation = 0,
  quality = 'adaptive', // Defaults to adaptive for optimal UX
  onFpsUpdate = null,
  onQualityChange = null
}) => {
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const rendererRef = useRef(null);
  const materialRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const geometryRef = useRef(null);
  const mouseRef = useRef(new Vector2(0, 0));
  const timeRef = useRef(0);
  const rotationSpeedRef = useRef(rotationSpeed);
  const [webGLSupported, setWebGLSupported] = useState(true);

  // Synchronize dynamic quality prop and other inputs via refs to prevent WebGL teardowns
  const qualityRef = useRef(quality);
  const onFpsUpdateRef = useRef(onFpsUpdate);
  const onQualityChangeRef = useRef(onQualityChange);

  useEffect(() => {
    qualityRef.current = quality;
    onFpsUpdateRef.current = onFpsUpdate;
    onQualityChangeRef.current = onQualityChange;
  }, [quality, onFpsUpdate, onQualityChange]);

  // Initial WebGL Support Check
  useEffect(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      setWebGLSupported(false);
    }
  }, []);

  const isEco = quality === 'eco';

  useEffect(() => {
    if (!containerRef.current || !webGLSupported || isEco) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new Scene();
    sceneRef.current = scene;
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    cameraRef.current = camera;

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isLowEndDevice = isMobile || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);

    // Optimized Quality Tiers
    const qualitySettings = {
      low: { iterations: 20, waveIterations: 1, pixelRatio: 0.5, precision: 'mediump', stepMultiplier: 1.6 },
      medium: { iterations: 40, waveIterations: 2, pixelRatio: 0.75, precision: 'mediump', stepMultiplier: 1.25 },
      high: {
        iterations: 80,
        waveIterations: 4,
        pixelRatio: Math.min(window.devicePixelRatio, 1.5), // Cap at 1.5 for retina screens to save 56% fillrate
        precision: 'highp',
        stepMultiplier: 1.0
      }
    };

    // Determine initial quality setting
    let currentQualityName = qualityRef.current;
    if (currentQualityName === 'adaptive' || currentQualityName === 'eco') {
      currentQualityName = isLowEndDevice ? 'medium' : 'high';
    }
    let settings = qualitySettings[currentQualityName] || qualitySettings.medium;

    let renderer;
    try {
      renderer = new WebGLRenderer({
        antialias: false,
        alpha: true,
        powerPreference: isLowEndDevice ? 'low-power' : 'high-performance',
        precision: settings.precision,
        stencil: false,
        depth: false
      });
    } catch (error) {
      setWebGLSupported(false);
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(settings.pixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const parseColor = hex => {
      const color = new Color(hex);
      return new Vector3(color.r, color.g, color.b);
    };

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    // Over-engineered highly parallel Raymarched Shader
    const fragmentShader = `
      precision ${settings.precision} float;

      uniform float uTime;
      uniform vec2 uResolution;
      uniform vec2 uMouse;
      uniform vec3 uTopColor;
      uniform vec3 uBottomColor;
      uniform float uIntensity;
      uniform bool uInteractive;
      uniform float uGlowAmount;
      uniform float uPillarWidth;
      uniform float uPillarHeight;
      uniform float uNoiseIntensity;
      uniform float uRotCos;
      uniform float uRotSin;
      uniform float uPillarRotCos;
      uniform float uPillarRotSin;
      uniform float uWaveSin;
      uniform float uWaveCos;
      
      // Dynamic Loop Bounds Uniforms
      uniform float uMaxIterations;
      uniform float uWaveIterations;
      uniform float uStepMultiplier;
      
      varying vec2 vUv;

      void main() {
        vec2 uv = (vUv * 2.0 - 1.0) * vec2(uResolution.x / uResolution.y, 1.0);
        uv = vec2(uPillarRotCos * uv.x - uPillarRotSin * uv.y, uPillarRotSin * uv.x + uPillarRotCos * uv.y);

        vec3 ro = vec3(0.0, 0.0, -10.0);
        vec3 rd = normalize(vec3(uv, 1.0));

        float rotC = uRotCos;
        float rotS = uRotSin;
        if(uInteractive && (uMouse.x != 0.0 || uMouse.y != 0.0)) {
          float a = uMouse.x * 6.283185;
          rotC = cos(a);
          rotS = sin(a);
        }

        vec3 col = vec3(0.0);
        float t = 0.1;
        
        for(int i = 0; i < 80; i++) {
          if (float(i) >= uMaxIterations) break;
          
          vec3 p = ro + rd * t;
          p.xz = vec2(rotC * p.x - rotS * p.z, rotS * p.x + rotC * p.z);

          vec3 q = p;
          q.y = p.y * uPillarHeight + uTime;
          
          float freq = 1.0;
          float amp = 1.0;
          for(int j = 0; j < 4; j++) {
            if (float(j) >= uWaveIterations) break;
            q.xz = vec2(uWaveCos * q.x - uWaveSin * q.z, uWaveSin * q.x + uWaveCos * q.z);
            q += cos(q.zxy * freq - uTime * float(j) * 2.0) * amp;
            freq *= 2.0;
            amp *= 0.5;
          }
          
          float d = length(cos(q.xz)) - 0.2;
          float bound = length(p.xz) - uPillarWidth;
          float k = 4.0;
          float h = max(k - abs(d - bound), 0.0);
          d = max(d, bound) + h * h * 0.0625 / k;
          d = abs(d) * 0.15 + 0.01;

          float grad = clamp((15.0 - p.y) / 30.0, 0.0, 1.0);
          col += mix(uBottomColor, uTopColor, grad) / d;

          t += d * uStepMultiplier;
          if(t > 50.0) break;
        }

        float widthNorm = uPillarWidth / 3.0;
        col = tanh(col * uGlowAmount / widthNorm);
        col -= fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) / 15.0 * uNoiseIntensity;
        
        gl_FragColor = vec4(col * uIntensity, 1.0);
      }
    `;

    const pillarRotRad = (pillarRotation * Math.PI) / 180;
    const waveSin = Math.sin(0.4);
    const waveCos = Math.cos(0.4);

    const material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new Vector2(width, height) },
        uMouse: { value: mouseRef.current },
        uTopColor: { value: parseColor(topColor) },
        uBottomColor: { value: parseColor(bottomColor) },
        uIntensity: { value: intensity },
        uInteractive: { value: interactive },
        uGlowAmount: { value: glowAmount },
        uPillarWidth: { value: pillarWidth },
        uPillarHeight: { value: pillarHeight },
        uNoiseIntensity: { value: noiseIntensity },
        uRotCos: { value: 1.0 },
        uRotSin: { value: 0.0 },
        uPillarRotCos: { value: Math.cos(pillarRotRad) },
        uPillarRotSin: { value: Math.sin(pillarRotRad) },
        uWaveSin: { value: waveSin },
        uWaveCos: { value: waveCos },
        uMaxIterations: { value: settings.iterations },
        uWaveIterations: { value: settings.waveIterations },
        uStepMultiplier: { value: settings.stepMultiplier }
      },
      transparent: true,
      depthWrite: false,
      depthTest: false
    });
    materialRef.current = material;

    const geometry = new PlaneGeometry(2, 2);
    geometryRef.current = geometry;
    const mesh = new Mesh(geometry, material);
    scene.add(mesh);

    // Apply Quality Settings Dynamically
    const applyQualitySettings = (qName) => {
      const s = qualitySettings[qName];
      if (!s) return;
      settings = s;

      if (rendererRef.current) {
        rendererRef.current.setPixelRatio(s.pixelRatio);
        const rect = container.getBoundingClientRect();
        rendererRef.current.setSize(rect.width, rect.height);
      }

      if (materialRef.current) {
        materialRef.current.uniforms.uMaxIterations.value = s.iterations;
        materialRef.current.uniforms.uWaveIterations.value = s.waveIterations;
        materialRef.current.uniforms.uStepMultiplier.value = s.stepMultiplier;
      }

      if (onQualityChangeRef.current) {
        onQualityChangeRef.current(qName);
      }
    };

    // Initialize with selected quality settings
    applyQualitySettings(currentQualityName);

    let mouseMoveTimeout = null;
    const handleMouseMove = event => {
      if (!interactive) return;
      if (mouseMoveTimeout) return;
      mouseMoveTimeout = window.setTimeout(() => {
        mouseMoveTimeout = null;
      }, 16);
      const rect = container.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      mouseRef.current.set(x, y);
    };

    if (interactive) {
      container.addEventListener('mousemove', handleMouseMove, { passive: true });
    }

    // Page Visibility and Scroll throttling
    let isTabVisible = true;
    const handleVisibility = () => {
      isTabVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);

    let lastTime = performance.now();
    let frameCount = 0;
    let fpsCheckStart = lastTime;
    let lastQuality = qualityRef.current;

    // Rolling frame-times for noise reduction
    const frameTimes = [];
    const maxFrameTimesWindow = 30;

    const animate = currentTime => {
      if (!materialRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) return;

      if (!isTabVisible) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      // Check external Quality Setting changes
      const targetQuality = qualityRef.current;
      if (targetQuality !== 'adaptive' && targetQuality !== 'eco' && targetQuality !== lastQuality) {
        applyQualitySettings(targetQuality);
        lastQuality = targetQuality;
      } else if (targetQuality === 'adaptive' && lastQuality !== 'adaptive') {
        applyQualitySettings(isLowEndDevice ? 'medium' : 'high');
        lastQuality = 'adaptive';
      }

      const deltaTime = currentTime - lastTime;
      const targetFPS = currentQualityName === 'low' ? 30 : 60;
      const frameTimeLimit = 1000 / targetFPS;

      if (deltaTime >= frameTimeLimit) {
        timeRef.current += 0.016 * rotationSpeedRef.current;
        const t = timeRef.current;
        materialRef.current.uniforms.uTime.value = t;
        materialRef.current.uniforms.uRotCos.value = Math.cos(t * 0.3);
        materialRef.current.uniforms.uRotSin.value = Math.sin(t * 0.3);
        
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        
        // Track frame delta times for adaptive scaling
        frameTimes.push(deltaTime);
        if (frameTimes.length > maxFrameTimesWindow) {
          frameTimes.shift();
        }

        lastTime = currentTime - (deltaTime % frameTimeLimit);
      }

      // FPS Monitoring & Dynamic Adaptive Scaling
      frameCount++;
      const timeSinceCheck = currentTime - fpsCheckStart;
      if (timeSinceCheck >= 1000) {
        const measuredFPS = (frameCount * 1000) / timeSinceCheck;
        
        if (onFpsUpdateRef.current) {
          onFpsUpdateRef.current(Math.round(measuredFPS), currentQualityName);
        }

        // Adaptive performance scaling algorithm
        if (qualityRef.current === 'adaptive') {
          const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
          
          if (avgFrameTime > 25 && currentQualityName !== 'low') { // average frame takes > 25ms (~ < 40 FPS)
            const nextQuality = currentQualityName === 'high' ? 'medium' : 'low';
            applyQualitySettings(nextQuality);
            currentQualityName = nextQuality;
            frameTimes.length = 0; // reset buffer
          } else if (avgFrameTime < 16 && currentQualityName !== 'high') { // average frame is fast (< 16ms, solid 60fps)
            const nextQuality = currentQualityName === 'low' ? 'medium' : 'high';
            applyQualitySettings(nextQuality);
            currentQualityName = nextQuality;
            frameTimes.length = 0; // reset buffer
          }
        }

        frameCount = 0;
        fpsCheckStart = currentTime;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    // Resizing with Debounce
    let resizeTimeout = null;
    const handleResize = () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }

      resizeTimeout = window.setTimeout(() => {
        if (!rendererRef.current || !materialRef.current || !containerRef.current) return;
        const newWidth = containerRef.current.clientWidth;
        const newHeight = containerRef.current.clientHeight;
        rendererRef.current.setSize(newWidth, newHeight);
        materialRef.current.uniforms.uResolution.value.set(newWidth, newHeight);
      }, 150);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    // Cleanup WebGL Context
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (interactive) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current.forceContextLoss();
        if (container.contains(rendererRef.current.domElement)) {
          container.removeChild(rendererRef.current.domElement);
        }
      }
      if (materialRef.current) materialRef.current.dispose();
      if (geometryRef.current) geometryRef.current.dispose();

      rendererRef.current = null;
      materialRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      geometryRef.current = null;
      rafRef.current = null;
    };
  }, [webGLSupported, isEco]);

  useEffect(() => {
    rotationSpeedRef.current = rotationSpeed;
  }, [rotationSpeed]);

  useEffect(() => {
    if (!materialRef.current) return;
    const parseColor = hex => {
      const color = new Color(hex);
      return new Vector3(color.r, color.g, color.b);
    };
    materialRef.current.uniforms.uTopColor.value = parseColor(topColor);
  }, [topColor]);

  useEffect(() => {
    if (!materialRef.current) return;
    const parseColor = hex => {
      const color = new Color(hex);
      return new Vector3(color.r, color.g, color.b);
    };
    materialRef.current.uniforms.uBottomColor.value = parseColor(bottomColor);
  }, [bottomColor]);

  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uIntensity.value = intensity;
  }, [intensity]);

  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uInteractive.value = interactive;
  }, [interactive]);

  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uGlowAmount.value = glowAmount;
  }, [glowAmount]);

  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uPillarWidth.value = pillarWidth;
  }, [pillarWidth]);

  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uPillarHeight.value = pillarHeight;
  }, [pillarHeight]);

  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uNoiseIntensity.value = noiseIntensity;
  }, [noiseIntensity]);

  useEffect(() => {
    if (!materialRef.current) return;
    const pillarRotRad = (pillarRotation * Math.PI) / 180;
    materialRef.current.uniforms.uPillarRotCos.value = Math.cos(pillarRotRad);
    materialRef.current.uniforms.uPillarRotSin.value = Math.sin(pillarRotRad);
  }, [pillarRotation]);

  // Zero-GPU fallback for Eco mode or WebGL missing systems
  if (isEco || !webGLSupported) {
    return (
      <div 
        className={`light-pillar-fallback ${className}`} 
        style={{ 
          mixBlendMode,
          background: `radial-gradient(ellipse at center, ${bottomColor} 0%, ${topColor} 100%)`,
          opacity: 0.12,
          filter: 'blur(50px)',
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          animation: 'pulse-glow-eco 8s ease-in-out infinite alternate'
        }}
      />
    );
  }

  return <div ref={containerRef} className={`light-pillar-container ${className}`} style={{ mixBlendMode }} />;
};

export default React.memo(LightPillar);
