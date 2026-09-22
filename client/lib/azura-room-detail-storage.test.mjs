import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, mkdtemp, mkdir, cp, rm, symlink } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";
import { ROOM_FEATURE_IDS, roomDetailFile, roomDetailImages, readRoomDetailContent, readRoomDetailLocale,
  validateRoomDetailContent, validateRoomTourUrl, roomDetailLink } from "./azura-room-detail-storage.mjs";

const run = promisify(execFile);
const root = path.resolve(import.meta.dirname, "..");
const seed = JSON.parse(await readFile(path.join(root, "content/site-pages/deluxeroom.json"), "utf8"));
const locales = ["tr", "en", "de", "ru"];
const gallery = ["deluxe1.jpg", "deluxe2.jpg", "deluxe3.jpg", "deluxe4.jpg", "deluxe5.webp", "deluxe6.webp", "deluxe7.webp", "deluxe8.jpg", "deluxe9.webp"];

async function fixture(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "azura-deluxe-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const paths = { contentRoot: path.join(dir, "content"), uploadsRoot: path.join(dir, "uploads") };
  await mkdir(path.join(paths.contentRoot, "site-pages"), { recursive: true });
  for (const folder of ["deluxeroom", "room-options"]) await cp(path.join(root, "public/uploads/pages", folder), path.join(paths.uploadsRoot, "pages", folder), { recursive: true });
  await writeFile(roomDetailFile("deluxe", paths), JSON.stringify(seed));
  return paths;
}

test("dört dilde tüm görünür oda metinleri ve boşlukları, özelliklerin ikon sırası korunur", async (t) => {
  const paths = await fixture(t);
  for (const locale of locales) {
    const m = JSON.parse(await readFile(path.join(root, `messages/${locale}.json`), "utf8")).DeluxeRoom;
    const page = await readRoomDetailLocale("deluxe", locale, paths);
    const actual = page.texts;
    assert.deepEqual([actual.subtitle, actual.title, actual.text1, actual.text2, actual.text3], [m.subtitle, m.title, m.span1, m.span2, m.span3]);
    const f = m.RoomFeatures;
    assert.deepEqual(actual.RoomInfo, {
      subtitle: f.subtitle, title: f.title, text: f.text, title2: f.subtitle2, title3: f.subtitle3, text2: f.text2,
      amenities: { doubleBed: f.span1, singleBed: f.span2, sofa: f.sofa },
      features: Object.fromEntries(ROOM_FEATURE_IDS.map((id, i) => [id, f[`feature${i + 1}`]])),
    });
    assert.deepEqual(page.featureTexts, Array.from({ length: 11 }, (_, i) => f[`feature${i + 1}`]));
    assert.deepEqual(actual.BackgroundSection, { subtitle: m.BackgroundSection.subtitle, title: m.BackgroundSection.title, text: m.BackgroundSection.text });
    for (const [i, tour] of page.tours.entries()) {
      const n = i ? i + 1 : "";
      assert.deepEqual([tour.subtitle, tour.title, tour.text], [m.RoomTour[`span${n}`], m.RoomTour[`title${n}`], m.RoomTour[`text${n}`]]);
    }
    assert.deepEqual([actual.OtherOptions.span, actual.OtherOptions.title, actual.OtherOptions.buttonText], [m.OtherOptions.subtitle, m.OtherOptions.title, m.OtherOptions.buttonText]);
    assert.equal(actual.BackgroundSection.list1, undefined); assert.equal(actual.text, undefined);
  }
  assert.equal(seed.media.parallax, undefined);
});

test("13 medya kaydı / 10 benzersiz dosya, galeri sırası ve kaynak bayt/ölçü eşliği", async (t) => {
  const content = await readRoomDetailContent("deluxe", await fixture(t));
  const sources = [gallery[0], ...gallery, gallery[2], gallery[3], "../fantasyroom/images/fantasy4.jpg"];
  const records = roomDetailImages(content.media);
  assert.equal(records.length, 13); assert.equal(new Set(records.map(r => r.image)).size, 10);
  for (const [i, record] of records.entries()) {
    const source = i === 12 ? path.join(root, "app/[locale]/rooms/fantasyroom/images/fantasy4.jpg") : path.join(root, "app/[locale]/rooms/deluxeroom/images", sources[i]);
    const bytes = await readFile(source);
    assert.deepEqual(await readFile(path.join(root, "public", record.image)), bytes);
    const actual = await sharp(bytes).metadata();
    assert.equal(record.width, actual.width); assert.equal(record.height, actual.height);
  }
  assert.deepEqual(content.media.gallery.images.map(r => [r.id, r.order]), gallery.map((_, i) => [`deluxe-gallery-${i + 1}`, i]));
});

test("iki önerinin metni, mevcut görseli ve izinli hedefi aynı kimlikle eşleşir", async (t) => {
  const paths = await fixture(t);
  const reordered = structuredClone(seed);
  for (const locale of locales) reordered.translations[locale].OtherOptions.cards = Object.fromEntries(Object.entries(reordered.translations[locale].OtherOptions.cards).reverse());
  await writeFile(roomDetailFile("deluxe", paths), JSON.stringify(reordered));
  for (const locale of locales) {
    const m = JSON.parse(await readFile(path.join(root, `messages/${locale}.json`), "utf8")).DeluxeRoom.OtherOptions;
    const { rooms } = await readRoomDetailLocale("deluxe", locale, paths);
    assert.deepEqual(rooms.map(r => r.id), ["family", "fantasy"]);
    assert.deepEqual(rooms.map(r => r.link), ["/rooms/familyroom", "/rooms/fantasyroom"]);
    assert.equal(rooms[0].img.src, seed.media.gallery.images[3].image);
    assert.equal(rooms[1].img.src, "/uploads/pages/room-options/fantasy-preview.jpg");
    rooms.forEach((r, i) => assert.deepEqual([r.title, r.description, r.size, r.capacity, r.text], [m[`title${i + 1}`], m.subtitle, m[`area${i + 1}`], m[`person${i + 1}`], m[`text${i + 1}`]]));
  }
});

test("oda izin listesi, kesin kimlikler, düz metin ve güvenli Kuula URL şeması", async () => {
  for (const key of ["fantasy", "../deluxe", "__proto__", "constructor"]) {
    assert.throws(() => roomDetailFile(key)); await assert.rejects(readRoomDetailContent(key));
  }
  assert.throws(() => roomDetailLink("https://example.com"));
  for (const mutate of [
    s => { s.roomKey = "family"; }, s => { s.pageKey = "rooms"; }, s => { delete s.translations.ru; },
    s => { s.translations.tr.RoomInfo.features.unknown = "bad"; }, s => { delete s.translations.en.RoomInfo.features.area; },
    s => { s.translations.tr.RoomInfo.text = "<b>HTML</b>"; }, s => { s.translations.tr.title = " "; },
    s => { s.media.hero.image = "/uploads/pages/deluxeroom/../x.jpg"; }, s => { s.media.hero.image = "/uploads/pages/rooms/deluxe-primary.png"; },
    s => { s.media.otherOptions.images[0].id = "deluxe"; }, s => { s.media.gallery.images[1].order = 0; },
    s => { s.media.otherOptions.images.reverse(); }, s => { s.tours[0].id = "unknown"; },
    s => { s.translations.tr.OtherOptions.cards.family.link = "https://evil.test"; },
  ]) { const invalid = structuredClone(seed); mutate(invalid); assert.throws(() => validateRoomDetailContent("deluxe", invalid)); }
  for (const url of ["http://kuula.co/share/collection/7brmW", "https://kuula.co.evil.test/share/collection/7brmW", "https://user@kuula.co/share/collection/7brmW", "https://kuula.co/share/collection/../../evil", "https://kuula.co/share/collection/7brmW?redirect=https://evil.test", "javascript:alert(1)", "https://kuula.co/share/collection/7brmW#x", "https://kuula.co/share/collection/7brmW?logo=1&logo=0"]) assert.throws(() => validateRoomTourUrl(url));
  for (const tour of seed.tours) assert.equal(validateRoomTourUrl(tour.url), tour.url);
  assert.ok(seed.tours[0].url.endsWith("&alph"));
});

test("eksik/bozuk JSON, eksik/sahte/symlink dosya, tür ve ölçü uyuşmazlığı açık hata verir", async (t) => {
  const paths = await fixture(t); const file = roomDetailFile("deluxe", paths);
  for (const mutate of [s => s.media.hero.width++, s => s.media.gallery.images[0].height++, s => s.media.hero.image = "/uploads/pages/deluxeroom/missing.jpg"]) {
    const invalid = structuredClone(seed); mutate(invalid); await writeFile(file, JSON.stringify(invalid));
    await assert.rejects(readRoomDetailContent("deluxe", paths), /Oda görseli/);
  }
  await writeFile(file, JSON.stringify(seed));
  const target = path.join(paths.uploadsRoot, "pages/deluxeroom/deluxe1.jpg");
  await writeFile(target, "fake"); await assert.rejects(readRoomDetailContent("deluxe", paths));
  await writeFile(target, await sharp({ create: { width: 10, height: 10, channels: 3, background: "red" } }).png().toBuffer());
  await assert.rejects(readRoomDetailContent("deluxe", paths), /imzası/);
  await rm(target); await symlink(path.join(root, "public/uploads/pages/deluxeroom/deluxe1.jpg"), target);
  await assert.rejects(readRoomDetailContent("deluxe", paths));
  await writeFile(file, "{"); await assert.rejects(readRoomDetailContent("deluxe", paths), /verisi okunamadı/);
  await rm(file); await assert.rejects(readRoomDetailContent("deluxe", paths), /verisi okunamadı/);
});

test("seed ilk kurulum ve tekrar çalıştırmada mevcut oda/ortak görsel baytları ile metinleri korur", async (t) => {
  const paths = await fixture(t); const file = roomDetailFile("deluxe", paths);
  await rm(file); await rm(paths.uploadsRoot, { recursive: true });
  const env = { ...process.env, AZURA_CONTENT_ROOT: paths.contentRoot, AZURA_UPLOADS_ROOT: paths.uploadsRoot };
  await run(process.execPath, ["scripts/seed-persistent-room-details.mjs", "deluxe"], { cwd: root, env });
  assert.deepEqual(await readRoomDetailContent("deluxe", paths), seed);
  const custom = structuredClone(seed); custom.translations.en.title = " Custom title ";
  const bytes = await readFile(path.join(paths.uploadsRoot, "pages/deluxeroom/deluxe2.jpg"));
  const target = path.join(paths.uploadsRoot, "pages/room-options/fantasy-preview.jpg");
  await writeFile(target, bytes);
  const actual = await sharp(bytes).metadata();
  custom.media.otherOptions.images[1].width = actual.width; custom.media.otherOptions.images[1].height = actual.height;
  await writeFile(file, JSON.stringify(custom)); const before = await readFile(file);
  await run(process.execPath, ["scripts/seed-persistent-room-details.mjs", "deluxe"], { cwd: root, env });
  assert.deepEqual(await readFile(file), before); assert.deepEqual(await readFile(target), bytes);
  await assert.rejects(run(process.execPath, ["scripts/seed-persistent-room-details.mjs", "fantasy"], { cwd: root, env }));
});

test("oda kayıtları: kanonik revision, paralel çakışma, kök koruma ve başarısız işlem sonrası kuyruk", async t => {
  const {readRoomDetailPageContent, writeRoomDetailPageContent, roomDetailRevision} = await import('./azura-room-detail-storage.mjs');
  const paths=await fixture(t); const file=roomDetailFile('deluxe',paths);
  await writeFile(file,JSON.stringify({...seed, metadata:{preserved:true}}));
  const initial=await readRoomDetailPageContent('deluxe',paths);
  assert.match(initial.revision,/^[a-f0-9]{64}$/);
  assert.equal(initial.revision,roomDetailRevision('deluxe',{tours:initial.bundle.tours,translations:initial.bundle.translations},initial.media));
  const a=structuredClone(initial.bundle), b=structuredClone(initial.bundle);a.translations.tr.title='A';b.translations.tr.title='B';
  const results=await Promise.allSettled([writeRoomDetailPageContent('deluxe',a,initial.media,initial.revision,paths),writeRoomDetailPageContent('deluxe',b,initial.media,initial.revision,paths)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.status,409);
  const bytes=await readFile(file);assert.deepEqual(JSON.parse(bytes).metadata,{preserved:true});assert.equal(JSON.parse(bytes).revision,undefined);
  const updated=await readRoomDetailPageContent('deluxe',paths);
  const bad=structuredClone(updated.media);bad.hero.width++;
  await assert.rejects(writeRoomDetailPageContent('deluxe',updated.bundle,bad,updated.revision,paths));assert.deepEqual(await readFile(file),bytes);
  await writeRoomDetailPageContent('deluxe',initial.bundle,initial.media,updated.revision,paths);
  assert.equal((await readRoomDetailPageContent('deluxe',paths)).revision,initial.revision);
});

test("medya kapsamları bağımsız kalır; ortak öneri yalnızca listelenir, Deluxe yüklemesi ortak dosyayı ezmez",async t=>{
 const media=await import('./azura-homepage-media.mjs');const paths=await fixture(t);
 const bytes=await sharp({create:{width:10,height:12,channels:3,background:'red'}}).png().toBuffer();
 const shared=path.join(paths.uploadsRoot,'pages/room-options/fantasy-preview.jpg');const original=await readFile(shared);
 for(const scope of ['Homepage','Rooms','Restaurants','About','SpaWellness','Deluxe']){
  const saved=await media[`save${scope}Image`](bytes,'image/png',paths);
  const listed=await media[`list${scope}Images`](paths);
  assert.ok(listed.some(i=>i.image===saved.image&&i.width===10&&i.height===12));
  if(scope==='Deluxe')assert.ok(listed.some(i=>i.image.includes('/room-options/')));
  else assert.ok(listed.every(i=>!i.image.includes('/room-options/')&&!i.image.includes('/deluxeroom/')));
 }
 assert.deepEqual(await readFile(shared),original);
 const current=await readRoomDetailContent('deluxe',paths);const {writeRoomDetailPageContent,readRoomDetailPageContent}=await import('./azura-room-detail-storage.mjs');
 const initial=await readRoomDetailPageContent('deluxe',paths);
 const selected=structuredClone(current.media);const r=selected.otherOptions.images[1];selected.otherOptions.images[0]={...r,id:'family',order:0};
 const saved=await writeRoomDetailPageContent('deluxe',initial.bundle,selected,initial.revision,paths);
 assert.equal(saved.media.otherOptions.images[0].image,r.image);
});
