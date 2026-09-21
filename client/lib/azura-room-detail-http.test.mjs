import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, symlink, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { roomDetailImages } from "./azura-room-detail-storage.mjs";

const appRoot = path.resolve(import.meta.dirname, "..");
const seed = JSON.parse(await readFile(path.join(appRoot, "content/site-pages/deluxeroom.json"), "utf8"));
const token = "room-detail-local-test-token-123456789";
const auth = {Authorization:`Bearer ${token}`};
const locales = ["tr", "en", "de", "ru"];
const escapeHtml = value => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#x27;");
const leaves = value => typeof value === "string" ? [value] : Object.values(value).flatMap(leaves);

// Public localized paths from i18n/routing.js; /rooms/... is the internal route.
const routes = {
  tr: {deluxeroom:'/odalar/deluxeoda',familyroom:'/odalar/aileoda',fantasyroom:'/odalar/fantazioda',handicaproom:'/odalar/engellioda'},
  en: {deluxeroom:'/rooms/deluxeroom',familyroom:'/rooms/familyroom',fantasyroom:'/rooms/fantasyroom',handicaproom:'/rooms/handicaproom'},
  de: {deluxeroom:'/zimmer/deluxezimmer',familyroom:'/zimmer/familienzimmer',fantasyroom:'/zimmer/fantasiezimmer',handicaproom:'/zimmer/barrierefreieszimmer'},
  ru: {deluxeroom:'/nomera/номерделюкс',familyroom:'/nomera/номерсемейный',fantasyroom:'/nomera/номерфэнтези',handicaproom:'/nomera/номерделюксдляинвалидов'}
};

async function startServer(port, paths) {
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "localhost", "-p", String(port)], {
    cwd: appRoot, env: { ...process.env, AZURA_PANEL_SERVICE_TOKEN: token, AZURA_CONTENT_ROOT: paths.contentRoot, AZURA_UPLOADS_ROOT: paths.uploadsRoot },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", chunk => { output += chunk; }); child.stderr.on("data", chunk => { output += chunk; });
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`Next başlatılamadı: ${output}`);
    try { if ((await fetch(`${base}/uploads/pages/deluxeroom/deluxe1.jpg`)).status === 200) return { child, base, output: () => output }; }
    catch { /* server not ready */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  child.kill(); throw new Error(`Next hazır olmadı: ${output}`);
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  await new Promise(resolve => {
    child.once("exit", resolve); child.kill();
    setTimeout(() => { child.kill("SIGKILL"); resolve(); }, 3000).unref();
  });
}

test("Deluxe dört dil: metinler, medya/öneri sırası, turlar, kalıcı yayın ve Family/Fantasy regresyonu", { timeout: 120000 }, async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'azura-room-detail-http-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = { contentRoot: path.join(root, 'content'), uploadsRoot: path.join(root, 'uploads') };
  await mkdir(path.join(paths.contentRoot, 'site-pages'), { recursive: true });
  const file = path.join(paths.contentRoot, 'site-pages/deluxeroom.json');
  await writeFile(file, JSON.stringify({...seed,metadata:{kept:true}}));
  for (const folder of ['deluxeroom','room-options']) await cp(path.join(appRoot, 'public/uploads/pages', folder), path.join(paths.uploadsRoot, 'pages', folder), { recursive:true });
  const port = 46000 + Math.floor(Math.random()*10000);
  const started = await startServer(port, paths); let { child } = started;
  const {base,output} = started;
  t.after(() => stopServer(child));
  const request = async url => { try { const r = await fetch(url, {redirect:'manual'}); if(r.status >= 300 && r.status < 400) throw new Error(`Redirect ${r.status} ${r.headers.get('location')}`); return r; } catch(error) { throw new Error(`${url}: ${error.cause?.stack ?? error.stack}\n${output()}`); } };

  const endpoint=`${base}/api/azura/room-details/deluxe/page-content`;
  const mediaEndpoint=`${base}/api/azura/room-details/deluxe/images`;
  const get=async()=>{const r=await requestAuth(endpoint);assert.equal(r.status,200);return r.json();};
  const requestAuth=url=>fetch(url,{headers:auth});
  const put=(body,revision,extra={})=>fetch(endpoint,{method:'PUT',headers:{...auth,'Content-Type':'application/json',...(revision===undefined?{}:{'If-Match':revision}),...extra},body:typeof body==='string'?body:JSON.stringify(body)});
  for(const url of [endpoint,mediaEndpoint]) for(const method of [url===endpoint?'PUT':'POST','GET']) assert.equal((await fetch(url,{method})).status,401);
  for(const key of ['family','fantasy','handicap','unknown','constructor']) for(const suffix of ['page-content','images']) for(const method of ['GET',suffix==='images'?'POST':'PUT']) assert.equal((await fetch(`${base}/api/azura/room-details/${key}/${suffix}`,{method,headers:auth})).status,404);
  let current=await get();assert.deepEqual(Object.keys(current).sort(),['bundle','media','revision']);assert.match(current.revision,/^[a-f0-9]{64}$/);
  const body={bundle:current.bundle,media:current.media};
  const before=await readFile(file);
  for(const [payload,rev,extra,status] of [[body,undefined,{},428],[body,'bad',{},400],[body,`"${'0'.repeat(64)}"`,{},409],['{',`"${current.revision}"`,{},400],[body,`"${current.revision}"`,{'Content-Type':'text/plain'},415],[' '.repeat(128*1024+1),`"${current.revision}"`,{},413],[{...body,extra:true},`"${current.revision}"`,{},400]]){
    assert.equal((await put(payload,rev,extra)).status,status);assert.deepEqual(await readFile(file),before);
  }
  const mutations=[b=>delete b.bundle.translations.ru,b=>b.bundle.translations.tr.RoomInfo.features.unknown='x',b=>b.media.gallery.images.reverse(),b=>b.media.otherOptions.images.reverse(),b=>b.bundle.tours[0].url='https://evil.example/tour',b=>b.bundle.tours[0].id='evil',b=>b.bundle.translations.tr.title='x'.repeat(4001),b=>b.media.hero.image='/uploads/pages/about/hero.jpg',b=>b.media.hero.width++,b=>b.media.hero.image='/uploads/pages/room-options/fantasy-preview.jpg',b=>b.bundle.translations.tr.OtherOptions.cards.family.link='https://evil.example'];
  for(const mutate of mutations){const bad=structuredClone(body);mutate(bad);assert.equal((await put(bad,`"${current.revision}"`)).status,400);assert.deepEqual(await readFile(file),before);}
  const a=structuredClone(body),b=structuredClone(body);a.bundle.translations.tr.title='Parallel A';b.bundle.translations.tr.title='Parallel B';
  const parallel=await Promise.all([put(a,`"${current.revision}"`),put(b,`"${current.revision}"`)]);assert.deepEqual(parallel.map(r=>r.status).sort(),[200,409]);
  current=await get();assert.equal((await put(body,`"${current.revision}"`)).status,200);
  const afterRestore=await readFile(file);
  await writeFile(path.join(paths.uploadsRoot,'pages/deluxeroom/fake.jpg'),'fake');
  await symlink(path.join(paths.uploadsRoot,'pages/deluxeroom/deluxe1.jpg'),path.join(paths.uploadsRoot,'pages/deluxeroom/link.jpg'));
  const listing=await (await requestAuth(mediaEndpoint)).json();assert.equal(listing.images.length,10);assert.ok(listing.images.some(i=>i.image==='/uploads/pages/room-options/fantasy-preview.jpg'));assert.ok(listing.images.every(i=>i.width&&i.height&&i.modifiedAt));
  const upload=async(bytes,type='image/jpeg',extra=false)=>{const form=new FormData();form.append('file',new Blob([bytes],{type}),'../../shared.jpg');if(extra)form.append('extra','x');return fetch(mediaEndpoint,{method:'POST',headers:auth,body:form});};
  assert.equal((await upload('fake')).status,415);assert.equal((await upload(Buffer.alloc(8*1024*1024+1))).status,413);assert.equal((await upload('fake','image/jpeg',true)).status,400);
  const source=await readFile(path.join(paths.uploadsRoot,'pages/deluxeroom/deluxe2.jpg'));
  const uploadedResponse=await upload(source);assert.equal(uploadedResponse.status,201);const uploaded=await uploadedResponse.json();assert.deepEqual(Object.keys(uploaded).sort(),['height','image','mimeType','size','width']);assert.ok(uploaded.image.startsWith('/uploads/pages/deluxeroom/'));assert.deepEqual(await readFile(file),afterRestore);
  const duplicate=await (await upload(source)).json();assert.notEqual(duplicate.image,uploaded.image);
  for (const image of new Set(roomDetailImages(seed.media).map(r=>r.image))) {
    const response=await request(`${base}${image}`); assert.equal(response.status,200,image);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),await readFile(path.join(appRoot,'public',image)));
  }
  for (const locale of locales) {
    const response=await request(`${base}/${locale}${routes[locale].deluxeroom}`); assert.equal(response.status,200,output());
    const html=(await response.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
    for (const text of leaves(seed.translations[locale])) assert.ok(html.includes(escapeHtml(text)),`${locale}: ${text}`);
    const tags=[...html.matchAll(/<img\b[^>]*>/g)].map(m=>m[0].replace(/%2f/gi,'/')).filter(tag=>tag.includes('/uploads/pages/deluxeroom/')||tag.includes('/uploads/pages/room-options/'));
    const expected=[...seed.media.gallery.images,...seed.media.otherOptions.images];
    assert.equal(tags.length,11);
    expected.forEach((r,i)=>{assert.ok(tags[i].includes(r.image),`image order ${i}`);assert.ok(tags[i].includes(`alt="${escapeHtml(r.translations[locale].alt)}"`));});
    const frames=[...html.matchAll(/<iframe\b[^>]*src="([^"]+)"[^>]*>/g)].map(m=>m[1]);
    assert.deepEqual(frames,seed.tours.map(tour=>escapeHtml(tour.url)));
    assert.ok([...html.matchAll(/href="([^"]+)"/g)].some(m=>decodeURIComponent(m[1]) === `/${locale}${routes[locale].familyroom}`));
    assert.ok([...html.matchAll(/href="([^"]+)"/g)].some(m=>decodeURIComponent(m[1]) === `/${locale}${routes[locale].fantasyroom}`));
    for (const [room,namespace,count] of [['familyroom','FamilyRoom',2],['fantasyroom','FantasyRoom',1],['handicaproom','HandicapRoom',1]]) {
      const r=await request(`${base}/${locale}${routes[locale][room]}`); assert.equal(r.status,200,room);
      const body=(await r.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
      const messages=JSON.parse(await readFile(path.join(appRoot,`messages/${locale}.json`),'utf8'));
      for (const text of [messages[namespace].title,messages[namespace].RoomFeatures.text,messages[namespace].OtherOptions.title1,messages[namespace].OtherOptions.title2,messages.DeluxeRoom.OtherOptions.title]) assert.ok(body.includes(escapeHtml(text)),`${room}: ${text}`);
      assert.equal([...body.matchAll(/<iframe\b[^>]*src="https:\/\/kuula.co/g)].length,count);
      assert.ok(body.includes('alt="Slide 0"')); // Existing static image fallback remains intact.
    }
  }
  const updated=structuredClone(seed);
  for(const locale of locales){ updated.translations[locale].title=`Persistent Deluxe ${locale}`;updated.translations[locale].OtherOptions.cards.family.title=`Persistent Family ${locale}`; }
  const selected=structuredClone(seed.media.gallery.images[1]); delete selected.id;delete selected.order;
  selected.image=uploaded.image;
  selected.width=uploaded.width;selected.height=uploaded.height;

  updated.media.hero=selected;
  current=await get();const savedResponse=await put({bundle:{translations:updated.translations,tours:updated.tours},media:updated.media},`"${current.revision}"`);assert.equal(savedResponse.status,200);const saved=await savedResponse.json();
  async function published(){for(const locale of locales){const r=await request(`${base}/${locale}${routes[locale].deluxeroom}`);assert.equal(r.status,200);const html=await r.text();assert.ok(html.includes(`Persistent Deluxe ${locale}`));assert.ok(html.includes(`Persistent Family ${locale}`));assert.ok(html.includes(selected.image));}assert.equal((await request(`${base}${selected.image}`)).status,200);}
  await published();await stopServer(child);({child}=await startServer(port,paths));await published();
  assert.deepEqual(JSON.parse(await readFile(file,'utf8')),{...updated,metadata:{kept:true}});
  assert.equal((await get()).revision,saved.revision);
});
