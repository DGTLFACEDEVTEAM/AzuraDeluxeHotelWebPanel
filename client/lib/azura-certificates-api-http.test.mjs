import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
process.env.CERTIFICATE_FIXTURE_ONLY='1';
const {setup}=await import('./azura-certificates.test.mjs');
const appRoot=path.resolve(import.meta.dirname,'..');
async function startServer(port, paths) {
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "localhost", "-p", String(port)], {
    cwd: appRoot, env: { ...process.env, AZURA_CONTENT_ROOT: paths.contentRoot, AZURA_UPLOADS_ROOT: paths.uploadsRoot, AZURA_PANEL_SERVICE_TOKEN: "certificates-test-token-01234567890123456789" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", chunk => { output += chunk; }); child.stderr.on("data", chunk => { output += chunk; });
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`Next başlatılamadı: ${output}`);
    try { if ((await fetch(`${base}/uploads/pages/certificates/hero.jpg`)).status === 200) return { child, base, output: () => output }; }
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


test('certificates API: exact schema, auth, 200/409, images, four languages and persistence',{timeout:180000},async t=>{
 const paths=await setup(t),port=46000+Math.floor(Math.random()*10000);let {child,base,output}=await startServer(port,paths);t.after(()=>stopServer(child));
 const url='/api/azura/certificates/page-content',images='/api/azura/certificates/images',auth={Authorization:'Bearer certificates-test-token-01234567890123456789'};
 const req=(u,method='GET',body,headers={})=>fetch(base+u,{method,headers:{...auth,...(body===undefined?{}:{'Content-Type':'application/json'}),...headers},...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});
 for(const [u,method] of [[url,'GET'],[url,'PUT'],[images,'GET'],[images,'POST']])assert.equal((await fetch(base+u,{method})).status,401);
 const file=path.join(paths.contentRoot,'site-pages/certificates.json'),stored=JSON.parse(await readFile(file));stored.futureMetadata={keep:true};await writeFile(file,JSON.stringify(stored));
 let current=await (await req(url)).json();assert.match(current.revision,/^[a-f0-9]{64}$/);assert.deepEqual(Object.keys(current).sort(),['bundle','media','revision']);const match=()=>({'If-Match':`"${current.revision}"`}),body=()=>({bundle:current.bundle,media:current.media});const before=await readFile(file);
 assert.equal((await req(url,'PUT',body())).status,428);assert.equal((await req(url,'PUT',body(),{'If-Match':'bad'})).status,400);assert.equal((await req(url,'PUT','{bad',match())).status,400);assert.equal((await req(url,'PUT',body(),{...match(),'Content-Type':'text/plain'})).status,415);assert.equal((await req(url,'PUT','x'.repeat(129*1024),match())).status,413);
 for(const mutate of [x=>delete x.bundle.ru,x=>x.bundle.tr.hero.title='',x=>x.bundle.en.gallery.title='x'.repeat(4001),x=>x.media.hero.translations={},x=>x.media.feature.image='/uploads/pages/bars/fake.png',x=>x.media.feature.width++,x=>x.media.gallery.images.pop(),x=>x.media.gallery.images[0].id='other',x=>x.media.gallery.images[1].order=0,x=>x.extra=true]){const bad=structuredClone(body());mutate(bad);assert.equal((await req(url,'PUT',bad,match())).status,400);}
 assert.deepEqual(await readFile(file),before);
 let list=await (await req(images)).json();assert.equal(list.images.length,7);for(const image of list.images)assert.equal((await fetch(base+image.image)).status,200);
 const bytes=await readFile(path.join(paths.uploadsRoot,'pages/certificates/hero.jpg'));const form=new FormData();form.append('file',new Blob([bytes],{type:'image/jpeg'}),'unsafe-name.jpg');let response=await fetch(base+images,{method:'POST',headers:auth,body:form});assert.equal(response.status,201,output());const upload=await response.json();assert.equal(upload.width,1879);assert.equal(upload.height,1254);assert.ok(upload.image.startsWith('/uploads/pages/certificates/'));assert.equal((await req(url).then(r=>r.json())).revision,current.revision);assert.deepEqual(await readFile(file),before);
 const fake=new FormData();fake.append('file',new Blob(['fake'],{type:'image/png'}),'fake.png');assert.equal((await fetch(base+images,{method:'POST',headers:auth,body:fake})).status,415);
 current.media.feature={...current.media.feature,image:upload.image,width:upload.width,height:upload.height};current.media.gallery.images[0]={...current.media.gallery.images[0],src:upload.image,width:upload.width,height:upload.height};for(const l of ['tr','en','de','ru'])current.bundle[l].feature.title=`API certificate ${l}`;
 const old=current.revision;const race=await Promise.all([req(url,'PUT',body(),match()),req(url,'PUT',body(),match())]);assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);current=await (await req(url)).json();const saved=await readFile(file);assert.equal((await req(url,'PUT',body(),{'If-Match':`"${old}"`})).status,409);assert.deepEqual(await readFile(file),saved);const json=JSON.parse(saved);assert.deepEqual(json.futureMetadata,{keep:true});assert.equal(json.revision,undefined);
 const verify=async()=>{for(const l of ['tr','en','de','ru']){const r=await fetch(`${base}/${l}/certificates`);assert.equal(r.status,200,output());const html=await r.text();assert.ok(html.includes(`API certificate ${l}`));assert.ok(html.includes(encodeURIComponent(upload.image))||html.includes(upload.image));}};await verify();await stopServer(child);({child}=await startServer(port,paths));assert.deepEqual(await (await req(url)).json(),current);await verify();assert.equal((await (await req(images)).json()).images.length,8);
});
