import { useMemo, useState } from 'react'
import { BookOpen, Compass, Route, Users, Images, UserRound, Plus, MapPin, Heart, MessageCircle, Share2, Stamp, ShieldCheck, Camera, Bike, Search, Bell } from 'lucide-react'
import QRCode from 'qrcode'
import { allRegions, regions } from './data'
import { isSupabaseConfigured } from './lib/supabase'

type Tab = 'feed' | 'passport' | 'explore' | 'trips' | 'memories' | 'profile'
const nav: { id: Tab; label: string; icon: typeof BookOpen }[] = [
  { id: 'feed', label: 'Comunidad', icon: Users },
  { id: 'passport', label: 'Pasaporte', icon: BookOpen },
  { id: 'explore', label: 'Explorar', icon: Compass },
  { id: 'trips', label: 'Mis viajes', icon: Route },
  { id: 'profile', label: 'Perfil', icon: UserRound },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('feed')
  const [showComposer, setShowComposer] = useState(false)
  const [liked, setLiked] = useState(false)
  const [query, setQuery] = useState('')
  const [displayName, setDisplayName] = useState('Viajero Motero')
  const [username, setUsername] = useState('viajero_motero')
  const [postText, setPostText] = useState('')
  const [posts, setPosts] = useState([{ id: 1, title: 'Rumbo a la Cordillera Blanca', text: 'Cada kilómetro es una historia. Próxima parada: Huaraz. Preparando la primera expedición de Pasaporte Motero.', place: 'Áncash, Perú', date: 'Borrador de aventura', likes: 24 }])
  const [qr, setQr] = useState('')
  const [notice, setNotice] = useState('')

  const visited = 0
  const progress = Math.round(visited / 25 * 100)
  const filtered = useMemo(() => allRegions.filter(x => x.toLowerCase().includes(query.toLowerCase())), [query])

  async function createQr() {
    const identity = `pasaporte-motero:user:${crypto.randomUUID()}`
    setQr(await QRCode.toDataURL(identity, { width: 220, margin: 2, color: { dark: '#102c25', light: '#ffffff' } }))
    setNotice('QR de demostración creado. Al conectar Supabase se guardará de forma permanente.')
  }

  function publish() {
    if (!postText.trim()) return
    setPosts([{ id: Date.now(), title: 'Nueva entrada de bitácora', text: postText.trim(), place: 'Ubicación por agregar', date: 'Ahora · Borrador local', likes: 0 }, ...posts])
    setPostText('')
    setShowComposer(false)
    setTab('feed')
    setNotice('Publicación añadida a esta demostración local.')
  }

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><Bike size={21}/></div><div><strong>PASAPORTE MOTERO</strong><small>RUTAS · HISTORIAS · DESTINOS</small></div></div>
      <button className="icon-button" aria-label="Notificaciones"><Bell size={19}/></button>
    </header>

    <main className="content">
      {tab === 'feed' && <section>
        <div className="welcome-row"><div><span className="eyebrow">TU COMUNIDAD VIAJERA</span><h1>Historias sobre ruedas.</h1><p className="muted">Inspírate, comparte y descubre nuevos destinos.</p></div><div className="avatar">VM</div></div>
        <div className="composer-shortcut" onClick={() => setShowComposer(true)} role="button" tabIndex={0}><div className="avatar small">VM</div><span>¿Qué aventura quieres contar?</span><button className="round-add"><Plus size={19}/></button></div>
        <div className="section-heading"><h2>Bitácoras recientes</h2><span className="muted tiny">Explorar comunidad</span></div>
        {posts.map(post => <article className="post-card" key={post.id}>
          <div className="post-author"><div className="avatar small">VM</div><div className="author-info"><strong>{displayName}</strong><span>@{username} · {post.date}</span></div><button className="more">•••</button></div>
          <div className="post-image"><img src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200" alt="Paisaje de carretera de montaña"/><span className="photo-label"><MapPin size={13}/> {post.place}</span></div>
          <div className="post-body"><h3>{post.title}</h3><p>{post.text}</p><div className="post-actions"><button onClick={() => setLiked(!liked)} className={liked ? 'liked' : ''}><Heart size={18} fill={liked ? 'currentColor' : 'none'}/> {post.likes + (liked ? 1 : 0)}</button><button><MessageCircle size={18}/> Comentar</button><button><Share2 size={18}/> Compartir</button></div></div>
        </article>)}
      </section>}

      {tab === 'passport' && <section>
        <span className="eyebrow">DOCUMENTA CADA AVENTURA</span><h1>Mi pasaporte</h1>
        <div className="passport-cover"><div className="cover-top">REPÚBLICA DEL PERÚ</div><div className="cover-emblem"><Bike size={35}/></div><div className="cover-title">PASAPORTE<br/>MOTERO</div><div className="cover-bottom">TRAVEL · EXPLORE · REPEAT</div></div>
        <div className="stats-grid"><div className="stat"><strong>{visited}</strong><span>Lugares visitados</span></div><div className="stat"><strong>0</strong><span>Sellos obtenidos</span></div><div className="stat"><strong>0/25</strong><span>Territorios</span></div></div>
        <div className="section-heading"><h2>Exploración del Perú</h2><span className="muted tiny">{progress}% completado</span></div><div className="progress"><span style={{width: `${progress}%`}}/></div>
        <div className="stamp-grid">{regions.slice(0,4).map(r => <div className="stamp-tile" key={r.name}><Stamp size={23}/><strong>{r.name}</strong><small>{r.visited ? 'Visitado' : 'Por descubrir'}</small></div>)}</div>
        <button className="primary full" onClick={() => setTab('explore')}>Explorar destinos <Compass size={17}/></button>
      </section>}

      {tab === 'explore' && <section>
        <span className="eyebrow">DESCUBRE EL PERÚ</span><h1>Explorar destinos</h1><p className="muted">25 territorios · cientos de historias por vivir.</p>
        <div className="searchbox"><Search size={18}/><input placeholder="Buscar departamento..." value={query} onChange={e => setQuery(e.target.value)}/></div>
        <div className="region-list">{filtered.map((name, i) => { const r = regions.find(x => x.name === name); return <div className="region-row" key={name}><div className="region-thumb">{r ? <img src={r.image} alt=""/> : <Compass size={22}/>}</div><div className="region-info"><strong>{name}</strong><span>{r ? `${r.city} · ${r.places.slice(0,2).join(' · ')}` : 'Destinos por incorporar al catálogo'}</span></div><span className="region-status">Explorar</span></div>})}</div>
      </section>}

      {tab === 'trips' && <section><span className="eyebrow">TUS EXPEDICIONES</span><h1>Mis viajes</h1><div className="empty-card"><Route size={34}/><h3>Tu próxima ruta comienza aquí</h3><p>Registra recorridos, paradas, kilómetros y recuerdos. Tu primera expedición puede ser Huaraz.</p><button className="primary" onClick={() => setShowComposer(true)}>Crear bitácora <Plus size={17}/></button></div></section>}

      {tab === 'memories' && <section><span className="eyebrow">TUS RECUERDOS</span><h1>Galería de viajes</h1><div className="empty-card"><Images size={34}/><h3>Aún no hay fotografías</h3><p>Cuando registres tus visitas podrás guardar y sellar aquí tus mejores recuerdos.</p><button className="primary" onClick={() => setShowComposer(true)}><Camera size={17}/> Crear recuerdo</button></div></section>}

      {tab === 'profile' && <section><span className="eyebrow">TU IDENTIDAD VIAJERA</span><h1>Mi perfil</h1><div className="profile-card"><div className="avatar large">VM</div><h2>{displayName}</h2><span className="muted">@{username}</span><p className="muted">Viajero en construcción. Próximo destino: Huaraz.</p><div className="profile-stats"><span><b>0</b> siguiendo</span><span><b>0</b> seguidores</span><span><b>{posts.length}</b> publicaciones</span></div></div><div className="section-heading"><h2>Mi QR de viajero</h2><ShieldCheck size={19}/></div><div className="qr-card">{qr ? <img src={qr} alt="QR personal de demostración"/> : <div className="qr-placeholder"><Stamp size={32}/><span>Tu identificación QR</span></div>}<p>Este QR identificará tu cuenta cuando se habilite la validación presencial por encargados autorizados.</p><button className="secondary full" onClick={createQr}>Generar QR de demostración</button></div><div className="section-heading"><h2>Editar perfil</h2></div><label>Nombre para mostrar<input value={displayName} onChange={e => setDisplayName(e.target.value)}/></label><label>Nombre de usuario<input value={username} onChange={e => setUsername(e.target.value.replace(/\s/g, '').replace('@',''))}/></label></section>}
    </main>

    {showComposer && <div className="modal-backdrop" onClick={() => setShowComposer(false)}><div className="composer-modal" onClick={e => e.stopPropagation()}><div className="modal-head"><h2>Nueva bitácora</h2><button className="icon-button" onClick={() => setShowComposer(false)}>✕</button></div><label>Título de tu aventura<input placeholder="Ej. Mi primera ruta a Huaraz"/></label><label>Cuéntanos tu experiencia<textarea rows={5} placeholder="Describe el recorrido, los paisajes y lo que viviste..." value={postText} onChange={e => setPostText(e.target.value)}/></label><div className="upload-hint"><Camera size={19}/> La carga de fotografías se habilitará al conectar el almacenamiento.</div><button className="primary full" onClick={publish}>Publicar bitácora <Share2 size={17}/></button></div></div>}

    {notice && <div className="toast" onClick={() => setNotice('')}>{notice} <b>×</b></div>}
    <nav className="bottom-nav">{nav.map(item => {const Icon = item.icon; return <button key={item.id} onClick={() => setTab(item.id)} className={tab === item.id ? 'active' : ''}><Icon size={19}/><span>{item.label}</span></button>})}<button onClick={() => setTab('memories')} className={tab === 'memories' ? 'active' : ''}><Images size={19}/><span>Fotos</span></button></nav>
    <div className="dev-ribbon">{isSupabaseConfigured ? 'SERVICIOS CONFIGURADOS' : 'MODO DEMOSTRACIÓN · DATOS LOCALES'}</div>
  </div>
}
