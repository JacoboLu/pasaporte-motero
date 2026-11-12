import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json(401, { error: "Authentication required" });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) {
    return json(500, { error: "Server configuration is incomplete" });
  }

  const authClient = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData.user) return json(401, { error: "Invalid session" });

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: staff, error: staffError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  if (staffError || !["admin", "manager"].includes(staff?.role || "")) {
    return json(403, { error: "Only authorized staff can validate rider QR codes" });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return json(400, { error: "Invalid JSON body" });

  const raw = String(body.code || "").trim();
  const destinationId = Number(body.destination_id);
  if (!raw || !Number.isSafeInteger(destinationId) || destinationId <= 0) {
    return json(400, { error: "QR code and a valid destination are required" });
  }

  let publicCode = raw;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.type && parsed.type !== "pasaporte-motero-user") {
      return json(400, { error: "QR code type is not supported" });
    }
    publicCode = String(parsed.code || parsed.public_code || parsed.token || raw).trim();
  } catch {
    // The personal QR may also be supplied as a plain public code.
  }
  if (!publicCode || publicCode.length > 512) {
    return json(400, { error: "Invalid rider QR code" });
  }

  const { data: destination, error: destinationError } = await admin
    .from("destination_catalog")
    .select("id")
    .eq("id", destinationId)
    .eq("is_active", true)
    .maybeSingle();
  if (destinationError) return json(500, { error: "Could not verify destination" });
  if (!destination) return json(404, { error: "Destination not found or inactive" });

  const { data: qr, error: qrError } = await admin
    .from("user_qr_codes")
    .select("user_id")
    .eq("public_code", publicCode)
    .is("revoked_at", null)
    .maybeSingle();
  if (qrError || !qr) return json(404, { error: "Rider QR is invalid or revoked" });
  if (qr.user_id === authData.user.id) {
    return json(400, { error: "You cannot validate your own visit" });
  }

  const now = new Date().toISOString();
  const { data: visit, error: insertError } = await admin
    .from("app_visits")
    .insert({
      user_id: qr.user_id,
      destination_id: destinationId,
      validation_method: "qr",
      validation_status: "validated",
      notes: "Validación presencial realizada por personal autorizado.",
      reviewed_by: authData.user.id,
      reviewed_at: now,
      visited_at: now,
    })
    .select("id,user_id,destination_id,validation_status,visited_at")
    .single();

  if (insertError) return json(400, { error: "Could not register visit" });
  return json(201, { ok: true, visit });
});
