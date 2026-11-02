import{W as ne,S as ae,C as ie,V as R,b as re,a as oe,A as se,c as le,B as ce,d as F}from"./three.module.CDXfJKMo.js";const a={pool:4096,seed:19,density:42e-5,drift:54,hoverRate:3,tilt:25*Math.PI/180,distance:3,poleX:.62,limbMargin:.94,restAngle:.6,exposure:.04,magLimit:5},w={speed:260,width:30,spot:60,life:.9},C={slop:10,maxMs:500},Z=1/Math.sqrt(a.distance**2-1),ue=Math.sin(a.tilt)/(a.distance-Math.cos(a.tilt))/Z,fe=1/(a.distance-Math.sin(a.tilt));function ve(e,i){const t=e/i,o=a.limbMargin/Math.sqrt(1+t*t),c=Math.asin(Math.min(1,a.poleX*t*o/ue)),s=o*Z;return{tanHalfY:s,axis:new R(Math.sin(c)*Math.sin(a.tilt),Math.cos(c)*Math.sin(a.tilt),Math.cos(a.tilt)),pxPerTan:i/2/s}}function de(e,i,t,o){const c=Math.min(a.pool,1024),s=8,u=new R;let v=0;for(let d=0;d<s;d++){const r=d/s*Math.PI*2;for(let p=0;p<c;p++){u.fromArray(e,p*3).applyAxisAngle(i,r);const S=a.distance-u.z;Math.abs(u.y/S)<=t&&Math.abs(u.x/S)<=t*o&&v++}}return v/(c*s)}function pe(e){let i=e;return()=>{i=i+1831565813|0;let t=Math.imul(i^i>>>15,1|i);return t=t+Math.imul(t^t>>>7,61|t)^t,((t^t>>>14)>>>0)/4294967296}}function me(){const e=pe(a.seed),i=new Float32Array(a.pool*3),t=new Float32Array(a.pool),o=new Float32Array(a.pool),c=10**(.45*a.magLimit)-1;for(let u=0;u<a.pool;u++){const v=e()*2-1,d=e()*Math.PI*2,r=Math.sqrt(1-v*v);i.set([r*Math.cos(d),r*Math.sin(d),v],u*3);const p=Math.log10(1+e()*c)/.45;t[u]=10**(-.4*p),o[u]=e()<.06+.3*Math.sqrt(t[u])?1:0}const s=new ce;return s.setAttribute("position",new F(i,3)),s.setAttribute("aFlux",new F(t,1)),s.setAttribute("aAmber",new F(o,1)),{geometry:s,position:i}}const b=e=>e.toFixed(5),he=`
    uniform float uAngle;
    uniform float uTrail;
    uniform vec3 uAxis;
    uniform float uTanHalfY;
    uniform vec2 uViewport;
    uniform float uPixelRatio;
    uniform float uMaxPoint;
    uniform vec3 uPulse;
    uniform float uOpacity;

    attribute float aFlux;
    attribute float aAmber;

    varying vec2 vStreak;
    varying float vSize;
    varying float vSigma;
    varying float vPeak;
    varying vec3 vTint;

    const float DIST = ${b(a.distance)};
    const vec3 COOL = vec3(0.86, 0.91, 0.98);
    const vec3 AMBER = vec3(0.851, 0.557, 0.384); // --stage-amber #D98E62

    vec3 turn(vec3 p, float a) {
      float c = cos(a);
      float s = sin(a);
      return p * c + cross(uAxis, p) * s + uAxis * dot(uAxis, p) * (1.0 - c);
    }

    // css px from the frame centre, y up
    vec2 toScreen(vec3 q) {
      return q.xy / (DIST - q.z) / uTanHalfY * 0.5 * uViewport.y;
    }

    void main() {
      vec3 q = turn(position, uAngle);
      vec2 head = toScreen(q);
      vec2 tail = toScreen(turn(position, uAngle - uTrail));
      gl_Position = vec4((head + tail) / uViewport, 0.0, 1.0);

      float persp = (DIST - 1.0) / (DIST - q.z);
      float apparent = aFlux * persp * persp;
      float sigma = persp * (0.6 + 1.4 * pow(aFlux, 0.4));
      float peak = 1.6 * pow(apparent, 0.35);

      if (uPulse.z >= 0.0) {
        float d = length(head - uPulse.xy);
        float fromRing = (d - uPulse.z * ${b(w.speed)}) / ${b(w.width)};
        float fade = 1.0 - uPulse.z / ${b(w.life)};
        float ring = exp(-fromRing * fromRing) * fade * fade;
        float spot = exp(-d * d / ${b(w.spot*w.spot)}) * exp(-uPulse.z / 0.2);
        float w = max(ring, spot);
        peak *= 1.0 + 3.2 * w;
        sigma *= 1.0 + 0.4 * w;
      }

      vSigma = max(sigma * uPixelRatio, 0.7);
      vStreak = (head - tail) * uPixelRatio;
      vSize = min(length(vStreak) + 6.0 * vSigma + 2.0, uMaxPoint);
      vPeak = peak * uOpacity;
      vTint = mix(COOL, AMBER, aAmber);
      gl_PointSize = vSize;
    }
  `,ge=`
    precision highp float;

    varying vec2 vStreak;
    varying float vSize;
    varying float vSigma;
    varying float vPeak;
    varying vec3 vTint;

    void main() {
      vec2 local = (vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y) - 0.5) * vSize;
      vec2 fromTail = local + 0.5 * vStreak;
      float len2 = dot(vStreak, vStreak);
      float t = len2 > 1e-4 ? clamp(dot(fromTail, vStreak) / len2, 0.0, 1.0) : 1.0;
      vec2 off = fromTail - vStreak * t;
      float core = exp(-dot(off, off) / (2.0 * vSigma * vSigma));

      float len = sqrt(len2);
      float spread = sqrt(2.5 * vSigma / (2.5 * vSigma + len));
      float ramp = mix(1.0, mix(0.55, 1.0, t), clamp(len / (2.0 * vSigma), 0.0, 1.0));
      float light = vPeak * core * spread * ramp;
      if (light < 0.004) discard;

      vec3 color = mix(vTint, vec3(1.0), smoothstep(0.8, 1.6, light));
      float a = min(light, 1.0);
      gl_FragColor = vec4(color * a, a);
    }
  `;function xe(e){const i=e.querySelector(".contact-light-canvas");if(!i)return null;let t;try{t=new ne({canvas:i,alpha:!0,antialias:!1,powerPreference:"low-power"})}catch{return e.classList.add("canvas-failed"),null}const o=t.getContext();if(!o)return e.classList.add("canvas-failed"),null;const c=Math.min(window.devicePixelRatio,window.innerWidth<768?1.5:2);t.setPixelRatio(c),t.setClearColor(0,0);const s=new ae,u=new ie,{geometry:v,position:d}=me(),r={uAngle:{value:a.restAngle},uTrail:{value:0},uAxis:{value:new R(0,Math.sin(a.tilt),Math.cos(a.tilt))},uTanHalfY:{value:1},uViewport:{value:new re(1,1)},uPixelRatio:{value:c},uMaxPoint:{value:o.getParameter(o.ALIASED_POINT_SIZE_RANGE)[1]},uPulse:{value:new R(0,0,-1)},uOpacity:{value:0}},p=new oe({vertexShader:he,fragmentShader:ge,uniforms:r,transparent:!0,premultipliedAlpha:!0,blending:se,depthWrite:!1,depthTest:!1}),S=new le(v,p);S.frustumCulled=!1,s.add(S);const B=window.matchMedia("(prefers-reduced-motion: reduce)").matches,j=window.matchMedia("(pointer: coarse)").matches,J=window.matchMedia("(hover: hover) and (pointer: fine)");let z=0,I=a.restAngle,y=1,k=!1,T=0,L=-1,l=null,E=0,A=!1,O=!1,x=-1;function Y(){r.uAngle.value=a.restAngle,r.uTrail.value=0,r.uOpacity.value=1,r.uPulse.value.z=-1,t.render(s,u)}function _(n,m){const f=Math.max(1,n),h=Math.max(1,m),g=r.uViewport.value;if(g.x===f&&g.y===h)return;t.setSize(f,h,!1),g.set(f,h);const P=ve(f,h);r.uTanHalfY.value=P.tanHalfY,r.uAxis.value.copy(P.axis),z=a.drift/(fe*P.pxPerTan);const ee=de(d,P.axis,P.tanHalfY,f/h),te=Math.ceil(a.density*f*h/Math.max(ee,.05));v.setDrawRange(0,Math.min(a.pool,te)),B&&Y()}const D=new ResizeObserver(([n])=>{_(n.contentRect.width,n.contentRect.height)});D.observe(e),_(e.clientWidth,e.clientHeight);function H(n){if(E=requestAnimationFrame(H),j&&x>=0&&n-x<15)return;const m=x<0?0:Math.min(.05,(n-x)/1e3);x=n,T+=m;const f=k?a.hoverRate:1,h=f>y?.45:.9;y+=(f-y)*(1-Math.exp(-m/h)),I=(I+z*y*m)%(Math.PI*2);let g=L>=0?T-L:-1;g>w.life&&(L=-1,g=-1),r.uAngle.value=I,r.uTrail.value=z*y*a.exposure,r.uOpacity.value=Math.min(1,T/1.2),r.uPulse.value.z=g,t.render(s,u)}function Q(){A||O||(A=!0,x=-1,E=requestAnimationFrame(H))}function q(){A&&(A=!1,cancelAnimationFrame(E),E=0)}B&&(O=!0,Y());const V=new IntersectionObserver(n=>{n.forEach(m=>m.isIntersecting?Q():q())},{threshold:0});V.observe(e);function $(n){n.pointerType==="mouse"&&J.matches&&(k=!0)}function W(){k=!1,l=null}function X(n){!n.isPrimary||n.button!==0||(l={id:n.pointerId,x:n.clientX,y:n.clientY,t:n.timeStamp})}function G(n){!l||n.pointerId!==l.id||Math.hypot(n.clientX-l.x,n.clientY-l.y)>C.slop&&(l=null)}function N(n){if(!l||n.pointerId!==l.id)return;if(Math.hypot(n.clientX-l.x,n.clientY-l.y)<=C.slop&&n.timeStamp-l.t<=C.maxMs&&A){const f=e.getBoundingClientRect();r.uPulse.value.set(l.x-f.left-f.width/2,f.height/2-(l.y-f.top),0),L=T}l=null}function U(){l=null}function K(n){n.preventDefault(),q(),O=!0,e.classList.add("canvas-failed")}const M={passive:!0};return e.addEventListener("pointerenter",$,M),e.addEventListener("pointerleave",W,M),e.addEventListener("pointerdown",X,M),e.addEventListener("pointermove",G,M),e.addEventListener("pointerup",N,M),e.addEventListener("pointercancel",U,M),i.addEventListener("webglcontextlost",K),{cleanup(){q(),D.disconnect(),V.disconnect(),e.removeEventListener("pointerenter",$),e.removeEventListener("pointerleave",W),e.removeEventListener("pointerdown",X),e.removeEventListener("pointermove",G),e.removeEventListener("pointerup",N),e.removeEventListener("pointercancel",U),i.removeEventListener("webglcontextlost",K),t.dispose(),p.dispose(),v.dispose()}}}function Me(e){const i=e.parentElement,t=document.querySelector("[data-night-tail]");if(!i||!t)return;const o=()=>{const c=t.getBoundingClientRect().bottom-i.getBoundingClientRect().bottom;e.style.setProperty("--night-tail",`${Math.max(0,Math.floor(c))}px`)};new ResizeObserver(o).observe(t),o()}document.querySelectorAll(".contact-light").forEach(e=>{Me(e);let i=!1;const t=()=>{if(!i){i=!0;try{xe(e)}catch{e.classList.add("canvas-failed")}}};if(!("IntersectionObserver"in window)){t();return}const o=new IntersectionObserver(c=>{c.some(s=>s.isIntersecting)&&(t(),o.disconnect())},{rootMargin:"200px 0px"});o.observe(e)});
