import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { entertainmentImages } from "./azura-entertainment-storage.mjs";

const appRoot = path.resolve(import.meta.dirname, "..");
const seed = JSON.parse(await readFile(path.join(appRoot, "content/site-pages/entertainment.json"), "utf8"));
const locales = ["tr", "en", "de", "ru"];
const escapeHtml = value => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#x27;");
const leaves = value => typeof value === "string" ? [value] : Object.values(value).flatMap(leaves);
const visible = html => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");

async function startServer(port, paths) {
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "localhost", "-p", String(port)], {
    cwd: appRoot, env: { ...process.env, AZURA_PANEL_SERVICE_TOKEN: "entertainment-isolated-test-token", AZURA_CONTENT_ROOT: paths.contentRoot, AZURA_UPLOADS_ROOT: paths.uploadsRoot },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", chunk => { output += chunk; }); child.stderr.on("data", chunk => { output += chunk; });
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`Next başlatılamadı: ${output}`);
    try { if ((await fetch(`${base}/uploads/pages/entertainment/ent_ban.jpg`)).status === 200) return { child, base, output: () => output }; }
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

const urls=Object.fromEntries(locales.map(l=>[l,`/${l}/entertainment`]));
test("entertainment production: user text, image order/URLs, desktop links, live edits and restart",{timeout:180000},async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'azura-entertainment-http-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const paths={contentRoot:path.join(root,'content'),uploadsRoot:path.join(root,'uploads')};
 await mkdir(path.join(paths.contentRoot,'site-pages'),{recursive:true});
 for(const page of ['entertainment','bars','kidsclub']){await cp(path.join(appRoot,`content/site-pages/${page}.json`),path.join(paths.contentRoot,`site-pages/${page}.json`));await cp(path.join(appRoot,`public/uploads/pages/${page}`),path.join(paths.uploadsRoot,`pages/${page}`),{recursive:true});}
 const port=46000+Math.floor(Math.random()*10000);let {child,base,output}=await startServer(port,paths);t.after(()=>stopServer(child));
 for(const r of entertainmentImages(seed.media)){const res=await fetch(`${base}${r.image}`);assert.equal(res.status,200);assert.deepEqual(Buffer.from(await res.arrayBuffer()),await readFile(path.join(appRoot,'public',r.image)));}
 for(const l of locales){const res=await fetch(`${base}${urls[l]}`);assert.equal(res.status,200,output());assert.equal(new URL(res.url).pathname,urls[l]);const html=visible(await res.text());
  for(const text of leaves(seed.translations[l]))assert.ok(html.includes(escapeHtml(text)),`${l}: ${text}`);
  const m=seed.media;const expected=[...m.activities,...m.gridSection,...m.gridSection];const tags=[...html.matchAll(/<img\b[^>]*>/g)].map(m=>m[0].replace(/%2f/gi,'/')).filter(tag=>tag.includes('/uploads/pages/entertainment/'));assert.equal(tags.length,20);expected.forEach((r,i)=>{assert.ok(tags[i].includes(r.image));assert.ok(tags[i].includes(`alt="${escapeHtml(r.translations[l].alt)}"`));});assert.ok(html.includes(`url(${m.hero.image})`));
  const links=[...html.matchAll(/<a class="absolute inset-0" href="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(links,['/spor','/kidsclub','/beachpools','/beachpools','/spor','/beachpools','/spor','/entertainment','/spor']);
  for(const page of ['bars','kidsclub'])assert.equal((await fetch(`${base}/${l}/${page}`)).status,200);
 }
 for(const p of ['page-content','images'])assert.equal((await fetch(`${base}/api/azura/entertainment/${p}`)).status,401);
 const changed=structuredClone(seed);for(const l of locales)changed.translations[l].activities.title=`  Persistent Entertainment ${l}  `;
 const selected=changed.media.gridSection[0];selected.image='/uploads/pages/entertainment/selected.jpg';await cp(path.join(paths.uploadsRoot,'pages/entertainment/sport-fitness.jpg'),path.join(paths.uploadsRoot,'pages/entertainment/selected.jpg'));
 const file=path.join(paths.contentRoot,'site-pages/entertainment.json');await writeFile(`${file}.tmp`,JSON.stringify(changed));await rename(`${file}.tmp`,file);
 async function published(){for(const l of locales){const res=await fetch(`${base}${urls[l]}`);assert.equal(res.status,200);const html=visible(await res.text());assert.ok(html.includes(`  Persistent Entertainment ${l}  `));assert.ok(html.replace(/%2f/gi,'/').includes(selected.image));}assert.equal((await fetch(`${base}${selected.image}`)).status,200);}
 await published();await stopServer(child);({child}=await startServer(port,paths));await published();assert.deepEqual(JSON.parse(await readFile(file)),changed);
});
