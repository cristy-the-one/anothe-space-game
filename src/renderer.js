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
      // Subtle green phosphor tint — preserves color identity, adds atmosphere
      float brightness = dot(col.rgb, vec3(0.299, 0.587, 0.114));
      col.rgb = mix(col.rgb, vec3(0.0, brightness * 1.2, 0.0), 0.25);
      col.rgb += vec3(0.0, 0.03, 0.0); // ambient green glow
      gl_FragColor = col;
    }`,
};

export function createRenderer(scene, camera) {
  const container = document.getElementById('canvas-container');
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(1); // crisp pixels
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.insertBefore(renderer.domElement, container.firstChild);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const pixelPass = new ShaderPass(PixelShader);
  pixelPass.uniforms.resolution.value.set(container.clientWidth, container.clientHeight);
  pixelPass.uniforms.pixelSize.value = 3.0;
  composer.addPass(pixelPass);

  const crtPass = new ShaderPass(CRTShader);
  crtPass.uniforms.resolution.value.set(container.clientWidth, container.clientHeight);
  composer.addPass(crtPass);

  // Handle resize
  window.addEventListener('resize', () => {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    pixelPass.uniforms.resolution.value.set(w, h);
    crtPass.uniforms.resolution.value.set(w, h);
  });

  return { renderer, composer, crtPass };
}
