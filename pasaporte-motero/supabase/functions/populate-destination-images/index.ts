import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
});
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const clean = (value: string) => (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const generic = new Set(["de","del","la","las","el","los","y","en","peru","the","of","and","a","al","sector","acceso","mirador","plaza","nacional","parque","complejo","arqueologico","laguna","nevado","reserva","santuario","valle","ruta","monumental","centro","historico","monumento","provincial","distrito"]);
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET" && req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "No autorizado" }, 401);
  const base = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !anon || !service) return json({ error: "Configuración del servidor incompleta" }, 500);

  const authClient = createClient(base, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "Sesión inválida" }, 401);

  const admin = createClient(base, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile, error: profileError } = await admin.from("profiles")
    .select("role").eq("id", authData.user.id).maybeSingle();
  if (profileError) return json({ error: "No se pudo verificar el perfil" }, 500);
  if (profile?.role !== "admin") return json({ error: "Solo un administrador puede actualizar el catálogo de imágenes" }, 403);

  const url = new URL(req.url);
  const offset = Number(url.searchParams.get("offset") || 0);
  const limit = Number(url.searchParams.get("limit") || 4);
  if (!Number.isSafeInteger(offset) || offset < 0) return json({ error: "Offset inválido" }, 400);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 4) return json({ error: "El límite debe estar entre 1 y 4" }, 400);

  const headers = { apikey: service, Authorization: "Bearer " + service, "Content-Type": "application/json" };
  if (url.searchParams.get("manual") === "verified") {
    const verified: Record<number, string> = {
      42: "File:Complejo Arqueológico Pikillacta.jpg",
      59: "File:Laguna Rajucolta.jpg",
      36: "File:Chacas-cascohistórico.jpg",
      52: "File:Laguna Wilcacocha de Huaraz.jpg",
      55: "File:Yungay Cemetery.jpg",
      57: "File:Huascarán en laguna Chinancocha Llanganuco.jpg",
      60: "File:Huascaran Sur.jpg",

      22: "File:02-Cordillera Arcoíris de Palccoyo-nX-25.jpg",
      43: "File:Waqrapukara.jpg",
      44: "File:Puente Q'eswachaka, Quehue, Cusco, Perú.jpg",
      51: "File:Salkantay mountain, Cusco.jpg",

      39: "File:Piedra de los 12 ángulos.jpg",
      40: "File:San Blás - Cusco.jpg",
      65: "File:Basilica Cathedral of Arequipa, Peru.jpg",
      66: "File:Arequipa - Canyon de Colca.JPG",
      104: "File:Mirador de Yanahuara, Arequipa, Perú, 2026.jpg",

      1: "File:Abra de Anticona - Ticlio, Peru (5957080927).jpg",
      27: "File:Plaza de Armas de Huaraz.jpg",
      32: "File:Chavin de Huantar 2026 01.jpg",
      61: "File:Catarata de gocta.jpg",
      62: "File:Kuelap, Peru.jpg",
      6: "File:Huacachina - Ica, Peru.jpg",
      21: "File:Rainbow Mountain Peru.jpg",
      23: "File:Yacimiento arqueológico de Racchi.jpg",
      24: "File:Andahuaylilas Church.jpg",
      28: "File:Laguna Paron.jpg",
      31: "File:Nevado Pastoruri.jpg",
      10: "File:Qenqo archaeological site in cusco 01.jpg",
      11: "File:Puka Pukara 2025.jpg",
      12: "File:Tambomachay.jpg",
      16: "File:Salineras de Maras.JPG",
      15: "File:Moray - Peru.jpg"
    };
    const results: any[] = [];
    for (const [idText, title] of Object.entries(verified)) {
      await pause(1200);
      const id = Number(idText);
      const params = new URLSearchParams({
        action: "query", format: "json", prop: "imageinfo", titles: title,
        iiprop: "url|mime|extmetadata", iiurlwidth: "1200",
        iiextmetadatafilter: "LicenseShortName|Artist|Credit|LicenseUrl|UsageTerms"
      });
      const response = await fetch("https://commons.wikimedia.org/w/api.php?" + params.toString(), {
        headers: { "User-Agent": "PasaporteMotero/3.0 (licensed destination photo catalog)" }
      });
      if (!response.ok) { results.push({ id, title, status: "commons_error", detail: response.status }); continue; }
      const data = await response.json();
      const page: any = Object.values(data.query?.pages || {})[0];
      const info = page?.imageinfo?.[0];
      const meta = info?.extmetadata || {};
      const license = meta.LicenseShortName?.value || meta.UsageTerms?.value || "";
      if (!(info?.thumburl || info?.url) || (info.mime && !info.mime.startsWith("image/")) || !/(CC BY|CC0|Public domain|PD-)/i.test(license)) {
        results.push({ id, title, status: "license_or_image_unverified", license }); continue;
      }
      const author = String(meta.Artist?.value || meta.Credit?.value || "Autor no indicado").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
      const source = info.descriptionurl || "https://commons.wikimedia.org/wiki/" + encodeURIComponent(title.replace(/ /g, "_"));
      const note = "Fotografía: " + author + "; Wikimedia Commons; " + license + "; " + source;
      const update = await fetch(base + "/rest/v1/destination_catalog?id=eq." + id, {
        method: "PATCH", headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({ image_url: info.thumburl || info.url, source_note: note })
      });
      results.push({ id, title, status: update.ok ? "updated" : "update_error", license, source });
    }
    return json({ manual: true, results });
  }
  const [rowsResponse, imagesResponse] = await Promise.all([
    fetch(base + "/rest/v1/destination_catalog?select=id,name,department,province,city,source_note,image_url&order=id.asc&limit=" + limit + "&offset=" + offset, { headers }),
    fetch(base + "/rest/v1/destination_catalog?select=image_url&image_url=not.is.null", { headers })
  ]);
  if (!rowsResponse.ok) return Response.json({ error: await rowsResponse.text() }, { status: 502 });
  if (!imagesResponse.ok) return Response.json({ error: "Could not load existing image URLs" }, { status: 502 });
  const places = await rowsResponse.json();
  const usedUrls = new Set((await imagesResponse.json()).map((row: any) => row.image_url).filter(Boolean));
  const results: any[] = [];
  for (const place of places) {
    if (place.image_url) { results.push({ id: place.id, name: place.name, status: "already_has_image" }); continue; }
    try {
      const core = clean(place.name).split(" ").filter((token: string) => token.length > 2 && !generic.has(token));
      const cityTokens = clean(place.city).split(" ").filter((token: string) => token.length > 2);
      const provinceTokens = clean(place.province).split(" ").filter((token: string) => token.length > 2);
      const departmentTokens = clean(place.department).split(" ").filter((token: string) => token.length > 2);
      const api = new URL("https://commons.wikimedia.org/w/api.php");
      api.search = new URLSearchParams({
        action: "query", format: "json", generator: "search", gsrsearch: [place.name, place.city, place.department].filter(Boolean).join(" "),
        gsrnamespace: "6", gsrlimit: "35", prop: "imageinfo|categories",
        iiprop: "url|extmetadata", iiurlwidth: "1200",
        iiextmetadatafilter: "LicenseShortName|Artist|Credit|LicenseUrl|UsageTerms",
        cllimit: "30"
      }).toString();
      let data: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const response = await fetch(api, { headers: { "User-Agent": "PasaporteMotero/3.0 (licensed destination photo catalog)" } });
        if (response.status === 429 || response.status >= 500) { await pause(2000 * (attempt + 1)); continue; }
        if (!response.ok) throw new Error("Wikimedia Commons HTTP " + response.status);
        data = await response.json(); break;
      }
      if (!data) throw new Error("Wikimedia Commons temporarily unavailable");
      const candidates = (Object.values(data.query?.pages || {}) as any[]).map((page: any) => {
        const info = page.imageinfo?.[0] || {};
        const meta = info.extmetadata || {};
        const title = clean(page.title.replace(/^file\s*/, ""));
        const categories = (page.categories || []).map((item: any) => clean(item.title.replace(/^category\s*:/, ""))).join(" ");
        const titleTokens = title.split(" ");
        const allTokens = new Set((title + " " + categories).split(" ").filter(Boolean));
        const matchedCore = core.filter((token: string) => allTokens.has(token)).length;
        const coreCoverage = core.length ? matchedCore / core.length : 0;
        const cityMatch = cityTokens.some((token: string) => allTokens.has(token));
        const provinceMatch = provinceTokens.some((token: string) => allTokens.has(token));
        const departmentMatch = departmentTokens.some((token: string) => allTokens.has(token));
        const license = meta.LicenseShortName?.value || meta.UsageTerms?.value || "";
        const mime = info.mime || "";
        const badTitle = /map|location|locator|logo|flag|diagram|route map|coat of arms|escudo|screenshot|poster/i.test(title);
        const allowedLicense = /CC BY|CC0|Public domain|Public Domain|PD-/i.test(license);
        const exactCore = core.length > 0 && core.every((token: string) => allTokens.has(token));
        const locationMatch = cityMatch || provinceMatch || departmentMatch;
        const distinctiveSingle = core.length === 1 && core[0].length >= 6 && titleTokens.includes(core[0]);
        const score = coreCoverage * 0.72 + (cityMatch ? 0.22 : provinceMatch ? 0.16 : departmentMatch ? 0.10 : 0) + (exactCore ? 0.08 : 0);
        return { page, info, meta, title, license, mime, coreCoverage, locationMatch, distinctiveSingle, score, badTitle, allowedLicense };
      }).filter((item: any) =>
        (item.info.thumburl || item.info.url) &&
        /^image\/(jpeg|png|webp)$/i.test(item.mime) &&
        item.allowedLicense && !item.badTitle &&
        (item.info.width || 0) >= 400 && (item.info.height || 0) >= 250 &&
        !usedUrls.has(item.info.thumburl || item.info.url) &&
        item.coreCoverage >= (core.length <= 1 ? 1 : 0.66) &&
        (item.exactCore || item.distinctiveSingle) &&
        item.score >= 0.68
      ).sort((a: any, b: any) => b.score - a.score);
      const best = candidates[0];
      if (!best) { results.push({ id: place.id, name: place.name, status: "no_confident_match" }); continue; }
      const author = (best.meta.Artist?.value || best.meta.Credit?.value || "Autor no indicado").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
      const source = best.info.descriptionurl || "https://commons.wikimedia.org/wiki/" + encodeURIComponent(best.page.title.replace(/ /g, "_"));
      const imageUrl = best.info.thumburl || best.info.url;
      const note = "Fotografía: " + author + "; Wikimedia Commons; " + best.license + "; " + source;
      const update = await fetch(base + "/rest/v1/destination_catalog?id=eq." + place.id, {
        method: "PATCH", headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({ image_url: imageUrl, source_note: [place.source_note, note].filter(Boolean).join(" | ") })
      });
      if (!update.ok) { results.push({ id: place.id, name: place.name, status: "update_error", detail: await update.text() }); continue; }
      usedUrls.add(imageUrl);
      results.push({ id: place.id, name: place.name, status: "updated", file: best.page.title, license: best.license, source });
    } catch (error) {
      results.push({ id: place.id, name: place.name, status: "error", detail: String(error) });
    }
    await pause(1500);
  }
  return json({ offset, processed: places.length, updated: results.filter((item: any) => item.status === "updated").length, results });
});