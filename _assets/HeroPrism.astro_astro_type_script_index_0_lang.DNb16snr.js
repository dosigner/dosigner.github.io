import{W as he,S as ve,C as de,a as me,V as xe,b as W,M as ge,P as we}from"./three.module.CDXfJKMo.js";import{H as ye,L as be,B as Me}from"./heroOptics.Cfjzammf.js";const r=a=>a.toFixed(4),{focal:_,sources:E,sourceX:re,spectrum:z,loop:N,scroll:ie}=ye,Le=`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,Se=`
  precision highp float;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uOpacity;
  uniform float uWell;
  uniform float uResidual;
  uniform vec2 uTilt;
  uniform vec2 uProbe;
  uniform float uLocal;
  uniform float uSpread;
  uniform float uSwing;
  uniform vec3 uPulse;

  varying vec2 vUv;

  const vec2 FOCAL = vec2(${r(_.x)}, ${r(_.y)});
  const float SRC_X = ${r(re)};
  const float HALF = ${r(z.halfAngle)};
  const float RED_NM = ${r(z.redNm)};
  const float VIOLET_NM = ${r(z.violetNm)};

  const vec3 STAGE = vec3(0.0784, 0.0863, 0.1020); // --stage-bg #14161A
  const vec3 TAP   = vec3(0.9098, 0.9176, 0.9020); // --stage-ink #E8EAE6
  const vec3 HOT   = vec3(0.98, 0.82, 0.55);
  const vec3 RAY   = vec3(0.86, 0.85, 0.81);

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }

  // 4-layer sin-wave interference. Light gathers on the zero set of the
  // field, so caustic threads are thin and bright on a dark floor.
  float caustic(vec2 p, float t) {
    for (float i = 1.0; i < 5.0; i += 1.0) {
      p += vec2(
        sin(p.y * i * 2.55 + t * 0.16 + i * 0.65) * (0.22 / i),
        cos(p.x * i * 2.35 + t * 0.12 + i * 0.85) * (0.22 / i)
      );
    }
    return pow(1.0 - abs(sin(p.x * 3.45) * sin(p.y * 3.25)), 7.0);
  }

  // Wavelength (nm) to display RGB: three Gaussian lobes plus the short-
  // wavelength red return that makes violet read as violet, not blue.
  vec3 spectral(float l) {
    float r = exp(-pow((l - 615.0) / 55.0, 2.0)) + 0.30 * exp(-pow((l - 425.0) / 30.0, 2.0));
    float g = exp(-pow((l - 550.0) / 52.0, 2.0));
    float b = exp(-pow((l - 462.0) / 40.0, 2.0));
    return vec3(r, g, b);
  }

  // Fully developed speckle: |sum of 7 unit phasors|^2 / 7, mean 1.
  float speckle(vec2 q, float t) {
    vec2 acc = vec2(0.0);
    for (int i = 0; i < 7; i++) {
      float fi = float(i);
      float a = fi * 2.39996 + 0.35 * sin(t * 0.6 + fi * 1.3);
      vec2 k = vec2(cos(a), sin(a)) * (200.0 + 40.0 * fi);
      float ph = dot(k, q) + t * (1.6 + 0.45 * fi) + fi * 1.7;
      acc += vec2(cos(ph), sin(ph));
    }
    return dot(acc, acc) / 7.0;
  }

  // Gaussian input ray. Phase noise bends it off its centerline; the slow
  // wander is pinned to zero at the focus, where every ray must arrive.
  // loc is the local phase screen under the pointer, res the loop residual.
  vec3 inputRay(vec2 p, vec2 src, vec2 foc, float seed, float t, float loc, float res) {
    vec2 ab = foc - src;
    float len = length(ab);
    vec2 dir = ab / len;
    float s = dot(p - src, dir) / len;
    float d = dot(p - src, vec2(-dir.y, dir.x));
    if (s < -0.05 || s > 1.05 || abs(d) > 0.2) return vec3(0.0);

    float k = clamp(s, 0.0, 1.0);
    float pin = (1.0 - k) * sqrt(1.0 - k);
    float wander = (noise(vec2(s * 4.2 - t * 0.21, seed)) * 0.65
                  + noise(vec2(s * 9.1 - t * 0.37, seed + 17.0)) * 0.35
                  - 0.5) * 0.036 * pin * (1.0 + 1.6 * res);
    wander += (noise(vec2(s * 22.0 - t * 2.3, seed + 5.0)) - 0.5) * 0.13 * loc * (1.0 - k * k);

    float scint = 0.72 + 0.56 * noise(vec2(s * 2.6 + seed, t * 0.16 + seed * 3.1));
    float boil = noise(vec2(s * 30.0 + seed, t * 6.0));
    scint = mix(scint, scint * (0.25 + 1.5 * boil), clamp(loc + res * 0.6, 0.0, 1.0));

    float w = mix(0.0068, 0.0018, k * k) * (1.0 + 1.4 * loc + 0.8 * res);
    float e = d - wander;
    float core = exp(-(e * e) / (2.0 * w * w));
    float halo = exp(-abs(e) / (w * 5.5)) * 0.14 * smoothstep(0.2, 0.12, abs(e));
    float fluence = mix(0.22, 0.95, k * k * k);
    float span = smoothstep(-0.04, 0.05, s) * (1.0 - smoothstep(0.97, 1.01, s));
    return mix(RAY, HOT, k * k) * (core + halo) * fluence * scint * span / (1.0 + 1.4 * loc);
  }

  float fraunhofer(float lam, float nm, float depth, float fw) {
    float x = (lam - nm) / (fw * 1.3);
    return depth * exp(-x * x);
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / uResolution.y;
    vec2 p = vec2(uv.x * aspect, uv.y);
    float t = uTime;
    float res = uResidual;

    vec2 foc = vec2(FOCAL.x * aspect, FOCAL.y) + uTilt;
    vec2 q = p - foc;
    float r = length(q);

    // Local phase screen: pointer-stirred air plus the expanding click wavefront
    vec2 dp = p - uProbe;
    float loc = uLocal * exp(-dot(dp, dp) / (2.0 * 0.085 * 0.085));
    float ring = 0.0;
    vec2 ringDir = vec2(0.0);
    if (uPulse.z >= 0.0) {
      vec2 dq = p - uPulse.xy;
      float age = uPulse.z;
      float w = 0.014 + age * 0.03;
      float x = (length(dq) - age * 0.85) / w;
      ring = exp(-x * x) * exp(-age * 2.0);
      ringDir = normalize(dq + 1e-4);
    }
    loc = clamp(loc + ring * 0.8, 0.0, 1.0);

    // Breadboard: M6 tap holes on a 30px pitch, registered to the nominal
    // focus. The disturbed air refracts the table like heat haze.
    vec2 px = uv * uResolution;
    vec2 haze = vec2(
      noise(p * 18.0 + vec2(t * 1.7, 0.0)) - 0.5,
      noise(p * 18.0 + vec2(40.0, -t * 1.5)) - 0.5
    ) * 14.0 * loc + ringDir * ring * 8.0;
    vec2 g = (fract((px + haze - FOCAL * uResolution) / 30.0 + 0.5) - 0.5) * 30.0;
    float hole = 1.0 - smoothstep(1.05, 1.95, length(g));

    // Caption well: the hero card sits in the left column, vertically centred.
    float well = uWell
      * (1.0 - smoothstep(0.42, 0.58, uv.x))
      * smoothstep(0.14, 0.28, uv.y)
      * (1.0 - smoothstep(0.72, 0.86, uv.y));

    float S = exp(-pow(1.5708 * res, 2.0));
    vec3 light = vec3(0.0);

    float sx = SRC_X * aspect;
    vec3 rays = inputRay(p, vec2(sx, ${r(E[0])}), foc, 1.3, t, loc, res)
              + inputRay(p, vec2(sx, ${r(E[1])}), foc, 4.7, t, loc, res)
              + inputRay(p, vec2(sx, ${r(E[2])}), foc, 8.1, t, loc, res)
              + inputRay(p, vec2(sx, ${r(E[3])}), foc, 11.9, t, loc, res);
    light += rays * 0.75;

    // Exit spectrum: every direction in the fan carries one wavelength
    vec2 disp = p + vec2(
      fbm(p * 1.6 + vec2(t * 0.030, 0.0)) - 0.5,
      fbm(p * 1.6 + vec2(80.0, -t * 0.026)) - 0.5
    ) * 0.07;
    float c = caustic(disp * 6.0, t);

    float ang = atan(q.y, max(q.x, 1e-4));
    ang += (noise(vec2(r * 14.0 - t * 1.1, ang * 6.0)) - 0.5) * (0.06 * res + 0.12 * loc);
    float u = 0.5 - (ang - uSwing) / (uSpread * 2.0 * HALF);
    float inside = smoothstep(-0.02, 0.06, u) * (1.0 - smoothstep(0.94, 1.02, u));
    float lam = mix(RED_NM, VIOLET_NM, clamp(u, 0.0, 1.0));

    // Dark absorption lines turn the gradient into a read spectrum; depth
    // backs off where a line would be thinner than a pixel.
    float fw = max(fwidth(lam), 0.6);
    float lines = fraunhofer(lam, 656.0, 0.40, fw) + fraunhofer(lam, 589.0, 0.30, fw)
                + fraunhofer(lam, 527.0, 0.28, fw) + fraunhofer(lam, 486.0, 0.42, fw)
                + fraunhofer(lam, 431.0, 0.30, fw);
    lines = 1.0 - lines * smoothstep(0.08, 0.24, r) / (1.0 + fw * 0.6);

    // White where the colors still overlap at the exit, spectral once they part
    vec3 tint = mix(vec3(0.62, 0.60, 0.56), spectral(lam), smoothstep(0.015, 0.17, r));
    float energy = pow(0.06 / (r + 0.06), 0.55) / uSpread;
    float emerge = smoothstep(0.004, 0.05, r) * step(-0.02, q.x);
    float grainMix = clamp(res * 0.85 + loc * 0.6, 0.0, 1.0);
    float grain = grainMix > 0.001 ? mix(1.0, speckle(q * 1.6, t * 1.4), grainMix) : 1.0;
    vec3 fan = tint * inside * lines * energy * emerge * (0.72 + 0.55 * c) * grain;
    light += fan * 1.16 * mix(0.55, 1.0, S) * (1.0 + 0.25 * (uSpread - 1.0));

    // Focal core. Locked: Gaussian waist, Airy rings, bloom. Aberrated: the
    // energy leaves the core for a boiling speckle halo (Strehl drop).
    float xa = r * 115.0;
    float airy = xa > 0.001 ? sin(xa) / xa : 1.0;
    airy *= airy;
    float waist = exp(-(r * r) / (2.0 * 0.0042 * 0.0042));
    float bloom = exp(-r / 0.030) * 0.42 + exp(-r / 0.14) * 0.06;
    light += HOT * (bloom * mix(0.6, 1.0, S) + airy * 0.55 * S) + vec3(1.0, 0.96, 0.90) * waist * 1.5 * S;

    float R0 = 0.010 + 0.075 * res;
    float env = exp(-(r * r) / (2.0 * R0 * R0));
    if (res > 0.004 && env > 0.002) {
      light += HOT * env * speckle(q, t) * (1.0 - S) * 1.1 * (0.02 / R0);
    }

    // Bench spill: the table catches light near the focus; tap holes stay dark
    float right = smoothstep(-0.08, 0.22, q.x);
    float spill = exp(-r / 0.22) * 0.07 * (0.6 + 0.4 * right);
    light += HOT * spill * (1.0 - 0.85 * hole);
    light += vec3(0.80, 0.84, 0.88) * ring * 0.10;

    float vFade = smoothstep(0.0, 0.05, uv.y) * smoothstep(1.0, 0.95, uv.y);
    float vig = 1.0 - 0.35 * smoothstep(0.55, 1.35, length((uv - FOCAL) * vec2(aspect, 1.0)));
    light *= vFade * vig * (1.0 - 0.88 * well);

    vec3 col = mix(STAGE, TAP, (0.05 + 0.45 * ring) * hole * (1.0 - 0.5 * well));
    col += (1.0 - exp(-light * 1.15)) * (1.0 - col);
    col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;

    gl_FragColor = vec4(col, uOpacity);
  }
`,Re=(a,c,s)=>{const u=Math.min(1,Math.max(0,(s-a)/(c-a)));return u*u*(3-2*u)};function Ee(a,c,s,u,y,k){const o=y-s,p=k-u,b=Math.min(1,Math.max(0,((a-s)*o+(c-u)*p)/(o*o+p*p)));return Math.hypot(a-s-o*b,c-u-p*b)}function ke(a){const c=a.querySelector(".hero-prism-canvas");if(!c)return null;let s;try{s=new he({canvas:c,alpha:!0,antialias:!1,powerPreference:"low-power"})}catch{return a.classList.add("canvas-failed"),null}if(!s.getContext())return a.classList.add("canvas-failed"),null;const u=window.innerWidth<768?1.5:2;s.setPixelRatio(Math.min(window.devicePixelRatio,u)),s.setClearColor(0,0);const y=new ve,k=new de,o={uTime:{value:0},uResolution:{value:new W(1,1)},uOpacity:{value:0},uWell:{value:1},uResidual:{value:0},uTilt:{value:new W(0,0)},uProbe:{value:new W(-9,-9)},uLocal:{value:0},uSpread:{value:1},uSwing:{value:0},uPulse:{value:new xe(0,0,-1)}},p=new me({vertexShader:Le,fragmentShader:Se,uniforms:o,transparent:!0,depthWrite:!1,depthTest:!1}),b=new ge(new we(2,2),p);y.add(b);const M=window.matchMedia("(prefers-reduced-motion: reduce)").matches,ce=window.matchMedia("(pointer: coarse)").matches,m=a.closest("[data-prism-surface]")??a,ue=performance.now();let f=0,L=!1,T=!1,$=!1,B=0,l=0,x=0,A=0,S=0,g=0,w=0,h=1,P=0,C=0,V=0,q=-1,G=1,D=1,v={x:0,y:0,t:-1},O={tx:NaN,ty:NaN,spread:NaN};function Y(t){$=t,a.classList.toggle("is-live",t),a.dispatchEvent(new CustomEvent(be,{bubbles:!0,detail:t}))}function X(){o.uOpacity.value=1,o.uTime.value=3,s.render(y,k)}function H(){V=Math.min(1,Math.max(0,window.scrollY/G))}function U(){const t=a.getBoundingClientRect(),e=Math.max(1,t.width),n=Math.max(1,t.height);D=e/n,G=Math.max(1,t.bottom+window.scrollY),s.setSize(e,n,!1),o.uResolution.value.set(e,n);const i=Number(getComputedStyle(a).getPropertyValue("--prism-well").trim()||1);o.uWell.value=Number.isFinite(i)?i:1,H(),T&&X()}const j=new ResizeObserver(()=>U());j.observe(a),U();function J(t){const e=a.getBoundingClientRect();return{x:(t.clientX-e.left)/e.height,y:1-(t.clientY-e.top)/e.height}}function fe(t,e){const n=_.x*D+g,i=_.y+w,d=re*D;let R=Math.hypot(t-n,e-i);for(const F of E)R=Math.min(R,Ee(t,e,d,F,n,i));const I=t-n,ne=e-i;if(I>0){const F=Math.abs((Math.atan2(ne,I)-P)/h)-z.halfAngle;R=Math.min(R,F<=0?0:Math.hypot(I,ne)*Math.sin(Math.min(F*h,Math.PI/2)))}return R}function pe(){Math.abs(g-O.tx)<1e-5&&Math.abs(w-O.ty)<1e-5&&Math.abs(h-O.spread)<1e-4||(O={tx:g,ty:w,spread:h},a.dispatchEvent(new CustomEvent(Me,{bubbles:!0,detail:{tilt:{x:g,y:w},spread:h,swing:P}})))}function K(t){if(f=requestAnimationFrame(K),ce&&t-B<15)return;const e=Math.min(.1,(t-B)/1e3);if(B=t,l=(t-ue)/1e3,o.uTime.value=l,o.uOpacity.value=M?1:Math.min(1,l/1.2),!M){x=Math.min(1,x+A*N.drive*e),x*=Math.exp(-e/N.tau),A*=Math.exp(-e/.06),S*=Math.exp(-e/.4);const n=Math.max(x,1-Re(.35,2,l)),i=N.tiltAmp*n;g=i*(.62*Math.sin(l*2.3+.4)+.38*Math.sin(l*5.1+1.9)),w=i*(.58*Math.sin(l*2.9+2.2)+.42*Math.sin(l*4.3+.7)),C+=(V-C)*(1-Math.exp(-e/.12)),h=1+ie.spread*C,P=ie.swing*C;let d=q>=0?l-q:-1;d>2.2&&(q=-1,d=-1),o.uResidual.value=n,o.uTilt.value.set(g,w),o.uLocal.value=S,o.uSpread.value=h,o.uSwing.value=P,o.uPulse.value.z=d,pe()}s.render(y,k),$||Y(!0),M&&l>.1&&(X(),cancelAnimationFrame(f),f=0,L=!1,T=!0)}function Q(){L||T||(L=!0,f=requestAnimationFrame(K))}function Z(){L&&(L=!1,cancelAnimationFrame(f),f=0)}Q();const ee=new IntersectionObserver(t=>{t.forEach(e=>{e.isIntersecting?Q():Z()})},{threshold:0});ee.observe(a);function te(t){if(M||t.pointerType==="touch")return;const e=J(t),n=t.timeStamp/1e3;if(v.t>=0&&n-v.t<.2){const i=Math.min(8,Math.hypot(e.x-v.x,e.y-v.y)/Math.max(.004166666666666667,n-v.t)),d=Math.exp(-((fe(e.x,e.y)/N.reach)**2));A=Math.max(A,i*d),S=Math.max(S,Math.min(1,i*.35))}o.uProbe.value.set(e.x,e.y),v={x:e.x,y:e.y,t:n}}function ae(t){if(M||t.target?.closest("a, button"))return;const e=J(t);e.y<0||e.y>1||(q=l,x=Math.max(x,.95),S=1,o.uPulse.value.set(e.x,e.y,0),o.uProbe.value.set(e.x,e.y))}function oe(){v.t=-1}function se(t){t.preventDefault(),Z(),T=!0,Y(!1),a.classList.add("canvas-failed")}return m.addEventListener("pointermove",te,{passive:!0}),m.addEventListener("pointerdown",ae,{passive:!0}),m.addEventListener("pointerleave",oe),window.addEventListener("scroll",H,{passive:!0}),c.addEventListener("webglcontextlost",se),{cleanup(){f&&cancelAnimationFrame(f),j.disconnect(),ee.disconnect(),m.removeEventListener("pointermove",te),m.removeEventListener("pointerdown",ae),m.removeEventListener("pointerleave",oe),window.removeEventListener("scroll",H),c.removeEventListener("webglcontextlost",se),s.dispose(),p.dispose(),b.geometry.dispose()}}}function le(){document.querySelectorAll(".hero-prism").forEach(a=>{try{ke(a)}catch{a.classList.add("canvas-failed")}})}"requestIdleCallback"in window?window.requestIdleCallback(le,{timeout:200}):setTimeout(le,0);
