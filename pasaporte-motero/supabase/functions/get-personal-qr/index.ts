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
  const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:existing,error:readError}=await admin.from("user_qr_codes").select("public_code").eq("user_id",ud.user.id).is("revoked_at",null).maybeSingle();
  if(readError)throw readError;
  if(existing?.public_code)return json({code:existing.public_code});
  const {data:created,error:createError}=await admin.from("user_qr_codes").insert({user_id:ud.user.id}).select("public_code").single();
  if(createError)throw createError;
  return json({code:created.public_code});
 }catch(e){console.error(e);return json({error:e instanceof Error?e.message:"Error interno"},500)}
});