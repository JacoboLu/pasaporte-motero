import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json(401, { error: "Authentication required" });

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return json(500, { error: "Server configuration is incomplete" });

  const authClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData.user) return json(401, { error: "Invalid session" });

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: actor, error: actorError } = await admin.from("profiles")
    .select("role").eq("id", authData.user.id).maybeSingle();
  if (actorError) return json(500, { error: "Could not verify administrator role" });
  if (actor?.role !== "admin") return json(403, { error: "Only administrators can manage regional assignments" });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return json(400, { error: "Invalid JSON body" });
  const action = String(body.action || "");
  const userId = String(body.user_id || "");
  const departmentCode = String(body.department_code || "").toUpperCase();
  if (!["assign", "deactivate"].includes(action)) return json(400, { error: "Unsupported action" });
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
    return json(400, { error: "Invalid user id" });
  }
  if (!/^[A-Z]{3}$/.test(departmentCode)) return json(400, { error: "Invalid department code" });

  const { data: department, error: departmentError } = await admin.from("passport_department_catalog")
    .select("code").eq("code", departmentCode).maybeSingle();
  if (departmentError) return json(500, { error: "Could not verify department" });
  if (!department) return json(404, { error: "Department not found" });

  const { data: target, error: targetError } = await admin.from("profiles")
    .select("id,role").eq("id", userId).maybeSingle();
  if (targetError) return json(500, { error: "Could not verify target user" });
  if (!target) return json(404, { error: "User not found" });
  if (target.role === "admin" && action === "deactivate") {
    return json(409, { error: "An administrator cannot be downgraded through regional assignment management" });
  }

  if (action === "assign") {
    const { data: assignment, error: assignmentError } = await admin.from("department_managers")
      .upsert({
        user_id: userId,
        department_code: departmentCode,
        assigned_by: authData.user.id,
        is_active: true,
        deactivated_by: null,
        deactivated_at: null,
      }, { onConflict: "user_id,department_code" })
      .select("id,user_id,department_code,is_active")
      .single();
    if (assignmentError) return json(500, { error: "Could not save regional assignment" });

    if (target.role !== "admin" && target.role !== "manager") {
      const { error: roleError } = await admin.from("profiles").update({ role: "manager" }).eq("id", userId);
      if (roleError) {
        await admin.from("department_managers").update({ is_active: false }).eq("id", assignment.id);
        return json(500, { error: "Assignment saved but manager role could not be activated" });
      }
    }
    return json(200, { ok: true, action, assignment });
  }

  const { data: assignment, error: assignmentError } = await admin.from("department_managers")
    .update({ is_active: false, deactivated_by: authData.user.id, deactivated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("department_code", departmentCode)
    .eq("is_active", true)
    .select("id,user_id,department_code,is_active")
    .maybeSingle();
  if (assignmentError) return json(500, { error: "Could not deactivate regional assignment" });

  const { count, error: countError } = await admin.from("department_managers")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_active", true);
  if (countError) return json(500, { error: "Assignment deactivated but remaining assignments could not be checked" });

  let roleDowngraded = false;
  if ((count || 0) === 0 && target.role === "manager") {
    const { error: roleError } = await admin.from("profiles").update({ role: "user" }).eq("id", userId);
    if (roleError) return json(500, { error: "Assignment deactivated but manager role could not be downgraded" });
    roleDowngraded = true;
  }
  return json(200, { ok: true, action, assignment, remaining_active_assignments: count || 0, role_downgraded: roleDowngraded });
});
