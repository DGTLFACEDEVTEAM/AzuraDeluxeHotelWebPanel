import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import { resolveAzuraPaths } from "./azura-homepage-storage.mjs";
import {
  readRestaurantsContent, readRestaurantsPageLocale, restaurantsFile,
  restaurantsImages, RestaurantsContentError, validateRestaurantsContent,
  readRestaurantsPageContent, restaurantsPageRevision, writeRestaurantsPageContent,
} from "./azura-restaurants-storage.mjs";
import { listRestaurantsImages, saveRestaurantsImage } from "./azura-homepage-media.mjs";

const run = promisify(execFile);
const appRoot = path.resolve(import.meta.dirname, "..");
const seed = JSON.parse(await readFile(path.join(appRoot, "content/site-pages/restaurants.json"), "utf8"));
const locales = ["tr", "en", "de", "ru"];
const sources = [
  ["Banner.jpg", "hero-banner.jpg"],
  ["blok2.jpg", "intro-primary.jpg"], ["blok21.jpg", "intro-secondary.jpg"],
  ["mainirestoranarka.jpg", "main-restaurant-background.jpg"],
  ["orchestra.webp", "carousel-orchestra.webp"], ["bellaazura.webp", "carousel-bella-azura.webp"],
  ["ottoman.webp", "carousel-ottoman.webp"],
  ["blok22.jpg", "reverse-primary.jpg"], ["blok222.webp", "reverse-secondary.webp"],
  ["Patisserie.webp", "carousel-patisserie.webp"], ["MAZURKA.jpg", "carousel-mazurka.jpg"],
  ["LYRIC.jpg", "carousel-lyric.jpg"],
  ["discoverbarsparallax.jpg", "discover-bars-background.jpg"],
];

async function fixture(t, content = seed, copyImages = true) {
  const root = await mkdtemp(path.join(os.tmpdir(), "azura-restaurants-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = resolveAzuraPaths({ contentRoot: path.join(root, "content"),
    uploadsRoot: path.join(root, "uploads"), production: true });
  await mkdir(path.dirname(restaurantsFile(paths)), { recursive: true });
  await mkdir(path.join(paths.uploadsRoot, "pages/restaurants"), { recursive: true });
  if (content !== null) await writeFile(restaurantsFile(paths), JSON.stringify(content));
  if (copyImages) {
    const source = path.join(appRoot, "public/uploads/pages/restaurants");
    for (const name of await readdir(source)) {
      await copyFile(path.join(source, name), path.join(paths.uploadsRoot, "pages/restaurants", name));
    }
  }
  return paths;
}

function expectedTranslations(message) {
  const pick = (value, keys) => Object.fromEntries(keys.map((key) => [key, value[key]]));
  const card = (value, index, swapped = false) => ({
    title: value[swapped ? "subtitle2" : `title${index}`],
    subtitle: value[swapped ? "title2" : `subtitle${index}`],
    text: value[`text${index}`],
  });
  return {
    hero: pick(message, ["subtitle", "title", "text"]),
    intro: pick(message.TwoImagesSection, ["subtitle", "title", "text", "span", "list1"]),
    mainRestaurant: pick(message.BackgroundSection, ["subtitle", "title", "text", "span", "list1", "list2", "list3"]),
    alacarteCarousel: {
      ...pick(message.CarouselSection, ["subtitle", "title", "text"]),
      cards: {
        orchestra: card(message.CarouselSection, 1),
        bellaAzura: card(message.CarouselSection, 2, true),
        ottoman: card(message.CarouselSection, 3),
      },
    },
    reverse: pick(message.TwoImagesSection2, ["span", "title", "text", "text2"]),
    dessertsCarousel: {
      ...pick(message.CarouselSection2, ["subtitle", "title", "text"]),
      cards: {
        patisserie: card(message.CarouselSection2, 1),
        mazurka: card(message.CarouselSection2, 2),
        lyric: card(message.CarouselSection2, 3),
      },
    },
    discover: pick(message.BackgroundSection2, ["subtitle", "title", "text"]),
  };
}

test("yalnızca aktif bölümlerin dört dildeki görünen metinleri boşluklarıyla aynıdır", async (t) => {
  const paths = await fixture(t);
  assert.equal(validateRestaurantsContent(seed), seed);
  for (const locale of locales) {
    const message = JSON.parse(await readFile(path.join(appRoot, `messages/${locale}.json`), "utf8")).Restaurants;
    assert.deepEqual(seed.translations[locale], expectedTranslations(message));
    const localized = await readRestaurantsPageLocale(locale, paths);
    assert.deepEqual(localized.texts, seed.translations[locale]);
    assert.equal(localized.images.hero.alt, seed.media.hero.translations[locale].alt);
    assert.deepEqual(Object.keys(localized.images.alacarteCarousel.cards), ["orchestra", "bellaAzura", "ottoman"]);
    assert.deepEqual(Object.keys(localized.images.dessertsCarousel.cards), ["patisserie", "mazurka", "lyric"]);
  }
  assert.equal(seed.translations.tr.alacarteCarousel.cards.bellaAzura.title,
    JSON.parse(await readFile(path.join(appRoot, "messages/tr.json"), "utf8")).Restaurants.CarouselSection.subtitle2);
  assert.equal(seed.translations.tr.alacarteCarousel.cards.bellaAzura.subtitle,
    JSON.parse(await readFile(path.join(appRoot, "messages/tr.json"), "utf8")).Restaurants.CarouselSection.title2);
  assert.equal(seed.translations.tr.mainRestaurant.buttonText, undefined);
  assert.equal(seed.translations.tr.discover.buttonText, undefined);
});

test("13 görselin sırası, kopya baytları ve gerçek ölçüleri eşleşir", async () => {
  const records = restaurantsImages(seed.media);
  assert.equal(records.length, 13);
  for (const [index, [sourceName, targetName]] of sources.entries()) {
    const source = path.join(appRoot, "app/[locale]/restaurants/images", sourceName);
    const target = path.join(appRoot, "public/uploads/pages/restaurants", targetName);
    assert.deepEqual(await readFile(target), await readFile(source));
    assert.equal(records[index].image, `/uploads/pages/restaurants/${targetName}`);
    const metadata = await sharp(target).metadata();
    assert.equal(records[index].width, metadata.width);
    assert.equal(records[index].height, metadata.height);
    for (const locale of locales) assert.ok(records[index].translations[locale].alt.trim());
  }
});

test("eksik/bozuk JSON, yanlış ölçü, sahte görsel ve symlink açık hata verir", async (t) => {
  const paths = await fixture(t);
  const wrongLocale = structuredClone(seed);
  delete wrongLocale.translations.ru;
  assert.throws(() => validateRestaurantsContent(wrongLocale), RestaurantsContentError);
  const wrongCard = structuredClone(seed);
  wrongCard.media.alacarteCarousel.cards.extra = wrongCard.media.alacarteCarousel.cards.ottoman;
  assert.throws(() => validateRestaurantsContent(wrongCard), RestaurantsContentError);
  const wrongDimensions = structuredClone(seed);
  wrongDimensions.media.intro.primary.width++;
  await writeFile(restaurantsFile(paths), JSON.stringify(wrongDimensions));
  await assert.rejects(readRestaurantsContent(paths), /gerçek ölçüleri/);
  const fake = structuredClone(seed);
  fake.media.hero.image = "/uploads/pages/restaurants/fake.jpg";
  fake.media.hero.width = 1;
  fake.media.hero.height = 1;
  await writeFile(path.join(paths.uploadsRoot, "pages/restaurants/fake.jpg"), "not a JPEG");
  await writeFile(restaurantsFile(paths), JSON.stringify(fake));
  await assert.rejects(readRestaurantsContent(paths), /sahte veya bozuk/);
  const linked = structuredClone(seed);
  linked.media.hero.image = "/uploads/pages/restaurants/linked.jpg";
  await symlink(path.join(paths.uploadsRoot, "pages/restaurants/hero-banner.jpg"),
    path.join(paths.uploadsRoot, "pages/restaurants/linked.jpg"));
  await writeFile(restaurantsFile(paths), JSON.stringify(linked));
  await assert.rejects(readRestaurantsContent(paths), /sahte veya bozuk/);
  await writeFile(restaurantsFile(paths), "{");
  await assert.rejects(readRestaurantsContent(paths), /Azura restaurants verisi okunamadı/);
  await rm(restaurantsFile(paths));
  await assert.rejects(readRestaurantsContent(paths), /Azura restaurants verisi okunamadı/);
});

test("seed yalnızca eksik dosyaları kopyalar; mevcut JSON ve görsel ikinci çalıştırmada korunur", async (t) => {
  const custom = structuredClone(seed);
  custom.translations.tr.hero.title = "Persisted Restaurant Title";
  custom.media.hero.width = 2;
  custom.media.hero.height = 2;
  const paths = await fixture(t, custom, false);
  const replacement = await sharp({ create: { width: 2, height: 2, channels: 3, background: "blue" } })
    .jpeg().toBuffer();
  await writeFile(path.join(paths.uploadsRoot, "pages/restaurants/hero-banner.jpg"), replacement);
  const env = { ...process.env, AZURA_CONTENT_ROOT: paths.contentRoot, AZURA_UPLOADS_ROOT: paths.uploadsRoot };
  await run(process.execPath, ["scripts/seed-persistent-restaurants.mjs"], { cwd: appRoot, env });
  assert.equal((await readRestaurantsContent(paths)).translations.tr.hero.title, "Persisted Restaurant Title");
  assert.deepEqual(await readFile(path.join(paths.uploadsRoot, "pages/restaurants/hero-banner.jpg")), replacement);
  assert.equal((await readdir(path.join(paths.uploadsRoot, "pages/restaurants"))).length, 13);
  await run(process.execPath, ["scripts/seed-persistent-restaurants.mjs"], { cwd: appRoot, env });
  assert.equal((await readRestaurantsContent(paths)).translations.tr.hero.title, "Persisted Restaurant Title");
  assert.deepEqual(await readFile(path.join(paths.uploadsRoot, "pages/restaurants/hero-banner.jpg")), replacement);
});

test("page-content revision diğer kök alanlardan bağımsızdır; paralel kayıtta yalnızca bir PUT kazanır", async (t) => {
  const paths = await fixture(t, { ...seed, futureMetadata: { preserved: true } });
  const initial = await readRestaurantsPageContent(paths);
  assert.match(initial.revision, /^[a-f0-9]{64}$/);
  assert.equal(initial.revision, restaurantsPageRevision(seed.translations, seed.media));
  const first = structuredClone(initial.bundle);
  const second = structuredClone(initial.bundle);
  first.tr.hero.title = "Birinci kayıt";
  second.tr.hero.title = "İkinci kayıt";
  const results = await Promise.allSettled([
    writeRestaurantsPageContent(first, initial.media, initial.revision, paths),
    writeRestaurantsPageContent(second, initial.media, initial.revision, paths),
  ]);
  assert.deepEqual(results.map((result) => result.status).sort(), ["fulfilled", "rejected"]);
  assert.equal(results.find((result) => result.status === "rejected").reason.status, 409);
  const saved = JSON.parse(await readFile(restaurantsFile(paths), "utf8"));
  assert.equal(saved.schemaVersion, 1);
  assert.equal(saved.pageKey, "restaurants");
  assert.ok(!Object.hasOwn(saved, "revision"));
  assert.deepEqual(saved.futureMetadata, { preserved: true });
  assert.equal(saved.translations.tr.hero.title, "Birinci kayıt");
  assert.deepEqual(saved.media, seed.media);
  assert.equal((await readRestaurantsPageContent(paths)).revision, results[0].value.revision);
});

test("restoran medya katmanı güvenli dosyaları listeler ve yüklenen görseli seçilebilir kılar", async (t) => {
  const paths = await fixture(t);
  const bytes = await readFile(path.join(appRoot, "public/uploads/pages/restaurants/intro-secondary.jpg"));
  const uploaded = await saveRestaurantsImage(bytes, "image/jpeg", paths, () => "unique-test-id");
  assert.equal(uploaded.image, "/uploads/pages/restaurants/restaurants-unique-test-id.jpg");
  assert.equal(uploaded.mimeType, "image/jpeg");
  assert.equal(uploaded.size, bytes.length);
  assert.equal(uploaded.width, 300);
  assert.equal(uploaded.height, 450);
  await assert.rejects(saveRestaurantsImage(bytes, "image/jpeg", paths, () => "unique-test-id"),
    (error) => error.status === 409);
  await assert.rejects(saveRestaurantsImage(Buffer.from("fake"), "image/jpeg", paths),
    (error) => error.status === 415);
  await symlink(path.join(paths.uploadsRoot, "pages/restaurants/hero-banner.jpg"),
    path.join(paths.uploadsRoot, "pages/restaurants/symlink.jpg"));
  const list = await listRestaurantsImages(paths);
  assert.equal(list.length, 14);
  assert.ok(list.some((image) => image.image === uploaded.image && image.width === 300 && image.height === 450));
  assert.ok(!list.some((image) => image.image.endsWith("symlink.jpg")));
  assert.deepEqual((await readRestaurantsPageContent(paths)).media, seed.media);
  const changed = structuredClone(seed.media);
  changed.intro.secondary.image = uploaded.image;
  const revision = restaurantsPageRevision(seed.translations, seed.media);
  const result = await writeRestaurantsPageContent(seed.translations, changed, revision, paths);
  assert.equal(result.media.intro.secondary.image, uploaded.image);
});
