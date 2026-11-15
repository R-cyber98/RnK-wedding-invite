import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import Stage from './Stage.jsx'

const VENUE = 'Maangarh Resort, Udaipur'
const MAPS = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Maangarh Resort Udaipur')
const FIRST_EVENT = new Date('2026-12-10T12:00:00+05:30')
const DESIGNER = {
  instagram: 'https://www.instagram.com/the_hendrix_07?igsh=YXQwdGliaWN4bm5w',
  linkedin: 'https://www.linkedin.com/in/hendrix07',
}

// Each page scrolls through a real window of time on its own day.
const HOME = { slug: '', kind: 'home', range: ['2026-12-10T07:20+05:30', '2026-12-10T10:30+05:30'] }

const EVENTS = [
  {
    slug: 'haldi', kind: 'haldi', theme: 'light', name: 'Haldi', day: 'Day one',
    range: ['2026-12-10T10:30+05:30', '2026-12-10T15:00+05:30'],
    tagline: 'A Splash of Sunshine & Traditions',
    blurb: 'Join us for a bright and joyful haldi afternoon filled with turmeric, traditions & smiles.',
    date: 'Thursday, 10 December 2026', short: 'Thursday, 10 December',
    times: [['', '12:00 PM onwards']], place: 'Poolside Garden',
    dress: 'Shades of Yellow & Pink', swatches: ['#e9b949', '#f3d98a', '#d9718f', '#efb3c4'],
  },
  {
    slug: 'sangeet', kind: 'sangeet', theme: 'dark', name: 'Sangeet', day: 'Day one',
    range: ['2026-12-10T16:45+05:30', '2026-12-10T22:00+05:30'],
    tagline: 'An Evening of Music & Magic',
    blurb: 'A night of music, laughter and unforgettable memories.',
    footnote: 'Bring your dancing shoes and celebrate the night with us!',
    date: 'Thursday, 10 December 2026', short: 'Thursday, 10 December',
    times: [['', '7:00 PM onwards']], place: 'Main Lawn',
    dress: 'Glitz & Glamour', swatches: ['#c9a66b', '#b9bccb', '#1d1a24', '#7a1730'],
  },
  {
    slug: 'wedding', kind: 'wedding', theme: 'dark', name: 'The Wedding', day: 'Day two',
    range: ['2026-12-11T16:15+05:30', '2026-12-11T21:15+05:30'],
    tagline: 'And So, Two Hearts Become One',
    blurb: 'Join us as we celebrate their union and the beginning of a beautiful new journey.',
    date: 'Friday, 11 December 2026', short: 'Friday, 11 December',
    times: [['Baarat', '5:00 PM onwards'], ['Dinner', '7:00 PM onwards']], place: 'Main Lawn',
  },
  {
    slug: 'pheras', kind: 'pheras', theme: 'dark', name: 'The Pheras', day: 'Day three',
    range: ['2026-12-12T02:15+05:30', '2026-12-12T06:50+05:30'],
    tagline: 'A sacred beginning, surrounded by love and blessings.',
    date: 'Saturday, 12 December 2026', short: 'Saturday, 12 December',
    times: [['', '3:00 AM onwards']],
  },
]
const plain = (name) => name.replace('The ', '')

/* ---------- routing: #/haldi etc, cross-faded with the View Transitions API ---------- */
const routeFromHash = () => location.hash.replace(/^#\/?/, '')
function useRoute() {
  const [route, setRoute] = useState(routeFromHash)
  useEffect(() => {
    const go = () => {
      // Apply the route exactly once. A view transition only runs its update after the browser
      // paints, which a hidden/throttled tab may not do for a long time (or ever, if aborted),
      // leaving the page out of sync with the URL. So whichever comes first wins: the
      // transition's update, or a 400ms fallback.
      let done = false
      const apply = () => {
        if (done) return
        done = true
        flushSync(() => { setRoute(routeFromHash()); scrollTo(0, 0) })
      }
      if (!document.startViewTransition || document.hidden) return apply()
      const vt = document.startViewTransition(apply)
      setTimeout(apply, 400)
      vt.updateCallbackDone.catch(apply)
      vt.ready.catch(() => {})
      vt.finished.catch(() => {})
    }
    addEventListener('hashchange', go)
    return () => removeEventListener('hashchange', go)
  }, [])
  return route
}

/* ---------- music: one song for the whole site, public/song.mp3 ---------- */
// Created once per page load, so a reload always starts from the beginning.
// Never touched on page changes, so it plays on continuously between pages; loops when it ends.
const audio = Object.assign(new Audio('/song.mp3'), { loop: true, volume: 0.3, preload: 'auto' })
function MusicToggle() {
  const [, rerender] = useState(0)
  useEffect(() => {
    const update = () => rerender((n) => n + 1)
    const evs = ['play', 'pause', 'volumechange']
    evs.forEach((e) => audio.addEventListener(e, update))
    return () => evs.forEach((e) => audio.removeEventListener(e, update))
  }, [])
  const audible = !audio.paused && !audio.muted
  const toggle = () => {
    if (audio.paused) { audio.muted = false; audio.play().catch(() => {}) } // autoplay was blocked: start it
    else audio.muted = !audio.muted
  }
  return (
    <button className={`music ${audible ? 'playing' : 'muted'}`} onClick={toggle} aria-label={audible ? 'Mute music' : 'Unmute music'} aria-pressed={!audible}>
      <span className="bars" aria-hidden="true"><i /><i /><i /><i /></span>
    </button>
  )
}

function useCountdown(target) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const ms = Math.max(0, target - now)
  return [['days', Math.floor(ms / 864e5)], ['hours', Math.floor(ms / 36e5) % 24], ['minutes', Math.floor(ms / 6e4) % 60], ['seconds', Math.floor(ms / 1e3) % 60]]
}

// Photos live in public/photos/<name>.jpg. A frame only appears once its photo has loaded;
// missing files render nothing (and their section collapses via CSS :has).
function Photo({ name, alt = 'Rohit and Kanishka', className = '' }) {
  const [state, setState] = useState('loading')
  if (state === 'bad') return null
  return (
    <figure className={`arch ${className} ${state}`} data-reveal="photo">
      <img src={`/photos/${name}.jpg`} alt={alt} onLoad={() => setState('ok')} onError={() => setState('bad')} />
    </figure>
  )
}

// Masked line: text rises out of its own clip when scrolled into view.
const Line = ({ children, as: Tag = 'span', className = '' }) => (
  <Tag className={`mask ${className}`} data-reveal="line"><span>{children}</span></Tag>
)

// One observer marks [data-reveal] elements as they enter; CSS does the motion.
function useReveal(dep) {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('[data-reveal]').forEach((n) => n.classList.add('in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))),
      { rootMargin: '0px 0px -12% 0px' },
    )
    document.querySelectorAll('[data-reveal]:not(.in)').forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [dep])
}

const Ornament = () => (
  <svg className="ornament" viewBox="0 0 160 14" aria-hidden="true">
    <path d="M0 7H62M98 7H160M70 7l10-6l10 6l-10 6Z M80 4v6" />
  </svg>
)

/* ---------- gate ---------- */
// The site is revealed the moment the guest taps (it fades in behind the parting doors);
// the gate unmounts only after the doors have finished sliding off, never mid-slide.
function Gate({ onOpen, onGone }) {
  const [opening, setOpening] = useState(false)
  const gone = useRef(false)
  const finish = () => { if (!gone.current) { gone.current = true; onGone() } }
  const open = () => {
    if (opening) return // double-tap guard
    setOpening(true)
    audio.play().catch(() => {}) // the tap counts as a user gesture, so autoplay is allowed
    onOpen()
    setTimeout(finish, 2400) // fallback if transitionend never fires (tab hidden, reduced motion)
  }
  return (
    <div className={`gate ${opening ? 'opening' : ''}`}>
      <div className="door left" onTransitionEnd={(e) => e.propertyName === 'transform' && finish()} />
      <div className="door right" />
      <div className="gate-card">
        <p className="om">॥ श्री गणेशाय नमः ॥</p>
        <div className="seal" aria-hidden="true">R<span>&amp;</span>K</div>
        <p className="small">Together with our families</p>
        <h1 className="gate-names">Rohit <span className="script">&amp;</span> Kanishka</h1>
        <Ornament />
        <p className="gate-sub">10 – 12 December 2026<br />Maangarh Resort, Udaipur</p>
        <button className="btn" onClick={open} autoFocus>Open the invitation</button>
      </div>
    </div>
  )
}

/* ---------- chrome ---------- */
const timesText = (e) => e.times.map(([k, v]) => (k ? `${k} ${v.replace(' onwards', '')}` : v.replace(' onwards', ''))).join(' · ')

function Nav({ route, event }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(scrollY > 40)
    addEventListener('scroll', on, { passive: true })
    return () => removeEventListener('scroll', on)
  }, [])
  return (
    <header className={`nav ${scrolled ? 'scrolled' : ''}`}>
      <a href="#/" className="monogram" aria-label="Home">R<span>&amp;</span>K</a>
      <nav aria-label="Celebrations">
        {EVENTS.map((e) => (
          <a key={e.slug} href={`#/${e.slug}`} aria-current={route === e.slug ? 'page' : undefined}>{plain(e.name)}</a>
        ))}
      </nav>
      {/* the real event date/time, always visible */}
      <p className="when-chip">
        {event ? (
          <>
            {/* full on wide screens; first time only on narrow ones (full times are in the plaque below the title) */}
            <span className="chip-full">{event.short.replace(/^\w+, /, '')} <b>{timesText(event)}</b></span>
            <span className="chip-short">{event.short.replace(/^\w+, (\d+) (\w{3})\w*/, '$1 $2')} <b>{event.times[0][1].replace(' onwards', '')}</b></span>
          </>
        ) : <>10 – 12 Dec <b>2026</b></>}
      </p>
    </header>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <p>Designed with <span className="heart" aria-label="love">♥</span> for Rohit &amp; Kanishka</p>
      <p className="credit">
        Designed by{' '}
        <a href={DESIGNER.instagram} target="_blank" rel="noreferrer" aria-label="Harsh on Instagram">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r="1" className="dot" /></svg>
          Harsh
        </a>
        <span className="sep" aria-hidden="true">|</span>
        <a href={DESIGNER.linkedin} target="_blank" rel="noreferrer" aria-label="Harsh on LinkedIn">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7" /></svg>
          Harsh
        </a>
        {/* number is resolved server-side by /api/whatsapp; it never appears in the page */}
        <a href="/api/whatsapp" target="_blank" rel="noreferrer" className="wa" aria-label="Message Harsh on WhatsApp">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.2-3.9A8 8 0 1 1 8 19z" /><path d="M9.2 8.6c.2-.4.6-.4.8 0l.6 1.3c.1.3 0 .5-.2.7l-.4.4c.5 1 1.3 1.8 2.3 2.3l.4-.4c.2-.2.4-.3.7-.2l1.3.6c.4.2.4.6 0 .8-.7.6-1.5.8-2.3.5a7.4 7.4 0 0 1-3.6-3.6c-.3-.8-.1-1.7.4-2.4z" className="dot" /></svg>
          WhatsApp
        </a>
      </p>
    </footer>
  )
}

/* ---------- home ---------- */
function Home() {
  const countdown = useCountdown(FIRST_EVENT)
  return (
    <main className="page home">
      <section className="hero split">
        <div className="hero-text">
          <Line as="p" className="om">॥ श्री गणेशाय नमः ॥</Line>
          <Line as="p" className="small">Together with our families</Line>
          <h1 className="names">
            <Line>Rohit</Line>
            <Line className="script amp">&amp;</Line>
            <Line>Kanishka</Line>
          </h1>
          <Line as="p" className="lede">invite you to celebrate their wedding festivities</Line>
          <Line as="p" className="meta">10 – 12 December 2026 · Udaipur</Line>
        </div>
      </section>

      <section className="band stack-photo only-narrow">
        <Photo name="hero" className="narrow-photo" />
      </section>

      <section className="band gallery-band">
        <div className="gallery">
          <Photo name="gallery-1" />
          <Photo name="gallery-2" className="tall" />
          <Photo name="gallery-3" />
        </div>
      </section>

      <section className="band">
        <div className="card" data-reveal="card">
          {countdown.every(([, n]) => n === 0) ? (
            // after 12:00 PM, 10 Dec 2026 the timer would sit at zeros forever
            <p className="card-title">The celebrations have begun</p>
          ) : (
            <>
              <p className="small">The festivities begin in</p>
              <div className="countdown" role="timer">
                {countdown.map(([label, n]) => <div key={label}><b>{String(n).padStart(2, '0')}</b><small>{label}</small></div>)}
              </div>
            </>
          )}
          <Ornament />
          <p className="where">10 – 12 December 2026<br /><em>{VENUE}</em></p>
        </div>
      </section>

      <section className="band">
        <div className="card programme" data-reveal="card">
          <h2 className="card-title">The Celebrations</h2>
          <ol>
            {EVENTS.map((e) => (
              <li key={e.slug}>
                <a href={`#/${e.slug}`}>
                  <span className="p-day">{e.short}</span>
                  <span className="p-name">{e.name}</span>
                  <span className="p-time">{e.times.map(([k, v]) => (k ? `${k} ${v.replace(' onwards', '')}` : v.replace(' onwards', ''))).join(' · ')}</span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="band end">
        <div className="card" data-reveal="card">
          <p className="closing-text">Your presence and blessings will make our celebrations even more special.</p>
          <p className="sign">With love,<span className="script">The Groom’s Family</span></p>
          <a className="btn" href={MAPS} target="_blank" rel="noreferrer">Open venue in Google Maps</a>
        </div>
      </section>
    </main>
  )
}

/* ---------- event page ---------- */
function EventPage({ e }) {
  const next = EVENTS[EVENTS.indexOf(e) + 1]
  return (
    <main className={`page event theme-${e.theme}`}>
      <section className="hero split">
        <div className="hero-text">
          <Line as="p" className="small">{e.day} · {e.short}</Line>
          <h1 className="event-title"><Line>{e.name}</Line></h1>
          <Line as="p" className="tagline">{e.tagline}</Line>
          {/* the essentials, on a solid plaque so they read on any sky */}
          <div className="plaque" data-reveal="card">
            <p className="plaque-date">{e.date}</p>
            <p className="plaque-time">{e.times.map(([k, v]) => <span key={v}>{k && <em>{k} </em>}{v.replace(' onwards', '')}</span>)}</p>
            <p className="plaque-place">{e.place ? `${e.place}, ${VENUE}` : VENUE}</p>
          </div>
          <Line as="p" className="hint">{e.kind === 'pheras' ? 'Scroll through the night: seven rings for seven pheras' : 'Scroll to move through the day'}</Line>
        </div>
      </section>

      <section className="band stack-photo">
        <Photo name={e.slug} className="narrow-photo" />
        {e.blurb && <div className="card" data-reveal="card"><p className="blurb">{e.blurb}</p></div>}
      </section>

      <section className="band">
        <div className="card details" data-reveal="card">
          <div className="detail">
            <h2 className="small">When</h2>
            <p className="d-main">{e.date}</p>
            {e.times.map(([k, v]) => <p key={v}>{k && <em>{k} </em>}{v}</p>)}
          </div>
          {e.place && (
            <div className="detail">
              <h2 className="small">Where</h2>
              <p className="d-main">{e.place}</p>
              <p>{VENUE}</p>
              <a className="link" href={MAPS} target="_blank" rel="noreferrer">Open in Google Maps</a>
            </div>
          )}
          {e.dress && (
            <div className="detail">
              <h2 className="small">Dress code</h2>
              <p className="d-main">{e.dress}</p>
              <div className="swatches" aria-hidden="true">{e.swatches.map((c) => <i key={c} style={{ background: c }} />)}</div>
            </div>
          )}
        </div>
      </section>

      {e.footnote && (
        <section className="band">
          <Line as="p" className="footnote">{e.footnote}</Line>
        </section>
      )}

      <section className="band end">
        {next ? (
          <a href={`#/${next.slug}`} className="card next" data-reveal="card">
            <span className="small">Next · {next.short}</span>
            <span className="next-name">{next.name}</span>
            <span className="link">Continue to the {plain(next.name).toLowerCase()}</span>
          </a>
        ) : (
          <div className="card" data-reveal="card">
            <p className="closing-text">Your presence and blessings will make our celebrations even more special.</p>
            <p className="sign">With love,<span className="script">The Groom’s Family</span></p>
            <a className="btn" href="#/">Back to the invitation</a>
          </div>
        )}
      </section>
    </main>
  )
}

export default function App() {
  const route = useRoute()
  const [open, setOpen] = useState(false)
  const [gateGone, setGateGone] = useState(false)
  const event = EVENTS.find((e) => e.slug === route)
  const page = event || HOME
  useReveal(`${route}-${open}`)

  useEffect(() => { document.body.style.overflow = open ? '' : 'hidden' }, [open])
  useEffect(() => {
    document.title = event ? `${event.name} · Rohit & Kanishka` : 'Rohit & Kanishka · Udaipur, December 2026'
  }, [event])

  return (
    <>
      <Stage key={page.kind} range={page.range} kind={page.kind} revealed={open} />
      {!gateGone && <Gate onOpen={() => setOpen(true)} onGone={() => setGateGone(true)} />}
      <div className={`site ${open ? 'revealed' : ''}`} aria-hidden={!open}>
        <Nav route={route} event={event} />
        {event ? <EventPage key={event.slug} e={event} /> : <Home />}
        <Footer />
      </div>
      {open && <MusicToggle />}
    </>
  )
}
