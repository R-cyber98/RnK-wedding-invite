import { useEffect, useRef } from 'react'
import { sun, moon, skyColors, mix, clamp } from './sky.js'

/*
 * An engraved palace on Lake Pichola, behind every page. Scroll maps to a real
 * time window for that page; the sun and moon move on their true paths, the
 * paper takes the colour of the sky, lines go from sepia (day) to gold (night).
 * One page detail each: doors (home), marigold toran (haldi), lights (sangeet),
 * lanterns (wedding), mandap + seven rings (pheras).
 */

const HORIZON = 712
const lerp = (a, b, k) => a + (b - a) * k
// Slow ease-out, no overshoot: bounces read as cheap.
const spring = (x) => 1 - Math.pow(1 - clamp(x / 2.2), 4)
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Same breakpoint as the CSS `@media (min-width: 900px) and (min-aspect-ratio: 5/4)`.
export const isWide = (w, h) => w >= 900 && w / h >= 1.25

function frame(w, h) {
  const aspect = h / w
  if (isWide(w, h)) {
    // laptops/desktops: palace large on the right (centre at 68% of width), dome near the top;
    // text and cards live in the left column.
    const vh = 920
    const vw = vh / aspect
    return { x: 500 - vw * 0.68, y: 230 - vh * 0.2, w: vw, h: vh, wide: true }
  }
  // dome top (~y 230) lands at ≥63% (portrait) / ≥69% (landscape, shorter screens) so hero text stays clear
  const vh = Math.max(aspect < 1 ? 2500 : 2050, 740 * aspect)
  const vw = vh / aspect
  return { x: 500 - vw / 2, y: 1000 - vh, w: vw, h: vh }
}

/* ---------- engraving, built once as path strings ---------- */
const arch = (x, y, w, h) => `M${x - w / 2} ${y + h}V${y + w / 2}A${w / 2} ${w / 2} 0 0 1 ${x + w / 2} ${y + w / 2}V${y + h}`
const archClosed = (x, y, w, h) => arch(x, y, w, h) + 'Z'
// a dome with ribs; base y, half-width r, height hgt
const dome = (cx, y, r, hgt, ribs) => {
  let d = `M${cx - r} ${y}C${cx - r} ${y - hgt * 0.9} ${cx - r * 0.3} ${y - hgt} ${cx} ${y - hgt * 1.05}C${cx + r * 0.3} ${y - hgt} ${cx + r} ${y - hgt * 0.9} ${cx + r} ${y}`
  for (let i = 1; i < ribs; i++) {
    const k = i / ribs, x = cx - r + 2 * r * k, bend = (k - 0.5) * r * 0.5
    d += `M${x} ${y}Q${x - bend} ${y - hgt * 0.75} ${cx} ${y - hgt * 1.05}`
  }
  return d + `M${cx} ${y - hgt * 1.05}v-14M${cx - 5} ${y - hgt * 1.05 - 8}h10`
}
const chhatri = (cx, y, w) => {
  const h = w * 0.7
  return `M${cx - w / 2 - 4} ${y}h${w + 8}` + // plinth
    [-0.5, -0.17, 0.17, 0.5].map((k) => `M${cx + k * w} ${y}v${-h}`).join('') + // pillars
    `M${cx - w / 2 - 6} ${y - h}h${w + 12}` + // eave
    dome(cx, y - h, w / 2, w * 0.55, 3)
}
const kanguras = (x0, x1, y, step = 12) => {
  let d = `M${x0} ${y}`
  for (let x = x0; x < x1; x += step) d += `q${step / 2} -9 ${step} 0`
  return d
}

const WINDOWS = []
for (const y of [552, 618]) for (let x = 172; x <= 828; x += 41) if (x < 430 || x > 570) WINDOWS.push([x, y])

const PALACE = [
  // ghats: steps into the water
  `M110 ${HORIZON}H890M130 ${HORIZON - 9}H870M150 ${HORIZON - 18}H850`,
  // long wing, cornice, parapet
  `M150 ${HORIZON - 18}V522H850V${HORIZON - 18}M146 522H854M146 530H854`, kanguras(150, 850, 522),
  // towers
  ...[240, 760].map((x) => `M${x - 44} 522V430H${x + 44}V522M${x - 48} 430H${x + 48}M${x - 48} 437H${x + 48}` + chhatri(x, 430, 52)),
  // central block + drum + dome
  `M380 522V398H620V522M376 398H624M376 405H624`, kanguras(380, 620, 398, 10),
  `M408 398V372H592V398M404 372H596`, dome(500, 372, 92, 128, 7),
  chhatri(408, 398, 28), chhatri(592, 398, 28),
  // jharokha balcony over the door
  `M466 520V470h68v50M460 470h80M462 520h76` + arch(500, 474, 40, 46),
  // doorway
  arch(500, 586, 96, HORIZON - 18 - 586),
  // windows
  ...WINDOWS.map(([x, y]) => arch(x, y, 22, 40)),
  // tower windows
  ...[240, 760].flatMap((x) => [arch(x - 18, 452, 16, 36), arch(x + 18, 452, 16, 36)]),
].join('')

// Closed outline used only as a fill, so the sun/moon pass behind the palace.
const SILHOUETTE = [
  `M150 ${HORIZON - 18}V522H196V430H284V522H380V398H408V372H592V398H620V522H716V430H804V522H850V${HORIZON - 18}Z`,
  `M408 372C408 255 470 245 500 238C530 245 592 255 592 372Z`,
  ...[240, 760].map((x) => `M${x - 26} 430V393H${x + 26}V430ZM${x - 28} 394C${x - 28} 370 ${x} 362 ${x} 362C${x} 362 ${x + 28} 370 ${x + 28} 394Z`),
  `M110 ${HORIZON}V${HORIZON - 18}H890V${HORIZON}Z`,
].join('')

// Aravalli hills behind the palace.
// Run far past any screen edge so the hills never end in a visible box.
const HILLS = `M-8000 ${HORIZON}V600L-1600 600C-1100 560 -800 590 -500 560S-100 520 120 545S420 492 560 515S860 560 1080 530S1500 548 2600 590L9000 590V${HORIZON}Z`
const HILLS_BACK = `M-8000 ${HORIZON}V570L-1600 570C-1200 520 -900 545 -600 520S-200 470 60 500S380 450 640 470S1000 520 1300 480S1900 520 2600 560L9000 560V${HORIZON}Z`
// Jaali lattice inside the tower windows and the balcony.
const JAALI = [[222, 452], [258, 452], [742, 452], [778, 452]].map(([x, y]) => {
  let d = ''
  for (let i = -2; i <= 2; i++) d += `M${x - 7} ${y + 16 + i * 6}l14 8M${x + 7} ${y + 16 + i * 6}l-14 8`
  return d
}).join('') + Array.from({ length: 6 }, (_, i) => `M${482 + i * 7} 490v28`).join('')
// Lotus frieze along the base of the wing.
const LOTUS = Array.from({ length: 26 }, (_, i) => 164 + i * 27).filter((x) => x < 440 || x > 560)
  .map((x) => `M${x} 688q-5 -7 0 -12q5 5 0 12M${x} 688q-9 -2 -11 -7M${x} 688q9 -2 11 -7`).join('') +
  `M150 680H440M560 680H850M150 692H440M560 692H850`
// A shikara: hull, canopy on four posts.
const BOAT = 'M-46 0Q0 13 46 0L40 -5H-40ZM-22 -5V-22M22 -5V-22M-10 -5V-22M10 -5V-22M-28 -22Q0 -32 28 -22Z'

// light hatching on the shaded (east-lit means west side shaded) half of the dome
const HATCH = Array.from({ length: 9 }, (_, i) => {
  const x = 510 + i * 9
  const top = 372 - Math.sqrt(Math.max(0, 1 - ((x - 500) / 92) ** 2)) * 118
  return `M${x} 370V${top + 8}`
}).join('')

const STARS = Array.from({ length: 90 }, (_, i) => [((i * 277) % 2000) - 500, ((i * 131) % 1100) - 820, 0.8 + (i % 3) * 0.6])

// Repeating swags across a very wide span, so the garland reaches both edges of any screen.
const TORAN_SWAG = 480
const TORAN = Array.from({ length: 220 }, (_, i) => {
  const x = -3000 + i * 32
  return [x, 26 * Math.abs(Math.sin((Math.PI * x) / TORAN_SWAG))]
})
const TORAN_ROPE = Array.from({ length: 16 }, (_, i) => `M${-3000 + i * TORAN_SWAG} 0Q${-3000 + (i + 0.5) * TORAN_SWAG} 52 ${-3000 + (i + 1) * TORAN_SWAG} 0`).join('')
const LANTERNS = [190, 330, 670, 810]
const STRINGS = [
  [[500, 238], [370, 340], [240, 335]],
  [[500, 238], [630, 340], [760, 335]],
  [[240, 335], [175, 450], [150, 522]],
  [[760, 335], [825, 450], [850, 522]],
]
const quad = ([a, c, b], t) => [0, 1].map((i) => (1 - t) ** 2 * a[i] + 2 * (1 - t) * t * c[i] + t * t * b[i])
const BULBS = STRINGS.flatMap((s) => Array.from({ length: 11 }, (_, i) => quad(s, (i + 0.5) / 11)))

// One door leaf seen from the front, swung `angle` radians outward about its hinge.
// Closed (0): fills half the arch. Past 90°: folds out beside the arch. The free edge,
// swinging toward the viewer, grows taller (perspective) about the door's mid-height.
const DOOR_TOP = 586, DOOR_SILL = HORIZON - 18, DOOR_MID = (DOOR_TOP + DOOR_SILL) / 2
export function doorLeaf(hinge, dir, angle) {
  const free = hinge + dir * 48 * Math.cos(angle)
  const grow = 1 + 0.2 * Math.sin(angle)
  const fTop = DOOR_MID - (DOOR_MID - DOOR_TOP) * grow
  const fBot = DOOR_MID + (DOOR_SILL - DOOR_MID) * grow
  const panel = hinge + dir * 12 * Math.cos(angle) // carved panel line near the hinge
  return `M${hinge} ${DOOR_SILL}V634Q${hinge} ${fTop} ${free} ${fTop}V${fBot}Z` +
    `M${panel} ${DOOR_SILL - 10}V${DOOR_MID - 4}`
}

// Crescent/gibbous shape at phase p (0 new → 0.5 full), waxing lit on the west (right).
function moonPath(r, p) {
  const k = Math.cos(2 * Math.PI * p)
  const outer = p < 0.5 ? 1 : 0
  const inner = k > 0 ? 1 - outer : outer
  return `M0 ${-r}A${r} ${r} 0 0 ${outer} 0 ${r}A${Math.abs(k * r)} ${r} 0 0 ${inner} 0 ${-r}Z`
}
const RAYS = Array.from({ length: 24 }, (_, i) => {
  const a = (i / 24) * Math.PI * 2, r0 = 40, r1 = i % 2 ? 52 : 60
  return `M${Math.cos(a) * r0} ${Math.sin(a) * r0}L${Math.cos(a) * r1} ${Math.sin(a) * r1}`
}).join('')

export default function Stage({ range, kind, revealed }) {
  const root = useRef(null)
  // read inside the animation loop without restarting it
  const revealedRef = useRef(revealed)
  revealedRef.current = revealed

  useEffect(() => {
    const $ = (s) => root.current.querySelector(s)
    const $$ = (s) => [...root.current.querySelectorAll(s)]
    const el = {
      svg: $('svg'), zen: $('.z'), hor: $('.h'), sun: $('.sun'), moon: $('.moon'), moonShape: $('.moon-shape'),
      stars: $$('.star'), lamps: $$('.win'), doorL: $('.door-l'), doorR: $('.door-r'), doorway: $('.doorway'),
      toran: $('.toran'), lanterns: $$('.lantern'), bulbs: $$('.bulb'), flames: $$('.flame'), rings: $$('.ring'),
      water: $$('.water'), sunR: $('.sun-r'), boats: $$('.boat'),
    }
    const [t0, t1] = range.map(Date.parse)
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    let shown = null, raf, doorStart = null

    const render = (p, wall) => {
      const f = frame(innerWidth, innerHeight)
      el.svg.setAttribute('viewBox', `${f.x} ${f.y} ${f.w} ${f.h}`)
      const ms = lerp(t0, t1, p)
      const s = sun(ms)
      const sky = skyColors(s.alt)
      el.zen.setAttribute('stop-color', sky.zenith)
      el.hor.setAttribute('stop-color', sky.horizon)

      // Ink follows the paper: sepia on light paper, gold on dark.
      const light = clamp((lum(sky.horizon) - 0.25) / 0.4)
      const line = mix('#f0cf8a', '#7a2030', light) // marigold-gold at night, sindoor ink by day
      const fill = mix(sky.zenith, sky.horizon, 0.6)
      root.current.style.setProperty('--line', line)
      root.current.style.setProperty('--fill', fill)
      root.current.style.setProperty('--paper', sky.horizon)
      // nav/footer pick up the live sky and ink
      document.documentElement.style.setProperty('--sky', sky.zenith)
      document.documentElement.style.setProperty('--ink', light > 0.5 ? '#4a1420' : '#fbe3b8')
      document.documentElement.dataset.tone = light > 0.5 ? 'light' : 'dark'

      // east → west across the open sky (right side on wide screens, so it never sits behind the text)
      const ax = (k) => (f.wide ? lerp(f.x + f.w * 0.42, f.x + f.w * 0.97, k) : lerp(f.x + f.w * 0.1, f.x + f.w * 0.9, k))
      const sx = ax(s.across), sy = HORIZON - (s.alt / 45) * 540
      const low = clamp(1 - s.alt / 16)
      el.sun.setAttribute('transform', `translate(${sx} ${sy})`)
      el.sun.setAttribute('opacity', s.alt > -3 ? 1 : 0)
      el.sun.style.setProperty('--sun', mix('#f3d9a0', '#e58a55', low))
      el.sunR.setAttribute('transform', `translate(${sx} ${2 * HORIZON - sy}) scale(1 0.35)`)
      el.sunR.setAttribute('opacity', s.alt > 0 ? 0.35 : 0)

      const m = moon(ms)
      el.moonShape.setAttribute('d', moonPath(20, m.phase))
      el.moon.setAttribute('transform', `translate(${ax(m.across)} ${HORIZON - (m.alt / 45) * 540})`)
      el.moon.setAttribute('opacity', m.alt > -2 ? clamp((4 - s.alt) / 10) : 0) // a young moon is lost in daylight

      const night = clamp((-s.alt - 5) / 10)
      el.stars.forEach((n, i) => n.setAttribute('opacity', night * (0.5 + 0.5 * Math.sin(wall * 1.1 + i * 2.3))))

      const lamp = clamp((3 - s.alt) / 7)
      el.lamps.forEach((w, i) => w.setAttribute('opacity', clamp(lamp * 1.5 - (Math.abs(WINDOWS[i][0] - 500) / 340) * 0.5) * 0.9))

      // Doors swing open each time a page is arrived at (Stage remounts per page), starting
      // once the invitation is revealed so the home swing isn't spent behind the gate.
      if (revealedRef.current && doorStart === null) doorStart = wall
      const open = doorStart === null ? 0 : reduce ? 1 : spring((wall - doorStart - 0.35) * 1.5)
      // Doors swing outward on their hinges (452 / 548): the leaf's face narrows as cos(angle),
      // passes the frame and folds out against the wall; the free edge, now nearer the viewer,
      // reads taller (skew about the threshold). Ends at 105° so the open leaves sit beside the arch.
      const swing = (open * 105 * Math.PI) / 180
      if (el.doorL) { // pheras has no leaves: the mandap stands in the doorway
        el.doorL.setAttribute('d', doorLeaf(452, 1, swing))
        el.doorR.setAttribute('d', doorLeaf(548, -1, swing))
      }
      el.doorway.setAttribute('opacity', clamp(open * (0.25 + lamp * 0.75)))

      el.water.forEach((r, i) => r.setAttribute('transform', `translate(${Math.sin(wall * 0.5 + i * 1.3) * 14} 0)`))
      // two shikaras drift slowly across the lake, opposite ways
      el.boats.forEach((b, i) => {
        const span = f.w + 240
        const run = ((wall * (i ? 7 : 10) + i * span * 0.55) % span)
        const x = i ? f.x + f.w + 120 - run : f.x - 120 + run
        b.setAttribute('transform', `translate(${x} ${HORIZON + (i ? 150 : 70)}) scale(${i ? 1.15 : 0.8})`)
      })

      if (el.toran) {
        // hang just below the glass bar, wherever it ends at this screen size
        const navPx = (document.querySelector('.nav')?.getBoundingClientRect().bottom ?? 90) + 2
        const top = f.y + (navPx / innerHeight) * f.h
        el.toran.setAttribute('transform', `translate(0 ${top - (1 - spring(wall / 1.4)) * (top - f.y + 80)})`)
      }
      el.bulbs.forEach((b, i) => b.setAttribute('opacity', lamp * (0.55 + 0.45 * Math.sin(wall * 2.6 + i * 1.9))))
      if (el.lanterns.length) {
        const lower = spring(clamp(p / 0.55) * 3)
        el.lanterns.forEach((l, i) => {
          const rest = 300 + (i % 2) * 44
          l.setAttribute('transform', `translate(${LANTERNS[i]} ${lerp(f.y - 80, rest, lower)}) rotate(${Math.sin(wall * 1.3 + i) * 3 * lower})`)
        })
      }
      el.flames.forEach((n, i) => {
        const k = 0.88 + 0.12 * Math.sin(wall * 9 + i * 2) * Math.sin(wall * 5.3 + i)
        n.setAttribute('transform', `translate(500 ${HORIZON - 22}) scale(${k} ${k + 0.08})`)
      })
      el.rings.forEach((r, i) => {
        const k = clamp((p * 8 - (i + 0.6)) * 2) // one phera per seventh of the scroll
        r.setAttribute('stroke-dashoffset', 300 * (1 - k))
        r.setAttribute('opacity', k > 0 ? 1 : 0)
      })

    }

    const start = performance.now()
    let last = start
    const tick = (now) => {
      const max = document.documentElement.scrollHeight - innerHeight
      const target = max > 0 ? clamp(scrollY / max) : 0
      const k = 1 - Math.exp(-(now - last) / 450) // unhurried follow
      last = now
      shown = shown === null || reduce ? target : shown + (target - shown) * k
      render(shown, reduce ? 0 : (now - start) / 1000)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [range, kind])

  return (
    <div className="stage" ref={root} aria-hidden="true">
      <svg viewBox="0 0 1000 1000">
        <defs>
          <linearGradient id="sky" x1="0" y1="-900" x2="0" y2={HORIZON} gradientUnits="userSpaceOnUse">
            <stop className="z" offset="0" />
            <stop className="h" offset="1" />
          </linearGradient>
          <clipPath id="below"><rect x="-3000" y={HORIZON} width="7000" height="600" /></clipPath>
        </defs>
        <rect x="-3000" y="-3000" width="7000" height="4400" fill="url(#sky)" />

        {STARS.map(([x, y, r], i) => <circle key={i} className="star" cx={x} cy={y} r={r} opacity="0" />)}

        <g className="sun" opacity="0">
          <circle r="34" className="sun-disc" />
          <circle r="34" className="eng" fill="none" />
          <path d={RAYS} className="eng" />
        </g>
        <g className="moon" opacity="0"><path className="moon-shape eng-gold" /></g>

        {/* the palace occludes the sun as it rises and sets */}
        <path d={HILLS_BACK} className="hills back" />
        <path d={HILLS} className="hills" />
        <path d={SILHOUETTE} className="silhouette" />
        <path d={JAALI} className="eng thin" />
        <path d={LOTUS} className="eng thin" />
        <path d={PALACE} className="eng" fill="none" />
        <path d={HATCH} className="eng thin" />
        {WINDOWS.map(([x, y], i) => <path key={i} d={archClosed(x, y + 3, 16, 34)} className="lamp win" opacity="0" />)}
        <path className="doorway lamp" d={archClosed(500, 590, 90, HORIZON - 18 - 590)} opacity="0" />
        {kind !== 'pheras' && <path className="door-l eng door" d={doorLeaf(452, 1, 0)} />}
        {kind !== 'pheras' && <path className="door-r eng door" d={doorLeaf(548, -1, 0)} />}

        {kind === 'sangeet' && (
          <g>
            {STRINGS.map(([a, c, b], i) => <path key={i} d={`M${a} Q${c} ${b}`} className="eng thin" fill="none" />)}
            {BULBS.map(([x, y], i) => <circle key={i} className="bulb" cx={x} cy={y} r="2.6" opacity="0" />)}
          </g>
        )}

        {/* water: engraved hairlines + faint reflection */}
        <g clipPath="url(#below)">
          <path d={PALACE} className="eng reflect" fill="none" transform={`translate(0 ${2 * HORIZON}) scale(1 -1)`} />
          <ellipse className="sun-r" rx="34" ry="34" opacity="0" />
        </g>
        {Array.from({ length: 14 }, (_, i) => {
          const y = HORIZON + 14 + i * i * 2.2
          const w = 260 + i * 70
          return <path key={i} className="water eng thin" d={`M${500 - w / 2 + (i % 3) * 40} ${y}h${w * 0.45}m${w * 0.12} 0h${w * 0.3}`} />
        })}

        <path className="boat eng solid" d={BOAT} />
        <path className="boat eng solid" d={BOAT} />

        {kind === 'pheras' && (
          <g>
            <path className="eng solid" d={`M440 ${HORIZON - 18}V612M560 ${HORIZON - 18}V612M428 616L500 574L572 616ZM432 612H568M476 ${HORIZON - 18}v-10h48v10`} />
            <path className="flame" d="M0 0C-14 -5 -11 -26 0 -46C11 -26 14 -5 0 0Z" />
            <path className="flame inner" d="M0 0C-7 -3 -6 -16 0 -28C6 -16 7 -3 0 0Z" />
            {Array.from({ length: 7 }, (_, i) => (
              <ellipse key={i} className="ring" cx="500" cy={HORIZON - 6} rx={78 + i * 10} ry={11 + i * 1.6}
                strokeDasharray="300 800" opacity="0" />
            ))}
          </g>
        )}

        {kind === 'haldi' && (
          <g className="toran">
            <path d={TORAN_ROPE} className="eng thin" fill="none" />
            {TORAN.map(([x, y], i) => (
              <g key={i} transform={`translate(${x} ${y + 8})`}>
                <path d="M0 0v10" className="eng thin" />
                <circle cy="18" r="8" className={i % 2 ? 'marigold' : 'marigold alt'} />
                <circle cy="18" r="3.4" className="eng thin" fill="none" />
                <path d="M-5 26l5 9l5 -9" className="leaf" />
              </g>
            ))}
          </g>
        )}

        {kind === 'wedding' && LANTERNS.map((x) => (
          <g key={x} className="lantern">
            <path d="M0 -3000V0" className="eng thin" />
            <path d="M-12 4h24l-3 30h-18Z M-14 0h28v4h-28Z M-8 34h16l-8 8Z" className="eng lantern-body" />
            <path d="M-6 10h12v18h-12Z" className="lantern-glow" />
          </g>
        ))}
      </svg>
    </div>
  )
}
