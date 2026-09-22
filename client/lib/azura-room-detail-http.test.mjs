import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, symlink, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { roomDetailImages } from "./azura-room-detail-storage.mjs";

const appRoot = path.resolve(import.meta.dirname, "..");
const seed = JSON.parse(await readFile(path.join(appRoot, "content/site-pages/deluxeroom.json"), "utf8"));
const familySeed = JSON.parse(await readFile(path.join(appRoot, "content/site-pages/familyroom.json"), "utf8"));
const fantasySeed = JSON.parse(await readFile(path.join(appRoot, "content/site-pages/fantasyroom.json"), "utf8"));
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
  const familyFile=path.join(paths.contentRoot,'site-pages/familyroom.json');
  await writeFile(familyFile,JSON.stringify({...familySeed,metadata:{familyOnly:true}}));
  const fantasyFile=path.join(paths.contentRoot,'site-pages/fantasyroom.json');
  await writeFile(fantasyFile,JSON.stringify({...fantasySeed,metadata:{fantasyOnly:true}}));
  for (const folder of ['deluxeroom','familyroom','fantasyroom','room-options']) await cp(path.join(appRoot, 'public/uploads/pages', folder), path.join(paths.uploadsRoot, 'pages', folder), { recursive:true });
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
  for(const key of ['handicap','unknown','constructor']) for(const suffix of ['page-content','images']) for(const method of ['GET',suffix==='images'?'POST':'PUT']) assert.equal((await fetch(`${base}/api/azura/room-details/${key}/${suffix}`,{method,headers:auth})).status,404);
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
  const listing=await (await requestAuth(mediaEndpoint)).json();assert.equal(listing.images.length,12);assert.ok(listing.images.every(i=>!i.image.includes("/familyroom/")));assert.ok(listing.images.some(i=>i.image==='/uploads/pages/room-options/fantasy-preview.jpg'));assert.ok(listing.images.every(i=>i.width&&i.height&&i.modifiedAt));
  const upload=async(bytes,type='image/jpeg',extra=false)=>{const form=new FormData();form.append('file',new Blob([bytes],{type}),'../../shared.jpg');if(extra)form.append('extra','x');return fetch(mediaEndpoint,{method:'POST',headers:auth,body:form});};
  assert.equal((await upload('fake')).status,415);assert.equal((await upload(Buffer.alloc(8*1024*1024+1))).status,413);assert.equal((await upload('fake','image/jpeg',true)).status,400);
  const source=await readFile(path.join(paths.uploadsRoot,'pages/deluxeroom/deluxe2.jpg'));
  const uploadedResponse=await upload(source);assert.equal(uploadedResponse.status,201);const uploaded=await uploadedResponse.json();assert.deepEqual(Object.keys(uploaded).sort(),['height','image','mimeType','size','width']);assert.ok(uploaded.image.startsWith('/uploads/pages/deluxeroom/'));assert.deepEqual(await readFile(file),afterRestore);
  const duplicate=await (await upload(source)).json();assert.notEqual(duplicate.image,uploaded.image);
  for (const image of new Set([...roomDetailImages(seed.media),...roomDetailImages(familySeed.media),...roomDetailImages(fantasySeed.media)].map(r=>r.image))) {
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
    for (const [room,namespace,count] of [['handicaproom','HandicapRoom',1]]) {
      const r=await request(`${base}/${locale}${routes[locale][room]}`); assert.equal(r.status,200,room);
      const body=(await r.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
      const messages=JSON.parse(await readFile(path.join(appRoot,`messages/${locale}.json`),'utf8'));
      for (const text of [messages[namespace].title,messages[namespace].RoomFeatures.text,messages[namespace].OtherOptions.title1,messages[namespace].OtherOptions.title2,messages.DeluxeRoom.OtherOptions.title]) assert.ok(body.includes(escapeHtml(text)),`${room}: ${text}`);
      assert.equal([...body.matchAll(/<iframe\b[^>]*src="https:\/\/kuula.co/g)].length,count);
      assert.ok(body.includes('alt="Slide 0"')); // Existing static image fallback remains intact.
    }
  }

  for(const locale of locales){
    const response=await request(`${base}/${locale}${routes[locale].familyroom}`);assert.equal(response.status,200);
    const html=(await response.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
    for(const text of leaves(familySeed.translations[locale]))assert.ok(html.includes(escapeHtml(text)),`Family ${locale}: ${text}`);
    const tags=[...html.matchAll(/<img\b[^>]*>/g)].map(m=>m[0].replace(/%2f/gi,'/')).filter(tag=>tag.includes('/uploads/pages/familyroom/')||tag.includes('/uploads/pages/room-options/'));
    const expected=[...familySeed.media.gallery.images,...familySeed.media.otherOptions.images];assert.equal(tags.length,14);
    expected.forEach((r,i)=>{assert.ok(tags[i].includes(r.image));assert.ok(tags[i].includes(`alt="${escapeHtml(r.translations[locale].alt)}"`));});
    assert.deepEqual([...html.matchAll(/<iframe\b[^>]*src="([^"]+)"[^>]*>/g)].map(m=>m[1]),familySeed.tours.map(tour=>escapeHtml(tour.url)));
    for(const target of ['deluxeroom','fantasyroom'])assert.ok([...html.matchAll(/href="([^"]+)"/g)].some(m=>decodeURIComponent(m[1])===`/${locale}${routes[locale][target]}`));
  }


  for(const locale of locales){
    const response=await request(`${base}/${locale}${routes[locale].fantasyroom}`);assert.equal(response.status,200);
    const html=(await response.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
    for(const text of leaves(fantasySeed.translations[locale]))assert.ok(html.includes(escapeHtml(text)),`Fantasy ${locale}: ${text}`);
    const tags=[...html.matchAll(/<img\b[^>]*>/g)].map(m=>m[0].replace(/%2f/gi,'/')).filter(tag=>tag.includes('/uploads/pages/fantasyroom/')||tag.includes('/uploads/pages/room-options/'));
    const expected=[...fantasySeed.media.gallery.images,...fantasySeed.media.otherOptions.images];assert.equal(tags.length,13);
    expected.forEach((r,i)=>{assert.ok(tags[i].includes(r.image));assert.ok(tags[i].includes(`alt="${escapeHtml(r.translations[locale].alt)}"`));});
    assert.deepEqual([...html.matchAll(/<iframe\b[^>]*src="([^"]+)"[^>]*>/g)].map(m=>m[1]),fantasySeed.tours.map(tour=>escapeHtml(tour.url)));
    for(const target of ['deluxeroom','familyroom'])assert.ok([...html.matchAll(/href="([^"]+)"/g)].some(m=>decodeURIComponent(m[1])===`/${locale}${routes[locale][target]}`));
  }
  async function exerciseFantasyApi(){
  const fantasyEndpoint=`${base}/api/azura/room-details/fantasy/page-content`;
  const fantasyImages=`${base}/api/azura/room-details/fantasy/images`;
  const fantasyGet=async()=>{const r=await requestAuth(fantasyEndpoint);assert.equal(r.status,200);return r.json();};
  const fantasyPut=(body,revision,extra={})=>fetch(fantasyEndpoint,{method:'PUT',headers:{...auth,'Content-Type':'application/json',...(revision===undefined?{}:{'If-Match':revision}),...extra},body:typeof body==='string'?body:JSON.stringify(body)});
  for(const url of [fantasyEndpoint,fantasyImages])for(const method of ['GET',url===fantasyEndpoint?'PUT':'POST']){
    assert.equal((await fetch(url,{method})).status,401);
    assert.equal((await fetch(url,{method,headers:{Authorization:'Bearer wrong-token'}})).status,401);
  }
  const fantasyInitial=await fantasyGet();assert.deepEqual(Object.keys(fantasyInitial).sort(),['bundle','media','revision']);assert.match(fantasyInitial.revision,/^[a-f0-9]{64}$/);
  const fantasyBody={bundle:fantasyInitial.bundle,media:fantasyInitial.media}, fantasyBefore=await readFile(fantasyFile);
  for(const [payload,rev,extra,status] of [[fantasyBody,undefined,{},428],[fantasyBody,'bad',{},400],[fantasyBody,`"${'0'.repeat(64)}"`,{},409],['{',`"${fantasyInitial.revision}"`,{},400],[fantasyBody,`"${fantasyInitial.revision}"`,{'Content-Type':'text/plain'},415],[' '.repeat(128*1024+1),`"${fantasyInitial.revision}"`,{},413],[{...fantasyBody,extra:true},`"${fantasyInitial.revision}"`,{},400]]){
    assert.equal((await fantasyPut(payload,rev,extra)).status,status);assert.deepEqual(await readFile(fantasyFile),fantasyBefore);
  }
  const fantasyMutations=[b=>delete b.bundle.translations.ru,b=>delete b.bundle.translations.tr.BackgroundSection.list1,b=>b.bundle.translations.tr.RoomInfo.features.bad='x',b=>b.media.gallery.images.reverse(),b=>b.bundle.tours[0].id='land',b=>b.media.otherOptions.images.reverse(),b=>b.bundle.tours[0].url='https://evil.example',b=>b.media.hero.width++,b=>b.media.hero.image='/uploads/pages/deluxeroom/deluxe1.jpg',b=>b.media.hero.image='/uploads/pages/room-options/deluxe-preview.jpg',b=>b.media.gallery.images[0].image='/uploads/pages/room-options/deluxe-preview.jpg',b=>b.media.hero.image='/uploads/pages/fantasyroom/../deluxe1.jpg'];
  for(const mutate of fantasyMutations){const bad=structuredClone(fantasyBody);mutate(bad);assert.equal((await fantasyPut(bad,`"${fantasyInitial.revision}"`)).status,400);assert.deepEqual(await readFile(fantasyFile),fantasyBefore);}
  const f1=structuredClone(fantasyBody),f2=structuredClone(fantasyBody);f1.bundle.translations.tr.title='Fantasy parallel A';f2.bundle.translations.tr.title='Fantasy parallel B';
  const deluxeBefore=await readFile(file);const deluxeRevision=(await get()).revision;
  assert.deepEqual((await Promise.all([fantasyPut(f1,`"${fantasyInitial.revision}"`),fantasyPut(f2,`"${fantasyInitial.revision}"`)])).map(r=>r.status).sort(),[200,409]);
  assert.deepEqual(await readFile(file),deluxeBefore);assert.equal((await get()).revision,deluxeRevision);
  const fantasyAfterParallel=await readFile(fantasyFile);assert.equal((await fantasyPut(fantasyBody,`"${fantasyInitial.revision}"`)).status,409);assert.deepEqual(await readFile(fantasyFile),fantasyAfterParallel);
  await symlink(path.join(paths.uploadsRoot,'pages/deluxeroom/deluxe1.jpg'),path.join(paths.uploadsRoot,'pages/fantasyroom/link.jpg'));
  await writeFile(path.join(paths.uploadsRoot,'pages/fantasyroom/fake.jpg'),'fake');
  const fantasyList=await (await requestAuth(fantasyImages)).json();assert.equal(fantasyList.images.length,14);assert.ok(fantasyList.images.every(i=>!i.image.includes('/deluxeroom/')&&i.width&&i.height&&i.modifiedAt));assert.equal(fantasyList.images.filter(i=>i.image.includes('/room-options/')).length,3);
  const fantasyUpload=async(bytes,type='image/jpeg',extra=false)=>{const form=new FormData();form.append('file',new Blob([bytes],{type}),'../../room-options/deluxe-preview.jpg');if(extra)form.append('extra','x');return fetch(fantasyImages,{method:'POST',headers:auth,body:form});};
  assert.equal((await fantasyUpload('fake')).status,415);assert.equal((await fantasyUpload(Buffer.alloc(8*1024*1024+1))).status,413);assert.equal((await fantasyUpload('fake','image/jpeg',true)).status,400);
  const fantasySource=await readFile(path.join(paths.uploadsRoot,'pages/fantasyroom/fantasy2.jpg'));const sharedBefore=await readFile(path.join(paths.uploadsRoot,'pages/room-options/deluxe-preview.jpg'));
  const fu=await fantasyUpload(fantasySource);assert.equal(fu.status,201);const fantasyUploaded=await fu.json();assert.deepEqual(Object.keys(fantasyUploaded).sort(),['height','image','mimeType','size','width']);assert.ok(fantasyUploaded.image.startsWith('/uploads/pages/fantasyroom/'));
  assert.deepEqual(await readFile(fantasyFile),fantasyAfterParallel);assert.deepEqual(await readFile(path.join(paths.uploadsRoot,'pages/room-options/deluxe-preview.jpg')),sharedBefore);
  assert.ok((await (await requestAuth(fantasyImages)).json()).images.some(i=>i.image===fantasyUploaded.image));assert.ok(!(await (await requestAuth(mediaEndpoint)).json()).images.some(i=>i.image===fantasyUploaded.image));
  const fantasyUpdated=structuredClone(fantasySeed);
  for(const locale of locales)fantasyUpdated.translations[locale].title=`Persistent Fantasy Page ${locale}`;
  fantasyUpdated.media.hero={...fantasyUpdated.media.hero,image:fantasyUploaded.image,width:fantasyUploaded.width,height:fantasyUploaded.height};
  // Shared assets may be selected for recommendations, but never hero/gallery.
  fantasyUpdated.media.otherOptions.images[0]={...fantasyUpdated.media.otherOptions.images[1],id:'deluxe',order:0};
  const fantasyCurrent=await fantasyGet();const deluxeCurrent=await get();
  const cross=await Promise.all([fantasyPut({bundle:{translations:fantasyUpdated.translations,tours:fantasyUpdated.tours},media:fantasyUpdated.media},`"${fantasyCurrent.revision}"`),put({bundle:deluxeCurrent.bundle,media:deluxeCurrent.media},`"${deluxeCurrent.revision}"`)]);
  assert.deepEqual(cross.map(r=>r.status),[200,200]);const fantasySaved=await cross[0].json();assert.equal((await get()).revision,deluxeRevision);
  async function fantasyPublished(){for(const locale of locales){const r=await request(`${base}/${locale}${routes[locale].fantasyroom}`);assert.equal(r.status,200);const html=await r.text();assert.ok(html.includes(`Persistent Fantasy Page ${locale}`));assert.ok(html.includes(`background-image:url(${fantasyUploaded.image})`));}assert.equal((await fantasyGet()).revision,fantasySaved.revision);}
  await fantasyPublished();
  return { updated:fantasyUpdated, published:fantasyPublished };
  }
  const {updated:fantasyUpdated,published:fantasyPublished}=await exerciseFantasyApi();
  const familyEndpoint=`${base}/api/azura/room-details/family/page-content`;
  const familyImages=`${base}/api/azura/room-details/family/images`;
  const familyGet=async()=>{const r=await requestAuth(familyEndpoint);assert.equal(r.status,200);return r.json();};
  const familyPut=(body,revision,extra={})=>fetch(familyEndpoint,{method:'PUT',headers:{...auth,'Content-Type':'application/json',...(revision===undefined?{}:{'If-Match':revision}),...extra},body:typeof body==='string'?body:JSON.stringify(body)});
  for(const url of [familyEndpoint,familyImages])for(const method of ['GET',url===familyEndpoint?'PUT':'POST']){
    assert.equal((await fetch(url,{method})).status,401);
    assert.equal((await fetch(url,{method,headers:{Authorization:'Bearer wrong-token'}})).status,401);
  }
  const familyInitial=await familyGet();assert.deepEqual(Object.keys(familyInitial).sort(),['bundle','media','revision']);assert.match(familyInitial.revision,/^[a-f0-9]{64}$/);
  const familyBody={bundle:familyInitial.bundle,media:familyInitial.media}, familyBefore=await readFile(familyFile);
  for(const [payload,rev,extra,status] of [[familyBody,undefined,{},428],[familyBody,'bad',{},400],[familyBody,`"${'0'.repeat(64)}"`,{},409],['{',`"${familyInitial.revision}"`,{},400],[familyBody,`"${familyInitial.revision}"`,{'Content-Type':'text/plain'},415],[' '.repeat(128*1024+1),`"${familyInitial.revision}"`,{},413],[{...familyBody,extra:true},`"${familyInitial.revision}"`,{},400]]){
    assert.equal((await familyPut(payload,rev,extra)).status,status);assert.deepEqual(await readFile(familyFile),familyBefore);
  }
  const familyMutations=[b=>delete b.bundle.translations.ru,b=>delete b.bundle.translations.tr.BackgroundSection.list1,b=>b.bundle.translations.tr.RoomInfo.features.bad='x',b=>b.media.gallery.images.reverse(),b=>b.bundle.tours.reverse(),b=>b.media.otherOptions.images.reverse(),b=>b.bundle.tours[0].url='https://evil.example',b=>b.media.hero.width++,b=>b.media.hero.image='/uploads/pages/deluxeroom/deluxe1.jpg',b=>b.media.hero.image='/uploads/pages/room-options/deluxe-preview.jpg',b=>b.media.gallery.images[0].image='/uploads/pages/room-options/deluxe-preview.jpg',b=>b.media.hero.image='/uploads/pages/familyroom/../deluxe1.jpg'];
  for(const mutate of familyMutations){const bad=structuredClone(familyBody);mutate(bad);assert.equal((await familyPut(bad,`"${familyInitial.revision}"`)).status,400);assert.deepEqual(await readFile(familyFile),familyBefore);}
  const f1=structuredClone(familyBody),f2=structuredClone(familyBody);f1.bundle.translations.tr.title='Family parallel A';f2.bundle.translations.tr.title='Family parallel B';
  const deluxeBefore=await readFile(file);const deluxeRevision=(await get()).revision;
  assert.deepEqual((await Promise.all([familyPut(f1,`"${familyInitial.revision}"`),familyPut(f2,`"${familyInitial.revision}"`)])).map(r=>r.status).sort(),[200,409]);
  assert.deepEqual(await readFile(file),deluxeBefore);assert.equal((await get()).revision,deluxeRevision);
  const familyAfterParallel=await readFile(familyFile);assert.equal((await familyPut(familyBody,`"${familyInitial.revision}"`)).status,409);assert.deepEqual(await readFile(familyFile),familyAfterParallel);
  await symlink(path.join(paths.uploadsRoot,'pages/deluxeroom/deluxe1.jpg'),path.join(paths.uploadsRoot,'pages/familyroom/link.jpg'));
  await writeFile(path.join(paths.uploadsRoot,'pages/familyroom/fake.jpg'),'fake');
  const familyList=await (await requestAuth(familyImages)).json();assert.equal(familyList.images.length,15);assert.ok(familyList.images.every(i=>!i.image.includes('/deluxeroom/')&&i.width&&i.height&&i.modifiedAt));assert.equal(familyList.images.filter(i=>i.image.includes('/room-options/')).length,3);
  const familyUpload=async(bytes,type='image/jpeg',extra=false)=>{const form=new FormData();form.append('file',new Blob([bytes],{type}),'../../room-options/deluxe-preview.jpg');if(extra)form.append('extra','x');return fetch(familyImages,{method:'POST',headers:auth,body:form});};
  assert.equal((await familyUpload('fake')).status,415);assert.equal((await familyUpload(Buffer.alloc(8*1024*1024+1))).status,413);assert.equal((await familyUpload('fake','image/jpeg',true)).status,400);
  const familySource=await readFile(path.join(paths.uploadsRoot,'pages/familyroom/family2.jpg'));const sharedBefore=await readFile(path.join(paths.uploadsRoot,'pages/room-options/deluxe-preview.jpg'));
  const fu=await familyUpload(familySource);assert.equal(fu.status,201);const familyUploaded=await fu.json();assert.deepEqual(Object.keys(familyUploaded).sort(),['height','image','mimeType','size','width']);assert.ok(familyUploaded.image.startsWith('/uploads/pages/familyroom/'));
  assert.deepEqual(await readFile(familyFile),familyAfterParallel);assert.deepEqual(await readFile(path.join(paths.uploadsRoot,'pages/room-options/deluxe-preview.jpg')),sharedBefore);
  assert.ok((await (await requestAuth(familyImages)).json()).images.some(i=>i.image===familyUploaded.image));assert.ok(!(await (await requestAuth(mediaEndpoint)).json()).images.some(i=>i.image===familyUploaded.image));
  const familyUpdated=structuredClone(familySeed);
  for(const locale of locales)familyUpdated.translations[locale].title=`Persistent Family Page ${locale}`;
  familyUpdated.media.hero={...familyUpdated.media.hero,image:familyUploaded.image,width:familyUploaded.width,height:familyUploaded.height};
  // Shared assets may be selected for recommendations, but never hero/gallery.
  familyUpdated.media.otherOptions.images[0]={...familyUpdated.media.otherOptions.images[1],id:'deluxe',order:0};
  const familyCurrent=await familyGet();const deluxeCurrent=await get();
  const cross=await Promise.all([familyPut({bundle:{translations:familyUpdated.translations,tours:familyUpdated.tours},media:familyUpdated.media},`"${familyCurrent.revision}"`),put({bundle:deluxeCurrent.bundle,media:deluxeCurrent.media},`"${deluxeCurrent.revision}"`)]);
  assert.deepEqual(cross.map(r=>r.status),[200,200]);const familySaved=await cross[0].json();assert.equal((await get()).revision,deluxeRevision);
  async function familyPublished(){for(const locale of locales){const r=await request(`${base}/${locale}${routes[locale].familyroom}`);assert.equal(r.status,200);const html=await r.text();assert.ok(html.includes(`Persistent Family Page ${locale}`));assert.ok(html.includes(`background-image:url(${familyUploaded.image})`));}assert.equal((await familyGet()).revision,familySaved.revision);}
  await familyPublished();
  const updated=structuredClone(seed);
  for(const locale of locales){ updated.translations[locale].title=`Persistent Deluxe ${locale}`;updated.translations[locale].OtherOptions.cards.family.title=`Persistent Family ${locale}`; }
  const selected=structuredClone(seed.media.gallery.images[1]); delete selected.id;delete selected.order;
  selected.image=uploaded.image;
  selected.width=uploaded.width;selected.height=uploaded.height;

  updated.media.hero=selected;
  current=await get();const savedResponse=await put({bundle:{translations:updated.translations,tours:updated.tours},media:updated.media},`"${current.revision}"`);assert.equal(savedResponse.status,200);const saved=await savedResponse.json();
  async function published(){for(const locale of locales){const r=await request(`${base}/${locale}${routes[locale].deluxeroom}`);assert.equal(r.status,200);const html=await r.text();assert.ok(html.includes(`Persistent Deluxe ${locale}`));assert.ok(html.includes(`Persistent Family ${locale}`));assert.ok(html.includes(selected.image));}assert.equal((await request(`${base}${selected.image}`)).status,200);}
  await published();await stopServer(child);({child}=await startServer(port,paths));await published();await familyPublished();await fantasyPublished();
  assert.deepEqual(JSON.parse(await readFile(file,'utf8')),{...updated,metadata:{kept:true}});
  assert.equal((await get()).revision,saved.revision);
  assert.deepEqual(JSON.parse(await readFile(familyFile,'utf8')),{...familyUpdated,metadata:{familyOnly:true}});
  assert.deepEqual(JSON.parse(await readFile(fantasyFile,'utf8')),{...fantasyUpdated,metadata:{fantasyOnly:true}});
});
