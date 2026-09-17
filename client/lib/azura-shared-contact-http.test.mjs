import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const appRoot = path.resolve(import.meta.dirname, "..");
const homepage = JSON.parse(await readFile(path.join(appRoot, "content/site-pages/homepage.json"), "utf8"));
const seed = JSON.parse(await readFile(path.join(appRoot, "content/shared/contact-details.json"), "utf8"));
const token = "azura-shared-contact-local-test-token";
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
      const response = await fetch(`${base}/api/azura/shared/contact/details`);
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

test("canlı ortak iletişim API: yetki, revision, görünüm ve dört dilde güncel yayın", { timeout: 60000 }, async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "azura-contact-http-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = { contentRoot: path.join(root, "content"), uploadsRoot: path.join(root, "uploads") };
  await mkdir(path.join(paths.contentRoot, "site-pages"), { recursive: true });
  await mkdir(path.join(paths.contentRoot, "shared"), { recursive: true });
  await mkdir(path.join(paths.uploadsRoot, "pages/homepage"), { recursive: true });
  const contactFile = path.join(paths.contentRoot, "shared/contact-details.json");
  await writeFile(path.join(paths.contentRoot, "site-pages/homepage.json"), JSON.stringify(homepage));
  await writeFile(contactFile, JSON.stringify(seed));
  const source = path.join(appRoot, "public/uploads/pages/homepage");
  for (const name of await readdir(source)) {
    await copyFile(path.join(source, name), path.join(paths.uploadsRoot, "pages/homepage", name));
  }
  const port = 46000 + Math.floor(Math.random() * 10000);
  const { child, base } = await startServer(port, paths);
  t.after(() => stopServer(child));
  const url = `${base}/api/azura/shared/contact/details`;
  const auth = { Authorization: `Bearer ${token}` };
  assert.equal((await fetch(url)).status, 401);
  assert.equal((await fetch(url, { headers: { Authorization: "Bearer wrong" } })).status, 401);
  const response = await fetch(url, { headers: auth });
  assert.equal(response.status, 200);
  const initial = await response.json();
  assert.deepEqual(initial.details, seed);
  assert.match(initial.revision, /^[a-f0-9]{64}$/);
  for (const locale of locales) {
    const page = await fetch(`${base}/${locale}`);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.ok(html.includes(seed.translations[locale].contactForMore));
    assert.ok(html.includes("@AzuraDeluxeResort"));
    assert.ok(html.includes("tel:+902425171234"));
    assert.ok(html.includes("mailto:info@azuradeluxe.com"));
    assert.ok(html.includes(seed.reservationUrl));
  }
  const put = (details, ifMatch, extra = {}) => fetch(url, {
    method: "PUT", headers: { ...auth, "Content-Type": "application/json", ...(ifMatch ? { "If-Match": ifMatch } : {}) },
    body: JSON.stringify({ details, ...extra }),
  });
  assert.equal((await put(seed)).status, 428);
  assert.equal((await put(seed, "unquoted")).status, 400);
  assert.equal((await put(seed, `"${initial.revision}"`, { extra: true })).status, 400);
  assert.equal((await fetch(url, {
    method: "PUT", headers: { ...auth, "Content-Type": "application/json", "If-Match": `"${initial.revision}"` },
    body: "{invalid",
  })).status, 400);
  const invalid = structuredClone(seed);
  invalid.instagramUrl = "http://example.com/";
  assert.equal((await put(invalid, `"${initial.revision}"`)).status, 400);
  const before = await readFile(contactFile);
  assert.equal((await put(seed, '"' + "0".repeat(64) + '"')).status, 409);
  assert.deepEqual(await readFile(contactFile), before);

  const changed = structuredClone(seed);
  changed.username = "@AzuraUpdated";
  changed.phone = "+90 242 555 66 77";
  changed.email = "contact@example.com";
  changed.reservationUrl = "https://booking.example.com/azura";
  for (const locale of locales) changed.translations[locale].contactForMore = `Azura ${locale} contact marker`;
  const saved = await put(changed, `"${initial.revision}"`);
  assert.equal(saved.status, 200);
  const result = await saved.json();
  assert.deepEqual(result.details, changed);
  assert.notEqual(result.revision, initial.revision);
  assert.deepEqual(JSON.parse(await readFile(contactFile)), changed);
  assert.deepEqual(JSON.parse(await readFile(path.join(paths.contentRoot, "site-pages/homepage.json"))), homepage);
  for (const locale of locales) {
    const page = await fetch(`${base}/${locale}`);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.ok(html.includes(`Azura ${locale} contact marker`), `${locale} anasayfasında yeni metin yok`);
    assert.ok(html.includes("@AzuraUpdated"));
    assert.ok(html.includes("tel:+902425556677"));
    assert.ok(html.includes("mailto:contact@example.com"));
    assert.ok(html.includes(changed.reservationUrl));
    assert.ok(html.split('href="tel:+902425556677"').length - 1 >= 2,
      `${locale} mobil ve masaüstü telefon bağlantıları aynı veriyi kullanmıyor`);
    assert.ok(html.split('href="mailto:contact@example.com"').length - 1 >= 2,
      `${locale} mobil ve masaüstü e-posta bağlantıları aynı veriyi kullanmıyor`);
  }
});
