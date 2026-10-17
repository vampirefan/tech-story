import * as THREE from 'three'

const ATMO_VERT = /* glsl */`
varying vec3 vN;
varying vec3 vWN;
varying vec3 vWP;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWP = wp.xyz;
  vWN = normalize(mat3(modelMatrix) * normal);
  vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

const ATMO_FRAG = /* glsl */`
uniform vec3 uColor;
uniform vec3 uColorWarm;
uniform vec3 uSunDir;
uniform float uStrength;
uniform float uPower;
uniform float uScale;
varying vec3 vN;
varying vec3 vWN;
varying vec3 vWP;
void main() {
  vec3 V = normalize(cameraPosition - vWP);
  vec3 L = normalize(uSunDir);
  vec3 N = normalize(vWN);
  // BackSide：可见环带内 -dot(N,V) 从 0（外壳轮廓）升到最大值（紧贴行星轮廓）
  float d = -dot(N, V);
  float i = pow(clamp(d * uScale, 0.0, 1.0), uPower);
  float sun = dot(N, L);
  float day = smoothstep(-0.35, 0.30, sun);
  float term = exp(-pow(sun / 0.30, 2.0));
  vec3 col = mix(uColor * 0.34, uColor, day);
  col = mix(col, uColorWarm, term * 0.55);
  float a = i * uStrength * (0.10 + 0.95 * day + 0.55 * term);
  if (a < 0.002) discard;
  gl_FragColor = vec4(col * a, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

export interface AtmosphereHandle {
  mesh: THREE.Mesh
  uniforms: {
    uColor: { value: THREE.Color }
    uColorWarm: { value: THREE.Color }
    uSunDir: { value: THREE.Vector3 }
    uStrength: { value: number }
  }
}

/** 外层菲涅尔大气壳：背面渲染 + 加法混合，形成行星轮廓外的蓝色光环 */
export function createAtmosphere(radius: number, sunDir: { value: THREE.Vector3 }): AtmosphereHandle {
  const uniforms = {
    uColor: { value: new THREE.Color('#3f9dff') },
    uColorWarm: { value: new THREE.Color('#ff9d55') },
    uSunDir: sunDir,
    uStrength: { value: 0.85 },
    uPower: { value: 1.55 },
    uScale: { value: 1.92 }
  }
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: ATMO_VERT,
    fragmentShader: ATMO_FRAG,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    depthTest: true
  })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.22, 96, 64), mat)
  mesh.renderOrder = 5
  return { mesh, uniforms }
}

const SKY_VERT = /* glsl */`
attribute float aSize;
attribute float aPhase;
uniform float uTime;
uniform float uPixelRatio;
varying float vTw;
varying float vSize;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 0.62 + 0.38 * sin(uTime * 1.6 + aPhase * 6.2831);
  vTw = tw;
  vSize = aSize;
  gl_PointSize = aSize * uPixelRatio * (260.0 / max(-mv.z, 1.0)) * tw;
}
`

const SKY_FRAG = /* glsl */`
uniform vec3 uColorA;
uniform vec3 uColorB;
varying float vTw;
varying float vSize;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d);
  if (r > 0.5) discard;
  float core = smoothstep(0.5, 0.0, r);
  float glow = pow(core, 6.0);
  vec3 col = mix(uColorA, uColorB, clamp((vSize - 0.7) / 1.6, 0.0, 1.0));
  float a = (glow * 1.0 + core * 0.22) * vTw;
  gl_FragColor = vec4(col * a, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

/** 程序化星场：闪烁的 Points，叠在银河背景球之上 */
export function createStarfield(count = 5200, radius = 340): THREE.Points {
  const pos = new Float32Array(count * 3)
  const size = new Float32Array(count)
  const phase = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    // 均匀球面分布
    const u = Math.random() * 2 - 1
    const th = Math.random() * Math.PI * 2
    const s = Math.sqrt(1 - u * u)
    const r = radius * (0.86 + Math.random() * 0.28)
    pos[i * 3] = r * s * Math.cos(th)
    pos[i * 3 + 1] = r * u
    pos[i * 3 + 2] = r * s * Math.sin(th)
    const m = Math.random()
    size[i] = 0.55 + Math.pow(m, 5.0) * 2.6
    phase[i] = Math.random()
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
  g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1))
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uColorA: { value: new THREE.Color('#cfe4ff') },
      uColorB: { value: new THREE.Color('#ffd9a8') }
    },
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
  const pts = new THREE.Points(g, mat)
  pts.frustumCulled = false
  pts.renderOrder = -10
  return pts
}

/** 银河背景球（NASA 深空图，反向球面） */
export function createSkyDome(skyTex: THREE.Texture, radius = 420): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({
    map: skyTex,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    color: new THREE.Color('#8fa8c8'),
    fog: false
  })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 40), mat)
  mesh.renderOrder = -20
  mesh.frustumCulled = false
  return mesh
}
