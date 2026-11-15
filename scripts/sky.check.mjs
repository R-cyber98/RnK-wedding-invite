// node scripts/sky.check.mjs — fails loudly if the sun/moon model breaks.
import assert from 'node:assert/strict'
import { altitude, across, moon, sun, SUNRISE, SUNSET } from '../src/sky.js'

const at = (s) => Date.parse(s)

assert.ok(Math.abs(altitude(SUNRISE)) < 1e-9, 'sun on horizon at sunrise')
assert.ok(Math.abs(altitude(SUNSET)) < 1e-9, 'sun on horizon at sunset')
assert.ok(sun(at('2026-12-10T12:24+05:30')).alt > 40, 'high at noon')
assert.ok(sun(at('2026-12-12T03:00+05:30')).alt < -40, 'deep below at 3 AM')
assert.ok(across(9) < across(15), 'sun moves east to west')

// New moon ~9 Dec 2026: thin evening crescent, gone by the 3 AM pheras.
assert.ok(moon(at('2026-12-10T12:00+05:30')).phase < 0.06)
assert.ok(moon(at('2026-12-11T18:15+05:30')).alt > 0, 'crescent above west horizon at wedding dusk')
assert.ok(moon(at('2026-12-12T03:00+05:30')).alt < 0, 'no moon at the pheras')
console.log('sky ok')
