import { useState } from 'react'
import { Download, ShieldAlert, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
type Spec={key:string;table:string;column:string}
const specs:Spec[]=[
{key:'profile',table:'profiles',column:'id'},{key:'motorcycles',table:'motorcycles',column:'user_id'},{key:'maintenance',table:'motorcycle_maintenance',column:'user_id'},{key:'documents',table:'motorcycle_documents',column:'user_id'},
{key:'app_visits',table:'app_visits',column:'user_id'},{key:'visits',table:'visits',column:'user_id'},{key:'destination_stamps',table:'passport_destination_stamps',column:'user_id'},{key:'department_stamps',table:'passport_department_stamps',column:'user_id'},
{key:'trips',table:'trips',column:'user_id'},{key:'trip_stops',table:'trip_custom_stops',column:'user_id'},{key:'trip_photos',table:'trip_photos',column:'user_id'},
{key:'posts',table:'posts',column:'user_id'},{key:'comments',table:'comments',column:'user_id'},{key:'likes',table:'post_likes',column:'user_id'},{key:'post_photos',table:'post_photos',column:'user_id'},{key:'post_media',table:'post_media',column:'user_id'},
{key:'saved_posts',table:'saved_posts',column:'user_id'},{key:'saved_trips',table:'saved_trips',column:'user_id'},{key:'journals',table:'journals',column:'user_id'},{key:'journal_photos',table:'journal_photos',column:'user_id'},
{key:'follows_as_follower',table:'follows',column:'follower_id'},{key:'follows_as_following',table:'follows',column:'following_id'},
{key:'notifications',table:'user_notifications',column:'recipient_id'},{key:'reports',table:'content_reports',column:'reporter_id'},{key:'rider_toolkit',table:'rider_toolkit',column:'user_id'},{key:'reminders',table:'rider_reminders',column:'user_id'}
]
export function AccountDataTools({userId,onBack,onDeleted}:{userId:string|null;onBack:()=>void;onDeleted:()=>void}){
 const [exporting,setExporting]=useState(false),[deleting,setDeleting]=useState(false),[confirm,setConfirm]=useState(''),[status,setStatus]=useState('')
 async function exportData(){
  if(!supabase||!userId)return
  setExporting(true);setStatus('Recopilando tus datos…')
  const output:any={product:'Pasaporte Motero',exported_at:new Date().toISOString(),user_id:userId,data:{},omitted:[] as string[]}
  for(const spec of specs){const result=await supabase.from(spec.table).select('*').eq(spec.column,userId);if(result.error){output.omitted.push(spec.key+': '+result.error.message);continue}output.data[spec.key]=result.data||[]}
  const blob=new Blob([JSON.stringify(output,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a')
  link.href=url;link.download='pasaporte-motero-mis-datos-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url)
  setExporting(false);setStatus(output.omitted.length?'Archivo descargado con '+output.omitted.length+' tabla(s) omitida(s). Revisa el apartado omitted.':'Exportación descargada correctamente.')
 }
 async function deleteAccount(){
  if(!supabase||confirm!=='ELIMINAR MI CUENTA')return
  setDeleting(true);setStatus('Verificando sesión reciente…')
  const {data:{session}}=await supabase.auth.getSession()
  if(!session){setDeleting(false);setStatus('Tu sesión expiró. Inicia sesión nuevamente.');return}
  const {data,error}=await supabase.functions.invoke('delete-account',{body:{confirmation:confirm}})
  if(error||!data?.ok){setDeleting(false);setStatus(data?.error||error?.message||'No se pudo eliminar la cuenta.');return}
  try{await supabase.auth.signOut()}catch{/* La cuenta ya fue eliminada. */}
  setStatus(data.cleanup_warning||'Cuenta eliminada correctamente.');onDeleted()
 }
 return <section className="account-data-tools"><button className="back-link" onClick={onBack}>← Volver a configuración</button><span className="eyebrow">CONTROL DE TUS DATOS</span><h1>Datos y cuenta</h1>
 <div className="settings-card account-export-card"><Download size={24}/><h2>Descargar mis datos</h2><p className="muted">Genera un archivo JSON con tu perfil, motocicleta, mantenimiento, documentos, visitas, sellos, bitácoras, publicaciones, favoritos, recordatorios y datos sociales accesibles para tu cuenta.</p><button type="button" className="primary full" disabled={exporting||!userId} onClick={()=>void exportData()}>{exporting?'Preparando archivo…':'Descargar mis datos'}</button><p className="muted tiny">Incluye rutas de archivos multimedia, no descarga las fotografías ni documentos adjuntos.</p></div>
 <div className="settings-card account-delete-card"><ShieldAlert size={24}/><h2>Eliminar mi cuenta</h2><p>Esta acción es permanente. Se eliminarán tu perfil, viajes, publicaciones, visitas, sellos, documentos y archivos personales. No se puede deshacer.</p><p className="muted tiny">La sesión debe haberse iniciado o renovado en los últimos 15 minutos. Descarga primero tus datos si deseas conservar una copia.</p><label>Escribe exactamente ELIMINAR MI CUENTA<input value={confirm} onChange={e=>setConfirm(e.target.value.toUpperCase())} autoComplete="off" placeholder="ELIMINAR MI CUENTA"/></label><button type="button" className="danger-button full" disabled={deleting||confirm!=='ELIMINAR MI CUENTA'} onClick={()=>void deleteAccount()}><Trash2 size={16}/>{deleting?'Eliminando cuenta…':'Eliminar definitivamente mi cuenta'}</button></div>
 {status&&<p className="account-data-status" role="status">{status}</p>}</section>
}
