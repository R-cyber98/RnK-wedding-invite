// Sun, moon and sky colour for Udaipur, as pure functions of a timestamp.

const IST = 5.5
// ponytail: approximate Udaipur sunrise/sunset for mid-December (~24.6°N). Swap for a real ephemeris if venue or season changes.
export const SUNRISE = 7 + 5 / 60
export const SUNSET = 17 + 42 / 60
const MAX_ALT = 42 // sun's noon altitude in mid-December at this latitude, degrees
const MIN_ALT = -66
const SYNODIC = 29.530588853
const NEW_MOON_REF = Date.UTC(2000, 0, 6, 18, 14) // a known new moon

export const hourIST = (ms) => (((ms / 36e5 + IST) % 24) + 24) % 24

const wrap = (h) => ((h % 24) + 24) % 24

// Altitude in degrees: rises at SUNRISE, peaks mid-day, sets at SUNSET, lowest mid-night.
export function altitude(h) {
  const since = wrap(h - SUNRISE)
  const day = SUNSET - SUNRISE
  return since <= day
    ? Math.sin((Math.PI * since) / day) * MAX_ALT
    : Math.sin((Math.PI * (since - day)) / (24 - day)) * MIN_ALT
}

// 0 = rising in the east (left), 1 = setting in the west (right).
export function across(h) {
  const since = wrap(h - SUNRISE)
  return since / (SUNSET - SUNRISE)
}

// 0 = new moon, 0.5 = full. Mean-moon formula, good to about half a day.
export const moonPhase = (ms) => ((((ms - NEW_MOON_REF) / 864e5 / SYNODIC) % 1) + 1) % 1

// The moon follows the sun's path, lagging by its phase (~50 min a day).
export function moon(ms) {
  const phase = moonPhase(ms)
  const h = hourIST(ms) - phase * 24
  return { phase, alt: altitude(h), across: across(h) }
}

export function sun(ms) {
  const h = hourIST(ms)
  return { alt: altitude(h), across: across(h) }
}

// Sky colours keyed by sun altitude: [alt, zenith, horizon]
// Paper tones, not saturated blues: ivory by day, blush at the horizon at sunrise/sunset, oxblood ink at night.
// Festive, auspicious tones: wine-sindoor night, rani-pink and marigold twilight, warm haldi-cream day.
// (No black or white: both read as mourning in most Hindu traditions.)
const SKY = [
  [-90, '#2a0812', '#3a0c18'],
  [-18, '#2e0914', '#43101d'],
  [-12, '#3b0d1b', '#5e1527'],
  [-6, '#5a1428', '#b23f5e'],
  [-2, '#8f2f50', '#ec8a6a'],
  [2, '#eab79e', '#f6c27a'],
  [8, '#f8dcc0', '#fbd9a0'],
  [20, '#fdeedb', '#fbe6c4'],
  [90, '#fff4e4', '#fcebcf'],
]
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
export const mix = (a, b, k) => {
  const A = hex(a), B = hex(b)
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('')}`
}
export function skyColors(alt) {
  let i = SKY.findIndex(([a]) => a >= alt)
  if (i <= 0) i = 1
  const [a0, z0, h0] = SKY[i - 1], [a1, z1, h1] = SKY[i]
  const k = (alt - a0) / (a1 - a0)
  return { zenith: mix(z0, z1, k), horizon: mix(h0, h1, k) }
}

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
