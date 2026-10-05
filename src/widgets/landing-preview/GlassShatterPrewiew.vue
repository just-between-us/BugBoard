<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { Delaunay } from 'd3-delaunay'

interface Props {
  image: string
  shardCount?: number
  shardGap?: number
}

const props = withDefaults(defineProps<Props>(), {
  shardCount: 30,
  shardGap: 12,
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
let camera: THREE.OrthographicCamera
let animationFrame = 0

let glassGroup: THREE.Group
let previewTexture: THREE.Texture

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

interface Shard {
  mesh: THREE.Mesh
  center: THREE.Vector2
  basePosition: THREE.Vector3
  rotationTarget: THREE.Vector2
  rotationVelocity: THREE.Vector2
  positionVelocity: THREE.Vector2
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
 *  - procedural micro distortion
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

  uniform vec2 uResolution;
  uniform vec2 uMouse;

  uniform float uTime;
  uniform float uIOR;
  uniform float uThickness;
  uniform float uDistortion;
  uniform float uShardSeed;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewDirection;

  /*
   * Simple hash/noise.
   */

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);

    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);

    f = f * f * (3.0 - 2.0 * f);

    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));

    return mix(
      mix(a, b, f.x),
      mix(c, d, f.x),
      f.y
    );
  }

  void main() {

    vec3 normal = normalize(vNormal);

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
     * Procedural surface distortion
     * -----------------------------------------------------
     */

    float n1 =
      noise(
        vUv * 8.0 +
        vec2(uTime * 0.015)
      );

    float n2 =
      noise(
        vUv * 35.0 -
        vec2(uTime * 0.02)
      );

    float surfaceNoise =
      mix(n1, n2, 0.35);

    /*
     * -----------------------------------------------------
     * Fake refraction
     * -----------------------------------------------------
     *
     * Реальная refraction для первого прототипа
     * здесь заменена UV distortion.
     *
     * Позже это легко заменить на render target.
     */

    vec2 normalOffset =
      normal.xy *
      uDistortion *
      (0.35 + surfaceNoise * 0.65);

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
     * Свет — через screen-бленд: 1 - (1 - color) * (1 - glow).
     * В отличие от аддитивного сложения, результат никогда
     * не выходит за 1.0 — глянец ложится на поверхность,
     * а не выжигает осколок в чистый белый.
     */

    vec3 glow =
      vec3(1.0) *
      specular *
      0.85 +
      vec3(0.75, 0.9, 1.0) *
      broadHighlight *
      0.10;

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

  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100)

  camera.position.z = 10

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
   * Camera coordinates correspond to pixels.
   *
   * This makes the shardGap property
   * intuitive: 12 means roughly 12 screen px.
   */

  camera.left = -width / 2
  camera.right = width / 2
  camera.top = height / 2
  camera.bottom = -height / 2

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
   * Generate slightly randomized
   * Poisson-ish points.
   */

  const points = generatePoints(props.shardCount, width, height)

  const delaunay = Delaunay.from(points.map((point) => [point.x, point.y]))

  const voronoi = delaunay.voronoi([0, 0, width, height])

  for (let i = 0; i < points.length; i++) {
    const polygon = voronoi.cellPolygon(i)

    if (!polygon || polygon.length < 3) {
      continue
    }

    const center = points[i]

    if (!center) {
      continue
    }

    createShard(polygon, center, gapScale(polygon, center, props.shardGap))
  }

  /*
   * Волна трещин: каждый осколок стартует, когда удар
   * «добегает» до него от точки клика. При пересборке
   * (resize посреди анимации) задержка считается заново
   * от уже прошедшего crackTime — волна не сбрасывается.
   */

  for (const shard of shards) {
    const distance = Math.hypot(
      shard.center.x - shatterOrigin.x,
      shard.center.y - shatterOrigin.y,
    )

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

function gapScale(
  polygon: [number, number][],
  center: THREE.Vector2,
  gap: number,
): number {
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
 * Point generation
 * ---------------------------------------------------------
 */

function generatePoints(count: number, width: number, height: number): THREE.Vector2[] {
  const points: THREE.Vector2[] = []

  /*
   * Minimum distance between points.
   *
   * This prevents tiny Voronoi cells.
   */

  const minDistance = Math.sqrt((width * height) / count) * 0.55

  let attempts = 0

  while (points.length < count && attempts < count * 100) {
    attempts++

    const point = new THREE.Vector2(Math.random() * width, Math.random() * height)

    let valid = true

    for (const existing of points) {
      if (point.distanceTo(existing) < minDistance) {
        valid = false
        break
      }
    }

    if (valid) {
      points.push(point)
    }
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

function createShard(
  polygon: [number, number][],
  center: THREE.Vector2,
  baseScale = 1,
) {
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

    const kick = 0.006 + shard.random * 0.008

    shard.rotationVelocity.x += dirY * kick
    shard.rotationVelocity.y += dirX * kick

    const push = 0.8 + shard.random * 1.0

    shard.positionVelocity.x += dirX * push
    shard.positionVelocity.y += dirY * push
  }
}

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

    const influence = shattered.value ? Math.max(0, 1.0 - distance * 2.4) : 0

    /*
     * Target rotation.
     */

    const targetX = dy * -0.16 * influence

    const targetY = dx * 0.16 * influence

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
     * Very subtle floating motion.
     */

    const float = Math.sin(elapsed * 0.45 + shard.random * 10) * 0.25

    mesh.position.z = float

    if (shattered.value) {
      /*
       * Зазор: осколок сжимается от полного размера
       * до baseScale, волна приходит от точки клика.
       */

      const progress = Math.min(
        Math.max((crackTime - shard.crackDelay) / CRACK_DURATION, 0),
        1,
      )

      const eased = 1 - Math.pow(1 - progress, 3)

      const scale = 1 + (shard.baseScale - 1) * eased

      mesh.scale.setScalar(scale)

      /*
       * Пружина к basePosition гасит импульс удара.
       */

      shard.positionVelocity.x += (shard.basePosition.x - mesh.position.x) * 0.03

      shard.positionVelocity.y += (shard.basePosition.y - mesh.position.y) * 0.03

      shard.positionVelocity.multiplyScalar(0.85)

      mesh.position.x += shard.positionVelocity.x

      mesh.position.y += shard.positionVelocity.y
    }

    /*
     * Update shader uniforms.
     */

    const material = mesh.material as THREE.ShaderMaterial

    material.uniforms.uTime!.value = elapsed

    material.uniforms.uMouse!.value.lerp(smoothMouse, 0.08)
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
  animation: glass-flash 0.45s ease-out forwards;
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
