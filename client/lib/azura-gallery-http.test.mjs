import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {cp,mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
const appRoot=path.resolve(import.meta.dirname,'..');
const seed=JSON.parse(await readFile(path.join(appRoot,'content/gallery/gallery.json')));
async function startServer(port, paths) {
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "localhost", "-p", String(port)], {
    cwd: appRoot, env: { ...process.env, AZURA_CONTENT_ROOT: paths.contentRoot, AZURA_UPLOADS_ROOT: paths.uploadsRoot },
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


test('gallery production: locales, all URLs, live content and restart',{timeout:300000},async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'gallery-http-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const paths={contentRoot:path.join(root,'content'),uploadsRoot:path.join(root,'uploads')};
 await cp(path.join(appRoot,'content/gallery'),path.join(paths.contentRoot,'gallery'),{recursive:true});
 await cp(path.join(appRoot,'public/uploads/gallery'),path.join(paths.uploadsRoot,'gallery'),{recursive:true});
 const port=46000+Math.floor(Math.random()*10000);let {child,base,output}=await startServer(port,paths);t.after(()=>stopServer(child));
 for(const src of new Set(seed.categories.flatMap(c=>c.images.map(i=>i.src)))){const r=await fetch(base+src);assert.equal(r.status,200,src);assert.deepEqual(Buffer.from(await r.arrayBuffer()),await readFile(path.join(appRoot,'public',src)));}
 const check=async(changed=false)=>{for(const locale of ['tr','en','de','ru']){const r=await fetch(`${base}/${locale}/gallery`);assert.equal(r.status,200,output());const html=(await r.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');const labels=JSON.parse(await readFile(path.join(appRoot,`messages/${locale}.json`))).Gallery;for(const c of seed.categories)assert.ok(html.includes(labels[c.id].replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#x27;')),locale+': '+c.id);assert.ok(html.includes(changed?`Persistent ${locale}`:'alt="gallery"'));const images=[...html.matchAll(/<img\b[^>]*>/g)].filter(m=>m[0].includes('uploads%2Fgallery')||m[0].includes('uploads/gallery'));assert.equal(images.length,28);}};
 await check();const changed=structuredClone(seed);for(const l of ['tr','en','de','ru'])changed.categories[0].images[0].translations[l].alt=`Persistent ${l}`;
 const file=path.join(paths.contentRoot,'gallery/gallery.json');await writeFile(file,JSON.stringify(changed));await check(true);await stopServer(child);({child}=await startServer(port,paths));await check(true);assert.deepEqual(JSON.parse(await readFile(file)),changed);
});
