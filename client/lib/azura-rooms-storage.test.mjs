import assert from "node:assert/strict";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import { resolveAzuraPaths } from "./azura-homepage-storage.mjs";
import {
  readRoomsCards, readRoomsCardsVersion, readRoomsContent, ROOM_KEYS, roomsCardsRevision,
  roomsFile, RoomsContentError, validateRoomsContent, writeRoomsCards,
} from "./azura-rooms-storage.mjs";

const run = promisify(execFile);
const appRoot = path.resolve(import.meta.dirname, "..");
const seed = JSON.parse(await readFile(path.join(appRoot, "content/site-pages/rooms.json"), "utf8"));
const original = JSON.parse(await readFile(path.join(import.meta.dirname, "fixtures/rooms-original-messages.json"), "utf8"));
const locales = ["tr", "en", "de", "ru"];
const images = [
  ["deluxe2.png", "deluxe-primary.png"], ["deluxe.png", "deluxe-secondary.png"],
  ["fam1.png", "family-primary.png"], ["fam2.png", "family-secondary.png"],
  ["fantasy1.png", "fantasy-primary.png"], ["fantasy2.png", "fantasy-secondary.png"],
];

async function fixture(t, content = seed) {
  const root = await mkdtemp(path.join(os.tmpdir(), "azura-rooms-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = resolveAzuraPaths({
    contentRoot: path.join(root, "content"), uploadsRoot: path.join(root, "uploads"), production: true,
  });
  await mkdir(path.dirname(roomsFile(paths)), { recursive: true });
  await mkdir(path.join(paths.uploadsRoot, "pages/rooms"), { recursive: true });
  await writeFile(roomsFile(paths), JSON.stringify(content));
  for (const [, target] of images) {
    await copyFile(path.join(appRoot, "public/uploads/pages/rooms", target),
      path.join(paths.uploadsRoot, "pages/rooms", target));
  }
  return paths;
}

test("üç kartın sırası, dört dildeki metinleri ve Room1 düğme davranışı birebir korunur", () => {
  assert.equal(validateRoomsContent(seed), seed);
  assert.deepEqual(seed.cards.map((card) => card.key), ROOM_KEYS);
  for (const locale of locales) {
    for (const [index, card] of seed.cards.entries()) {
      const old = original[locale][`Room${index + 1}`];
      assert.deepEqual(card.translations[locale], {
        title: old.title, text: old.text, area: old.area, view: old.view,
        buttonText: original[locale].Room1.buttonText,
      });
      assert.equal(card.primary.translations[locale].alt, "Superior Rooms");
      assert.equal(card.secondary.translations[locale].alt, "Superior Rooms");
    }
  }
});

test("altı görselin sırası, kopya baytları ve gerçek ölçüleri eşleşir", async () => {
  const slots = seed.cards.flatMap((card) => [card.primary, card.secondary]);
  for (const [index, [sourceName, targetName]] of images.entries()) {
    const source = path.join(appRoot, "app/[locale]/rooms/images", sourceName);
    const target = path.join(appRoot, "public/uploads/pages/rooms", targetName);
    assert.deepEqual(await readFile(target), await readFile(source));
    assert.equal(slots[index].src, `/uploads/pages/rooms/${targetName}`);
    const metadata = await sharp(target).metadata();
    assert.equal(slots[index].width, metadata.width);
    assert.equal(slots[index].height, metadata.height);
  }
});

test("yalnızca izinli kart ve görsel alanları, dört dil ve gerçek ölçüler kabul edilir", async (t) => {
  const paths = await fixture(t);
  const mutations = [
    (value) => { value.cards.pop(); },
    (value) => { [value.cards[0], value.cards[1]] = [value.cards[1], value.cards[0]]; },
    (value) => { value.cards[0].link = "/rooms/other"; },
    (value) => { delete value.cards[1].translations.ru; },
    (value) => { value.cards[2].translations.en.title = " "; },
    (value) => { value.cards[0].primary.src = "/uploads/pages/rooms/../../other.png"; },
    (value) => { value.cards[0].primary.width = 0; },
    (value) => { value.cards[0].primary.translations.tr.alt = "x".repeat(301); },
  ];
  for (const mutate of mutations) {
    const candidate = structuredClone(seed);
    mutate(candidate);
    assert.throws(() => validateRoomsContent(candidate), RoomsContentError);
  }
  const wrongDimensions = structuredClone(seed);
  wrongDimensions.cards[0].primary.width += 1;
  await writeFile(roomsFile(paths), JSON.stringify(wrongDimensions));
  await assert.rejects(readRoomsContent(paths), /gerçek ölçüleri/);
  const missing = structuredClone(seed);
  missing.cards[0].primary.src = "/uploads/pages/rooms/missing.png";
  await writeFile(roomsFile(paths), JSON.stringify(missing));
  await assert.rejects(readRoomsContent(paths), /bulunamadı/);
  const fake = structuredClone(seed);
  fake.cards[0].primary.src = "/uploads/pages/rooms/fake.png";
  await writeFile(path.join(paths.uploadsRoot, "pages/rooms/fake.png"), "not a PNG");
  await writeFile(roomsFile(paths), JSON.stringify(fake));
  await assert.rejects(readRoomsContent(paths), /geçersiz veya bozuk/);
});

test("sunucu okuması dört dilde güvenilir görsel ölçülerini ve metinleri hazırlar", async (t) => {
  const paths = await fixture(t);
  for (const locale of locales) {
    const cards = await readRoomsCards(locale, paths);
    assert.deepEqual(cards.map((card) => card.key), ROOM_KEYS);
    for (const [index, card] of cards.entries()) {
      assert.deepEqual(card.primary, {
        src: seed.cards[index].primary.src,
        width: seed.cards[index].primary.width,
        height: seed.cards[index].primary.height,
        alt: seed.cards[index].primary.translations[locale].alt,
      });
      assert.deepEqual(card.secondary, {
        src: seed.cards[index].secondary.src,
        width: seed.cards[index].secondary.width,
        height: seed.cards[index].secondary.height,
        alt: seed.cards[index].secondary.translations[locale].alt,
      });
      assert.equal(card.buttonText, original[locale].Room1.buttonText);
    }
  }
});

test("seed eski rooms.json verisini ve mevcut görsel baytlarını ikinci çalıştırmada korur", async (t) => {
  const current = structuredClone(seed);
  current.cards[0].translations.en.title = "Persisted Deluxe title";
  const paths = await fixture(t, current);
  const imageTarget = path.join(paths.uploadsRoot, "pages/rooms/deluxe-primary.png");
  await copyFile(path.join(paths.uploadsRoot, "pages/rooms/deluxe-secondary.png"), imageTarget);
  const existingBytes = await readFile(imageTarget);
  const env = { ...process.env, AZURA_CONTENT_ROOT: paths.contentRoot, AZURA_UPLOADS_ROOT: paths.uploadsRoot };
  await run(process.execPath, ["scripts/seed-persistent-rooms.mjs"], { cwd: appRoot, env });
  assert.deepEqual((await readRoomsContent(paths)).cards[0].translations.en.title, "Persisted Deluxe title");
  assert.deepEqual(await readFile(imageTarget), existingBytes);
  await run(process.execPath, ["scripts/seed-persistent-rooms.mjs"], { cwd: appRoot, env });
  assert.equal((await readRoomsContent(paths)).cards[0].translations.en.title, "Persisted Deluxe title");
  assert.deepEqual(await readFile(imageTarget), existingBytes);
});

test("kart revision'ı yalnızca kartları izler; eşzamanlı eski kayıt 409 olur ve diğer alanlar korunur", async (t) => {
  const current = { ...structuredClone(seed), futureMetadata: { keep: true } };
  const paths = await fixture(t, current);
  const { revision } = await readRoomsCardsVersion(paths);
  assert.match(revision, /^[a-f0-9]{64}$/);
  await writeFile(roomsFile(paths), JSON.stringify({ ...current, futureMetadata: { changed: true } }));
  assert.equal((await readRoomsCardsVersion(paths)).revision, revision);
  const first = structuredClone(current.cards);
  const second = structuredClone(current.cards);
  first[0].translations.tr.title = "Birinci kayıt";
  second[0].translations.tr.title = "İkinci kayıt";
  const results = await Promise.allSettled([
    writeRoomsCards(first, revision, paths), writeRoomsCards(second, revision, paths),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected" && result.reason.status === 409).length, 1);
  const stored = JSON.parse(await readFile(roomsFile(paths), "utf8"));
  assert.deepEqual(stored.futureMetadata, { changed: true });
  assert.equal(stored.schemaVersion, 1);
  assert.equal(stored.pageKey, "rooms");
  assert.equal(stored.revision, undefined);
  assert.equal(roomsCardsRevision(stored.cards), (await readRoomsCardsVersion(paths)).revision);
  for (const locale of locales) {
    const published = await readRoomsCards(locale, paths);
    assert.equal(published[0].title, stored.cards[0].translations[locale].title);
  }
  await assert.rejects(writeRoomsCards(first, "0".repeat(64), paths), (error) => error.status === 409);
  assert.deepEqual(JSON.parse(await readFile(roomsFile(paths), "utf8")), stored);
});

test("başarısız paralel kayıt kuyruğu kilitlemez; sahte görsel ve yanlış ölçü reddedilir", async (t) => {
  const paths = await fixture(t);
  const { revision } = await readRoomsCardsVersion(paths);
  const invalid = structuredClone(seed.cards);
  invalid[0].primary.width++;
  const valid = structuredClone(seed.cards);
  valid[0].translations.en.title = "After invalid request";
  const [bad, good] = await Promise.allSettled([
    writeRoomsCards(invalid, revision, paths), writeRoomsCards(valid, revision, paths),
  ]);
  assert.equal(bad.status, "rejected");
  assert.equal(bad.reason.status, 400);
  assert.equal(good.status, "fulfilled");
  assert.equal((await readRoomsContent(paths)).cards[0].translations.en.title, "After invalid request");
});
