import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ClipboardCheck, MapPin, Phone, Plus, Share2, Trash2, Wallet, Wrench } from 'lucide-react'

type Expense = { id: string; date: string; category: string; amount: number; note: string }
type ChecklistItem = { id: string; label: string; group: string }
const STORAGE_KEY = 'pm_rider_toolkit_v1'
const checklist: ChecklistItem[] = [
  { id: 'tires', label: 'Presión y estado de neumáticos', group: 'Motocicleta' },
  { id: 'brakes', label: 'Frenos delantero y trasero', group: 'Motocicleta' },
  { id: 'chain', label: 'Cadena, tensión y lubricación', group: 'Motocicleta' },
  { id: 'lights', label: 'Luces, direccionales y claxon', group: 'Motocicleta' },
  { id: 'fluids', label: 'Aceite, refrigerante y combustible', group: 'Motocicleta' },
  { id: 'helmet', label: 'Casco y guantes', group: 'Equipamiento' },
  { id: 'protection', label: 'Chaqueta, botas y protección', group: 'Equipamiento' },
  { id: 'documents', label: 'Licencia, SOAT y documentos', group: 'Equipamiento' },
  { id: 'weather', label: 'Clima, ruta y estado de carreteras', group: 'Planificación' },
  { id: 'battery', label: 'Teléfono cargado y batería externa', group: 'Planificación' },
  { id: 'water', label: 'Agua, botiquín y herramientas básicas', group: 'Planificación' },
]
const categories = ['Combustible', 'Peajes', 'Alimentación', 'Hospedaje', 'Mantenimiento', 'Otros']
const today = () => new Date().toISOString().slice(0, 10)

export function RiderToolkit({ onBack }: { onBack: () => void }) {
  const [checked, setChecked] = useState<string[]>([])
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [date, setDate] = useState(today())
  const [category, setCategory] = useState(categories[0])
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [locationMessage, setLocationMessage] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      setChecked(Array.isArray(data.checked) ? data.checked.filter((id: string) => checklist.some(item => item.id === id)) : [])
      setContactName(typeof data.contactName === 'string' ? data.contactName : '')
      setContactPhone(typeof data.contactPhone === 'string' ? data.contactPhone : '')
      setExpenses(Array.isArray(data.expenses) ? data.expenses.filter((item: Expense) => item && typeof item.id === 'string' && Number.isFinite(Number(item.amount))) : [])
    } catch { /* Un almacenamiento local ilegible no debe bloquear la aplicación. */ }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ checked, contactName, contactPhone, expenses }))
      setSaved(true)
    } catch { setSaved(false) }
  }, [checked, contactName, contactPhone, expenses])

  const progress = Math.round(checked.length / checklist.length * 100)
  const total = useMemo(() => expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0), [expenses])

  function addExpense() {
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) return
    setExpenses(items => [{ id: crypto.randomUUID(), date, category, amount: Math.round(value * 100) / 100, note: note.trim() }, ...items].slice(0, 100))
    setAmount('')
    setNote('')
  }

  function shareLocation() {
    if (!navigator.geolocation) { setLocationMessage('Este dispositivo no permite obtener la ubicación.'); return }
    setLocationMessage('Obteniendo ubicación…')
    navigator.geolocation.getCurrentPosition(async position => {
      const url = `https://www.google.com/maps?q=${position.coords.latitude},${position.coords.longitude}`
      const message = `Mi ubicación actual: ${url}`
      try {
        if (navigator.share) await navigator.share({ title: 'Mi ubicación · Pasaporte Motero', text: message, url })
        else if (navigator.clipboard) { await navigator.clipboard.writeText(message); setLocationMessage('Enlace de ubicación copiado. Compártelo con tu contacto de confianza.') }
        else setLocationMessage(url)
      } catch (error) {
        if ((error as Error)?.name !== 'AbortError') setLocationMessage('No se pudo compartir. Puedes copiar este enlace: ' + url)
      }
    }, error => setLocationMessage(error.code === 1 ? 'Permite la ubicación desde los ajustes del navegador.' : 'No pudimos obtener la ubicación. Inténtalo en un lugar con mejor señal.'), { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 })
  }

  return <section className="rider-toolkit">
    <button className="back-link" onClick={onBack}>← Volver al perfil</button>
    <span className="eyebrow">PREPARA TU SIGUIENTE AVENTURA</span>
    <h1>Kit de ruta</h1>
    <p className="muted">Herramientas prácticas para revisar tu moto, cuidar tu seguridad y controlar los gastos del viaje.</p>

    <div className="settings-card toolkit-card">
      <div className="toolkit-heading"><span className="toolkit-icon"><ClipboardCheck size={19}/></span><div><h2>Lista antes de salir</h2><small>{checked.length} de {checklist.length} revisados</small></div><strong>{progress}%</strong></div>
      <div className="progress"><span style={{ width: progress + '%' }}/></div>
      {['Motocicleta', 'Equipamiento', 'Planificación'].map(group => <div className="toolkit-check-group" key={group}>
        <h3>{group}</h3>
        {checklist.filter(item => item.group === group).map(item => <label className="toolkit-check" key={item.id}>
          <input type="checkbox" checked={checked.includes(item.id)} onChange={event => setChecked(items => event.target.checked ? [...items, item.id] : items.filter(id => id !== item.id))}/>
          <span>{item.label}</span>
        </label>)}
      </div>)}
      <button type="button" className="text-action" onClick={() => setChecked([])}>Reiniciar lista</button>
    </div>

    <div className="settings-card toolkit-card">
      <div className="toolkit-heading"><span className="toolkit-icon"><AlertTriangle size={19}/></span><div><h2>Contacto de confianza</h2><small>Guarda un contacto para tenerlo a mano durante la ruta.</small></div></div>
      <label>Nombre<input value={contactName} onChange={event => setContactName(event.target.value)} placeholder="Nombre de tu contacto"/></label>
      <label>Teléfono<input type="tel" inputMode="tel" value={contactPhone} onChange={event => setContactPhone(event.target.value)} placeholder="+51 999 999 999"/></label>
      <div className="toolkit-actions">
        <button className="secondary" type="button" disabled={!contactPhone.trim()} onClick={() => window.location.href = 'tel:' + contactPhone.replace(/[^+0-9]/g, '')}><Phone size={16}/> Llamar</button>
        <button className="primary" type="button" onClick={shareLocation}><MapPin size={16}/> Compartir ubicación</button>
      </div>
      {locationMessage && <p className="muted tiny" role="status">{locationMessage}</p>}
      <p className="toolkit-note">Esta función facilita contactar a una persona de confianza; no es un servicio de emergencia ni reemplaza la asistencia oficial.</p>
    </div>

    <div className="settings-card toolkit-card">
      <div className="toolkit-heading"><span className="toolkit-icon"><Wallet size={19}/></span><div><h2>Gastos del viaje</h2><small>Control sencillo de tus gastos en soles.</small></div></div>
      <div className="toolkit-expense-total"><small>Total registrado en este dispositivo</small><strong>S/ {total.toFixed(2)}</strong></div>
      <div className="form-grid">
        <label>Fecha<input type="date" value={date} onChange={event => setDate(event.target.value)}/></label>
        <label>Categoría<select value={category} onChange={event => setCategory(event.target.value)}>{categories.map(item => <option key={item}>{item}</option>)}</select></label>
      </div>
      <label>Importe (S/)<input type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0.00"/></label>
      <label>Detalle (opcional)<input value={note} onChange={event => setNote(event.target.value)} placeholder="Ej. tanque lleno en Huancayo"/></label>
      <button type="button" className="primary full" disabled={!amount || Number(amount) <= 0} onClick={addExpense}><Plus size={16}/> Añadir gasto</button>
      {expenses.length > 0 ? <div className="toolkit-expense-list">{expenses.map(item => <div className="toolkit-expense-row" key={item.id}><div><strong>{item.category}</strong><small>{item.date}{item.note ? ' · ' + item.note : ''}</small></div><b>S/ {Number(item.amount).toFixed(2)}</b><button type="button" aria-label="Eliminar gasto" onClick={() => setExpenses(items => items.filter(expense => expense.id !== item.id))}><Trash2 size={15}/></button></div>)}</div> : <p className="muted tiny">Aún no registras gastos.</p>}
    </div>
    <p className="toolkit-storage-note"><CheckCircle2 size={14}/> {saved ? 'Guardado localmente en este dispositivo.' : 'No se pudo guardar en este dispositivo.'} Los gastos, el contacto y la lista no se sincronizan con tu cuenta.</p>
  </section>
}
