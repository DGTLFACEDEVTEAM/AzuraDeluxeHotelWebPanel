import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {cp,mkdir,mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
const appRoot=path.resolve(import.meta.dirname,'..');
const seed=JSON.parse(await readFile(path.join(appRoot,'content/gallery/gallery.json')));
async function startServer(port, paths) {
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "localhost", "-p", String(port)], {
    cwd: appRoot, env: { ...process.env, AZURA_CONTENT_ROOT: paths.contentRoot, AZURA_UPLOADS_ROOT: paths.uploadsRoot, AZURA_PANEL_SERVICE_TOKEN: "gallery-test-token-01234567890123456789" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", chunk => { output += chunk; }); child.stderr.on("data", chunk => { output += chunk; });
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`Next başlatılamadı: ${output}`);
    try { if ((await fetch(`${base}/uploads/gallery/image-4-88ff1f7447c4.jpg`)).status === 200) return { child, base, output: () => output }; }
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


test('gallery HTTP authorization, actions, media, 200/409, publication and restart',{timeout:180000},async t=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'gallery-api-http-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const paths={contentRoot:path.join(dir,'content'),uploadsRoot:path.join(dir,'uploads')};await mkdir(path.join(paths.contentRoot,'gallery'),{recursive:true});await mkdir(path.join(paths.uploadsRoot,'gallery'),{recursive:true});
 const initial=structuredClone(seed);initial.categories.forEach(c=>c.images=[]);initial.metadata={owner:'preserve'};const file=path.join(paths.contentRoot,'gallery/gallery.json');await writeFile(file,JSON.stringify(initial));
 const original=seed.categories[0].images[0];await cp(path.join(appRoot,'public',original.src),path.join(paths.uploadsRoot,original.src.slice('/uploads/'.length)));
 const port=46000+Math.floor(Math.random()*10000);let {child,base}=await startServer(port,paths);t.after(()=>stopServer(child));
 const auth={Authorization:'Bearer gallery-test-token-01234567890123456789'};
 const get=async()=>{const r=await fetch(base+'/api/azura/gallery',{headers:auth});assert.equal(r.status,200);const data=await r.json();assert.deepEqual(Object.keys(data).sort(),['gallery','revision']);assert.match(data.revision,/^[a-f0-9]{64}$/);return data;};
 let current=await get();assert.deepEqual(current.gallery,initial);
 const patch=(body,headers={})=>fetch(base+'/api/azura/gallery',{method:'PATCH',headers:{...auth,'Content-Type':'application/json','If-Match':`"${current.revision}"`,...headers},body:typeof body==='string'?body:JSON.stringify(body)});
 const apply=async body=>{const r=await patch(body);assert.equal(r.status,200,await r.clone().text());current=await r.json();return current;};
 for(const [endpoint,method] of [['','GET'],['','PATCH'],['/images','GET'],['/images','POST']])assert.equal((await fetch(base+'/api/azura/gallery'+endpoint,{method})).status,401);
 const invalid=[
  [{action:'bad'}, {},400],['{',{},400],
  [{action:'remove',categoryId:'general',imageId:'absent'}, {},404],
  [{action:'remove',categoryId:'missing',imageId:'absent'}, {},404],
  [{action:'reorder',categoryId:'general',imageIds:[]}, {'If-Match':''},428],
  [{action:'reorder',categoryId:'general',imageIds:[]}, {'If-Match':'bad'},400],
  [{action:'reorder',categoryId:'general',imageIds:[]}, {'Content-Type':'text/plain'},415],
  [{action:'add',categoryId:'general',src:original.src,translations:{tr:{alt:'x'}}}, {},400],
  [{action:'add',categoryId:'general',src:original.src,translations:original.translations,extra:1},{},400],
  [' '.repeat(128*1024+1),{},413],
 ];
 // Missing (not merely empty) If-Match.
 assert.equal((await fetch(base+'/api/azura/gallery',{method:'PATCH',headers:{...auth,'Content-Type':'application/json'},body:'{}'})).status,428);
 for(const [body,headers,status] of invalid){const before=await readFile(file);assert.equal((await patch(body,headers)).status,status,JSON.stringify(body).slice(0,100));assert.deepEqual(await readFile(file),before);}
 const png=await sharp({create:{width:40,height:30,channels:3,background:'red'}}).png().toBuffer();
 const upload=async(bytes=png,type='image/png')=>{const form=new FormData();form.set('file',new Blob([bytes],{type}),'client-name.png');return fetch(base+'/api/azura/gallery/images',{method:'POST',headers:auth,body:form});};
 assert.equal((await upload(Buffer.from('<svg/>'),'image/svg+xml')).status,415);
 const beforeUpload=await readFile(file),response=await upload();assert.equal(response.status,201);const media=await response.json();assert.deepEqual(Object.keys(media).sort(),['height','image','mimeType','size','width']);assert.equal(media.width,40);assert.ok(media.image.startsWith('/uploads/gallery/gallery-'));assert.deepEqual(await readFile(file),beforeUpload);
 const listing=await fetch(base+'/api/azura/gallery/images',{headers:auth});assert.equal(listing.status,200);const listed=(await listing.json()).images;assert.equal(listed.length,2);assert.ok(listed.some(r=>r.image===media.image&&r.modifiedAt));assert.deepEqual(Buffer.from(await (await fetch(base+media.image)).arrayBuffer()),png);
 const translations=Object.fromEntries(['tr','en','de','ru'].map(l=>[l,{alt:`Gallery ${l}`} ]));
 await apply({action:'add',categoryId:'general',src:media.image,translations});let record=current.gallery.categories[0].images[0];const firstId=record.id;
 const saved=await readFile(file);assert.equal((await patch({action:'add',categoryId:'general',src:media.image,translations})).status,409);assert.deepEqual(await readFile(file),saved);
 await apply({action:'add',categoryId:'meeting',src:media.image,translations});const meetingId=current.gallery.categories[8].images[0].id;
 await apply({action:'add',categoryId:'general',src:original.src,translations});const secondId=current.gallery.categories[0].images[1].id;
 for(const imageIds of [[firstId],[firstId,firstId],[firstId,meetingId],[firstId,secondId,'extra']])assert.equal((await patch({action:'reorder',categoryId:'general',imageIds})).status,400);
 await apply({action:'reorder',categoryId:'general',imageIds:[secondId,firstId]});assert.equal(current.gallery.categories[0].images[1].id,firstId);
 const oldRevision=current.revision;const updated=Object.fromEntries(['tr','en','de','ru'].map(l=>[l,{alt:`Persistent ${l}`} ]));await apply({action:'update',categoryId:'general',imageId:firstId,translations:updated});
 const latestBytes=await readFile(file);assert.equal((await patch({action:'remove',categoryId:'general',imageId:firstId},{'If-Match':`"${oldRevision}"`})).status,409);assert.deepEqual(await readFile(file),latestBytes);
 const parallel=await Promise.all([patch({action:'remove',categoryId:'meeting',imageId:meetingId}),patch({action:'remove',categoryId:'meeting',imageId:meetingId})]);assert.deepEqual(parallel.map(r=>r.status).sort(),[200,409]);current=await get();assert.equal(current.gallery.categories[8].images.length,0);assert.ok(current.gallery.categories[0].images.some(r=>r.id===firstId));assert.equal((await fetch(base+media.image)).status,200);
 const verify=async()=>{for(const l of ['tr','en','de','ru']){const r=await fetch(`${base}/${l}/gallery`);assert.equal(r.status,200);const html=(await r.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');assert.ok(html.includes(`alt="Persistent ${l}"`));assert.ok(html.replaceAll('%2F','/').includes(media.image));}};
 await verify();const revision=current.revision;await stopServer(child);({child}=await startServer(port,paths));await verify();current=await get();assert.equal(current.revision,revision);assert.deepEqual(current.gallery.metadata,{owner:'preserve'});assert.equal(Object.hasOwn(current.gallery,'revision'),false);
});
