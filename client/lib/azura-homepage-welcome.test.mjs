import assert from "node:assert/strict";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  HomepageContentError,
  getExperienceTextRevision,
  getWelcomeTextRevision,
  homepageFile,
  parseIfMatch,
  readHomepageContent,
  resolveAzuraPaths,
  validateWelcomeText,
  writeHomepageExperienceText,
  writeHomepageWelcomeText,
} from "./azura-homepage-storage.mjs";
import { hasValidServiceToken } from "./azura-service-auth.mjs";

const run = promisify(execFile);
const appRoot = path.resolve(import.meta.dirname, "..");
const seed = JSON.parse(await readFile(path.join(appRoot, "content", "site-pages", "homepage.json"), "utf8"));

async function fixture(t, content = seed) {
  const root = await mkdtemp(path.join(os.tmpdir(), "azura-welcome-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = resolveAzuraPaths({
    contentRoot: path.join(root, "content"),
    uploadsRoot: path.join(root, "uploads"),
    production: true,
  });
  await mkdir(path.dirname(homepageFile(paths)), { recursive: true });
  await mkdir(path.join(paths.uploadsRoot, "pages", "homepage"), { recursive: true });
  await writeFile(homepageFile(paths), JSON.stringify(content));
  return paths;
}

function hasStatus(status) {
  return (error) => error instanceof HomepageContentError && error.status === status;
}

test("başlangıç welcomeText değerleri dört dilde kayıpsızdır ve revision geçerlidir", () => {
  assert.equal(validateWelcomeText(seed.welcomeText), seed.welcomeText);
  assert.deepEqual(Object.keys(seed.welcomeText), ["tr", "en", "de", "ru"]);
  assert.equal(seed.welcomeText.tr.subtitle[0], " ");
  assert.equal(seed.welcomeText.tr.title[0], " ");
  assert.equal(seed.welcomeText.tr.buttonText[0], " ");
  assert.equal(seed.welcomeText.ru.title[0], " ");
  assert.equal(seed.welcomeText.ru.text[0], " ");
  const revision = getWelcomeTextRevision(seed.welcomeText);
  assert.match(revision, /^[a-f0-9]{64}$/);
  assert.equal(getWelcomeTextRevision({ ru: seed.welcomeText.ru, de: seed.welcomeText.de,
    en: seed.welcomeText.en, tr: seed.welcomeText.tr }), revision);
});

test("servis tokenı ile If-Match eksik veya bozuk istekler reddedilir", () => {
  const token = "test-service-token-0123456789abcdef";
  assert.equal(hasValidServiceToken(null, token), false);
  assert.equal(hasValidServiceToken("Bearer invalid", token), false);
  assert.equal(hasValidServiceToken(`Bearer ${token}`, token), true);
  assert.throws(() => parseIfMatch(null), hasStatus(428));
  assert.throws(() => parseIfMatch("bad"), hasStatus(400));
  assert.equal(parseIfMatch(`"${getWelcomeTextRevision(seed.welcomeText)}"`), getWelcomeTextRevision(seed.welcomeText));
});

test("geçersiz welcomeText ve eski revision dosyayı değiştirmez; diğer alanlar korunur", async (t) => {
  const original = { ...seed, extraContent: { preserved: true } };
  const paths = await fixture(t, original);
  const before = await readFile(homepageFile(paths));
  const revision = getWelcomeTextRevision(seed.welcomeText);
  const changes = [
    (value) => { delete value.ru; },
    (value) => { delete value.tr.text; },
    (value) => { value.en.extra = "unexpected"; },
    (value) => { value.tr.title = "   "; },
    (value) => { value.de.buttonText = "x".repeat(121); },
    (value) => { value.ru.text = "bad\u0000text"; },
    (value) => { value.en.subtitle = 1; },
  ];
  for (const mutate of changes) {
    const input = structuredClone(seed.welcomeText);
    mutate(input);
    await assert.rejects(writeHomepageWelcomeText(input, revision, paths), hasStatus(400));
    assert.deepEqual(await readFile(homepageFile(paths)), before);
  }
  const updated = structuredClone(seed.welcomeText);
  updated.en.title = "Updated Azura welcome title";
  await assert.rejects(writeHomepageWelcomeText(updated, "0".repeat(64), paths), hasStatus(409));
  assert.deepEqual(await readFile(homepageFile(paths)), before);

  const result = await writeHomepageWelcomeText(updated, revision, paths);
  assert.deepEqual(result, { welcomeText: updated, revision: getWelcomeTextRevision(updated) });
  const saved = await readHomepageContent(paths);
  assert.deepEqual(saved.experience, seed.experience);
  assert.deepEqual(saved.experienceText, seed.experienceText);
  assert.deepEqual(saved.extraContent, original.extraContent);
  assert.equal(Object.hasOwn(saved, "revision"), false);
});

test("aynı welcomeText revision ile paralel kayıtların yalnızca biri başarılıdır", async (t) => {
  const paths = await fixture(t);
  const revision = getWelcomeTextRevision(seed.welcomeText);
  const first = structuredClone(seed.welcomeText);
  const second = structuredClone(seed.welcomeText);
  first.tr.title = "İlk eşzamanlı karşılama kaydı";
  second.tr.title = "İkinci eşzamanlı karşılama kaydı";
  const results = await Promise.allSettled([
    writeHomepageWelcomeText(first, revision, paths),
    writeHomepageWelcomeText(second, revision, paths),
  ]);
  assert.equal(results.filter(({ status }) => status === "fulfilled").length, 1);
  const rejected = results.find(({ status }) => status === "rejected");
  assert.ok(rejected.reason instanceof HomepageContentError);
  assert.equal(rejected.reason.status, 409);
  const saved = await readHomepageContent(paths);
  assert.ok([first.tr.title, second.tr.title].includes(saved.welcomeText.tr.title));
  assert.deepEqual(saved.experienceText, seed.experienceText);
});

test("welcomeText ile experienceText paralel kaydedilir ve revision'ları bağımsızdır", async (t) => {
  const paths = await fixture(t);
  const welcome = structuredClone(seed.welcomeText);
  const experienceText = structuredClone(seed.experienceText);
  welcome.ru.buttonText = "НОВАЯ НАДПИСЬ";
  experienceText.en.title = "Parallel experience update";
  const experienceRevision = getExperienceTextRevision(seed.experienceText);
  const welcomeRevision = getWelcomeTextRevision(seed.welcomeText);
  await Promise.all([
    writeHomepageWelcomeText(welcome, welcomeRevision, paths),
    writeHomepageExperienceText(experienceText, experienceRevision, paths),
  ]);
  const saved = await readHomepageContent(paths);
  assert.deepEqual(saved.welcomeText, welcome);
  assert.deepEqual(saved.experienceText, experienceText);
  assert.deepEqual(saved.experience, seed.experience);
  assert.equal(getWelcomeTextRevision(saved.welcomeText), getWelcomeTextRevision(welcome));
  assert.equal(getExperienceTextRevision(saved.experienceText), getExperienceTextRevision(experienceText));
});

test("seed eski kalıcı JSON'a welcomeText ekler; mevcut ve sonraki kayıtları korur", async (t) => {
  const old = structuredClone(seed);
  delete old.welcomeText;
  old.experience.background.translations.tr.alt = "Kalıcı görsel özelleştirmesi";
  old.experienceText.tr.title = "Kalıcı deneyim özelleştirmesi";
  old.otherContent = { preserved: true };
  const paths = await fixture(t, old);
  const env = {
    ...process.env,
    AZURA_CONTENT_ROOT: paths.contentRoot,
    AZURA_UPLOADS_ROOT: paths.uploadsRoot,
  };
  await run(process.execPath, ["scripts/seed-persistent-homepage.mjs"], { cwd: appRoot, env });
  const migrated = await readHomepageContent(paths);
  assert.deepEqual(migrated.welcomeText, seed.welcomeText);
  assert.deepEqual(migrated.experience, old.experience);
  assert.deepEqual(migrated.experienceText, old.experienceText);
  assert.deepEqual(migrated.otherContent, old.otherContent);

  const updated = structuredClone(migrated.welcomeText);
  updated.en.buttonText = "SAVED WELCOME CTA";
  await writeHomepageWelcomeText(updated, getWelcomeTextRevision(migrated.welcomeText), paths);
  await run(process.execPath, ["scripts/seed-persistent-homepage.mjs"], { cwd: appRoot, env });
  assert.deepEqual((await readHomepageContent(paths)).welcomeText, updated);
});
