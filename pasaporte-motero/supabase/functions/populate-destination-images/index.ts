const TOKEN = "pmv2-images-run-2026-11-12-8f3c9a71d6e24b5f";
const pause = (ms:number) => new Promise(r=>setTimeout(r,ms));
const clean = (s:string) => (s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
const stop = new Set(["de","del","la","las","el","los","y","en","peru","the","of","and","a","al","sector","acceso","mirador","plaza","nacional","parque","complejo","arqueologico","laguna","nevado","reserva","santuario","valle","ruta","monumental"]);
Deno.serve(async(req)=>{
 const u=new URL(req.url);
 if(u.searchParams.get("key")!==TOKEN) return new Response("Unauthorized",{status:401});
 const offset=Math.max(0,Number(u.searchParams.get("offset")||0));
 const limit=Math.min(4,Math.max(1,Number(u.searchParams.get("limit")||4)));
 const base=Deno.env.get("SUPABASE_URL")!;
 const secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default;
 if(!secret) return Response.json({error:"Missing server key"},{status:500});
 const h={apikey:secret,Authorization:"Bearer "+secret,"Content-Type":"application/json"};
 const lr=await fetch(base+"/rest/v1/destination_catalog?select=id,name,department,province,city,source_note,image_url&order=id.asc&limit="+limit+"&offset="+offset,{headers:h});
 if(!lr.ok) return Response.json({error:await lr.text()},{status:502});
 const places=await lr.json(), results=[];
 for(const p of places){
  if(p.image_url){results.push({id:p.id,name:p.name,status:"already_has_image"});continue;}
  try{
   const api=new URL("https://commons.wikimedia.org/w/api.php");
   api.search=new URLSearchParams({action:"query",format:"json",origin:"*",generator:"search",gsrsearch:'"'+p.name+'" '+p.city+" Peru",gsrnamespace:"6",gsrlimit:"12",prop:"imageinfo",iiprop:"url|extmetadata",iiurlwidth:"1200",iiextmetadatafilter:"LicenseShortName|Artist|Credit|LicenseUrl|UsageTerms"}).toString();
   let data:any=null,err="";
   for(let a=0;a<3;a++){
    const res=await fetch(api,{headers:{"User-Agent":"PasaporteMotero/2.0 (Wikimedia Commons destination photos)"}});
    if(res.status===429||res.status>=500){err="HTTP "+res.status;await pause(8000*(a+1));continue;}
    if(!res.ok) throw new Error("Commons HTTP "+res.status);
    data=await res.json();break;
   }
   if(!data) throw new Error("Commons "+err);
   const core=clean(p.name).split(" ").filter((t:string)=>t.length>1&&!stop.has(t));
   const city=clean(p.city).split(" ").filter((t:string)=>t.length>1);
   const pages=Object.values(data.query?.pages||{}) as any[];
   const matches=pages.map((pg:any)=>{
    const title=clean(pg.title.replace(/^file\s*/,""));
    const ts=title.split(" ").filter((t:string)=>t.length>1);
    const matched=core.filter((t:string)=>ts.includes(t)).length;
    const coverage=core.length?matched/core.length:0;
    const cm=city.some((t:string)=>ts.includes(t));
    const info=pg.imageinfo?.[0]||{},meta=info.extmetadata||{};
    const license=meta.LicenseShortName?.value||meta.UsageTerms?.value||"";
    const bad=/map|location|locator|logo|flag|diagram|route map/i.test(title);
    return {pg,info,meta,license,coverage,score:coverage+(cm?.18:0)+(title.includes(clean(p.name))?.25:0),bad};
   }).filter((x:any)=>x.info.thumburl||x.info.url).filter((x:any)=>x.license&&!x.bad&&x.coverage>=(core.length<=2?.5:.42)).sort((a:any,b:any)=>b.score-a.score);
   const best=matches[0];
   if(!best){results.push({id:p.id,name:p.name,status:"no_confident_match"});}
   else{
    const author=(best.meta.Artist?.value||best.meta.Credit?.value||"Autor no indicado").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim().slice(0,180);
    const license=best.license;
    const page=best.info.descriptionurl||"https://commons.wikimedia.org/wiki/"+encodeURIComponent(best.pg.title.replace(/ /g,"_"));
    const note="Imagen Wikimedia Commons: "+best.pg.title+" | Autor: "+author+" | Licencia: "+license+" | Fuente: "+page;
    const pr=await fetch(base+"/rest/v1/destination_catalog?id=eq."+p.id,{method:"PATCH",headers:{...h,Prefer:"return=minimal"},body:JSON.stringify({image_url:best.info.thumburl||best.info.url,source_note:[p.source_note,note].filter(Boolean).join(" | ")})});
    if(!pr.ok) results.push({id:p.id,name:p.name,status:"update_error",detail:await pr.text()});
    else results.push({id:p.id,name:p.name,status:"updated",file:best.pg.title,license});
   }
  }catch(e){results.push({id:p.id,name:p.name,status:"error",detail:String(e)});}
  await pause(8000);
 }
 return Response.json({offset,processed:places.length,updated:results.filter((x:any)=>x.status==="updated").length,results});
});