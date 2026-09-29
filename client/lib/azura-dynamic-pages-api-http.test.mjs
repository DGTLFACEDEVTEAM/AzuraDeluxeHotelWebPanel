import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile,access} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
process.env.DYNAMIC_FIXTURE_ONLY='1';
const {fixture,setup}=await import('./azura-dynamic-pages.test.mjs');
const appRoot=path.resolve(import.meta.dirname,'..');
async function startServer(port, paths) {
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "localhost", "-p", String(port)], {
    cwd: appRoot, env: { ...process.env, AZURA_CONTENT_ROOT: paths.contentRoot, AZURA_UPLOADS_ROOT: paths.uploadsRoot, AZURA_PANEL_SERVICE_TOKEN: "blog-test-token-01234567890123456789" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", chunk => { output += chunk; }); child.stderr.on("data", chunk => { output += chunk; });
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`Next başlatılamadı: ${output}`);
    try { if ((await fetch(`${base}/uploads/dynamic-pages/test.png`)).status === 200) return { child, base, output: () => output }; }
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


test('pages management production: authorization, lifecycle, history, media, four slugs and restart',{timeout:180000},async t=>{
 const paths=await setup(t),port=46000+Math.floor(Math.random()*10000);let {child,base,output}=await startServer(port,paths);t.after(()=>stopServer(child));
 const auth={Authorization:'Bearer blog-test-token-01234567890123456789'},collection='/api/azura/pages',images=collection+'/images';
 const req=(url,method='GET',body,headers={})=>fetch(base+url,{method,headers:{...auth,...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},...(body!==undefined?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
 const {id:_id,status:_status,createdAt:_createdAt,updatedAt:_updatedAt,...draft}=fixture().draft;
 const absent='22222222-2222-4222-8222-222222222222';
 for(const [url,method] of [[collection,'GET'],[collection,'POST'],[`${collection}/${absent}`,'GET'],[`${collection}/${absent}`,'PUT'],[`${collection}/${absent}`,'DELETE'],[`${collection}/${absent}/history`,'GET'],[`${collection}/${absent}/history/${absent}/restore`,'POST'],[images,'GET'],[images,'POST']])assert.equal((await fetch(base+url,{method})).status,401);
 assert.deepEqual(await (await req(collection)).json(),{pages:[]});assert.equal((await req(`${collection}/${absent}`)).status,404);
 assert.equal((await req(collection,'POST','{bad')).status,400);assert.equal((await req(collection,'POST',{}, {'Content-Type':'text/plain'})).status,415);assert.equal((await req(collection,'POST','x'.repeat(129*1024))).status,413);
 let res=await req(collection,'POST',{draft});assert.equal(res.status,201,output());assert.equal(res.headers.get('cache-control'),'no-store');let current=await res.json();const id=current.record.id,single=collection+'/'+id,file=path.join(paths.contentRoot,'pages',id+'.json');assert.match(current.revision,/^[a-f0-9]{64}$/);assert.equal(current.record.published,null);
 const verifyMenu=async(record,visible)=>{for(const l of ['tr','en','de','ru']){
  const response=await fetch(`${base}/${l}/news`);assert.equal(response.status,200,output());const html=(await response.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
  const links=html.match(new RegExp(`<a\\b[^>]*data-dynamic-page-id="${record.id}"[^>]*>[\\s\\S]*?</a>`,'g'))||[];
  assert.equal(links.length,visible?2:0,`both headers ${l}`);
  if(visible)for(const link of links){assert.ok(link.includes(`href="/${l}/${encodeURIComponent(record.published.slugs[l])}"`));assert.ok(!link.includes(`/${l}/${l}/`));assert.ok(link.includes(record.published.navigation.translations[l].label||record.published.hero.translations[l].title));}
 }};
 await verifyMenu(current.record,false);
 assert.equal((await fetch(base+'/en/example')).status,404);const initial=await readFile(file);
 assert.equal((await req(single,'PUT',{action:'publish'})).status,428);assert.equal((await req(single,'PUT',{action:'publish'},{'If-Match':'bad'})).status,400);
 const match=()=>({'If-Match':`"${current.revision}"`});
 for(const bad of [{action:'save',draft:{...draft,id}},{action:'publish',published:{}},{action:'delete'},{action:'restore',versionId:absent}])assert.equal((await req(single,'PUT',bad,match())).status,400);
 assert.deepEqual(await readFile(file),initial);
 const race=await Promise.all([req(single,'PUT',{action:'publish'},match()),req(single,'PUT',{action:'publish'},match())]);assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);current=await (await req(single)).json();
 const verify=async(record)=>{for(const l of ['tr','en','de','ru']){const response=await fetch(`${base}/${l}/${encodeURIComponent(record.published.slugs[l])}`);assert.equal(response.status,200,output());const html=await response.text();assert.ok(html.includes(record.published.hero.translations[l].title));assert.ok(html.includes(record.published.seo[l].title));}};
 await verify(current.record);await verifyMenu(current.record,true);const published=structuredClone(current.record.published);
 for(const l of ['tr','en','de','ru']){draft.slugs[l]+='-changed';draft.hero.translations[l].title=`Changed live ${l}`;draft.seo[l].title=`SEO changed ${l}`;draft.navigation.translations[l].label=`Menu changed ${l}`;}
 const old=current.revision;current=await (await req(single,'PUT',{action:'save',draft},match())).json();assert.deepEqual(current.record.published,published);await verify(current.record);await verifyMenu(current.record,true);
 const versionId=current.record.history[0].versionId;const history=await (await req(single+'/history')).json();assert.deepEqual(history,current);
 for(const [url,method] of [[single,'DELETE'],[single+'/history/'+versionId+'/restore','POST']])assert.equal((await req(url,method,undefined,{'If-Match':`"${old}"`})).status,409);
 assert.equal((await req(single+'/history/'+absent+'/restore','POST',undefined,match())).status,404);
 current=await (await req(single+'/history/'+versionId+'/restore','POST',undefined,match())).json();assert.deepEqual(current.record.published,published);assert.equal(current.record.draft.slugs.en,'example');assert.equal(current.record.history[0].draft.slugs.en,'example-changed');
 const bytes=await readFile(path.join(paths.uploadsRoot,'dynamic-pages/test.png'));const form=new FormData();form.append('file',new Blob([bytes],{type:'image/png'}),'original.png');res=await fetch(base+images,{method:'POST',headers:auth,body:form});assert.equal(res.status,201);const upload=await res.json();assert.match(upload.image,/^\/uploads\/dynamic-pages\//);assert.equal(upload.width,80);assert.equal((await fetch(base+upload.image)).status,200);assert.equal((await (await req(images)).json()).images.length,2);
 assert.equal((await (await req(single)).json()).revision,current.revision);
 draft.hero.image=upload.image;current=await (await req(single,'PUT',{action:'save',draft},match())).json();current=await (await req(single,'PUT',{action:'publish'},match())).json();await verify(current.record);await verifyMenu(current.record,true);for(const l of ['tr','en','de','ru'])assert.equal((await fetch(`${base}/${l}/${encodeURIComponent(published.slugs[l])}`)).status,404);
 await stopServer(child);({child}=await startServer(port,paths));assert.deepEqual(await (await req(single)).json(),current);await verify(current.record);await verifyMenu(current.record,true);
 draft.navigation.visible=false;current=await (await req(single,'PUT',{action:'save',draft},match())).json();await verifyMenu(current.record,true);current=await (await req(single,'PUT',{action:'publish'},match())).json();await verifyMenu(current.record,false);await verify(current.record);
 current=await (await req(single,'PUT',{action:'unpublish'},match())).json();await verifyMenu(current.record,false);for(const l of ['tr','en','de','ru'])assert.equal((await fetch(`${base}/${l}/${encodeURIComponent(draft.slugs[l])}`)).status,404);
 res=await req(single,'DELETE',undefined,match());assert.equal(res.status,200);await verifyMenu(current.record,false);assert.equal((await req(single)).status,404);assert.equal((await fetch(base+upload.image)).status,200);await access(path.join(paths.uploadsRoot,'dynamic-pages/test.png'));
});
