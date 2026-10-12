import { Children, createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Circle, CircleMarker, GeoJSON, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L, { LatLngBoundsExpression } from 'leaflet'
import type { GeoJsonObject } from 'geojson'
import { ArrowRight, Award, Ban, BookHeart, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Compass, Flag, Heart, Images, Lightbulb, ListChecks, LocateFixed, LockKeyhole, LogIn, LogOut, MapPin, Maximize2, RotateCcw, Search, Share2, ShieldCheck, Sparkles, Star, Trophy, UserRound, UserRoundPlus, X, XCircle } from 'lucide-react'
import { AccountSnapshot, adminLogin, BANNED_ACCOUNT_MESSAGE, checkAccountBanned, fetchAdminAccounts, fetchPublicProfile, isBannedAccountError, loginAccount, logoutAccount, PlayerAccount, PublicProfile, registerAccount, restoreAccount, saveAccountProgress, setAdminAccountBanned, validateUsername } from './accounts'
import { Breed, breeds } from './data'
import { AtlasPlace, lookupAtlasPlace, nearestBreedOrigins, NearbyBreed } from './atlas'
import { expansionBreedIds } from './breedExpansion'
import { fetchLeaderboard, fetchPhotoQualityReports, FirebaseSession, LeaderboardResult, PhotoQualityReport, PhotoReportReason, recordBreedFavorite, recordPhotoQualityReport, submitLeaderboardScore } from './firebase'
import { normalizeGuideText, suggestBreedName } from './guideSearch'
import { horseQuotes } from './horseQuotes'
import { BreedPhoto, photosForBreed } from './media'
import { distanceToOriginZone, OriginZone, originZoneBounds, originZones } from './originRegions'
import { breedsForPracticeRegion, pointsForOriginGuess, practiceRegions, PracticeRegionId } from './practiceRegions'
import { cookieNames, readCookie, readFavoriteIds, readPassportIds, readPersonalBest, readTopFavoriteIds, sanitizeInitials, updatePersonalBest, writeCookie, writeFavoriteIds, writePassportIds, writeTopFavoriteIds } from './preferences'

type Point = { lat: number; lng: number }
type Screen = 'home' | 'practice-picker' | 'game' | 'summary' | 'guide' | 'favorites' | 'passport' | 'breed-quiz' | 'quiz-summary' | 'photo-quiz' | 'photo-summary' | 'profile'
type RoundResult = { breed: Breed; distance: number; points: number; guess: Point; usedHint: boolean; photo: BreedPhoto; insideRegion: boolean; nearest: Point }
type QuizResult = { breed: Breed; choice: Breed; correct: boolean; photo: BreedPhoto }
type ReviewResult = RoundResult | QuizResult

const MAX_ROUNDS = 8

// Keep the already-published September 19 daily puzzle (and featured horse)
// unchanged for players on either side of the new Mexican breed deployment.
function dailyBreedPool(day: string) {
  if (day < '2026-09-20') return breeds.filter(breed => breed.id !== 'azteca-horse' && !expansionBreedIds.includes(breed.id))
  if (day < '2026-09-25') return breeds.filter(breed => !expansionBreedIds.includes(breed.id))
  return breeds
}

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

function rideShareText(results: RoundResult[], total: number, dayKey: string, label: string, placement: LeaderboardPlacement | null) {
  const trail = results.map(result => result.insideRegion ? '🌟' : result.points >= 4000 ? '💖' : result.points >= 2500 ? '💗' : result.points >= 1000 ? '💙' : '🤍').join('')
  const ribbon = placement ? `\nNew ${placement.backend === 'firebase' ? 'worldwide' : 'device'} ranking: #${placement.rank} (${placement.initials})` : ''
  return `HorseGuessr · ${label} · ${dayKey}\n${trail}\n${formatNumber(total)} / 40,000 points${ribbon}`
}

type LeaderboardPlacement = { rank: number; initials: string; backend: 'firebase' | 'local' }

function hashText(value: string) {
  return [...value].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 2166136261)
}

function usePrefetchImages(urls: string[]) {
  const signature = urls.join('\n')
  useEffect(() => {
    if (!signature) return
    const preloaded = signature.split('\n').map(src => {
      const image = new window.Image()
      image.decoding = 'async'
      image.src = src
      return image
    })
    return () => { preloaded.forEach(image => { image.src = '' }) }
  }, [signature])
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

type FavoritesContextValue = { favoriteIds: string[]; topFavoriteIds: string[]; toggleFavorite: (breedId: string) => void; toggleTopFavorite: (breedId: string) => void }
const FavoritesContext = createContext<FavoritesContextValue>({ favoriteIds: [], topFavoriteIds: [], toggleFavorite: () => {}, toggleTopFavorite: () => {} })

type PassportContextValue = { passportIds: string[]; awardPassportMedal: (breedId: string) => void }
const PassportContext = createContext<PassportContextValue>({ passportIds: [], awardPassportMedal: () => {} })

type AccountContextValue = {
  account: PlayerAccount | null
  openAuth: (mode: 'login' | 'signup') => void
  signOut: () => void
  openProfile: (uid: string) => void
}
const AccountContext = createContext<AccountContextValue>({ account: null, openAuth: () => {}, signOut: () => {}, openProfile: () => {} })

function AccountButtons() {
  const { account, openAuth, signOut, openProfile } = useContext(AccountContext)
  if (account) {
    return <div className="account-nav-buttons"><button className="text-button account-profile-button" onClick={() => openProfile(account.uid)}><UserRound size={17} /> {account.username}</button><button className="text-button account-signout-button" onClick={signOut} title="Log out"><LogOut size={17} /> Log out</button></div>
  }
  return <div className="account-nav-buttons"><button className="text-button account-login-button" onClick={() => openAuth('login')}><LogIn size={17} /> Log in</button><button className="text-button account-signup-button" onClick={() => openAuth('signup')}><UserRoundPlus size={17} /> Sign up</button></div>
}

function AccountModal({ mode: initialMode, snapshot, onClose, onSuccess }: { mode: 'login' | 'signup'; snapshot: AccountSnapshot; onClose: () => void; onSuccess: (account: PlayerAccount) => void }) {
  const [mode, setMode] = useState(initialMode)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (mode === 'signup') {
      const usernameError = validateUsername(username)
      if (usernameError) { setError(usernameError); return }
    }
    setSaving(true)
    setError('')
    try {
      const account = mode === 'signup'
        ? await registerAccount(username, email, password, snapshot)
        : await loginAccount(email, password, snapshot)
      onSuccess(account)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The stable door would not open. Please try again.')
    } finally {
      setSaving(false)
    }
  }
  return createPortal(
    <div className="modal-backdrop account-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="account-modal" role="dialog" aria-modal="true" aria-labelledby="account-modal-title" onMouseDown={event => event.stopPropagation()}>
        <button className="account-modal__close" onClick={onClose} aria-label="Close account window"><X size={20} /></button>
        <div className="account-modal__crest"><span>★</span><UserRound size={34} /><span>★</span></div>
        <p className="account-modal__kicker">HORSEGUESSR RIDER CLUB</p>
        <h2 id="account-modal-title">{mode === 'signup' ? 'Create your rider account' : 'Welcome back, rider!'}</h2>
        <p>{mode === 'signup' ? 'Your current favorites, medals, and best scores will come with you.' : 'Log in to bring your saved stable and records onto this browser.'}</p>
        <form onSubmit={submit}>
          {mode === 'signup' && <label htmlFor="account-username"><span>Username</span><input id="account-username" value={username} onChange={event => setUsername(event.target.value.toLowerCase())} minLength={3} maxLength={20} autoComplete="username" placeholder="pony_pal" required /><small>3–20 lowercase letters, numbers, or underscores. Keep it horse-club friendly.</small></label>}
          <label htmlFor="account-email"><span>Email</span><input id="account-email" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" placeholder="rider@example.com" required /></label>
          <label htmlFor="account-password"><span>Password</span><input id="account-password" type="password" value={password} onChange={event => setPassword(event.target.value)} minLength={8} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder="At least 8 characters" required /></label>
          {error && <p className="account-form-error" role="alert">{error}</p>}
          <button className="primary-button" disabled={saving}>{saving ? 'Opening the stable…' : mode === 'signup' ? 'Create account' : 'Log in'} <ArrowRight size={18} /></button>
        </form>
        <button className="account-mode-switch" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError('') }}>{mode === 'signup' ? 'Already a member? Log in' : 'New rider? Sign up'}</button>
        <small className="account-privacy-note"><LockKeyhole size={13} /> Email stays private. Passwords are handled by Firebase Authentication and are never readable by HorseGuessr.</small>
      </section>
    </div>, document.body,
  )
}

function AccountStatusNotice({ message, onClose }: { message: string; onClose: () => void }) {
  return createPortal(
    <div className="modal-backdrop account-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="account-modal account-status-modal" role="alertdialog" aria-modal="true" aria-labelledby="account-status-title" onMouseDown={event => event.stopPropagation()}>
        <div className="account-modal__crest account-status-modal__crest"><span>×</span><Ban size={34} /><span>×</span></div>
        <p className="account-modal__kicker">RIDER ACCOUNT NOTICE</p>
        <h2 id="account-status-title">Account banned</h2>
        <p>{message}</p>
        <button className="primary-button" onClick={onClose}>Okay</button>
      </section>
    </div>,
    document.body,
  )
}

function AccountInvitation() {
  const { account, openAuth } = useContext(AccountContext)
  if (account) return null
  return (
    <section className="account-invitation">
      <span className="account-invitation__icon"><UserRoundPlus size={27} /></span>
      <div><small>KEEP THIS RIDE</small><h2>Save your stable and scores</h2><p>Create an optional account to carry favorites, medals, and records between browsers.</p></div>
      <div><button className="primary-button" onClick={() => openAuth('signup')}>Sign up</button><button className="secondary-button" onClick={() => openAuth('login')}>Log in</button></div>
    </section>
  )
}

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

function TopFavoriteButton({ breed }: { breed: Breed }) {
  const { topFavoriteIds, toggleTopFavorite } = useContext(FavoritesContext)
  const topFavorite = topFavoriteIds.includes(breed.id)
  return (
    <button
      type="button"
      className={`top-favorite-star ${topFavorite ? 'is-top-favorite' : ''}`}
      onClick={event => { event.preventDefault(); event.stopPropagation(); toggleTopFavorite(breed.id) }}
      aria-pressed={topFavorite}
      aria-label={`${topFavorite ? 'Remove' : 'Add'} ${breed.name} ${topFavorite ? 'from' : 'to'} top favorites`}
      title={topFavorite ? 'Remove from top favorites' : 'Make a top favorite'}
    >
      <Star size={18} fill={topFavorite ? 'currentColor' : 'none'} />
    </button>
  )
}

function BreedName({ breed, showTopFavorite = false }: { breed: Breed; showTopFavorite?: boolean }) {
  return <span className="breed-name-with-heart"><span>{breed.name}</span><FavoriteButton breed={breed} />{showTopFavorite && <TopFavoriteButton breed={breed} />}</span>
}

function PassportMedal({ breed }: { breed: Breed }) {
  const { passportIds } = useContext(PassportContext)
  if (!passportIds.includes(breed.id)) return null
  return <span className="passport-earned-medal" title="Correctly identified · Passport medal earned" aria-label="Passport medal earned"><Award size={19} /></span>
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

const photoReportOptions: Array<{ value: PhotoReportReason; label: string }> = [
  { value: 'not-loading', label: 'Photo will not load' },
  { value: 'horse-too-small', label: 'Horse is too small or distant' },
  { value: 'person-visible', label: 'A person is prominent' },
  { value: 'not-color-photo', label: 'Drawing, sepia, or black-and-white' },
  { value: 'wrong-breed', label: 'Wrong breed or misleading photo' },
  { value: 'other', label: 'Other quality problem' },
]

function PhotoViewer({ photos, startSrc, alt, breedId, onClose }: { photos: BreedPhoto[]; startSrc: string; alt: string; breedId?: string; onClose: () => void }) {
  const uniquePhotos = useMemo(() => photos.filter((photo, index) => photos.findIndex(item => item.src === photo.src) === index), [photos])
  const [photoIndex, setPhotoIndex] = useState(() => Math.max(0, uniquePhotos.findIndex(photo => photo.src === startSrc)))
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState<number[]>([])
  const [reportOpen, setReportOpen] = useState(false)
  const [reportStatus, setReportStatus] = useState('')
  const current = uniquePhotos[photoIndex] ?? uniquePhotos[0]
  const move = (direction: number) => {
    if (uniquePhotos.length < 2) return
    setLoaded(false)
    setReportOpen(false)
    setReportStatus('')
    setPhotoIndex(index => (index + direction + uniquePhotos.length) % uniquePhotos.length)
  }
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') move(-1)
      if (event.key === 'ArrowRight') move(1)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })
  if (!current) return null
  const photoUnavailable = failed.length >= uniquePhotos.length
  const handleError = () => {
    setFailed(items => items.includes(photoIndex) ? items : [...items, photoIndex])
    const next = uniquePhotos.findIndex((_, index) => index !== photoIndex && !failed.includes(index))
    if (next >= 0) { setLoaded(false); setPhotoIndex(next) }
  }
  const submitReport = async (reason: PhotoReportReason) => {
    if (!breedId) return
    setReportOpen(false)
    setReportStatus('Saving…')
    const photoUrl = new URL(current.src, window.location.href).href
    const result = await recordPhotoQualityReport(breedId, photoUrl, reason)
    setReportStatus(result === 'sent' ? 'Thanks—report sent!' : 'Saved—will send when online.')
  }
  return createPortal(
    <div className="magnified-preview magnified-preview--open" role="dialog" aria-modal="true" aria-label={`Photo gallery for ${alt}`} onMouseDown={onClose}>
      <div className="magnified-preview__frame" onMouseDown={event => event.stopPropagation()}>
        <button type="button" className="magnified-preview__close" onClick={onClose} aria-label="Close photo gallery"><X size={20} /></button>
        <div className="magnified-preview__media">
          {!loaded && !photoUnavailable && <span className="photo-loading" aria-hidden="true"><i>♥</i><small>loading horse...</small></span>}
          {photoUnavailable
            ? <p className="magnified-preview__error">This photo set is resting right now. Please try again later.</p>
            : <img key={current.src} src={current.src} alt={`${alt}, photo ${photoIndex + 1} of ${uniquePhotos.length}`} onLoad={() => setLoaded(true)} onError={handleError} />}
        </div>
        {uniquePhotos.length > 1 && <>
          <button type="button" className="gallery-arrow gallery-arrow--previous" onClick={() => move(-1)} aria-label="Previous horse photo"><ChevronLeft size={28} /></button>
          <button type="button" className="gallery-arrow gallery-arrow--next" onClick={() => move(1)} aria-label="Next horse photo"><ChevronRight size={28} /></button>
        </>}
        <div className="photo-gallery-bar">
          <strong>{alt}</strong>
          <span>{photoIndex + 1} / {uniquePhotos.length}</span>
          {current.source && <a href={current.source} target="_blank" rel="noreferrer">Photo source ↗</a>}
          {breedId && (
            <div className="photo-report-wrap">
              <button type="button" className="photo-report-button" onClick={() => { setReportOpen(value => !value); setReportStatus('') }} aria-expanded={reportOpen}><Flag size={12} /> Report photo</button>
              {reportOpen && (
                <div className="photo-report-menu" role="menu" aria-label="Report a photo quality problem">
                  <b>What should we check?</b>
                  {photoReportOptions.map(option => <button type="button" role="menuitem" key={option.value} onClick={() => void submitReport(option.value)}>{option.label}</button>)}
                </div>
              )}
              {reportStatus && <small className="photo-report-status" role="status">{reportStatus}</small>}
            </div>
          )}
        </div>
        <small>Use the arrows or keyboard · one photo at a time · Esc closes</small>
      </div>
    </div>,
    document.body,
  )
}

function MagnifiableImage({ src, alt, breedId, loading = 'eager', fallbacks = [], photos = [] }: { src: string; alt: string; breedId?: string; loading?: 'eager' | 'lazy'; fallbacks?: string[]; photos?: BreedPhoto[] }) {
  const [expanded, setExpanded] = useState(false)
  const [candidateIndex, setCandidateIndex] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const { enabled } = useContext(MagnificationContext)
  const candidates = useMemo(() => [...new Set([src, ...photos.map(photo => photo.src), ...fallbacks, `${import.meta.env.BASE_URL}horses/akhal-teke.jpg`])], [src, fallbacks, photos])
  const activeSrc = candidates[Math.min(candidateIndex, candidates.length - 1)]
  const gallery = useMemo(() => {
    const supplied = photos.length ? photos : candidates.map(candidate => ({ src: candidate, source: '' }))
    return supplied.filter((photo, index) => supplied.findIndex(item => item.src === photo.src) === index)
  }, [photos, candidates])
  const tryNextPhoto = () => {
    setLoaded(false)
    setCandidateIndex(index => Math.min(index + 1, candidates.length - 1))
  }
  return (
    <span className={`magnifiable-image ${loaded ? 'is-loaded' : 'is-loading'}`}>
      {!loaded && <span className="photo-loading" aria-hidden="true"><i>♥</i><small>loading horse...</small></span>}
      <img src={activeSrc} alt={alt} loading={loading} onLoad={() => setLoaded(true)} onError={tryNextPhoto} />
      {enabled && <button type="button" className="magnify-hint" onClick={event => { event.preventDefault(); event.stopPropagation(); setExpanded(true) }}><Maximize2 size={13} /> Full view</button>}
      {expanded && enabled && <PhotoViewer photos={gallery} startSrc={activeSrc} alt={alt} breedId={breedId} onClose={() => setExpanded(false)} />}
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
      <strong>Perfect!</strong>
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
            <div className="review-map-card__photo"><MagnifiableImage key={selected.photo.src} src={selected.photo.src} photos={photosForBreed(selected.breed)} fallbacks={photosForBreed(selected.breed).map(photo => photo.src)} alt={selected.breed.name} breedId={selected.breed.id} /></div>
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
        <div className="horse-day-card__photo"><MagnifiableImage src={photo.src} photos={photosForBreed(breed)} fallbacks={photosForBreed(breed).map(item => item.src)} alt={breed.name} breedId={breed.id} /></div>
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

function LeaderboardPanel({ score, dayKey, allowEntry = false, onPlacement }: { score?: number; dayKey?: string; allowEntry?: boolean; onPlacement?: (placement: LeaderboardPlacement) => void }) {
  const { openProfile } = useContext(AccountContext)
  const [board, setBoard] = useState<LeaderboardResult>({ entries: [], backend: 'local' })
  const [loading, setLoading] = useState(true)
  const [initials, setInitials] = useState(() => sanitizeInitials(readCookie(cookieNames.initials)))
  const [submitted, setSubmitted] = useState(false)
  const [postedRank, setPostedRank] = useState<number | null>(null)
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
    const rank = updated.entries.findIndex(entry => entry.id === updated.submittedId) + 1
    if (rank > 0) {
      setPostedRank(rank)
      onPlacement?.({ rank, initials, backend: updated.backend })
    }
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
      {submitted && <p className="leaderboard-success">✦ {board.backend === 'firebase' ? 'Score posted!' : 'Score saved on this device!'} Your initials are saved for next time. ✦{postedRank && <button type="button" onClick={() => document.querySelector('.shareable-result-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>See your new #{postedRank} ribbon ↑</button>}</p>}
      <ol className="leaderboard-list">
        {loading && <li className="leaderboard-empty">Loading the ribbon board…</li>}
        {!loading && !board.entries.length && <li className="leaderboard-empty">No ribbons yet—be the first rider on the board!</li>}
        {board.entries.map((entry, index) => <li key={entry.id}><span>{index + 1}</span>{entry.uid ? <button className="leaderboard-profile-link" onClick={() => openProfile(entry.uid)} title="Open rider profile"><b>{entry.initials}</b><UserRound size={13} /></button> : <b>{entry.initials}</b>}<strong>{formatNumber(entry.score)}</strong><small>{entry.dayKey}</small></li>)}
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
      <span>🍪</span><p><b>Stable cookies!</b> HorseGuessr saves your initials, records, passport medals, and favorite breeds on this device. An optional account can sync them.</p>
      <button onClick={dismiss}>Okay!</button>
    </aside>
  )
}

function Home({ dailyKey, dailyLocked, resetIn, onStart, onPractice, onBreedQuiz, onPhotoQuiz, onGuide, onFavorites, onPassport }: { dailyKey: string; dailyLocked: boolean; resetIn: string; onStart: () => void; onPractice: () => void; onBreedQuiz: () => void; onPhotoQuiz: () => void; onGuide: () => void; onFavorites: () => void; onPassport: () => void }) {
  const best = readPersonalBest()
  const [horseOpen, setHorseOpen] = useState(false)
  const dailyHorse = useMemo(() => seededShuffle(dailyBreedPool(dailyKey), `horse-of-day-${dailyKey}`)[0], [dailyKey])
  const dailyPhoto = useMemo(() => {
    const pool = photosForBreed(dailyHorse)
    return pool[hashText(`horse-of-day-photo-${dailyKey}`) % pool.length]
  }, [dailyHorse, dailyKey])
  const dailyQuote = useMemo(() => horseQuotes[hashText(`horse-quote-${dailyKey}`) % horseQuotes.length], [dailyKey])
  const photoCount = breeds.reduce((total, breed) => total + photosForBreed(breed).length, 0)
  return (
    <main className="home-screen">
      <nav className="home-nav">
        <Brand inverse />
        <div className="home-nav-actions">
          <MagnificationToggle />
          <button className="text-button" onClick={onPassport}><Award size={17} /> Passport</button>
          <button className="text-button" onClick={onFavorites}><BookHeart size={17} /> Favorites</button>
          <button className="text-button" onClick={onGuide}><BookOpen size={17} /> Field guide</button>
          <AccountButtons />
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
          <h1>Hoofprints<br />to <em>homelands</em></h1>
          <p className="hero-description">Study the horse. Read the clues in its coat, build, and history. Then pin the breed’s birthplace on the map.</p>
          <p className="ride-launch-label">✦ THE MAIN RIDES ✦</p>
          <div className="hero-actions">
            <button className="primary-button primary-button--large" onClick={onStart} disabled={dailyLocked}>
              {dailyLocked ? 'Today’s ride completed' : 'Play today’s ride'} {dailyLocked ? <CheckCircle2 size={20} /> : <ArrowRight size={20} />}
            </button>
            <button className="secondary-button secondary-button--large" onClick={onPractice}>
              Practice mode <ArrowRight size={20} />
            </button>
          </div>
          <p className="quiz-launch-label">MORE WAYS TO PLAY</p>
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

      <section className="daily-quote" aria-labelledby="daily-quote-title">
        <div className="daily-quote__sparkles" aria-hidden="true">✦ ⋆｡°✩ ✦</div>
        <div className="daily-quote__label"><span>♥</span><strong id="daily-quote-title">Today’s horse quote</strong><span>♥</span></div>
        <blockquote>“{dailyQuote.text}”</blockquote>
        <p>— {dailyQuote.author}, <cite>{dailyQuote.work}</cite></p>
        <a href={dailyQuote.source} target="_blank" rel="noreferrer">Read the source ↗</a>
      </section>

      <section className="how-strip">
        <div className="strip-title"><span>THE ROUTE</span><strong>Follow the clues.<br />Find the homeland.</strong></div>
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
      <footer className="home-footer">
        <div className="home-footer__intro"><span>✦ HORSE CLUB DIRECTORY ✦</span><h2>Keep exploring the stable</h2></div>
        <nav className="home-footer__links" aria-label="Explore HorseGuessr">
          <button onClick={onPassport}><Award size={27} /><span><strong>Passport</strong><small>See the breeds you’ve identified and your medals.</small></span><ArrowRight size={20} /></button>
          <button onClick={onFavorites}><BookHeart size={27} /><span><strong>Favorites</strong><small>Revisit the horses you’ve saved with a heart.</small></span><ArrowRight size={20} /></button>
          <button onClick={onGuide}><BookOpen size={27} /><span><strong>Field guide</strong><small>Browse every breed, photo, bio, and homeland.</small></span><ArrowRight size={20} /></button>
        </nav>
        <p className="home-footer__signoff">♥ HORSEGUESSR HORSE CLUB ♥</p>
      </footer>
      {horseOpen && <HorseDetailsModal breed={dailyHorse} photo={dailyPhoto} onClose={() => setHorseOpen(false)} />}
    </main>
  )
}

function PracticePicker({ onChoose, onBack }: { onChoose: (region: PracticeRegionId) => void; onBack: () => void }) {
  const regions = Object.entries(practiceRegions) as [PracticeRegionId, typeof practiceRegions[PracticeRegionId]][]
  return (
    <main className="practice-picker-screen">
      <nav className="summary-nav"><Brand inverse /><button className="text-button" onClick={onBack}><ChevronLeft size={17} /> Back home</button></nav>
      <section className="practice-picker-board">
        <span className="practice-picker-kicker">✦ CHOOSE YOUR TRAIL ✦</span>
        <h1>Where shall we ride?</h1>
        <p>Eight mystery horses per ride. Each trail draws only from its listed homeland pool, and distance points are tuned to that trail’s size. Any pin inside the breed’s accepted origin region still earns full points.</p>
        <div className="practice-region-grid">
          {regions.map(([id, region]) => (
            <button key={id} className={`practice-region-card practice-region-card--${id}`} onClick={() => onChoose(id)}>
              <span className="practice-region-card__badge" aria-hidden="true">{region.badge}</span>
              <span className="practice-region-card__copy"><small>{region.kicker}</small><strong>{region.label}</strong><span>{region.description}</span><em>{breedsForPracticeRegion(id, breeds).length} breeds in this stable</em></span>
              <ArrowRight size={22} aria-hidden="true" />
            </button>
          ))}
        </div>
        <small className="practice-picker-note">Turan follows a broad horse-culture corridor, so some breeds may appear on both the Europe and Turan trails. Practice rides do not use your one daily try.</small>
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

function GameHeader({ round, total, trail }: { round: number; total: number; trail: string }) {
  return (
    <header className="game-header">
      <Brand />
      <div className="round-progress">
        <span>{trail} · Round {round + 1} of {MAX_ROUNDS}</span>
        <div className="progress-track">
          {Array.from({ length: MAX_ROUNDS }).map((_, i) => <i key={i} className={i <= round ? 'active' : ''} />)}
        </div>
      </div>
      <div className="score-box"><span>Score</span><strong>{formatNumber(total)}</strong><small>/ 40,000</small></div>
      <MagnificationToggle />
    </header>
  )
}

function PracticeMapFocus({ region }: { region: PracticeRegionId }) {
  const map = useMap()
  useEffect(() => {
    const bounds = practiceRegions[region].mapBounds
    if (bounds) map.fitBounds(bounds, { padding: [25, 25], animate: false })
  }, [map, region])
  return null
}

function Game({ mode, practiceRegion, onFinish, onExit }: { mode: 'daily' | 'practice'; practiceRegion: PracticeRegionId; onFinish: (results: RoundResult[]) => void; onExit: () => void }) {
  const activeRegion = mode === 'daily' ? 'world' : practiceRegion
  const [gameSeed] = useState(() => mode === 'daily' ? dateKey() : `${Date.now()}-${Math.random()}`)
  const roundBreeds = useMemo(() => seededShuffle(mode === 'daily' ? dailyBreedPool(gameSeed) : breedsForPracticeRegion(activeRegion, breeds), gameSeed).slice(0, MAX_ROUNDS), [activeRegion, gameSeed, mode])
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
  const nextPhotoUrls = useMemo(() => {
    const nextBreed = roundBreeds[round + 1]
    return nextBreed ? photosForBreed(nextBreed).map(photo => photo.src) : []
  }, [roundBreeds, round])

  usePrefetchImages(nextPhotoUrls)
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }) }, [round])

  const submitGuess = () => {
    if (!guess) return
    const zoneResult = distanceToOriginZone(guess, originZone)
    const distance = Math.round(zoneResult.distance)
    const points = pointsForOriginGuess(distance, activeRegion, hintOpen)
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
      <GameHeader round={round} total={total} trail={mode === 'daily' ? 'Today’s ride' : practiceRegions[practiceRegion].label} />
      <ResizableStage storageKey="origin" defaultPercent={40}>
        <section className="breed-panel">
          <div className="breed-panel__topline">
            <span className="mode-pill"><Sparkles size={13} /> {mode === 'daily' ? 'Daily ride' : `${practiceRegions[practiceRegion].label} practice`}</span>
            <button onClick={onExit} className="quiet-button">Exit</button>
          </div>
          <div className="question-copy">
            <span className="question-index">BREED {String(round + 1).padStart(2, '0')}</span>
            <h2>{result ? <BreedName breed={breed} /> : 'Where did this breed originate?'}</h2>
            <p>{result ? `${breed.location}, ${breed.country}` : 'Place your pin on the map.'}</p>
          </div>

          <figure className={`horse-photo ${result ? 'horse-photo--revealed' : ''}`}>
            <MagnifiableImage key={currentPhoto.src} src={currentPhoto.src} photos={photoPool} fallbacks={photoPool.map(photo => photo.src)} alt={result ? breed.name : 'Mystery horse breed'} breedId={breed.id} />
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
            {!result && <PracticeMapFocus region={activeRegion} />}
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
  const { awardPassportMedal } = useContext(PassportContext)
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
  const nextPhotoUrls = useMemo(() => {
    const nextBreed = roundBreeds[round + 1]
    return nextBreed ? photosForBreed(nextBreed).map(photo => photo.src) : []
  }, [roundBreeds, round])

  usePrefetchImages(nextPhotoUrls)
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }) }, [round])

  const selectBreed = (selected: Breed) => {
    if (choice) return
    const nextResult = { breed, choice: selected, correct: selected.id === breed.id, photo: currentPhoto }
    if (nextResult.correct) awardPassportMedal(breed.id)
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
            <MagnifiableImage key={currentPhoto.src} src={currentPhoto.src} photos={photoPool} fallbacks={photoPool.map(photo => photo.src)} alt={choice ? breed.name : 'Mystery horse breed'} breedId={breed.id} />
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
  const { awardPassportMedal } = useContext(PassportContext)
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
  const nextPhotoUrls = useMemo(() => {
    const nextRound = round + 1
    const nextBreed = roundBreeds[nextRound]
    if (!nextBreed) return []
    const distractors = seededShuffle(breeds.filter(candidate => candidate.id !== nextBreed.id), `${gameSeed}-photo-options-${nextRound}`).slice(0, 3)
    const optionBreeds = seededShuffle([nextBreed, ...distractors], `${gameSeed}-photo-positions-${nextRound}`)
    return optionBreeds.flatMap((optionBreed, index) => {
      const pool = photosForBreed(optionBreed)
      const selectedIndex = hashText(`${gameSeed}-${optionBreed.id}-${nextRound}-${index}`) % pool.length
      return [pool[selectedIndex].src, ...pool.filter((_, photoIndex) => photoIndex !== selectedIndex).slice(0, 1).map(photo => photo.src)]
    })
  }, [gameSeed, round, roundBreeds])

  usePrefetchImages(nextPhotoUrls)
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }) }, [round])

  const selectPhoto = (selected: Breed) => {
    if (choice) return
    const nextResult = { breed, choice: selected, correct: selected.id === breed.id, photo: correctOption.photo }
    if (nextResult.correct) awardPassportMedal(breed.id)
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
                  <MagnifiableImage src={option.photo.src} photos={photosForBreed(option.breed)} fallbacks={photosForBreed(option.breed).map(photo => photo.src)} alt={`Horse option ${letter}`} breedId={option.breed.id} />
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

function ShareableResultCard({ date, label, rank, score, maximum, rounds, placement, newBest, shareText }: { date: string; label: string; rank: string; score: string; maximum: string; rounds: { value: string; fraction: number }[]; placement?: LeaderboardPlacement | null; newBest?: boolean; shareText: string }) {
  const [shareStatus, setShareStatus] = useState('')
  const prettyDate = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))
  const shareResult = async () => {
    const url = new URL(import.meta.env.BASE_URL, window.location.origin).href
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My HorseGuessr results', text: shareText, url })
        setShareStatus('Results shared!')
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${url}`)
        setShareStatus('Result copied!')
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setShareStatus('Sharing is unavailable in this browser; you can still screenshot the card.')
    }
  }
  return (
    <section className="shareable-result-section" aria-label="Shareable results">
      <div className="shareable-result-intro"><div><span>✦ YOUR SHAREABLE RIBBON ✦</span><h2>A little brag.</h2></div><p>Screenshot the card below to share your ride.</p></div>
      <div className="shareable-result-card">
        <div className="shareable-result-card__mast"><span className="shareable-result-card__brand">♞ HORSEGUESSR</span><span>★ HORSE CLUB RESULTS ★</span></div>
        <div className="shareable-result-card__headline"><span>{label} · {prettyDate}</span><h3>{rank}</h3><p>Eight horses. One excellent ride. ✦</p></div>
        <div className="shareable-result-card__score"><span>FINAL SCORE</span><strong>{score}</strong><small>/ {maximum}</small></div>
        <div className="shareable-result-card__rounds" aria-label="Scores by round">
          {rounds.map((round, index) => <div key={index} className="shareable-result-card__round"><span>{String(index + 1).padStart(2, '0')}</span><i style={{ '--round-fill': `${Math.round(round.fraction * 100)}%` } as React.CSSProperties} /><b>{round.value}</b></div>)}
        </div>
        {(placement || newBest) && <div className="shareable-result-card__ribbons">{newBest && <span>✧ NEW PERSONAL BEST ✧</span>}{placement && <span>🏆 NEW #{placement.rank} {placement.backend === 'firebase' ? 'WORLDWIDE' : 'DEVICE'} RANK · {placement.initials}</span>}</div>}
        <div className="shareable-result-card__footer"><span>RIDE RESULTS · READY TO SHARE</span><span>horseguessr ★</span></div>
      </div>
      <div className="shareable-result-controls"><span>Tip: screenshot this card to share your ribbon as an image.</span><button className="secondary-button share-result-button" onClick={() => void shareResult()}><Share2 size={18} /> Copy / share text</button></div>
      {shareStatus && <p className="share-status" role="status">{shareStatus}</p>}
    </section>
  )
}

function Summary({ results, mode, practiceRegion, dayKey, onReplay, onHome }: { results: RoundResult[]; mode: 'daily' | 'practice'; practiceRegion: PracticeRegionId; dayKey: string; onReplay: () => void; onHome: () => void }) {
  const total = results.reduce((sum, result) => sum + result.points, 0)
  const [previousBest] = useState(readPersonalBest)
  const [placement, setPlacement] = useState<LeaderboardPlacement | null>(null)
  const best = Math.max(total, previousBest)
  useEffect(() => { updatePersonalBest(total) }, [total])
  const percentage = Math.round(total / 400)
  const rank = percentage >= 85 ? 'Master Equine Geographer' : percentage >= 65 ? 'Seasoned Trailblazer' : percentage >= 40 ? 'Curious Stablehand' : 'Fresh in the Saddle'
  const label = mode === 'daily' ? 'Today’s Ride' : `${practiceRegions[practiceRegion].label} Practice`
  return (
    <main className="summary-screen">
      <nav className="summary-nav"><Brand inverse /><div className="summary-nav-actions"><MagnificationToggle /><button className="text-button" onClick={onHome}>Back home</button></div></nav>
      <section className="summary-card">
        <div className="summary-title"><span className="medallion"><Trophy size={30} /></span><p className="eyebrow"><span /> Ride complete</p><h1>{rank}</h1><p>You followed eight bloodlines through their accepted homelands.</p></div>
        <div className="summary-score"><span>Final score</span><strong>{formatNumber(total)}</strong><small>out of 40,000</small><div className="score-ring" style={{ '--score': `${percentage}%` } as React.CSSProperties}><span>{percentage}%</span></div></div>
        <ShareableResultCard date={dayKey} label={label} rank={rank} score={formatNumber(total)} maximum="40,000" rounds={results.map(result => ({ value: formatNumber(result.points), fraction: result.points / 5000 }))} placement={placement} newBest={total > previousBest} shareText={rideShareText(results, total, dayKey, label, placement)} />
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
        <LeaderboardPanel score={total} dayKey={dayKey} allowEntry={mode === 'daily'} onPlacement={setPlacement} />
        <p className="personal-best-ribbon">Your personal record: <b>{formatNumber(best)}</b> points</p>
        <AccountInvitation />
        <div className="summary-actions"><button className="secondary-button" onClick={onHome}>Return home</button><button className="primary-button" onClick={onReplay}><RotateCcw size={18} /> Ride again</button></div>
      </section>
    </main>
  )
}

function QuizSummary({ results, kind, onReplay, onHome }: { results: QuizResult[]; kind: 'name' | 'photo'; onReplay: () => void; onHome: () => void }) {
  const correct = results.filter(result => result.correct).length
  const storageKey = kind === 'photo' ? 'horseguessr-photo-quiz-best' : 'horseguessr-quiz-best'
  const [previousBest] = useState(() => Number(localStorage.getItem(storageKey) || 0))
  const best = Math.max(correct, previousBest)
  useEffect(() => { localStorage.setItem(storageKey, String(best)) }, [storageKey, best])
  const percentage = Math.round((correct / MAX_ROUNDS) * 100)
  const rank = correct === MAX_ROUNDS ? 'Perfect pedigree' : correct >= 6 ? 'Breed connoisseur' : correct >= 4 ? 'Keen horse spotter' : 'Promising stablehand'
  return (
    <main className="summary-screen">
      <nav className="summary-nav"><Brand inverse /><div className="summary-nav-actions"><MagnificationToggle /><button className="text-button" onClick={onHome}>Back home</button></div></nav>
      <section className="summary-card quiz-summary-card">
        <div className="summary-title"><span className="medallion">{kind === 'photo' ? <Images size={29} /> : <ListChecks size={29} />}</span><p className="eyebrow"><span /> {kind === 'photo' ? 'Photo match complete' : 'Breed quiz complete'}</p><h1>{rank}</h1><p>{kind === 'photo' ? 'You matched breed names to photographs' : 'You identified horses'} from a collection of {breeds.length} breeds.</p></div>
        <div className="summary-score"><span>Correct answers</span><strong>{correct} / {MAX_ROUNDS}</strong><small>Personal best: {best}</small><div className="score-ring" style={{ '--score': `${percentage}%` } as React.CSSProperties}><span>{percentage}%</span></div></div>
        <ShareableResultCard date={dateKey()} label={kind === 'photo' ? 'Pick the Photo' : 'Name the Breed'} rank={rank} score={String(correct)} maximum={String(MAX_ROUNDS)} rounds={results.map(result => ({ value: result.correct ? '✓' : '×', fraction: result.correct ? 1 : 0 }))} newBest={correct > previousBest} shareText={`HorseGuessr · ${kind === 'photo' ? 'Pick the Photo' : 'Name the Breed'} · ${dateKey()}\n${results.map(result => result.correct ? '💖' : '🤍').join('')}\n${correct} / ${MAX_ROUNDS} correct`} />
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
        <AccountInvitation />
        <div className="summary-actions"><button className="secondary-button" onClick={onHome}>Return home</button><button className="primary-button" onClick={onReplay}><RotateCcw size={18} /> Try another set</button></div>
      </section>
    </main>
  )
}

function AtlasPickPlace({ onPick }: { onPick: (place: AtlasPlace) => void }) {
  useMapEvents({
    click(event) {
      onPick({ lat: event.latlng.lat, lng: event.latlng.lng, label: 'Your map pin' })
    },
  })
  return null
}

function AtlasMapFocus({ place, nearby, selectedBreed }: { place: AtlasPlace | null; nearby: NearbyBreed[]; selectedBreed: Breed | null }) {
  const map = useMap()
  useEffect(() => {
    if (!place) return
    const points: LatLngBoundsExpression = [place, ...nearby.slice(0, 4).map(item => item.breed)].map(point => [point.lat, point.lng])
    map.fitBounds(points, { padding: [55, 55], maxZoom: 5, animate: true })
  }, [map, nearby, place])
  useEffect(() => {
    if (selectedBreed) map.flyTo([selectedBreed.lat, selectedBreed.lng], Math.max(map.getZoom(), 4), { animate: true })
  }, [map, selectedBreed])
  return null
}

function atlasMarkerPoint(breed: Breed, prior: Breed[]): Point {
  const duplicateIndex = prior.filter(item => item.lat === breed.lat && item.lng === breed.lng).length
  if (!duplicateIndex) return breed
  const angle = duplicateIndex * 2.4
  const radius = 0.18 + Math.floor(duplicateIndex / 7) * 0.08
  return {
    lat: breed.lat + Math.sin(angle) * radius,
    lng: breed.lng + Math.cos(angle) * radius / Math.max(0.35, Math.cos(breed.lat * Math.PI / 180)),
  }
}

function BreedAtlas({ items }: { items: Breed[] }) {
  const [search, setSearch] = useState('')
  const [place, setPlace] = useState<AtlasPlace | null>(null)
  const [selectedBreed, setSelectedBreed] = useState<Breed | null>(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const lookupRef = useRef<AbortController | null>(null)
  const panelRef = useRef<HTMLElement>(null)
  const nearby = useMemo(() => place ? nearestBreedOrigins(place, items) : [], [items, place])
  const nearbyIds = useMemo(() => new Set(nearby.map(item => item.breed.id)), [nearby])
  const markerPoints = useMemo(() => items.map((breed, index) => atlasMarkerPoint(breed, items.slice(0, index))), [items])

  useEffect(() => () => lookupRef.current?.abort(), [])
  useEffect(() => { if (selectedBreed) panelRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) }, [selectedBreed])

  const choosePlace = (next: AtlasPlace) => {
    setPlace(next)
    setSelectedBreed(null)
    setError('')
  }

  const findPlace = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!search.trim()) return
    lookupRef.current?.abort()
    const controller = new AbortController()
    lookupRef.current = controller
    setSearching(true)
    setError('')
    try {
      const found = await lookupAtlasPlace(search, controller.signal)
      if (found) choosePlace(found)
      else setError('No place found. Try a city with its country, or click the map to drop a pin.')
    } catch (reason) {
      if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
        setError('Place search is unavailable right now. You can still click the map to find nearby breeds.')
      }
    } finally {
      if (lookupRef.current === controller) setSearching(false)
    }
  }

  return (
    <section className="atlas-section" aria-label="Atlas of horse breed origins">
      <div className="atlas-heading">
        <div><span className="atlas-kicker">✦ THE WORLD STABLE ✦</span><h2><Compass size={28} /> Horse breed atlas</h2><p>Explore all {items.length} breed homelands. Pan or zoom the map, choose a horse pin, or search for breeds near a place.</p></div>
        <span className="atlas-pin-count">{items.length} horse pins</span>
      </div>
      <form className="atlas-search" onSubmit={findPlace}>
        <label htmlFor="atlas-place-search">Find breeds near a place</label>
        <div><Search size={19} /><input id="atlas-place-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Try Chicago, Jeju Island, or Wales…" autoComplete="off" /><button type="submit" disabled={searching || !search.trim()}>{searching ? 'Searching…' : 'Find nearby'}</button></div>
        <small>Search cities, regions, or countries—not private addresses. Or click any spot on the map. Place data © OpenStreetMap contributors via Nominatim.</small>
        {error && <p className="atlas-search-error" role="alert">{error}</p>}
      </form>
      <div className="atlas-layout">
        <div className="atlas-map-frame">
          <MapContainer center={[22, 7]} zoom={2} minZoom={2} maxZoom={10} maxBounds={[[-85, -190], [85, 190]]} zoomControl attributionControl worldCopyJump scrollWheelZoom className="map atlas-map">
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapResizeSync />
            <AtlasPickPlace onPick={choosePlace} />
            <AtlasMapFocus place={place} nearby={nearby} selectedBreed={selectedBreed} />
            {items.map((breed, index) => (
              <CircleMarker
                key={breed.id}
                center={[markerPoints[index].lat, markerPoints[index].lng]}
                radius={selectedBreed?.id === breed.id ? 10 : nearbyIds.has(breed.id) ? 8 : 5}
                pathOptions={{ color: '#fff', weight: 2, fillColor: selectedBreed?.id === breed.id ? '#ffde43' : nearbyIds.has(breed.id) ? '#fe0889' : '#9553b1', fillOpacity: 0.95 }}
                bubblingMouseEvents={false}
                eventHandlers={{ click: () => setSelectedBreed(breed) }}
              >
                <Tooltip direction="top">{breed.flag} {breed.name} · {breed.location}</Tooltip>
              </CircleMarker>
            ))}
            {place && <Marker position={[place.lat, place.lng]} icon={guessIcon}><Tooltip direction="top" permanent={false}>{place.label}</Tooltip></Marker>}
          </MapContainer>
          <div className="atlas-map-note"><MapPin size={14} /> Tap a pin for a breed card · tap empty map to search from that spot</div>
        </div>
        <aside className="atlas-panel" ref={panelRef} aria-live="polite">
          {selectedBreed && (
            <article className="atlas-breed-card">
              <div className="atlas-breed-photo"><MagnifiableImage src={selectedBreed.image} photos={photosForBreed(selectedBreed)} fallbacks={photosForBreed(selectedBreed).map(photo => photo.src)} alt={selectedBreed.name} breedId={selectedBreed.id} /></div>
              <div className="atlas-breed-copy">
                <span className="atlas-card-label">BREED NO. {String(items.indexOf(selectedBreed) + 1).padStart(3, '0')} · {selectedBreed.flag} {selectedBreed.country}</span>
                <h3><BreedName breed={selectedBreed} /><PassportMedal breed={selectedBreed} /></h3>
                <p className="atlas-homeland"><MapPin size={15} /><b>{originZones[selectedBreed.id].label}</b></p>
                <BreedBio breed={selectedBreed} />
                <a href={selectedBreed.source} target="_blank" rel="noreferrer">Breed source <ArrowRight size={14} /></a>
              </div>
            </article>
          )}
          {place ? (
            <div className="atlas-nearby">
              <p className="atlas-list-kicker">NEAREST BREED HOMELANDS</p>
              <h3>Closest to {place.label}</h3>
              <p className="atlas-distance-note">Distances are measured to each breed’s accepted origin region, not just its map pin.</p>
              <ol>{nearby.map((item, index) => (
                <li key={item.breed.id}>
                  <button type="button" className={selectedBreed?.id === item.breed.id ? 'is-selected' : ''} onClick={() => setSelectedBreed(item.breed)}>
                    <span className="atlas-nearby-number">{index + 1}</span>
                    <span className="atlas-nearby-copy"><strong>{item.breed.flag} {item.breed.name}</strong><small>{item.breed.location}, {item.breed.country}</small><span>{item.breed.fact}</span></span>
                    <em>{item.regionKm < 1 ? 'In homeland' : `${formatNumber(Math.round(item.regionKm))} km away`}</em>
                  </button>
                </li>
              ))}</ol>
            </div>
          ) : !selectedBreed && (
            <div className="atlas-welcome"><span>✦ ♡ ✦</span><h3>Where shall we ride?</h3><p>Every dot is a horse breed’s historic homeland. Search a place to find its nearest breeds, or pick a dot to read its story.</p></div>
          )}
        </aside>
      </div>
    </section>
  )
}

type CollectionNavigationProps = {
  current: 'guide' | 'favorites' | 'passport'
  onHome: () => void
  onGuide: () => void
  onFavorites: () => void
  onPassport: () => void
}

function CollectionNavigation({ current, onHome, onGuide, onFavorites, onPassport }: CollectionNavigationProps) {
  return (
    <nav className="summary-nav collection-nav">
      <Brand inverse />
      <div className="summary-nav-actions">
        <MagnificationToggle />
        <button className={`text-button ${current === 'passport' ? 'is-current' : ''}`} onClick={onPassport} aria-current={current === 'passport' ? 'page' : undefined}><Award size={17} /> Passport</button>
        <button className={`text-button ${current === 'favorites' ? 'is-current' : ''}`} onClick={onFavorites} aria-current={current === 'favorites' ? 'page' : undefined}><BookHeart size={17} /> Favorites</button>
        <button className={`text-button ${current === 'guide' ? 'is-current' : ''}`} onClick={onGuide} aria-current={current === 'guide' ? 'page' : undefined}><BookOpen size={17} /> Field guide</button>
        <button className="text-button collection-home-link" onClick={onHome}><ChevronLeft size={17} /> Home</button>
      </div>
    </nav>
  )
}

type BreedCollectionProps = CollectionNavigationProps & {
  shownBreeds: Breed[]
  title: string
  eyebrow: string
  emptyCopy?: string
  showAtlas?: boolean
  showTopFavorites?: boolean
}

function BreedCollection({ shownBreeds, title, eyebrow, emptyCopy, showAtlas = false, showTopFavorites = false, ...navigation }: BreedCollectionProps) {
  const { passportIds } = useContext(PassportContext)
  const { topFavoriteIds } = useContext(FavoritesContext)
  const photoCount = shownBreeds.reduce((total, breed) => total + photosForBreed(breed).length, 0)
  const [galleryBreed, setGalleryBreed] = useState<Breed | null>(null)
  const [query, setQuery] = useState('')
  const [country, setCountry] = useState('')
  const [tag, setTag] = useState('')
  const [passportFilter, setPassportFilter] = useState('all')
  const countries = useMemo(() => [...new Set(shownBreeds.map(breed => breed.country))].sort((a, b) => a.localeCompare(b)).map(name => ({ name, flag: shownBreeds.find(breed => breed.country === name)?.flag || '🌐' })), [shownBreeds])
  const tags = useMemo(() => [...new Set(shownBreeds.flatMap(breed => breed.tags))].sort((a, b) => a.localeCompare(b)), [shownBreeds])
  const filteredBreeds = useMemo(() => {
    const needle = normalizeGuideText(query)
    return shownBreeds.filter(breed => {
      const matchesSearch = !needle || normalizeGuideText([breed.name, breed.country, breed.location, breed.fact, breed.hint, breed.coatColors, ...breed.tags].join(' ')).includes(needle)
      const matchesCountry = !country || breed.country === country
      const matchesTag = !tag || breed.tags.includes(tag)
      const earned = passportIds.includes(breed.id)
      const matchesPassport = passportFilter === 'all' || (passportFilter === 'earned' ? earned : !earned)
      return matchesSearch && matchesCountry && matchesTag && matchesPassport
    })
  }, [country, passportFilter, passportIds, query, shownBreeds, tag])
  const suggestedBreed = useMemo(() => filteredBreeds.length ? null : suggestBreedName(query, shownBreeds), [filteredBreeds.length, query, shownBreeds])
  const topFilteredBreeds = showTopFavorites ? filteredBreeds.filter(breed => topFavoriteIds.includes(breed.id)) : []
  const otherFilteredBreeds = showTopFavorites ? filteredBreeds.filter(breed => !topFavoriteIds.includes(breed.id)) : filteredBreeds
  const resetFilters = () => { setQuery(''); setCountry(''); setTag(''); setPassportFilter('all') }
  const useSuggestion = () => {
    if (!suggestedBreed) return
    setQuery(suggestedBreed.name)
    setCountry('')
    setTag('')
    setPassportFilter('all')
  }
  return (
    <main className="guide-screen">
      <CollectionNavigation {...navigation} />
      <section className="guide-heading"><p className="eyebrow"><span /> {eyebrow}</p><h1>{title}</h1><p>{shownBreeds.length ? `Meet ${shownBreeds.length} breeds across ${photoCount} photographs—and follow their stories home.` : emptyCopy}</p></section>
      {showAtlas && <BreedAtlas items={shownBreeds} />}
      {shownBreeds.length > 0 && (
        <section className="guide-tools" aria-label="Search and filter breeds">
          <label className="guide-search"><Search size={18} /><span>Search breeds</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Name, region, coat, or trait…" /></label>
          <label><span>Country</span><select value={country} onChange={event => setCountry(event.target.value)}><option value="">All countries</option>{countries.map(item => <option key={item.name} value={item.name}>{item.flag} {item.name}</option>)}</select></label>
          <label><span>Type</span><select value={tag} onChange={event => setTag(event.target.value)}><option value="">All breed types</option>{tags.map(item => <option key={item}>{item}</option>)}</select></label>
          <label><span>Passport</span><select value={passportFilter} onChange={event => setPassportFilter(event.target.value)}><option value="all">All breeds</option><option value="earned">Medal earned</option><option value="unearned">Not identified yet</option></select></label>
          <div className="guide-filter-result"><strong>{filteredBreeds.length}</strong><span>breeds shown</span><button type="button" onClick={resetFilters}>Reset</button></div>
        </section>
      )}
      {suggestedBreed && (
        <div className="guide-suggestion" role="status">
          <Sparkles size={18} />
          {normalizeGuideText(query) === normalizeGuideText(suggestedBreed.name) ? 'That breed is hidden by the current filters.' : 'Did you mean'}
          <button type="button" onClick={useSuggestion}>{suggestedBreed.flag} {suggestedBreed.name}?</button>
        </div>
      )}
      <section className="guide-grid">
        {showTopFavorites && <div className="favorite-section-heading favorite-section-heading--top"><Star size={21} fill="currentColor" /><div><span>PINNED TO THE TOP</span><h2>Top favorites</h2><p>{topFilteredBreeds.length ? 'Your most-loved horses, collected first.' : 'Tap the star beside any favorite breed to pin it here.'}</p></div></div>}
        {topFilteredBreeds.map(breed => (
          <article className={`guide-card ${passportIds.includes(breed.id) ? 'guide-card--passport-earned' : ''}`} key={breed.id}>
            <MagnifiableImage src={breed.image} photos={photosForBreed(breed)} fallbacks={photosForBreed(breed).map(photo => photo.src)} alt={breed.name} breedId={breed.id} loading="lazy" />
            <div><span>{breed.country} · <button type="button" className="guide-photo-count" onClick={() => setGalleryBreed(breed)}>{photosForBreed(breed).length} photos <Images size={13} /></button></span><h2><BreedName breed={breed} showTopFavorite /><PassportMedal breed={breed} /></h2><BreedBio breed={breed} /><a href={breed.source} target="_blank" rel="noreferrer">Open breed profile <ArrowRight size={15} /></a></div>
          </article>
        ))}
        {showTopFavorites && filteredBreeds.length > 0 && <div className="favorite-section-heading"><Heart size={21} fill="currentColor" /><div><span>YOUR HEARTED HORSES</span><h2>{topFilteredBreeds.length ? 'More favorites' : 'All favorites'}</h2></div></div>}
        {otherFilteredBreeds.map(breed => (
          <article className={`guide-card ${passportIds.includes(breed.id) ? 'guide-card--passport-earned' : ''}`} key={breed.id}>
            <MagnifiableImage src={breed.image} photos={photosForBreed(breed)} fallbacks={photosForBreed(breed).map(photo => photo.src)} alt={breed.name} breedId={breed.id} loading="lazy" />
            <div><span>{breed.country} · <button type="button" className="guide-photo-count" onClick={() => setGalleryBreed(breed)}>{photosForBreed(breed).length} photos <Images size={13} /></button></span><h2><BreedName breed={breed} showTopFavorite={showTopFavorites} /><PassportMedal breed={breed} /></h2><BreedBio breed={breed} /><a href={breed.source} target="_blank" rel="noreferrer">Open breed profile <ArrowRight size={15} /></a></div>
          </article>
        ))}
        {shownBreeds.length > 0 && filteredBreeds.length === 0 && <p className="guide-empty">No breeds match this stable search. Try clearing one of the filters.</p>}
      </section>
      {galleryBreed && <PhotoViewer photos={photosForBreed(galleryBreed)} startSrc={galleryBreed.image} alt={galleryBreed.name} breedId={galleryBreed.id} onClose={() => setGalleryBreed(null)} />}
    </main>
  )
}

function FieldGuide(props: Omit<CollectionNavigationProps, 'current'>) {
  return <BreedCollection {...props} current="guide" shownBreeds={breeds} eyebrow="The field guide" title="Breeds of the world" showAtlas />
}

function FavoriteBreeds(props: Omit<CollectionNavigationProps, 'current'>) {
  const { favoriteIds } = useContext(FavoritesContext)
  const favorites = breeds.filter(breed => favoriteIds.includes(breed.id))
  return <BreedCollection {...props} current="favorites" shownBreeds={favorites} eyebrow="Your hearted horses" title="Favorite breeds" emptyCopy="Your stable is empty. Tap the heart after any breed name to add it here." showTopFavorites />
}

function BreedPassport(props: Omit<CollectionNavigationProps, 'current'>) {
  const { passportIds } = useContext(PassportContext)
  const earned = breeds.filter(breed => passportIds.includes(breed.id)).length
  const percentage = Math.round(earned / breeds.length * 100)
  return (
    <main className="guide-screen passport-screen">
      <CollectionNavigation {...props} current="passport" />
      <section className="guide-heading passport-heading">
        <p className="eyebrow"><span /> Your breed passport</p>
        <h1>Stable sticker book</h1>
        <p>Correctly identify a breed in either identification quiz to earn its glossy passport medal.</p>
        <div className="passport-progress"><div><strong>{earned}</strong><span>of {breeds.length} breeds earned</span><b>{percentage}%</b></div><i><span style={{ width: `${percentage}%` }} /></i></div>
      </section>
      <section className="passport-grid">
        {breeds.map(breed => {
          const isEarned = passportIds.includes(breed.id)
          return (
            <article className={`passport-sticker ${isEarned ? 'passport-sticker--earned' : 'passport-sticker--locked'}`} key={breed.id}>
              <div className="passport-sticker__photo">
                {isEarned
                  ? <MagnifiableImage src={breed.image} photos={photosForBreed(breed)} fallbacks={photosForBreed(breed).map(photo => photo.src)} alt={breed.name} breedId={breed.id} loading="lazy" />
                  : <div className="passport-sticker__mystery"><img src={`${import.meta.env.BASE_URL}horse-head-logo.png`} alt="" /><span>?</span></div>}
              </div>
              <span className="passport-sticker__medal"><Award size={23} /></span>
              <div><small>{isEarned ? `${breed.flag} ${breed.country}` : 'Keep guessing to unlock'}</small><strong>{isEarned ? breed.name : 'Mystery breed'}</strong></div>
            </article>
          )
        })}
      </section>
    </main>
  )
}

function PlayerProfilePage({ uid, onBack }: { uid: string; onBack: () => void }) {
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [shareStatus, setShareStatus] = useState('')
  useEffect(() => {
    let active = true
    setLoading(true)
    fetchPublicProfile(uid).then(result => {
      if (!active) return
      setProfile(result)
      if (!result) setError('This rider profile could not be found.')
    }).catch(() => { if (active) setError('This rider profile is unavailable right now.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [uid])
  const share = async () => {
    if (!profile) return
    const url = `${window.location.origin}${import.meta.env.BASE_URL}?profile=${encodeURIComponent(profile.uid)}`
    try {
      const canShare = Boolean(navigator.share)
      if (canShare) await navigator.share({ title: `${profile.username} on HorseGuessr`, text: `See ${profile.username}’s HorseGuessr stable and scores.`, url })
      else await navigator.clipboard.writeText(url)
      setShareStatus(canShare ? 'Profile shared!' : 'Profile link copied!')
    } catch (reason) {
      if (!(reason instanceof DOMException && reason.name === 'AbortError')) setShareStatus('Copy the page address from your browser to share this profile.')
    }
  }
  const favoriteBreeds = profile ? breeds.filter(breed => profile.favorites.includes(breed.id)) : []
  const identifiedBreeds = profile ? breeds.filter(breed => profile.passport.includes(breed.id)) : []
  return (
    <main className="guide-screen player-profile-screen">
      <nav className="summary-nav"><Brand inverse /><div className="summary-nav-actions"><button className="text-button" onClick={onBack}><ChevronLeft size={17} /> Home</button></div></nav>
      {loading && <p className="profile-status">Loading rider stable…</p>}
      {!loading && error && <section className="profile-status profile-status--error"><h1>Lost on the trail</h1><p>{error}</p><button className="primary-button" onClick={onBack}>Return home</button></section>}
      {!loading && profile && (
        <>
          <section className="profile-hero">
            <div className="profile-avatar"><img src={`${import.meta.env.BASE_URL}horse-head-logo.png`} alt="" /></div>
            <div><p className="eyebrow"><span /> HorseGuessr rider profile</p><h1>{profile.username}</h1><p>Member since {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(profile.createdAt))}</p></div>
            <button className="secondary-button profile-share-button" onClick={() => void share()}><Share2 size={18} /> Share profile</button>
            {shareStatus && <span className="profile-share-status">{shareStatus}</span>}
          </section>
          <section className="profile-score-grid" aria-label="Rider high scores">
            <article><span>Geography best</span><strong>{profile.personalBest ? formatNumber(profile.personalBest) : '—'}</strong><small>out of 40,000</small></article>
            <article><span>Name the Breed</span><strong>{profile.nameBreedBest || '—'}</strong><small>out of 8</small></article>
            <article><span>Pick the Photo</span><strong>{profile.photoQuizBest || '—'}</strong><small>out of 8</small></article>
            <article><span>Last daily ride</span><strong>{profile.lastDailyDate ? formatNumber(profile.lastDailyScore || 0) : '—'}</strong><small>{profile.lastDailyDate || 'No daily saved yet'}</small></article>
          </section>
          <ProfileBreedShelf title="Favorite breeds" icon={<Heart size={23} fill="currentColor" />} items={favoriteBreeds} empty="No favorite breeds shared yet." />
          <ProfileBreedShelf title="Correctly identified" icon={<Award size={23} />} items={identifiedBreeds} empty="No passport medals earned yet." />
        </>
      )}
    </main>
  )
}

function ProfileBreedShelf({ title, icon, items, empty }: { title: string; icon: React.ReactNode; items: Breed[]; empty: string }) {
  return (
    <section className="profile-breed-shelf">
      <div className="profile-shelf-heading">{icon}<div><h2>{title}</h2><span>{items.length} {items.length === 1 ? 'breed' : 'breeds'}</span></div></div>
      {items.length ? <div className="profile-breed-grid">{items.map(breed => <article key={breed.id}><img src={breed.image} alt={breed.name} loading="lazy" /><div><span>{breed.flag} {breed.country}</span><strong>{breed.name}</strong></div></article>)}</div> : <p className="profile-shelf-empty">{empty}</p>}
    </section>
  )
}

function AccountAdminDashboard() {
  const [password, setPassword] = useState('')
  const [session, setSession] = useState<FirebaseSession | null>(null)
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchAdminAccounts>>>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [moderatingUid, setModeratingUid] = useState('')
  const enter = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const nextSession = await adminLogin(password)
      const accounts = await fetchAdminAccounts(nextSession)
      setSession(nextSession)
      setRows(accounts)
      setPassword('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Stable Office access failed.')
    } finally {
      setLoading(false)
    }
  }
  const toggleBan = async (row: Awaited<ReturnType<typeof fetchAdminAccounts>>[number]) => {
    if (!session || moderatingUid) return
    const nextBanned = !row.banned
    if (nextBanned && !window.confirm(`Ban ${row.username}? They will be logged out and all of their leaderboard entries will be permanently removed.`)) return
    setModeratingUid(row.uid)
    setError('')
    setNotice('')
    try {
      const result = await setAdminAccountBanned(session, row.uid, nextBanned)
      setRows(current => current.map(item => item.uid === row.uid ? { ...item, banned: result.banned, moderatedAt: result.moderatedAt } : item))
      setNotice(nextBanned
        ? `${row.username} is banned and ${result.removedScores} leaderboard ${result.removedScores === 1 ? 'entry was' : 'entries were'} removed.`
        : `${row.username} can log in again. Previously removed leaderboard entries remain removed.`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The account status could not be changed.')
    } finally {
      setModeratingUid('')
    }
  }
  return (
    <main className="guide-screen account-admin-screen">
      <nav className="summary-nav"><Brand inverse /><span className="admin-private-label"><ShieldCheck size={16} /> PRIVATE STABLE OFFICE</span></nav>
      {!session ? (
        <section className="admin-login-card">
          <LockKeyhole size={42} /><p className="eyebrow"><span /> Unlisted administrator page</p><h1>Account stable office</h1><p>Enter the dedicated Stable Office password. Player passwords are managed by Firebase and can never be viewed here.</p>
          <form onSubmit={enter}><label htmlFor="admin-account-password"><span>Administrator password</span><input id="admin-account-password" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required /></label>{error && <p role="alert">{error}</p>}<button className="primary-button" disabled={loading}>{loading ? 'Unlocking…' : 'Open Stable Office'}</button></form>
        </section>
      ) : (
        <section className="admin-account-list">
          <div className="admin-account-heading"><div><p className="eyebrow"><span /> Private database</p><h1>Registered riders</h1><p>{rows.length} accounts. Emails are visible only in this authenticated office.</p></div><button className="secondary-button" onClick={() => { setSession(null); setRows([]); setNotice(''); setError('') }}><LogOut size={16} /> Lock office</button></div>
          {notice && <p className="admin-account-notice" role="status">{notice}</p>}
          {error && <p className="admin-account-notice admin-account-notice--error" role="alert">{error}</p>}
          <div className="admin-account-table"><div className="admin-account-row admin-account-row--header"><span>Rider</span><span>Email</span><span>Joined</span><span>Collection</span><span>Status</span></div>{rows.map(row => <div className={`admin-account-row${row.banned ? ' admin-account-row--banned' : ''}`} key={row.uid}><span><b>{row.username}</b><small>{row.uid}</small></span><span>{row.email}</span><span>{row.createdAt ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(row.createdAt)) : '—'}</span><span>{row.profile?.favorites.length || 0} favorites · {row.profile?.passport.length || 0} medals</span><span className="admin-account-status"><b>{row.banned ? 'Banned' : 'Active'}</b><button type="button" className={row.banned ? 'admin-unban-button' : 'admin-ban-button'} disabled={Boolean(moderatingUid)} onClick={() => void toggleBan(row)}>{moderatingUid === row.uid ? 'Saving…' : row.banned ? <><RotateCcw size={14} /> Unban</> : <><Ban size={14} /> Ban</>}</button></span></div>)}</div>
          {!rows.length && <p className="admin-account-empty">No player accounts have registered yet.</p>}
        </section>
      )}
    </main>
  )
}

type PhotoReportGroup = {
  photoId: string
  photoUrl: string
  breedId: string
  reports: PhotoQualityReport[]
}

function PhotoReportDashboard() {
  const [reports, setReports] = useState<PhotoQualityReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadReports = async () => {
    setLoading(true)
    setError('')
    try {
      setReports(await fetchPhotoQualityReports())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'The report list could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadReports() }, [])

  const groups = useMemo(() => {
    const grouped = new Map<string, PhotoReportGroup>()
    reports.forEach(report => {
      const existing = grouped.get(report.photoId)
      if (existing) existing.reports.push(report)
      else grouped.set(report.photoId, { photoId: report.photoId, photoUrl: report.photoUrl, breedId: report.breedId, reports: [report] })
    })
    return [...grouped.values()].sort((a, b) => (b.reports[0]?.reportedAt || '').localeCompare(a.reports[0]?.reportedAt || ''))
  }, [reports])

  const formatReportTime = (value: string) => {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? 'Unknown time' : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
  }

  return (
    <main className="guide-screen report-dashboard">
      <nav className="summary-nav"><Brand inverse /><button type="button" className="secondary-button" onClick={() => void loadReports()} disabled={loading}><RotateCcw size={16} /> Refresh reports</button></nav>
      <section className="guide-heading report-dashboard__heading">
        <p className="eyebrow"><span /> Stable office</p>
        <h1>Photo quality reports</h1>
        <p>Reported public horse photos, grouped by image. No player identity is stored with these reports.</p>
        <div className="report-dashboard__totals"><strong>{groups.length}</strong> photos · <strong>{reports.length}</strong> reports</div>
      </section>
      {loading && <p className="report-dashboard__status">Loading the report box…</p>}
      {!loading && error && <p className="report-dashboard__status report-dashboard__status--error">{error}</p>}
      {!loading && !error && groups.length === 0 && <p className="report-dashboard__status">No photos have been reported yet.</p>}
      {!loading && !error && groups.length > 0 && (
        <section className="report-dashboard__grid">
          {groups.map(group => {
            const breed = breeds.find(item => item.id === group.breedId)
            const counts = group.reports.reduce<Record<string, number>>((totals, report) => {
              totals[report.reason] = (totals[report.reason] || 0) + 1
              return totals
            }, {})
            return (
              <article className="report-card" key={group.photoId}>
                <a className="report-card__photo" href={group.photoUrl} target="_blank" rel="noreferrer"><img src={group.photoUrl} alt={breed ? `Reported ${breed.name} photo` : 'Reported horse photo'} /></a>
                <div className="report-card__body">
                  <span>{breed?.flag} {breed?.country || 'Unknown origin'} · {group.reports.length} {group.reports.length === 1 ? 'report' : 'reports'}</span>
                  <h2>{breed?.name || group.breedId}</h2>
                  <ul>{Object.entries(counts).map(([reason, count]) => <li key={reason}><b>{count}×</b> {photoReportOptions.find(option => option.value === reason)?.label || reason}</li>)}</ul>
                  <small>Latest: {formatReportTime(group.reports[0]?.reportedAt || '')}</small>
                  <a href={group.photoUrl} target="_blank" rel="noreferrer">Open original photo <ArrowRight size={14} /></a>
                </div>
              </article>
            )
          })}
        </section>
      )}
    </main>
  )
}

export default function App() {
  const initialProfileUid = new URLSearchParams(window.location.search).get('profile') || ''
  const [screen, setScreen] = useState<Screen>(initialProfileUid ? 'profile' : 'home')
  const [profileUid, setProfileUid] = useState(initialProfileUid)
  const [mode, setMode] = useState<'daily' | 'practice'>('daily')
  const [practiceRegion, setPracticeRegion] = useState<PracticeRegionId>('world')
  const [results, setResults] = useState<RoundResult[]>([])
  const [quizResults, setQuizResults] = useState<QuizResult[]>([])
  const [magnificationEnabled, setMagnificationEnabled] = useState(() => localStorage.getItem('horseguessr-photo-viewer') !== 'off')
  const [favoriteIds, setFavoriteIds] = useState(readFavoriteIds)
  const [topFavoriteIds, setTopFavoriteIds] = useState(readTopFavoriteIds)
  const [passportIds, setPassportIds] = useState(readPassportIds)
  const [account, setAccount] = useState<PlayerAccount | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null)
  const [accountNotice, setAccountNotice] = useState('')
  const [dailyAttemptKey, setDailyAttemptKey] = useState(() => readCookie(cookieNames.dailyAttempt))
  const centralClock = useCentralClock()
  const dailyLocked = dailyAttemptKey === centralClock.key
  const reportDashboard = new URLSearchParams(window.location.search).get('stable-view') === 'photo-reports'
  const accountDashboard = new URLSearchParams(window.location.search).get('stable-view') === 'accounts'
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }) }, [screen])
  const accountSnapshot = (overrides: Partial<AccountSnapshot> = {}): AccountSnapshot => ({
    favorites: favoriteIds,
    topFavorites: topFavoriteIds,
    passport: passportIds,
    personalBest: readPersonalBest(),
    nameBreedBest: Number(localStorage.getItem('horseguessr-quiz-best') || 0),
    photoQuizBest: Number(localStorage.getItem('horseguessr-photo-quiz-best') || 0),
    ...(mode === 'daily' && results.length === MAX_ROUNDS ? { lastDailyScore: results.reduce((sum, result) => sum + result.points, 0), lastDailyDate: dailyAttemptKey } : {}),
    ...overrides,
  })
  const applyAccount = (nextAccount: PlayerAccount) => {
    setAccount(nextAccount)
    setFavoriteIds(nextAccount.profile.favorites)
    setTopFavoriteIds(nextAccount.profile.topFavorites)
    setPassportIds(nextAccount.profile.passport)
    writeFavoriteIds(nextAccount.profile.favorites)
    writeTopFavoriteIds(nextAccount.profile.topFavorites)
    writePassportIds(nextAccount.profile.passport)
    updatePersonalBest(nextAccount.profile.personalBest)
    localStorage.setItem('horseguessr-quiz-best', String(nextAccount.profile.nameBreedBest))
    localStorage.setItem('horseguessr-photo-quiz-best', String(nextAccount.profile.photoQuizBest))
    if (nextAccount.profile.lastDailyDate && nextAccount.profile.lastDailyDate >= dailyAttemptKey) {
      writeCookie(cookieNames.dailyAttempt, nextAccount.profile.lastDailyDate)
      setDailyAttemptKey(nextAccount.profile.lastDailyDate)
    }
    setAuthMode(null)
  }
  const handleAccountError = (reason: unknown) => {
    if (!isBannedAccountError(reason)) return
    logoutAccount()
    setAccount(null)
    setAccountNotice(BANNED_ACCOUNT_MESSAGE)
  }
  useEffect(() => {
    let active = true
    restoreAccount().then(async restored => {
      if (!active || !restored) return
      const profile = await saveAccountProgress(restored, accountSnapshot())
      if (active) applyAccount({ ...restored, profile })
    }).catch(handleAccountError)
    return () => { active = false }
    // The initial browser snapshot is intentionally migrated only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const accountUid = account?.uid || ''
  useEffect(() => {
    if (!accountUid) return
    let active = true
    const checkBan = async () => {
      try {
        if (await checkAccountBanned(accountUid) && active) {
          logoutAccount()
          setAccount(null)
          setAccountNotice(BANNED_ACCOUNT_MESSAGE)
        }
      } catch {
        // Temporary network failures should not sign a rider out.
      }
    }
    void checkBan()
    const timer = window.setInterval(checkBan, 30_000)
    window.addEventListener('focus', checkBan)
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('focus', checkBan)
    }
  }, [accountUid])
  useEffect(() => {
    if (!account) return
    const timer = window.setTimeout(() => {
      saveAccountProgress(account, accountSnapshot()).then(profile => setAccount(current => current?.uid === account.uid ? { ...current, profile } : current)).catch(handleAccountError)
    }, 900)
    return () => window.clearTimeout(timer)
    // Score cookies are synchronized explicitly when a challenge finishes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.uid, favoriteIds, passportIds, topFavoriteIds])
  const saveChallengeToAccount = (overrides: Partial<AccountSnapshot>) => {
    if (!account) return
    saveAccountProgress(account, accountSnapshot(overrides)).then(profile => setAccount(current => current?.uid === account.uid ? { ...current, profile } : current)).catch(handleAccountError)
  }
  const openProfile = (uid: string) => {
    setProfileUid(uid)
    setScreen('profile')
    window.history.pushState({}, '', `${import.meta.env.BASE_URL}?profile=${encodeURIComponent(uid)}`)
  }
  const returnHome = () => {
    setScreen('home')
    setProfileUid('')
    window.history.pushState({}, '', import.meta.env.BASE_URL)
  }
  const signOut = () => {
    logoutAccount()
    setAccount(null)
  }
  const toggleFavorite = (breedId: string) => {
    const isAdding = !favoriteIds.includes(breedId)
    const next = isAdding ? [...favoriteIds, breedId] : favoriteIds.filter(id => id !== breedId)
    setFavoriteIds(next)
    writeFavoriteIds(next)
    if (!isAdding && topFavoriteIds.includes(breedId)) {
      const nextTopFavorites = topFavoriteIds.filter(id => id !== breedId)
      setTopFavoriteIds(nextTopFavorites)
      writeTopFavoriteIds(nextTopFavorites)
    }
    if (isAdding) void recordBreedFavorite(breedId)
  }
  const toggleTopFavorite = (breedId: string) => {
    if (!favoriteIds.includes(breedId)) return
    const next = topFavoriteIds.includes(breedId) ? topFavoriteIds.filter(id => id !== breedId) : [...topFavoriteIds, breedId]
    setTopFavoriteIds(next)
    writeTopFavoriteIds(next)
  }
  const awardPassportMedal = (breedId: string) => {
    if (passportIds.includes(breedId)) return
    const next = [...passportIds, breedId]
    setPassportIds(next)
    writePassportIds(next)
  }
  const start = (nextMode: 'daily' | 'practice', region: PracticeRegionId = 'world') => {
    if (nextMode === 'daily') {
      if (dailyLocked) return
      writeCookie(cookieNames.dailyAttempt, centralClock.key)
      setDailyAttemptKey(centralClock.key)
    }
    setMode(nextMode)
    setPracticeRegion(region)
    setResults([])
    setScreen('game')
  }
  let page
  if (accountDashboard) page = <AccountAdminDashboard />
  else if (reportDashboard) page = <PhotoReportDashboard />
  else if (screen === 'profile') page = <PlayerProfilePage uid={profileUid} onBack={returnHome} />
  else if (screen === 'practice-picker') page = <PracticePicker onChoose={region => start('practice', region)} onBack={() => setScreen('home')} />
  else if (screen === 'game') page = <Game mode={mode} practiceRegion={practiceRegion} onExit={() => setScreen('home')} onFinish={finalResults => { const total = finalResults.reduce((sum, result) => sum + result.points, 0); setResults(finalResults); saveChallengeToAccount({ personalBest: Math.max(readPersonalBest(), total), ...(mode === 'daily' ? { lastDailyScore: total, lastDailyDate: dailyAttemptKey } : {}) }); setScreen('summary') }} />
  else if (screen === 'summary') page = <Summary results={results} mode={mode} practiceRegion={practiceRegion} dayKey={mode === 'daily' ? dailyAttemptKey : centralClock.key} onReplay={() => mode === 'daily' ? setScreen('practice-picker') : start('practice', practiceRegion)} onHome={() => setScreen('home')} />
  else if (screen === 'breed-quiz') page = <BreedQuiz onExit={() => setScreen('home')} onFinish={finalResults => { const correct = finalResults.filter(result => result.correct); const passport = [...new Set([...passportIds, ...correct.map(result => result.breed.id)])]; setQuizResults(finalResults); saveChallengeToAccount({ nameBreedBest: Math.max(Number(localStorage.getItem('horseguessr-quiz-best') || 0), correct.length), passport }); setScreen('quiz-summary') }} />
  else if (screen === 'quiz-summary') page = <QuizSummary kind="name" results={quizResults} onReplay={() => { setQuizResults([]); setScreen('breed-quiz') }} onHome={() => setScreen('home')} />
  else if (screen === 'photo-quiz') page = <PhotoQuiz onExit={() => setScreen('home')} onFinish={finalResults => { const correct = finalResults.filter(result => result.correct); const passport = [...new Set([...passportIds, ...correct.map(result => result.breed.id)])]; setQuizResults(finalResults); saveChallengeToAccount({ photoQuizBest: Math.max(Number(localStorage.getItem('horseguessr-photo-quiz-best') || 0), correct.length), passport }); setScreen('photo-summary') }} />
  else if (screen === 'photo-summary') page = <QuizSummary kind="photo" results={quizResults} onReplay={() => { setQuizResults([]); setScreen('photo-quiz') }} onHome={() => setScreen('home')} />
  else if (screen === 'guide') page = <FieldGuide onHome={() => setScreen('home')} onGuide={() => setScreen('guide')} onFavorites={() => setScreen('favorites')} onPassport={() => setScreen('passport')} />
  else if (screen === 'favorites') page = <FavoriteBreeds onHome={() => setScreen('home')} onGuide={() => setScreen('guide')} onFavorites={() => setScreen('favorites')} onPassport={() => setScreen('passport')} />
  else if (screen === 'passport') page = <BreedPassport onHome={() => setScreen('home')} onGuide={() => setScreen('guide')} onFavorites={() => setScreen('favorites')} onPassport={() => setScreen('passport')} />
  else page = <Home dailyKey={centralClock.key} dailyLocked={dailyLocked} resetIn={centralClock.resetIn} onStart={() => start('daily')} onPractice={() => setScreen('practice-picker')} onBreedQuiz={() => { setQuizResults([]); setScreen('breed-quiz') }} onPhotoQuiz={() => { setQuizResults([]); setScreen('photo-quiz') }} onGuide={() => setScreen('guide')} onFavorites={() => setScreen('favorites')} onPassport={() => setScreen('passport')} />
  return (
    <MagnificationContext.Provider value={{ enabled: magnificationEnabled, setEnabled: setMagnificationEnabled }}>
      <AccountContext.Provider value={{ account, openAuth: setAuthMode, signOut, openProfile }}>
        <FavoritesContext.Provider value={{ favoriteIds, topFavoriteIds, toggleFavorite, toggleTopFavorite }}>
          <PassportContext.Provider value={{ passportIds, awardPassportMedal }}>
            {page}
            {!reportDashboard && !accountDashboard && <CookieNotice />}
            {authMode && <AccountModal mode={authMode} snapshot={accountSnapshot()} onClose={() => setAuthMode(null)} onSuccess={applyAccount} />}
            {accountNotice && <AccountStatusNotice message={accountNotice} onClose={() => setAccountNotice('')} />}
          </PassportContext.Provider>
        </FavoritesContext.Provider>
      </AccountContext.Provider>
    </MagnificationContext.Provider>
  )
}
