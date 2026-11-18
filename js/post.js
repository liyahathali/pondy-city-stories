// Post-processing + upscaler ("DLSS/FSR-style" for the browser).
// 1. The 3D scene renders into an HDR texture at a reduced resolution (render scale).
// 2. Bright parts are extracted at 1/4 resolution and blurred -> bloom (lamps, sun, headlights).
// 3. A final pass upscales with contrast-adaptive sharpening, adds bloom, filmic (ACES) tone mapping,
//    colour grading, vignette and a little grain, and writes sRGB to the screen.
import * as THREE from 'three';

const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const BRIGHT = `
uniform sampler2D tSrc; uniform vec2 texel; uniform float threshold; varying vec2 vUv;
void main(){
  vec3 c = texture2D(tSrc, vUv + texel*vec2(-1.0,-1.0)).rgb + texture2D(tSrc, vUv + texel*vec2(1.0,-1.0)).rgb
         + texture2D(tSrc, vUv + texel*vec2(-1.0, 1.0)).rgb + texture2D(tSrc, vUv + texel*vec2(1.0, 1.0)).rgb;
  c *= 0.25;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float k = smoothstep(threshold, threshold * 2.0, l);
  gl_FragColor = vec4(c * k, 1.0);
}`;

const BLUR = `
uniform sampler2D tSrc; uniform vec2 dir; varying vec2 vUv;
void main(){
  vec3 c = texture2D(tSrc, vUv).rgb * 0.227;
  c += texture2D(tSrc, vUv + dir * 1.385).rgb * 0.316; c += texture2D(tSrc, vUv - dir * 1.385).rgb * 0.316;
  c += texture2D(tSrc, vUv + dir * 3.231).rgb * 0.070; c += texture2D(tSrc, vUv - dir * 3.231).rgb * 0.070;
  gl_FragColor = vec4(c, 1.0);
}`;

const FINAL = `
uniform sampler2D tScene; uniform sampler2D tBloom; uniform vec2 texel; uniform float exposure; uniform float bloom;
uniform float sharpen; uniform float saturation; uniform float contrast; uniform vec3 tint; uniform float vignette; uniform float grain; uniform float time; uniform float effects;
varying vec2 vUv;
vec3 aces(vec3 x){ // ACES filmic approximation (Narkowicz)
  x *= 0.6; return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0);
}
vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + time) * 43758.5453); }
void main(){
  // contrast-adaptive sharpening while upscaling (5 taps)
  vec3 c = texture2D(tScene, vUv).rgb;
  vec3 n = texture2D(tScene, vUv + vec2(0.0, texel.y)).rgb, s = texture2D(tScene, vUv - vec2(0.0, texel.y)).rgb;
  vec3 e = texture2D(tScene, vUv + vec2(texel.x, 0.0)).rgb, w = texture2D(tScene, vUv - vec2(texel.x, 0.0)).rgb;
  vec3 mn = min(c, min(min(n, s), min(e, w))), mx = max(c, max(max(n, s), max(e, w)));
  vec3 amp = clamp(min(mn, 2.0 - mx) / max(mx, 1e-4), 0.0, 1.0);
  vec3 wgt = -sqrt(amp) * (sharpen * 0.2);
  vec3 col = max((c + (n + s + e + w) * wgt) / (1.0 + 4.0 * wgt), 0.0);
  if (effects > 0.5) col += texture2D(tBloom, vUv).rgb * bloom;
  col = aces(col * exposure);
  if (effects > 0.5) {
    float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(vec3(l), col, saturation);                       // saturation
    col = (col - 0.5) * contrast + 0.5;                         // contrast
    col *= tint;                                                // warm/cool grade
    vec2 d = vUv - 0.5; col *= 1.0 - dot(d, d) * vignette;     // vignette
  }
  col = toSRGB(clamp(col, 0.0, 1.0));
  col += (hash(vUv * 1000.0) - 0.5) * (effects > 0.5 ? grain : 1.0/255.0); // grain / dither
  gl_FragColor = vec4(col, 1.0);
}`;

export class Post {
  constructor(renderer) {
    this.renderer = renderer;
    this.scale = 1; this.effects = true; this.enabled = true;
    const opts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true };
    this.rtScene = new THREE.WebGLRenderTarget(4, 4, opts);
    this.rtA = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false });
    this.rtB = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false });
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.scene = new THREE.Scene(); this.scene.add(this.quad);
    const sm = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, toneMapped: false });
    this.mBright = sm(BRIGHT, { tSrc: { value: null }, texel: { value: new THREE.Vector2() }, threshold: { value: 0.9 } });
    this.mBlur = sm(BLUR, { tSrc: { value: null }, dir: { value: new THREE.Vector2() } });
    this.mFinal = sm(FINAL, {
      tScene: { value: null }, tBloom: { value: null }, texel: { value: new THREE.Vector2() }, exposure: { value: 1 }, bloom: { value: 0.55 },
      sharpen: { value: 0.6 }, saturation: { value: 1.12 }, contrast: { value: 1.06 }, tint: { value: new THREE.Vector3(1.02, 1.0, 0.97) },
      vignette: { value: 0.9 }, grain: { value: 0.025 }, time: { value: 0 }, effects: { value: 1 },
    });
  }

  setSize(w, h, pixelRatio) {
    const sw = Math.max(64, Math.round(w * pixelRatio * this.scale)), sh = Math.max(64, Math.round(h * pixelRatio * this.scale));
    this.rtScene.setSize(sw, sh);
    this.rtA.setSize(Math.max(16, sw >> 2), Math.max(16, sh >> 2)); this.rtB.setSize(Math.max(16, sw >> 2), Math.max(16, sh >> 2));
    this.mFinal.uniforms.texel.value.set(1 / sw, 1 / sh);
    this.mBright.uniforms.texel.value.set(1 / sw, 1 / sh);
  }

  pass(material, target) { this.quad.material = material; this.renderer.setRenderTarget(target); this.renderer.render(this.scene, this.cam); }

  render(scene, camera, time, grade) {
    const r = this.renderer;
    if (!this.enabled) { r.setRenderTarget(null); r.render(scene, camera); return; }
    const tm = r.toneMapping; r.toneMapping = THREE.NoToneMapping; // tone mapping happens in the final pass
    r.setRenderTarget(this.rtScene); r.render(scene, camera);
    const U = this.mFinal.uniforms;
    if (this.effects) {
      this.mBright.uniforms.tSrc.value = this.rtScene.texture; this.mBright.uniforms.threshold.value = grade.threshold / Math.max(0.05, r.toneMappingExposure * 1.55);
      this.pass(this.mBright, this.rtA);
      const tw = 1 / this.rtA.width, th = 1 / this.rtA.height;
      for (let i = 0; i < 2; i++) {
        this.mBlur.uniforms.tSrc.value = this.rtA.texture; this.mBlur.uniforms.dir.value.set(tw * (1 + i), 0); this.pass(this.mBlur, this.rtB);
        this.mBlur.uniforms.tSrc.value = this.rtB.texture; this.mBlur.uniforms.dir.value.set(0, th * (1 + i)); this.pass(this.mBlur, this.rtA);
      }
    }
    U.tScene.value = this.rtScene.texture; U.tBloom.value = this.rtA.texture;
    U.exposure.value = r.toneMappingExposure * 1.55; U.time.value = time % 100; U.effects.value = this.effects ? 1 : 0;
    U.bloom.value = grade.bloom; U.saturation.value = grade.saturation; U.tint.value.copy(grade.tint);
    U.sharpen.value = this.scale < 0.95 ? 0.75 : 0.35;
    this.pass(this.mFinal, null);
    r.toneMapping = tm;
  }
}
