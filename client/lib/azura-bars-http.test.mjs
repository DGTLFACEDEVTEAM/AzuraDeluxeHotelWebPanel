import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { barsImages } from "./azura-bars-storage.mjs";

const appRoot = path.resolve(import.meta.dirname, "..");
const seed = JSON.parse(await readFile(path.join(appRoot, "content/site-pages/bars.json"), "utf8"));
const locales = ["tr", "en", "de", "ru"];
const escapeHtml = value => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#x27;");
const leaves = value => typeof value === "string" ? [value] : Object.values(value).flatMap(leaves);
const visible = html => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");

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
    try { if ((await fetch(`${base}/uploads/pages/bars/hero.jpg`)).status === 200) return { child, base, output: () => output }; }
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

const urls=Object.fromEntries(locales.map(l=>[l,`/${l}/bars`]));
test("bars production: four locales, exact order/URLs, hidden links, live edits/restart and other consumers",{timeout:180000},async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),"azura-bars-http-"));t.after(()=>rm(root,{recursive:true,force:true}));
 const paths={contentRoot:path.join(root,"content"),uploadsRoot:path.join(root,"uploads")};
 await mkdir(path.join(paths.contentRoot,"site-pages"),{recursive:true});
 for(const page of ['bars','restaurants']){await cp(path.join(appRoot,`content/site-pages/${page}.json`),path.join(paths.contentRoot,`site-pages/${page}.json`));await cp(path.join(appRoot,`public/uploads/pages/${page}`),path.join(paths.uploadsRoot,`pages/${page}`),{recursive:true});}
 const port=46000+Math.floor(Math.random()*10000);let {child,base,output}=await startServer(port,paths);t.after(()=>stopServer(child));
 for(const r of barsImages(seed.media)){const res=await fetch(`${base}${r.image}`);assert.equal(res.status,200);assert.deepEqual(Buffer.from(await res.arrayBuffer()),await readFile(path.join(appRoot,'public',r.image)));}
 for(const l of locales){const res=await fetch(`${base}${urls[l]}`);assert.equal(res.status,200,output());assert.equal(new URL(res.url).pathname,urls[l]);const html=visible(await res.text());
  for(const text of leaves(seed.translations[l]))assert.ok(html.includes(escapeHtml(text)),`${l}: ${text}`);
  const m=seed.media;const expected=[m.culinaryInfo.secondary,m.culinaryInfo.primary,...Object.values(m.bars)];const tags=[...html.matchAll(/<img\b[^>]*>/g)].map(m=>m[0].replace(/%2f/gi,'/')).filter(tag=>tag.includes('/uploads/pages/bars/'));assert.equal(tags.length,6);expected.forEach((r,i)=>{assert.ok(tags[i].includes(r.image));assert.ok(tags[i].includes(`alt="${escapeHtml(r.translations[l].alt)}"`));});
  for(const r of [m.hero,m.featureBackgrounds.bars,m.discover])assert.ok(html.includes(`url(${r.image})`));
  // Scope the card markup: navigation/footer may independently contain bar links.
  const normalizedHtml=html.replace(/%2f/gi,"/");const cardStart=normalizedHtml.indexOf(tags[2]);const cardEnd=normalizedHtml.indexOf(`url(${m.discover.image})`,cardStart);assert.ok(cardStart>=0&&cardEnd>cardStart);assert.ok(!normalizedHtml.slice(cardStart,cardEnd).includes('<a '));
  for(const page of ['restaurants','bars/lobby-piano-bar','bars/chacha-pool-bar','bars/pier-bar']){const response=await fetch(`${base}/${l}/${page}`);assert.equal(response.status,200,page);const body=visible(await response.text());assert.ok(body.includes('<img'));}
 }
 const changed=structuredClone(seed);for(const l of locales)changed.translations[l].hero.title=`  Persistent Bars ${l}  `;
 const selected=changed.media.culinaryInfo.primary;selected.image='/uploads/pages/bars/selected.png';await cp(path.join(paths.uploadsRoot,'pages/bars/intro-primary.png'),path.join(paths.uploadsRoot,'pages/bars/selected.png'));
 const file=path.join(paths.contentRoot,'site-pages/bars.json');await writeFile(`${file}.tmp`,JSON.stringify(changed));await rename(`${file}.tmp`,file);
 async function published(){for(const l of locales){const res=await fetch(`${base}${urls[l]}`);assert.equal(res.status,200);const html=visible(await res.text());assert.ok(html.includes(`  Persistent Bars ${l}  `));assert.ok(html.replace(/%2f/gi,'/').includes(selected.image));}assert.equal((await fetch(`${base}${selected.image}`)).status,200);}
 await published();await stopServer(child);({child}=await startServer(port,paths));await published();assert.deepEqual(JSON.parse(await readFile(file)),changed);
});
