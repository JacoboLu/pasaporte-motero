import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, ClipboardCheck, MapPin, Phone, Plus, RefreshCw, Trash2, Wallet } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Expense = { id:string; date:string; category:string; amount:number; note:string }
type Item = { id:string; label:string; group:string }
const KEY='pm_rider_toolkit_v1'
const items:Item[]=[
{id:'tires',label:'Presión y estado de neumáticos',group:'Motocicleta'},
{id:'brakes',label:'Frenos delantero y trasero',group:'Motocicleta'},
{id:'chain',label:'Cadena, tensión y lubricación',group:'Motocicleta'},
{id:'lights',label:'Luces, direccionales y claxon',group:'Motocicleta'},
{id:'fluids',label:'Aceite, refrigerante y combustible',group:'Motocicleta'},
{id:'helmet',label:'Casco y guantes',group:'Equipamiento'},
{id:'protection',label:'Chaqueta, botas y protección',group:'Equipamiento'},
{id:'documents',label:'Licencia, SOAT y documentos',group:'Equipamiento'},
{id:'weather',label:'Clima, ruta y estado de carreteras',group:'Planificación'},
{id:'battery',label:'Teléfono cargado y batería externa',group:'Planificación'},
{id:'water',label:'Agua, botiquín y herramientas básicas',group:'Planificación'}]
const categories=['Combustible','Peajes','Alimentación','Hospedaje','Mantenimiento','Otros']
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
const checkedValues=(v:unknown):string[]=>Array.isArray(v)?v.filter((x):x is string=>typeof x==='string'&&items.some(i=>i.id===x)):[]
const expenseValues=(v:unknown):Expense[]=>Array.isArray(v)?v.filter((x:any)=>x&&typeof x.id==='string'&&typeof x.date==='string'&&Number.isFinite(Number(x.amount))).map((x:any)=>({...x,amount:Number(x.amount),note:typeof x.note==='string'?x.note:''})):[]
type Payload={checklist:string[];contact_name:string;contact_phone:string;expenses:Expense[]}

export function RiderToolkit({onBack,userId}:{onBack:()=>void;userId:string|null}){
 const [checked,setChecked]=useState<string[]>([])
 const [contactName,setContactName]=useState('')
 const [contactPhone,setContactPhone]=useState('')
 const [expenses,setExpenses]=useState<Expense[]>([])
 const [date,setDate]=useState(today())
 const [category,setCategory]=useState(categories[0])
 const [amount,setAmount]=useState('')
 const [note,setNote]=useState('')
 const [locationMessage,setLocationMessage]=useState('')
 const [syncState,setSyncState]=useState<'loading'|'saving'|'synced'|'error'>('loading')
 const [syncMessage,setSyncMessage]=useState('Cargando tus datos…')
 const [loaded,setLoaded]=useState(false)
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null)
 const lastPayload=useRef('')

 useEffect(()=>{
  let active=true
  async function load(){
   if(!supabase||!userId){if(active){setSyncState('error');setSyncMessage('Inicia sesión para sincronizar el Kit de ruta.');setLoaded(true)}return}
   setSyncState('loading');setSyncMessage('Cargando tus datos…')
   const {data,error}=await supabase.from('rider_toolkit').select('checklist,contact_name,contact_phone,expenses').eq('user_id',userId).maybeSingle()
   if(!active)return
   if(error){setSyncState('error');setSyncMessage('No se pudieron cargar tus datos: '+error.message);setLoaded(true);return}
   let local:any=null
   try{const raw=localStorage.getItem(KEY);if(raw)local=JSON.parse(raw)}catch{local=null}
   let payload:Payload
   if(data){
    const mergedExpenses=expenseValues(data.expenses)
    for(const expense of expenseValues(local?.expenses))if(!mergedExpenses.some(x=>x.id===expense.id))mergedExpenses.push(expense)
    payload={
     checklist:[...new Set([...checkedValues(data.checklist),...checkedValues(local?.checked)])],
     contact_name:data.contact_name||(typeof local?.contactName==='string'?local.contactName:''),
     contact_phone:data.contact_phone||(typeof local?.contactPhone==='string'?local.contactPhone:''),
     expenses:mergedExpenses.slice(0,100)
    }
   }else{
    payload={checklist:checkedValues(local?.checked),contact_name:typeof local?.contactName==='string'?local.contactName:'',contact_phone:typeof local?.contactPhone==='string'?local.contactPhone:'',expenses:expenseValues(local?.expenses)}
   }
   setChecked(payload.checklist);setContactName(payload.contact_name);setContactPhone(payload.contact_phone);setExpenses(payload.expenses)
   lastPayload.current=JSON.stringify(payload)
   const {error:saveError}=await supabase.from('rider_toolkit').upsert({user_id:userId,...payload,updated_at:new Date().toISOString()},{onConflict:'user_id'})
   if(!active)return
   if(saveError){setSyncState('error');setSyncMessage('No se pudo sincronizar: '+saveError.message)}
   else{setSyncState('synced');setSyncMessage(data?'Sincronizado con tu cuenta. Datos locales integrados.':'Kit de ruta sincronizado. Se conservaron tus datos locales.')}
   setLoaded(true)
  }
  void load()
  return()=>{active=false}
 },[userId])

 useEffect(()=>{
  if(!loaded||!userId||!supabase)return
  const payload:Payload={checklist:checked,contact_name:contactName,contact_phone:contactPhone,expenses}
  const serialized=JSON.stringify(payload)
  if(serialized===lastPayload.current)return
  if(timer.current)clearTimeout(timer.current)
  setSyncState('saving');setSyncMessage('Guardando cambios…')
  timer.current=setTimeout(async()=>{
   const {error}=await supabase!.from('rider_toolkit').upsert({user_id:userId,...payload,updated_at:new Date().toISOString()},{onConflict:'user_id'})
   if(error){setSyncState('error');setSyncMessage('No se pudo sincronizar: '+error.message)}
   else{lastPayload.current=serialized;setSyncState('synced');setSyncMessage('Sincronizado con tu cuenta.')}
  },400)
  return()=>{if(timer.current)clearTimeout(timer.current)}
 },[checked,contactName,contactPhone,expenses,loaded,userId])

 const progress=Math.round(checked.length/items.length*100)
 const total=useMemo(()=>expenses.reduce((sum,x)=>sum+x.amount,0),[expenses])
 function addExpense(){const n=Number(amount);if(!Number.isFinite(n)||n<=0||!date)return;setExpenses(v=>[{id:crypto.randomUUID(),date,category,amount:Math.round(n*100)/100,note:note.trim()},...v].slice(0,100));setAmount('');setNote('')}
 function shareLocation(){
  if(!navigator.geolocation){setLocationMessage('Este dispositivo no permite obtener la ubicación.');return}
  setLocationMessage('Obteniendo ubicación…')
  navigator.geolocation.getCurrentPosition(async p=>{
   const url='https://www.google.com/maps?q='+p.coords.latitude+','+p.coords.longitude
   try{if(navigator.share)await navigator.share({title:'Mi ubicación · Pasaporte Motero',text:'Mi ubicación actual: '+url,url});else if(navigator.clipboard){await navigator.clipboard.writeText('Mi ubicación actual: '+url);setLocationMessage('Enlace copiado. Compártelo con tu contacto de confianza.')}else setLocationMessage(url)}
   catch(e){if((e as Error).name!=='AbortError')setLocationMessage('No se pudo compartir. Copia este enlace: '+url)}
  },e=>setLocationMessage(e.code===1?'Permite la ubicación desde los ajustes del navegador.':'No pudimos obtener la ubicación. Inténtalo nuevamente.'),{enableHighAccuracy:true,timeout:12000,maximumAge:30000})
 }

 return <section className="rider-toolkit">
  <button className="back-link" onClick={onBack}>← Volver al perfil</button>
  <span className="eyebrow">PREPARA TU SIGUIENTE AVENTURA</span><h1>Kit de ruta</h1>
  <p className="muted">Herramientas prácticas para revisar tu moto, cuidar tu seguridad y controlar los gastos del viaje.</p>
  <div className="settings-card toolkit-card">
   <div className="toolkit-heading"><span className="toolkit-icon"><ClipboardCheck size={19}/></span><div><h2>Lista antes de salir</h2><small>{checked.length} de {items.length} revisados</small></div><strong>{progress}%</strong></div>
   <div className="progress"><span style={{width:progress+'%'}}/></div>
   {['Motocicleta','Equipamiento','Planificación'].map(group=><div className="toolkit-check-group" key={group}><h3>{group}</h3>{items.filter(x=>x.group===group).map(item=><label className="toolkit-check" key={item.id}><input type="checkbox" checked={checked.includes(item.id)} onChange={e=>setChecked(v=>e.target.checked?[...v,item.id]:v.filter(id=>id!==item.id))}/><span>{item.label}</span></label>)}</div>)}
   <button type="button" className="text-action" onClick={()=>setChecked([])}>Reiniciar lista</button>
  </div>
  <div className="settings-card toolkit-card">
   <div className="toolkit-heading"><span className="toolkit-icon"><AlertTriangle size={19}/></span><div><h2>Contacto de confianza</h2><small>Ten a mano a quién llamar durante la ruta.</small></div></div>
   <label>Nombre<input value={contactName} onChange={e=>setContactName(e.target.value)} placeholder="Nombre de tu contacto"/></label>
   <label>Teléfono<input type="tel" inputMode="tel" value={contactPhone} onChange={e=>setContactPhone(e.target.value)} placeholder="+51 999 999 999"/></label>
   <div className="toolkit-actions"><button className="secondary" type="button" disabled={!contactPhone.trim()} onClick={()=>window.location.href='tel:'+contactPhone.replace(/[^+0-9]/g,'')}><Phone size={16}/> Llamar</button><button className="primary" type="button" onClick={shareLocation}><MapPin size={16}/> Compartir ubicación</button></div>
   {locationMessage&&<p className="muted tiny" role="status">{locationMessage}</p>}
   <p className="toolkit-note">No es un servicio de emergencia ni reemplaza la asistencia oficial.</p>
  </div>
  <div className="settings-card toolkit-card">
   <div className="toolkit-heading"><span className="toolkit-icon"><Wallet size={19}/></span><div><h2>Gastos del viaje</h2><small>Control de tus gastos en soles.</small></div></div>
   <div className="toolkit-expense-total"><small>Total de gastos registrados</small><strong>S/ {total.toFixed(2)}</strong></div>
   <div className="toolkit-expense-form">
    <label>Fecha<input className="toolkit-date-input" type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
    <label>Categoría<select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(x=><option key={x}>{x}</option>)}</select></label>
   </div>
   <label>Importe (S/)<input type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"/></label>
   <label>Detalle (opcional)<input value={note} onChange={e=>setNote(e.target.value)} placeholder="Ej. tanque lleno en Huancayo"/></label>
   <button type="button" className="primary full" disabled={!amount||Number(amount)<=0||!date} onClick={addExpense}><Plus size={16}/> Añadir gasto</button>
   {expenses.length?<div className="toolkit-expense-list">{expenses.map(x=><div className="toolkit-expense-row" key={x.id}><div><strong>{x.category}</strong><small>{x.date}{x.note?' · '+x.note:''}</small></div><b>S/ {x.amount.toFixed(2)}</b><button type="button" aria-label="Eliminar gasto" onClick={()=>setExpenses(v=>v.filter(y=>y.id!==x.id))}><Trash2 size={15}/></button></div>)}</div>:<p className="muted tiny">Aún no registras gastos.</p>}
  </div>
  <p className={'toolkit-storage-note toolkit-sync-'+syncState}><span>{syncState==='saving'||syncState==='loading'?<RefreshCw size={14}/>:<CheckCircle2 size={14}/>}</span>{syncMessage}</p>
 </section>
}
