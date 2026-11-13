import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

async function managerDepartmentNames(admin: any, userId: string): Promise<string[]> {
  const { data: assignments, error: assignmentError } = await admin.from("department_managers")
    .select("department_code").eq("user_id", userId).eq("is_active", true);
  if (assignmentError) throw assignmentError;
  const codes = (assignments || []).map((item: any) => item.department_code).filter(Boolean);
  if (!codes.length) return [];
  const { data: departments, error: departmentError } = await admin.from("passport_department_catalog")
    .select("name").in("code", codes);
  if (departmentError) throw departmentError;
  return (departments || []).map((item: any) => String(item.name).trim().toLocaleLowerCase("es-PE"));
}

async function managerCanManageDestination(admin: any, userId: string, destinationId: number): Promise<boolean> {
  const [names, destinationResult] = await Promise.all([
    managerDepartmentNames(admin, userId),
    admin.from("destination_catalog").select("department").eq("id", destinationId).maybeSingle(),
  ]);
  if (destinationResult.error) throw destinationResult.error;
  const department = String(destinationResult.data?.department || "").trim().toLocaleLowerCase("es-PE");
  return Boolean(department && names.includes(department));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...cors, "Content-Type": "application/json" },
  });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "No autorizado" }, 401);
    const token = authorization.slice(7);
    const authClient = createClient(url, anon, { auth: { persistSession: false }, global: { headers: { Authorization: authorization } } });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "Sesión inválida" }, 401);
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: profile, error: profileError } = await admin.from("profiles")
      .select("role").eq("id", authData.user.id).maybeSingle();
    if (profileError) throw profileError;
    if (!profile || !["admin", "manager"].includes(profile.role)) return json({ error: "Se requiere rol de encargado o administrador" }, 403);

    const allowedDepartments = profile.role === "manager" ? await managerDepartmentNames(admin, authData.user.id) : null;

    if (req.method === "GET") {
      const { data, error } = await admin.from("app_visits")
        .select("id,user_id,destination_id,visited_at,validation_method,validation_status,notes,evidence_path")
        .eq("validation_status", "pending").order("visited_at", { ascending: true }).limit(100);
      if (error) throw error;
      const rows = await Promise.all((data || []).map(async (visit) => {
        const [{ data: destination }, { data: rider }, signed] = await Promise.all([
          admin.from("destination_catalog").select("name,department,province,city").eq("id", visit.destination_id).maybeSingle(),
          admin.from("profiles").select("username,full_name,avatar_url").eq("id", visit.user_id).maybeSingle(),
          visit.evidence_path ? admin.storage.from("travel-media").createSignedUrl(visit.evidence_path, 900) : Promise.resolve({ data: null }),
        ]);
        if (allowedDepartments && !allowedDepartments.includes(String(destination?.department || "").trim().toLocaleLowerCase("es-PE"))) return null;
        return { ...visit, destination, rider, evidence_url: signed.data?.signedUrl || null };
      }));
      return json({ visits: rows.filter(Boolean) });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const visitId = String(body.visit_id || "");
      const decision = body.decision;
      const reason = typeof body.rejection_reason === "string" ? body.rejection_reason.trim().slice(0, 500) : "";
      if (!visitId || !["validated", "rejected"].includes(decision)) return json({ error: "Solicitud inválida" }, 400);
      if (decision === "rejected" && !reason) return json({ error: "Indica el motivo del rechazo" }, 400);
      const { data: visit, error: readError } = await admin.from("app_visits")
        .select("id,destination_id,validation_status").eq("id", visitId).maybeSingle();
      if (readError) throw readError;
      if (!visit) return json({ error: "Visita no encontrada" }, 404);
      if (profile.role === "manager" && !await managerCanManageDestination(admin, authData.user.id, visit.destination_id)) return json({ error: "No tienes asignación para gestionar este departamento" }, 403);
      if (visit.validation_status !== "pending") return json({ error: "La visita ya fue revisada" }, 409);
      const { data: updated, error: updateError } = await admin.from("app_visits")
        .update({
          validation_status: decision,
          reviewed_by: authData.user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: decision === "rejected" ? reason : null,
        })
        .eq("id", visitId).eq("validation_status", "pending")
        .select("id,validation_status,reviewed_at").maybeSingle();
      if (updateError) throw updateError;
      if (!updated) return json({ error: "La visita fue revisada por otra sesión. Actualiza la lista." }, 409);
      return json({ visit: updated });
    }
    return json({ error: "Método no permitido" }, 405);
  } catch (error) {
    console.error("review-app-visit:", error);
    return json({ error: error instanceof Error ? error.message : "Error interno" }, 500);
  }
});