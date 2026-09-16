import assert from "node:assert/strict";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  ACCOMMODATION_KEYS,
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
const originalMessages = JSON.parse(await readFile(path.join(import.meta.dirname, "fixtures/accommodation-original-messages.json"), "utf8"));
const images = [
  ["ODASOL.png", "accommodation-deluxe.png"],
  ["ODAORTA.png", "accommodation-fantasy.png"],
  ["ODASAG.png", "accommodation-family.png"],
];
const carouselImages = [
  "carousel-accommodation.jpg", "carousel-restaurants.jpg", "carousel-beach-pools.jpg",
  "carousel-experiences.jpg", "carousel-kids.jpg",
];
const locales = ["tr", "en", "de", "ru"];

async function fixture(t, content = seed) {
  const root = await mkdtemp(path.join(os.tmpdir(), "azura-accommodation-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = resolveAzuraPaths({
    contentRoot: path.join(root, "content"),
    uploadsRoot: path.join(root, "uploads"),
    production: true,
  });
  await mkdir(path.dirname(homepageFile(paths)), { recursive: true });
  await mkdir(path.join(paths.uploadsRoot, "pages/homepage"), { recursive: true });
  await writeFile(homepageFile(paths), JSON.stringify(content));
  for (const [, target] of images) {
    await copyFile(path.join(appRoot, "public/uploads/pages/homepage", target),
      path.join(paths.uploadsRoot, "pages/homepage", target));
  }
  for (const target of carouselImages) {
    await copyFile(path.join(appRoot, "public/uploads/pages/homepage", target),
      path.join(paths.uploadsRoot, "pages/homepage", target));
  }
  return paths;
}

const status = (expected) => (error) => error instanceof HomepageContentError && error.status === expected;

test("başlangıç metinleri dört dilde eski mesajlarla boşlukları dahil birebir, görseller baytlarıyla aynı", async () => {
  const section = seed.sections.accommodation;
  assert.equal(validateHomepageSection("accommodation", section), section);
  assert.deepEqual(section.cards.map((card) => card.key), ACCOMMODATION_KEYS);
  assert.match(getHomepageSectionRevision("accommodation", section), /^[a-f0-9]{64}$/);
  for (const locale of locales) {
    const message = originalMessages[locale];
    assert.deepEqual(section.translations[locale], {
      subtitle: message.subtitle, title: message.title, buttonText: message.buttonText,
    });
    for (const [index, card] of section.cards.entries()) {
      const number = index + 1;
      assert.deepEqual(card.translations[locale], {
        title: message[`roomTitle${number}`],
        description: message[`roomText${number}`],
        area: message[`area${number}`],
        view: message[`view${number}`],
        alt: message[`roomTitle${number}`],
      });
    }
  }
  for (const [original, target] of images) {
    assert.deepEqual(
      await readFile(path.join(appRoot, "app/[locale]/HomePage/Components/Images", original)),
      await readFile(path.join(appRoot, "public/uploads/pages/homepage", target)),
    );
  }
});

test("şema, kart sırası, dört dil, metin sınırları ve görsel yolları doğrulanır", async (t) => {
  const paths = await fixture(t);
  const before = await readFile(homepageFile(paths));
  const revision = getHomepageSectionRevision("accommodation", seed.sections.accommodation);
  const mutations = [
    (value) => { value.cards.pop(); },
    (value) => { [value.cards[0], value.cards[1]] = [value.cards[1], value.cards[0]]; },
    (value) => { value.cards[0].link = "/rooms/other"; },
    (value) => { delete value.translations.de; },
    (value) => { delete value.cards[0].translations.ru; },
    (value) => { value.cards[0].translations.en.description = " "; },
    (value) => { value.cards[0].translations.tr.alt = "x".repeat(301); },
    (value) => { value.cards[0].image = "/uploads/pages/homepage/../../outside.png"; },
    (value) => { value.cards[1].image = "/uploads/pages/homepage/missing.png"; },
  ];
  for (const mutate of mutations) {
    const value = structuredClone(seed.sections.accommodation);
    mutate(value);
    await assert.rejects(writeHomepageSection("accommodation", value, revision, paths), status(400));
    assert.deepEqual(await readFile(homepageFile(paths)), before);
  }
  await writeFile(path.join(paths.uploadsRoot, "pages/homepage/fake.png"), "not a PNG");
  const fake = structuredClone(seed.sections.accommodation);
  fake.cards[0].image = "/uploads/pages/homepage/fake.png";
  await assert.rejects(writeHomepageSection("accommodation", fake, revision, paths), status(400));
  assert.deepEqual(await readFile(homepageFile(paths)), before);
});

test("eski revision 409 verir; geçerli kayıt diğer bütün JSON alanlarını korur", async (t) => {
  const initial = { ...seed, futureField: { preserved: true } };
  const paths = await fixture(t, initial);
  const before = await readFile(homepageFile(paths));
  const section = structuredClone(seed.sections.accommodation);
  section.cards[0].translations.en.title = "Updated Deluxe Room";
  await assert.rejects(writeHomepageSection("accommodation", section, "0".repeat(64), paths), status(409));
  assert.deepEqual(await readFile(homepageFile(paths)), before);
  const result = await writeHomepageSection("accommodation", section,
    getHomepageSectionRevision("accommodation", seed.sections.accommodation), paths);
  assert.deepEqual(result, { section, revision: getHomepageSectionRevision("accommodation", section) });
  const saved = await readHomepageContent(paths);
  assert.deepEqual(saved.experience, initial.experience);
  assert.deepEqual(saved.experienceText, initial.experienceText);
  assert.deepEqual(saved.welcomeText, initial.welcomeText);
  assert.deepEqual(saved.sections.essentials, initial.sections.essentials);
  assert.deepEqual(saved.sections.carousel, initial.sections.carousel);
  assert.deepEqual(saved.futureField, initial.futureField);
  assert.equal(Object.hasOwn(saved, "revision"), false);
});

test("aynı revision ile paralel accommodation kayıtlarından yalnızca biri başarılıdır", async (t) => {
  const paths = await fixture(t);
  const revision = getHomepageSectionRevision("accommodation", seed.sections.accommodation);
  const first = structuredClone(seed.sections.accommodation);
  const second = structuredClone(seed.sections.accommodation);
  first.cards[0].translations.tr.title = "İlk oda başlığı";
  second.cards[0].translations.tr.title = "İkinci oda başlığı";
  const results = await Promise.allSettled([
    writeHomepageSection("accommodation", first, revision, paths),
    writeHomepageSection("accommodation", second, revision, paths),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.find((result) => result.status === "rejected").reason.status, 409);
});

test("accommodation ve carousel paralel kaydedilir, revision değerleri bağımsızdır", async (t) => {
  const paths = await fixture(t);
  const accommodation = structuredClone(seed.sections.accommodation);
  const carousel = structuredClone(seed.sections.carousel);
  accommodation.cards[2].translations.ru.view = "Новый вид";
  carousel.slides[0].translations.en.title = "New accommodation title";
  const originalCarouselRevision = getHomepageSectionRevision("carousel", carousel);
  const originalAccommodationRevision = getHomepageSectionRevision("accommodation", accommodation);
  await Promise.all([
    writeHomepageSection("accommodation", accommodation,
      getHomepageSectionRevision("accommodation", seed.sections.accommodation), paths),
    writeHomepageSection("carousel", carousel,
      getHomepageSectionRevision("carousel", seed.sections.carousel), paths),
  ]);
  const saved = await readHomepageContent(paths);
  assert.deepEqual(saved.sections.accommodation, accommodation);
  assert.deepEqual(saved.sections.carousel, carousel);
  assert.equal(getHomepageSectionRevision("carousel", saved.sections.carousel), originalCarouselRevision);
  assert.equal(getHomepageSectionRevision("accommodation", saved.sections.accommodation), originalAccommodationRevision);
});

test("seed eski JSON'a yalnızca eksik accommodation alanını ekler; ikinci çalıştırma düzenlemeyi ezmez", async (t) => {
  const old = structuredClone(seed);
  delete old.sections.accommodation;
  old.sections.carousel.slides[0].translations.en.title = "Persistent carousel";
  old.welcomeText.en.title = "Persistent welcome";
  old.futureField = { preserved: true };
  const paths = await fixture(t, old);
  const env = { ...process.env, AZURA_CONTENT_ROOT: paths.contentRoot, AZURA_UPLOADS_ROOT: paths.uploadsRoot };
  await run(process.execPath, ["scripts/seed-persistent-homepage.mjs"], { cwd: appRoot, env });
  const migrated = await readHomepageContent(paths);
  assert.deepEqual(migrated.sections.accommodation, seed.sections.accommodation);
  assert.deepEqual(migrated.sections.carousel, old.sections.carousel);
  assert.deepEqual(migrated.welcomeText, old.welcomeText);
  assert.deepEqual(migrated.futureField, old.futureField);
  const changed = structuredClone(migrated.sections.accommodation);
  changed.cards[0].translations.de.title = "Persistentes Deluxe-Zimmer";
  await writeHomepageSection("accommodation", changed,
    getHomepageSectionRevision("accommodation", migrated.sections.accommodation), paths);
  await run(process.execPath, ["scripts/seed-persistent-homepage.mjs"], { cwd: appRoot, env });
  assert.deepEqual((await readHomepageSection("accommodation", paths)).section, changed);
});
