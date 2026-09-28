import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import {blogFixture} from './azura-blog-test-fixtures.mjs';
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
    try { if ((await fetch(`${base}/uploads/blog/test.png`)).status === 200) return { child, base, output: () => output }; }
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


test('blog management production lifecycle, auth, 200/409, media, publication and restart',{timeout:180000},async t=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'blog-api-http-'));t.after(()=>rm(dir,{recursive:true,force:true}));const paths={contentRoot:path.join(dir,'content'),uploadsRoot:path.join(dir,'uploads')};await mkdir(path.join(paths.contentRoot,'blog/posts'),{recursive:true});await mkdir(path.join(paths.uploadsRoot,'blog'),{recursive:true});
 const bytes=await sharp({create:{width:80,height:60,channels:3,background:'blue'}}).png().toBuffer();await writeFile(path.join(paths.uploadsRoot,'blog/test.png'),bytes);
 const port=46000+Math.floor(Math.random()*10000);let {child,base}=await startServer(port,paths);t.after(()=>stopServer(child));
 const auth={Authorization:'Bearer blog-test-token-01234567890123456789'};
 const request=(url,method='GET',body,headers={})=>fetch(base+url,{method,headers:{...auth,...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},...(body!==undefined?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
 const collection='/api/azura/blog/posts',single=collection+'/example',images='/api/azura/blog/images';
 for(const [url,method] of [[collection,'GET'],[collection,'POST'],[single,'GET'],[single,'PUT'],[single,'DELETE'],[images,'GET'],[images,'POST']])assert.equal((await fetch(base+url,{method})).status,401);
 assert.deepEqual(await (await request(collection)).json(),{posts:[]});assert.equal((await request(single)).status,404);
 const post=blogFixture().published;const draft={coverImage:post.coverImage,publishedAt:post.publishedAt,translations:post.translations,contentBlocks:post.contentBlocks};
 const created=await request(collection,'POST',{slug:'example',draft});assert.equal(created.status,201,await created.clone().text());let current=await created.json();assert.match(current.revision,/^[a-f0-9]{64}$/);assert.equal(current.record.published,null);assert.equal((await request(collection,'POST',{slug:'example',draft})).status,409);
 const file=path.join(paths.contentRoot,'blog/posts/example.json');
 const put=(body,headers={})=>request(single,'PUT',body,{'If-Match':`"${current.revision}"`,...headers});
 for(const [body,headers,status] of [[{action:'publish'},{'If-Match':'bad'},400],[{action:'publish'},{'Content-Type':'text/plain'},415],[{action:'save'}, {},400],[{action:'publish',extra:true},{},400],['{',{},400],[' '.repeat(131073),{},413],[{action:'publish'},{'If-Match':`"${'0'.repeat(64)}"`},409]]){const before=await readFile(file);assert.equal((await put(body,headers)).status,status);assert.deepEqual(await readFile(file),before);}
 assert.equal((await request(single,'PUT',{action:'publish'})).status,428);assert.equal((await request(single,'DELETE')).status,428);
 assert.equal((await fetch(base+'/en/news/example')).status,404);
 const publish=await put({action:'publish'});assert.equal(publish.status,200);current=await publish.json();
 const changed=structuredClone(draft);for(const l of ['tr','en','de','ru'])changed.translations[l].title=`Changed ${l}`;
 current=await (await put({action:'save',draft:changed})).json();for(const l of ['tr','en','de','ru']){const html=await (await fetch(`${base}/${l}/news/example`)).text();assert.ok(html.includes(`Public ${l}`));assert.ok(!html.includes(`Changed ${l}`));}
 const pair=await Promise.all([put({action:'publish'}),put({action:'publish'})]);assert.deepEqual(pair.map(r=>r.status).sort(),[200,409]);current=await (await request(single)).json();
 const form=new FormData();form.set('file',new Blob([bytes],{type:'image/png'}),'user.png');const before=await readFile(file);const uploaded=await fetch(base+images,{method:'POST',headers:auth,body:form});assert.equal(uploaded.status,201);const media=await uploaded.json();assert.ok(media.image.startsWith('/uploads/blog/blog-'));assert.deepEqual(await readFile(file),before);assert.equal((await (await request(images)).json()).images.length,2);assert.deepEqual(Buffer.from(await (await fetch(base+media.image)).arrayBuffer()),bytes);
 changed.coverImage=media.image;current=await (await put({action:'save',draft:changed})).json();current=await (await put({action:'publish'})).json();
 const verify=async()=>{for(const l of ['tr','en','de','ru']){const r=await fetch(`${base}/${l}/news/example`);assert.equal(r.status,200);const html=await r.text();assert.ok(html.includes(`Changed ${l}`));assert.ok(html.includes(media.image));}};
 await verify();const revision=current.revision;await stopServer(child);({child}=await startServer(port,paths));await verify();current=await (await request(single)).json();assert.equal(current.revision,revision);
 current=await (await put({action:'unpublish'})).json();assert.equal(current.record.published,null);assert.equal((await fetch(base+'/en/news/example')).status,404);
 const deleted=await request(single,'DELETE',undefined,{'If-Match':`"${current.revision}"`});assert.equal(deleted.status,200);assert.deepEqual(await deleted.json(),{deleted:true,slug:'example'});assert.equal((await request(single)).status,404);assert.equal((await fetch(base+media.image)).status,200);
});
