import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
function distanceMeters(aLat:number,aLng:number,bLat:number,bLng:number) {
  const rad=(v:number)=>v*Math.PI/180, R=6371000;
  const dLat=rad(bLat-aLat), dLng=rad(bLng-aLng);
  const x=Math.sin(dLat/2)**2+Math.cos(rad(aLat))*Math.cos(rad(bLat))*Math.sin(dLng/2)**2;
  return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok",{headers:cors});
  if (req.method !== "POST") return json(405,{error:"Method not allowed"});
  const auth=req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json(401,{error:"Authentication required"});
  const url=Deno.env.get("SUPABASE_URL")!;
  const anon=Deno.env.get("SUPABASE_ANON_KEY")!;
  const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const {data:{user},error:userError}=await userClient.auth.getUser();
  if (userError || !user) return json(401,{error:"Invalid session"});
  let body: {destination_id?:number;latitude?:number;longitude?:number;notes?:string};
  try { body=await req.json(); } catch { return json(400,{error:"Invalid JSON"}); }
  const id=Number(body.destination_id), lat=Number(body.latitude), lng=Number(body.longitude);
  if (!Number.isInteger(id) || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return json(400,{error:"Invalid destination or coordinates"});
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:destination,error:destError}=await admin.from("destination_catalog").select("id,latitude,longitude,geofence_radius_m,is_active,name").eq("id",id).maybeSingle();
  if (destError || !destination || !destination.is_active) return json(404,{error:"Destination not found"});
  const distance=distanceMeters(lat,lng,destination.latitude,destination.longitude);
  if (distance > destination.geofence_radius_m) return json(422,{error:"Outside geofence",distance_m:Math.round(distance),radius_m:destination.geofence_radius_m});
  const {data:visit,error:insertError}=await admin.from("app_visits").insert({
    user_id:user.id,destination_id:id,visited_at:new Date().toISOString(),validation_method:"gps",
    validation_status:"pending",notes:typeof body.notes==="string"?body.notes.slice(0,500):null,
    latitude:lat,longitude:lng
  }).select("id,destination_id,visited_at,validation_method,validation_status").single();
  if (insertError) return json(500,{error:"Could not save visit"});
  return json(201,{visit,distance_m:Math.round(distance),message:"Visit submitted for review"});
});