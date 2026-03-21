import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// Pixelation shader — renders at low res then upscales
const PixelShader = {
  uniforms: { tDiffuse: { value: null }, resolution: { value: new THREE.Vector2() }, pixelSize: { value: 4.0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float pixelSize;
    varying vec2 vUv;
    void main(){
      vec2 dxy = pixelSize / resolution;
      vec2 coord = dxy * floor(vUv / dxy);
      gl_FragColor = texture2D(tDiffuse, coord);
    }`,
};

// Scanline + CRT + green tint shader
const CRTShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0.0 },
    resolution: { value: new THREE.Vector2() },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform vec2 resolution;
    varying vec2 vUv;
    void main(){
      // Barrel warp
      vec2 uv = vUv - 0.5;
      float dist = dot(uv, uv);
      uv *= 1.0 + dist * 0.08;
      uv += 0.5;
      if(uv.x<0.0||uv.x>1.0||uv.y<0.0||uv.y>1.0){ gl_FragColor=vec4(0,0,0,1); return; }
      vec4 col = texture2D(tDiffuse, uv);
      // Scanlines
      float line = mod(floor(vUv.y * resolution.y), 2.0);
      col.rgb *= 0.85 + 0.15 * line;
      // Green phosphor tint
      col.rgb = vec3(col.r * 0.2 + col.g * 0.1, col.g * 0.9 + col.r * 0.3, col.b * 0.2);
      col.rgb += vec3(0.0, 0.05, 0.0); // ambient green glow
      gl_FragColor = col;
    }`,
};

export function createRenderer(scene, camera) {
  const container = document.getElementById('canvas-container');
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(1); // crisp pixels
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.autoClear = false;
  container.insertBefore(renderer.domElement, container.firstChild);

  const composerLayer0 = new EffectComposer(renderer);
  const renderPass0 = new RenderPass(scene, camera);
  composerLayer0.addPass(renderPass0);

  const pixelPass0 = new ShaderPass(PixelShader);
  pixelPass0.uniforms.resolution.value.set(container.clientWidth, container.clientHeight);
  pixelPass0.uniforms.pixelSize.value = 3.0;
  composerLayer0.addPass(pixelPass0);

  const crtPass = new ShaderPass(CRTShader);
  crtPass.uniforms.resolution.value.set(container.clientWidth, container.clientHeight);
  composerLayer0.addPass(crtPass);

  // composerLayer1: pixel only, no CRT, renders on top without clearing
  const composerLayer1 = new EffectComposer(renderer);
  const renderPass1 = new RenderPass(scene, camera);
  renderPass1.clear = false;
  composerLayer1.addPass(renderPass1);

  const pixelPass1 = new ShaderPass(PixelShader);
  pixelPass1.uniforms.resolution.value.set(container.clientWidth, container.clientHeight);
  pixelPass1.uniforms.pixelSize.value = 3.0;
  composerLayer1.addPass(pixelPass1);

  // Handle resize
  window.addEventListener('resize', () => {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h);
    composerLayer0.setSize(w, h);
    composerLayer1.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    pixelPass0.uniforms.resolution.value.set(w, h);
    pixelPass1.uniforms.resolution.value.set(w, h);
    crtPass.uniforms.resolution.value.set(w, h);
  });

  return { renderer, composerLayer0, composerLayer1, crtPass };
}
