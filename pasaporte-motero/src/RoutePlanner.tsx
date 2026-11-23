import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowUp, ArrowDown, MapPin, Navigation, Plus, Route, Trash2 } from 'lucide-react'

export type RouteDestination = {
  id: number
  title: string
  region: string
  city: string
  lat: number | null
  lng: number | null
}

type Props = {
  destinations: RouteDestination[]
  onClose: () => void
  onPrepareTrip: (ids: number[]) => void
}

function distanceKm(a: RouteDestination, b: RouteDestination) {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null
  const rad = (n: number) => n * Math.PI / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

export default function RoutePlanner({ destinations, onClose, onPrepareTrip }: Props) {
  const [stops, setStops] = useState<number[]>([])
  const [search, setSearch] = useState('')
  const selected = useMemo(() => stops.map(id => destinations.find(d => d.id === id)).filter((d): d is RouteDestination => Boolean(d)), [stops, destinations])
  const segments = selected.slice(1).map((d, i) => distanceKm(selected[i], d))
  const estimate = segments.every(v => v !== null) ? segments.reduce<number>((sum, v) => sum + (v || 0), 0) : null
  const addStop = (id: number) => setStops(current => current.includes(id) ? current : [...current, id])
  const moveStop = (index: number, direction: -1 | 1) => setStops(current => {
    const next = [...current]
    const target = index + direction
    if (target < 0 || target >= next.length) return current
    ;[next[index], next[target]] = [next[target], next[index]]
    return next
  })
  const mapsReady = selected.length >= 2 && selected.every(d => d.lat !== null && d.lng !== null)
  const mapsUrl = mapsReady
    ? `https://www.google.com/maps/dir/${selected.map(d => encodeURIComponent(`${d.lat},${d.lng}`)).join('/')}/`
    : ''
  const available = destinations.filter(d => !stops.includes(d.id) && `${d.title} ${d.city} ${d.region}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))).sort((a, b) => a.title.localeCompare(b.title, 'es'))

  return <section className="route-planner-screen">
    <button className="back-link" onClick={onClose}><ArrowLeft size={17}/> Volver a Explorar</button>
    <div className="page-heading tab-page-heading"><div><span className="eyebrow">PLANIFICA TU EXPEDICIÓN</span><h1>Planificador de rutas</h1><p className="muted">Ordena tus paradas y abre el recorrido en tu aplicación de mapas.</p></div><div className="heading-icon"><Route size={23}/></div></div>
    <div className="settings-card route-planner-summary">
      <div className="section-heading"><h2>Tu recorrido</h2><span className="muted tiny">{stops.length} paradas</span></div>
      {selected.length === 0 ? <div className="empty-card"><MapPin size={28}/><h3>Agrega tu primera parada</h3><p>Selecciona destinos del catálogo para construir una ruta personalizada.</p></div> : <ol className="route-stop-list">
        {selected.map((stop, index) => <li key={stop.id}>
          <span className="route-stop-number">{index + 1}</span>
          <div className="route-stop-copy"><strong>{stop.title}</strong><small>{stop.city}, {stop.region}</small></div>
          <div className="route-stop-controls">
            <button type="button" className="icon-button" aria-label="Subir parada" disabled={index === 0} onClick={() => moveStop(index, -1)}><ArrowUp size={16}/></button>
            <button type="button" className="icon-button" aria-label="Bajar parada" disabled={index === selected.length - 1} onClick={() => moveStop(index, 1)}><ArrowDown size={16}/></button>
            <button type="button" className="icon-button danger-action" aria-label="Quitar parada" onClick={() => setStops(current => current.filter(id => id !== stop.id))}><Trash2 size={16}/></button>
          </div>
          {index < selected.length - 1 && <span className="route-segment-distance">{segments[index] === null ? 'Distancia no disponible' : `≈ ${segments[index]!.toFixed(1)} km en línea recta`}</span>}
        </li>)}
      </ol>}
      {selected.length >= 2 && <div className="route-estimate"><span>Distancia aproximada entre coordenadas</span><strong>{estimate === null ? 'No disponible' : `≈ ${estimate.toFixed(1)} km`}</strong><small>La distancia real por carretera y el tiempo de viaje se calculan en Google Maps.</small></div>}
      <div className="route-planner-actions">
        <button className="secondary" disabled={!mapsReady} onClick={() => window.open(mapsUrl, '_blank', 'noopener,noreferrer')}><Navigation size={16}/> Abrir navegación</button>
        <button className="primary" disabled={selected.length < 2} onClick={() => onPrepareTrip(stops)}><Plus size={16}/> Guardar como viaje</button>
      </div>
    </div>
    <div className="settings-card">
      <div className="section-heading"><h2>Añadir destinos</h2><span className="muted tiny">{available.length} disponibles</span></div>
      <input aria-label="Buscar destino para la ruta" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar destino, ciudad o departamento" />
      <div className="route-destination-options">{available.slice(0, 100).map(destination => <button type="button" key={destination.id} onClick={() => addStop(destination.id)}><span><MapPin size={16}/></span><span><strong>{destination.title}</strong><small>{destination.city}, {destination.region}</small></span><Plus size={17}/></button>)}</div>
      {available.length > 100 && <p className="muted tiny">Mostrando los primeros 100 resultados. Escribe para filtrar el catálogo.</p>}
    </div>
  </section>
}
