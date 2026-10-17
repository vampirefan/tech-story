import * as THREE from 'three'
import type { EarthTextures } from './textures'

export interface EarthUniforms {
  dayMap: { value: THREE.Texture }
  nightMap: { value: THREE.Texture }
  waterMap: { value: THREE.Texture }
  topoMap: { value: THREE.Texture }
  eraMap: { value: THREE.Texture }
  uSunDir: { value: THREE.Vector3 }
  uAtmoColor: { value: THREE.Color }
  uGridColor: { value: THREE.Color }
  uGrid: { value: number }
  uBump: { value: number }
  uSpecPower: { value: number }
  uEraMix: { value: number }
  uNightBoost: { value: number }
  uSaturation: { value: number }
}

const EARTH_VERT = /* glsl */`
varying vec2 vUv;
varying vec3 vWN;
varying vec3 vWP;
varying vec3 vT;
varying vec3 vB;
void main() {
  vUv = uv;
  vec3 n = normalize(normal);
  mat3 nm = mat3(modelMatrix);
  vWN = normalize(nm * n);
  vec3 up = abs(n.y) > 0.985 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 t = normalize(cross(up, n));
  vT = normalize(nm * t);
  vB = normalize(nm * cross(n, t));
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWP = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

const EARTH_FRAG = /* glsl */`
uniform sampler2D dayMap;
uniform sampler2D nightMap;
uniform sampler2D waterMap;
uniform sampler2D topoMap;
uniform sampler2D eraMap;
uniform vec3 uSunDir;
uniform vec3 uAtmoColor;
uniform vec3 uGridColor;
uniform float uGrid;
uniform float uBump;
uniform float uSpecPower;
uniform float uEraMix;
uniform float uNightBoost;
uniform float uSaturation;
varying vec2 vUv;
varying vec3 vWN;
varying vec3 vWP;
varying vec3 vT;
varying vec3 vB;

void main() {
  vec3 N0 = normalize(vWN);
  vec3 V = normalize(cameraPosition - vWP);
  vec3 L = normalize(uSunDir);
  vec2 uv = vUv;

  // ── 地形起伏：用高度图的有限差分扰动法线（避免额外的法线贴图资源） ──
  float tx = 1.0 / 2048.0;
  float hC = texture2D(topoMap, uv).r;
  float hR = texture2D(topoMap, uv + vec2(tx, 0.0)).r;
  float hU = texture2D(topoMap, uv + vec2(0.0, tx)).r;
  vec3 N = normalize(N0 - uBump * ((hR - hC) * normalize(vT) + (hU - hC) * normalize(vB)));

  float NdL = dot(N, L);
  float NdL0 = dot(N0, L);
  float dayF = smoothstep(-0.15, 0.28, NdL);

  vec3 day = texture2D(dayMap, uv).rgb;
  float water = texture2D(waterMap, uv).r;   // 1 = 海洋
  float land = 1.0 - water;

  // 海洋提亮偏蓝，贴近效果图里那种通透的深海蓝
  day = mix(day, day * vec3(0.72, 1.06, 1.52) * 1.30, water * 0.85);

  // 饱和度微调，让画面更"电影感"而不失真
  float lum = dot(day, vec3(0.299, 0.587, 0.114));
  day = mix(vec3(lum), day, uSaturation);

  vec3 lit = day * (0.05 + 0.95 * max(NdL, 0.0));
  lit = mix(lit * vec3(0.90, 0.96, 1.07), lit, land);      // 海面偏冷
  lit += day * 0.05 * smoothstep(0.6, 1.0, hC) * land;     // 高原轻微提亮

  // ── 海面镜面反射（Blinn-Phong，只在有太阳的半球） ──
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), uSpecPower) * water * smoothstep(-0.02, 0.30, NdL);

  // ── 晨昏线暖光 ──
  float term = exp(-pow(NdL / 0.16, 2.0));
  vec3 sunset = vec3(1.0, 0.52, 0.24) * term * 0.42 * (0.35 + 0.65 * land);

  // ── 夜面城市灯光 ──
  vec3 night = texture2D(nightMap, uv).rgb;
  night = mix(vec3(dot(night, vec3(0.33))), night, 1.25);
  night *= uNightBoost * (1.0 - dayF) * (0.30 + 0.70 * land);

  // ── 时代国家染色（eraMap: rgb=区域色, a=活跃度）：以加色热区为主，保住地表本色 ──
  vec4 era = texture2D(eraMap, uv);
  float eraAmt = clamp(era.a * uEraMix, 0.0, 0.14) * land;
  vec3 col = mix(lit, era.rgb, eraAmt);
  col += era.rgb * era.a * uEraMix * 0.16 * land;

  col += spec * vec3(1.0, 0.97, 0.90) * 0.5;
  col += sunset;
  col += night;

  // ── 内层大气边缘散射 ──
  float rim = pow(1.0 - max(dot(N0, V), 0.0), 3.1);
  col += uAtmoColor * rim * (0.16 + 0.98 * max(NdL0, 0.0)) * 0.55;

  // ── 全息经纬网（30° 间距，两极淡出避免走样） ──
  if (uGrid > 0.001) {
    float polar = smoothstep(1.0, 0.74, abs(uv.y * 2.0 - 1.0));
    float dx = min(fract(uv.x * 12.0), 1.0 - fract(uv.x * 12.0));
    float dy = min(fract(uv.y * 6.0), 1.0 - fract(uv.y * 6.0));
    float g = max(1.0 - smoothstep(0.0, 0.016, dx), 1.0 - smoothstep(0.0, 0.016, dy));
    col += uGridColor * g * polar * uGrid * (0.30 + 0.70 * dayF);
  }

  // 夜面基础环境光，避免死黑
  col += vec3(0.016, 0.030, 0.062) * (1.0 - dayF);

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

const CLOUD_FRAG = /* glsl */`
uniform sampler2D cloudMap;
uniform vec3 uSunDir;
uniform float uOpacity;
uniform float uTime;
varying vec2 vUv;
varying vec3 vWN;
varying vec3 vWP;
void main() {
  vec3 N = normalize(vWN);
  vec3 L = normalize(uSunDir);
  vec3 V = normalize(cameraPosition - vWP);
  float a = texture2D(cloudMap, vUv).a;
  float NdL = dot(N, L);
  float dayF = smoothstep(-0.18, 0.34, NdL);
  // 云的立体感：受光侧偏暖白，背光侧偏冷灰，边缘被大气染蓝
  float rim = pow(1.0 - max(dot(N, V), 0.0), 2.0);
  vec3 col = mix(vec3(0.055, 0.075, 0.13), vec3(1.0, 0.985, 0.955), dayF);
  col *= 0.52 + 0.62 * max(NdL, 0.0);
  col += vec3(0.20, 0.42, 0.70) * rim * 0.5 * dayF;
  col += vec3(1.0, 0.55, 0.28) * exp(-pow(NdL / 0.18, 2.0)) * 0.22;
  float alpha = a * uOpacity * (0.16 + 0.84 * dayF);
  if (alpha < 0.004) discard;
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

export function createEarthUniforms(tex: EarthTextures, eraMap: THREE.Texture): EarthUniforms {
  return {
    dayMap: { value: tex.day },
    nightMap: { value: tex.night },
    waterMap: { value: tex.water },
    topoMap: { value: tex.topo },
    eraMap: { value: eraMap },
    uSunDir: { value: new THREE.Vector3(-0.55, 0.28, 0.78).normalize() },
    uAtmoColor: { value: new THREE.Color('#4aa8ff') },
    uGridColor: { value: new THREE.Color('#59d8ff') },
    uGrid: { value: 0.11 },
    uBump: { value: 2.6 },
    uSpecPower: { value: 42 },
    uEraMix: { value: 0.85 },
    uNightBoost: { value: 2.6 },
    uSaturation: { value: 1.14 }
  }
}

export function createEarthMaterial(u: EarthUniforms): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: u as unknown as Record<string, THREE.IUniform>,
    vertexShader: EARTH_VERT,
    fragmentShader: EARTH_FRAG,
    transparent: false,
    depthWrite: true
  })
}

/** 云层与地表共用同一个太阳方向 uniform 对象，保证晨昏线一致 */
export function createCloudMaterial(u: EarthUniforms, cloudMap: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSunDir: u.uSunDir,
      cloudMap: { value: cloudMap },
      uOpacity: { value: 0.55 },
      uTime: { value: 0 }
    },
    vertexShader: EARTH_VERT,
    fragmentShader: CLOUD_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide
  })
}
