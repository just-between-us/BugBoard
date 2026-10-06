<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { Delaunay } from 'd3-delaunay'

interface Props {
  image: string
  shardCount?: number
  shardGap?: number
  /** Базовый подъём осколков в глубину, px. */
  depth?: number
  /** Множитель силы разлёта от клика. */
  impulse?: number
  /** Сила реакции на курсор: поворот, радиус, параллакс. */
  cursorPower?: number
  showDirt?: boolean
  showCracks?: boolean
  /** Множитель интенсивности грязи. */
  dirtStrength?: number
  /** Прозрачность линий трещин, 0..1. */
  crackOpacity?: number
  /** Цвет трещин: 0 — темнее, 1 — светлее. */
  crackTone?: number
}

const props = withDefaults(defineProps<Props>(), {
  shardCount: 18,
  shardGap: 18,
  depth: 30,
  impulse: 1,
  cursorPower: 1,
  showDirt: true,
  showCracks: true,
  dirtStrength: 1,
  crackOpacity: 0.5,
  crackTone: 0.5,
})

const container = ref<HTMLDivElement | null>(null)
const webglLayer = ref<HTMLDivElement | null>(null)

/*
 * Стекло лежит целым, пока по нему не кликнули один раз.
 * Дальше — voronoi-осколки с зазором.
 */

const shattered = ref(false)

const flash = ref({ x: 0, y: 0, key: 0 })

let renderer: THREE.WebGLRenderer
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let animationFrame = 0

let glassGroup: THREE.Group
let previewTexture: THREE.Texture
let dirtTexture: THREE.Texture
let crackTexture: THREE.Texture

let resizeObserver: ResizeObserver | undefined

const mouse = new THREE.Vector2(0.5, 0.5)
const smoothMouse = new THREE.Vector2(0.5, 0.5)

const clock = new THREE.Clock()

/*
 * Секунды с момента удара и точка, в которую пришёлся клик —
 * от неё считается волна растрескивания и импульс осколков.
 */

let crackTime = 0
let lastElapsed = 0
const shatterOrigin = new THREE.Vector2(0, 0)

const CRACK_DURATION = 0.6
const CRACK_WAVE_SPEED = 2000

/*
 * Появление целого стекла: заполнение контейнера от краёв.
 */

const REVEAL_DURATION = 1.4
let revealProgress = 0

interface Shard {
  mesh: THREE.Mesh
  center: THREE.Vector2
  basePosition: THREE.Vector3
  rotationTarget: THREE.Vector2
  rotationVelocity: THREE.Vector2
  positionVelocity: THREE.Vector2
  zVelocity: number
  random: number
  baseScale: number
  crackDelay: number
}

const shards: Shard[] = []

/*
 * ---------------------------------------------------------
 * Glass shader
 * ---------------------------------------------------------
 *
 * Здесь происходит:
 *
 *  - Fresnel
 *  - fake refraction
 *  - thickness tint
 *  - edge highlight
 *  - dirt texture (smudges, dust)
 *  - crack lines
 *  - edge reveal (glass appear)
 *  - moving specular highlight
 */

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewDirection;

  void main() {
    vUv = uv;

    vec4 worldPosition = modelMatrix * vec4(position, 1.0);

    vWorldPosition = worldPosition.xyz;

    vec3 worldNormal =
      normalize(mat3(modelMatrix) * normal);

    vNormal = worldNormal;

    vViewDirection =
      normalize(cameraPosition - worldPosition.xyz);

    gl_Position =
      projectionMatrix *
      viewMatrix *
      worldPosition;
  }
`

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uTexture;
  uniform sampler2D uDirt;
  uniform sampler2D uCrackTex;

  uniform vec2 uResolution;
  uniform vec2 uMouse;

  uniform float uTime;
  uniform float uIOR;
  uniform float uThickness;
  uniform float uDistortion;
  uniform float uShardSeed;
  uniform float uCrack;
  uniform float uDirtOn;
  uniform float uReveal;
  uniform float uDirtStrength;
  uniform float uCrackOpacity;
  uniform float uCrackTone;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewDirection;

  /*
   * Появление стекла: хаотичное заполнение контейнера
   * от краёв к центру. Порог по краевому расстоянию,
   * сбитый шумом — фронт рваный, не дуга.
   */

  float revealHash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);

    return fract(p.x * p.y);
  }

  float revealNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);

    f = f * f * (3.0 - 2.0 * f);

    return mix(
      mix(revealHash(i), revealHash(i + vec2(1.0, 0.0)), f.x),
      mix(revealHash(i + vec2(0.0, 1.0)), revealHash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  void main() {

    vec3 normal = normalize(vNormal);

    /*
     * Экранные координаты (0..1, сверху-слева) —
     * общие для reveal-маски и подсветки трещин у курсора.
     */

    vec2 screenUv =
      vec2(
        vWorldPosition.x / uResolution.x + 0.5,
        0.5 - vWorldPosition.y / uResolution.y
      );

    /*
     * Расстояние до ближайшего края контейнера: 0 на краю,
     * 1 в центре (по меньшей из сторон).
     */

    float edgeDist = min(
      min(screenUv.x, 1.0 - screenUv.x) * uResolution.x,
      min(screenUv.y, 1.0 - screenUv.y) * uResolution.y
    );

    float edgeT =
      clamp(edgeDist / (min(uResolution.x, uResolution.y) * 0.5), 0.0, 1.0);

    float revealT =
      edgeT * 0.7 +
      revealNoise(screenUv * vec2(7.0, 4.0)) * 0.3;

    if (uReveal < revealT) {
      discard;
    }

    /*
     * Светящийся фронт заполнения: полоса шириной 0.12
     * позади текущего значения, гаснет к концу анимации.
     */

    float revealFront =
      (1.0 - smoothstep(0.0, 0.12, uReveal - revealT)) *
      (1.0 - smoothstep(0.88, 1.0, uReveal));

    /*
     * Ортокамера: направление взгляда постоянное (0,0,1).
     *
     * perspective-style viewDir (cameraPosition - worldPos) здесь
     * давал fresnel ≈ 1 по краям: координаты мира — это экранные
     * пиксели (±800), и у всех осколков кроме центральных взгляд
     * почти перпендикулярен нормали — стекло «зацветало».
     */

    vec3 viewDir = vec3(0.0, 0.0, 1.0);

    /*
     * Fresnel
     */

    float fresnel =
      pow(
        1.0 - max(dot(normal, viewDir), 0.0),
        2.2
      );

    /*
     * -----------------------------------------------------
     * Fake refraction
     * -----------------------------------------------------
     *
     * Чистое стекло: UV сдвигаются только по нормали фаски.
     * Раньше здесь был ещё и procedural noise (матовость),
     * теперь его функции удалены — преломление кристально
     * чистое, а «грязь» даёт отдельная dirt-текстура.
     */

    vec2 normalOffset =
      normal.xy *
      uDistortion;

    /*
     * IOR влияет на силу искажения.
     */

    float iorFactor =
      (uIOR - 1.0) * 2.0;

    vec2 refractedUv =
      vUv +
      normalOffset *
      iorFactor *
      uThickness;

    /*
     * -----------------------------------------------------
     * Chromatic aberration
     * -----------------------------------------------------
     */

    float chromatic =
      0.0025 +
      fresnel * 0.008;

    vec2 aberration =
      normalOffset * chromatic;

    float red =
      texture2D(
        uTexture,
        refractedUv + aberration
      ).r;

    float green =
      texture2D(
        uTexture,
        refractedUv
      ).g;

    float blue =
      texture2D(
        uTexture,
        refractedUv - aberration
      ).b;

    vec3 refractedColor =
      vec3(red, green, blue);

    /*
     * -----------------------------------------------------
     * Glass tint
     * -----------------------------------------------------
     */

    vec3 glassTint =
      vec3(
        0.78,
        0.92,
        1.0
      );

    refractedColor =
      mix(
        refractedColor,
        refractedColor * glassTint,
        0.12
      );

    /*
     * -----------------------------------------------------
     * Specular highlight
     * -----------------------------------------------------
     *
     * Точечный свет ВЫШЕ курсора, а не направленный вдоль
     * взгляда. Направленный свет при определённых координатах
     * мыши совпадал с viewDir ортокамеры, reflect(-L, n)
     * давал ≈ 1 для всех плоских граней — и pow(..., 90) * 1.6
     * выбивал белым каждый осколок разом.
     *
     * Точечный свет: свет падает под углом, блик локализован
     * пятном под курсором и гаснет к краям сцены.
     */

    float lightHeight =
      min(uResolution.x, uResolution.y) * 0.6;

    vec3 lightPosition =
      vec3(
        (uMouse.x - 0.5) * uResolution.x,
        (0.5 - uMouse.y) * uResolution.y,
        lightHeight
      );

    vec3 lightDirection =
      normalize(lightPosition - vWorldPosition);

    vec3 halfVector =
      normalize(lightDirection + viewDir);

    float ndh =
      max(dot(normal, halfVector), 0.0);

    float specular =
      pow(ndh, 90.0);

    /*
     * Broad glass reflection.
     */

    float broadHighlight =
      pow(ndh, 12.0);

    /*
     * -----------------------------------------------------
     * Edge / Fresnel highlight
     * -----------------------------------------------------
     */

    vec3 edgeColor =
      vec3(
        0.72,
        0.90,
        1.0
      );

    /*
     * -----------------------------------------------------
     * Thickness effect
     * -----------------------------------------------------
     */

    float thickness =
      smoothstep(
        0.0,
        1.0,
        abs(normal.z)
      );

    vec3 thicknessColor =
      vec3(
        0.55,
        0.78,
        1.0
      );

    /*
     * -----------------------------------------------------
     * Compose
     * -----------------------------------------------------
     */

    vec3 color =
      refractedColor;

    color +=
      edgeColor *
      fresnel *
      0.55;

    color +=
      thicknessColor *
      (1.0 - thickness) *
      0.06;

    /*
     * Slightly increase glass visibility.
     */

    color =
      mix(
        color,
        vec3(0.92, 0.97, 1.0),
        fresnel * 0.12
      );

    /*
     * -----------------------------------------------------
     * Dirt / smudges
     * -----------------------------------------------------
     *
     * Текстура лежит в screen-space UV — стыки осколков её
     * не рвут, грязь «прилипла» к стеклу, а не к осколкам.
     *
     * На грязных участках зеркальный блик гаснет,
     * зато широкая засветка поднимается — матовый налёт.
     */

    float dirt =
      clamp(
        texture2D(uDirt, vUv).r * uDirtOn * uDirtStrength,
        0.0,
        1.0
      );

    specular *= 1.0 - dirt * 0.85;

    broadHighlight *= 1.0 + dirt * 0.6;

    color =
      mix(
        color,
        color * vec3(0.86, 0.84, 0.79),
        dirt * 0.55
      );

    color += dirt * 0.035;

    /*
     * -----------------------------------------------------
     * Cracks
     * -----------------------------------------------------
     *
     * Тонкие серебристые линии по поверхности осколка —
     * следы растрескивания. Тоже screen-space, поэтому
     * линия продолжается через соседние осколки.
     *
     * uCrack (0..1) включает их вместе с волной удара:
     * пока стекло целое — трещин нет.
     *
     * Реакция на курсор: рядом с мышью трещины ловят свет
     * и подсвечиваются, к краям гаснут до базовой яркости.
     * Экранные координаты берём из мировых (пиксели центра
     * контейнера) — тогда всё совпадает с uMouse.
     */

    float crackLine =
      texture2D(uCrackTex, vUv).r * uCrack;

    float cursorDist = distance(screenUv, uMouse);

    float cursorGlow =
      1.0 +
      (1.0 - smoothstep(0.0, 0.3, cursorDist)) * 2.0;

    /*
     * Цвет трещин: от тёмного серо-синего (0)
     * до почти белого (1), прозрачность — отдельным
     * множителем.
     */

    vec3 crackColor =
      mix(
        vec3(0.1, 0.14, 0.2),
        vec3(0.9, 0.95, 1.0),
        uCrackTone
      );

    color =
      1.0 -
      (1.0 - color) *
      (1.0 - clamp(
        crackColor *
        crackLine *
        uCrackOpacity *
        cursorGlow,
        0.0,
        1.0
      ));

    /*
     * Фронт появления стекла.
     */

    color += vec3(0.6, 0.78, 1.0) * revealFront * 0.6;

    /*
     * Свет — через screen-бленд: 1 - (1 - color) * (1 - glow).
     * В отличие от аддитивного сложения, результат никогда
     * не выходит за 1.0 — глянец ложится на поверхность,
     * а не выжигает осколок в чистый белый.
     */

    vec3 glow =
      vec3(1.0) *
      specular *
      0.2 +
      vec3(0.75, 0.9, 1.0) *
      broadHighlight *
      0.02;

    color =
      1.0 -
      (1.0 - color) *
      (1.0 - clamp(glow, 0.0, 1.0));

    gl_FragColor =
      vec4(
        color,
        1.0
      );

    /*
     * Кастомный ShaderMaterial three не конвертирует сам:
     * текстура декодируется из sRGB в линейные значения,
     * и без этой строки итог писался бы в буфер как есть —
     * картинка чернела, а «свет» шёл сырыми линейными числами.
     */

    #include <colorspace_fragment>
  }
`

/*
 * ---------------------------------------------------------
 * Initialization
 * ---------------------------------------------------------
 */

async function init() {
  if (!container.value) {
    return
  }

  /*
   * Scene
   */

  scene = new THREE.Scene()

  /*
   * Renderer
   */

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  renderer.outputColorSpace = THREE.SRGBColorSpace

  renderer.setClearColor(0x000000, 0)

  const canvasLayer = webglLayer.value ?? container.value

  canvasLayer.appendChild(renderer.domElement)

  /*
   * Camera
   */

  /*
   * Перспективная камера: в ортопроекции глубина не видна
   * (z не влияет на экранный размер) — параллакса не было.
   * Точные frustum-параметры выставляет resize().
   */

  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10000)

  camera.position.z = 600

  /*
   * Main shard group
   */

  glassGroup = new THREE.Group()

  scene.add(glassGroup)

  /*
   * Texture
   */

  previewTexture = await loadTexture(props.image)

  previewTexture.colorSpace = THREE.SRGBColorSpace

  previewTexture.minFilter = THREE.LinearFilter

  previewTexture.magFilter = THREE.LinearFilter

  /*
   * Грязь: пятна, разводы от протирки, пыль.
   */

  dirtTexture = createDirtTexture()

  /*
   * Трещины: ветвящиеся линии от эпицентров удара.
   */

  crackTexture = createCrackTexture()

  /*
   * Resize.
   */

  resize()

  /*
   * Generate Voronoi shards.
   */

  generateShards()

  /*
   * Events.
   */

  container.value.addEventListener('pointermove', handlePointerMove, { passive: true })

  container.value.addEventListener('pointerleave', handlePointerLeave, { passive: true })

  container.value.addEventListener('pointerdown', handlePointerDown, { passive: true })

  resizeObserver = new ResizeObserver(() => {
    if (resize()) {
      generateShards()
    }
  })

  resizeObserver.observe(container.value)

  animate()
}

/*
 * ---------------------------------------------------------
 * Texture loader
 * ---------------------------------------------------------
 */

function loadTexture(url: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(url, resolve, undefined, reject)
  })
}

/*
 * ---------------------------------------------------------
 * Dirt texture
 * ---------------------------------------------------------
 *
 * Слегка грязное стекло: облачные пятна, дугообразные
 * разводы от протирки и мелкая пыль. Всё белым на чёрном —
 * в шейдере текстура читается как маска dirt.
 */

function createDirtTexture(): THREE.CanvasTexture {
  const size = 1024

  const canvas = document.createElement('canvas')

  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = 'rgb(0, 0, 0)'
  ctx.fillRect(0, 0, size, size)

  /*
   * Облачная грязь — крупные мягкие пятна.
   */

  for (let i = 0; i < 48; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const radius = 70 + Math.random() * 240
    const alpha = 0.05 + Math.random() * 0.1

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)

    gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`)
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  /*
   * Разводы: дуга из мягких кругов вдоль слегка
   * изогнутой траектории — след протирки.
   */

  for (let i = 0; i < 16; i++) {
    const startX = Math.random() * size
    const startY = Math.random() * size
    const length = 140 + Math.random() * 300
    const angle = Math.random() * Math.PI
    const width = 16 + Math.random() * 42
    const bend = (Math.random() - 0.5) * 60

    ctx.save()
    ctx.translate(startX, startY)
    ctx.rotate(angle)

    for (let t = 0; t <= 1.001; t += 0.05) {
      const px = (t - 0.5) * length
      const py = Math.sin(t * Math.PI) * bend
      const radius = Math.max(width * Math.sin(t * Math.PI), 1)

      const gradient = ctx.createRadialGradient(px, py, 0, px, py, radius)

      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.055)')
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(px, py, radius, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }

  /*
   * Пыль: мелкие вкрапления.
   */

  for (let i = 0; i < 1400; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const radius = 0.4 + Math.random() * 1.4
    const alpha = 0.08 + Math.random() * 0.35

    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  const texture = new THREE.CanvasTexture(canvas)

  texture.colorSpace = THREE.NoColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = false

  return texture
}

/*
 * ---------------------------------------------------------
 * Crack texture
 * ---------------------------------------------------------
 *
 * Ветвящиеся линии от двух эпицентров + обломки
 * концентрических колец вокруг них. Белое по чёрному —
 * в шейдере читается как маска серебристых трещин.
 */

function createCrackTexture(): THREE.CanvasTexture {
  const size = 1024

  const canvas = document.createElement('canvas')

  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = 'rgb(0, 0, 0)'
  ctx.fillRect(0, 0, size, size)

  const origins = [
    { x: size * (0.3 + Math.random() * 0.4), y: size * (0.3 + Math.random() * 0.4) },
    { x: Math.random() * size, y: Math.random() * size },
  ]

  for (const origin of origins) {
    const rays = 4 + Math.floor(Math.random() * 3)

    for (let i = 0; i < rays; i++) {
      const angle = (i / rays) * Math.PI * 2 + Math.random() * 0.6

      drawCrackBranch(ctx, origin.x, origin.y, angle, size * (0.5 + Math.random() * 0.35), 0.3, 3)
    }

    /*
     * Обломки колец — дуги вокруг эпицентра, как от удара.
     */

    const rings = 2 + Math.floor(Math.random() * 2)

    for (let ring = 1; ring <= rings; ring++) {
      const radius = 45 * ring + Math.random() * 40
      const start = Math.random() * Math.PI * 2
      const extent = 0.8 + Math.random() * 2.2

      ctx.strokeStyle = `rgba(255, 255, 255, ${0.55 - ring * 0.12})`
      ctx.lineWidth = 0.5 + Math.random() * 0.5

      ctx.beginPath()
      ctx.arc(origin.x, origin.y, radius, start, start + extent)
      ctx.stroke()
    }
  }

  /*
   * Боковые трещины: покрывают весь блок,
   * от края до края.
   */

  for (let i = 0; i < 10; i++) {
    drawCrackBranch(
      ctx,
      Math.random() * size,
      Math.random() * size,
      Math.random() * Math.PI * 2,
      size * (0.15 + Math.random() * 0.25),
      0.7,
      2,
    )
  }

  const texture = new THREE.CanvasTexture(canvas)

  texture.colorSpace = THREE.NoColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = false

  return texture
}

/*
 * Одна трещина: ломаная со случайными поворотами,
 * от неё ветвятся более тонкие и короткие ответвления.
 */

function drawCrackBranch(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  angle: number,
  length: number,
  width: number,
  depth: number,
) {
  const segments = 9
  const step = length / segments

  const points: [number, number][] = [[startX, startY]]

  let x = startX
  let y = startY
  let a = angle

  ctx.strokeStyle = `rgba(255, 255, 255, ${0.55 + Math.random() * 0.35})`
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(x, y)

  for (let i = 0; i < segments; i++) {
    a += (Math.random() - 0.5) * 0.55

    x += Math.cos(a) * step
    y += Math.sin(a) * step

    points.push([x, y])
    ctx.lineTo(x, y)
  }

  ctx.stroke()

  if (depth <= 0) {
    return
  }

  const branches = 1 + Math.floor(Math.random() * 2)

  for (let i = 0; i < branches; i++) {
    const index = 2 + Math.floor(Math.random() * (points.length - 3))

    const [bx, by] = points[index]!
    const [px, py] = points[index - 1]!

    const localAngle = Math.atan2(by - py, bx - px)
    const spread = 0.4 + Math.random() * 0.7
    const side = Math.random() < 0.5 ? -1 : 1

    drawCrackBranch(
      ctx,
      bx,
      by,
      localAngle + side * spread,
      length * (0.35 + Math.random() * 0.3),
      Math.max(width * 0.6, 0.4),
      depth - 1,
    )
  }
}

/*
 * ---------------------------------------------------------
 * Resize
 * ---------------------------------------------------------
 */

let lastWidth = 0
let lastHeight = 0

function resize(): boolean {
  if (!container.value) {
    return false
  }

  const width = container.value.clientWidth

  const height = container.value.clientHeight

  if (!width || !height) {
    return false
  }

  /*
   * ResizeObserver стреляет и при первом observe,
   * и при любом чихе окна — пропускаем, если размер
   * не изменился (иначе осколки будут пересобираться зря).
   */

  if (width === lastWidth && height === lastHeight) {
    return false
  }

  lastWidth = width
  lastHeight = height

  renderer.setSize(width, height, false)

  /*
   * Перспективная камера: расстояние подобрано так, что в
   * плоскости z = 0 фрustum совпадает с контейнером 1:1 —
   * осколки в покое дают пиксель-в-пиксель (зазор shardGap
   * по-прежнему ~пиксели), а смещение в глубину масштабирует
   * их — в этом и состоит параллакс.
   */

  const fovRad = (45 * Math.PI) / 180

  camera.fov = 45
  camera.aspect = width / height
  camera.position.z = height / (2 * Math.tan(fovRad / 2))

  camera.updateProjectionMatrix()

  /*
   * Group is centered.
   */

  glassGroup.position.set(0, 0, 0)

  return true
}

/*
 * ---------------------------------------------------------
 * Generate Voronoi
 * ---------------------------------------------------------
 */

function generateShards() {
  if (!container.value) {
    return
  }

  const width = container.value.clientWidth

  const height = container.value.clientHeight

  if (!width || !height) {
    return
  }

  /*
   * Remove previous shards.
   */

  for (const shard of shards) {
    shard.mesh.geometry.dispose()

    if (Array.isArray(shard.mesh.material)) {
      shard.mesh.material.forEach((material) => material.dispose())
    } else {
      shard.mesh.material.dispose()
    }

    glassGroup.remove(shard.mesh)
  }

  shards.length = 0

  /*
   * Стекло ещё целое: вместо voronoi — одна панель
   * на весь блок, без трещин и зазоров.
   */

  if (!shattered.value) {
    const pane: [number, number][] = [
      [0, 0],
      [width, 0],
      [width, height],
      [0, height],
    ]

    createShard(pane, new THREE.Vector2(width / 2, height / 2), 1)

    return
  }

  /*
   * Точки с кластерами: около эпицентров — мелкая крошка,
   * на свободной площади — крупные плиты.
   */

  const points = generatePoints(props.shardCount, width, height)

  const delaunay = Delaunay.from(points.map((point) => [point.x, point.y]))

  const voronoi = delaunay.voronoi([0, 0, width, height])

  for (let i = 0; i < points.length; i++) {
    const cell = openCellPolygon(voronoi.cellPolygon(i))

    if (!cell) {
      continue
    }

    /*
     * Каждая ячейка дробится прямыми резами (0–2) на
     * угловатые осколки, потом вершины слегка дёргаются —
     * так исходный «шестиугольник» voronoi теряет
     * правильный вид.
     */

    for (const piece of fracturePolygon(cell, 2)) {
      const fractured = jitterPolygon(piece)

      const center = polygonCentroid(fractured)

      createShard(fractured, center, gapScale(fractured, center, props.shardGap))
    }
  }

  /*
   * Волна трещин: каждый осколок стартует, когда удар
   * «добегает» до него от точки клика. При пересборке
   * (resize посреди анимации) задержка считается заново
   * от уже прошедшего crackTime — волна не сбрасывается.
   */

  for (const shard of shards) {
    const distance = Math.hypot(shard.center.x - shatterOrigin.x, shard.center.y - shatterOrigin.y)

    shard.crackDelay = distance / CRACK_WAVE_SPEED - crackTime + Math.random() * 0.04
  }
}

/*
 * ---------------------------------------------------------
 * Gap scale
 * ---------------------------------------------------------
 *
 * shardGap — зазор между осколками в экранных пикселях.
 * Осколок сжимается к своему центру на gap/2 с каждой
 * стороны, поэтому у соседей образуется ~gap пикселей.
 */

function gapScale(polygon: [number, number][], center: THREE.Vector2, gap: number): number {
  let radius = 0

  for (const point of polygon) {
    radius = Math.max(radius, Math.hypot(point[0] - center.x, point[1] - center.y))
  }

  if (radius <= 0) {
    return 1
  }

  return Math.max(0.35, 1 - gap / 2 / radius)
}

/*
 * ---------------------------------------------------------
 * Polygon helpers
 * ---------------------------------------------------------
 */

/*
 * d3 возвращает замкнутое кольцо (первая точка = последней) —
 * для разрезов и площади это мусор, убираем.
 */

function openCellPolygon(ring: [number, number][] | null): [number, number][] | null {
  if (!ring || ring.length < 4) {
    return null
  }

  const first = ring[0]!
  const last = ring[ring.length - 1]!

  const closed = first[0] === last[0] && first[1] === last[1]

  const polygon = closed ? ring.slice(0, -1) : ring

  return polygon.length >= 3 ? polygon : null
}

function polygonCentroid(polygon: [number, number][]): THREE.Vector2 {
  let x = 0
  let y = 0

  for (const point of polygon) {
    x += point[0]
    y += point[1]
  }

  return new THREE.Vector2(x / polygon.length, y / polygon.length)
}

function polygonArea(polygon: [number, number][]): number {
  let sum = 0

  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!
    const b = polygon[(i + 1) % polygon.length]!

    sum += a[0] * b[1] - b[0] * a[1]
  }

  return Math.abs(sum) / 2
}

/*
 * Отрезок полигона полуплоскостью: keepSign = 1 — сторона,
 * куда смотрит нормаль (nx, ny), keepSign = -1 — противоположная.
 */

function clipPolygonHalf(
  polygon: [number, number][],
  px: number,
  py: number,
  nx: number,
  ny: number,
  keepSign: 1 | -1,
): [number, number][] {
  const out: [number, number][] = []

  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!
    const b = polygon[(i + 1) % polygon.length]!

    const da = ((a[0] - px) * nx + (a[1] - py) * ny) * keepSign
    const db = ((b[0] - px) * nx + (b[1] - py) * ny) * keepSign

    if (da >= 0) {
      out.push(a)
    }

    if (da >= 0 !== db >= 0) {
      const t = da / (da - db)

      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
    }
  }

  return out
}

/*
 * Дробление ячейки прямыми резами.
 *
 * В отличие от чистого voronoi, половинки — вытянутые
 * угловатые куски с острыми углами: так ломается стекло,
 * а не мыло.
 */

function fracturePolygon(polygon: [number, number][], depth: number): [number, number][][] {
  if (depth <= 0) {
    return [polygon]
  }

  if (polygonArea(polygon) < 700 || Math.random() > 0.55) {
    return [polygon]
  }

  const center = polygonCentroid(polygon)

  const angle = Math.random() * Math.PI

  const nx = Math.cos(angle)
  const ny = Math.sin(angle)

  const offset = (Math.random() - 0.5) * 40

  const px = center.x + nx * offset
  const py = center.y + ny * offset

  const left = clipPolygonHalf(polygon, px, py, nx, ny, 1)
  const right = clipPolygonHalf(polygon, px, py, nx, ny, -1)

  if (left.length < 3 || right.length < 3) {
    return [polygon]
  }

  return [...fracturePolygon(left, depth - 1), ...fracturePolygon(right, depth - 1)]
}

/*
 * Лёгкий дёрг вершин: рвёт правильные грани voronoi,
 * край становится рваным. Сила мала — стыки с соседями
 * гасятся зазором между осколками.
 */

function jitterPolygon(polygon: [number, number][]): [number, number][] {
  const center = polygonCentroid(polygon)

  let radius = 0

  for (const point of polygon) {
    radius = Math.max(radius, Math.hypot(point[0] - center.x, point[1] - center.y))
  }

  if (radius <= 0) {
    return polygon
  }

  const strength = radius * 0.08

  return polygon.map(([x, y]) => [
    x + (Math.random() - 0.5) * 2 * strength,
    y + (Math.random() - 0.5) * 2 * strength,
  ])
}

/*
 * ---------------------------------------------------------
 * Point generation
 * ---------------------------------------------------------
 */

function generatePoints(count: number, width: number, height: number): THREE.Vector2[] {
  const points: THREE.Vector2[] = []

  /*
   * Minimum distance between points — держит ячейки
   * от совсем микроскопических.
   */

  const minDistance = Math.sqrt((width * height) / count) * 0.4

  const insert = (point: THREE.Vector2, minDist: number): boolean => {
    for (const existing of points) {
      if (point.distanceTo(existing) < minDist) {
        return false
      }
    }

    points.push(point)

    return true
  }

  /*
   * Эпицентры: около них точки лепятся плотно — мелкая
   * крошка. Остальная площадь засыпается редко — там
   * получаются крупные плиты.
   */

  const spread = Math.min(width, height)

  const clusters = Array.from({ length: 2 + Math.floor(Math.random() * 2) }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: spread * (0.1 + Math.random() * 0.1),
  }))

  const clusterQuota = Math.floor(count * 0.45)

  let attempts = 0

  while (points.length < clusterQuota && attempts < count * 100) {
    attempts++

    const cluster = clusters[Math.floor(Math.random() * clusters.length)]!

    /*
     * Сумма двух равномерных — «колокол» вокруг эпицентра.
     */

    const distance = ((Math.random() + Math.random()) / 2) * cluster.r

    const angle = Math.random() * Math.PI * 2

    const point = new THREE.Vector2(
      Math.min(Math.max(cluster.x + Math.cos(angle) * distance, 0), width),
      Math.min(Math.max(cluster.y + Math.sin(angle) * distance, 0), height),
    )

    insert(point, minDistance * 0.5)
  }

  attempts = 0

  while (points.length < count && attempts < count * 100) {
    attempts++

    const point = new THREE.Vector2(Math.random() * width, Math.random() * height)

    insert(point, minDistance)
  }

  /*
   * Fallback if Poisson generation
   * couldn't fill the requested amount.
   */

  while (points.length < count) {
    points.push(new THREE.Vector2(Math.random() * width, Math.random() * height))
  }

  return points
}

/*
 * ---------------------------------------------------------
 * Create shard
 * ---------------------------------------------------------
 */

function createShard(polygon: [number, number][], center: THREE.Vector2, baseScale = 1) {
  const width = container.value?.clientWidth ?? 0

  const height = container.value?.clientHeight ?? 0

  /*
   * Convert screen coordinates to our
   * centered world/pixel coordinates.
   */

  const x = center.x - width / 2

  const y = -(center.y - height / 2)

  /*
   * Convert screen-space polygon
   * to local coordinates around its center.
   *
   * Geometry сознательно НЕ центрируется (без geometry.center()):
   * локальные координаты + mesh.position должны давать ровно
   * экранные координаты. Иначе каждый осколок сдвинулся бы
   * на величину своего bbox-центра — стыки бы разъехались,
   * а картинка под стеклом «порвалась» бы по осколкам.
   */

  const shape = new THREE.Shape()

  const first = polygon[0]!

  shape.moveTo(first[0] - center.x, -(first[1] - center.y))

  for (let i = 1; i < polygon.length; i++) {
    const point = polygon[i]!

    shape.lineTo(point[0] - center.x, -(point[1] - center.y))
  }

  shape.closePath()

  /*
   * Actual glass thickness.
   */

  const thickness = 2.2 + Math.random() * 1.6

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.8,
    bevelThickness: 0.6,
    curveSegments: 2,
  })

  /*
   * Shader.
   */

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,

    uniforms: {
      uTexture: {
        value: previewTexture,
      },

      uDirt: {
        value: dirtTexture,
      },

      uCrackTex: {
        value: crackTexture,
      },

      uCrack: {
        value: 0,
      },

      uDirtOn: {
        value: props.showDirt ? 1 : 0,
      },

      uReveal: {
        value: 1,
      },

      uDirtStrength: {
        value: props.dirtStrength,
      },

      uCrackOpacity: {
        value: props.crackOpacity,
      },

      uCrackTone: {
        value: props.crackTone,
      },

      uResolution: {
        value: new THREE.Vector2(
          container.value?.clientWidth ?? 1,
          container.value?.clientHeight ?? 1,
        ),
      },

      uMouse: {
        value: mouse.clone(),
      },

      uTime: {
        value: 0,
      },

      uIOR: {
        value: 1.48,
      },

      uThickness: {
        value: 1.0,
      },

      uDistortion: {
        value: 0.09,
      },

      uShardSeed: {
        value: Math.random(),
      },
    },

    /*
     * Непрозрачный материал: при alpha < 1 соседние треугольники
     * блендятся дважды на общих рёбрах (MSAA-сэмпл попадает в оба)
     * — по геометрии осколков светятся тонкие диагональные швы.
     */

    transparent: false,

    depthWrite: true,

    side: THREE.DoubleSide,
  })

  /*
   * Screen-space UVs.
   *
   * Вершины лежат в экранных координатах (local + mesh.position),
   * поэтому UV каждой вершины считается прямо от её позиции —
   * осколки собираются в цельную картинку без сдвигов и разрывов.
   *
   * Картинка вписывается как object-fit: cover — так же,
   * как <img> под стеклом.
   */

  const positionAttribute = geometry.attributes.position

  const uvAttribute = geometry.attributes.uv

  if (positionAttribute && uvAttribute) {
    const image = previewTexture.image as HTMLImageElement | undefined

    const imageWidth = image?.naturalWidth ?? 0

    const imageHeight = image?.naturalHeight ?? 0

    let drawWidth = width

    let drawHeight = height

    if (imageWidth > 0 && imageHeight > 0) {
      const scale = Math.max(width / imageWidth, height / imageHeight)

      drawWidth = imageWidth * scale

      drawHeight = imageHeight * scale
    }

    const offsetX = (width - drawWidth) / 2

    const offsetY = (height - drawHeight) / 2

    const positions = positionAttribute.array as Float32Array

    const uvs = uvAttribute.array as Float32Array

    for (let i = 0; i < positions.length; i += 3) {
      const screenX = positions[i]! + x + width / 2

      const screenY = height / 2 - (positions[i + 1]! + y)

      const uvIndex = (i / 3) * 2

      uvs[uvIndex] = (screenX - offsetX) / drawWidth

      uvs[uvIndex + 1] = 1 - (screenY - offsetY) / drawHeight
    }

    uvAttribute.needsUpdate = true
  }

  const mesh = new THREE.Mesh(geometry, material)

  mesh.position.set(x, y, 0)

  /*
   * Без начального случайного поворота: даже 0.0075 rad
   * на дальнем углу сдвигает вершину на ~3px — на стыках
   * осколков текст «ступеньками» разъезжается.
   * Реакция на курсор — через rotation.x/y в animate().
   */

  glassGroup.add(mesh)

  shards.push({
    mesh,

    center,

    basePosition: new THREE.Vector3(x, y, 0),

    rotationTarget: new THREE.Vector2(),

    rotationVelocity: new THREE.Vector2(),

    positionVelocity: new THREE.Vector2(),

    zVelocity: 0,

    random: Math.random(),

    baseScale,

    crackDelay: 0,
  })
}

/*
 * ---------------------------------------------------------
 * Mouse
 * ---------------------------------------------------------
 */

function handlePointerMove(event: PointerEvent) {
  if (!container.value) {
    return
  }

  const rect = container.value.getBoundingClientRect()

  mouse.x = (event.clientX - rect.left) / rect.width

  mouse.y = (event.clientY - rect.top) / rect.height
}

function handlePointerLeave() {
  mouse.set(0.5, 0.5)
}

/*
 * ---------------------------------------------------------
 * Shatter
 * ---------------------------------------------------------
 */

function handlePointerDown(event: PointerEvent) {
  if (shattered.value || !container.value) {
    return
  }

  const rect = container.value.getBoundingClientRect()

  shatterOrigin.set(event.clientX - rect.left, event.clientY - rect.top)

  flash.value.x = shatterOrigin.x
  flash.value.y = shatterOrigin.y
  flash.value.key += 1

  shattered.value = true
  crackTime = 0

  generateShards()

  /*
   * Импульс удара: осколки подрагивают в сторону от точки
   * клика и пружинят обратно в basePosition.
   */

  for (const shard of shards) {
    const offsetX = shard.center.x - shatterOrigin.x
    const offsetY = -(shard.center.y - shatterOrigin.y)
    const length = Math.hypot(offsetX, offsetY) || 1

    const dirX = offsetX / length
    const dirY = offsetY / length

    const kick = (0.006 + shard.random * 0.008) * props.impulse

    shard.rotationVelocity.x += dirY * kick
    shard.rotationVelocity.y += dirX * kick

    const push = (4 + shard.random * 10) * props.impulse

    shard.positionVelocity.x += dirX * push
    shard.positionVelocity.y += dirY * push

    /*
     * Осколки подпрыгивают и в глубину — ближние к камере
     * выглядят крупнее, дальше пружина возвращает их назад.
     */

    shard.zVelocity += (10 + shard.random * 20) * props.impulse
  }
}

/*
 * ---------------------------------------------------------
 * Reactive props
 * ---------------------------------------------------------
 *
 * Геометрические пропсы пересобирают осколки на лету
 * (только после удара — целая панель от них не зависит).
 * Остальные (depth, impulse, showDirt, showCracks)
 * читаются в animate() напрямую.
 */

watch(
  () => [props.shardCount, props.shardGap],
  () => {
    if (shattered.value) {
      generateShards()
    }
  },
)

/*
 * Восстановление целого стекла — снаружи через ref.
 */

function restoreGlass() {
  shattered.value = false
  crackTime = 0
  revealProgress = 0
  generateShards()
}

defineExpose({ restore: restoreGlass })

/*
 * ---------------------------------------------------------
 * Animation
 * ---------------------------------------------------------
 */

function animate() {
  animationFrame = requestAnimationFrame(animate)

  const elapsed = clock.getElapsedTime()

  const dt = Math.min(elapsed - lastElapsed, 0.05)

  lastElapsed = elapsed

  if (shattered.value) {
    crackTime += dt
  }

  /*
   * Заполнение стеклом (ease-out): после удара раскрываются
   * сразу осколки — reveal уходит в единицу.
   */

  revealProgress = Math.min(revealProgress + dt / REVEAL_DURATION, 1)

  const revealValue = 1 - Math.pow(1 - revealProgress, 2)

  /*
   * Smooth cursor.
   */

  smoothMouse.lerp(mouse, 0.045)

  /*
   * Animate shards.
   */

  for (const shard of shards) {
    const mesh = shard.mesh

    /*
     * Distance from cursor.
     */

    const dx = smoothMouse.x - shard.center.x / (container.value?.clientWidth ?? 1)

    const dy = smoothMouse.y - shard.center.y / (container.value?.clientHeight ?? 1)

    /*
     * Cursor influence.
     *
     * Farther shards move less.
     *
     * Целая панель не наклоняется: поворот вокруг центра
     * в ортокамере сдвинул бы её края и «разошёлся» бы
     * по контейнеру. До удара реагирует только блик.
     */

    const distance = Math.sqrt(dx * dx + dy * dy)

    const falloff = 1.8 / Math.max(props.cursorPower, 0.25)

    const influence = shattered.value ? Math.max(0, 1.0 - distance * falloff) : 0

    /*
     * Target rotation.
     */

    const targetX = dy * -0.2 * influence * props.cursorPower

    const targetY = dx * 0.19 * influence * props.cursorPower

    shard.rotationTarget.set(targetX, targetY)

    /*
     * Smooth spring-like interpolation.
     */

    shard.rotationVelocity.x += (shard.rotationTarget.x - mesh.rotation.x) * 0.025

    shard.rotationVelocity.y += (shard.rotationTarget.y - mesh.rotation.y) * 0.025

    shard.rotationVelocity.multiplyScalar(0.88)

    mesh.rotation.x += shard.rotationVelocity.x

    mesh.rotation.y += shard.rotationVelocity.y

    /*
     * Дрейф в глубину + параллакс от курсора.
     *
     * Пока курсор мимо — осколки подняты к камере и слегка
     * дрейфуют. Наведение опускает их к базовой плоскости:
     * ближние и дальние меняют глубину по-разному — это и
     * читается как параллакс. Пружина гасит колебания.
     */

    const float = Math.sin(elapsed * 0.45 + shard.random * 10) * 5

    /*
     * Целая панель держится строго в z = 0: любой дрейф
     * масштабировал бы её относительно <img> под стеклом.
     */

    /*
     * Базовый подъём = depth, наведение опускает на depth / 3 —
     * это сохраняет выверенные пропорции (30 / 10).
     * Скорость опускания масштабируется cursorPower.
     */

    const zTarget = shattered.value
      ? float + props.depth - influence * (props.depth / 3) * props.cursorPower
      : 0

    shard.zVelocity += (zTarget - mesh.position.z) * 0.07

    shard.zVelocity *= 0.84

    mesh.position.z += shard.zVelocity

    let crackAmount = 0

    if (shattered.value) {
      /*
       * Зазор: осколок сжимается от полного размера
       * до baseScale, волна приходит от точки клика.
       */

      const progress = Math.min(Math.max((crackTime - shard.crackDelay) / CRACK_DURATION, 0), 1)

      const eased = 1 - Math.pow(1 - progress, 3)

      const scale = 1 + (shard.baseScale - 1) * eased

      mesh.scale.setScalar(scale)

      /*
       * Трещины проявляются вместе с волной удара.
       */

      crackAmount = eased

      /*
       * Пружина к basePosition гасит импульс удара.
       *
       * Осколок, улетевший за пределы контейнера (+25px),
       * отпускается: пружина больше его не тянет, наружная
       * подталкивающая сила уносит его за край холста —
       * фрагмент «выпал» из стекла и не возвращается.
       */

      const halfWidth = (container.value?.clientWidth ?? 0) / 2
      const halfHeight = (container.value?.clientHeight ?? 0) / 2

      const escaped =
        Math.abs(mesh.position.x) > halfWidth + 25 ||
        Math.abs(mesh.position.y) > halfHeight + 25

      if (escaped) {
        shard.positionVelocity.x += Math.sign(mesh.position.x) * 0.5
        shard.positionVelocity.y += Math.sign(mesh.position.y) * 0.5

        shard.positionVelocity.multiplyScalar(0.92)
      } else {
        shard.positionVelocity.x += (shard.basePosition.x - mesh.position.x) * 0.01
        shard.positionVelocity.y += (shard.basePosition.y - mesh.position.y) * 0.01

        shard.positionVelocity.multiplyScalar(0.92)
      }

      mesh.position.x += shard.positionVelocity.x

      mesh.position.y += shard.positionVelocity.y
    }

    /*
     * Update shader uniforms.
     */

    const material = mesh.material as THREE.ShaderMaterial

    material.uniforms.uTime!.value = elapsed

    material.uniforms.uMouse!.value.lerp(smoothMouse, 0.08)

    material.uniforms.uCrack!.value = crackAmount * (props.showCracks ? 1 : 0)

    material.uniforms.uDirtOn!.value = props.showDirt ? 1 : 0

    material.uniforms.uDirtStrength!.value = props.dirtStrength

    material.uniforms.uCrackOpacity!.value = props.crackOpacity

    material.uniforms.uCrackTone!.value = props.crackTone

    material.uniforms.uReveal!.value = shattered.value ? 1 : revealValue
  }

  renderer.render(scene, camera)
}

/*
 * ---------------------------------------------------------
 * Cleanup
 * ---------------------------------------------------------
 */

onMounted(() => {
  init().catch(console.error)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame)

  resizeObserver?.disconnect()

  if (container.value) {
    container.value.removeEventListener('pointermove', handlePointerMove)

    container.value.removeEventListener('pointerleave', handlePointerLeave)

    container.value.removeEventListener('pointerdown', handlePointerDown)
  }

  for (const shard of shards) {
    shard.mesh.geometry.dispose()

    const material = shard.mesh.material as THREE.Material

    material.dispose()
  }

  previewTexture?.dispose()

  dirtTexture?.dispose()

  crackTexture?.dispose()

  renderer?.dispose()

  if (renderer?.domElement.parentElement) {
    renderer.domElement.parentElement.removeChild(renderer.domElement)
  }
})
</script>

<template>
  <div ref="container" class="glass-shatter-preview" :class="{ 'is-shattered': shattered }">
    <div class="glass-shatter-preview__content">
      <img :src="image" alt="" draggable="false" />

      <div class="glass-shatter-preview__overlay" />

      <div class="glass-shatter-preview__fracture" :class="{ 'is-active': shattered }" />
    </div>

    <div ref="webglLayer" class="glass-shatter-preview__webgl" />

    <div v-if="!shattered" class="glass-shatter-preview__hint">
      <span class="glass-shatter-preview__hint-dot" />
      Нажми, чтобы разбить
    </div>

    <div
      v-if="flash.key"
      :key="flash.key"
      class="glass-shatter-preview__flash"
      :style="{ left: `${flash.x}px`, top: `${flash.y}px` }"
    />
  </div>
</template>

<style scoped>
.glass-shatter-preview {
  position: relative;
  width: 100%;
  height: 500px;
  overflow: hidden;
  isolation: isolate;
  background: #111;
  cursor: pointer;
  perspective: 1200px;
}
.glass-shatter-preview.is-shattered {
  cursor: crosshair;
}
.glass-shatter-preview__content {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
}
.glass-shatter-preview__content img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  user-select: none;
  pointer-events: none;
}
.glass-shatter-preview__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    120deg,
    rgba(255, 255, 255, 0.04),
    transparent 35%,
    rgba(255, 255, 255, 0.06)
  );
  pointer-events: none;
}
.glass-shatter-preview__webgl {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: auto;
}
.glass-shatter-preview__webgl :deep(canvas) {
  width: 100%;
  height: 100%;
  display: block;
}

/*
 * Трещины: под осколками гаснет картинка —
 * зазоры читаются как разломы, а не как сдвиг мозаики.
 */

.glass-shatter-preview__fracture {
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 120% at 50% 35%, #0a0e14, #04060a);
  opacity: 0;
  transition: opacity 0.7s ease;
  pointer-events: none;
}
.glass-shatter-preview__fracture.is-active {
  opacity: 0.7;
}

.glass-shatter-preview__hint {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border: 1px solid rgb(255 255 255 / 0.18);
  border-radius: 999px;
  background: rgb(9 12 18 / 0.55);
  backdrop-filter: blur(8px);
  color: rgb(255 255 255 / 0.92);
  font-size: 13px;
  letter-spacing: 0.01em;
  transform: translate(-50%, -50%);
  pointer-events: none;
  animation: glass-hint-breathe 2.2s ease-in-out infinite;
}
.glass-shatter-preview__hint-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #fff;
  animation: glass-hint-dot 1.6s ease-out infinite;
}

@keyframes glass-hint-breathe {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.85;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.04);
    opacity: 1;
  }
}
@keyframes glass-hint-dot {
  0% {
    box-shadow: 0 0 0 0 rgb(255 255 255 / 0.45);
  }
  70% {
    box-shadow: 0 0 0 8px rgb(255 255 255 / 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgb(255 255 255 / 0);
  }
}

/*
 * Вспышка удара в точке клика — прикрывает момент,
 * когда цельная панель сменяется voronoi-осколками.
 */

.glass-shatter-preview__flash {
  position: absolute;
  z-index: 3;
  width: 420px;
  height: 420px;
  margin: -210px 0 0 -210px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgb(255 255 255 / 0.75),
    rgb(255 255 255 / 0.25) 35%,
    transparent 70%
  );
  pointer-events: none;
  animation: glass-flash 0.25s ease-out forwards;
}
@keyframes glass-flash {
  from {
    transform: scale(0.35);
    opacity: 1;
  }
  to {
    transform: scale(1.4);
    opacity: 0;
  }
}
</style>
