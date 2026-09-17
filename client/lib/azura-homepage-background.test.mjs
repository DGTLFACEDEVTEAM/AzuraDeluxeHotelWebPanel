import assert from "node:assert/strict";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  getHomepageSectionRevision,
  HomepageContentError,
  homepageFile,
  readHomepageContent,
  readHomepageSection,
  resolveAzuraPaths,
  validateHomepageSection,
  writeHomepageSection,
} from "./azura-homepage-storage.mjs";

const run = promisify(execFile);
const appRoot = path.resolve(import.meta.dirname, "..");
const seed = JSON.parse(await readFile(path.join(appRoot, "content/site-pages/homepage.json"), "utf8"));
const originalMessages = JSON.parse(await readFile(path.join(import.meta.dirname, "fixtures/background-original-messages.json"), "utf8"));
const imageName = "background-green-and-blue.png";
const locales = ["tr", "en", "de", "ru"];

async function fixture(t, content = seed) {
  const root = await mkdtemp(path.join(os.tmpdir(), "azura-background-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = resolveAzuraPaths({
    contentRoot: path.join(root, "content"),
    uploadsRoot: path.join(root, "uploads"),
    production: true,
  });
  await mkdir(path.dirname(homepageFile(paths)), { recursive: true });
  await mkdir(path.join(paths.uploadsRoot, "pages/homepage"), { recursive: true });
  await writeFile(homepageFile(paths), JSON.stringify(content));
  await copyFile(path.join(appRoot, "public/uploads/pages/homepage", imageName),
    path.join(paths.uploadsRoot, "pages/homepage", imageName));
  return paths;
}

const status = (expected) => (error) => error instanceof HomepageContentError && error.status === expected;

test("dört dilin ilk metinleri eski mesajlarla boşlukları dahil aynıdır; görsel kopyası bayt düzeyinde aynıdır", async () => {
  const section = seed.sections.background;
  assert.equal(validateHomepageSection("background", section), section);
  assert.deepEqual(section.translations, originalMessages);
  assert.deepEqual(Object.keys(section.translations), locales);
  assert.deepEqual(
    await readFile(path.join(appRoot, "app/[locale]/HomePage/Components/Images/greenandblue.png")),
    await readFile(path.join(appRoot, "public/uploads/pages/homepage", imageName)),
  );
  assert.match(getHomepageSectionRevision("background", section), /^[a-f0-9]{64}$/);
});

test("tam şema, dört dil, metin ve görsel yolu doğrulanır; geçersiz kayıt dosyayı değiştirmez", async (t) => {
  const paths = await fixture(t);
  const before = await readFile(homepageFile(paths));
  const revision = getHomepageSectionRevision("background", seed.sections.background);
  const mutations = [
    (value) => { value.alt = "unused"; },
    (value) => { delete value.translations.de; },
    (value) => { delete value.translations.ru.buttonText; },
    (value) => { value.translations.en.title = " "; },
    (value) => { value.translations.tr.text = "x".repeat(2001); },
    (value) => { value.image = "/uploads/pages/homepage/../../outside.png"; },
    (value) => { value.image = "/uploads/pages/homepage/missing.png"; },
  ];
  for (const mutate of mutations) {
    const value = structuredClone(seed.sections.background);
    mutate(value);
    await assert.rejects(writeHomepageSection("background", value, revision, paths), status(400));
    assert.deepEqual(await readFile(homepageFile(paths)), before);
  }
  await writeFile(path.join(paths.uploadsRoot, "pages/homepage/fake.png"), "not a PNG");
  const fake = structuredClone(seed.sections.background);
  fake.image = "/uploads/pages/homepage/fake.png";
  await assert.rejects(writeHomepageSection("background", fake, revision, paths), status(400));
  assert.deepEqual(await readFile(homepageFile(paths)), before);
});

test("eski revision 409 verir; geçerli kayıt diğer tüm homepage alanlarını korur", async (t) => {
  const initial = { ...seed, futureField: { preserved: true } };
  const paths = await fixture(t, initial);
  const before = await readFile(homepageFile(paths));
  const next = structuredClone(seed.sections.background);
  next.translations.en.title = "Updated nature heading";
  await assert.rejects(writeHomepageSection("background", next, "0".repeat(64), paths), status(409));
  assert.deepEqual(await readFile(homepageFile(paths)), before);
  const saved = await writeHomepageSection("background", next,
    getHomepageSectionRevision("background", seed.sections.background), paths);
  assert.deepEqual(saved, { section: next, revision: getHomepageSectionRevision("background", next) });
  const current = await readHomepageContent(paths);
  assert.deepEqual(current.experience, initial.experience);
  assert.deepEqual(current.experienceText, initial.experienceText);
  assert.deepEqual(current.welcomeText, initial.welcomeText);
  assert.deepEqual(current.sections.essentials, initial.sections.essentials);
  assert.deepEqual(current.sections.carousel, initial.sections.carousel);
  assert.deepEqual(current.sections.accommodation, initial.sections.accommodation);
  assert.deepEqual(current.futureField, initial.futureField);
  assert.equal(Object.hasOwn(current, "revision"), false);
});

test("aynı revision ile eşzamanlı kayıtların biri başarılı, diğeri 409", async (t) => {
  const paths = await fixture(t);
  const revision = getHomepageSectionRevision("background", seed.sections.background);
  const first = structuredClone(seed.sections.background);
  const second = structuredClone(seed.sections.background);
  first.translations.tr.title = "İlk başlık";
  second.translations.tr.title = "İkinci başlık";
  const results = await Promise.allSettled([
    writeHomepageSection("background", first, revision, paths),
    writeHomepageSection("background", second, revision, paths),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.find((result) => result.status === "rejected").reason.status, 409);
});

test("seed eksik background alanını ekler, mevcut görseli ve sonraki değişikliği ikinci çalıştırmada korur", async (t) => {
  const old = structuredClone(seed);
  delete old.sections.background;
  old.sections.accommodation.translations.en.title = "Persistent rooms";
  old.futureField = { preserved: true };
  const paths = await fixture(t, old);
  const targetImage = path.join(paths.uploadsRoot, "pages/homepage", imageName);
  const imageBefore = await readFile(targetImage);
  const env = { ...process.env, AZURA_CONTENT_ROOT: paths.contentRoot, AZURA_UPLOADS_ROOT: paths.uploadsRoot };
  await run(process.execPath, ["scripts/seed-persistent-homepage.mjs"], { cwd: appRoot, env });
  const migrated = await readHomepageContent(paths);
  assert.deepEqual(migrated.sections.background, seed.sections.background);
  assert.deepEqual(migrated.sections.accommodation, old.sections.accommodation);
  assert.deepEqual(migrated.futureField, old.futureField);
  assert.deepEqual(await readFile(targetImage), imageBefore);
  const edited = structuredClone(migrated.sections.background);
  edited.translations.de.buttonText = "Neuer Linktext";
  await writeHomepageSection("background", edited,
    getHomepageSectionRevision("background", migrated.sections.background), paths);
  await run(process.execPath, ["scripts/seed-persistent-homepage.mjs"], { cwd: appRoot, env });
  assert.deepEqual((await readHomepageSection("background", paths)).section, edited);
  assert.deepEqual(await readFile(targetImage), imageBefore);
});
