import assert from "node:assert/strict";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  assertHomepageSectionKey,
  getHomepageSectionRevision,
  getWelcomeTextRevision,
  HomepageContentError,
  homepageFile,
  parseIfMatch,
  readHomepageContent,
  readHomepageSection,
  resolveAzuraPaths,
  validateHomepageSection,
  writeHomepageSection,
  writeHomepageWelcomeText,
} from "./azura-homepage-storage.mjs";
import { hasValidServiceToken } from "./azura-service-auth.mjs";

const run = promisify(execFile);
const appRoot = path.resolve(import.meta.dirname, "..");
const seed = JSON.parse(await readFile(path.join(appRoot, "content", "site-pages", "homepage.json"), "utf8"));

async function fixture(t, content = seed) {
  const root = await mkdtemp(path.join(os.tmpdir(), "azura-section-test-"));
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

function status(expected) {
  return (error) => error instanceof HomepageContentError && error.status === expected;
}

test("izin listesinde essentials ve carousel bulunur; bölüm revision'ı kararlı SHA-256'dır", async (t) => {
  const paths = await fixture(t);
  assert.equal(assertHomepageSectionKey("essentials"), "essentials");
  assert.equal(assertHomepageSectionKey("carousel"), "carousel");
  assert.throws(() => assertHomepageSectionKey("unknown"), status(404));
  await assert.rejects(readHomepageSection("unknown", paths), status(404));
  const section = seed.sections.essentials;
  assert.equal(validateHomepageSection("essentials", section), section);
  assert.deepEqual(Object.keys(section), ["tr", "en", "de", "ru"]);
  const revision = getHomepageSectionRevision("essentials", section);
  assert.match(revision, /^[a-f0-9]{64}$/);
  assert.equal(getHomepageSectionRevision("essentials", {
    ru: section.ru, de: section.de, en: section.en, tr: section.tr,
  }), revision);
  assert.deepEqual(await readHomepageSection("essentials", paths), { section, revision });
});

test("Bearer ve If-Match zorunludur", () => {
  const token = "azura-sections-test-service-token-0123456789";
  assert.equal(hasValidServiceToken(null, token), false);
  assert.equal(hasValidServiceToken("Bearer wrong", token), false);
  assert.equal(hasValidServiceToken(`Bearer ${token}`, token), true);
  assert.throws(() => parseIfMatch(null), status(428));
  assert.throws(() => parseIfMatch("bad"), status(400));
  const revision = getHomepageSectionRevision("essentials", seed.sections.essentials);
  assert.equal(parseIfMatch(`"${revision}"`), revision);
});

test("dört dil, izinli alanlar ve uzunluk sınırları doğrulanır; geçersiz kayıt dosyayı korur", async (t) => {
  const paths = await fixture(t);
  const before = await readFile(homepageFile(paths));
  const revision = getHomepageSectionRevision("essentials", seed.sections.essentials);
  const mutations = [
    (value) => { delete value.ru; },
    (value) => { delete value.tr.text6; },
    (value) => { value.en.extra = "unexpected"; },
    (value) => { value.tr.title1 = "  "; },
    (value) => { value.de.buttonText = "x".repeat(121); },
    (value) => { value.ru.text2 = "bad\u0000text"; },
    (value) => { value.en.subtitle = 5; },
  ];
  for (const mutate of mutations) {
    const value = structuredClone(seed.sections.essentials);
    mutate(value);
    await assert.rejects(writeHomepageSection("essentials", value, revision, paths), status(400));
    assert.deepEqual(await readFile(homepageFile(paths)), before);
  }
  await assert.rejects(writeHomepageSection("other", seed.sections.essentials, revision, paths), status(404));
  assert.deepEqual(await readFile(homepageFile(paths)), before);
});

test("eski revision 409 döner, diğer JSON alanları korunur", async (t) => {
  const original = { ...seed, futureField: { preserved: true } };
  const paths = await fixture(t, original);
  const before = await readFile(homepageFile(paths));
  const section = structuredClone(seed.sections.essentials);
  section.en.title = "Updated essentials heading";
  await assert.rejects(writeHomepageSection("essentials", section, "0".repeat(64), paths), status(409));
  assert.deepEqual(await readFile(homepageFile(paths)), before);
  const result = await writeHomepageSection("essentials", section,
    getHomepageSectionRevision("essentials", seed.sections.essentials), paths);
  assert.deepEqual(result, { section, revision: getHomepageSectionRevision("essentials", section) });
  const saved = await readHomepageContent(paths);
  assert.deepEqual(saved.experience, original.experience);
  assert.deepEqual(saved.experienceText, original.experienceText);
  assert.deepEqual(saved.welcomeText, original.welcomeText);
  assert.deepEqual(saved.futureField, original.futureField);
  assert.equal(Object.hasOwn(saved, "revision"), false);
});

test("aynı revision ile paralel essentials kayıtlarından yalnızca biri başarılı olur", async (t) => {
  const paths = await fixture(t);
  const revision = getHomepageSectionRevision("essentials", seed.sections.essentials);
  const first = structuredClone(seed.sections.essentials);
  const second = structuredClone(seed.sections.essentials);
  first.tr.title = "İlk paralel essentials kaydı";
  second.tr.title = "İkinci paralel essentials kaydı";
  const results = await Promise.allSettled([
    writeHomepageSection("essentials", first, revision, paths),
    writeHomepageSection("essentials", second, revision, paths),
  ]);
  assert.equal(results.filter(({ status: outcome }) => outcome === "fulfilled").length, 1);
  const rejected = results.find(({ status: outcome }) => outcome === "rejected");
  assert.ok(rejected.reason instanceof HomepageContentError);
  assert.equal(rejected.reason.status, 409);
  const saved = await readHomepageContent(paths);
  assert.ok([first.tr.title, second.tr.title].includes(saved.sections.essentials.tr.title));
});

test("essentials ve welcomeText paralel kaydedilir, birbirinin revision'ı değişmez", async (t) => {
  const paths = await fixture(t);
  const section = structuredClone(seed.sections.essentials);
  const welcomeText = structuredClone(seed.welcomeText);
  section.de.text1 = "Parallel section update";
  welcomeText.en.title = "Parallel welcome update";
  const [sectionResult, welcomeResult] = await Promise.all([
    writeHomepageSection("essentials", section,
      getHomepageSectionRevision("essentials", seed.sections.essentials), paths),
    writeHomepageWelcomeText(welcomeText, getWelcomeTextRevision(seed.welcomeText), paths),
  ]);
  const saved = await readHomepageContent(paths);
  assert.deepEqual(saved.sections.essentials, section);
  assert.deepEqual(saved.welcomeText, welcomeText);
  assert.deepEqual(saved.experience, seed.experience);
  assert.deepEqual(saved.experienceText, seed.experienceText);
  assert.equal(sectionResult.revision, getHomepageSectionRevision("essentials", section));
  assert.equal(welcomeResult.revision, getWelcomeTextRevision(welcomeText));
});

test("seed eski kalıcı JSON'a essentials ekler ve sonraki kaydı ezmez", async (t) => {
  const old = structuredClone(seed);
  delete old.sections;
  old.welcomeText.tr.title = "Kalıcı karşılama metni";
  old.experienceText.en.title = "Persistent experience text";
  old.futureField = { preserved: true };
  const paths = await fixture(t, old);
  const env = { ...process.env, AZURA_CONTENT_ROOT: paths.contentRoot, AZURA_UPLOADS_ROOT: paths.uploadsRoot };
  await run(process.execPath, ["scripts/seed-persistent-homepage.mjs"], { cwd: appRoot, env });
  const migrated = await readHomepageContent(paths);
  assert.deepEqual(migrated.sections.essentials, seed.sections.essentials);
  assert.deepEqual(migrated.experience, old.experience);
  assert.deepEqual(migrated.experienceText, old.experienceText);
  assert.deepEqual(migrated.welcomeText, old.welcomeText);
  assert.deepEqual(migrated.futureField, old.futureField);

  const update = structuredClone(migrated.sections.essentials);
  update.tr.buttonText = "KALICI BÖLÜM METNİ";
  await writeHomepageSection("essentials", update,
    getHomepageSectionRevision("essentials", migrated.sections.essentials), paths);
  await run(process.execPath, ["scripts/seed-persistent-homepage.mjs"], { cwd: appRoot, env });
  assert.deepEqual((await readHomepageContent(paths)).sections.essentials, update);
});
