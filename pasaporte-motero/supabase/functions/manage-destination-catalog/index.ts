import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const fields=["name","department","province","city","category","description","latitude","longitude","geofence_radius_m","is_active","image_url"];
function json(status:number,body:Record<string,unknown>){return new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});if(req.method!=="POST")return json(405,{error:"Method not allowed"});
 const auth=req.headers.get("Authorization");if(!auth?.startsWith("Bearer "))return json(401,{error:"Authentication required"});
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!url||!anon||!service)return json(500,{error:"Server configuration incomplete"});
 const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:userError}=await userClient.auth.getUser();if(userError||!user)return json(401,{error:"Invalid session"});
 const {data:profile,error:profileError}=await userClient.from("profiles").select("role").eq("id",user.id).maybeSingle();if(profileError||profile?.role!=="admin")return json(403,{error:"Solo un administrador puede gestionar el catálogo."});
 let body:any={};try{body=await req.json();}catch{return json(400,{error:"Invalid JSON"});}
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 if(body.action==="list"){const limit=Math.max(1,Math.min(100,Number(body.limit)||50)),search=String(body.search||"").trim().replace(/[%,()]/g," ");let q=admin.from("destination_catalog").select("id,name,department,province,city,category,description,latitude,longitude,geofence_radius_m,is_active,image_url").order("name").limit(limit);if(search)q=q.or("name.ilike.%"+search+"%,department.ilike.%"+search+"%");const {data,error}=await q;if(error)return json(500,{error:"No se pudo consultar el catálogo."});return json(200,{ok:true,destinations:data||[]});}
 const action=body.action;if(!["create","update","archive"].includes(action))return json(400,{error:"Acción no válida"});
 const id=Number(body.id??body.destination?.id);if(action!=="create"&&(!Number.isInteger(id)||id<=0))return json(400,{error:"ID de destino no válido"});
 let before:any=null;if(action!=="create"){const {data,error}=await admin.from("destination_catalog").select("*").eq("id",id).maybeSingle();if(error||!data)return json(404,{error:"Destino no encontrado"});before=data;}
 let after:any;
 if(action==="archive")after={is_active:false,updated_at:new Date().toISOString()};
 else{const src=body.destination||{},clean:any={};for(const key of fields)if(src[key]!==undefined)clean[key]=src[key];clean.name=String(clean.name||"").trim();clean.department=String(clean.department||"").trim();if(clean.name.length<2||clean.name.length>160||!clean.department||clean.department.length>100)return json(400,{error:"Nombre o departamento no válidos"});
  for(const key of ["province","city","category","description","image_url"])if(clean[key]!==undefined&&clean[key]!==null)clean[key]=String(clean[key]).trim();if(clean.description&&clean.description.length>3000)return json(400,{error:"La descripción supera 3000 caracteres"});
  if(clean.latitude!==undefined&&clean.latitude!==null&&(!Number.isFinite(Number(clean.latitude))||Number(clean.latitude)<-90||Number(clean.latitude)>90))return json(400,{error:"Latitud no válida"});if(clean.longitude!==undefined&&clean.longitude!==null&&(!Number.isFinite(Number(clean.longitude))||Number(clean.longitude)<-180||Number(clean.longitude)>180))return json(400,{error:"Longitud no válida"});if((clean.latitude===null)!==(clean.longitude===null))return json(400,{error:"Registra ambas coordenadas o deja ambas vacías"});
  const radius=Number(clean.geofence_radius_m??before?.geofence_radius_m??150);if(!Number.isInteger(radius)||radius<25||radius>5000)return json(400,{error:"El radio GPS debe estar entre 25 y 5000 metros"});clean.geofence_radius_m=radius;clean.updated_at=new Date().toISOString();after=clean;}
 const result=action==="create"?await admin.from("destination_catalog").insert(after).select("id,name,department,province,city,category,description,latitude,longitude,geofence_radius_m,is_active,image_url").single():await admin.from("destination_catalog").update(after).eq("id",id).select("id,name,department,province,city,category,description,latitude,longitude,geofence_radius_m,is_active,image_url").single();
 if(result.error)return json(500,{error:"No se pudo guardar el destino: "+result.error.message});
 const audit=await admin.from("admin_audit_log").insert({actor_id:user.id,action:action==="archive"?"destination.archive":"destination."+action,entity_type:"destination_catalog",entity_id:String(result.data.id),before_data:before,after_data:result.data});if(audit.error){console.error("Audit log insert failed",audit.error);if(action==="create"){await admin.from("destination_catalog").delete().eq("id",result.data.id);}else if(before){const restore:any={};for(const key of fields)restore[key]=before[key];restore.updated_at=before.updated_at;await admin.from("destination_catalog").update(restore).eq("id",id);}return json(500,{error:"No se pudo registrar la auditoría. Se revirtió el cambio del catálogo."});}
 return json(200,{ok:true,destination:result.data});
});
