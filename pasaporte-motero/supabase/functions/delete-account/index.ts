import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const buckets=["avatars","community","comunity","motorcycles","travel-media","visit-evidence"];
async function listFiles(admin:any,bucket:string,prefix:string):Promise<string[]>{
 const output:string[]=[];let offset=0;const limit=100;
 while(true){const {data,error}=await admin.storage.from(bucket).list(prefix,{limit,offset,sortBy:{column:"name",order:"asc"}});
  if(error)throw new Error("Storage "+bucket+": "+error.message);
  const rows=data||[];for(const row of rows){const path=prefix+"/"+row.name;if(row.id===null)output.push(...await listFiles(admin,bucket,path));else output.push(path);}
  if(rows.length<limit)break;offset+=limit;
 }return output;
}
function json(status:number,body:Record<string,unknown>){return new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});if(req.method!=="POST")return json(405,{error:"Method not allowed"});
 const auth=req.headers.get("Authorization");if(!auth?.startsWith("Bearer "))return json(401,{error:"Authentication required"});
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!url||!anon||!service)return json(500,{error:"Server configuration incomplete"});
 const client=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:userError}=await client.auth.getUser();if(userError||!user)return json(401,{error:"Invalid session"});
 let claims:any={};try{const part=auth.slice(7).split(".")[1];const normalized=part.replace(/-/g,"+").replace(/_/g,"/");claims=JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length/4)*4,"=")));}catch{return json(401,{error:"Invalid access token"});}
 if(!claims.auth_time||Date.now()/1000-Number(claims.auth_time)>900)return json(403,{error:"Por seguridad, cierra sesión e inicia sesión nuevamente antes de eliminar tu cuenta."});
 let body:any={};try{body=await req.json();}catch{return json(400,{error:"Invalid JSON"});}if(body.confirmation!=="ELIMINAR MI CUENTA")return json(400,{error:"Confirmación incorrecta"});
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
  const {data:profile,error:profileError}=await admin.from("profiles").select("role").eq("id",user.id).maybeSingle();
  if(profileError)throw profileError;
  if(profile?.role==="admin"){
   const {count,error}=await admin.from("profiles").select("id",{count:"exact",head:true}).eq("role","admin");
   if(error)throw error;
   if((count||0)<=1)return json(409,{error:"No puedes eliminar la única cuenta administradora. Asigna primero otro administrador."});
  }
  const {count:assignmentCount,error:assignmentCountError}=await admin.from("department_managers").select("id",{count:"exact",head:true}).eq("assigned_by",user.id);
  if(assignmentCountError)throw assignmentCountError;
  if((assignmentCount||0)>0){
   const {data:replacement,error:replacementError}=await admin.from("profiles").select("id").eq("role","admin").neq("id",user.id).limit(1).maybeSingle();
   if(replacementError)throw replacementError;
   if(!replacement)return json(409,{error:"Tus asignaciones regionales necesitan otro administrador. Transfiere la administración antes de eliminar tu cuenta."});
   const {error:transferError}=await admin.from("department_managers").update({assigned_by:replacement.id}).eq("assigned_by",user.id);
   if(transferError)throw transferError;
  }
  const {data:visits,error:visitError}=await admin.from("app_visits").select("id").eq("user_id",user.id);if(visitError)throw visitError;
  const ids=(visits||[]).map((v:any)=>v.id);
  const {error:issuedError}=await admin.from("visit_qr_challenges").delete().eq("issued_by",user.id);if(issuedError)throw issuedError;
  const {error:redeemedError}=await admin.from("visit_qr_challenges").delete().eq("redeemed_by",user.id);if(redeemedError)throw redeemedError;
  if(ids.length){const {error}=await admin.from("visit_qr_challenges").delete().in("visit_id",ids);if(error)throw error;}
  const {error:reviewedError}=await admin.from("app_visits").update({reviewed_by:null}).eq("reviewed_by",user.id);if(reviewedError)throw reviewedError;
  const {error:deleteError}=await admin.auth.admin.deleteUser(user.id);if(deleteError)throw deleteError;
  const cleanupWarnings:string[]=[];
  for(const bucket of buckets){try{const files=await listFiles(admin,bucket,user.id);for(let i=0;i<files.length;i+=100){const {error}=await admin.storage.from(bucket).remove(files.slice(i,i+100));if(error)throw error;}}catch(error){cleanupWarnings.push(bucket);console.error("Storage cleanup after account deletion failed",bucket,error);}}
  return json(200,{ok:true,...(cleanupWarnings.length?{cleanup_warning:"Tu cuenta fue eliminada, pero quedó pendiente limpiar archivos en: "+cleanupWarnings.join(", ")+". Contacta soporte."}:{})});
 }catch(error){console.error("Account deletion failed",error);return json(500,{error:"No se pudo completar la eliminación de forma segura. La solicitud no fue confirmada; contacta soporte si el problema continúa."});}
});
