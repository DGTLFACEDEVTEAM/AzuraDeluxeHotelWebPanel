import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const appRoot = path.resolve(import.meta.dirname, "..");
const seed = JSON.parse(await readFile(path.join(appRoot, "content/site-pages/homepage.json"), "utf8"));
const contactSeed = JSON.parse(await readFile(path.join(appRoot, "content/shared/contact-details.json"), "utf8"));
const token = "azura-background-local-test-token";
const locales = ["tr", "en", "de", "ru"];

async function startServer(port, paths) {
  const child = spawn(process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-H", "localhost", "-p", String(port)], {
      cwd: appRoot,
      env: { ...process.env, AZURA_CONTENT_ROOT: paths.contentRoot,
        AZURA_UPLOADS_ROOT: paths.uploadsRoot, AZURA_PANEL_SERVICE_TOKEN: token },
      stdio: ["ignore", "pipe", "pipe"],
    });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`Next başlatılamadı: ${output}`);
    try {
      const response = await fetch(`${base}/api/azura/homepage/sections/background`);
      if (response.status === 401) return { child, base };
    } catch { /* server not ready */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  child.kill();
  throw new Error(`Next zamanında hazır olmadı: ${output}`);
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  await new Promise((resolve) => {
    child.once("exit", resolve);
    child.kill();
    setTimeout(() => { child.kill("SIGKILL"); resolve(); }, 3000).unref();
  });
}

test("canlı production background API ve dört dilde güncel yayın", { timeout: 60000 }, async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "azura-background-http-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = { contentRoot: path.join(root, "content"), uploadsRoot: path.join(root, "uploads") };
  await mkdir(path.join(paths.contentRoot, "site-pages"), { recursive: true });
  await mkdir(path.join(paths.contentRoot, "shared"), { recursive: true });
  await mkdir(path.join(paths.uploadsRoot, "pages/homepage"), { recursive: true });
  const jsonFile = path.join(paths.contentRoot, "site-pages/homepage.json");
  await writeFile(jsonFile, JSON.stringify(seed));
  await writeFile(path.join(paths.contentRoot, "shared/contact-details.json"), JSON.stringify(contactSeed));
  const source = path.join(appRoot, "public/uploads/pages/homepage");
  for (const name of await readdir(source)) {
    await copyFile(path.join(source, name), path.join(paths.uploadsRoot, "pages/homepage", name));
  }
  const port = 46000 + Math.floor(Math.random() * 10000);
  const { child, base } = await startServer(port, paths);
  t.after(() => stopServer(child));
  const url = `${base}/api/azura/homepage/sections/background`;
  const auth = { Authorization: `Bearer ${token}` };
  assert.equal((await fetch(url)).status, 401);
  assert.equal((await fetch(url, { headers: { Authorization: "Bearer wrong" } })).status, 401);
  const initialResponse = await fetch(url, { headers: auth });
  assert.equal(initialResponse.status, 200);
  const initial = await initialResponse.json();
  assert.deepEqual(initial.section, seed.sections.background);
  assert.match(initial.revision, /^[a-f0-9]{64}$/);
  assert.equal((await fetch(`${base}${initial.section.image}`)).status, 200);
  const listed = await fetch(`${base}/api/azura/homepage/images`, { headers: auth });
  assert.equal(listed.status, 200);
  assert.ok(JSON.stringify(await listed.json()).includes(initial.section.image));
  const escapeHtml = value => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;");
  for (const locale of locales) {
    const response = await fetch(`${base}/${locale}/connect`);
    assert.equal(response.status, 200, `${locale} connect başlangıç`);
    const html = (await response.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
    for (const value of Object.values(initial.section.translations[locale])) assert.ok(html.includes(escapeHtml(value)));
    assert.ok(html.includes(initial.section.image));
  }
  const put = (section, ifMatch, extra = {}) => fetch(url, {
    method: "PUT", headers: { ...auth, "Content-Type": "application/json", ...(ifMatch ? { "If-Match": ifMatch } : {}) },
    body: JSON.stringify({ section, ...extra }),
  });
  assert.equal((await put(initial.section)).status, 428);
  assert.equal((await put(initial.section, "unquoted")).status, 400);
  assert.equal((await put(initial.section, `"${initial.revision}"`, { other: true })).status, 400);
  assert.equal((await fetch(url, {
    method: "PUT", headers: { ...auth, "Content-Type": "application/json", "If-Match": `"${initial.revision}"` },
    body: "{invalid",
  })).status, 400);
  const invalid = structuredClone(initial.section);
  invalid.image = "/uploads/pages/homepage/missing.png";
  assert.equal((await put(invalid, `"${initial.revision}"`)).status, 400);
  const before = await readFile(jsonFile);
  assert.equal((await put(initial.section, '"' + "0".repeat(64) + '"')).status, 409);
  assert.deepEqual(await readFile(jsonFile), before);

  const form = new FormData();
  form.set("file", new File([await readFile(path.join(source, "background-green-and-blue.png"))],
    "background.png", { type: "image/png" }));
  const upload = await fetch(`${base}/api/azura/homepage/images`, { method: "POST", headers: auth, body: form });
  assert.equal(upload.status, 201);
  const uploadedImage = (await upload.json()).image;
  assert.match(uploadedImage, /^\/uploads\/pages\/homepage\/.+\.png$/);

  const changed = structuredClone(initial.section);
  changed.image = uploadedImage;
  for (const locale of locales) changed.translations[locale].title = `Azura ${locale} nature marker`;
  const saved = await put(changed, `"${initial.revision}"`);
  assert.equal(saved.status, 200);
  const result = await saved.json();
  assert.deepEqual(result.section, changed);
  assert.notEqual(result.revision, initial.revision);
  const current = JSON.parse(await readFile(jsonFile));
  assert.deepEqual(current.sections.background, changed);
  assert.deepEqual(current.sections.accommodation, seed.sections.accommodation);
  for (const locale of locales) {
    for (const suffix of ["", "/connect"]) {
    const page = await fetch(`${base}/${locale}${suffix}`);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.ok(html.includes(`Azura ${locale} nature marker`), `${locale} anasayfasında yeni başlık yok`);
    assert.ok(html.includes(uploadedImage), `${locale} anasayfasında yeni arka plan yok`);
    }
  }
  assert.equal((await fetch(`${base}${uploadedImage}`)).status, 200);
});
