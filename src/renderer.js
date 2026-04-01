import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

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
      vec2 uv = vUv - 0.5;
      float dist = dot(uv, uv);
      uv *= 1.0 + dist * 0.08;
      uv += 0.5;
      if(uv.x<0.0||uv.x>1.0||uv.y<0.0||uv.y>1.0){ gl_FragColor=vec4(0,0,0,1); return; }
      vec4 col = texture2D(tDiffuse, uv);
      float line = mod(floor(vUv.y * resolution.y), 2.0);
      col.rgb *= 0.85 + 0.15 * line;
      float brightness = dot(col.rgb, vec3(0.299, 0.587, 0.114));
      col.rgb = mix(col.rgb, vec3(0.0, brightness * 1.2, 0.0), 0.10);
      col.rgb += vec3(0.0, 0.03, 0.0);
      gl_FragColor = col;
    }`,
};

export function createRenderer(scene, camera) {
  const container = document.getElementById('canvas-container');
  const w = container.clientWidth, h = container.clientHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(1);
  renderer.setSize(w, h);
  container.insertBefore(renderer.domElement, container.firstChild);

  // CSS2D overlay for powerup labels
  const css2dRenderer = new CSS2DRenderer();
  css2dRenderer.setSize(w, h);
  css2dRenderer.domElement.style.position = 'absolute';
  css2dRenderer.domElement.style.top = '0';
  css2dRenderer.domElement.style.left = '0';
  css2dRenderer.domElement.style.pointerEvents = 'none';
  container.appendChild(css2dRenderer.domElement);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const pixelPass = new ShaderPass(PixelShader);
  pixelPass.uniforms.resolution.value.set(w, h);
  pixelPass.uniforms.pixelSize.value = 3.0;
  composer.addPass(pixelPass);

  // Bloom before CRT so it samples ungraded brightness
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.5, 0.3, 0.4);
  composer.addPass(bloomPass);

  const crtPass = new ShaderPass(CRTShader);
  crtPass.uniforms.resolution.value.set(w, h);
  composer.addPass(crtPass);

  window.addEventListener('resize', () => {
    const nw = container.clientWidth, nh = container.clientHeight;
    renderer.setSize(nw, nh);
    composer.setSize(nw, nh);
    css2dRenderer.setSize(nw, nh);
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    pixelPass.uniforms.resolution.value.set(nw, nh);
    crtPass.uniforms.resolution.value.set(nw, nh);
  });

  return { renderer, composer, crtPass, css2dRenderer };
}
