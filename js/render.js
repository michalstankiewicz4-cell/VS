import * as THREE from '../vendor/three.module.js';

const VERT = `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;

const FRAG = `precision highp float;
uniform sampler2D tColor,tDepth;
uniform vec2 texel;
uniform float levels,dither,edge,bright;
varying vec2 vUv;
float bayer(vec2 p){
  p=floor(mod(p,4.));
  float v2=mod(2.*mod(p.x,2.)+3.*mod(p.y,2.),4.);
  float v1=mod(2.*floor(p.x/2.)+3.*floor(p.y/2.),4.);
  return (v2*4.+v1)/16.;
}
void main(){
  vec2 uv=(floor(vUv/texel)+.5)*texel;
  vec3 c=texture2D(tColor,uv).rgb*bright;
  float d=texture2D(tDepth,uv).r;
  float e=0.;
  e=max(e,abs(d-texture2D(tDepth,uv+vec2(texel.x,0.)).r));
  e=max(e,abs(d-texture2D(tDepth,uv-vec2(texel.x,0.)).r));
  e=max(e,abs(d-texture2D(tDepth,uv+vec2(0.,texel.y)).r));
  e=max(e,abs(d-texture2D(tDepth,uv-vec2(0.,texel.y)).r));
  float em=smoothstep(.004,.009,e);
  c=pow(clamp(c,0.,1.),vec3(1./2.2));
  float b=bayer(floor(vUv/texel));
  c=clamp(floor(c*levels+b*dither)/levels,0.,1.);
  c*=1.-em*edge*.6;
  float v=length(vUv-.5);
  c*=1.-smoothstep(.3,.85,v)*.55;
  gl_FragColor=vec4(c,1.);
}`;

export class PixelPipeline {
  constructor(renderer) {
    this.r = renderer;
    this.params = { pixelH: 200, levels: 7, dither: 0.8, edge: 0.8, bright: 1.4 };
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tColor: { value: null }, tDepth: { value: null },
        texel: { value: new THREE.Vector2(1, 1) },
        levels: { value: 7 }, dither: { value: 0.8 }, edge: { value: 0.8 }, bright: { value: 1.4 }
      }
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    quad.frustumCulled = false;
    this.postScene = new THREE.Scene();
    this.postScene.add(quad);
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.rt = null;
    this.resize(innerWidth, innerHeight);
  }

  resize(w, h) {
    const ph = Math.round(this.params.pixelH);
    const pw = Math.max(2, Math.round(ph * w / h));
    if (this.rt) { this.rt.dispose(); this.rt.depthTexture.dispose(); }
    const depth = new THREE.DepthTexture(pw, ph);
    depth.minFilter = depth.magFilter = THREE.NearestFilter;
    this.rt = new THREE.WebGLRenderTarget(pw, ph, {
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
      depthBuffer: true, depthTexture: depth
    });
    this.mat.uniforms.tColor.value = this.rt.texture;
    this.mat.uniforms.tDepth.value = depth;
    this.mat.uniforms.texel.value.set(1 / pw, 1 / ph);
  }

  render(scene, camera) {
    const u = this.mat.uniforms, p = this.params;
    u.levels.value = p.levels; u.dither.value = p.dither; u.edge.value = p.edge; u.bright.value = p.bright;
    this.r.setRenderTarget(this.rt);
    this.r.render(scene, camera);
    this.r.setRenderTarget(null);
    this.r.render(this.postScene, this.postCam);
  }
}
