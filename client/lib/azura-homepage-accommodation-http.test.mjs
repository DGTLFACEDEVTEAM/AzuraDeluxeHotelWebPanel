import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const appRoot = path.resolve(import.meta.dirname, "..");
const seed = JSON.parse(await readFile(path.join(appRoot, "content/site-pages/homepage.json"), "utf8"));
const token = "azura-accommodation-local-test-token";
const locales = ["tr", "en", "de", "ru"];

async function startServer(port, paths) {
  const child = spawn(process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)], {
      cwd: appRoot,
      env: { ...process.env, AZURA_CONTENT_ROOT: paths.contentRoot,
        AZURA_UPLOADS_ROOT: paths.uploadsRoot, AZURA_PANEL_SERVICE_TOKEN: token },
      stdio: ["ignore", "pipe", "pipe"],
    });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`Next başlatılamadı: ${output}`);
    try {
      const response = await fetch(`${base}/api/azura/homepage/sections/accommodation`);
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

test("canlı production API: yetki, şema, revision, medya listesi ve dört dilde yayın", { timeout: 60000 }, async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "azura-accommodation-http-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = { contentRoot: path.join(root, "content"), uploadsRoot: path.join(root, "uploads") };
  await mkdir(path.join(paths.contentRoot, "site-pages"), { recursive: true });
  await mkdir(path.join(paths.uploadsRoot, "pages/homepage"), { recursive: true });
  const jsonFile = path.join(paths.contentRoot, "site-pages/homepage.json");
  await writeFile(jsonFile, JSON.stringify(seed));
  const source = path.join(appRoot, "public/uploads/pages/homepage");
  for (const name of await readdir(source)) {
    await copyFile(path.join(source, name), path.join(paths.uploadsRoot, "pages/homepage", name));
  }
  const port = 46000 + Math.floor(Math.random() * 10000);
  const { child, base } = await startServer(port, paths);
  t.after(() => stopServer(child));
  const url = `${base}/api/azura/homepage/sections/accommodation`;
  const auth = { Authorization: `Bearer ${token}` };
  assert.equal((await fetch(url)).status, 401);
  assert.equal((await fetch(url, { headers: { Authorization: "Bearer wrong" } })).status, 401);
  assert.equal((await fetch(`${base}/api/azura/homepage/sections/unknown`, { headers: auth })).status, 404);
  const get = await fetch(url, { headers: auth });
  assert.equal(get.status, 200);
  const initial = await get.json();
  assert.deepEqual(initial.section, seed.sections.accommodation);
  assert.match(initial.revision, /^[a-f0-9]{64}$/);
  const media = await fetch(`${base}/api/azura/homepage/images`, { headers: auth });
  assert.equal(media.status, 200);
  const listed = JSON.stringify(await media.json());
  for (const card of initial.section.cards) assert.ok(listed.includes(card.image));
  const put = (section, ifMatch, extra = {}) => fetch(url, {
    method: "PUT", headers: { ...auth, "Content-Type": "application/json", ...(ifMatch ? { "If-Match": ifMatch } : {}) },
    body: JSON.stringify({ section, ...extra }),
  });
  assert.equal((await put(initial.section)).status, 428);
  assert.equal((await put(initial.section, "unquoted")).status, 400);
  assert.equal((await fetch(url, {
    method: "PUT", headers: { ...auth, "Content-Type": "application/json", "If-Match": `"${initial.revision}"` },
    body: "{invalid",
  })).status, 400);
  assert.equal((await put(initial.section, `"${initial.revision}"`, { other: true })).status, 400);
  const invalid = structuredClone(initial.section);
  invalid.cards[0].image = "/uploads/pages/homepage/missing.png";
  assert.equal((await put(invalid, `"${initial.revision}"`)).status, 400);
  const before = await readFile(jsonFile);
  assert.equal((await put(initial.section, '"' + "0".repeat(64) + '"')).status, 409);
  assert.deepEqual(await readFile(jsonFile), before);
  const changed = structuredClone(initial.section);
  for (const locale of locales) changed.cards[0].translations[locale].title = `Azura ${locale} room marker`;
  changed.cards[0].translations.en.description = "<img src=x onerror=alert(1)>";
  const saved = await put(changed, `"${initial.revision}"`);
  assert.equal(saved.status, 200);
  const result = await saved.json();
  assert.deepEqual(result.section, changed);
  assert.notEqual(result.revision, initial.revision);
  assert.deepEqual(JSON.parse(await readFile(jsonFile)).sections.accommodation, changed);
  for (const locale of locales) {
    const page = await fetch(`${base}/${locale}`);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.ok(html.includes(`Azura ${locale} room marker`), `${locale} anasayfasında yeni başlık yok`);
    if (locale === "en") {
      assert.ok(html.includes("&lt;img src=x onerror=alert(1)&gt;"));
      assert.ok(!html.includes('<img src=x onerror=alert(1)>'));
    }
  }
  const form = new FormData();
  form.set("file", new File([await readFile(path.join(source, "accommodation-deluxe.png"))], "room.png", { type: "image/png" }));
  const uploaded = await fetch(`${base}/api/azura/homepage/images`, {
    method: "POST", headers: auth, body: form,
  });
  assert.equal(uploaded.status, 201);
  const uploadedImage = (await uploaded.json()).image;
  assert.match(uploadedImage, /^\/uploads\/pages\/homepage\/.+\.png$/);
  const selected = structuredClone(changed);
  selected.cards[0].image = uploadedImage;
  const selectedResponse = await put(selected, `"${result.revision}"`);
  assert.equal(selectedResponse.status, 200);
  assert.equal((await selectedResponse.json()).section.cards[0].image, uploadedImage);
});
