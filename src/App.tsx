import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Circle, CircleMarker, GeoJSON, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L, { LatLngBoundsExpression } from 'leaflet'
import type { GeoJsonObject } from 'geojson'
import { ArrowRight, BookOpen, CheckCircle2, ChevronRight, Compass, Images, Lightbulb, ListChecks, LocateFixed, MapPin, Maximize2, RotateCcw, Sparkles, Trophy, X, XCircle } from 'lucide-react'
import { Breed, breeds } from './data'
import { BreedPhoto, photosForBreed } from './media'
import { distanceToOriginZone, OriginZone, originZoneBounds, originZones } from './originRegions'

type Point = { lat: number; lng: number }
type Screen = 'home' | 'game' | 'summary' | 'guide' | 'breed-quiz' | 'quiz-summary' | 'photo-quiz' | 'photo-summary'
type RoundResult = { breed: Breed; distance: number; points: number; guess: Point; usedHint: boolean; photo: BreedPhoto; insideRegion: boolean; nearest: Point }
type QuizResult = { breed: Breed; choice: Breed; correct: boolean; photo: BreedPhoto }
type ReviewResult = RoundResult | QuizResult

const MAX_ROUNDS = 8

function dateKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(new Date())
}

function seededShuffle<T>(items: T[], seedText: string): T[] {
  let seed = [...seedText].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 2166136261)
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

function hashText(value: string) {
  return [...value].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 2166136261)
}

const guessIcon = L.divIcon({
  className: 'guess-marker-shell',
  html: '<div class="guess-marker"><span></span></div>',
  iconSize: [38, 48],
  iconAnchor: [19, 43],
})

function ClickHandler({ disabled, onPick }: { disabled: boolean; onPick: (point: Point) => void }) {
  useMapEvents({
    click(event) {
      if (!disabled) onPick({ lat: event.latlng.lat, lng: event.latlng.lng })
    },
  })
  return null
}

function RegionResultBounds({ guess, zone }: { guess: Point; zone: OriginZone }) {
  const map = useMap()
  useEffect(() => {
    const [southWest, northEast] = originZoneBounds(zone)
    const bounds: LatLngBoundsExpression = [
      [Math.min(guess.lat, southWest.lat), Math.min(guess.lng, southWest.lng)],
      [Math.max(guess.lat, northEast.lat), Math.max(guess.lng, northEast.lng)],
    ]
    map.fitBounds(bounds, { padding: [70, 70], maxZoom: 5, animate: true })
  }, [map, guess, zone])
  return null
}

function OriginZoneLayer({ zone }: { zone: OriginZone }) {
  const pathOptions = { color: '#d83291', weight: 3, fillColor: '#f8a8d0', fillOpacity: 0.3, dashArray: '8 7' }
  if (zone.kind === 'circle') return <Circle center={[zone.center.lat, zone.center.lng]} radius={zone.radiusKm * 1000} pathOptions={pathOptions} />
  return <GeoJSON data={zone.geometry as GeoJsonObject} style={() => pathOptions} />
}

function OriginZoneFocus({ zone }: { zone: OriginZone }) {
  const map = useMap()
  useEffect(() => {
    const [southWest, northEast] = originZoneBounds(zone)
    map.fitBounds([[southWest.lat, southWest.lng], [northEast.lat, northEast.lng]], { padding: [55, 55], maxZoom: 6, animate: true })
  }, [map, zone])
  return null
}

function ReviewMapBounds({ points }: { points: Point[] }) {
  const map = useMap()
  useEffect(() => {
    if (!points.length) return
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 4)
      return
    }
    const bounds: LatLngBoundsExpression = points.map(point => [point.lat, point.lng])
    map.fitBounds(bounds, { padding: [58, 58], maxZoom: 4, animate: false })
  }, [map, points])
  return null
}

type MagnificationContextValue = { enabled: boolean; setEnabled: (enabled: boolean) => void }
const MagnificationContext = createContext<MagnificationContextValue>({ enabled: true, setEnabled: () => {} })

function MagnificationToggle() {
  const { enabled, setEnabled } = useContext(MagnificationContext)
  const toggle = () => {
    const next = !enabled
    localStorage.setItem('horseguessr-photo-viewer', next ? 'on' : 'off')
    setEnabled(next)
  }
  return (
    <button className={`magnification-toggle ${enabled ? 'is-on' : ''}`} onClick={toggle} aria-pressed={enabled} title="Turn the full-photo viewer on or off">
      <Maximize2 size={15} /><span>Full view</span><i aria-hidden="true" />
    </button>
  )
}

function MagnifiableImage({ src, alt, loading = 'eager', fallbacks = [] }: { src: string; alt: string; loading?: 'eager' | 'lazy'; fallbacks?: string[] }) {
  const [expanded, setExpanded] = useState(false)
  const [candidateIndex, setCandidateIndex] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const { enabled } = useContext(MagnificationContext)
  const candidates = useMemo(() => [...new Set([src, ...fallbacks, `${import.meta.env.BASE_URL}horses/akhal-teke.jpg`])], [src, fallbacks])
  const activeSrc = candidates[Math.min(candidateIndex, candidates.length - 1)]
  const tryNextPhoto = () => {
    setLoaded(false)
    setCandidateIndex(index => Math.min(index + 1, candidates.length - 1))
  }
  useEffect(() => {
    if (!expanded) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [expanded])
  return (
    <span className={`magnifiable-image ${loaded ? 'is-loaded' : 'is-loading'}`}>
      {!loaded && <span className="photo-loading" aria-hidden="true"><i>♥</i><small>loading horse...</small></span>}
      <img src={activeSrc} alt={alt} loading={loading} onLoad={() => setLoaded(true)} onError={tryNextPhoto} />
      {enabled && <button type="button" className="magnify-hint" onClick={event => { event.preventDefault(); event.stopPropagation(); setExpanded(true) }}><Maximize2 size={13} /> Full view</button>}
      {expanded && enabled && createPortal(
        <div className="magnified-preview magnified-preview--open" role="dialog" aria-modal="true" aria-label={`Full view of ${alt}`} onMouseDown={() => setExpanded(false)}>
          <div className="magnified-preview__frame" onMouseDown={event => event.stopPropagation()}>
            <button type="button" className="magnified-preview__close" onClick={() => setExpanded(false)} aria-label="Close full view"><X size={20} /></button>
            <img src={activeSrc} alt={alt} />
            <small>Full-proportion photo · click outside or press Esc to close</small>
          </div>
        </div>,
        document.body,
      )}
    </span>
  )
}

function SuccessSparkles({ show }: { show: boolean }) {
  if (!show) return null
  return createPortal(
    <div className="success-sparkles" aria-hidden="true">
      {Array.from({ length: 18 }).map((_, index) => {
        const angle = index / 18 * Math.PI * 2
        const distance = 125 + index % 4 * 32
        const style = {
          '--spark-x': `${Math.cos(angle) * distance}px`,
          '--spark-y': `${Math.sin(angle) * distance}px`,
          '--spark-delay': `${index % 4 * 35}ms`,
        } as React.CSSProperties
        return <i key={index} style={style}>{index % 3 === 0 ? '♥' : index % 2 === 0 ? '✦' : '★'}</i>
      })}
      <strong>Perfect! + sparkle power</strong>
    </div>,
    document.body,
  )
}

function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <button className={`brand ${inverse ? 'brand--inverse' : ''}`} onClick={() => window.location.reload()} aria-label="HorseGuessr home">
      <span className="brand-mark" aria-hidden="true"><img src={`${import.meta.env.BASE_URL}horse-head-logo.png`} alt="" /></span>
      <span>Horse<span>Guessr</span></span>
    </button>
  )
}

function BreedBio({ breed }: { breed: Breed }) {
  return (
    <div className="breed-bio">
      <p>{breed.fact}</p>
      <p><b>Identification.</b> {breed.hint}</p>
      <p><b>Historic homeland.</b> {breed.location}, {breed.country}.</p>
    </div>
  )
}

function isQuizResult(result: ReviewResult): result is QuizResult {
  return 'correct' in result
}

function reviewPoint(results: ReviewResult[], index: number): Point {
  const result = results[index]
  const duplicatesBefore = results.slice(0, index).filter(item => item.breed.lat === result.breed.lat && item.breed.lng === result.breed.lng).length
  if (!duplicatesBefore) return { lat: result.breed.lat, lng: result.breed.lng }
  const angle = duplicatesBefore * 2.35
  const radius = 0.28 + duplicatesBefore * 0.12
  return {
    lat: result.breed.lat + Math.sin(angle) * radius,
    lng: result.breed.lng + Math.cos(angle) * radius / Math.max(0.35, Math.cos(result.breed.lat * Math.PI / 180)),
  }
}

function reviewMarkerIcon(result: ReviewResult, index: number, selected: boolean) {
  const outcome = isQuizResult(result) ? (result.correct ? ' review-horse-marker--correct' : ' review-horse-marker--wrong') : ''
  const active = selected ? ' review-horse-marker--selected' : ''
  const status = isQuizResult(result) ? (result.correct ? '✓' : '×') : String(index + 1)
  return L.divIcon({
    className: 'review-marker-shell',
    html: `<div class="review-horse-marker${outcome}${active}"><img src="${result.photo.src}" alt=""><span>${index + 1}</span><i>${status}</i></div>`,
    iconSize: [68, 54],
    iconAnchor: [34, 47],
  })
}

function ResultReviewMap({ results, kind }: { results: ReviewResult[]; kind: 'ride' | 'name' | 'photo' }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const points = useMemo(() => results.map((_, index) => reviewPoint(results, index)), [results])
  const selected = selectedIndex === null ? null : results[selectedIndex]
  const title = kind === 'ride' ? 'Your ride, mapped' : kind === 'photo' ? 'Photo match atlas' : 'Breed quiz atlas'

  return (
    <section className="review-map-section">
      <div className="review-map-heading">
        <div><span>{kind === 'ride' ? 'END-OF-RIDE REVIEW' : 'END-OF-QUIZ REVIEW'}</span><h2>{title}</h2></div>
        <p>Select a numbered horse photo at its homeland to expand the breed card.</p>
      </div>
      <div className="review-map-frame">
        <MapContainer center={[22, 7]} zoom={2} minZoom={1} maxZoom={7} maxBounds={[[-80, -190], [85, 190]]} zoomControl attributionControl worldCopyJump className="map review-map">
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {results.map((result, index) => (
            <Marker
              key={`${result.breed.id}-${index}`}
              position={[points[index].lat, points[index].lng]}
              icon={reviewMarkerIcon(result, index, selectedIndex === index)}
              zIndexOffset={selectedIndex === index ? 1000 : index}
              eventHandlers={{ click: () => setSelectedIndex(index) }}
            >
              <Tooltip direction="top" offset={[0, -39]}>{result.breed.name} · {result.breed.country}</Tooltip>
            </Marker>
          ))}
          <ReviewMapBounds points={points} />
        </MapContainer>
        {selected && (
          <article className="review-map-card" aria-live="polite">
            <button className="review-map-card__close" onClick={() => setSelectedIndex(null)} aria-label="Close breed review"><X size={18} /></button>
            <div className="review-map-card__photo"><MagnifiableImage key={selected.photo.src} src={selected.photo.src} fallbacks={photosForBreed(selected.breed).map(photo => photo.src)} alt={selected.breed.name} /></div>
            <div className="review-map-card__body">
              <span className="review-map-card__index">HORSE {String(selectedIndex! + 1).padStart(2, '0')} · {selected.breed.country}</span>
              <h3>{selected.breed.name}</h3>
              <p className={`review-map-card__outcome ${isQuizResult(selected) ? (selected.correct ? 'is-correct' : 'is-wrong') : ''}`}>
                {isQuizResult(selected)
                  ? (selected.correct ? 'Correctly identified' : `You chose ${selected.choice.name}`)
                  : `${selected.insideRegion ? 'Inside the full-score region' : `${formatNumber(selected.distance)} km from the accepted region`} · ${formatNumber(selected.points)} points`}
              </p>
              <p className="review-map-card__region"><MapPin size={13} /><span><b>Accepted homeland:</b> {originZones[selected.breed.id].label}</span></p>
              <BreedBio breed={selected.breed} />
              <div className="tag-row">{selected.breed.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
              <div className="review-map-card__links"><a href={selected.photo.source} target="_blank" rel="noreferrer">Photo source ↗</a><a href={selected.breed.source} target="_blank" rel="noreferrer">Breed profile ↗</a></div>
            </div>
          </article>
        )}
      </div>
    </section>
  )
}

function Home({ onStart, onPractice, onBreedQuiz, onPhotoQuiz, onGuide }: { onStart: () => void; onPractice: () => void; onBreedQuiz: () => void; onPhotoQuiz: () => void; onGuide: () => void }) {
  const best = Number(localStorage.getItem('horseguessr-best') || 0)
  return (
    <main className="home-screen">
      <nav className="home-nav">
        <Brand inverse />
        <div className="home-nav-actions">
          <MagnificationToggle />
          <button className="text-button" onClick={onGuide}><BookOpen size={17} /> Field guide</button>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-photo" aria-hidden="true">
          <div className="hero-photo__wash" />
          <div className="specimen-label"><span>Today’s specimen</span><strong>01</strong></div>
        </div>
        <div className="hero-copy">
          <div className="club-ticker"><span>★ WELCOME 2 HORSEGUESSR ★ 58 BREEDS ONLINE ★ BEST VIEWED WITH HORSE POWER ★</span></div>
          <div className="y2k-badge"><span>★</span> Horse Club Online <span>★</span></div>
          <p className="eyebrow"><span /> The daily equine geography game</p>
          <h1>From hoofprints<br />to <em>homelands.</em></h1>
          <p className="hero-description">Study the horse. Read the clues in its coat, build, and history. Then pin the breed’s birthplace on the map.</p>
          <div className="hero-actions">
            <button className="primary-button primary-button--large" onClick={onStart}>
              Play today’s ride <ArrowRight size={20} />
            </button>
            <button className="secondary-button secondary-button--large" onClick={onPractice}>
              Practice mode
            </button>
          </div>
          <div className="quiz-launch-grid">
            <button className="quiz-launch" onClick={onBreedQuiz}>
              <span className="quiz-launch__icon"><ListChecks size={22} /></span>
              <span><strong>Name the breed</strong><small>One photo · five breed choices</small></span>
              <span className="quiz-launch__meta">8 questions <ArrowRight size={18} /></span>
            </button>
            <button className="quiz-launch quiz-launch--photos" onClick={onPhotoQuiz}>
              <span className="quiz-launch__icon"><Images size={22} /></span>
              <span><strong>Pick the photo</strong><small>One breed · four horse photos</small></span>
              <span className="quiz-launch__meta">8 questions <ArrowRight size={18} /></span>
            </button>
          </div>
          <div className="daily-meta">
            <div><strong>{MAX_ROUNDS}</strong><span>breeds today</span></div>
            <div><strong>40K</strong><span>max points</span></div>
            <div><strong>{best ? formatNumber(best) : '—'}</strong><span>your best</span></div>
          </div>
        </div>
      </section>

      <section className="how-strip">
        <div className="strip-title"><span>THE ROUTE</span><strong>Three steps.<br />One world.</strong></div>
        {[
          ['01', 'Study', 'Notice the breed’s silhouette, coat, and character.'],
          ['02', 'Place', 'Drop your pin anywhere in the breed’s accepted homeland.'],
          ['03', 'Discover', 'Reveal the full-score region and the breed’s real story.'],
        ].map(([number, title, copy]) => (
          <div className="how-step" key={number}>
            <span>{number}</span><Compass size={24} />
            <strong>{title}</strong><p>{copy}</p>
          </div>
        ))}
      </section>
    </main>
  )
}

function QuizHeader({ round, correct }: { round: number; correct: number }) {
  return (
    <header className="game-header quiz-header">
      <Brand />
      <div className="round-progress">
        <span>Question {round + 1} of {MAX_ROUNDS}</span>
        <div className="progress-track">
          {Array.from({ length: MAX_ROUNDS }).map((_, i) => <i key={i} className={i <= round ? 'active' : ''} />)}
        </div>
      </div>
      <div className="score-box"><span>Correct</span><strong>{correct}</strong><small>/ {MAX_ROUNDS}</small></div>
      <MagnificationToggle />
    </header>
  )
}

function GameHeader({ round, total }: { round: number; total: number }) {
  return (
    <header className="game-header">
      <Brand />
      <div className="round-progress">
        <span>Round {round + 1} of {MAX_ROUNDS}</span>
        <div className="progress-track">
          {Array.from({ length: MAX_ROUNDS }).map((_, i) => <i key={i} className={i <= round ? 'active' : ''} />)}
        </div>
      </div>
      <div className="score-box"><span>Score</span><strong>{formatNumber(total)}</strong><small>/ 40,000</small></div>
      <MagnificationToggle />
    </header>
  )
}

function Game({ mode, onFinish, onExit }: { mode: 'daily' | 'practice'; onFinish: (results: RoundResult[]) => void; onExit: () => void }) {
  const [gameSeed] = useState(() => mode === 'daily' ? dateKey() : `${Date.now()}-${Math.random()}`)
  const roundBreeds = useMemo(() => seededShuffle(breeds, gameSeed).slice(0, MAX_ROUNDS), [gameSeed])
  const [round, setRound] = useState(0)
  const [guess, setGuess] = useState<Point | null>(null)
  const [result, setResult] = useState<RoundResult | null>(null)
  const [results, setResults] = useState<RoundResult[]>([])
  const [hintOpen, setHintOpen] = useState(false)
  const breed = roundBreeds[round]
  const originZone = originZones[breed.id]
  const photoPool = photosForBreed(breed)
  const photoIndex = hashText(`${gameSeed}-${breed.id}-${round}`) % photoPool.length
  const currentPhoto = photoPool[photoIndex]
  const total = results.reduce((sum, item) => sum + item.points, 0)

  const submitGuess = () => {
    if (!guess) return
    const zoneResult = distanceToOriginZone(guess, originZone)
    const distance = Math.round(zoneResult.distance)
    const base = distance === 0 ? 5000 : Math.round(5000 * Math.exp(-distance / 2100))
    const points = Math.max(0, Math.round(base * (hintOpen ? 0.75 : 1)))
    const nextResult = { breed, distance, points, guess, usedHint: hintOpen, photo: currentPhoto, insideRegion: zoneResult.inside, nearest: zoneResult.nearest }
    setResult(nextResult)
    setResults(current => [...current, nextResult])
  }

  const nextRound = () => {
    if (round === MAX_ROUNDS - 1) {
      onFinish(results)
      return
    }
    setRound(value => value + 1)
    setGuess(null)
    setResult(null)
    setHintOpen(false)
  }

  return (
    <main className="game-screen">
      <GameHeader round={round} total={total} />
      <div className="game-stage">
        <section className="breed-panel">
          <div className="breed-panel__topline">
            <span className="mode-pill"><Sparkles size={13} /> {mode === 'daily' ? 'Daily ride' : 'Practice'}</span>
            <button onClick={onExit} className="quiet-button">Exit</button>
          </div>
          <div className="question-copy">
            <span className="question-index">BREED {String(round + 1).padStart(2, '0')}</span>
            <h2>{result ? breed.name : 'Where did this breed originate?'}</h2>
            <p>{result ? `${breed.location}, ${breed.country}` : 'Place your pin on the map.'}</p>
          </div>

          <figure className={`horse-photo ${result ? 'horse-photo--revealed' : ''}`}>
            <MagnifiableImage key={currentPhoto.src} src={currentPhoto.src} fallbacks={photoPool.map(photo => photo.src)} alt={result ? breed.name : 'Mystery horse breed'} />
            <div className="photo-corners" aria-hidden="true"><i /><i /><i /><i /></div>
            {!result && <figcaption>Observe closely <span>•</span> no reverse image search</figcaption>}
            {result && <a href={currentPhoto.source} target="_blank" rel="noreferrer">Image source ↗ · photo {photoIndex + 1} of {photoPool.length}</a>}
          </figure>

          {!result ? (
            <>
              <div className={`hint-card ${hintOpen ? 'hint-card--open' : ''}`}>
                <button onClick={() => setHintOpen(true)} disabled={hintOpen}>
                  <Lightbulb size={18} /><span>{hintOpen ? breed.hint : 'Need a nudge?'}</span><small>{hintOpen ? '−25% score' : 'Reveal hint · −25%'}</small>
                </button>
              </div>
              <button className="primary-button submit-button" disabled={!guess} onClick={submitGuess}>
                {guess ? <><LocateFixed size={19} /> Lock in this location</> : <><MapPin size={19} /> Place a pin to continue</>}
              </button>
            </>
          ) : (
            <div className="reveal-card">
              <div className="score-reveal"><div><span>This round</span><strong>+{formatNumber(result.points)}</strong></div><div><span>To accepted region</span><strong>{result.insideRegion ? 'Inside!' : `${formatNumber(result.distance)} km`}</strong></div></div>
              <div className="region-reveal"><span><CheckCircle2 size={17} /> Full-score homeland</span><strong>{originZone.label}</strong><p>{originZone.note}</p><a href={originZone.sources[0]} target="_blank" rel="noreferrer">View boundary source ↗</a></div>
              <BreedBio breed={breed} />
              <div className="tag-row">{breed.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
              <div className="reveal-actions">
                <a href={breed.source} target="_blank" rel="noreferrer">Learn more ↗</a>
                <button className="primary-button" onClick={nextRound}>{round === MAX_ROUNDS - 1 ? 'See results' : 'Next breed'} <ChevronRight size={18} /></button>
              </div>
            </div>
          )}
        </section>

        <section className="map-wrap" aria-label="World map">
          <MapContainer center={[24, 6]} zoom={2} minZoom={2} maxZoom={7} maxBounds={[[-80, -190], [85, 190]]} zoomControl={true} attributionControl={true} worldCopyJump className="map">
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <ClickHandler disabled={Boolean(result)} onPick={setGuess} />
            {guess && <Marker position={[guess.lat, guess.lng]} icon={guessIcon}><Tooltip direction="top" offset={[0, -36]}>{result ? 'Your guess' : 'Your pin'}</Tooltip></Marker>}
            {result && (
              <>
                <OriginZoneLayer zone={originZone} />
                <CircleMarker center={[breed.lat, breed.lng]} radius={8} pathOptions={{ color: '#fff', weight: 3, fillColor: '#7d57b2', fillOpacity: 1 }}><Tooltip permanent direction="top" offset={[0, -8]}>{breed.location}</Tooltip></CircleMarker>
                {!result.insideRegion && <Polyline positions={[[guess!.lat, guess!.lng], [result.nearest.lat, result.nearest.lng]]} pathOptions={{ color: '#d83291', weight: 3, dashArray: '7 8', opacity: 0.9 }} />}
                <RegionResultBounds guess={guess!} zone={originZone} />
              </>
            )}
          </MapContainer>
          <div className="map-label"><span>{result ? 'FULL-SCORE REGION' : 'SELECT A LOCATION'}</span><strong>{result ? `${originZone.label} · ${result.insideRegion ? 'your pin is inside!' : `${formatNumber(result.distance)} km away`}` : 'Click anywhere on the map to place your pin'}</strong></div>
        </section>
      </div>
      <SuccessSparkles show={Boolean(result?.insideRegion)} />
    </main>
  )
}

function BreedQuiz({ onFinish, onExit }: { onFinish: (results: QuizResult[]) => void; onExit: () => void }) {
  const [gameSeed] = useState(() => `breed-quiz-${Date.now()}-${Math.random()}`)
  const roundBreeds = useMemo(() => seededShuffle(breeds, gameSeed).slice(0, MAX_ROUNDS), [gameSeed])
  const [round, setRound] = useState(0)
  const [choice, setChoice] = useState<Breed | null>(null)
  const [results, setResults] = useState<QuizResult[]>([])
  const breed = roundBreeds[round]
  const originZone = originZones[breed.id]
  const photoPool = photosForBreed(breed)
  const photoIndex = hashText(`${gameSeed}-${breed.id}-${round}`) % photoPool.length
  const currentPhoto = photoPool[photoIndex]
  const options = useMemo(() => {
    const distractors = seededShuffle(breeds.filter(candidate => candidate.id !== breed.id), `${gameSeed}-options-${round}`).slice(0, 4)
    return seededShuffle([breed, ...distractors], `${gameSeed}-positions-${round}`)
  }, [breed, gameSeed, round])
  const correctCount = results.filter(item => item.correct).length
  const answeredCorrectly = choice?.id === breed.id

  const selectBreed = (selected: Breed) => {
    if (choice) return
    const nextResult = { breed, choice: selected, correct: selected.id === breed.id, photo: currentPhoto }
    setChoice(selected)
    setResults(current => [...current, nextResult])
  }

  const nextQuestion = () => {
    if (round === MAX_ROUNDS - 1) {
      onFinish(results)
      return
    }
    setRound(value => value + 1)
    setChoice(null)
  }

  return (
    <main className="game-screen quiz-screen">
      <QuizHeader round={round} correct={correctCount} />
      <div className="game-stage quiz-stage">
        <section className="breed-panel quiz-panel">
          <div className="breed-panel__topline">
            <span className="mode-pill"><ListChecks size={13} /> Breed quiz</span>
            <button onClick={onExit} className="quiet-button">Exit</button>
          </div>
          <div className="question-copy quiz-question-copy">
            <span className="question-index">QUESTION {String(round + 1).padStart(2, '0')}</span>
            <h2>{choice ? (answeredCorrectly ? 'Correct!' : 'Not quite') : 'Which breed is this horse?'}</h2>
            <p>{choice ? `The answer is ${breed.name}.` : 'Choose one of the five breeds below.'}</p>
          </div>

          <figure className={`horse-photo quiz-photo ${choice ? 'horse-photo--revealed' : ''}`}>
            <MagnifiableImage key={currentPhoto.src} src={currentPhoto.src} fallbacks={photoPool.map(photo => photo.src)} alt={choice ? breed.name : 'Mystery horse breed'} />
            <div className="photo-corners" aria-hidden="true"><i /><i /><i /><i /></div>
            {!choice && <figcaption>Study build, coat, head, mane, and proportions</figcaption>}
            {choice && <a href={currentPhoto.source} target="_blank" rel="noreferrer">Image source ↗ · photo {photoIndex + 1} of {photoPool.length}</a>}
          </figure>

          <div className="quiz-options" aria-label="Breed choices">
            {options.map((option, index) => {
              const isCorrect = choice && option.id === breed.id
              const isWrongChoice = choice?.id === option.id && option.id !== breed.id
              const isDimmed = choice && !isCorrect && !isWrongChoice
              return (
                <button
                  className={`quiz-option ${isCorrect ? 'quiz-option--correct' : ''} ${isWrongChoice ? 'quiz-option--wrong' : ''} ${isDimmed ? 'quiz-option--dimmed' : ''}`}
                  key={option.id}
                  onClick={() => selectBreed(option)}
                  disabled={Boolean(choice)}
                  aria-label={`Choice ${index + 1}: ${option.name}`}
                >
                  <span>{String.fromCharCode(65 + index)}</span>
                  <strong>{option.name}</strong>
                  {isCorrect && <CheckCircle2 size={18} aria-label="Correct answer" />}
                  {isWrongChoice && <XCircle size={18} aria-label="Your incorrect choice" />}
                </button>
              )
            })}
          </div>

          {choice && (
            <div className={`quiz-answer ${answeredCorrectly ? 'quiz-answer--correct' : 'quiz-answer--wrong'}`}>
              <div className="quiz-answer__title">
                {answeredCorrectly ? <CheckCircle2 size={21} /> : <XCircle size={21} />}
                <div><span>{answeredCorrectly ? 'You got it' : 'Correct answer'}</span><strong>{breed.name}</strong></div>
              </div>
              <BreedBio breed={breed} />
              <div className="tag-row">{breed.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
              <div className="reveal-actions">
                <a href={breed.source} target="_blank" rel="noreferrer">Learn more ↗</a>
                <button className="primary-button" onClick={nextQuestion}>{round === MAX_ROUNDS - 1 ? 'See quiz results' : 'Next question'} <ChevronRight size={18} /></button>
              </div>
            </div>
          )}
        </section>

        <section className="map-wrap quiz-map-wrap" aria-label="Breed origin map">
          <MapContainer center={[24, 6]} zoom={2} minZoom={2} maxZoom={7} maxBounds={[[-80, -190], [85, 190]]} zoomControl attributionControl worldCopyJump className="map">
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {choice && (
              <>
                <OriginZoneLayer zone={originZone} />
                <CircleMarker center={[breed.lat, breed.lng]} radius={11} pathOptions={{ color: '#fffdf5', weight: 4, fillColor: '#b8472d', fillOpacity: 1 }}>
                  <Tooltip permanent direction="top" offset={[0, -9]}>{breed.location}</Tooltip>
                </CircleMarker>
                <OriginZoneFocus zone={originZone} />
              </>
            )}
          </MapContainer>
          {!choice && <div className="quiz-map-shade" aria-hidden="true"><Compass size={42} /><span>Origin hidden</span><strong>Choose a breed to reveal its homeland</strong></div>}
          <div className="map-label">
            <span>{choice ? 'BREED ORIGIN' : 'ANSWER TO REVEAL'}</span>
            <strong>{choice ? `${originZone.label} · accepted homeland` : 'The origin map appears after your choice'}</strong>
          </div>
        </section>
      </div>
      <SuccessSparkles show={Boolean(choice && answeredCorrectly)} />
    </main>
  )
}

function PhotoQuiz({ onFinish, onExit }: { onFinish: (results: QuizResult[]) => void; onExit: () => void }) {
  const [gameSeed] = useState(() => `photo-quiz-${Date.now()}-${Math.random()}`)
  const roundBreeds = useMemo(() => seededShuffle(breeds, gameSeed).slice(0, MAX_ROUNDS), [gameSeed])
  const [round, setRound] = useState(0)
  const [choice, setChoice] = useState<Breed | null>(null)
  const [results, setResults] = useState<QuizResult[]>([])
  const breed = roundBreeds[round]
  const originZone = originZones[breed.id]
  const photoOptions = useMemo(() => {
    const distractors = seededShuffle(breeds.filter(candidate => candidate.id !== breed.id), `${gameSeed}-photo-options-${round}`).slice(0, 3)
    const optionBreeds = seededShuffle([breed, ...distractors], `${gameSeed}-photo-positions-${round}`)
    return optionBreeds.map((optionBreed, index) => {
      const pool = photosForBreed(optionBreed)
      const photoIndex = hashText(`${gameSeed}-${optionBreed.id}-${round}-${index}`) % pool.length
      return { breed: optionBreed, photo: pool[photoIndex], photoIndex, poolSize: pool.length }
    })
  }, [breed, gameSeed, round])
  const correctOption = photoOptions.find(option => option.breed.id === breed.id)!
  const correctIndex = photoOptions.findIndex(option => option.breed.id === breed.id)
  const correctCount = results.filter(item => item.correct).length
  const answeredCorrectly = choice?.id === breed.id

  const selectPhoto = (selected: Breed) => {
    if (choice) return
    const nextResult = { breed, choice: selected, correct: selected.id === breed.id, photo: correctOption.photo }
    setChoice(selected)
    setResults(current => [...current, nextResult])
  }

  const nextQuestion = () => {
    if (round === MAX_ROUNDS - 1) {
      onFinish(results)
      return
    }
    setRound(value => value + 1)
    setChoice(null)
  }

  return (
    <main className="game-screen quiz-screen photo-quiz-screen">
      <QuizHeader round={round} correct={correctCount} />
      <div className="game-stage photo-quiz-stage">
        <section className="breed-panel photo-quiz-panel">
          <div className="breed-panel__topline">
            <span className="mode-pill"><Images size={13} /> Photo match</span>
            <button onClick={onExit} className="quiet-button">Exit</button>
          </div>
          <div className="question-copy photo-quiz-copy">
            <span className="question-index">QUESTION {String(round + 1).padStart(2, '0')}</span>
            <h2>{choice ? (answeredCorrectly ? 'You found it!' : `${breed.name} was photo ${String.fromCharCode(65 + correctIndex)}.`) : `Find the ${breed.name}`}</h2>
            <p>{choice ? `${breed.location}, ${breed.country}` : 'Which of these four horses is the named breed?'}</p>
          </div>

          <div className="photo-choice-grid" aria-label="Horse photo choices">
            {photoOptions.map((option, index) => {
              const isCorrect = choice && option.breed.id === breed.id
              const isWrongChoice = choice?.id === option.breed.id && option.breed.id !== breed.id
              const isDimmed = choice && !isCorrect && !isWrongChoice
              const letter = String.fromCharCode(65 + index)
              return (
                <div
                  role="button"
                  tabIndex={choice ? -1 : 0}
                  className={`photo-choice ${isCorrect ? 'photo-choice--correct' : ''} ${isWrongChoice ? 'photo-choice--wrong' : ''} ${isDimmed ? 'photo-choice--dimmed' : ''}`}
                  key={option.breed.id}
                  onClick={() => selectPhoto(option.breed)}
                  onKeyDown={event => {
                    if (!choice && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault()
                      selectPhoto(option.breed)
                    }
                  }}
                  aria-disabled={Boolean(choice)}
                  aria-label={`Photo ${letter}${choice ? `: ${option.breed.name}` : ''}`}
                >
                  <MagnifiableImage src={option.photo.src} fallbacks={photosForBreed(option.breed).map(photo => photo.src)} alt={`Horse option ${letter}`} />
                  <span className="photo-choice__letter">{letter}</span>
                  {choice && <span className="photo-choice__name">{option.breed.name}</span>}
                  {isCorrect && <span className="photo-choice__status"><CheckCircle2 size={18} /> Correct</span>}
                  {isWrongChoice && <span className="photo-choice__status"><XCircle size={18} /> Your choice</span>}
                </div>
              )
            })}
          </div>
        </section>

        <section className={`photo-result-pane ${choice ? 'photo-result-pane--revealed' : ''}`} aria-label="Photo match result">
          <div className="map-wrap photo-map-wrap" aria-label="Breed origin map">
            <MapContainer center={[24, 6]} zoom={2} minZoom={2} maxZoom={7} maxBounds={[[-80, -190], [85, 190]]} zoomControl attributionControl worldCopyJump className="map">
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {choice && (
                <>
                  <OriginZoneLayer zone={originZone} />
                  <CircleMarker center={[breed.lat, breed.lng]} radius={11} pathOptions={{ color: '#fffdf5', weight: 4, fillColor: '#b8472d', fillOpacity: 1 }}>
                    <Tooltip permanent direction="top" offset={[0, -9]}>{breed.location}</Tooltip>
                  </CircleMarker>
                  <OriginZoneFocus zone={originZone} />
                </>
              )}
            </MapContainer>
            {!choice && <div className="quiz-map-shade" aria-hidden="true"><Images size={42} /><span>Four photos · one breed</span><strong>Choose the photograph that matches {breed.name}</strong></div>}
            <div className="map-label">
              <span>{choice ? 'BREED ORIGIN' : 'ORIGIN HIDDEN'}</span>
              <strong>{choice ? `${originZone.label} · accepted homeland` : 'The homeland appears after your choice'}</strong>
            </div>
          </div>

          {choice && (
            <article className={`photo-profile ${answeredCorrectly ? 'photo-profile--correct' : 'photo-profile--wrong'}`}>
              <div className="photo-profile__heading">
                {answeredCorrectly ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
                <div><span>{answeredCorrectly ? 'Correct photograph' : 'Correct photograph revealed'}</span><h3>{breed.name}</h3></div>
              </div>
              <BreedBio breed={breed} />
              <div className="tag-row">{breed.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
              <div className="photo-profile__actions">
                <span><a href={correctOption.photo.source} target="_blank" rel="noreferrer">Image source ↗</a><a href={breed.source} target="_blank" rel="noreferrer">Breed profile ↗</a></span>
                <button className="primary-button" onClick={nextQuestion}>{round === MAX_ROUNDS - 1 ? 'See quiz results' : 'Next question'} <ChevronRight size={18} /></button>
              </div>
            </article>
          )}
        </section>
      </div>
      <SuccessSparkles show={Boolean(choice && answeredCorrectly)} />
    </main>
  )
}

function Summary({ results, onReplay, onHome }: { results: RoundResult[]; onReplay: () => void; onHome: () => void }) {
  const total = results.reduce((sum, result) => sum + result.points, 0)
  const best = Math.max(total, Number(localStorage.getItem('horseguessr-best') || 0))
  localStorage.setItem('horseguessr-best', String(best))
  const percentage = Math.round(total / 400)
  const rank = percentage >= 85 ? 'Master Equine Geographer' : percentage >= 65 ? 'Seasoned Trailblazer' : percentage >= 40 ? 'Curious Stablehand' : 'Fresh in the Saddle'
  return (
    <main className="summary-screen">
      <nav className="summary-nav"><Brand inverse /><div className="summary-nav-actions"><MagnificationToggle /><button className="text-button" onClick={onHome}>Back home</button></div></nav>
      <section className="summary-card">
        <div className="summary-title"><span className="medallion"><Trophy size={30} /></span><p className="eyebrow"><span /> Ride complete</p><h1>{rank}</h1><p>You followed eight bloodlines through their accepted homelands.</p></div>
        <div className="summary-score"><span>Final score</span><strong>{formatNumber(total)}</strong><small>out of 40,000</small><div className="score-ring" style={{ '--score': `${percentage}%` } as React.CSSProperties}><span>{percentage}%</span></div></div>
        <ResultReviewMap results={results} kind="ride" />
        <div className="result-list">
          {results.map((result, index) => (
            <div className="result-row" key={result.breed.id}>
              <span>{String(index + 1).padStart(2, '0')}</span><img src={result.photo.src} alt="" />
              <div><strong>{result.breed.name}</strong><small>{result.breed.country} · {result.insideRegion ? 'inside accepted region' : `${formatNumber(result.distance)} km from region`}</small></div>
              <b>{formatNumber(result.points)}</b>
            </div>
          ))}
        </div>
        <div className="summary-actions"><button className="secondary-button" onClick={onHome}>Return home</button><button className="primary-button" onClick={onReplay}><RotateCcw size={18} /> Ride again</button></div>
      </section>
    </main>
  )
}

function QuizSummary({ results, kind, onReplay, onHome }: { results: QuizResult[]; kind: 'name' | 'photo'; onReplay: () => void; onHome: () => void }) {
  const correct = results.filter(result => result.correct).length
  const storageKey = kind === 'photo' ? 'horseguessr-photo-quiz-best' : 'horseguessr-quiz-best'
  const best = Math.max(correct, Number(localStorage.getItem(storageKey) || 0))
  localStorage.setItem(storageKey, String(best))
  const percentage = Math.round((correct / MAX_ROUNDS) * 100)
  const rank = correct === MAX_ROUNDS ? 'Perfect pedigree' : correct >= 6 ? 'Breed connoisseur' : correct >= 4 ? 'Keen horse spotter' : 'Promising stablehand'
  return (
    <main className="summary-screen">
      <nav className="summary-nav"><Brand inverse /><div className="summary-nav-actions"><MagnificationToggle /><button className="text-button" onClick={onHome}>Back home</button></div></nav>
      <section className="summary-card quiz-summary-card">
        <div className="summary-title"><span className="medallion">{kind === 'photo' ? <Images size={29} /> : <ListChecks size={29} />}</span><p className="eyebrow"><span /> {kind === 'photo' ? 'Photo match complete' : 'Breed quiz complete'}</p><h1>{rank}</h1><p>{kind === 'photo' ? 'You matched breed names to photographs' : 'You identified horses'} from a collection of {breeds.length} breeds.</p></div>
        <div className="summary-score"><span>Correct answers</span><strong>{correct} / {MAX_ROUNDS}</strong><small>Personal best: {best}</small><div className="score-ring" style={{ '--score': `${percentage}%` } as React.CSSProperties}><span>{percentage}%</span></div></div>
        <ResultReviewMap results={results} kind={kind} />
        <div className="result-list">
          {results.map((result, index) => (
            <div className="result-row quiz-result-row" key={`${result.breed.id}-${index}`}>
              <span>{String(index + 1).padStart(2, '0')}</span><img src={result.photo.src} alt="" />
              <div><strong>{result.breed.name}</strong><small>{result.correct ? 'Correct' : `You chose ${result.choice.name}`} · {result.breed.country}</small></div>
              <b className={result.correct ? 'quiz-result-correct' : 'quiz-result-wrong'}>{result.correct ? '✓' : '×'}</b>
            </div>
          ))}
        </div>
        <div className="summary-actions"><button className="secondary-button" onClick={onHome}>Return home</button><button className="primary-button" onClick={onReplay}><RotateCcw size={18} /> Try another set</button></div>
      </section>
    </main>
  )
}

function FieldGuide({ onBack }: { onBack: () => void }) {
  const photoCount = breeds.reduce((total, breed) => total + photosForBreed(breed).length, 0)
  return (
    <main className="guide-screen">
      <nav className="summary-nav"><Brand inverse /><div className="summary-nav-actions"><MagnificationToggle /><button className="text-button" onClick={onBack}><ArrowRight className="arrow-back" size={17} /> Back</button></div></nav>
      <section className="guide-heading"><p className="eyebrow"><span /> The field guide</p><h1>Breeds of the world</h1><p>Meet {breeds.length} breeds across {photoCount} photographs—and follow their stories home.</p></section>
      <section className="guide-grid">
        {breeds.map(breed => (
          <article className="guide-card" key={breed.id}>
            <MagnifiableImage src={breed.image} fallbacks={photosForBreed(breed).map(photo => photo.src)} alt={breed.name} loading="lazy" />
            <div><span>{breed.country} · {photosForBreed(breed).length} photos</span><h2>{breed.name}</h2><BreedBio breed={breed} /><a href={breed.source} target="_blank" rel="noreferrer">Open breed profile <ArrowRight size={15} /></a></div>
          </article>
        ))}
      </section>
    </main>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [mode, setMode] = useState<'daily' | 'practice'>('daily')
  const [results, setResults] = useState<RoundResult[]>([])
  const [quizResults, setQuizResults] = useState<QuizResult[]>([])
  const [magnificationEnabled, setMagnificationEnabled] = useState(() => localStorage.getItem('horseguessr-photo-viewer') !== 'off')
  const start = (nextMode: 'daily' | 'practice') => { setMode(nextMode); setResults([]); setScreen('game') }
  let page
  if (screen === 'game') page = <Game mode={mode} onExit={() => setScreen('home')} onFinish={finalResults => { setResults(finalResults); setScreen('summary') }} />
  else if (screen === 'summary') page = <Summary results={results} onReplay={() => start('practice')} onHome={() => setScreen('home')} />
  else if (screen === 'breed-quiz') page = <BreedQuiz onExit={() => setScreen('home')} onFinish={finalResults => { setQuizResults(finalResults); setScreen('quiz-summary') }} />
  else if (screen === 'quiz-summary') page = <QuizSummary kind="name" results={quizResults} onReplay={() => { setQuizResults([]); setScreen('breed-quiz') }} onHome={() => setScreen('home')} />
  else if (screen === 'photo-quiz') page = <PhotoQuiz onExit={() => setScreen('home')} onFinish={finalResults => { setQuizResults(finalResults); setScreen('photo-summary') }} />
  else if (screen === 'photo-summary') page = <QuizSummary kind="photo" results={quizResults} onReplay={() => { setQuizResults([]); setScreen('photo-quiz') }} onHome={() => setScreen('home')} />
  else if (screen === 'guide') page = <FieldGuide onBack={() => setScreen('home')} />
  else page = <Home onStart={() => start('daily')} onPractice={() => start('practice')} onBreedQuiz={() => { setQuizResults([]); setScreen('breed-quiz') }} onPhotoQuiz={() => { setQuizResults([]); setScreen('photo-quiz') }} onGuide={() => setScreen('guide')} />
  return <MagnificationContext.Provider value={{ enabled: magnificationEnabled, setEnabled: setMagnificationEnabled }}>{page}</MagnificationContext.Provider>
}
