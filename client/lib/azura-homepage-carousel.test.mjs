import assert from "node:assert/strict";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  CAROUSEL_KEYS,
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
const seed = JSON.parse(await readFile(path.join(appRoot, "content", "site-pages", "homepage.json"), "utf8"));
const carouselImages = [
  ["accommodation.jpg", "carousel-accommodation.jpg"],
  ["Flavours.jpg", "carousel-restaurants.jpg"],
  ["Beachandpool.jpg", "carousel-beach-pools.jpg"],
  ["Entertainment.jpg", "carousel-experiences.jpg"],
  ["kids.jpg", "carousel-kids.jpg"],
];

async function fixture(t, content = seed) {
  const root = await mkdtemp(path.join(os.tmpdir(), "azura-carousel-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = resolveAzuraPaths({
    contentRoot: path.join(root, "content"),
    uploadsRoot: path.join(root, "uploads"),
    production: true,
  });
  await mkdir(path.dirname(homepageFile(paths)), { recursive: true });
  await mkdir(path.join(paths.uploadsRoot, "pages", "homepage"), { recursive: true });
  await writeFile(homepageFile(paths), JSON.stringify(content));
  for (const [, target] of carouselImages) {
    await copyFile(
      path.join(appRoot, "public", "uploads", "pages", "homepage", target),
      path.join(paths.uploadsRoot, "pages", "homepage", target),
    );
  }
  return paths;
}

function status(expected) {
  return (error) => error instanceof HomepageContentError && error.status === expected;
}

test("beş kartın sırası, dört dilde başlık ve alt metinleri, orijinal görsel baytları korunur", async () => {
  const section = seed.sections.carousel;
  assert.equal(validateHomepageSection("carousel", section), section);
  assert.deepEqual(section.slides.map((slide) => slide.key), CAROUSEL_KEYS);
  for (const slide of section.slides) {
    assert.deepEqual(Object.keys(slide.translations), ["tr", "en", "de", "ru"]);
    for (const locale of ["tr", "en", "de", "ru"]) {
      assert.ok(slide.translations[locale].title.trim());
      assert.ok(slide.translations[locale].alt.trim());
    }
  }
  for (const [original, target] of carouselImages) {
    assert.deepEqual(
      await readFile(path.join(appRoot, "app", "[locale]", "HomePage", "Components", "Slider", "Images", original)),
      await readFile(path.join(appRoot, "public", "uploads", "pages", "homepage", target)),
    );
  }
  assert.match(getHomepageSectionRevision("carousel", section), /^[a-f0-9]{64}$/);
});

test("kart şeması, sıra, bağlantı alanı ve dört dil zorunluluğu doğrulanır", async (t) => {
  const paths = await fixture(t);
  const before = await readFile(homepageFile(paths));
  const revision = getHomepageSectionRevision("carousel", seed.sections.carousel);
  const mutations = [
    (value) => { value.slides.pop(); },
    (value) => { [value.slides[0], value.slides[1]] = [value.slides[1], value.slides[0]]; },
    (value) => { value.slides[0].link = "/different"; },
    (value) => { delete value.slides[2].translations.ru; },
    (value) => { delete value.slides[3].translations.de.alt; },
    (value) => { value.slides[4].translations.en.title = "  "; },
    (value) => { value.slides[1].translations.tr.alt = "x".repeat(301); },
    (value) => { value.slides[0].image = "/uploads/pages/homepage/../../outside.jpg"; },
  ];
  for (const mutate of mutations) {
    const value = structuredClone(seed.sections.carousel);
    mutate(value);
    await assert.rejects(writeHomepageSection("carousel", value, revision, paths), status(400));
    assert.deepEqual(await readFile(homepageFile(paths)), before);
  }
});

test("kalıcı uploads dizininde bulunmayan görsel 400 döner ve JSON değişmez", async (t) => {
  const paths = await fixture(t);
  const before = await readFile(homepageFile(paths));
  const section = structuredClone(seed.sections.carousel);
  section.slides[0].image = "/uploads/pages/homepage/missing.jpg";
  await assert.rejects(writeHomepageSection("carousel", section,
    getHomepageSectionRevision("carousel", seed.sections.carousel), paths), status(400));
  assert.deepEqual(await readFile(homepageFile(paths)), before);
});

test("dosya adı geçerli olsa bile sahte görsel kaydedilmez", async (t) => {
  const paths = await fixture(t);
  const before = await readFile(homepageFile(paths));
  await writeFile(path.join(paths.uploadsRoot, "pages", "homepage", "fake.jpg"), "JPEG olmayan veri");
  const section = structuredClone(seed.sections.carousel);
  section.slides[0].image = "/uploads/pages/homepage/fake.jpg";
  await assert.rejects(writeHomepageSection("carousel", section,
    getHomepageSectionRevision("carousel", seed.sections.carousel), paths), status(400));
  assert.deepEqual(await readFile(homepageFile(paths)), before);
});

test("eski revision 409 döner; geçerli kayıt diğer JSON alanlarını korur", async (t) => {
  const original = { ...seed, futureField: { preserved: true } };
  const paths = await fixture(t, original);
  const before = await readFile(homepageFile(paths));
  const section = structuredClone(seed.sections.carousel);
  section.slides[0].translations.en.alt = "Updated hot tub photo description";
  await assert.rejects(writeHomepageSection("carousel", section, "0".repeat(64), paths), status(409));
  assert.deepEqual(await readFile(homepageFile(paths)), before);
  const result = await writeHomepageSection("carousel", section,
    getHomepageSectionRevision("carousel", seed.sections.carousel), paths);
  assert.deepEqual(result, { section, revision: getHomepageSectionRevision("carousel", section) });
  const saved = await readHomepageContent(paths);
  assert.deepEqual(saved.experience, original.experience);
  assert.deepEqual(saved.experienceText, original.experienceText);
  assert.deepEqual(saved.welcomeText, original.welcomeText);
  assert.deepEqual(saved.sections.essentials, original.sections.essentials);
  assert.deepEqual(saved.futureField, original.futureField);
  assert.equal(Object.hasOwn(saved, "revision"), false);
});

test("aynı revision ile paralel carousel kayıtlarından biri 200, diğeri 409 alır", async (t) => {
  const paths = await fixture(t);
  const revision = getHomepageSectionRevision("carousel", seed.sections.carousel);
  const first = structuredClone(seed.sections.carousel);
  const second = structuredClone(seed.sections.carousel);
  first.slides[0].translations.tr.title = "İlk paralel kart başlığı";
  second.slides[0].translations.tr.title = "İkinci paralel kart başlığı";
  const results = await Promise.allSettled([
    writeHomepageSection("carousel", first, revision, paths),
    writeHomepageSection("carousel", second, revision, paths),
  ]);
  assert.equal(results.filter(({ status: outcome }) => outcome === "fulfilled").length, 1);
  assert.equal(results.find(({ status: outcome }) => outcome === "rejected").reason.status, 409);
  const saved = await readHomepageContent(paths);
  assert.ok([first.slides[0].translations.tr.title, second.slides[0].translations.tr.title]
    .includes(saved.sections.carousel.slides[0].translations.tr.title));
});

test("carousel ve essentials paralel kaydedilir; revision değerleri bağımsızdır", async (t) => {
  const paths = await fixture(t);
  const carousel = structuredClone(seed.sections.carousel);
  const essentials = structuredClone(seed.sections.essentials);
  carousel.slides[4].translations.ru.title = "Новый детский клуб";
  essentials.en.title = "New essentials heading";
  const [carouselResult, essentialsResult] = await Promise.all([
    writeHomepageSection("carousel", carousel,
      getHomepageSectionRevision("carousel", seed.sections.carousel), paths),
    writeHomepageSection("essentials", essentials,
      getHomepageSectionRevision("essentials", seed.sections.essentials), paths),
  ]);
  const saved = await readHomepageContent(paths);
  assert.deepEqual(saved.sections.carousel, carousel);
  assert.deepEqual(saved.sections.essentials, essentials);
  assert.equal(carouselResult.revision, getHomepageSectionRevision("carousel", carousel));
  assert.equal(essentialsResult.revision, getHomepageSectionRevision("essentials", essentials));
});

test("seed eski JSON'a carousel ekler, özelleştirilmiş diğer alanları ve sonradan kaydedilen kartı korur", async (t) => {
  const old = structuredClone(seed);
  delete old.sections.carousel;
  old.sections.essentials.tr.title = "Kalıcı essentials başlığı";
  old.welcomeText.en.title = "Persistent welcome title";
  old.futureField = { preserved: true };
  const paths = await fixture(t, old);
  const env = { ...process.env, AZURA_CONTENT_ROOT: paths.contentRoot, AZURA_UPLOADS_ROOT: paths.uploadsRoot };
  await run(process.execPath, ["scripts/seed-persistent-homepage.mjs"], { cwd: appRoot, env });
  const migrated = await readHomepageContent(paths);
  assert.deepEqual(migrated.sections.carousel, seed.sections.carousel);
  assert.deepEqual(migrated.sections.essentials, old.sections.essentials);
  assert.deepEqual(migrated.welcomeText, old.welcomeText);
  assert.deepEqual(migrated.futureField, old.futureField);

  const updated = structuredClone(migrated.sections.carousel);
  updated.slides[1].translations.en.alt = "Persistent restaurant photo description";
  await writeHomepageSection("carousel", updated,
    getHomepageSectionRevision("carousel", migrated.sections.carousel), paths);
  await run(process.execPath, ["scripts/seed-persistent-homepage.mjs"], { cwd: appRoot, env });
  assert.deepEqual((await readHomepageSection("carousel", paths)).section, updated);
});
