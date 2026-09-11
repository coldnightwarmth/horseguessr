import { Children, createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Circle, CircleMarker, GeoJSON, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L, { LatLngBoundsExpression } from 'leaflet'
import type { GeoJsonObject } from 'geojson'
import { ArrowRight, BookHeart, BookOpen, CheckCircle2, ChevronRight, Compass, Heart, Images, Lightbulb, ListChecks, LocateFixed, MapPin, Maximize2, RotateCcw, Sparkles, Trophy, X, XCircle } from 'lucide-react'
import { Breed, breeds } from './data'
import { fetchLeaderboard, LeaderboardResult, submitLeaderboardScore } from './firebase'
import { BreedPhoto, photosForBreed } from './media'
import { distanceToOriginZone, OriginZone, originZoneBounds, originZones } from './originRegions'
import { cookieNames, readCookie, readFavoriteIds, readPersonalBest, sanitizeInitials, updatePersonalBest, writeCookie, writeFavoriteIds } from './preferences'

type Point = { lat: number; lng: number }
type Screen = 'home' | 'game' | 'summary' | 'guide' | 'favorites' | 'breed-quiz' | 'quiz-summary' | 'photo-quiz' | 'photo-summary'
type RoundResult = { breed: Breed; distance: number; points: number; guess: Point; usedHint: boolean; photo: BreedPhoto; insideRegion: boolean; nearest: Point }
type QuizResult = { breed: Breed; choice: Breed; correct: boolean; photo: BreedPhoto }
type ReviewResult = RoundResult | QuizResult

const MAX_ROUNDS = 8

function dateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(date)
}

function useCentralClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15_000)
    return () => window.clearInterval(timer)
  }, [])
  const timeParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(now)
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(timeParts.find(item => item.type === type)?.value || 0)
  const secondsRemaining = 86_400 - (part('hour') * 3600 + part('minute') * 60 + part('second'))
  const hours = Math.floor(secondsRemaining / 3600)
  const minutes = Math.floor((secondsRemaining % 3600) / 60)
  return { key: dateKey(now), resetIn: `${hours}h ${String(minutes).padStart(2, '0')}m` }
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

const nudgeOverrides: Record<string, string> = {
  'ljutomer-trotter': 'Look for a balanced light-harness build, clean legs, and an efficient, even trotting action.',
  'cape-boerperd': 'A tough, comfortable riding horse selected for stamina, sure-footedness, and an even temperament.',
  nonius: 'Usually dark, substantial, and Roman-nosed, with the power and bone of a traditional harness horse.',
  gidran: 'Traditionally chestnut, refined but strong, with a recognizable cavalry and Anglo-Arabian stamp.',
  'furioso-north-star': 'A sturdy, athletic warmblood with strong Thoroughbred influence and a versatile riding-horse frame.',
  'kisber-felver': 'An elegant, light-framed half-bred with long athletic lines and a strong Thoroughbred influence.',
  hucul: 'A compact mountain horse with primitive markings, hard feet, and remarkable sure-footedness.',
  konik: 'A small mouse-dun horse with a dark dorsal stripe and a hardy, primitive appearance.',
  yakutian: 'A compact horse with an extraordinarily dense winter coat and extreme tolerance for cold.',
  caspian: 'Tiny but horse-proportioned, with refined limbs and head rather than the heavy build of a pony.',
  kathiawari: 'A desert-adapted riding horse whose inward-curving ears may meet at the tips.',
  sorraia: 'Typically dun or grullo, with a dorsal stripe, dark points, and a narrow primitive frame.',
  'dales-pony': 'A powerful pack pony, usually black, with abundant mane, tail, and lower-leg feather.',
  bardigiano: 'A compact, dark-coated mountain horse with a sturdy body and notably strong feet.',
  maremmano: 'A rugged stock horse with a substantial frame, tough feet, and a practical working build.',
  nordlandshest: 'A small, versatile horse with a compact body, abundant mane, and hardy all-purpose type.',
  'gotland-russ': 'A small forest pony with a lean, hardy frame and a talent for both riding and harness.',
  noriker: 'A sure-footed heavy horse that can appear in dramatic leopard-spotted as well as solid coats.',
  'cleveland-bay': 'Always bay, substantial but active, with clean legs and the frame of a traditional coach horse.',
  giara: 'A small, hardy horse with a coarse mane, strong feet, and a compact semi-feral type.',
  garrano: 'A small, dark, sure-footed mountain horse with a thick mane and primitive, hardy build.',
  'kerry-bog-pony': 'A compact pony bred to carry loads across soft ground, with strong bone and a calm nature.',
  camargue: 'A compact gray horse, born dark, with a sturdy body and the agility of a working cattle mount.',
  poitevin: 'A large, shaggy draft horse with heavy bone, abundant hair, and a notably calm expression.',
  morgan: 'A compact breed with an expressive head, arched neck, deep body, and famously consistent type.',
  finnhorse: 'A hardy all-rounder combining trotting ability, pulling strength, and a dependable temperament.',
  knabstrupper: 'A baroque riding horse best known for dramatic leopard-spotted coats and visible mottling.',
  'black-forest': 'A compact draft horse with a dark chestnut body and a striking flaxen mane and tail.',
}

function nudgeForBreed(breed: Breed) {
  return nudgeOverrides[breed.id] ?? breed.hint
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

function MapResizeSync() {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false, debounceMoveend: true }))
    observer.observe(container)
    return () => observer.disconnect()
  }, [map])
  return null
}

function ResizableStage({ className = '', storageKey, defaultPercent, children }: { className?: string; storageKey: string; defaultPercent: number; children: React.ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null)
  const panes = Children.toArray(children)
  const [split, setSplit] = useState(() => {
    const saved = Number(localStorage.getItem(`horseguessr-split-${storageKey}`))
    return Number.isFinite(saved) && saved >= 28 && saved <= 72 ? saved : defaultPercent
  })
  const splitRef = useRef(split)
  const draggingRef = useRef(false)

  const applySplit = (next: number, persist = false) => {
    const clamped = Math.min(72, Math.max(28, next))
    splitRef.current = clamped
    setSplit(clamped)
    if (persist) localStorage.setItem(`horseguessr-split-${storageKey}`, clamped.toFixed(1))
  }

  const updateFromPointer = (clientX: number) => {
    const bounds = stageRef.current?.getBoundingClientRect()
    if (!bounds || bounds.width === 0) return
    applySplit((clientX - bounds.left) / bounds.width * 100)
  }

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    draggingRef.current = false
    event.currentTarget.releasePointerCapture(event.pointerId)
    localStorage.setItem(`horseguessr-split-${storageKey}`, splitRef.current.toFixed(1))
  }

  return (
    <div ref={stageRef} className={`game-stage resizable-stage ${className}`} style={{ '--split-percent': `${split}%` } as React.CSSProperties}>
      {panes[0]}
      <div
        className="split-divider"
        role="separator"
        aria-label="Resize horse panel and map"
        aria-orientation="vertical"
        aria-valuemin={28}
        aria-valuemax={72}
        aria-valuenow={Math.round(split)}
        tabIndex={0}
        title="Drag to resize · double-click to reset"
        onPointerDown={event => {
          draggingRef.current = true
          event.currentTarget.setPointerCapture(event.pointerId)
          updateFromPointer(event.clientX)
        }}
        onPointerMove={event => { if (draggingRef.current) updateFromPointer(event.clientX) }}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onDoubleClick={() => applySplit(defaultPercent, true)}
        onKeyDown={event => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
          event.preventDefault()
          applySplit(splitRef.current + (event.key === 'ArrowLeft' ? -2 : 2), true)
        }}
      >
        <span aria-hidden="true"><i /><i /><i /></span>
      </div>
      {panes[1]}
    </div>
  )
}

type MagnificationContextValue = { enabled: boolean; setEnabled: (enabled: boolean) => void }
const MagnificationContext = createContext<MagnificationContextValue>({ enabled: true, setEnabled: () => {} })

type FavoritesContextValue = { favoriteIds: string[]; toggleFavorite: (breedId: string) => void }
const FavoritesContext = createContext<FavoritesContextValue>({ favoriteIds: [], toggleFavorite: () => {} })

function FavoriteButton({ breed }: { breed: Breed }) {
  const { favoriteIds, toggleFavorite } = useContext(FavoritesContext)
  const favorite = favoriteIds.includes(breed.id)
  return (
    <button
      type="button"
      className={`favorite-heart ${favorite ? 'is-favorite' : ''}`}
      onClick={event => { event.preventDefault(); event.stopPropagation(); toggleFavorite(breed.id) }}
      aria-pressed={favorite}
      aria-label={`${favorite ? 'Remove' : 'Add'} ${breed.name} ${favorite ? 'from' : 'to'} favorite breeds`}
      title={favorite ? 'Remove from favorite breeds' : 'Add to favorite breeds'}
    >
      <Heart size={18} fill={favorite ? 'currentColor' : 'none'} />
    </button>
  )
}

function BreedName({ breed }: { breed: Breed }) {
  return <span className="breed-name-with-heart"><span>{breed.name}</span><FavoriteButton breed={breed} /></span>
}

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
  const related = breed.relatedBreedIds
    .map(id => breeds.find(candidate => candidate.id === id))
    .filter((candidate): candidate is Breed => Boolean(candidate))
  return (
    <div className="breed-bio">
      <p>{breed.fact}</p>
      <p><b>Identification.</b> {breed.hint}</p>
      <p><b>Historic homeland.</b> <span className="country-flag" role="img" aria-label={`Primary country flag for ${breed.country}`}>{breed.flag}</span> {breed.location}, {breed.country}.</p>
      <p><b>Common coats.</b> {breed.coatColors}</p>
      {related.length > 0 && (
        <div className="related-breeds">
          <b>Related or similar breeds.</b>
          <span>{related.map(item => item.name).join(' · ')}</span>
        </div>
      )}
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
          <MapResizeSync />
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
              <h3><BreedName breed={selected.breed} /></h3>
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

function HorseDetailsModal({ breed, photo, onClose }: { breed: Breed; photo: BreedPhoto; onClose: () => void }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])
  return createPortal(
    <div className="modal-backdrop horse-day-backdrop" role="dialog" aria-modal="true" aria-label={`${breed.name} horse of the day`} onMouseDown={onClose}>
      <article className="horse-day-card" onMouseDown={event => event.stopPropagation()}>
        <button className="horse-day-card__close" onClick={onClose} aria-label="Close horse of the day"><X size={20} /></button>
        <div className="horse-day-card__photo"><MagnifiableImage src={photo.src} fallbacks={photosForBreed(breed).map(item => item.src)} alt={breed.name} /></div>
        <div className="horse-day-card__body">
          <span>♥ HORSE OF THE DAY ♥</span>
          <h2><BreedName breed={breed} /></h2>
          <BreedBio breed={breed} />
          <div className="tag-row">{breed.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
          <div className="horse-day-card__links"><a href={photo.source} target="_blank" rel="noreferrer">Photo source ↗</a><a href={breed.source} target="_blank" rel="noreferrer">Breed profile ↗</a></div>
        </div>
      </article>
    </div>,
    document.body,
  )
}

function LeaderboardPanel({ score, dayKey, allowEntry = false }: { score?: number; dayKey?: string; allowEntry?: boolean }) {
  const [board, setBoard] = useState<LeaderboardResult>({ entries: [], backend: 'local' })
  const [loading, setLoading] = useState(true)
  const [initials, setInitials] = useState(() => sanitizeInitials(readCookie(cookieNames.initials)))
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    fetchLeaderboard().then(result => {
      if (active) { setBoard(result); setLoading(false) }
    })
    return () => { active = false }
  }, [])

  const cutoff = board.entries[9]?.score ?? -1
  const qualifies = allowEntry && typeof score === 'number' && (board.entries.length < 10 || score > cutoff)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!dayKey || initials.length < 2 || typeof score !== 'number') return
    setSaving(true)
    writeCookie(cookieNames.initials, initials)
    const updated = await submitLeaderboardScore(initials, score, dayKey)
    setBoard(updated)
    setSubmitted(true)
    setSaving(false)
  }

  return (
    <section className="leaderboard-panel">
      <div className="leaderboard-heading"><span><Trophy size={17} /> HIGH SCORE CORRAL</span><strong>Top 10 riders</strong><small>{board.backend === 'firebase' ? 'Live worldwide board' : 'Device preview board'}</small></div>
      {qualifies && !submitted && (
        <form className="initials-form" onSubmit={submit}>
          <div><b>You made the top 10!</b><span>Enter 2–3 initials to hang your ribbon.</span></div>
          <label><span>Initials</span><input value={initials} onChange={event => setInitials(sanitizeInitials(event.target.value))} minLength={2} maxLength={3} autoComplete="off" placeholder="PON" /></label>
          <button className="primary-button" disabled={initials.length < 2 || saving}>{saving ? 'Saving…' : 'Post score'}</button>
        </form>
      )}
      {submitted && <p className="leaderboard-success">✦ Score posted! Your initials are saved for next time. ✦</p>}
      <ol className="leaderboard-list">
        {loading && <li className="leaderboard-empty">Loading the ribbon board…</li>}
        {!loading && !board.entries.length && <li className="leaderboard-empty">No ribbons yet—be the first rider on the board!</li>}
        {board.entries.map((entry, index) => <li key={entry.id}><span>{index + 1}</span><b>{entry.initials}</b><strong>{formatNumber(entry.score)}</strong><small>{entry.dayKey}</small></li>)}
      </ol>
      {board.note && <p className="leaderboard-note">{board.note}</p>}
    </section>
  )
}

function CookieNotice() {
  const [visible, setVisible] = useState(() => readCookie(cookieNames.cookieNotice) !== 'ok')
  if (!visible) return null
  const dismiss = () => { writeCookie(cookieNames.cookieNotice, 'ok'); setVisible(false) }
  return (
    <aside className="cookie-notice">
      <span>🍪</span><p><b>Stable cookies!</b> HorseGuessr saves your initials, personal record, daily try, and favorite breeds on this device.</p>
      <button onClick={dismiss}>Okay!</button>
    </aside>
  )
}

function Home({ dailyKey, dailyLocked, resetIn, onStart, onPractice, onBreedQuiz, onPhotoQuiz, onGuide, onFavorites }: { dailyKey: string; dailyLocked: boolean; resetIn: string; onStart: () => void; onPractice: () => void; onBreedQuiz: () => void; onPhotoQuiz: () => void; onGuide: () => void; onFavorites: () => void }) {
  const best = readPersonalBest()
  const [horseOpen, setHorseOpen] = useState(false)
  const dailyHorse = useMemo(() => seededShuffle(breeds, `horse-of-day-${dailyKey}`)[0], [dailyKey])
  const dailyPhoto = useMemo(() => {
    const pool = photosForBreed(dailyHorse)
    return pool[hashText(`horse-of-day-photo-${dailyKey}`) % pool.length]
  }, [dailyHorse, dailyKey])
  const photoCount = breeds.reduce((total, breed) => total + photosForBreed(breed).length, 0)
  return (
    <main className="home-screen">
      <nav className="home-nav">
        <Brand inverse />
        <div className="home-nav-actions">
          <MagnificationToggle />
          <button className="text-button" onClick={onFavorites}><BookHeart size={17} /> Favorites</button>
          <button className="text-button" onClick={onGuide}><BookOpen size={17} /> Field guide</button>
        </div>
      </nav>

      <section className="hero">
        <button className="hero-photo" onClick={() => setHorseOpen(true)} aria-label={`Reveal today's horse: ${dailyHorse.name}`}>
          <img src={dailyPhoto.src} alt="Today’s featured horse" />
          <span className="hero-photo__wash" />
          <span className="specimen-label"><span>Click to meet today’s horse</span><strong>♥</strong></span>
        </button>
        <div className="hero-copy">
          <div className="club-ticker"><span>★ WELCOME 2 HORSEGUESSR ★ {breeds.length} BREEDS + {photoCount} PHOTOS ONLINE ★ BEST VIEWED WITH HORSE POWER ★</span></div>
          <div className="y2k-badge"><span>★</span> Horse Club Online <span>★</span></div>
          <p className="eyebrow"><span /> The daily equine geography game</p>
          <h1>From hoofprints<br />to <em>homelands.</em></h1>
          <p className="hero-description">Study the horse. Read the clues in its coat, build, and history. Then pin the breed’s birthplace on the map.</p>
          <div className="hero-actions">
            <button className="primary-button primary-button--large" onClick={onStart} disabled={dailyLocked}>
              {dailyLocked ? 'Today’s ride completed' : 'Play today’s ride'} {!dailyLocked && <ArrowRight size={20} />}
            </button>
            <button className="secondary-button secondary-button--large" onClick={onPractice}>
              Practice mode
            </button>
          </div>
          <div className="quiz-launch-grid">
            <button className="quiz-launch" onClick={onBreedQuiz}>
              <span className="quiz-launch__icon"><ListChecks size={22} /></span>
              <span><strong>Name the breed</strong><small>One photo · four breed choices</small></span>
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
          <p className="daily-reset">{dailyLocked ? `Next daily ride in ${resetIn}` : `One daily try · resets at 12:00 AM Central · ${dailyKey}`}</p>
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
      <LeaderboardPanel />
      {horseOpen && <HorseDetailsModal breed={dailyHorse} photo={dailyPhoto} onClose={() => setHorseOpen(false)} />}
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
      <ResizableStage storageKey="origin" defaultPercent={40}>
        <section className="breed-panel">
          <div className="breed-panel__topline">
            <span className="mode-pill"><Sparkles size={13} /> {mode === 'daily' ? 'Daily ride' : 'Practice'}</span>
            <button onClick={onExit} className="quiet-button">Exit</button>
          </div>
          <div className="question-copy">
            <span className="question-index">BREED {String(round + 1).padStart(2, '0')}</span>
            <h2>{result ? <BreedName breed={breed} /> : 'Where did this breed originate?'}</h2>
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
                  <Lightbulb size={18} /><span>{hintOpen ? nudgeForBreed(breed) : 'Need a nudge?'}</span><small>{hintOpen ? '−25% score' : 'Reveal hint · −25%'}</small>
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
            <MapResizeSync />
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
      </ResizableStage>
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
    const distractors = seededShuffle(breeds.filter(candidate => candidate.id !== breed.id), `${gameSeed}-options-${round}`).slice(0, 3)
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
      <ResizableStage className="quiz-stage" storageKey="breed-quiz" defaultPercent={46}>
        <section className="breed-panel quiz-panel">
          <div className="breed-panel__topline">
            <span className="mode-pill"><ListChecks size={13} /> Breed quiz</span>
            <button onClick={onExit} className="quiet-button">Exit</button>
          </div>
          <div className="question-copy quiz-question-copy">
            <span className="question-index">QUESTION {String(round + 1).padStart(2, '0')}</span>
            <h2>{choice ? (answeredCorrectly ? 'Correct!' : 'Not quite') : 'Which breed is this horse?'}</h2>
            <p>{choice ? `The answer is ${breed.name}.` : 'Choose one of the four breeds below.'}</p>
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
                <div><span>{answeredCorrectly ? 'You got it' : 'Correct answer'}</span><strong><BreedName breed={breed} /></strong></div>
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
            <MapResizeSync />
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
      </ResizableStage>
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
      <ResizableStage className="photo-quiz-stage" storageKey="photo-quiz" defaultPercent={55}>
        <section className="breed-panel photo-quiz-panel">
          <div className="breed-panel__topline">
            <span className="mode-pill"><Images size={13} /> Photo match</span>
            <button onClick={onExit} className="quiet-button">Exit</button>
          </div>
          <div className="question-copy photo-quiz-copy">
            <span className="question-index">QUESTION {String(round + 1).padStart(2, '0')}</span>
            <h2>{choice ? (answeredCorrectly ? 'You found it!' : <><BreedName breed={breed} /> was photo {String.fromCharCode(65 + correctIndex)}.</>) : <>Find the <BreedName breed={breed} /></>}</h2>
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
              <MapResizeSync />
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
                <div><span>{answeredCorrectly ? 'Correct photograph' : 'Correct photograph revealed'}</span><h3><BreedName breed={breed} /></h3></div>
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
      </ResizableStage>
      <SuccessSparkles show={Boolean(choice && answeredCorrectly)} />
    </main>
  )
}

function Summary({ results, mode, dayKey, onReplay, onHome }: { results: RoundResult[]; mode: 'daily' | 'practice'; dayKey: string; onReplay: () => void; onHome: () => void }) {
  const total = results.reduce((sum, result) => sum + result.points, 0)
  const [best] = useState(() => Math.max(total, readPersonalBest()))
  useEffect(() => { updatePersonalBest(total) }, [total])
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
              <div><strong><BreedName breed={result.breed} /></strong><small>{result.breed.country} · {result.insideRegion ? 'inside accepted region' : `${formatNumber(result.distance)} km from region`}</small></div>
              <b>{formatNumber(result.points)}</b>
            </div>
          ))}
        </div>
        <LeaderboardPanel score={total} dayKey={dayKey} allowEntry={mode === 'daily'} />
        <p className="personal-best-ribbon">Your personal record: <b>{formatNumber(best)}</b> points</p>
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
              <div><strong><BreedName breed={result.breed} /></strong><small>{result.correct ? 'Correct' : `You chose ${result.choice.name}`} · {result.breed.country}</small></div>
              <b className={result.correct ? 'quiz-result-correct' : 'quiz-result-wrong'}>{result.correct ? '✓' : '×'}</b>
            </div>
          ))}
        </div>
        <div className="summary-actions"><button className="secondary-button" onClick={onHome}>Return home</button><button className="primary-button" onClick={onReplay}><RotateCcw size={18} /> Try another set</button></div>
      </section>
    </main>
  )
}

function BreedCollection({ shownBreeds, title, eyebrow, emptyCopy, onBack }: { shownBreeds: Breed[]; title: string; eyebrow: string; emptyCopy?: string; onBack: () => void }) {
  const photoCount = shownBreeds.reduce((total, breed) => total + photosForBreed(breed).length, 0)
  return (
    <main className="guide-screen">
      <nav className="summary-nav"><Brand inverse /><div className="summary-nav-actions"><MagnificationToggle /><button className="text-button" onClick={onBack}><ArrowRight className="arrow-back" size={17} /> Back</button></div></nav>
      <section className="guide-heading"><p className="eyebrow"><span /> {eyebrow}</p><h1>{title}</h1><p>{shownBreeds.length ? `Meet ${shownBreeds.length} breeds across ${photoCount} photographs—and follow their stories home.` : emptyCopy}</p></section>
      <section className="guide-grid">
        {shownBreeds.map(breed => (
          <article className="guide-card" key={breed.id}>
            <MagnifiableImage src={breed.image} fallbacks={photosForBreed(breed).map(photo => photo.src)} alt={breed.name} loading="lazy" />
            <div><span>{breed.country} · {photosForBreed(breed).length} photos</span><h2><BreedName breed={breed} /></h2><BreedBio breed={breed} /><a href={breed.source} target="_blank" rel="noreferrer">Open breed profile <ArrowRight size={15} /></a></div>
          </article>
        ))}
      </section>
    </main>
  )
}

function FieldGuide({ onBack }: { onBack: () => void }) {
  return <BreedCollection shownBreeds={breeds} eyebrow="The field guide" title="Breeds of the world" onBack={onBack} />
}

function FavoriteBreeds({ onBack }: { onBack: () => void }) {
  const { favoriteIds } = useContext(FavoritesContext)
  const favorites = breeds.filter(breed => favoriteIds.includes(breed.id))
  return <BreedCollection shownBreeds={favorites} eyebrow="Your cookie-saved stable" title="Favorite breeds" emptyCopy="Your stable is empty. Tap the heart after any breed name to add it here." onBack={onBack} />
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [mode, setMode] = useState<'daily' | 'practice'>('daily')
  const [results, setResults] = useState<RoundResult[]>([])
  const [quizResults, setQuizResults] = useState<QuizResult[]>([])
  const [magnificationEnabled, setMagnificationEnabled] = useState(() => localStorage.getItem('horseguessr-photo-viewer') !== 'off')
  const [favoriteIds, setFavoriteIds] = useState(readFavoriteIds)
  const [dailyAttemptKey, setDailyAttemptKey] = useState(() => readCookie(cookieNames.dailyAttempt))
  const centralClock = useCentralClock()
  const dailyLocked = dailyAttemptKey === centralClock.key
  const toggleFavorite = (breedId: string) => {
    setFavoriteIds(current => {
      const next = current.includes(breedId) ? current.filter(id => id !== breedId) : [...current, breedId]
      writeFavoriteIds(next)
      return next
    })
  }
  const start = (nextMode: 'daily' | 'practice') => {
    if (nextMode === 'daily') {
      if (dailyLocked) return
      writeCookie(cookieNames.dailyAttempt, centralClock.key)
      setDailyAttemptKey(centralClock.key)
    }
    setMode(nextMode)
    setResults([])
    setScreen('game')
  }
  let page
  if (screen === 'game') page = <Game mode={mode} onExit={() => setScreen('home')} onFinish={finalResults => { setResults(finalResults); setScreen('summary') }} />
  else if (screen === 'summary') page = <Summary results={results} mode={mode} dayKey={mode === 'daily' ? dailyAttemptKey : centralClock.key} onReplay={() => start('practice')} onHome={() => setScreen('home')} />
  else if (screen === 'breed-quiz') page = <BreedQuiz onExit={() => setScreen('home')} onFinish={finalResults => { setQuizResults(finalResults); setScreen('quiz-summary') }} />
  else if (screen === 'quiz-summary') page = <QuizSummary kind="name" results={quizResults} onReplay={() => { setQuizResults([]); setScreen('breed-quiz') }} onHome={() => setScreen('home')} />
  else if (screen === 'photo-quiz') page = <PhotoQuiz onExit={() => setScreen('home')} onFinish={finalResults => { setQuizResults(finalResults); setScreen('photo-summary') }} />
  else if (screen === 'photo-summary') page = <QuizSummary kind="photo" results={quizResults} onReplay={() => { setQuizResults([]); setScreen('photo-quiz') }} onHome={() => setScreen('home')} />
  else if (screen === 'guide') page = <FieldGuide onBack={() => setScreen('home')} />
  else if (screen === 'favorites') page = <FavoriteBreeds onBack={() => setScreen('home')} />
  else page = <Home dailyKey={centralClock.key} dailyLocked={dailyLocked} resetIn={centralClock.resetIn} onStart={() => start('daily')} onPractice={() => start('practice')} onBreedQuiz={() => { setQuizResults([]); setScreen('breed-quiz') }} onPhotoQuiz={() => { setQuizResults([]); setScreen('photo-quiz') }} onGuide={() => setScreen('guide')} onFavorites={() => setScreen('favorites')} />
  return (
    <MagnificationContext.Provider value={{ enabled: magnificationEnabled, setEnabled: setMagnificationEnabled }}>
      <FavoritesContext.Provider value={{ favoriteIds, toggleFavorite }}>
        {page}
        <CookieNotice />
      </FavoritesContext.Provider>
    </MagnificationContext.Provider>
  )
}
