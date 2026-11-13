import { createClient } from "npm:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"Método no permitido"},405);
 try{
  const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const auth=req.headers.get("Authorization");if(!auth?.startsWith("Bearer "))return json({error:"No autorizado"},401);
  const client=createClient(url,anon,{auth:{persistSession:false},global:{headers:{Authorization:auth}}});
  const {data:ud,error:ue}=await client.auth.getUser(auth.slice(7));if(ue||!ud.user)return json({error:"Sesión inválida"},401);
  const body=await req.json(),raw=String(body.token||"").trim().toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(raw))return json({error:"Código QR inválido"},400);
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(raw));
  const hash=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
  const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:challenge,error:ce}=await admin.from("visit_qr_challenges").select("id,destination_id,expires_at,redeemed_at").eq("token_hash",hash).maybeSingle();
  if(ce)throw ce;if(!challenge)return json({error:"Código no reconocido"},404);
  if(challenge.redeemed_at)return json({error:"Este código ya fue utilizado"},409);
  if(new Date(challenge.expires_at).getTime()<=Date.now())return json({error:"El código venció. Solicita uno nuevo al encargado."},410);
  const redeemedAt=new Date().toISOString();
  const {data:claimed,error:claimError}=await admin.from("visit_qr_challenges").update({redeemed_at:redeemedAt,redeemed_by:ud.user.id}).eq("id",challenge.id).is("redeemed_at",null).gt("expires_at",redeemedAt).select("id").maybeSingle();
  if(claimError)throw claimError;if(!claimed)return json({error:"El código ya fue utilizado o venció"},409);
  const {data:visit,error:visitError}=await admin.from("app_visits").insert({user_id:ud.user.id,destination_id:challenge.destination_id,visited_at:redeemedAt,validation_method:"qr",validation_status:"pending",notes:"Validación presencial mediante QR temporal"}).select("id,destination_id,visited_at,validation_status").single();
  if(visitError){await admin.from("visit_qr_challenges").update({redeemed_at:null,redeemed_by:null}).eq("id",challenge.id);throw visitError;}
  await admin.from("visit_qr_challenges").update({visit_id:visit.id}).eq("id",challenge.id);
  return json({visit});
 }catch(e){console.error(e);return json({error:e instanceof Error?e.message:"Error interno"},500)}
});