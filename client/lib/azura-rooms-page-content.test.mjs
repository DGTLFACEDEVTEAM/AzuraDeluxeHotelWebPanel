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
  readRoomsCardsVersion, readRoomsContent, roomsFile, writeRoomsCards,
} from "./azura-rooms-storage.mjs";
import {
  ensureRoomsPageFields, readRoomsPageContent, readRoomsPageLocale,
  validateRoomsPagePayload, writeRoomsPageContent,
} from "./azura-rooms-page-content.mjs";

const run = promisify(execFile);
const appRoot = path.resolve(import.meta.dirname, "..");
const seed = JSON.parse(await readFile(path.join(appRoot, "content/site-pages/rooms.json"), "utf8"));
const locales = ["tr", "en", "de", "ru"];
const introKeys = ["header", "buttonText1", "buttonText2", "buttonText3", "subtitle", "title", "text", "checkin", "checkout"];
const parallaxKeys = ["subtitle", "title", "text", "span1", "text1", "span2", "text2", "span3", "text3", "span4", "text4"];

async function fixture(t, content = seed) {
  const root = await mkdtemp(path.join(os.tmpdir(), "azura-room-page-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = resolveAzuraPaths({ contentRoot: path.join(root, "content"),
    uploadsRoot: path.join(root, "uploads"), production: true });
  await mkdir(path.dirname(roomsFile(paths)), { recursive: true });
  await mkdir(path.join(paths.uploadsRoot, "pages/rooms"), { recursive: true });
  await writeFile(roomsFile(paths), JSON.stringify(content));
  const source = path.join(appRoot, "public/uploads/pages/rooms");
  for (const name of await readdir(source)) {
    await copyFile(path.join(source, name), path.join(paths.uploadsRoot, "pages/rooms", name));
  }
  return paths;
}

test("dört dildeki başlangıç metinleri boşluklarıyla aynıdır; kart ve medya eşlemesi kayıpsızdır", async (t) => {
  const paths = await fixture(t);
  const result = await readRoomsPageContent(paths);
  assert.match(result.revision, /^[a-f0-9]{64}$/);
  assert.deepEqual(Object.keys(result.bundle), locales);
  assert.deepEqual(Object.keys(result.media.cards), ["deluxe", "family", "fantasy"]);
  for (const locale of locales) {
    const original = JSON.parse(await readFile(path.join(appRoot, `messages/${locale}.json`), "utf8")).Rooms;
    for (const key of introKeys) assert.equal(result.bundle[locale][key], original[key]);
    for (const key of parallaxKeys) {
      const mapped = /^span(\d)$/.test(key) ? `feature${key.at(-1)}` :
        /^text(\d)$/.test(key) ? `desc${key.at(-1)}` : key;
      assert.equal(result.bundle[locale].RoomsParallax[mapped], original.Parallax[key]);
    }
    for (const [index, card] of seed.cards.entries()) {
      const bundleCard = result.bundle[locale][`RoomSection${index + 1}`];
      assert.deepEqual(bundleCard, {
        title: card.translations[locale].title, subtitle: card.translations[locale].text,
        m: card.translations[locale].area, view: card.translations[locale].view,
        buttonText: card.translations[locale].buttonText,
      });
      for (const slot of ["primary", "secondary"]) {
        assert.deepEqual(result.media.cards[card.key][slot], {
          image: card[slot].src, translations: card[slot].translations,
        });
      }
    }
    const rendered = await readRoomsPageLocale(locale, paths);
    assert.equal(rendered.hero.header, original.header);
    assert.equal(rendered.intro.text, original.text);
    assert.equal(rendered.parallax.translations.text4, original.Parallax.text4);
    assert.deepEqual(rendered.cards.map((card) => card.key), ["deluxe", "family", "fantasy"]);
  }
  for (const [source, target] of [["banner.webp", "rooms-hero.webp"], ["parallax.jpg", "rooms-parallax.jpg"]]) {
    assert.deepEqual(await readFile(path.join(appRoot, "app/[locale]/rooms/images", source)),
      await readFile(path.join(appRoot, "public/uploads/pages/rooms", target)));
  }
  assert.equal(result.bundle.tr.otherOptions, undefined);
  assert.equal(result.media.otherOptions, undefined);
});

test("geçerli kayıt gerçek görsel ölçülerini yazar, diğer alanları korur; bozuk veri ve eski revision yazmaz", async (t) => {
  const paths = await fixture(t, { ...structuredClone(seed), futureMetadata: { preserved: true } });
  const current = await readRoomsPageContent(paths);
  const invalid = structuredClone(current);
  delete invalid.bundle.ru;
  assert.throws(() => validateRoomsPagePayload(invalid.bundle, invalid.media));
  const badMedia = structuredClone(current.media);
  badMedia.hero.image = "/uploads/pages/rooms/../missing.jpg";
  await assert.rejects(writeRoomsPageContent(current.bundle, badMedia, current.revision, paths), /görsel yolu/);
  const fake = structuredClone(current.media);
  fake.parallax.image = "/uploads/pages/rooms/fake.jpg";
  await writeFile(path.join(paths.uploadsRoot, "pages/rooms/fake.jpg"), "not a jpeg");
  await assert.rejects(writeRoomsPageContent(current.bundle, fake, current.revision, paths), /geçersiz veya bozuk/);
  const linked = structuredClone(current.media);
  linked.parallax.image = "/uploads/pages/rooms/linked.jpg";
  await symlink(path.join(paths.uploadsRoot, "pages/rooms/rooms-parallax.jpg"),
    path.join(paths.uploadsRoot, "pages/rooms/linked.jpg"));
  await assert.rejects(writeRoomsPageContent(current.bundle, linked, current.revision, paths), /geçersiz veya bozuk/);

  const bundle = structuredClone(current.bundle);
  const media = structuredClone(current.media);
  for (const locale of locales) bundle[locale].title = `Updated intro ${locale}`;
  bundle.tr.RoomSection1.subtitle = "Güncel deluxe açıklaması";
  const replacement = await sharp({ create: { width: 3, height: 2, channels: 3, background: "red" } })
    .png().toBuffer();
  await writeFile(path.join(paths.uploadsRoot, "pages/rooms/replacement.png"), replacement);
  media.cards.deluxe.primary.image = "/uploads/pages/rooms/replacement.png";
  const saved = await writeRoomsPageContent(bundle, media, current.revision, paths);
  assert.notEqual(saved.revision, current.revision);
  const stored = await readRoomsContent(paths);
  assert.deepEqual(stored.futureMetadata, { preserved: true });
  assert.equal(stored.schemaVersion, 1);
  assert.equal(stored.pageKey, "rooms");
  assert.equal(stored.revision, undefined);
  assert.equal(stored.cards[0].primary.src, "/uploads/pages/rooms/replacement.png");
  assert.equal(stored.cards[0].primary.width, 3);
  assert.equal(stored.cards[0].primary.height, 2);
  await assert.rejects(writeRoomsPageContent(bundle, media, current.revision, paths), (error) => error.status === 409);
  assert.deepEqual(await readRoomsPageContent(paths), saved);
});

test("page-content ve cards ortak kuyrukta yarışır; ayrı alanlar korunur, aynı kart değişikliği 409 üretir", async (t) => {
  const paths = await fixture(t);
  const initial = await readRoomsPageContent(paths);
  const a = structuredClone(initial.bundle);
  const b = structuredClone(initial.bundle);
  a.tr.header = "A başlığı";
  b.tr.header = "B başlığı";
  const same = await Promise.allSettled([
    writeRoomsPageContent(a, initial.media, initial.revision, paths),
    writeRoomsPageContent(b, initial.media, initial.revision, paths),
  ]);
  assert.equal(same.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(same.filter((result) => result.status === "rejected" && result.reason.status === 409).length, 1);

  const page = await readRoomsPageContent(paths);
  const cards = await readRoomsCardsVersion(paths);
  const changedIntro = structuredClone(page.bundle);
  changedIntro.tr.title = "Only intro changed";
  const changedCards = structuredClone(cards.cards);
  changedCards[0].translations.en.title = "Cards API persisted";
  const parallel = await Promise.allSettled([
    writeRoomsPageContent(changedIntro, page.media, page.revision, paths),
    writeRoomsCards(changedCards, cards.revision, paths),
  ]);
  assert.ok(parallel.every((result) => result.status === "fulfilled"));
  const stored = await readRoomsContent(paths);
  assert.equal(stored.intro.tr.title, "Only intro changed");
  assert.equal(stored.cards[0].translations.en.title, "Cards API persisted");

  const stalePage = await readRoomsPageContent(paths);
  const changedAgain = structuredClone(stored.cards);
  changedAgain[0].translations.en.title = "Newest card";
  await writeRoomsCards(changedAgain, (await readRoomsCardsVersion(paths)).revision, paths);
  await assert.rejects(writeRoomsPageContent(stalePage.bundle, stalePage.media, stalePage.revision, paths),
    (error) => error.status === 409);
});

test("seed eski rooms JSON'una yalnızca eksik alanları ekler ve ikinci çalıştırmada kayıtları ezmez", async (t) => {
  const legacy = { schemaVersion: 1, pageKey: "rooms", cards: structuredClone(seed.cards), futureMetadata: "untouched" };
  legacy.cards[0].translations.en.title = "Legacy card";
  const paths = await fixture(t, legacy);
  await rm(path.join(paths.uploadsRoot, "pages/rooms/rooms-hero.webp"));
  await rm(path.join(paths.uploadsRoot, "pages/rooms/rooms-parallax.jpg"));
  const env = { ...process.env, AZURA_CONTENT_ROOT: paths.contentRoot, AZURA_UPLOADS_ROOT: paths.uploadsRoot };
  await run(process.execPath, ["scripts/seed-persistent-rooms.mjs"], { cwd: appRoot, env });
  assert.deepEqual(await readFile(path.join(paths.uploadsRoot, "pages/rooms/rooms-hero.webp")),
    await readFile(path.join(appRoot, "public/uploads/pages/rooms/rooms-hero.webp")));
  const first = await readRoomsContent(paths);
  assert.equal(first.cards[0].translations.en.title, "Legacy card");
  assert.equal(first.futureMetadata, "untouched");
  const changed = structuredClone(first);
  changed.intro.tr.header = "Persisted header";
  await writeFile(roomsFile(paths), JSON.stringify(changed));
  const customHero = await sharp({ create: { width: 2, height: 2, channels: 3, background: "blue" } })
    .webp().toBuffer();
  await writeFile(path.join(paths.uploadsRoot, "pages/rooms/rooms-hero.webp"), customHero);
  await run(process.execPath, ["scripts/seed-persistent-rooms.mjs"], { cwd: appRoot, env });
  const second = await readRoomsContent(paths);
  assert.equal(second.intro.tr.header, "Persisted header");
  assert.equal(second.cards[0].translations.en.title, "Legacy card");
  assert.equal(second.futureMetadata, "untouched");
  assert.deepEqual(await readFile(path.join(paths.uploadsRoot, "pages/rooms/rooms-hero.webp")), customHero);
  await ensureRoomsPageFields(seed, paths);
  assert.equal((await readRoomsContent(paths)).intro.tr.header, "Persisted header");
});
