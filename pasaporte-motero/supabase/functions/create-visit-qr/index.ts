import { createClient } from "npm:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"Método no permitido"},405);
 try{
  const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const auth=req.headers.get("Authorization");if(!auth?.startsWith("Bearer "))return json({error:"No autorizado"},401);
  const token=auth.slice(7),client=createClient(url,anon,{auth:{persistSession:false},global:{headers:{Authorization:auth}}});
  const {data:ud,error:ue}=await client.auth.getUser(token);if(ue||!ud.user)return json({error:"Sesión inválida"},401);
  const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:profile}=await admin.from("profiles").select("role").eq("id",ud.user.id).maybeSingle();
  if(!profile||!["admin","manager"].includes(profile.role))return json({error:"Solo un encargado autorizado puede emitir códigos"},403);
  const body=await req.json(),destinationId=Number(body.destination_id);
  if(!Number.isInteger(destinationId))return json({error:"Destino inválido"},400);
  const {data:destination,error:de}=await admin.from("destination_catalog").select("id,name,is_active").eq("id",destinationId).eq("is_active",true).maybeSingle();
  if(de)throw de;if(!destination)return json({error:"Destino no disponible"},404);
  const bytes=crypto.getRandomValues(new Uint8Array(32));
  const raw=Array.from(bytes).map(b=>b.toString(16).padStart(2,"0")).join("");
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(raw));
  const hash=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
  const expiresAt=new Date(Date.now()+120000).toISOString();
  const {error:insertError}=await admin.from("visit_qr_challenges").insert({destination_id:destinationId,token_hash:hash,issued_by:ud.user.id,expires_at:expiresAt});
  if(insertError)throw insertError;
  return json({token:raw,expires_at:expiresAt,destination});
 }catch(e){console.error(e);return json({error:e instanceof Error?e.message:"Error interno"},500)}
});