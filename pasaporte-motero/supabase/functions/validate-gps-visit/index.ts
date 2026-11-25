import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { distanceMeters, isNonPhysicalCategory, parseGpsPayload } from "./validation.mjs";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json(401, { error: "Authentication required" });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return json(500, { error: "Server configuration is incomplete" });

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return json(401, { error: "Invalid session" });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const parsed = parseGpsPayload(body);
  if (!parsed.ok) return json(parsed.status, {
    error: parsed.error,
    ...(parsed.accuracy_limit_m ? { accuracy_limit_m: parsed.accuracy_limit_m } : {}),
  });

  const { destinationId, latitude, longitude, accuracy, notes } = parsed;
  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: destination, error: destinationError } = await admin
    .from("destination_catalog")
    .select("id,latitude,longitude,geofence_radius_m,is_active,name,category")
    .eq("id", destinationId)
    .maybeSingle();

  if (destinationError) return json(500, { error: "Could not verify destination" });
  if (!destination || !destination.is_active) return json(404, { error: "Destination not found" });

  if (isNonPhysicalCategory(destination.category)) {
    return json(422, {
      error: "Este elemento representa una experiencia cultural, gastronómica o un evento, no un punto físico verificable por GPS. Registra la visita con evidencia fotográfica o QR.",
      validation_method: "photo_or_qr",
    });
  }

  const destinationLat = Number(destination.latitude);
  const destinationLng = Number(destination.longitude);
  const geofenceRadius = Number(destination.geofence_radius_m);
  if (!Number.isFinite(destinationLat) || destinationLat < -90 || destinationLat > 90
    || !Number.isFinite(destinationLng) || destinationLng < -180 || destinationLng > 180
    || !Number.isFinite(geofenceRadius) || geofenceRadius <= 0) {
    return json(422, {
      error: "Este destino no tiene coordenadas o geocerca verificables. Registra la visita con fotografía o QR.",
      validation_method: "photo_or_qr",
    });
  }

  // Use the service-role client for this server-side integrity check.
  // Never trust client-supplied destination coordinates.
  const { count: sharedCoordinateCount, error: coordinateCheckError } = await admin
    .from("destination_catalog")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .eq("latitude", destination.latitude)
    .eq("longitude", destination.longitude)
    .neq("id", destination.id);

  if (coordinateCheckError) {
    return json(500, {
      error: "No se pudo verificar la unicidad de la ubicación. Intenta registrar la visita con evidencia.",
    });
  }
  if ((sharedCoordinateCount || 0) > 0) {
    return json(422, {
      error: "La ubicación de este destino está compartida con otros registros del catálogo. Para evitar sellos GPS incorrectos, registra la visita con fotografía o QR.",
      validation_method: "photo_or_qr",
    });
  }

  const distance = distanceMeters(latitude, longitude, destinationLat, destinationLng);
  if (distance + accuracy > geofenceRadius) {
    return json(422, {
      error: "La precisión GPS no permite confirmar que estás dentro del área del destino. Mejora la señal o presenta evidencia fotográfica.",
      distance_m: Math.round(distance),
      accuracy_m: Math.round(accuracy),
      radius_m: geofenceRadius,
    });
  }

  const { data: pendingVisit, error: pendingError } = await admin
    .from("app_visits")
    .select("id,destination_id,visited_at,validation_method,validation_status")
    .eq("user_id", user.id)
    .eq("destination_id", destinationId)
    .in("validation_status", ["pending", "validated"])
    .order("visited_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pendingError) return json(500, { error: "Could not check existing visits" });
  if (pendingVisit?.validation_status === "validated") {
    return json(200, {
      visit: pendingVisit,
      already_validated: true,
      message: "This GPS visit is already validated.",
    });
  }

  if (pendingVisit?.validation_status === "pending" && pendingVisit.validation_method === "gps") {
    const { data: updated, error: updateError } = await admin
      .from("app_visits")
      .update({
        validation_status: "validated",
        reviewed_by: null,
        reviewed_at: null,
        rejection_reason: null,
      })
      .eq("id", pendingVisit.id)
      .eq("validation_status", "pending")
      .select("id,destination_id,visited_at,validation_method,validation_status")
      .single();

    if (updateError) return json(500, { error: "Could not automatically validate the existing GPS visit" });
    return json(200, { visit: updated, already_validated: true, message: "GPS visit automatically validated." });
  }

  if (pendingVisit?.validation_status === "pending") {
    return json(409, {
      error: "A photo visit for this destination is already awaiting staff review.",
      visit_id: pendingVisit.id,
    });
  }

  const { data: visit, error: insertError } = await admin
    .from("app_visits")
    .insert({
      user_id: user.id,
      destination_id: destinationId,
      visited_at: new Date().toISOString(),
      validation_method: "gps",
      validation_status: "validated",
      notes,
      latitude,
      longitude,
      accuracy_m: accuracy,
    })
    .select("id,destination_id,visited_at,validation_method,validation_status")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: existingVisit } = await admin
        .from("app_visits")
        .select("id,destination_id,visited_at,validation_method,validation_status")
        .eq("user_id", user.id)
        .eq("destination_id", destinationId)
        .eq("validation_status", "pending")
        .maybeSingle();
      if (existingVisit) {
        return json(200, { visit: existingVisit, already_pending: true, message: "This visit is already awaiting review." });
      }
    }
    return json(500, { error: "Could not save visit" });
  }

  return json(201, {
    visit,
    distance_m: Math.round(distance),
    accuracy_m: Math.round(accuracy),
    message: "GPS visit automatically validated",
  });
});
