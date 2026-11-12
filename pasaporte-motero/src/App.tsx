import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import {
  Search, MapPin, Compass, BookOpen, Plus, Users, UserRound, ChevronRight,
  Award, Lock, Map, Mountain, Sunrise, Tent, Navigation, CheckCircle2,
  ShieldCheck, Camera, Bike, Bell, Heart, MessageCircle, Share2, Route,
  Images, X, LocateFixed, CalendarDays, Bookmark, SlidersHorizontal,
  ArrowLeft, Clock3, Send, ImagePlus, Globe2, Settings, LogOut, QrCode,
  BadgeCheck, AlertCircle, CloudOff, MoreHorizontal, Flag, UserPlus, Stamp,
  MapPinned, Trophy, Sparkles, FileCheck2, ScanLine, Wrench, CalendarClock, FileText, ChevronDown, Sun, Moon
} from 'lucide-react'
import { allRegions, regions } from './data'
import { isSupabaseConfigured, supabase } from './lib/supabase'

type Tab = 'explore' | 'passport' | 'community' | 'profile'
type VisitStatus = 'validated' | 'pending' | 'rejected'
type Destination = { id: number; title: string; region: string; province: string; city: string; category: string; distance: string; image: string; description: string; lat: number; lng: number; radius: number }
type Post = { id: string | number; title: string; text: string; place: string; date: string; likes: number; liked?: boolean; saved?: boolean; visibility: 'public'|'followers'|'private'; image?: string; comments: string[] }
type Visit = { id: number; destinationId: number; date: string; method: 'gps'|'photo'|'qr'; status: VisitStatus; note?: string; image?: string }
type Trip = { id: string; name: string; start: string; end: string; description: string; destinationIds: number[]; visibility: 'public'|'followers'|'private'; photos: string[] }

const destinations: Destination[] = [
  { id: 1, title: 'Abra Anticona (Ticlio)', region: 'Junín', province: 'Yauli', city: 'Morococha', category: 'Montañas', distance: '124 km', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85', description: 'Uno de los pasos de montaña más emblemáticos de la Carretera Central. Un recorrido de altura entre paisajes andinos.', lat: -11.609, lng: -76.193, radius: 350 },
  { id: 2, title: 'Reserva Nacional de Paracas', region: 'Ica', province: 'Pisco', city: 'Paracas', category: 'Costa', distance: '250 km', image: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1100&q=85', description: 'Desierto, mar y acantilados en una de las reservas naturales más reconocidas del litoral peruano.', lat: -13.835, lng: -76.25, radius: 500 },
  { id: 3, title: 'Cañón del Pato', region: 'Áncash', province: 'Huaylas', city: 'Huallanca', category: 'Rutas', distance: '480 km', image: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1100&q=85', description: 'Una ruta escénica entre paredes rocosas, túneles y paisajes de la cordillera.', lat: -8.817, lng: -77.87, radius: 500 },
  { id: 4, title: 'Laguna Llanganuco', region: 'Áncash', province: 'Yungay', city: 'Yungay', category: 'Montañas', distance: '—', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1100&q=85', description: 'Lagunas de aguas turquesas rodeadas por nevados dentro del Parque Nacional Huascarán.', lat: -9.064, lng: -77.612, radius: 500 },
  { id: 5, title: 'Torre Torre', region: 'Junín', province: 'Huancayo', city: 'Huancayo', category: 'Naturaleza', distance: '—', image: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1100&q=85', description: 'Formaciones geológicas de arcilla y arena que forman un paisaje singular cerca de Huancayo.', lat: -12.052, lng: -75.205, radius: 300 },
  { id: 6, title: 'Huacachina', region: 'Ica', province: 'Ica', city: 'Ica', category: 'Desierto', distance: '—', image: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=1100&q=85', description: 'Oasis rodeado de dunas, uno de los paisajes más conocidos del sur peruano.', lat: -14.087, lng: -75.763, radius: 300 },
]
const categories = ['Todos', 'Montañas', 'Rutas', 'Costa', 'Naturaleza', 'Histórico', 'Desierto']
const initialPosts: Post[] = [
  { id: 1, title: 'Rumbo a la Cordillera Blanca', text: 'Cada kilómetro es una historia. Próxima parada: Huaraz. Preparando la primera expedición de Pasaporte Motero.', place: 'Áncash, Perú', date: 'Hace 2 h', likes: 24, visibility: 'public', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85', comments: ['¡Qué buena ruta!', 'Comparte el track cuando puedas.'] },
  { id: 2, title: 'Carretera y libertad', text: 'Una parada para disfrutar el paisaje y seguir sumando kilómetros.', place: 'Junín, Perú', date: 'Ayer', likes: 12, visibility: 'public', image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=85', comments: [] },
]
const initialTrips: Trip[] = []

function readStore<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback } catch { return fallback }
}
function distanceMeters(a: GeolocationCoordinates, lat: number, lng: number) {
  const rad = (v: number) => v * Math.PI / 180
  const dLat = rad(lat - a.latitude), dLng = rad(lng - a.longitude)
  const x = Math.sin(dLat/2)**2 + Math.cos(rad(a.latitude))*Math.cos(rad(lat))*Math.sin(dLng/2)**2
  return 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x))
}
function initials(name: string) { return name.split(' ').filter(Boolean).slice(0,2).map(x => x[0]).join('').toUpperCase() || 'VM' }

export default function App() {
  const [tab, setTab] = useState<Tab>('explore')
  const [subview, setSubview] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todos')
  const [regionFilter, setRegionFilter] = useState('Todos')
  const [showFilters, setShowFilters] = useState(false)
  const [selected, setSelected] = useState<Destination | null>(null)
  const [showActions, setShowActions] = useState(false)
  const [action, setAction] = useState<'visit'|'trip'|'post'|'memory'|''>('')
  const [visitMethod, setVisitMethod] = useState<'gps'|'photo'|'qr'>('gps')
  const [visitDestination, setVisitDestination] = useState<number>(1)
  const [visits, setVisits] = useState<Visit[]>(() => readStore('pm_visits', []))
  const [posts, setPosts] = useState<Post[]>(() => readStore('pm_posts', initialPosts))
  const [trips, setTrips] = useState<Trip[]>(() => readStore('pm_trips', initialTrips))
  const [saved, setSaved] = useState<number[]>(() => readStore('pm_saved', []))
  const [displayName, setDisplayName] = useState(() => readStore('pm_name', 'Viajero Motero'))
  const [username, setUsername] = useState(() => readStore('pm_username', 'viajero_motero'))
  const [bio, setBio] = useState(() => readStore('pm_bio', 'Viajando y descubriendo nuevas rutas.'))
  const [homeCity, setHomeCity] = useState(() => readStore('pm_city', 'Perú'))
  const [motorcycleBrand, setMotorcycleBrand] = useState('')
  const [motorcycleModel, setMotorcycleModel] = useState('')
  const [motorcycleYear, setMotorcycleYear] = useState('')
  const [profileBusy, setProfileBusy] = useState(false)
  const [motorcycleId, setMotorcycleId] = useState<string | null>(null)
  const [motorcyclePhoto, setMotorcyclePhoto] = useState('')
  const [motorcyclePhotoFile, setMotorcyclePhotoFile] = useState<File | null>(null)
  const [motorcyclePhotoPreview, setMotorcyclePhotoPreview] = useState('')
  const [motorcycleCropX, setMotorcycleCropX] = useState(50)
  const [motorcycleCropY, setMotorcycleCropY] = useState(50)
  const cropDrag = useRef<{x:number;y:number;cropX:number;cropY:number}|null>(null)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [documentBusy, setDocumentBusy] = useState(false)
  const [motorcycleCc, setMotorcycleCc] = useState('')
  const [motorcycleType, setMotorcycleType] = useState('Adventure')
  const [motorcycleFuel, setMotorcycleFuel] = useState('Gasolina')
  const [motorcycleOdometer, setMotorcycleOdometer] = useState('')
  const [motorcycleNotes, setMotorcycleNotes] = useState('')
  const [motorcycleBusy, setMotorcycleBusy] = useState(false)
  const [maintenance, setMaintenance] = useState<any[]>([])
  const [maintenanceDate, setMaintenanceDate] = useState(new Date().toISOString().slice(0,10))
  const [maintenanceType, setMaintenanceType] = useState('Cambio de aceite')
  const [maintenanceKm, setMaintenanceKm] = useState('')
  const [maintenanceCost, setMaintenanceCost] = useState('')
  const [maintenanceNotes, setMaintenanceNotes] = useState('')
  const [documentType, setDocumentType] = useState('SOAT')
  const [documentExpiry, setDocumentExpiry] = useState('')
  const [documents, setDocuments] = useState<any[]>([])
  const [postTitle, setPostTitle] = useState('')
  const [postText, setPostText] = useState('')
  const [postPlace, setPostPlace] = useState('')
  const [postVisibility, setPostVisibility] = useState<'public'|'followers'|'private'>('public')
  const [postImage, setPostImage] = useState('')
  const [tripName, setTripName] = useState('')
  const [tripStart, setTripStart] = useState(new Date().toISOString().slice(0,10))
  const [tripEnd, setTripEnd] = useState('')
  const [tripDescription, setTripDescription] = useState('')
  const [tripVisibility, setTripVisibility] = useState<'public'|'followers'|'private'>('private')
  const [tripDestinations, setTripDestinations] = useState<number[]>([])
  const [tripStopSelection, setTripStopSelection] = useState('')
  const [tripManualStop, setTripManualStop] = useState('')
  const [tripManualStops, setTripManualStops] = useState<string[]>([])
  const [visitNote, setVisitNote] = useState('')
  const [visitPhoto, setVisitPhoto] = useState('')
  const [qr, setQr] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [offline, setOffline] = useState(!navigator.onLine)
  const [feedMode, setFeedMode] = useState<'all'|'following'>('all')
  const [commentPost, setCommentPost] = useState<string | number | null>(null)
  const [commentText, setCommentText] = useState('')
  const [followed, setFollowed] = useState<string[]>(() => readStore('pm_followed', []))
  const [qrManual, setQrManual] = useState('')
  const [adminMode, setAdminMode] = useState(false)
  const [mapMode, setMapMode] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login'|'register'>('login')
  const [theme, setTheme] = useState<'dark'|'light'>(() => (localStorage.getItem('pm_theme') as 'dark'|'light') || 'dark')
  const [registerName, setRegisterName] = useState('')
  const [registerUsername, setRegisterUsername] = useState('')
  const [registerCity, setRegisterCity] = useState('')
  const [registerMotorcycle, setRegisterMotorcycle] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authUser, setAuthUser] = useState<string | null>(null)
  const [authUserId, setAuthUserId] = useState<string | null>(null)
  const [motorcycleOpen, setMotorcycleOpen] = useState(true)
  const [maintenanceOpen, setMaintenanceOpen] = useState(true)
  const [documentsOpen, setDocumentsOpen] = useState(true)

  useEffect(() => { localStorage.setItem('pm_theme', theme); document.documentElement.dataset.theme = theme; const color = theme === 'light' ? '#f5f6f7' : '#111111'; document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color); document.documentElement.style.backgroundColor = color; document.body.style.backgroundColor = color }, [theme])
  useEffect(() => { localStorage.setItem('pm_visits', JSON.stringify(visits)) }, [visits])
  useEffect(() => { localStorage.setItem('pm_posts', JSON.stringify(posts)) }, [posts])
  useEffect(() => { localStorage.setItem('pm_trips', JSON.stringify(trips)) }, [trips])
  useEffect(() => { localStorage.setItem('pm_saved', JSON.stringify(saved)) }, [saved])
  useEffect(() => { localStorage.setItem('pm_followed', JSON.stringify(followed)) }, [followed])
  useEffect(() => {
    if (!supabase) return
    let alive = true
    const loadProfile = async (userId: string) => {
      const { data, error } = await supabase!.from('profiles')
        .select('username, full_name, bio, city, avatar_url, motorcycle_brand, motorcycle_model, motorcycle_year')
        .eq('id', userId).maybeSingle()
      if (!alive) return
      if (error) { notify('No pudimos cargar tu perfil: ' + error.message); return }
      if (data) {
        setUsername(data.username || '')
        setDisplayName(data.full_name || 'Viajero Motero')
        setBio(data.bio || '')
        setHomeCity(data.city || 'Perú')
        setAvatarUrl(data.avatar_url || '')
        setMotorcycleBrand(data.motorcycle_brand || '')
        setMotorcycleModel(data.motorcycle_model || '')
        setMotorcycleYear(data.motorcycle_year ? String(data.motorcycle_year) : '')
      }
    }
    supabase.auth.getSession().then(({data}) => {
      if (!alive) return
      const user = data.session?.user
      setAuthUser(user?.email || null)
      setAuthUserId(user?.id || null)
      if (user) { void loadProfile(user.id); void loadMotorcycle(user.id); void loadTrips(user.id); void loadCommunityPosts() } else { void loadCommunityPosts() }
    })
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user.email || null)
      setAuthUserId(session?.user.id || null)
      if (session?.user) { void loadProfile(session.user.id); void loadMotorcycle(session.user.id); void loadTrips(session.user.id); void loadCommunityPosts() }
      else { resetSignedOutData(); void loadCommunityPosts() }
    })
    return () => { alive = false; subscription.unsubscribe() }
  }, [])
  useEffect(() => { const on = () => setOffline(false); const off = () => setOffline(true); window.addEventListener('online', on); window.addEventListener('offline', off); return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) } }, [])

  const visitedIds = useMemo(() => new Set(visits.filter(v => v.status === 'validated').map(v => v.destinationId)), [visits])
  const visitedCount = visitedIds.size
  const visitedRegionCount = new Set(visits.filter(v => v.status === 'validated').map(v => destinations.find(d => d.id === v.destinationId)?.region).filter(Boolean)).size
  const progress = Math.round(visitedRegionCount / allRegions.length * 100)
  const filteredDestinations = destinations.filter(d => (category === 'Todos' || d.category === category) && (regionFilter === 'Todos' || d.region === regionFilter) && `${d.title} ${d.region} ${d.province} ${d.city}`.toLowerCase().includes(query.toLowerCase()))
  const visiblePosts = posts.filter(p => p.visibility !== 'private').filter(p => feedMode === 'all' || followed.length === 0 || followed.includes('motero_viajero'))

  function openTab(next: Tab) { setSubview(''); setSelected(null); setTab(next) }
  function formatDisplayDate(value: string) {
    if (!value) return 'Sin fecha'
    const [year, month, day] = value.slice(0,10).split('-').map(Number)
    if (!year || !month || !day) return 'Sin fecha'
    return new Intl.DateTimeFormat('es-PE',{day:'2-digit',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(year,month-1,day)))
  }
  function startMotorcycleCrop(event: import('react').PointerEvent<HTMLDivElement>) {
    if (!motorcyclePhotoFile) return
    event.currentTarget.setPointerCapture(event.pointerId)
    cropDrag.current={x:event.clientX,y:event.clientY,cropX:motorcycleCropX,cropY:motorcycleCropY}
  }
  function moveMotorcycleCrop(event: import('react').PointerEvent<HTMLDivElement>) {
    const start=cropDrag.current; if(!start)return
    const rect=event.currentTarget.getBoundingClientRect()
    setMotorcycleCropX(Math.max(0,Math.min(100,start.cropX-(event.clientX-start.x)/rect.width*100)))
    setMotorcycleCropY(Math.max(0,Math.min(100,start.cropY-(event.clientY-start.y)/rect.height*100)))
  }
  function endMotorcycleCrop(){cropDrag.current=null}
  function notify(message: string) { setNotice(message); window.setTimeout(() => setNotice(''), 4200) }
  function resetSignedOutData() {
    ;['pm_name','pm_username','pm_bio','pm_city','pm_visits','pm_posts','pm_trips','pm_saved','pm_followed'].forEach(key => localStorage.removeItem(key))
    setDisplayName('Viajero Motero'); setUsername('viajero_motero'); setBio(''); setHomeCity('Perú')
    setVisits([]); setPosts([]); setTrips([]); setSaved([]); setFollowed([])
    setMotorcycleBrand(''); setMotorcycleModel(''); setMotorcycleYear(''); setMotorcycleId(null)
    setAvatarUrl(''); setAvatarFile(null); setDocumentFile(null)
    setMotorcyclePhoto(''); setMotorcyclePhotoFile(null); setMotorcyclePhotoPreview('')
    setMotorcycleCc(''); setMotorcycleType('Adventure'); setMotorcycleFuel('Gasolina')
    setMotorcycleOdometer(''); setMotorcycleNotes(''); setMaintenance([]); setDocuments([])
    setQr(''); setAdminMode(false); setAuthUser(null); setAuthUserId(null)
    setSubview(''); setSelected(null); setAction(''); setShowActions(false); setTab('profile')
  }
  function closeModal() { setAction(''); setVisitPhoto(''); setVisitNote(''); setPostImage(''); setCommentPost(null) }
  function fileToData(file?: File) { if (!file) return; if (file.size > 2_500_000) { notify('La imagen supera 2.5 MB. Selecciona una más ligera.'); return } const reader = new FileReader(); reader.onload = () => setVisitPhoto(String(reader.result || '')); reader.readAsDataURL(file) }
  async function postFileToData(file?: File) {
    if (!file) return
    if (!file.type.startsWith('image/')) { notify('Selecciona una imagen JPG, PNG o WebP.'); return }
    if (file.size <= 2_500_000) {
      const reader = new FileReader()
      reader.onload = () => setPostImage(String(reader.result || ''))
      reader.readAsDataURL(file)
      return
    }
    try {
      const sourceUrl = URL.createObjectURL(file)
      const image = new Image()
      image.src = sourceUrl
      await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('No se pudo leer la imagen'))})
      const canvas = document.createElement('canvas')
      const scale = Math.min(1, 2200 / Math.max(image.naturalWidth,image.naturalHeight))
      canvas.width = Math.round(image.naturalWidth * scale)
      canvas.height = Math.round(image.naturalHeight * scale)
      const context = canvas.getContext('2d')
      if (!context) throw new Error('No se pudo preparar la imagen')
      context.drawImage(image,0,0,canvas.width,canvas.height)
      URL.revokeObjectURL(sourceUrl)
      let quality = 0.88
      let blob: Blob | null = await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality))
      while (blob && blob.size > 2_400_000 && quality > 0.48) {
        quality -= 0.1
        blob = await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality))
      }
      if (!blob || blob.size > 2_500_000) { notify('No fue posible reducir la imagen a 2.5 MB. Prueba con otra fotografía.'); return }
      const before=(file.size/1024/1024).toFixed(2), after=(blob.size/1024/1024).toFixed(2)
      if (!window.confirm(`La fotografía pesa ${before} MB. Podemos comprimirla automáticamente a ${after} MB para publicarla. ¿Aceptas la compresión?`)) { notify('No se aplicó compresión. Elige otra fotografía si deseas continuar.'); return }
      const reader = new FileReader()
      reader.onload = () => { setPostImage(String(reader.result || '')); notify(`Imagen comprimida: ${before} MB → ${after} MB.`) }
      reader.readAsDataURL(blob)
    } catch { notify('No se pudo comprimir esta fotografía. Prueba con otra imagen.') }
  }

  async function makePersonalQr() {
    try { const code = `PM-DEMO-${username}-${btoa(username).replace(/=/g,'').slice(0,8)}`; setQr(await QRCode.toDataURL(code, { width: 240, margin: 2 })); notify('QR de demostración generado. La validación real requiere autenticación y función segura en servidor.') }
    catch { notify('No se pudo generar el QR.') }
  }

  async function validateGps() {
    const dest = destinations.find(d => d.id === visitDestination)
    if (!dest) return
    if (!navigator.geolocation) { notify('Este dispositivo no ofrece geolocalización. Puedes solicitar validación fotográfica.'); return }
    setBusy(true)
    navigator.geolocation.getCurrentPosition(position => {
      const meters = distanceMeters(position.coords, dest.lat, dest.lng)
      setBusy(false)
      if (meters <= dest.radius) {
        setVisits(v => [{ id: Date.now(), destinationId: dest.id, date: new Date().toISOString(), method: 'gps', status: 'validated', note: visitNote }, ...v])
        notify(`¡Visita GPS validada! Has conseguido el sello de ${dest.title}.`)
        closeModal(); setTab('passport')
      } else {
        notify(`Estás aproximadamente a ${(meters/1000).toFixed(1)} km de ${dest.title}. Puedes enviar una evidencia fotográfica.`)
        setVisitMethod('photo')
      }
    }, error => { setBusy(false); notify(error.code === 1 ? 'Permiso de ubicación denegado. Actívalo en tu navegador o utiliza fotografía.' : 'No pudimos obtener tu ubicación. Intenta nuevamente o utiliza fotografía.') }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 })
  }
  function submitPhotoVisit() {
    if (!visitPhoto) { notify('Adjunta una fotografía para continuar.'); return }
    setVisits(v => [{ id: Date.now(), destinationId: visitDestination, date: new Date().toISOString(), method: 'photo', status: 'pending', note: visitNote, image: visitPhoto }, ...v])
    notify('Evidencia guardada como pendiente de revisión. El sello se activará cuando sea aprobada.')
    closeModal()
  }
  function submitQrCode() {
    if (!qrManual.trim()) { notify('Ingresa el código proporcionado por el establecimiento autorizado.'); return }
    notify('Código recibido en modo demostración. La confirmación presencial requiere un escaneo autorizado y validación del servidor.')
    setQrManual('')
  }
  async function loadCommunityPosts() {
    if (!supabase) return
    const { data, error } = await supabase.from('posts').select('id,user_id,title,body,visibility,created_at,post_photos(storage_path)').order('created_at',{ascending:false}).limit(50)
    if (error) { notify('No pudimos cargar el feed: '+error.message); return }
    const userIds=[...new Set((data || []).map((row:any)=>row.user_id))]
    const {data:profiles}=userIds.length ? await supabase.from('profiles').select('id,username,full_name,avatar_url').in('id',userIds) : {data:[] as any[]}
    const profileById=new Map((profiles || []).map((profile:any)=>[profile.id,profile]))
    const rows = await Promise.all((data || []).map(async (row:any) => {
      const photo = row.post_photos?.[0]?.storage_path
      let image: string | undefined
      if (photo) { const {data:signed} = await supabase!.storage.from('community').createSignedUrl(photo,3600); image=signed?.signedUrl || undefined }
      const profile = profileById.get(row.user_id)
      return {id:row.id,title:row.title || 'Una nueva aventura',text:row.body,place:'Comunidad motera',date:new Intl.DateTimeFormat('es-PE',{dateStyle:'medium'}).format(new Date(row.created_at)),likes:0,visibility:row.visibility,image,comments:[],authorName:profile?.full_name || 'Motero',authorUsername:profile?.username || 'viajero'} as Post & {authorName:string;authorUsername:string}
    }))
    setPosts(rows)
  }
  async function publishPost() {
    if (!postText.trim()) { notify('Escribe algo sobre tu aventura antes de publicar.'); return }
    const user = await getCurrentAuthUser()
    if (!supabase || !user) { setAuthMode('login'); setAuthOpen(true); notify('Inicia sesión para publicar en la comunidad.'); return }
    setBusy(true)
    const {data:post,error} = await supabase.from('posts').insert({user_id:user.id,post_type:postImage?'photo':'diary',title:postTitle.trim() || 'Una nueva aventura',body:postText.trim(),visibility:postVisibility}).select('id').single()
    if (error || !post) { setBusy(false); notify('No se pudo publicar: '+(error?.message || 'No se recibió confirmación')); return }
    if (postImage) {
      try {
        const blob = await (await fetch(postImage)).blob()
        const ext = blob.type==='image/png'?'png':blob.type==='image/webp'?'webp':'jpg'
        const path = user.id+'/'+post.id+'/'+crypto.randomUUID()+'.'+ext
        const {error:uploadError} = await supabase.storage.from('community').upload(path,blob,{contentType:blob.type,upsert:false})
        if (uploadError) throw uploadError
        const {error:photoError} = await supabase.from('post_photos').insert({post_id:post.id,user_id:user.id,storage_path:path,sort_order:0})
        if (photoError) { await supabase.storage.from('community').remove([path]); throw photoError }
      } catch (err:any) {
        await supabase.from('posts').delete().eq('id',post.id)
        setBusy(false); notify('No se pudo guardar la fotografía: '+(err?.message || 'Error de almacenamiento')); return
      }
    }
    setBusy(false); setPostTitle(''); setPostText(''); setPostPlace(''); setPostImage(''); setAction(''); setTab('community')
    await loadCommunityPosts()
    notify(postVisibility==='public'?'Publicación publicada en la comunidad.':'Publicación guardada con la privacidad seleccionada.')
  }
  async function createTrip() {
    if (!tripName.trim()) { notify('Escribe un nombre para tu viaje.'); return }
    const user = await getCurrentAuthUser()
    if (!supabase || !user) { setAuthMode('login'); setAuthOpen(true); notify('Inicia sesión para sincronizar tus viajes.'); return }
    if (tripEnd && tripEnd < tripStart) { notify('La fecha de fin no puede ser anterior al inicio.'); return }
    setBusy(true)
    const { data, error } = await supabase.from('trips').insert({ user_id: user.id, name: tripName.trim(), description: tripDescription.trim() || null, start_date: tripStart || null, end_date: tripEnd || null, visibility: tripVisibility }).select('id,name,description,start_date,end_date,visibility').single()
    setBusy(false)
    if (error) { notify('No se pudo crear el viaje: ' + error.message); return }
    const allStops=[
      ...tripDestinations.map((id,index)=>({trip_id:data.id,user_id:user.id,name:destinations.find(d=>d.id===id)?.title || 'Destino',catalog_destination_id:id,sort_order:index})),
      ...tripManualStops.map((name,index)=>({trip_id:data.id,user_id:user.id,name,catalog_destination_id:null,sort_order:tripDestinations.length+index}))
    ]
    if (allStops.length) {
      const {error:stopsError}=await supabase.from('trip_custom_stops').insert(allStops)
      if (stopsError) { await supabase.from('trips').delete().eq('id',data.id); setBusy(false); notify('No se pudieron guardar las paradas. Ejecuta la migración 0003 y vuelve a intentarlo.'); return }
    }
    const newTrip: Trip = { id: data.id, name: data.name, start: data.start_date || '', end: data.end_date || '', description: data.description || '', destinationIds: tripDestinations, visibility: data.visibility, photos: [] }
    setTrips(items => [newTrip, ...items])
    setTripName(''); setTripDescription(''); setTripDestinations([]); setTripManualStops([]); setTripStopSelection(''); setTripManualStop(''); setAction(''); setTab('profile'); setSubview('trips')
    notify('Viaje creado y sincronizado con tu cuenta.')
  }
  function toggleLike(id: string | number) { setPosts(p => p.map(x => x.id === id ? { ...x, liked: !x.liked, likes: Math.max(0, x.likes + (x.liked ? -1 : 1)) } : x)) }
  function addComment() { if (commentPost === null || !commentText.trim()) return; setPosts(p => p.map(x => x.id === commentPost ? { ...x, comments: [...x.comments, commentText.trim()] } : x)); setCommentText(''); setCommentPost(null); notify('Comentario añadido localmente.') }
  function toggleSaved(id: string | number) { setSaved(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]); notify(saved.includes(id) ? 'Destino eliminado de guardados.' : 'Destino guardado para después.') }
  function openAction(which: 'visit'|'trip'|'post'|'memory') { setShowActions(false); setAction(which); if (which === 'visit') setVisitDestination(selected?.id || destinations[0].id) }
  function createMemory() { setAction('post'); setPostTitle('Un recuerdo de viaje'); setPostVisibility('private') }

  async function loadTrips(userId: string) {
    if (!supabase) return
    const { data, error } = await supabase.from('trips').select('id,name,description,start_date,end_date,visibility,trip_photos(storage_path)').eq('user_id', userId).order('created_at', { ascending: false })
    if (error) { notify('No pudimos cargar tus viajes: ' + error.message); return }
    const rows = await Promise.all((data || []).map(async (row: any) => {
      const paths = (row.trip_photos || []).map((photo: any) => photo.storage_path).filter(Boolean)
      const urls = await Promise.all(paths.map(async (path: string) => {
        const { data: signed } = await supabase!.storage.from('travel-media').createSignedUrl(path, 3600)
        return signed?.signedUrl || ''
      }))
      return { id: row.id, name: row.name, start: row.start_date || '', end: row.end_date || '', description: row.description || '', destinationIds: [], visibility: row.visibility, photos: urls.filter(Boolean) } as Trip
    }))
    setTrips(rows)
  }

  async function addTripPhoto(tripId: string, file?: File) {
    if (!file || !supabase) return
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { notify('Selecciona JPG, PNG o WebP de máximo 5 MB.'); return }
    const user = await getCurrentAuthUser()
    if (!user) { setAuthMode('login'); setAuthOpen(true); notify('Inicia sesión para guardar fotografías.'); return }
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const path = user.id + '/trips/' + tripId + '/' + crypto.randomUUID() + '.' + ext
    setBusy(true)
    const { error: uploadError } = await supabase.storage.from('travel-media').upload(path, file, { contentType: file.type, upsert: false })
    if (uploadError) { setBusy(false); notify('No se pudo subir la foto: ' + uploadError.message); return }
    const { error: rowError } = await supabase.from('trip_photos').insert({ trip_id: tripId, user_id: user.id, storage_path: path })
    if (rowError) { await supabase.storage.from('travel-media').remove([path]); setBusy(false); notify('No se pudo vincular la foto: ' + rowError.message); return }
    const { data: signed } = await supabase.storage.from('travel-media').createSignedUrl(path, 3600)
    setTrips(items => items.map(trip => trip.id === tripId ? { ...trip, photos: [...trip.photos, signed?.signedUrl || ''].filter(Boolean) } : trip))
    setBusy(false); notify('Fotografía añadida a tu bitácora.')
  }

  async function getCurrentAuthUser() {
    if (!supabase) return null
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (session?.user) return session.user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (user) return user
    if (authUserId) return { id: authUserId } as { id: string }
    if (sessionError || userError) console.warn('Supabase auth state:', sessionError || userError)
    return null
  }

  async function loadMotorcycle(userId: string) {
    if (!supabase) return
    const { data: bike, error } = await supabase.from('motorcycles').select('*').eq('user_id', userId).maybeSingle()
    if (error) { notify('No pudimos cargar tu motocicleta: ' + error.message); return }
    if (!bike) { setMotorcycleId(null); setMaintenance([]); setDocuments([]); return }
    setMotorcycleId(bike.id)
    setMotorcycleBrand(bike.brand || '')
    setMotorcycleModel(bike.model || '')
    setMotorcycleYear(bike.year ? String(bike.year) : '')
    setMotorcycleCc(bike.displacement_cc ? String(bike.displacement_cc) : '')
    setMotorcycleType(bike.motorcycle_type || 'Adventure')
    setMotorcycleFuel(bike.fuel_type || 'Gasolina')
    setMotorcycleOdometer(bike.odometer_km != null ? String(bike.odometer_km) : '')
    setMotorcycleNotes(bike.notes || '')
    setMotorcyclePhoto(bike.photo_url || '')
    setMotorcycleCropX(Number(bike.photo_position_x ?? 50)); setMotorcycleCropY(Number(bike.photo_position_y ?? 50))
    if (bike.photo_url?.startsWith('motorcycles/')) {
      const { data: signed } = await supabase.storage.from('motorcycles').createSignedUrl(bike.photo_url.slice('motorcycles/'.length), 3600)
      setMotorcyclePhotoPreview(signed?.signedUrl || '')
    } else setMotorcyclePhotoPreview('')
    const [{ data: services, error: servicesError }, { data: docs, error: docsError }] = await Promise.all([
      supabase.from('motorcycle_maintenance').select('*').eq('motorcycle_id', bike.id).eq('user_id', userId).order('service_date', { ascending: false }),
      supabase.from('motorcycle_documents').select('*').eq('motorcycle_id', bike.id).eq('user_id', userId).order('expiry_date', { ascending: true })
    ])
    if (servicesError) notify('No pudimos cargar el mantenimiento: ' + servicesError.message)
    else setMaintenance(services || [])
    if (docsError) notify('No pudimos cargar los documentos: ' + docsError.message)
    else setDocuments(docs || [])
  }

  async function saveMotorcycle() {
    if (!supabase) return
    const user = await getCurrentAuthUser()
    if (!user) { notify('Tu sesión no está disponible. Vuelve a entrar y prueba nuevamente.'); return }
    if (!motorcycleBrand.trim() || !motorcycleModel.trim()) { notify('Completa marca y modelo en Configuración.'); return }
    const cc = motorcycleCc.trim() ? Number(motorcycleCc) : null, km = motorcycleOdometer.trim() ? Number(motorcycleOdometer) : null
    if ((cc !== null && (!Number.isInteger(cc) || cc < 1 || cc > 3000)) || (km !== null && (!Number.isFinite(km) || km < 0))) { notify('Revisa cilindrada y kilometraje.'); return }
    setMotorcycleBusy(true)
    let photoPath = motorcyclePhoto.trim() || null
    if (motorcyclePhotoFile) {
      const extension = motorcyclePhotoFile.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = user.id + '/' + crypto.randomUUID() + '.' + extension
      const {error:uploadError} = await supabase.storage.from('motorcycles').upload(path,motorcyclePhotoFile,{upsert:false,contentType:motorcyclePhotoFile.type,cacheControl:'3600'})
      if (uploadError) { setMotorcycleBusy(false); notify('No se pudo subir la fotografía: ' + uploadError.message); return }
      photoPath = 'motorcycles/' + path
    }
    const payload = {user_id:user.id,brand:motorcycleBrand.trim(),model:motorcycleModel.trim(),year:motorcycleYear ? Number(motorcycleYear) : null,photo_url:photoPath,photo_position_x:motorcycleCropX,photo_position_y:motorcycleCropY,displacement_cc:cc,motorcycle_type:motorcycleType,fuel_type:motorcycleFuel,odometer_km:km,notes:motorcycleNotes.trim() || null,updated_at:new Date().toISOString()}
    const {data,error} = await supabase.from('motorcycles').upsert(payload,{onConflict:'user_id'}).select('id').single()
    setMotorcycleBusy(false); if (error) { notify('No se pudo guardar: ' + error.message); return }
    setMotorcycleId(data.id); setMotorcyclePhoto(photoPath || ''); setMotorcyclePhotoFile(null); if (photoPath?.startsWith('motorcycles/')) { const {data:signed}=await supabase.storage.from('motorcycles').createSignedUrl(photoPath.slice('motorcycles/'.length),3600); setMotorcyclePhotoPreview(signed?.signedUrl || '') } notify('Ficha de motocicleta sincronizada.')
  }
  async function addMaintenance() {
    if (!supabase || !motorcycleId) { notify('Primero guarda la ficha de tu motocicleta.'); return }
    const user = await getCurrentAuthUser(); if (!user) { setAuthMode('login'); setAuthOpen(true); notify('No encontramos una sesión activa. Inicia sesión para sincronizar tus datos.'); return }
    const km = maintenanceKm.trim() ? Number(maintenanceKm) : null, cost = maintenanceCost.trim() ? Number(maintenanceCost) : null
    if ((km !== null && km < 0) || (cost !== null && cost < 0)) { notify('Ingresa valores válidos.'); return }
    const {data,error} = await supabase.from('motorcycle_maintenance').insert({motorcycle_id:motorcycleId,user_id:user.id,service_date:maintenanceDate,service_type:maintenanceType,odometer_km:km,cost_pen:cost,notes:maintenanceNotes.trim() || null}).select('*').single()
    if (error) { notify('Error al registrar mantenimiento: ' + error.message); return }
    setMaintenance(items => [data,...items]); setMaintenanceKm(''); setMaintenanceCost(''); setMaintenanceNotes(''); notify('Mantenimiento registrado.')
  }
  async function addMotorcycleDocument() {
    if (!supabase || !motorcycleId) { notify('Primero guarda la ficha de tu motocicleta.'); return }
    const user = await getCurrentAuthUser()
    if (!user || !documentExpiry) { if (!user) { setAuthMode('login'); setAuthOpen(true) }; notify(!user ? 'Inicia sesión para continuar.' : 'Selecciona la fecha de vencimiento.'); return }
    if (documentFile && (!['image/jpeg','image/png','image/webp','application/pdf'].includes(documentFile.type) || documentFile.size > 10*1024*1024)) { notify('Adjunta JPG, PNG, WebP o PDF de máximo 10 MB.'); return }
    setDocumentBusy(true)
    let storagePath: string | null = null
    if (documentFile) {
      const ext = documentFile.name.split('.').pop()?.toLowerCase() || 'jpg'
      storagePath = user.id + '/documents/' + crypto.randomUUID() + '.' + ext
      const {error:uploadError} = await supabase.storage.from('motorcycles').upload(storagePath,documentFile,{upsert:false,contentType:documentFile.type})
      if (uploadError) { setDocumentBusy(false); notify('No se pudo subir el documento: ' + uploadError.message); return }
    }
    const {data,error} = await supabase.from('motorcycle_documents').insert({motorcycle_id:motorcycleId,user_id:user.id,document_type:documentType,expiry_date:documentExpiry,storage_path:storagePath}).select('*').single()
    setDocumentBusy(false)
    if (error) { if(storagePath) await supabase.storage.from('motorcycles').remove([storagePath]); notify('Error al guardar documento: ' + error.message); return }
    setDocuments(items => [...items,data].sort((a,b)=>a.expiry_date.localeCompare(b.expiry_date))); setDocumentExpiry(''); setDocumentFile(null); notify('Documento y vencimiento guardados de forma privada.')
  }
  async function openMotorcycleDocument(path: string) {
    if (!supabase) return
    const {data,error} = await supabase.storage.from('motorcycles').createSignedUrl(path,300)
    if (error || !data?.signedUrl) { notify('No se pudo abrir el documento.'); return }
    window.open(data.signedUrl,'_blank','noopener,noreferrer')
  }

  async function deleteMotorcycleDocument(doc: any) {
    if (!supabase) return
    const user=await getCurrentAuthUser()
    if(!user){notify('Inicia sesión para eliminar el documento.');return}
    if(!window.confirm(`¿Eliminar ${doc.document_type} y su archivo? Esta acción no se puede deshacer.`))return
    setDocumentBusy(true)
    if(doc.storage_path){const {error:storageError}=await supabase.storage.from('motorcycles').remove([doc.storage_path]);if(storageError){setDocumentBusy(false);notify('No se pudo eliminar el archivo: '+storageError.message);return}}
    const {error}=await supabase.from('motorcycle_documents').delete().eq('id',doc.id).eq('user_id',user.id)
    setDocumentBusy(false)
    if(error){notify('No se pudo eliminar el registro: '+error.message);return}
    setDocuments(items=>items.filter(item=>item.id!==doc.id));notify('Documento eliminado correctamente.')
  }
  async function saveProfile() {
    if (!supabase) { notify('Supabase no está disponible.'); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { notify('Inicia sesión para guardar tu perfil.'); return }
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (cleanUsername.length < 3) { notify('El nombre de usuario debe tener al menos 3 caracteres.'); return }
    const year = motorcycleYear.trim() ? Number(motorcycleYear) : null
    if (year !== null && (!Number.isInteger(year) || year < 1885 || year > new Date().getFullYear() + 1)) {
      notify('Ingresa un año válido para tu motocicleta.'); return
    }
    setProfileBusy(true)
    let nextAvatarUrl = avatarUrl
    if (avatarFile) {
      const ext = avatarFile.type === 'image/png' ? 'png' : avatarFile.type === 'image/webp' ? 'webp' : 'jpg'
      const path = user.id + '/' + crypto.randomUUID() + '.' + ext
      const {error:uploadError} = await supabase.storage.from('avatars').upload(path,avatarFile,{upsert:false,contentType:avatarFile.type,cacheControl:'3600'})
      if (uploadError) { setProfileBusy(false); notify('No se pudo subir la foto de perfil: ' + uploadError.message); return }
      nextAvatarUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
    }
    const { error } = await supabase.from('profiles').update({
      username: cleanUsername, full_name: displayName.trim() || 'Viajero Motero',
      bio: bio.trim() || null, city: homeCity.trim() || null, avatar_url: nextAvatarUrl || null,
      motorcycle_brand: motorcycleBrand.trim() || null, motorcycle_model: motorcycleModel.trim() || null,
      motorcycle_year: year, profile_completed: true, updated_at: new Date().toISOString()
    }).eq('id', user.id)
    setProfileBusy(false)
    if (error) { notify(error.code === '23505' ? 'Ese nombre de usuario ya está ocupado.' : 'No se pudo guardar el perfil: ' + error.message); return }
    setAvatarUrl(nextAvatarUrl); setAvatarFile(null)
    setUsername(cleanUsername)
    setSubview('')
    notify('Perfil guardado y sincronizado con tu cuenta.')
  }

  async function submitAuth() {
    if (!authEmail.trim() || authPassword.length < 8) { notify('Ingresa un correo válido y una contraseña de al menos 8 caracteres.'); return }
    if (authMode === 'register' && (!registerName.trim() || registerUsername.trim().length < 3)) { notify('Completa tu nombre y un usuario de al menos 3 caracteres.'); return }
    if (!supabase) { notify('La autenticación real se activa al conectar Supabase. Puedes continuar explorando en modo demostración.'); setAuthOpen(false); return }
    setAuthBusy(true)
    const result = authMode === 'register'
      ? await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword, options: { data: { username: registerUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''), display_name: registerName.trim(), full_name: registerName.trim(), city: registerCity.trim(), motorcycle: registerMotorcycle.trim() } } })
      : await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword })
    setAuthBusy(false)
    if (result.error) { notify(result.error.message); return }
    setAuthOpen(false); setAuthPassword(''); notify(authMode === 'register' ? 'Registro enviado. Revisa tu correo si la confirmación está habilitada.' : 'Sesión iniciada correctamente.')
  }
  async function signOut() {
    if (supabase) {
      const {error} = await supabase.auth.signOut()
      if (error) { notify('No se pudo cerrar la sesión: ' + error.message); return }
    }
    resetSignedOutData()
    notify('Sesión cerrada. Los datos personales se ocultaron en este dispositivo.')
  }

  const navItems: {id: Tab; label: string; icon: typeof Compass}[] = [
    { id: 'explore', label: 'Explorar', icon: Compass }, { id: 'passport', label: 'Pasaporte', icon: BookOpen },
    { id: 'community', label: 'Comunidad', icon: Users }, { id: 'profile', label: 'Perfil', icon: UserRound },
  ]

  return <div className={`app-shell theme-${theme}`}>
    <header className="topbar">
      <button className="brand" onClick={() => openTab('explore')} aria-label="Ir a inicio"><span className="brand-mark"><Bike size={21}/></span><span><strong>PASAPORTE MOTERO</strong><small>RUTAS · HISTORIAS · DESTINOS</small></span></button>
      <div className="top-actions"><span className={`connection-dot ${offline ? 'off' : ''}`} title={offline ? 'Sin conexión' : 'Con conexión'}/><button className="icon-button theme-toggle" aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'} title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'} onClick={() => setTheme(v => v === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button><button className="icon-button" aria-label="Notificaciones" onClick={() => notify('No tienes notificaciones nuevas.')}><Bell size={19}/></button></div>
    </header>
    {offline && <div className="offline-banner"><CloudOff size={15}/> Modo sin conexión. Tus cambios se guardan en este dispositivo.</div>}

    <main className="content" key={`${tab}-${subview}`}>
      {selected ? <section className="destination-detail">
        <button className="back-link" onClick={() => setSelected(null)}><ArrowLeft size={17}/> Volver a destinos</button>
        <div className="destination-hero"><img src={selected.image} alt={selected.title}/><div className="hero-shade"/><span className="hero-category">{selected.category}</span><h1>{selected.title}</h1><p><MapPin size={14}/> {selected.city}, {selected.region}</p></div>
        <div className="detail-actions"><button className="primary" onClick={() => { setVisitDestination(selected.id); openAction('visit') }}><ShieldCheck size={17}/> Validar visita</button><button className="secondary" onClick={() => toggleSaved(selected.id)}><Bookmark size={17}/> {saved.includes(selected.id) ? 'Guardado' : 'Guardar'}</button></div>
        <p className="detail-description">{selected.description}</p>
        <div className="detail-info"><span><MapPinned size={16}/> {selected.province}, {selected.region}</span><span><LocateFixed size={16}/> Radio de validación: {selected.radius} m</span></div>
        <button className="secondary full" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`, '_blank', 'noopener,noreferrer')}><Navigation size={17}/> Cómo llegar</button>
        <div className="section-heading"><h2>Tu estado</h2></div><div className="status-card">{visitedIds.has(selected.id) ? <><BadgeCheck/><div><strong>Destino visitado</strong><small>Ya tienes este sello en tu pasaporte.</small></div></> : <><Lock/><div><strong>Pendiente de visitar</strong><small>Completa una visita para obtener el sello.</small></div></>}</div>
      </section> : <>
        {tab === 'explore' && <section>
          <div className="page-heading"><div><span className="eyebrow">DESCUBRE EL PERÚ</span><h1>Tu próxima aventura te espera.</h1><p className="muted">Encuentra rutas, paisajes y lugares para sumar a tu pasaporte.</p></div><div className="heading-icon"><Compass size={23}/></div></div>
          <div className="search-row"><div className="searchbox"><Search size={18}/><input aria-label="Buscar destinos" placeholder="Buscar destinos, ciudades..." value={query} onChange={e => setQuery(e.target.value)}/></div><button className={`filter-button ${showFilters ? 'selected' : ''}`} onClick={() => setShowFilters(!showFilters)} aria-label="Filtros"><SlidersHorizontal size={18}/></button></div>
          {showFilters && <div className="filter-panel"><label>Departamento<select value={regionFilter} onChange={e => setRegionFilter(e.target.value)}><option>Todos</option>{allRegions.map(r => <option key={r}>{r}</option>)}</select></label><label>Categoría<select value={category} onChange={e => setCategory(e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select></label></div>}
          <div className="chips">{categories.map(cat => <button key={cat} className={category === cat ? 'chip active' : 'chip'} onClick={() => setCategory(cat)}>{cat}</button>)}</div>
          <div className="section-heading"><h2>Destinos para descubrir</h2><button className="text-action" onClick={() => setMapMode(!mapMode)}><Map size={15}/> {mapMode ? 'Ver lista' : 'Ver mapa'}</button></div>
          {mapMode && <div className="map-placeholder map-frame"><iframe title="Mapa de OpenStreetMap del Perú" src="https://www.openstreetmap.org/export/embed.html?bbox=-82%2C-18.5%2C-68%2C-0.5&layer=mapnik" loading="lazy" referrerPolicy="no-referrer"/><span>Mapa interactivo de referencia. La ubicación precisa de cada atractivo se incorporará al completar el catálogo geográfico.</span><button className="text-action" onClick={() => setMapMode(false)}>Volver a la lista</button></div>}
          {!mapMode && <div className="destination-list">{filteredDestinations.map(dest => <button className="destination-card" key={dest.id} onClick={() => setSelected(dest)}><img src={dest.image} alt=""/><span className="destination-overlay"/><span className="destination-tag">{dest.category}</span><span className="destination-copy"><strong>{dest.title}</strong><small><MapPin size={13}/> {dest.city}, {dest.region}</small></span><span className="destination-distance">{dest.distance}</span></button>)}</div>}
          {filteredDestinations.length === 0 && <div className="empty-card"><Search size={30}/><h3>No encontramos destinos</h3><p>Prueba con otro nombre o cambia los filtros.</p></div>}
          <div className="section-heading"><h2>Explora por departamento</h2><span className="muted tiny">25 territorios</span></div><div className="region-pills">{allRegions.map(r => <button key={r} onClick={() => { setRegionFilter(r); setShowFilters(true); window.scrollTo({top:0,behavior:'smooth'}) }}>{r}<ChevronRight size={13}/></button>)}</div>
        </section>}

        {tab === 'passport' && <section>
          <div className="page-heading"><div><span className="eyebrow">DOCUMENTA CADA AVENTURA</span><h1>Mi pasaporte</h1><p className="muted">Cada destino visitado deja una historia y un sello.</p></div><div className="heading-icon"><ShieldCheck size={23}/></div></div>
          <div className="passport-cover"><div className="cover-top">REPÚBLICA DEL PERÚ</div><div className="cover-emblem"><Bike size={35}/></div><div className="cover-title">PASAPORTE<br/>MOTERO</div><div className="cover-bottom">TRAVEL · EXPLORE · REPEAT</div></div>
          <div className="stats-grid"><div className="stat"><strong>{visitedCount}</strong><span>Lugares visitados</span></div><div className="stat"><strong>{visits.filter(v => v.status === 'validated').length}</strong><span>Sellos obtenidos</span></div><div className="stat"><strong>{trips.length}</strong><span>Viajes</span></div></div>
          <div className="section-heading"><h2>Exploración del Perú</h2><span className="muted tiny">{progress}% · {visitedRegionCount}/25 departamentos</span></div><div className="progress"><span style={{width: `${progress}%`}}/></div>
          <div className="stamp-grid">{allRegions.map((name, i) => { const reg = regions.find(r => r.name === name); const hasVisit = visits.some(v => v.status === 'validated' && destinations.find(d => d.id === v.destinationId)?.region === name); const Icon = [Map,Mountain,Tent,Sunrise][i%4]; return <button className={`stamp-tile ${hasVisit ? 'earned' : ''}`} key={name} onClick={() => { setQuery(name); setTab('explore') }}><span className="stamp-art">{hasVisit ? <CheckCircle2 size={22}/> : <Icon size={22}/>}</span><strong>{name}</strong><small>{hasVisit ? 'Visitado' : reg ? 'Por descubrir' : 'Próximamente'}</small></button> })}</div>
          <div className="section-heading"><h2>Historial de validaciones</h2><span className="muted tiny">{visits.length} registros</span></div>
          {visits.length === 0 ? <div className="empty-card compact"><Stamp size={28}/><h3>Tu pasaporte está en blanco</h3><p>Descubre un destino y registra tu primera visita para conseguir un sello.</p><button className="primary" onClick={() => setTab('explore')}>Explorar destinos <Compass size={16}/></button></div> : <div className="history-list">{visits.map(v => { const d = destinations.find(x => x.id === v.destinationId); return <div className="history-row" key={v.id}><span className={`history-icon ${v.status}`}><Stamp size={18}/></span><div><strong>{d?.title || 'Destino'}</strong><small>{new Date(v.date).toLocaleDateString('es-PE')} · {v.method === 'gps' ? 'GPS' : v.method === 'photo' ? 'Fotografía' : 'QR presencial'}</small></div><span className={`state-pill ${v.status}`}>{v.status === 'validated' ? 'Validado' : v.status === 'pending' ? 'Pendiente' : 'Rechazado'}</span></div> })}</div>}
        </section>}

        {tab === 'community' && <section>
          <div className="page-heading"><div><span className="eyebrow">TU COMUNIDAD VIAJERA</span><h1>Historias sobre ruedas.</h1><p className="muted">Inspírate, comparte y descubre nuevos destinos.</p></div><div className="heading-icon"><Users size={23}/></div></div>
          <button className="composer-shortcut" onClick={() => openAction('post')}><span className="avatar small">{initials(displayName)}</span><span>¿Qué aventura quieres contar?</span><span className="round-add"><Plus size={18}/></span></button>
          <div className="feed-switch"><button className={feedMode === 'all' ? 'active' : ''} onClick={() => setFeedMode('all')}>Comunidad</button><button className={feedMode === 'following' ? 'active' : ''} onClick={() => setFeedMode('following')}>Siguiendo</button></div>
          {visiblePosts.map(post => <article className="post-card" key={post.id}><div className="post-author"><span className="avatar small">{initials(displayName)}</span><div className="author-info"><strong>{(post as any).authorName || displayName}</strong><span>@{(post as any).authorUsername || username} · {post.date}</span></div><button className="more" aria-label="Más opciones" onClick={() => notify('Opciones de publicación disponibles al conectar la comunidad.') }><MoreHorizontal size={20}/></button></div>{post.image && <div className="post-image"><img src={post.image} alt="Fotografía de viaje"/><span className="photo-label"><MapPin size={13}/> {post.place}</span></div>}<div className="post-body"><h3>{post.title}</h3><p>{post.text}</p><div className="post-actions"><button onClick={() => toggleLike(post.id)} className={post.liked ? 'liked' : ''}><Heart size={18} fill={post.liked ? 'currentColor' : 'none'}/> {post.likes}</button><button onClick={() => setCommentPost(post.id)}><MessageCircle size={18}/> {post.comments.length || 'Comentar'}</button><button onClick={() => { if (navigator.share) navigator.share({title: post.title, text: post.text}).catch(() => undefined); else notify('Comparte esta publicación copiando su enlace cuando esté publicada en línea.') }}><Share2 size={18}/> Compartir</button><button aria-label="Guardar publicación" onClick={() => notify('Publicación guardada en favoritos locales.')}><Bookmark size={17}/></button></div></div></article>)}
          {visiblePosts.length === 0 && <div className="empty-card"><Users size={30}/><h3>Aún no sigues viajeros</h3><p>Descubre historias de la comunidad y sigue a otros motociclistas para ver sus aventuras aquí.</p><button className="primary" onClick={() => setFeedMode('all')}>Ver comunidad</button></div>}
        </section>}

        {tab === 'profile' && <section>
          {subview === 'motorcycle' ? <><button className="back-link" onClick={() => setSubview('')}><ArrowLeft size={17}/> Mi perfil</button><span className="eyebrow">TU COMPAÑERA DE RUTA</span><h1>Mi motocicleta</h1><p className="muted">Ficha técnica, kilometraje, mantenimiento y documentos.</p><div className="settings-card motorcycle-card"><button type="button" className="collapsible-heading" aria-expanded={motorcycleOpen} onClick={()=>setMotorcycleOpen(v=>!v)}><span><Bike size={18}/> Ficha técnica</span><ChevronDown className={motorcycleOpen?'chevron-open':''} size={18}/></button>{motorcycleOpen && <>{(motorcyclePhotoPreview || motorcyclePhoto) && <div className={`motorcycle-crop-frame ${motorcyclePhotoFile ? "is-editing" : ""}`} onPointerDown={startMotorcycleCrop} onPointerMove={moveMotorcycleCrop} onPointerUp={endMotorcycleCrop} onPointerCancel={endMotorcycleCrop} role={motorcyclePhotoFile ? "group" : undefined} aria-label={motorcyclePhotoFile ? "Arrastra la fotografía para encuadrarla" : undefined}><img className="motorcycle-photo" style={{objectPosition:`${motorcycleCropX}% ${motorcycleCropY}%`}} src={motorcyclePhotoPreview || motorcyclePhoto} alt="Fotografía de mi motocicleta"/>{motorcyclePhotoFile && <span className="crop-hint">Arrastra la foto para encuadrarla</span>}</div>}<label className="file-pick motorcycle-file"><ImagePlus size={17}/> {motorcyclePhotoFile ? motorcyclePhotoFile.name : 'Elegir fotografía desde galería'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>5*1024*1024){notify('La fotografía debe pesar máximo 5 MB.');e.currentTarget.value='';return}if(!['image/jpeg','image/png','image/webp'].includes(file.type)){notify('Usa una imagen JPG, PNG o WebP.');e.currentTarget.value='';return}setMotorcyclePhotoFile(file);setMotorcyclePhotoPreview(URL.createObjectURL(file));setMotorcyclePhoto('')}}/></label><p className="muted tiny">JPG, PNG o WebP · máximo 5 MB. {motorcyclePhotoFile ? "Arrastra la imagen para ajustar el encuadre; quedará fijo al guardar." : "La fotografía guardada no se moverá. Para cambiarla, selecciona otra imagen."}</p><div className="form-grid"><label>Marca<input value={motorcycleBrand} onChange={e=>setMotorcycleBrand(e.target.value)} placeholder="CF Moto"/></label><label>Modelo<input value={motorcycleModel} onChange={e=>setMotorcycleModel(e.target.value)} placeholder="MT450"/></label></div><div className="form-grid"><label>Año<input type="number" value={motorcycleYear} onChange={e=>setMotorcycleYear(e.target.value)} placeholder="2026"/></label><label>Cilindrada (cc)<input type="number" value={motorcycleCc} onChange={e=>setMotorcycleCc(e.target.value)} placeholder="449"/></label></div><div className="form-grid"><label>Tipo<select value={motorcycleType} onChange={e=>setMotorcycleType(e.target.value)}>{['Adventure','Naked','Deportiva','Touring','Custom','Scooter','Doble propósito','Enduro','Otra'].map(x=><option key={x}>{x}</option>)}</select></label><label>Combustible<select value={motorcycleFuel} onChange={e=>setMotorcycleFuel(e.target.value)}>{['Gasolina','Eléctrica','Híbrida','Otro'].map(x=><option key={x}>{x}</option>)}</select></label></div><label>Kilometraje actual (km)<input type="number" inputMode="numeric" value={motorcycleOdometer} onChange={e=>setMotorcycleOdometer(e.target.value)} placeholder="Ej. 12500"/></label><label>Notas y modificaciones<textarea rows={3} value={motorcycleNotes} onChange={e=>setMotorcycleNotes(e.target.value)} placeholder="Accesorios, neumáticos, equipamiento..."/></label><button className="primary full" disabled={motorcycleBusy} onClick={saveMotorcycle}>{motorcycleBusy?'Guardando…':'Guardar ficha técnica'}</button></>}</div><div className="settings-card"><button type="button" className="collapsible-heading" aria-expanded={maintenanceOpen} onClick={()=>setMaintenanceOpen(v=>!v)}><span><Wrench size={18}/> Historial de mantenimiento</span><ChevronDown className={maintenanceOpen?'chevron-open':''} size={18}/></button>{maintenanceOpen && <><label>Servicio<select value={maintenanceType} onChange={e=>setMaintenanceType(e.target.value)}>{['Cambio de aceite','Filtro de aceite','Filtro de aire','Kit de arrastre','Neumáticos','Frenos','Refrigerante','Bujías','Revisión general','Otro'].map(x=><option key={x}>{x}</option>)}</select></label><div className="form-grid maintenance-fields"><label>Fecha<input className="date-control" type="date" value={maintenanceDate} onChange={e=>setMaintenanceDate(e.target.value)}/></label><label>Kilometraje (km)<input className="date-control" type="number" inputMode="numeric" value={maintenanceKm} onChange={e=>setMaintenanceKm(e.target.value)} placeholder="Ej. 12500"/></label></div><label>Costo (S/)<input type="number" value={maintenanceCost} onChange={e=>setMaintenanceCost(e.target.value)} placeholder="0.00"/></label><label>Detalle<textarea rows={2} value={maintenanceNotes} onChange={e=>setMaintenanceNotes(e.target.value)} placeholder="Taller, repuestos o notas"/></label><button className="secondary full" onClick={addMaintenance}><Plus size={16}/> Registrar mantenimiento</button>{maintenance.length===0?<p className="muted">Todavía no tienes servicios registrados.</p>:<div className="history-list">{maintenance.map(item=><div className="history-row" key={item.id}><span className="history-icon validated"><Wrench size={17}/></span><div><strong>{item.service_type}</strong><small>{formatDisplayDate(item.service_date)} · {item.odometer_km ?? '—'} km · {item.cost_pen != null ? 'S/ '+item.cost_pen : 'Sin costo'}</small>{item.notes && <small>{item.notes}</small>}</div></div>)}</div>}</>}</div><div className="settings-card"><button type="button" className="collapsible-heading" aria-expanded={documentsOpen} onClick={()=>setDocumentsOpen(v=>!v)}><span><FileText size={18}/> Documentos y vencimientos</span><ChevronDown className={documentsOpen?'chevron-open':''} size={18}/></button>{documentsOpen && <><label>Documento<select value={documentType} onChange={e=>setDocumentType(e.target.value)}>{['SOAT','Revisión técnica','Licencia de conducir','Tarjeta de propiedad','Seguro','Otro'].map(x=><option key={x}>{x}</option>)}</select></label><label>Fecha de vencimiento<input className="document-date-control" type="date" value={documentExpiry} onChange={e=>setDocumentExpiry(e.target.value)}/></label><label className="file-pick"><FileText size={16}/> {documentFile ? documentFile.name : 'Adjuntar archivo del documento (opcional)'}<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e=>setDocumentFile(e.target.files?.[0] || null)}/></label><p className="muted tiny">El archivo se almacena de forma privada. JPG, PNG, WebP o PDF · máximo 10 MB.</p><button className="secondary full" disabled={documentBusy} onClick={addMotorcycleDocument}><CalendarClock size={16}/> {documentBusy?'Guardando…':'Guardar documento y vencimiento'}</button>{documents.length===0?<p className="muted">Añade fechas para tenerlas presentes. Los avisos automáticos se habilitarán en una siguiente etapa.</p>:<div className="history-list">{documents.map(doc=><div className="history-row document-history-row" key={doc.id}><span className="history-icon pending"><FileText size={17}/></span><div className="document-summary"><strong>{doc.document_type}</strong><span className="document-expiry-label">VENCE EL</span><b className="document-expiry-date">{formatDisplayDate(doc.expiry_date)}</b><span className={`document-status ${doc.expiry_date < new Date().toISOString().slice(0,10) ? "expired" : "valid"}`}>{doc.expiry_date < new Date().toISOString().slice(0,10) ? "Vencido" : "Vigente"}</span>{doc.storage_path && <button className="text-action" onClick={()=>openMotorcycleDocument(doc.storage_path)}>Ver documento <FileCheck2 size={14}/></button>}</div><button className="document-delete" type="button" disabled={documentBusy} onClick={()=>deleteMotorcycleDocument(doc)} aria-label={`Eliminar ${doc.document_type}`} title="Eliminar documento"><X size={17}/></button></div>)}</div>}</>}</div></> : subview === 'trips' ? <><button className="back-link" onClick={() => setSubview('')}><ArrowLeft size={17}/> Mi perfil</button><span className="eyebrow">TUS EXPEDICIONES</span><h1>Mis viajes</h1><button className="primary full" onClick={() => openAction('trip')}><Plus size={17}/> Crear nuevo viaje</button>{trips.length === 0 ? <div className="empty-card"><Route size={34}/><h3>Tu próxima ruta comienza aquí</h3><p>Registra recorridos, paradas, fechas y recuerdos. Tu primera expedición puede ser Huaraz.</p><button className="primary" onClick={() => openAction('trip')}>Crear bitácora <Plus size={17}/></button></div> : <div className="trip-list">{trips.map(t => <article className="trip-card" key={t.id}><div className="trip-icon"><Route size={21}/></div><div><strong>{t.name}</strong><small>{t.start}{t.end ? ` — ${t.end}` : ''} · {t.destinationIds.length} destinos · {t.visibility === 'public' ? 'Público' : 'Privado'}</small><p>{t.description}</p>{t.photos.length > 0 && <div className="memory-grid trip-photo-grid">{t.photos.map((url,i)=><img key={i} src={url} alt={'Fotografía de '+t.name}/>)}</div>}<label className="file-pick trip-photo-pick"><ImagePlus size={16}/> Añadir fotos a esta bitácora<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>{Array.from(e.target.files || []).forEach(file=>void addTripPhoto(t.id,file));e.currentTarget.value=''}}/></label></div></article>)}</div>}</> : subview === 'memories' ? <><button className="back-link" onClick={() => setSubview('')}><ArrowLeft size={17}/> Mi perfil</button><span className="eyebrow">TUS RECUERDOS</span><h1>Galería de viajes</h1><div className="memory-grid">{visits.filter(v => v.image).map(v => <img key={v.id} src={v.image} alt="Recuerdo de visita"/>)}{posts.filter(p => p.image).map(p => <img key={p.id} src={p.image} alt="Fotografía publicada"/> )}</div>{visits.every(v => !v.image) && posts.every(p => !p.image) && <div className="empty-card"><Images size={34}/><h3>Aún no hay fotografías propias</h3><p>Adjunta fotos a tus visitas y publicaciones para reunir aquí tus recuerdos.</p><button className="primary" onClick={createMemory}><Camera size={17}/> Crear recuerdo</button></div>}</> : !authUser ? <div className="signed-out-profile">
            <span className="eyebrow">TU IDENTIDAD VIAJERA</span><h1>Mi perfil</h1>
            <div className="signed-out-card">
              <div className="signed-out-icon"><ShieldCheck size={34}/></div>
              <h2>Tu ruta comienza aquí</h2>
              <p className="muted">Inicia sesión o crea una cuenta para acceder a tu pasaporte, motocicleta, viajes, fotografías y comunidad.</p>
              <button className="primary full" onClick={()=>{setAuthMode('login');setAuthOpen(true)}}>Iniciar sesión</button>
              <button className="secondary full" onClick={()=>{setAuthMode('register');setAuthOpen(true)}}>Registrarme</button>
            </div>
          </div> : <>
            <span className="eyebrow">TU IDENTIDAD VIAJERA</span><h1>Mi perfil</h1>
            <div className="profile-card"><div className="avatar large">{avatarUrl ? <img src={avatarUrl} alt="Foto de perfil"/> : initials(displayName)}</div><h2>{displayName}</h2><span className="muted">@{username}</span><p className="muted">{bio}</p><span className="profile-location"><MapPin size={13}/> {homeCity}</span><div className="profile-stats"><span><b>{followed.length}</b> siguiendo</span><span><b>0</b> seguidores</span><span><b>{posts.length}</b> publicaciones</span></div></div>
            <div className="profile-menu"><button onClick={() => setSubview('motorcycle')}><Bike/><span><strong>Mi motocicleta</strong><small>{motorcycleBrand && motorcycleModel ? motorcycleBrand + ' ' + motorcycleModel : 'Ficha técnica y mantenimiento'}</small></span><ChevronRight/></button><button onClick={() => setSubview('trips')}><Route/><span><strong>Mis viajes y bitácoras</strong><small>{trips.length} viajes registrados</small></span><ChevronRight/></button><button onClick={() => setSubview('memories')}><Images/><span><strong>Fotos y recuerdos</strong><small>Tu galería personal</small></span><ChevronRight/></button><button onClick={makePersonalQr}><QrCode/><span><strong>Mi QR de viajero</strong><small>Identificación para validación presencial</small></span><ChevronRight/></button><button onClick={() => setSubview('settings')}><Settings/><span><strong>Configuración</strong><small>Datos personales y privacidad</small></span><ChevronRight/></button><button onClick={() => authUser ? signOut() : setAuthOpen(true)}>{authUser ? <LogOut/> : <ShieldCheck/>}<span><strong>{authUser ? 'Cerrar sesión' : 'Iniciar sesión / Registrarme'}</strong><small>{authUser || (isSupabaseConfigured ? 'Accede para sincronizar tus datos' : 'Modo demostración disponible')}</small></span><ChevronRight/></button></div>
            {qr && <div className="qr-card"><h3>Mi identificación QR</h3><img src={qr} alt="QR personal de demostración"/><p>QR de demostración. Para validar visitas reales se necesita un token temporal generado por el servidor.</p></div>}
            {subview === 'settings' && <div className="settings-card"><div className="section-heading"><h2>Editar perfil</h2><button className="text-action" onClick={() => setSubview('')}>Cerrar</button></div><label className="file-pick profile-photo-pick"><UserRound size={17}/> {avatarFile ? avatarFile.name : 'Elegir foto de perfil'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const f=e.target.files?.[0];if(!f)return;if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>5*1024*1024){notify('Usa JPG, PNG o WebP de máximo 5 MB.');e.currentTarget.value='';return}setAvatarFile(f);setAvatarUrl(URL.createObjectURL(f))}}/></label><label>Nombre para mostrar<input value={displayName} onChange={e => setDisplayName(e.target.value)}/></label><label>Nombre de usuario<input value={username} onChange={e => setUsername(e.target.value.replace(/\s/g,'').replace('@',''))}/></label><label>Biografía<textarea rows={3} value={bio} onChange={e => setBio(e.target.value)}/></label><label>Ciudad o país<input value={homeCity} onChange={e => setHomeCity(e.target.value)}/></label><div className="form-grid"><label>Marca de motocicleta<input value={motorcycleBrand} onChange={e => setMotorcycleBrand(e.target.value)} placeholder="Ej. Honda"/></label><label>Modelo<input value={motorcycleModel} onChange={e => setMotorcycleModel(e.target.value)} placeholder="Ej. CB 300F"/></label></div><label>Año de fabricación<input type="number" inputMode="numeric" min="1885" max={new Date().getFullYear()+1} value={motorcycleYear} onChange={e => setMotorcycleYear(e.target.value)} placeholder="Ej. 2024"/></label>{authUser ? <button className="primary full" disabled={profileBusy} onClick={saveProfile}>{profileBusy ? 'Guardando…' : 'Guardar y sincronizar perfil'}</button> : <button className="primary full" onClick={() => { notify('Inicia sesión para sincronizar tus datos.'); setAuthOpen(true) }}>Iniciar sesión para guardar</button>}<button className="secondary full" onClick={() => setAdminMode(!adminMode)}>{adminMode ? 'Salir del modo encargado' : 'Vista de encargado / administrador (demo)'}</button>{adminMode && <div className="admin-demo"><h3>Panel de validaciones</h3><p>Solicitudes fotográficas pendientes: {visits.filter(v => v.status === 'pending').length}</p>{visits.filter(v => v.status === 'pending').map(v => <div className="admin-visit" key={v.id}><strong>{destinations.find(d=>d.id===v.destinationId)?.title}</strong>{v.image && <img src={v.image} alt="Evidencia"/>}<div><button className="primary" onClick={() => {setVisits(a=>a.map(x=>x.id===v.id?{...x,status:'validated'}:x));notify('Visita aprobada en modo local.')}}>Aprobar</button><button className="secondary" onClick={() => {setVisits(a=>a.map(x=>x.id===v.id?{...x,status:'rejected'}:x));notify('Visita rechazada en modo local.')}}>Rechazar</button></div></div>)}</div>}</div>}
          </>}
        </section>}
      </>}
    </main>

    <nav className="bottom-nav">{navItems.slice(0,2).map(item => {const Icon = item.icon; return <button key={item.id} onClick={() => openTab(item.id)} className={tab === item.id && !selected ? 'active' : ''}><Icon size={20}/><span>{item.label}</span></button>})}<button className="nav-plus" onClick={() => setShowActions(true)} aria-label="Crear o validar"><Plus size={25}/></button>{navItems.slice(2).map(item => {const Icon = item.icon; return <button key={item.id} onClick={() => openTab(item.id)} className={tab === item.id && !selected ? 'active' : ''}><Icon size={20}/><span>{item.label}</span></button>})}</nav>
    <div className="dev-ribbon">{isSupabaseConfigured ? 'SUPABASE CONFIGURADO · UI EN DESARROLLO' : 'MODO DEMOSTRACIÓN · DATOS LOCALES'}</div>

    {showActions && <div className="modal-backdrop" onClick={() => setShowActions(false)}><div className="action-sheet" onClick={e => e.stopPropagation()}><div className="sheet-handle"/><div className="modal-head"><h2>¿Qué quieres hacer?</h2><button className="icon-button" onClick={() => setShowActions(false)} aria-label="Cerrar"><X/></button></div><button className="action-option" onClick={() => openAction('visit')}><span><ShieldCheck/></span><div><strong>Validar una visita</strong><small>GPS, fotografía o QR presencial</small></div><ChevronRight/></button><button className="action-option" onClick={() => openAction('trip')}><span><Route/></span><div><strong>Crear un viaje</strong><small>Organiza destinos y bitácoras</small></div><ChevronRight/></button><button className="action-option" onClick={() => openAction('post')}><span><Users/></span><div><strong>Publicar en comunidad</strong><small>Comparte una historia o fotografía</small></div><ChevronRight/></button><button className="action-option" onClick={() => {setShowActions(false);setSubview('memories');setTab('profile')}}><span><Images/></span><div><strong>Ver mis recuerdos</strong><small>Revisa tus fotografías</small></div><ChevronRight/></button></div></div>}

    {action && <div className="modal-backdrop" onClick={closeModal}><div className="composer-modal" onClick={e => e.stopPropagation()}><div className="modal-head"><h2>{action === 'visit' ? 'Validar visita' : action === 'trip' ? 'Nuevo viaje' : action === 'memory' ? 'Nuevo recuerdo' : 'Nueva publicación'}</h2><button className="icon-button" onClick={closeModal}><X/></button></div>
      {action === 'visit' && <><p className="muted">Selecciona el destino y el método para registrar tu visita.</p><label>Destino<select value={visitDestination} onChange={e => setVisitDestination(Number(e.target.value))}>{destinations.map(d => <option key={d.id} value={d.id}>{d.title} · {d.region}</option>)}</select></label><div className="method-tabs"><button className={visitMethod==='gps'?'active':''} onClick={()=>setVisitMethod('gps')}><LocateFixed/> GPS</button><button className={visitMethod==='photo'?'active':''} onClick={()=>setVisitMethod('photo')}><Camera/> Foto</button><button className={visitMethod==='qr'?'active':''} onClick={()=>setVisitMethod('qr')}><QrCode/> QR</button></div>{visitMethod==='gps' && <div className="method-panel"><LocateFixed size={28}/><strong>Validación por ubicación</strong><p>Compararemos tu ubicación actual con el área permitida del destino. Activa el GPS y permite el acceso desde el navegador.</p><button className="primary full" disabled={busy} onClick={validateGps}>{busy ? 'Comprobando ubicación…' : 'Comprobar mi ubicación'}</button></div>}{visitMethod==='photo' && <div className="method-panel"><Camera size={28}/><strong>Validación fotográfica</strong><p>Adjunta una fotografía tomada en el destino. La visita quedará pendiente de revisión.</p><label className="file-pick"><ImagePlus/> Seleccionar fotografía<input type="file" accept="image/*" capture="environment" onChange={e=>fileToData(e.target.files?.[0])}/></label>{visitPhoto && <img className="preview-image" src={visitPhoto} alt="Vista previa"/>}<label>Descripción (opcional)<textarea rows={2} value={visitNote} onChange={e=>setVisitNote(e.target.value)} placeholder="Cuéntanos sobre esta visita"/></label><button className="primary full" onClick={submitPhotoVisit}>Enviar evidencia</button></div>}{visitMethod==='qr' && <div className="method-panel"><QrCode size={28}/><strong>Validación presencial</strong><p>Solicita al encargado autorizado que escanee tu QR. En esta versión de demostración puedes ingresar un código de prueba.</p><label>Código del establecimiento<input value={qrManual} onChange={e=>setQrManual(e.target.value)} placeholder="Código proporcionado por el encargado"/></label><button className="primary full" onClick={submitQrCode}>Enviar código</button></div>}</>}
      {action === 'trip' && <><p className="muted">Agrupa tus destinos y recuerdos en una expedición.</p><label>Nombre del viaje<input value={tripName} onChange={e=>setTripName(e.target.value)} placeholder="Ej. Ruta a Huaraz"/></label><div className="form-grid trip-date-grid"><label>Fecha de inicio<input className="trip-date-control" type="date" value={tripStart} onChange={e=>setTripStart(e.target.value)}/></label><label>Fecha de fin<input className="trip-date-control" type="date" value={tripEnd} onChange={e=>setTripEnd(e.target.value)}/></label></div><label>Descripción<textarea rows={3} value={tripDescription} onChange={e=>setTripDescription(e.target.value)} placeholder="¿Qué esperas descubrir?"/></label><details className="trip-stops"><summary>Añadir paradas o destinos (opcional) <span>{tripDestinations.length+tripManualStops.length ? (tripDestinations.length+tripManualStops.length)+' paradas' : 'Sin paradas'}</span></summary><p className="muted tiny">Añade las paradas en el orden en que realizarás el recorrido.</p><label>Seleccionar destino del catálogo<select value={tripStopSelection} onChange={e=>{const id=Number(e.target.value);if(id && !tripDestinations.includes(id))setTripDestinations(v=>[...v,id]);setTripStopSelection('')}}><option value="">Elegir entre todos los destinos disponibles…</option>{destinations.filter(d=>!tripDestinations.includes(d.id)).map(d=><option key={d.id} value={d.id}>{d.title} · {d.city}, {d.region}</option>)}</select></label><div className="trip-stop-manual"><label>¿No aparece? Añadir parada manual<input value={tripManualStop} onChange={e=>setTripManualStop(e.target.value)} placeholder="Ej. Mirador, grifo, restaurante…"/></label><button type="button" className="secondary" onClick={()=>{const value=tripManualStop.trim();if(value && !tripManualStops.some(x=>x.toLowerCase()===value.toLowerCase()))setTripManualStops(v=>[...v,value]);setTripManualStop('')}}>Añadir parada</button></div>{(tripDestinations.length>0 || tripManualStops.length>0) && <ol className="trip-stop-list">{tripDestinations.map((id,index)=>{const d=destinations.find(x=>x.id===id);return d?<li key={id}><span>{index+1}. {d.title} <small>{d.city}, {d.region}</small></span><button type="button" aria-label="Quitar parada" onClick={()=>setTripDestinations(v=>v.filter(x=>x!==id))}>×</button></li>:null})}{tripManualStops.map((name,index)=><li key={name}><span>{tripDestinations.length+index+1}. {name} <small>Parada manual</small></span><button type="button" aria-label="Quitar parada" onClick={()=>setTripManualStops(v=>v.filter(x=>x!==name))}>×</button></li>)}</ol>}</details><label>Privacidad<select value={tripVisibility} onChange={e=>setTripVisibility(e.target.value as 'public'|'followers'|'private')}><option value="private">Privado · Solo yo</option><option value="followers">Seguidores · Solo quienes me siguen</option><option value="public">Público · Toda la comunidad</option></select></label><button className="primary full" onClick={createTrip}>Crear viaje <Route size={17}/></button></>}
      {(action === 'post' || action === 'memory') && <><p className="muted">Comparte una experiencia con la comunidad o guarda un recuerdo privado.</p><label>Título<input value={postTitle} onChange={e=>setPostTitle(e.target.value)} placeholder="Ej. Una ruta inolvidable"/></label><label>Tu historia<textarea rows={4} value={postText} onChange={e=>setPostText(e.target.value)} placeholder="Describe el recorrido, los paisajes y lo que viviste…"/></label><label>Destino relacionado<select value={postPlace} onChange={e=>setPostPlace(e.target.value)}><option value="">Seleccionar destino</option>{destinations.map(d=><option key={d.id} value={`${d.city}, ${d.region}`}>{d.title}</option>)}</select></label><label className="file-pick"><ImagePlus/> Añadir fotografía<input type="file" accept="image/*" onChange={e=>postFileToData(e.target.files?.[0])}/></label>{postImage && <img className="preview-image" src={postImage} alt="Vista previa"/>}<label>Visibilidad<select value={postVisibility} onChange={e=>setPostVisibility(e.target.value as 'public'|'followers'|'private')}><option value="public">Pública · Comunidad</option><option value="followers">Seguidores</option><option value="private">Privada · Solo yo</option></select></label><button className="primary full" onClick={publishPost}>{postVisibility==='private'?'Guardar recuerdo':'Publicar experiencia'} <Send size={17}/></button></>}
    </div></div>}

    {authOpen && <div className="modal-backdrop" onClick={() => setAuthOpen(false)}><div className="composer-modal" onClick={e => e.stopPropagation()}><div className="modal-head"><h2>{authMode === 'login' ? 'Bienvenido de nuevo' : 'Crear cuenta'}</h2><button className="icon-button" onClick={() => setAuthOpen(false)}><X/></button></div><p className="muted">Tu cuenta permitirá sincronizar el pasaporte, los viajes y las publicaciones entre dispositivos.</p><div className="feed-switch"><button className={authMode==='login'?'active':''} onClick={()=>setAuthMode('login')}>Iniciar sesión</button><button className={authMode==='register'?'active':''} onClick={()=>setAuthMode('register')}>Registrarme</button></div><label>Correo electrónico<input type="email" autoComplete="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="correo@ejemplo.com"/></label>{authMode === 'register' && <><label>Nombre completo<input autoComplete="name" value={registerName} onChange={e=>setRegisterName(e.target.value)} placeholder="Tu nombre y apellidos"/></label><label>Nombre de usuario<input autoComplete="username" value={registerUsername} onChange={e=>setRegisterUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g,''))} placeholder="Ej. viajero_motero"/></label><label>Ciudad o región<input autoComplete="address-level2" value={registerCity} onChange={e=>setRegisterCity(e.target.value)} placeholder="Ej. Huancayo, Junín"/></label><label>Motocicleta (opcional)<input value={registerMotorcycle} onChange={e=>setRegisterMotorcycle(e.target.value)} placeholder="Marca y modelo"/></label></>}<label>Contraseña<input type="password" autoComplete={authMode==='login'?'current-password':'new-password'} minLength={8} value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="Mínimo 8 caracteres"/></label><button className="primary full" disabled={authBusy || !isSupabaseConfigured} onClick={submitAuth}>{authBusy ? 'Procesando…' : authMode==='login' ? 'Iniciar sesión' : 'Crear cuenta'}</button>{!isSupabaseConfigured && <p className="auth-note">Supabase todavía no está conectado. Esta pantalla queda preparada, pero el acceso real se habilitará al configurar la URL pública y la clave anon del proyecto.</p>}</div></div>}

    {commentPost !== null && <div className="modal-backdrop" onClick={()=>setCommentPost(null)}><div className="composer-modal" onClick={e=>e.stopPropagation()}><div className="modal-head"><h2>Comentarios</h2><button className="icon-button" onClick={()=>setCommentPost(null)}><X/></button></div><div className="comments-list">{posts.find(p=>p.id===commentPost)?.comments.map((c,i)=><p key={i}>{c}</p>)}</div><label>Escribe un comentario<textarea rows={3} value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder="Tu comentario…"/></label><button className="primary full" onClick={addComment}>Enviar comentario <Send size={16}/></button></div></div>}
    {notice && <button className="toast" onClick={()=>setNotice('')}><CheckCircle2 size={16}/>{notice}<b>×</b></button>}
  </div>
}
